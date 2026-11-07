package com.shaunflint.novacorsair;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Nova Corsair host activity: portrait (manifest), immersive sticky fullscreen and screen kept on
 * while the game runs. Immersive mode is re-applied whenever the window regains focus, because the
 * system shows the bars again after dialogs, the recents screen or a swipe from the screen edge.
 */
public class MainActivity extends BridgeActivity {

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable immersiveRunnable = this::applyImmersiveMode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyImmersiveMode();
        // Capacitor's built-in SystemBars plugin posts a "show bars" call while it loads (inside
        // super.onCreate): hide them again once that queued call has run.
        mainHandler.post(immersiveRunnable);
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacks(immersiveRunnable);
        super.onDestroy();
    }

    /** Edge-to-edge layout with status + navigation bars hidden; a swipe shows them transiently. */
    private void applyImmersiveMode() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
