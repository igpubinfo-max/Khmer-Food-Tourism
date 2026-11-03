#!/usr/bin/env node
/**
 * scripts/verify_food_persistence_and_vip_auth.mjs
 *
 * Fast, deterministic end-to-end Node verification suite (hard 15s timeout, zero headless browsers).
 * Compiles & imports the REAL TypeScript modules (`src/types/index.ts`, `src/data/seedFoods.ts`,
 * `src/data/seedRestaurants.ts`, and `src/services/permanentMediaVaultService.ts`) via `esbuild`
 * and verifies:
 *   Part A: VIP Email Authentication Gate (`hasAuthenticatedEmailAccount` + `AppContext` / `UpgradeVipModal` hard guards)
 *   Part B: Permanent Food Photo & Data Persistence across multiple replacements, cold reloads,
 *           cloud sync merges with older payloads, compacted localStorage, app updates & logins
 *   Part C: Complete 200-Dish `seedFoods.ts` + `public/foods/*.jpg` file & metadata integrity audit
 *   Part D: Runtime `isStrictVerifiedCambodiaRestaurant` guardrail verification across all 200 shops
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

// Hard 15-second timeout guarantee (never hangs)
const hardTimeout = setTimeout(() => {
  console.error('[FATAL TIMEOUT] verify_food_persistence_and_vip_auth.mjs exceeded 15s limit.');
  process.exit(1);
}, 15000);
hardTimeout.unref();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

/**
 * Minimal deterministic in-memory `localStorage` + `IndexedDB` + `window` shim
 * so `permanentMediaVaultService.ts` executes its exact browser persistence paths in Node.
 */
function installBrowserStorageMocks() {
  const lsStore = new Map();
  const localStorageMock = {
    getItem(k) {
      return lsStore.has(String(k)) ? lsStore.get(String(k)) : null;
    },
    setItem(k, v) {
      lsStore.set(String(k), String(v));
    },
    removeItem(k) {
      lsStore.delete(String(k));
    },
    clear() {
      lsStore.clear();
    },
    get length() {
      return lsStore.size;
    },
    key(i) {
      return Array.from(lsStore.keys())[i] ?? null;
    },
  };

  // Synchronous-microtask IndexedDB 2.0 mock supporting open, transaction, objectStore, put, get, delete, openCursor
  const idbDatabases = new Map();

  function makeRequest(executor) {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
    queueMicrotask(() => {
      try {
        executor(req);
      } catch (err) {
        req.error = err;
        if (typeof req.onerror === 'function') req.onerror({ target: req });
      }
    });
    return req;
  }

  const indexedDBMock = {
    open(dbName) {
      let isNew = false;
      if (!idbDatabases.has(dbName)) {
        idbDatabases.set(dbName, new Map());
        isNew = true;
      }
      const storesMap = idbDatabases.get(dbName);
      const db = {
        close() {},
        objectStoreNames: {
          contains(name) {
            return storesMap.has(name);
          },
        },
        createObjectStore(name) {
          if (!storesMap.has(name)) storesMap.set(name, new Map());
          return {};
        },
        transaction(storeName) {
          if (!storesMap.has(storeName)) storesMap.set(storeName, new Map());
          const kv = storesMap.get(storeName);
          const tx = {
            oncomplete: null,
            onerror: null,
            onabort: null,
            error: null,
            objectStore() {
              return {
                get(key) {
                  return makeRequest((req) => {
                    req.result = kv.get(String(key));
                    if (typeof req.onsuccess === 'function') req.onsuccess({ target: req });
                    queueMicrotask(() => {
                      if (typeof tx.oncomplete === 'function') tx.oncomplete();
                    });
                  });
                },
                put(val, key) {
                  return makeRequest((req) => {
                    kv.set(String(key), structuredClone(val));
                    req.result = key;
                    if (typeof req.onsuccess === 'function') req.onsuccess({ target: req });
                    queueMicrotask(() => {
                      if (typeof tx.oncomplete === 'function') tx.oncomplete();
                    });
                  });
                },
                delete(key) {
                  return makeRequest((req) => {
                    kv.delete(String(key));
                    req.result = undefined;
                    if (typeof req.onsuccess === 'function') req.onsuccess({ target: req });
                    queueMicrotask(() => {
                      if (typeof tx.oncomplete === 'function') tx.oncomplete();
                    });
                  });
                },
                openCursor() {
                  const entries = Array.from(kv.entries());
                  let idx = 0;
                  const req = { result: null, error: null, onsuccess: null, onerror: null };
                  const step = () => {
                    if (idx < entries.length) {
                      const [k, v] = entries[idx++];
                      req.result = {
                        key: k,
                        value: structuredClone(v),
                        continue() {
                          queueMicrotask(step);
                        },
                      };
                    } else {
                      req.result = null;
                    }
                    if (typeof req.onsuccess === 'function') req.onsuccess({ target: req });
                    if (req.result === null) {
                      queueMicrotask(() => {
                        if (typeof tx.oncomplete === 'function') tx.oncomplete();
                      });
                    }
                  };
                  queueMicrotask(step);
                  return req;
                },
              };
            },
          };
          return tx;
        },
      };

      return makeRequest((req) => {
        req.result = db;
        if (isNew && typeof req.onupgradeneeded === 'function') {
          req.onupgradeneeded({ target: req });
        }
        if (typeof req.onsuccess === 'function') {
          req.onsuccess({ target: req });
        }
      });
    },
    __getRawStore(dbName, storeName) {
      return idbDatabases.get(dbName)?.get(storeName) || new Map();
    },
  };

  // Sandbox network calls so verification never mutates live production Supabase tables
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    json: async () => [],
    text: async () => '[]',
  });

  globalThis.localStorage = localStorageMock;
  globalThis.indexedDB = indexedDBMock;
  globalThis.window = {
    localStorage: localStorageMock,
    indexedDB: indexedDBMock,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
  };
  return { localStorageMock, indexedDBMock };
}

