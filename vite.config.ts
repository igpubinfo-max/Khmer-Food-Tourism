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

const UC2_PREFIX = 'KFT_UC2:';
const CIPHER_KEY_MATERIAL = 'KFT_CAMBODIA_FLAVORS_TOURISM_2026_V271_PROTECTED_SEED_KEY_9F4A7C2E';
const KEY_CODES: number[] = Array.from(CIPHER_KEY_MATERIAL).map((ch) => ch.charCodeAt(0));
const A_MIN = 0x0020;
const A_MAX = 0x007e;
const A_SPAN = A_MAX - A_MIN + 1;
const B_MIN = 0x00a0;
const B_MAX = 0xd7ff;
const B_SPAN = B_MAX - B_MIN + 1;

function encodeSeedPayloadForBundle(data: unknown): string {
  const json = JSON.stringify(data);
  const len = json.length;
  const keyLen = KEY_CODES.length;
  const out = new Array<string>(len);
  for (let i = 0; i < len; i++) {
    const c = json.charCodeAt(i);
    const k = KEY_CODES[i % keyLen];
    if (c >= A_MIN && c <= A_MAX) {
      const offset = (k * 31 + i * 17 + 19) % A_SPAN;
      out[i] = String.fromCharCode(A_MIN + ((c - A_MIN + offset) % A_SPAN));
    } else if (c >= B_MIN && c <= B_MAX) {
      const offset = (k * 257 + i * 43 + 0x0393) % B_SPAN;
      out[i] = String.fromCharCode(B_MIN + ((c - B_MIN + offset) % B_SPAN));
    } else {
      out[i] = json[i];
    }
  }
  return UC2_PREFIX + out.join('');
}

const PROTECTED_SEED_FILE_RE =
  /\/src\/(data\/(seedDestPart[12]|seedSportsAndSouvenirs|cambodiaHeritageAndFactsData|seedRestPart[12]|seedHotelsPart[12]|seedRacPart[1-9]|seedYouthBrandedCafes|seedFoodpanda100Foods|seedTrendingFoods|seedVegetarian30Foods|seedAdditional100Foods|seedFoods)|services\/onlineFoodDiscoveryService)\.ts$/;

