package org.padratnakar.reader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;

/** Streams and verifies recordings without sending audio bytes through WebView. */
final class RecordingDownload {
    interface Progress {
        void update(long received);
    }

    private volatile boolean cancelled;
    private volatile HttpURLConnection connection;

    void cancel() {
        cancelled = true;
        HttpURLConnection current = connection;
        if (current != null) current.disconnect();
    }

    private void checkCancelled() throws InterruptedIOException {
        if (cancelled) throw new InterruptedIOException("Download cancelled");
    }

    void save(List<URL> sources, File destination, long expectedBytes, String sha256, Progress progress)
        throws IOException {
        File directory = destination.getParentFile();
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Cannot create audio directory");
        IOException failure = new IOException("No audio source");
        for (URL source : sources) {
            checkCancelled();
            File partial = File.createTempFile(destination.getName(), ".part", directory);
            try {
                receive(source, partial, expectedBytes, sha256, progress);
                checkCancelled();
                // The canonical filename only becomes visible after full verification.
                if (!partial.renameTo(destination)) throw new IOException("Cannot save recording");
                return;
            } catch (IOException error) {
                failure = error;
                checkCancelled();
            } finally {
                partial.delete();
            }
        }
        throw failure;
    }

    private void receive(URL source, File partial, long expectedBytes, String sha256, Progress progress)
        throws IOException {
        HttpURLConnection current = (HttpURLConnection) source.openConnection();
        connection = current;
        current.setConnectTimeout(10000);
        current.setReadTimeout(15000);
        current.setRequestProperty("Accept-Encoding", "identity");
        try {
            checkCancelled();
            if (current.getResponseCode() != HttpURLConnection.HTTP_OK) throw new IOException("Audio host unavailable");
            MessageDigest digest;
            try {
                digest = MessageDigest.getInstance("SHA-256");
            } catch (NoSuchAlgorithmException error) {
                throw new IOException(error);
            }
            long received = 0;
            int percent = -1;
            long lastReport = 0;
            byte[] buffer = new byte[64 * 1024];
            progress.update(0);
            try (InputStream input = current.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                int count;
                while ((count = input.read(buffer)) != -1) {
                    checkCancelled();
                    received += count;
                    if (received > expectedBytes) throw new IOException("Recording exceeds expected size");
                    output.write(buffer, 0, count);
                    digest.update(buffer, 0, count);
                    int nextPercent = (int) Math.min(99, received * 100 / expectedBytes);
                    long now = System.nanoTime();
                    if (nextPercent != percent && now - lastReport >= 100_000_000L) {
                        percent = nextPercent;
                        lastReport = now;
                        progress.update(received);
                    }
                }
            }
            if (received != expectedBytes) throw new IOException("Incomplete recording");
            StringBuilder actual = new StringBuilder(64);
            for (byte value : digest.digest()) actual.append(String.format(java.util.Locale.ROOT, "%02x", value & 0xff));
            if (!actual.toString().equals(sha256)) throw new IOException("Recording integrity check failed");
        } finally {
            connection = null;
            current.disconnect();
        }
    }
}