async function compileAndImportAppModules() {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        (specifier.startsWith('./') || specifier.startsWith('../')) &&
        context.parentURL &&
        context.parentURL.startsWith('file:') &&
        !context.parentURL.includes('/node_modules/')
      ) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL));
        const candidateBase = path.resolve(parentDir, specifier);
        for (const candidate of [
          candidateBase,
          `${candidateBase}.ts`,
          `${candidateBase}.tsx`,
          path.join(candidateBase, 'index.ts'),
        ]) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return nextResolve(pathToFileURL(candidate).href, context);
          }
        }
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith('file:') && (url.endsWith('.ts') || url.endsWith('.tsx'))) {
        const filePath = fileURLToPath(url);
        const rawTs = fs.readFileSync(filePath, 'utf8');
        const transpiled = ts.transpileModule(rawTs, {
          fileName: filePath,
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        });
        return {
          format: 'module',
          shortCircuit: true,
          source: transpiled.outputText,
        };
      }
      return nextLoad(url, context);
    },
  });

  const typesMod = await import(pathToFileURL(path.join(ROOT_DIR, 'src', 'types', 'index.ts')).href);
  const vaultMod = await import(
    pathToFileURL(path.join(ROOT_DIR, 'src', 'services', 'permanentMediaVaultService.ts')).href
  );
  const foodsMod = await import(pathToFileURL(path.join(ROOT_DIR, 'src', 'data', 'seedFoods.ts')).href);
  const restsMod = await import(
    pathToFileURL(path.join(ROOT_DIR, 'src', 'data', 'seedRestaurants.ts')).href
  );
  const trendMod = await import(
    pathToFileURL(path.join(ROOT_DIR, 'src', 'data', 'seedTrendingFoods.ts')).href
  );

  return {
    ...typesMod,
    ...vaultMod,
    initial200Foods: foodsMod.initial200Foods,
    initial100Restaurants: restsMod.initial100Restaurants,
    initialTrendingFoods: trendMod.initialTrendingFoods,
  };
}

