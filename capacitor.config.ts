import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expirationreminder.app',
  appName: 'Expiration Reminder',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000, // Show for 3 seconds
      launchAutoHide: false,     // Hide automatically
      backgroundColor: "#FFFFFF", // Your background color (Hex)
      showSpinner: false,        // Hide the loading spinner
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;

