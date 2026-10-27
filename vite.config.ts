import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function readAndroidVersionCode(): number {
  try {
    const gradlePath = path.resolve(process.cwd(), 'android/app/build.gradle');
    const content = fs.readFileSync(gradlePath, 'utf-8');
    const match = content.match(/versionCode\s+(\d+)/);
    if (match && match[1]) {
      return Number(match[1]);
    }
  } catch {}
  return 114;
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __KFT_BUILD_CODE__: JSON.stringify(readAndroidVersionCode()),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    sourcemap: false,
    minify: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('/src/data/seedDestinations') || norm.includes('/src/data/touristDestinationsList')) {
            return 'data-destinations';
          }
          if (norm.includes('/src/data/seedFoods') || norm.includes('/src/data/seedAdditional100Foods')) {
            return 'data-foods';
          }
          if (norm.includes('/src/data/seedRestaurants')) {
            return 'data-restaurants';
          }
          if (norm.includes('/src/data/zhCompleteTranslations') || norm.includes('/src/utils/zhDynamicTranslator')) {
            return 'data-zh-translations';
          }
          if (norm.includes('node_modules/react') || norm.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          if (norm.includes('node_modules/firebase') || norm.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
          if (norm.includes('node_modules/tesseract.js')) return 'vendor-ocr';
          if (norm.includes('node_modules/lucide-react')) return 'vendor-icons';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