const PROTECTED_SEED_ARRAY_GLOBAL_RE =
  /((?:export\s+)?const\s+(?:destPart[12]|sportsAndSouvenirsDestinations|CAMBODIA_UNESCO_HERITAGE_LIST|CAMBODIA_NATIONAL_SYMBOLS_AND_WILDLIFE|CAMBODIA_DOMESTIC_TRANSPORT_ROUTES|CAMBODIA_FAST_FACTS|restPart[12]|hotelsPart[12]|racPart[1-9]|youthBrandedCafes30|foodpanda100Foods|initialTrendingFoods|RAW_30_VEGETARIAN_DISHES|RAW_100_NEW_DISHES|seedFoods|CURATED_YOUTUBE_VIDEOS|BACKUP_REPLACEMENT_YOUTUBE_VIDEOS|CURATED_TIKTOK_FACEBOOK_REVIEWS)\s*:\s*[^=]+?=\s*)(\[\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*\{[\s\S]*?\n\]);/g;

function kftSeedPayloadProtectionPlugin(): Plugin {
  return {
    name: 'kft-seed-payload-protection',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      const normId = id.replace(/\\/g, '/');
      if (!PROTECTED_SEED_FILE_RE.test(normId)) {
        return null;
      }
      let replacedCount = 0;
      const transformedBody = code.replace(
        PROTECTED_SEED_ARRAY_GLOBAL_RE,
        (fullMatch, prefix, arrayLiteral) => {
          try {
            const parsedArray = new Function('return ' + arrayLiteral)();
            if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
              return fullMatch;
            }
            const encryptedPayload = encodeSeedPayloadForBundle(parsedArray);
            const safeJsonLiteral = JSON.stringify(encryptedPayload)
              .replace(/\u2028/g, '\\u2028')
              .replace(/\u2029/g, '\\u2029');
            replacedCount++;
            return `${prefix}__kftDecodeSeed(${safeJsonLiteral});`;
          } catch {
            return fullMatch;
          }
        }
      );
      if (replacedCount === 0) {
        return null;
      }
      const importStmt = `import { decodeProtectedSeedPayload as __kftDecodeSeed } from '../utils/seedPayloadCipher';\n`;
      return {
        code: importStmt + transformedBody,
        map: null,
      };
    },
  };
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
        minRequiredBuildCode: buildCode,
        minRequiredVersion: versionName,
        forceUpdate: true,
        releasedAt: new Date().toISOString(),
        releaseNotesKh:
          'កំណែអាប់ដេតសំខាន់ចាំបាច់៖ បង្កើនល្បឿនស្វែងរកហាងអាហារបួស ការពារសុវត្ថិភាពគណនី VIP និងកែលម្អប្រព័ន្ធផែនទី។ សូមអាប់ដេតឥឡូវនេះដើម្បីបន្តប្រើប្រាស់កម្មវិធី។',
        releaseNotesEn:
          'Mandatory Update: Faster Vegetarian search, enhanced VIP account security, and improved map navigation. Please update now to continue using the app.',
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
    transform(code, id) {
      if (id.replace(/\\/g, '/').endsWith('/src/types/index.ts')) {
        const liveBuild = readAndroidVersionCode();
        const liveVer = readPackageVersionName();
        return {
          code: code
            .replace(/__KFT_BUILD_CODE__/g, JSON.stringify(liveBuild))
            .replace(/__KFT_VERSION_NAME__/g, JSON.stringify(liveVer)),
          map: null,
        };
      }
      return null;
    },
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
    generateBundle(_options, bundle) {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: buildManifestJson(),
      });
      // Strip residual block comments in emitted JS chunks for extra code obfuscation
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk' && typeof item.code === 'string') {
          item.code = item.code.replace(/\/\*![\s\S]*?\*\//g, '');
        }
      }
    },
  };
}

// https://vite.dev/config/
// Auto-reloaded buildCode: 1649
export default defineConfig({
  base: './',
  define: {
    __KFT_BUILD_CODE__: JSON.stringify(readAndroidVersionCode()),
    __KFT_VERSION_NAME__: JSON.stringify(readPackageVersionName()),
  },
  plugins: [
    kftSeedPayloadProtectionPlugin(),
    react(),
    tailwindcss(),
    kftVersionManifestPlugin(),
  ],
  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/k-[hash].js',
        chunkFileNames: 'assets/c-[hash].js',
        assetFileNames: 'assets/a-[hash][extname]',
        // Rolldown code-splitting groups: every emitted chunk is capped (maxSize) for fast mobile loading.
        codeSplitting: {
          groups: [
            { name: 'd-seed', test: /src[\\/]data[\\/]seed(Rac|Hotels|Dest|Rest)Part\d+/, maxSize: 420 * 1024 },
            { name: 'f-seed', test: /src[\\/]data[\\/]seed(Foods|Additional|Foodpanda|Vegetarian)/, maxSize: 420 * 1024 },
            { name: 'v0', test: /node_modules[\\/](react|scheduler)/ },
            { name: 'v2', test: /node_modules[\\/]tesseract\.js/, maxSize: 480 * 1024 },
            { name: 'v3', test: /node_modules[\\/]lucide-react/, maxSize: 480 * 1024 },
            { name: 'k5', test: /src[\\/](data[\\/]zhCompleteTranslations|utils[\\/]zhDynamicTranslator)/, maxSize: 480 * 1024 },
            { name: 'svc-soc', test: /src[\\/]services[\\/]onlineFoodDiscoveryService/, maxSize: 480 * 1024 },
            { name: 'svc', test: /src[\\/]services[\\/]/, maxSize: 480 * 1024 },
          ],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