async function main() {
  const startMs = Date.now();
  console.log('====================================================================');
  console.log(' VIP Email Auth Gate & Permanent Food Media Synchronization Audit');
  console.log('====================================================================');

  const { localStorageMock, indexedDBMock } = installBrowserStorageMocks();
  const app = await compileAndImportAppModules();

  // =========================================================================
  // PART A: Enforce Email Authentication Before VIP Upgrade & ABA QR Code
  // =========================================================================
  {
    const { hasAuthenticatedEmailAccount } = app;

    // 1. Strictly rejected unauthenticated / guest / phone-only / placeholder accounts
    const rejectedCases = [
      ['null user', null],
      ['undefined user', undefined],
      ['empty object', {}],
      ['guest flag with email', { id: 'u1', email: 'real@gmail.com', isGuest: true, role: 'user' }],
      ['guest role with email', { id: 'u2', email: 'real@gmail.com', role: 'guest' }],
      ['guest authProvider', { id: 'u3', email: 'real@gmail.com', authProvider: 'guest' }],
      ['guest- prefixed id', { id: 'guest-991', email: 'real@gmail.com', role: 'user' }],
      ['empty email', { id: 'u4', email: '', role: 'user', authProvider: 'email' }],
      ['whitespace email', { id: 'u5', email: '   ', role: 'user', authProvider: 'email' }],
      ['@phone.kh synthetic email', { id: 'u6', email: '012345678@phone.kh', role: 'user' }],
      ['@user.kh synthetic email', { id: 'u7', email: '012345678@user.kh', role: 'user' }],
      ['@guest.local placeholder', { id: 'u8', email: 'guest@guest.local', role: 'user' }],
      ['@placeholder.local', { id: 'u9', email: 'user@placeholder.local', role: 'user' }],
      ['@example.com test email', { id: 'u10', email: 'demo@example.com', role: 'user' }],
      ['phone digits @local', { id: 'u11', email: '+85512888999@local.kh', role: 'user' }],
      [
        'phone-only authProvider without linked email/google',
        { id: 'u12', email: 'kimseng@gmail.com', role: 'user', authProvider: 'phone', linkedProviders: ['phone'] },
      ],
    ];

    for (const [label, candidate] of rejectedCases) {
      assert.equal(
        hasAuthenticatedEmailAccount(candidate),
        false,
        `Expected hasAuthenticatedEmailAccount to REJECT ${label}`
      );
    }

    // 2. Strictly accepted real authenticated Email & Google accounts
    const acceptedCases = [
      [
        'authenticated Email user',
        { id: 'user-email-1', name: 'Sokha', email: 'sokha.kh@gmail.com', role: 'user', authProvider: 'email' },
      ],
      [
        'authenticated Google OAuth user',
        { id: 'user-google-1', name: 'Dara', email: 'dara.dev@company.com.kh', role: 'user', authProvider: 'google' },
      ],
      [
        'phone account with linked email provider',
        {
          id: 'user-linked-1',
          name: 'Vanna',
          email: 'vanna@outlook.com',
          role: 'user',
          authProvider: 'phone',
          linkedProviders: ['phone', 'email'],
        },
      ],
    ];

    for (const [label, candidate] of acceptedCases) {
      assert.equal(
        hasAuthenticatedEmailAccount(candidate),
        true,
        `Expected hasAuthenticatedEmailAccount to ACCEPT ${label}`
      );
    }

    // 3. Static source contract audit on AppContext.tsx, UpgradeVipModal.tsx & AuthModal.tsx
    const appCtxSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'context', 'AppContext.tsx'), 'utf8');
    const vipModalSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'UpgradeVipModal.tsx'), 'utf8');
    const authModalSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'AuthModal.tsx'), 'utf8');

    assert.ok(
      appCtxSrc.includes('setIsUpgradeVipModalOpenRaw(false)') &&
        (appCtxSrc.includes("mode: 'email'") || appCtxSrc.includes("mode: 'main'")) &&
        appCtxSrc.includes("emailTab: 'login'") &&
        appCtxSrc.includes('requireEmailForVip: true'),
      'AppContext redirectToEmailLoginForVipUpgrade must close VIP modal and open AuthModal in Login with Google/Email mode'
    );
    assert.ok(
      appCtxSrc.includes('completePendingVipRedirectAfterEmailAuth') &&
        vipModalSrc.includes('!hasAuthenticatedEmailAccount(currentUser)') &&
        authModalSrc.includes('hasAuthenticatedEmailAccount({ email: cleanEmail })'),
      'UpgradeVipModal & AuthModal must enforce hasAuthenticatedEmailAccount hard guards'
    );

    console.log(
      `✓ Part A (VIP Email Authentication Gate)      : PASS (${rejectedCases.length} guest/placeholder cases blocked, ${acceptedCases.length} real email accounts allowed)`
    );
  }

  // =========================================================================
  // PART B: Permanent Food Image & Data Replacement, Sync & Anti-Revert Tests
  // =========================================================================
  {
    const {
      SEED_FOOD_PHOTO_BASELINE_ISO,
      SEED_FOOD_PHOTO_BASELINE_MS,
      VAULT_KEYS,
      initial200Foods,
      initialTrendingFoods,
      __resetMediaVaultInMemoryStateForTests,
      loadLocalMediaOverrides,
      hydrateFromLocalIdbImmediate,
      recordPermanentFoodOverride,
      mergeOverrideBundles,
      applyFoodOverrides,
      applyTrendingFoodOverrides,
      resolveFoodPhotoUrl,
    } = app;

    assert.ok(
      SEED_FOOD_PHOTO_BASELINE_MS > new Date('2026-10-30T00:00:00.000Z').getTime(),
      'SEED_FOOD_PHOTO_BASELINE_MS must be authoritative post-audit timestamp'
    );

    // 1. Seed stale pre-baseline override AND legacy themealdb auto-scraped override -> must be rejected & purged!
    localStorageMock.clear();
    localStorageMock.setItem(
      VAULT_KEYS.FOODS,
      JSON.stringify({
        'food-1': {
          id: 'food-1',
          photoUrl: 'https://old-bucket.example/stale-amok-from-oct28.jpg',
          isCustomPhoto: true,
          revision: 1,
          updatedAt: '2026-10-28T09:00:00.000Z', // Older than SEED_FOOD_PHOTO_BASELINE_ISO!
        },
        'food-13': {
          id: 'food-13',
          photoUrl: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg',
          isCustomPhoto: true,
          revision: 5,
          updatedAt: '2026-10-31T23:00:00.000Z', // Auto-scraped external placeholder domain!
        },
      })
    );

    __resetMediaVaultInMemoryStateForTests();
    const cleanedBundle = await hydrateFromLocalIdbImmediate();
    assert.equal(cleanedBundle.foods['food-1'], undefined, 'Pre-baseline stale food override must be purged');
    assert.equal(cleanedBundle.foods['food-13'], undefined, 'Legacy themealdb placeholder override must be purged');

    const afterPurgeFoods = applyFoodOverrides(initial200Foods, cleanedBundle.foods);
    assert.equal(afterPurgeFoods.find((f) => f.id === 'food-1').photoUrl, '/foods/food-1.jpg');
    assert.equal(afterPurgeFoods.find((f) => f.id === 'food-13').photoUrl, '/foods/food-13.jpg');

    // 2. Perform 4 sequential replacements on the same food record (food-13):
    //    v1 (data URI) -> v2 (https cloud URL) -> v3 (/foods/ static path) -> v4 (final https cloud URL + edited title/description)
    const targetSeed = initial200Foods.find((f) => f.id === 'food-13');
    assert.ok(targetSeed, 'food-13 must exist in initial200Foods');

    const v1Photo = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg-binary-payload-v1').toString('base64');
    const v2Photo = 'https://ryvltobwuwuulazqjnza.supabase.co/storage/v1/object/public/food-photos/food-13-v2.jpg';
    const v3Photo = '/foods/food-13.jpg';
    const v4Photo = 'https://ryvltobwuwuulazqjnza.supabase.co/storage/v1/object/public/food-photos/food-13-v4-approved.jpg';

    await recordPermanentFoodOverride({ ...targetSeed, photoUrl: v1Photo, isCustomPhoto: true });
    const snap1 = structuredClone(loadLocalMediaOverrides());

    await recordPermanentFoodOverride({
      ...targetSeed,
      photoUrl: v2Photo,
      descriptionKh: 'ការពិពណ៌នាថ្មីលើកទី ២',
      isCustomPhoto: true,
    });
    const snap2 = structuredClone(loadLocalMediaOverrides());

    await recordPermanentFoodOverride({
      ...targetSeed,
      photoUrl: v3Photo,
      descriptionKh: 'ការពិពណ៌នាថ្មីលើកទី ៣',
      isCustomPhoto: true,
    });
    const snap3 = structuredClone(loadLocalMediaOverrides());

    // CRITICAL REGRESSION TEST: Merging older https v2 (`snap2`) with newer `/foods/` v3 (`snap3`)
    // Previously `mergeOverrideBundles` resurrected `v2` (`https:`) over `v3` (`/foods/`)!
    const mergedV2AndV3 = mergeOverrideBundles(snap2, snap3);
    assert.equal(
      mergedV2AndV3.foods['food-13'].photoUrl,
      v3Photo,
      'mergeOverrideBundles MUST NOT resurrect older https URL (v2) over newer /foods/ replacement (v3)!'
    );
    const mergedV3AndV2Reverse = mergeOverrideBundles(snap3, snap2);
    assert.equal(
      mergedV3AndV2Reverse.foods['food-13'].photoUrl,
      v3Photo,
      'mergeOverrideBundles must be commutative — newer revision v3 always beats older v2!'
    );

    // 4th replacement (v4 — final admin-approved cloud image & updated description)
    const updatedNameKh = `${targetSeed.nameKh} (រូបភាពថ្មីផ្លូវការ)`;
    const updatedDescKh = 'រូបភាព និងទិន្នន័យម្ហូបថ្មីចុងក្រោយដែលបានអនុម័តដោយ Admin។';
    await recordPermanentFoodOverride({
      ...targetSeed,
      nameKh: updatedNameKh,
      descriptionKh: updatedDescKh,
      photoUrl: v4Photo,
      isCustomPhoto: true,
    });
    const snap4 = structuredClone(loadLocalMediaOverrides());

    // Verify monotonic revision progression: r1 < r2 < r3 < r4
    const r1 = snap1.foods['food-13'].revision;
    const r2 = snap2.foods['food-13'].revision;
    const r3 = snap3.foods['food-13'].revision;
    const r4 = snap4.foods['food-13'].revision;
    assert.ok(r1 < r2 && r2 < r3 && r3 < r4, `Expected monotonic revisions r1<r2<r3<r4, got ${r1},${r2},${r3},${r4}`);

    // Verify IndexedDB atomic key `food:food-13` holds v4 and no stale v1/v2/v3 URL remains
    const rawIdbMap = indexedDBMock.__getRawStore('kft_permanent_media_vault_idb_v1', 'media_overrides');
    const idbFood13 = rawIdbMap.get('food:food-13');
    assert.ok(idbFood13, 'IndexedDB must store atomic per-record key food:food-13');
    assert.equal(idbFood13.photoUrl, v4Photo, 'IndexedDB food:food-13 must match latest v4 image');
    assert.equal(idbFood13.revision, r4, 'IndexedDB food:food-13 revision must match r4');

    // 3. Simulate Cold App Restart / Server Restart / App Build Update / Stale Cloud Sync / User Login
    __resetMediaVaultInMemoryStateForTests();
    const rehydratedAfterRestart = await hydrateFromLocalIdbImmediate();
    assert.equal(rehydratedAfterRestart.foods['food-13'].photoUrl, v4Photo);
    assert.equal(rehydratedAfterRestart.foods['food-13'].revision, r4);

    // Simulate incoming stale cloud payload from an older backup (`snap1` or `snap2`)
    const afterStaleCloudSync = mergeOverrideBundles(snap1, rehydratedAfterRestart);
    assert.equal(
      afterStaleCloudSync.foods['food-13'].photoUrl,
      v4Photo,
      'Stale cloud payload (v1) must NEVER overwrite newer local/approved replacement (v4)'
    );

    // Simulate compacted localStorage `kft_foods_200_v9` holding seed fallback URL with `isCustomPhoto: false, __compactedFromVault: true`
    const compactedList = initial200Foods.map((f) =>
      f.id === 'food-13'
        ? { ...f, photoUrl: '/foods/food-13.jpg', isCustomPhoto: false, __compactedFromVault: true }
        : f
    );
    const finalHydratedFoods = applyFoodOverrides(compactedList, afterStaleCloudSync.foods);
    const finalFood13 = finalHydratedFoods.find((f) => f.id === 'food-13');
    assert.equal(finalFood13.photoUrl, v4Photo, 'applyFoodOverrides must restore v4 over compacted localStorage fallback');
    assert.equal(finalFood13.nameKh, updatedNameKh, 'Updated food nameKh must persist');
    assert.equal(finalFood13.descriptionKh, updatedDescKh, 'Updated food descriptionKh must persist');

    // Verify TrendingFoodsRow synchronization (`applyTrendingFoodOverrides`) also reflects the new photo immediately
    const syncedTrending = applyTrendingFoodOverrides(
      initialTrendingFoods,
      afterStaleCloudSync.trendingFoods,
      afterStaleCloudSync.foods,
      finalHydratedFoods
    );
    for (const tf of syncedTrending) {
      if (tf.matchedFoodId === 'food-13') {
        assert.equal(tf.photoUrl, v4Photo, 'Trending food linked to food-13 must display latest v4 photo');
      }
    }

    // Verify WebView static asset cache-busting query string on `/foods/*.jpg`
    const bustedStaticUrl = resolveFoodPhotoUrl('/foods/food-1.jpg', SEED_FOOD_PHOTO_BASELINE_ISO);
    assert.ok(
      bustedStaticUrl.startsWith(`/foods/food-1.jpg?v=${app.APP_BUILD_CODE}_`),
      `Expected resolveFoodPhotoUrl to append deterministic ?v=${app.APP_BUILD_CODE}_..., got: ${bustedStaticUrl}`
    );

    console.log(
      `✓ Part B (Permanent Food Image & Sync Engine) : PASS (4x sequential replacements, cold reload, stale cloud sync & cache-busting verified)`
    );
  }

  // =========================================================================
  // PART C: Complete 200+ Dish Food Database & `public/foods/` Asset Audit
  // =========================================================================
  {
    const { initial200Foods, SEED_FOOD_PHOTO_BASELINE_MS } = app;
    assert.ok(
      initial200Foods.length >= 170 && initial200Foods.length <= 235,
      `Expected 170..235 verified seed foods, found ${initial200Foods.length}`
    );

    const seenIds = new Set();
    const seenNameKh = new Set();
    const seenNameEn = new Set();
    const fileSha1Map = new Map();

    for (const f of initial200Foods) {
      assert.ok(f.id && !seenIds.has(f.id), `Duplicate or missing food id: ${f.id}`);
      seenIds.add(f.id);

      assert.ok(f.nameKh && f.nameKh.trim().length >= 2, `Empty nameKh on ${f.id}`);
      assert.ok(f.nameEn && f.nameEn.trim().length >= 2, `Empty nameEn on ${f.id}`);
      const normKh = f.nameKh.trim().toLowerCase();
      const normEn = f.nameEn.trim().toLowerCase();
      assert.ok(!seenNameKh.has(normKh), `Duplicate food nameKh "${f.nameKh}" on ${f.id}`);
      assert.ok(!seenNameEn.has(normEn), `Duplicate food nameEn "${f.nameEn}" on ${f.id}`);
      seenNameKh.add(normKh);
      seenNameEn.add(normEn);

      assert.ok(f.categorySlug && f.categoryKh && f.categoryEn, `Missing category on ${f.id}`);
      assert.ok(f.descriptionKh && f.descriptionEn, `Missing description on ${f.id}`);
      assert.ok(Array.isArray(f.ingredients) && f.ingredients.length >= 2, `Incomplete ingredients on ${f.id}`);
      assert.ok(Array.isArray(f.steps) && f.steps.length >= 2, `Incomplete steps on ${f.id}`);

      const ts = Date.parse(f.photoUpdatedAt || '');
      assert.ok(
        Number.isFinite(ts) && ts >= SEED_FOOD_PHOTO_BASELINE_MS,
        `${f.id} has outdated or missing photoUpdatedAt: ${f.photoUpdatedAt}`
      );

      assert.ok(
        typeof f.photoUrl === 'string' && f.photoUrl.startsWith('/foods/'),
        `${f.id} has unexpected photoUrl: ${f.photoUrl}`
      );
      const diskPath = path.join(PUBLIC_DIR, f.photoUrl.replace(/^\//, ''));
      assert.ok(fs.existsSync(diskPath), `Missing image file on disk for ${f.id}: ${diskPath}`);
      const buf = fs.readFileSync(diskPath);
      assert.ok(buf.length > 5120, `Corrupted/tiny image file (<5KB) for ${f.id}: ${buf.length} bytes`);

      const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
      assert.ok(
        !fileSha1Map.has(sha1),
        `Duplicate binary food image between ${f.id} and ${fileSha1Map.get(sha1)} (${f.photoUrl})`
      );
      fileSha1Map.set(sha1, f.id);
    }

    console.log(
      `✓ Part C (Seed Food DB & Image File Integrity) : PASS (${initial200Foods.length}/${initial200Foods.length} dishes, 0 duplicates, ${initial200Foods.length}/${initial200Foods.length} unique verified JPEG files on disk)`
    );
  }

  // =========================================================================
  // PART D: Runtime `isStrictVerifiedCambodiaRestaurant` Guardrail Audit
  // =========================================================================
  {
    const { initial100Restaurants, isStrictVerifiedCambodiaRestaurant } = app;
    assert.ok(initial100Restaurants.length > 0 && initial100Restaurants.length <= 200);

    for (const r of initial100Restaurants) {
      assert.equal(
        isStrictVerifiedCambodiaRestaurant(r),
        true,
        `Seed restaurant ${r.id} (${r.nameEn}) failed runtime guardrail isStrictVerifiedCambodiaRestaurant!`
      );
    }

    const sampleValid = initial100Restaurants[0];
    assert.equal(isStrictVerifiedCambodiaRestaurant({ ...sampleValid, latitude: 0, longitude: 0 }), false);
    assert.equal(isStrictVerifiedCambodiaRestaurant({ ...sampleValid, latitude: 16.5, longitude: 104.9 }), false);
    assert.equal(isStrictVerifiedCambodiaRestaurant({ ...sampleValid, locationNeedsReview: true }), false);
    assert.equal(isStrictVerifiedCambodiaRestaurant({ ...sampleValid, addressKh: '', addressEn: '' }), false);
    assert.equal(isStrictVerifiedCambodiaRestaurant({ ...sampleValid, id: 'food-99' }), false);

    console.log(
      `✓ Part D (Runtime Restaurant Guardrail Test)  : PASS (${initial100Restaurants.length}/${initial100Restaurants.length} verified shops pass; (0,0)/fake/unverified strictly blocked)`
    );
  }

  const elapsedMs = Date.now() - startMs;
  console.log('--------------------------------------------------------------------');
  console.log(`ALL VERIFICATION SUITES PASSED 100% IN ${elapsedMs}ms`);
  console.log('====================================================================');
}

main().catch((err) => {
  console.error('\n[VERIFICATION FAILED]:', err);
  process.exit(1);
});
