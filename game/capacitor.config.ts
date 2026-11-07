import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shaunflint.novacorsair',
  appName: 'Nova Corsair',
  webDir: 'dist',
  backgroundColor: '#05040a',
  plugins: {
    // Capacitor 8 core plugin: start with status/navigation bars hidden (immersive game),
    // and expose safe-area insets to CSS (index.html keeps the canvas out of the cutout).
    SystemBars: { hidden: true, insetsHandling: 'css' },
  },
  android: {
    backgroundColor: '#05040a',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
