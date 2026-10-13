package org.padratnakar.reader;

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioScreen")
public class AudioScreenPlugin extends Plugin {
    private boolean foreground = true;

    @PluginMethod
    public void setAwake(PluginCall call) {
        final boolean awake = Boolean.TRUE.equals(call.getBoolean("awake", false));
        getActivity().runOnUiThread(() -> {
            if (awake && foreground && getActivity().hasWindowFocus()) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                clear();
            }
            call.resolve();
        });
    }

    private void clear() {
        getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    protected void handleOnPause() {
        foreground = false;
        clear();
    }

    @Override
    protected void handleOnResume() {
        foreground = true;
        // Returning must not restore either playback or the screen flag.
    }

    @Override
    protected void handleOnDestroy() {
        clear();
    }
}
