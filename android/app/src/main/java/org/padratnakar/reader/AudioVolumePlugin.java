package org.padratnakar.reader;

import android.content.Context;
import android.media.AudioManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioVolume")
public class AudioVolumePlugin extends Plugin {
    @PluginMethod
    public void getLevel(PluginCall call) {
        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        int maximum = manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        JSObject result = new JSObject();
        result.put("level", maximum > 0 ? (double) manager.getStreamVolume(AudioManager.STREAM_MUSIC) / maximum : 1);
        call.resolve(result);
    }
}
