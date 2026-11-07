import { defineConfig, type Plugin } from 'vite'
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

function readPackageVersionName(): string {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
      return pkg.version.trim();
    }
  } catch {}
  return '2.5.0';
}

function kftVersionManifestPlugin(): Plugin {
  const buildManifestJson = () => {
    const versionName = readPackageVersionName();
    const buildCode = readAndroidVersionCode();
    return JSON.stringify(
      {
        version: `v${versionName}`,
        versionName,
        buildCode,
        releasedAt: new Date().toISOString(),
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism',
      },
      null,
      2
    );
  };

  const handleFreeGmapsProxy = (req: any, res: any, next: () => void) => {
    if (req.url && req.url.startsWith('/__gmaps_free_search')) {
      const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const targetUrl = `https://www.google.com/search${qs}`;
      fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
        },
      })
        .then(async (upstream) => {
          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(text);
        })
        .catch((err) => {
          res.statusCode = 502;
          res.end(String(err?.message || 'Proxy error'));
        });
      return;
    }
    next();
  };

  return {
    name: 'kft-version-manifest',
    configureServer(server) {
      server.middlewares.use(handleFreeGmapsProxy);
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.split('?')[0] === '/version.json') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(buildManifestJson());
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleFreeGmapsProxy);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: buildManifestJson(),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __KFT_BUILD_CODE__: JSON.stringify(readAndroidVersionCode()),
    __KFT_VERSION_NAME__: JSON.stringify(readPackageVersionName()),
  },
  plugins: [
    react(),
    tailwindcss(),
    kftVersionManifestPlugin(),
  ],
  build: {
    sourcemap: false,
    minify: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('/src/data/seedRacCambodiaTourDestinations')) {
            return 'data-rac-destinations';
          }
          if (norm.includes('/src/data/seedHotels100')) {
            return 'data-hotels';
          }
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
