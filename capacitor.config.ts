import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khmerfood.tourism',
  appName: 'Discover Cambodia Food & Tourism',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'DiscoverCambodia',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
