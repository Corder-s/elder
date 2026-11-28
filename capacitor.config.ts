import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://app.eldercareos.com';
const allowCleartext = process.env.CAPACITOR_ALLOW_CLEARTEXT === 'true';

const config: CapacitorConfig = {
  appId: 'com.eldercareos.app',
  appName: 'ElderCare OS',
  webDir: 'capacitor-web',
  server: {
    url: serverUrl,
    cleartext: allowCleartext,
    androidScheme: 'https',
    errorPath: 'index.html',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
