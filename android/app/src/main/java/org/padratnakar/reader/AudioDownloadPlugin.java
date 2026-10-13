package org.padratnakar.reader;

import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.net.URL;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AudioDownload")
public class AudioDownloadPlugin extends Plugin {
    private final ConcurrentHashMap<String, RecordingDownload> pending = new ConcurrentHashMap<>();
    private final ExecutorService transfers = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void download(PluginCall call) {
        String requestId = call.getString("requestId");
        Integer id = call.getInt("id");
        Integer bytes = call.getInt("bytes");
        String hash = call.getString("sha256", "");
        if (requestId == null || id == null || id < 0 || id > 17 || bytes == null || bytes <= 0
            || !hash.matches("[a-f0-9]{64}")) {
            call.reject("Invalid recording");
            return;
        }
        RecordingDownload transfer = new RecordingDownload();
        if (pending.putIfAbsent(requestId, transfer) != null) {
            call.reject("Download already exists");
            return;
        }
        transfers.execute(() -> {
            try {
                String filename = String.format(Locale.ROOT, "%02d.mp3?v=%s", id, hash);
                File destination = new File(getContext().getFilesDir(), "audio/shodash/" + id + "-" + hash.substring(0, 12) + ".mp3");
                transfer.save(Arrays.asList(
                    new URL("https://padratnakar.vercel.app/audio/shodash/" + filename),
                    new URL("https://raw.githubusercontent.com/yashashwi-s/padratnakar/main/public/audio/shodash/" + filename)
                ), destination, bytes, hash, (received) -> {
                    JSObject progress = new JSObject();
                    progress.put("requestId", requestId);
                    progress.put("bytes", received);
                    notifyListeners("progress", progress);
                });
                JSObject result = new JSObject();
                result.put("uri", Uri.fromFile(destination).toString());
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Could not download recording", error);
            } finally {
                pending.remove(requestId, transfer);
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        RecordingDownload transfer = pending.get(call.getString("requestId", ""));
        if (transfer != null) transfer.cancel();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        for (RecordingDownload transfer : pending.values()) transfer.cancel();
        transfers.shutdown();
        super.handleOnDestroy();
    }
}
