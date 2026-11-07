import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shaunflint.novacorsair',
  appName: 'Nova Corsair',
  webDir: 'dist',
  backgroundColor: '#05040a',
  android: {
    backgroundColor: '#05040a',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
