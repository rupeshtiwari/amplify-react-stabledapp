import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.stabledapp',
  appName: 'stabledapp',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;
