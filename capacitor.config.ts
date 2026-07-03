import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.guardian.safety",
  appName: "Guardian",
  webDir: "out",
  server: {
    url: "https://guardianforpeople.vercel.app",
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#7c3aed",
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_launcher_foreground",
      iconColor: "#7c3aed",
    },
  },
};

export default config;
