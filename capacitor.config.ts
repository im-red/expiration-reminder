import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expirationreminder.app',
  appName: 'Expiration Reminder',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

