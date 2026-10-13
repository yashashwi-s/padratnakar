package org.padratnakar.reader;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLStreamHandler;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Runs on a plain JDK, exercising the exact Android streaming implementation. */
public class RecordingDownloadTest {
    private static final byte[] CONTENT = new byte[200_000];
    static {
        for (int i = 0; i < CONTENT.length; i++) CONTENT[i] = (byte) (i * 17);
    }

    private static void check(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }

    private static String hash(byte[] bytes) throws Exception {
        StringBuilder result = new StringBuilder();
        for (byte value : MessageDigest.getInstance("SHA-256").digest(bytes))
            result.append(String.format("%02x", value & 0xff));
        return result.toString();
    }

    private static final class Host extends URLStreamHandler {
        final byte[] bytes;
        final int status;
        int requests;
        int disconnected;
        int maximumRead;
        HttpURLConnection connection;

        Host(byte[] bytes, int status) {
            this.bytes = bytes;
            this.status = status;
        }

        URL url() throws Exception { return new URL(null, "https://recordings.test/song.mp3", this); }

        @Override
        protected HttpURLConnection openConnection(URL url) {
            requests++;
            connection = new HttpURLConnection(url) {
                @Override public int getResponseCode() { return status; }
                @Override public InputStream getInputStream() {
                    return new ByteArrayInputStream(bytes) {
                        @Override public synchronized int read(byte[] buffer, int offset, int length) {
                            maximumRead = Math.max(maximumRead, length);
                            return super.read(buffer, offset, Math.min(1000, length));
                        }
                    };
                }
                @Override public void disconnect() { disconnected++; }
                @Override public void connect() {}
                @Override public boolean usingProxy() { return false; }
            };
            return connection;
        }
    }

    private static void noPartial(File destination) {
        check(Arrays.stream(destination.getParentFile().list()).noneMatch(name -> name.endsWith(".part")), "Partial recording leaked");
    }

    public static void main(String[] args) throws Exception {
        File directory = new File(args[0], "audio");
        File destination = new File(directory, "1-hash.mp3");
        List<Long> progress = new ArrayList<>();
        Host good = new Host(CONTENT, 200);
        new RecordingDownload().save(List.of(good.url()), destination, CONTENT.length, hash(CONTENT), progress::add);
        check(Arrays.equals(Files.readAllBytes(destination.toPath()), CONTENT), "Saved bytes differ");
        check(good.maximumRead <= 64 * 1024, "Unbounded receive buffer");
        check(progress.size() <= 101, "Progress floods the bridge");
        check(good.connection.getConnectTimeout() == 10000 && good.connection.getReadTimeout() == 15000, "Missing network timeouts");
        check(good.disconnected == 1, "Connection leaked");
        noPartial(destination);

        // Short, oversized and same-size corrupt files must never replace a verified recording.
        for (byte[] bad : List.of(Arrays.copyOf(CONTENT, CONTENT.length - 1), Arrays.copyOf(CONTENT, CONTENT.length + 1), new byte[CONTENT.length])) {
            Host host = new Host(bad, 200);
            try {
                new RecordingDownload().save(List.of(host.url()), destination, CONTENT.length, hash(CONTENT), received -> {});
                throw new AssertionError("Invalid recording accepted");
            } catch (IOException expected) {}
            check(Arrays.equals(Files.readAllBytes(destination.toPath()), CONTENT), "Valid recording overwritten on failure");
            check(host.disconnected == 1, "Failed connection leaked");
            noPartial(destination);
        }

        Host unavailable = new Host(new byte[0], 503);
        Host fallback = new Host(CONTENT, 200);
        new RecordingDownload().save(List.of(unavailable.url(), fallback.url()), destination, CONTENT.length, hash(CONTENT), received -> {});
        check(unavailable.requests == 1 && fallback.requests == 1, "Unavailable host did not fall back");
        noPartial(destination);

        destination.delete();
        RecordingDownload cancelled = new RecordingDownload();
        Host interrupted = new Host(CONTENT, 200);
        Host unused = new Host(CONTENT, 200);
        try {
            cancelled.save(List.of(interrupted.url(), unused.url()), destination, CONTENT.length, hash(CONTENT), received -> {
                if (received > 0) cancelled.cancel();
            });
            throw new AssertionError("Cancelled download completed");
        } catch (java.io.InterruptedIOException expected) {}
        check(!destination.exists(), "Cancelled recording became available");
        check(unused.requests == 0, "Cancelled request tried fallback");
        noPartial(destination);

        RecordingDownload alreadyCancelled = new RecordingDownload();
        alreadyCancelled.cancel();
        try {
            alreadyCancelled.save(List.of(unused.url()), destination, CONTENT.length, hash(CONTENT), received -> {});
            throw new AssertionError("Pre-cancelled transfer started");
        } catch (java.io.InterruptedIOException expected) {}
        check(unused.requests == 0, "Pre-cancelled transfer opened connection");
        System.out.println("Streaming, integrity, fallback, timeouts, cancellation and cleanup passed");
    }
}
