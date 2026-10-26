import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
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
