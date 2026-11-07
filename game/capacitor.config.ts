import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration, copied to android/app/src/main/assets/capacitor.config.json by
 * `npx cap sync android`. What the config cannot express (immersive mode, keep-screen-on, splash,
 * WebView tuning, renderer-crash recovery) lives in android/app/src/main/java/.../MainActivity.java.
 */
const config: CapacitorConfig = {
  appId: 'com.shaunflint.novacorsair',
  appName: 'Nova Corsair',
  webDir: 'dist',
  // = COLORS.bg (src/config.ts) = @color/nc_background: no flash before the first frame.
  backgroundColor: '#05040a',
  plugins: {
    // Capacitor 8 core plugin.
    SystemBars: {
      // Immersive game: status and navigation bars hidden from the start (MainActivity keeps them hidden).
      hidden: true,
      // Light bar icons when the player swipes the bars in over the dark game.
      style: 'DARK',
      // Safe-area insets reach CSS (env(safe-area-inset-*) and --safe-area-inset-*): index.html keeps
      // the game box out of the display cutout.
      insetsHandling: 'css',
      // index.html declares viewport-fit=cover. Saying so up front stops the WebView from starting
      // padded and then jumping, which matters because src/config.ts measures the game box once at boot.
      initialViewportFitValueHint: 'cover',
    },
  },
  android: {
    allowMixedContent: false,
    // webContentsDebuggingEnabled is left unset on purpose: Capacitor then enables chrome://inspect for
    // debug APKs only and keeps it off in release builds.
  },
};

export default config;
