package com.shaunflint.novacorsair;

import android.content.Context;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/**
 * Nova Corsair host activity (portrait lock, cutout mode and themes come from the manifest/styles).
 *
 * <ul>
 *   <li>Immersive sticky fullscreen, re-applied whenever the window regains focus (dialogs, recents
 *       and edge swipes bring the bars back); the screen stays on while the game is visible.</li>
 *   <li>The launch splash (SplashScreen API on Android 12+, its compat version before) stays up until
 *       the game page has loaded, so no blank frame shows between the splash and the game.</li>
 *   <li>WebView tuned for a canvas game: system font size ignored, no zoom, no overscroll glow,
 *       no scrollbars, no long-press selection or haptic tick.</li>
 *   <li>Volume keys always drive the media volume. On Android 12+ a ringing or ongoing phone call
 *       reports the app as inactive to JS (App "appStateChange"), which pauses the game and its audio
 *       exactly like a trip to the background.</li>
 *   <li>If the WebView renderer process dies, the activity is rebuilt instead of the app crashing.</li>
 * </ul>
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "NovaCorsair";
    /** Longest time the launch splash waits for the game page (ms). */
    private static final long SPLASH_TIMEOUT_MS = 4000L;
    /** A second renderer loss within this delay is a crash loop: stop restarting (ms). */
    private static final long RENDERER_RESTART_WINDOW_MS = 30000L;

    /** Process-wide, so they survive recreate(): when the WebView renderer was last lost. */
    private static boolean rendererLost;
    private static long lastRendererLossAt;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable immersiveRunnable = this::applyImmersiveMode;
    private long createdAt;
    private boolean pageReady;
    private boolean started;
    private boolean resumed;
    private boolean restartOnStart;
    private boolean inPhoneCall;
    /** Audio mode listener (Android 12+), typed Object so that older ART never resolves its class. */
    private Object callListener;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        createdAt = SystemClock.uptimeMillis();
        // Before super.onCreate(): moves from the launch theme to AppTheme.NoActionBar.
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        splashScreen.setKeepOnScreenCondition(this::keepSplash);

        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // Same as the theme (values-v28): draw under the cutout on the short edges, never letterbox.
            WindowManager.LayoutParams attrs = window.getAttributes();
            attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(attrs);
        }
        // Volume keys change the game (media) volume even between two sounds, never the ringer.
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        applyImmersiveMode();
        // Capacitor's SystemBars plugin applies its bar state from a call it queues during
        // super.onCreate(): enforce immersive mode once more after that call has run.
        mainHandler.post(immersiveRunnable);

        Bridge bridge = getBridge();
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView == null) {
            // No usable WebView: Capacitor shows its own error layout, do not hold the splash over it.
            pageReady = true;
            return;
        }
        configureWebView(webView);
        bridge.addWebViewListener(new GameWebViewListener());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            callListener = Api31.watchPhoneCalls(this);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        started = true;
        if (restartOnStart) {
            restartOnStart = false;
            mainHandler.post(this::recreate);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        resumed = true;
        applyImmersiveMode();
    }

    @Override
    public void onPause() {
        resumed = false;
        super.onPause();
    }

    @Override
    public void onStop() {
        started = false;
        super.onStop();
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
        mainHandler.removeCallbacksAndMessages(null);
        if (callListener != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Api31.stopWatching(this, callListener);
            callListener = null;
        }
        super.onDestroy();
    }

    /** Splash condition: until the game page has loaded, bounded so a slow device never hangs on it. */
    private boolean keepSplash() {
        return !pageReady && SystemClock.uptimeMillis() - createdAt < SPLASH_TIMEOUT_MS;
    }

    /** Edge-to-edge layout with status + navigation bars hidden; a swipe shows them transiently. */
    private void applyImmersiveMode() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    /** Canvas-game WebView: the system font size, zoom gestures and overscroll effects must not apply. */
    private static void configureWebView(WebView webView) {
        WebSettings settings = webView.getSettings();
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        // A long press is just a held finger in this game: consume it (no selection or context menu)
        // and drop the view-level haptic tick. Game haptics use the Vibrator and are unaffected.
        webView.setOnLongClickListener(v -> true);
        webView.setHapticFeedbackEnabled(false);
    }

    /** Phone call started or ended (Android 12+): pause the game as if the app went to the background. */
    void onPhoneCallChanged(boolean call) {
        if (call == inPhoneCall) {
            return;
        }
        inPhoneCall = call;
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }
        if (call) {
            bridge.getApp().fireStatusChange(false);
        } else if (resumed) {
            bridge.getApp().fireStatusChange(true);
        }
    }

    /**
     * The WebView renderer crashed or was killed to reclaim memory: this WebView is dead. Rebuild the
     * activity (and the game, from the title screen; saves are kept) instead of letting the app crash,
     * right away when visible, else when it comes back to the foreground. On a crash loop, fall back to
     * the platform default (the process ends and Android starts it fresh next time).
     */
    private boolean onRendererGone(RenderProcessGoneDetail detail) {
        long now = SystemClock.elapsedRealtime();
        boolean loop = rendererLost && now - lastRendererLossAt < RENDERER_RESTART_WINDOW_MS;
        rendererLost = true;
        lastRendererLossAt = now;
        boolean crashed = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && detail != null && detail.didCrash();
        Log.w(TAG, "WebView renderer " + (crashed ? "crashed" : "was killed") + (loop ? " again, giving up" : ", restarting the game"));
        if (loop || isFinishing()) {
            return false;
        }
        pageReady = true;
        if (started) {
            mainHandler.post(this::recreate);
        } else {
            restartOnStart = true;
        }
        return true;
    }

    /** Page lifecycle hooks on Capacitor's WebViewClient. */
    private final class GameWebViewListener extends WebViewListener {

        @Override
        public void onPageLoaded(WebView webView) {
            pageReady = true;
        }

        @Override
        public void onReceivedError(WebView webView) {
            pageReady = true; // never keep the splash over an error
        }

        @Override
        public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
            return onRendererGone(detail);
        }
    }

    /** Android 12+ (API 31) audio-mode listener. In its own class so older ART never loads it. */
    private static final class Api31 {

        private Api31() {}

        /** Starts reporting telephony calls to the activity; returns the listener for stopWatching(). */
        static Object watchPhoneCalls(MainActivity activity) {
            AudioManager audioManager = (AudioManager) activity.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) {
                return null;
            }
            AudioManager.OnModeChangedListener listener = mode -> activity.onPhoneCallChanged(isPhoneCall(mode));
            audioManager.addOnModeChangedListener(ContextCompat.getMainExecutor(activity), listener);
            activity.onPhoneCallChanged(isPhoneCall(audioManager.getMode()));
            return listener;
        }

        static void stopWatching(MainActivity activity, Object listener) {
            AudioManager audioManager = (AudioManager) activity.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.removeOnModeChangedListener((AudioManager.OnModeChangedListener) listener);
            }
        }

        /** Ringing or in a cellular call. VoIP / voice chat (MODE_IN_COMMUNICATION) keeps the game running. */
        static boolean isPhoneCall(int mode) {
            return mode == AudioManager.MODE_RINGTONE
                || mode == AudioManager.MODE_IN_CALL
                || mode == AudioManager.MODE_CALL_SCREENING
                || mode == AudioManager.MODE_CALL_REDIRECT;
        }
    }
}
