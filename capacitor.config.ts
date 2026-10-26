import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khmerfood.tourism',
  appName: 'Khmer Food & Tourism',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'KhmerFoodTourism',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
