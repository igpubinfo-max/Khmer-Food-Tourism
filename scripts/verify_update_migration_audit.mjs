#!/usr/bin/env node
/**
 * scripts/verify_update_migration_audit.mjs
 *
 * Comprehensive App Update, Storage Quota, Cloud Resilience & Anti-Regression Migration Test Suite.
 * Executes against the REAL TypeScript source modules (`src/types/index.ts`, `src/utils/securityIntegrityGuard.ts`,
 * `src/utils/avatarHelper.ts`, `src/services/permanentMediaVaultService.ts`, `src/services/supabaseService.ts`,
 * and `src/data/seed*.ts`) to prove 100% data safety across APK updates:
 *
 *   Suite 1: localStorage 5MB QuotaExceededError recovery, IndexedDB persistence & Offline/Slow Supabase resilience
 *   Suite 2: 100% preservation of Registered Users (Free + 30d/90d/365d VIP + Stacked Renewals), Active Login Session,
 *            Custom Profile Avatars, VIP-Owned Shops (verified & pending-GPS), and Verified Payment History on Update
 *   Suite 3: Zero reversion to old seed photos & Zero resurrection of Admin-deleted Foods, Restaurants, or Destinations
 *            across APK version updates, cold IndexedDB restarts, Cloud Sync merges, and Preferences Reset
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const hardTimeout = setTimeout(() => {
  console.error('[FATAL TIMEOUT] verify_update_migration_audit.mjs exceeded 25s limit.');
  process.exit(1);
}, 25000);
hardTimeout.unref();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Deterministic browser `localStorage` (with configurable UTF-16 quota enforcement),
 * `IndexedDB`, and programmable Supabase REST / Storage `fetch` simulator.
 */
function createSimulatedEnvironment() {
  const lsStore = new Map();
  let maxCharsQuota = 2_500_000; // ~5.0MB UTF-16 default

  const getUsedChars = (excludeKey = null) => {
    let total = 0;
    for (const [k, v] of lsStore.entries()) {
      if (k === excludeKey) continue;
      total += k.length + v.length;
    }
    return total;
  };

  const localStorageMock = {
    setQuotaChars(limitChars) {
      maxCharsQuota = limitChars;
    },
    getUsedChars,
    getItem(k) {
      return lsStore.has(String(k)) ? lsStore.get(String(k)) : null;
    },
    setItem(k, v) {
      const key = String(k);
      const val = String(v);
      const projected = getUsedChars(key) + key.length + val.length;
      if (projected > maxCharsQuota) {
        const err = new Error(`QuotaExceededError: Failed to set '${key}' (${projected} > ${maxCharsQuota} chars)`);
        err.name = 'QuotaExceededError';
        throw err;
      }
      lsStore.set(key, val);
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

  // IndexedDB 2.0 simulator
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
    __clearAllDatabases() {
      idbDatabases.clear();
    },
    __getRawStore(dbName, storeName) {
      return idbDatabases.get(dbName)?.get(storeName) || new Map();
    },
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
                    req.result = kv.has(String(key)) ? structuredClone(kv.get(String(key))) : undefined;
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
  };

  // Programmable in-memory Supabase `app_sync_store` + offline/latency network simulator
  const cloudKvTable = new Map(); // key -> { key, payload, updated_at }
  let networkMode = 'online'; // 'online' | 'offline' | 'slow_timeout'

  const makeJsonResponse = (status, data) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(h) {
        return String(h).toLowerCase() === 'content-type' ? 'application/json' : null;
      },
    },
    json: async () => structuredClone(data),
    text: async () => JSON.stringify(data),
  });

  globalThis.fetch = async (input, init = {}) => {
    if (networkMode === 'offline') {
      throw new TypeError('Failed to fetch (Simulated Offline Network)');
    }
    if (networkMode === 'slow_timeout') {
      const abortErr = new Error('The operation was aborted due to slow network timeout');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    const urlStr = typeof input === 'string' ? input : String(input?.url || '');
    const method = String(init.method || 'GET').toUpperCase();

    // Simulate Supabase Storage upload endpoint -> return deterministic HTTPS CDN URL
    if (urlStr.includes('/storage/v1/object/')) {
      const objectPath = urlStr.split('/storage/v1/object/')[1] || `media_${Date.now()}.jpg`;
      return makeJsonResponse(200, { Key: objectPath });
    }

    // Simulate Supabase PostgREST `/rest/v1/kft_app_kv_store`
    if (urlStr.includes('/rest/v1/kft_app_kv_store')) {
      const parsedUrl = new URL(urlStr);
      const keyParam = parsedUrl.searchParams.get('key') || '';
      const selectParam = parsedUrl.searchParams.get('select') || '*';

      if (method === 'GET') {
        let rows = Array.from(cloudKvTable.values());
        if (keyParam.startsWith('eq.')) {
          const targetKey = decodeURIComponent(keyParam.slice(3));
          rows = rows.filter((r) => r.key === targetKey);
        } else if (keyParam.startsWith('like.')) {
          const pattern = decodeURIComponent(keyParam.slice(5));
          const prefix = pattern.replace(/[%*]$/, '');
          rows = rows.filter((r) => r.key.startsWith(prefix));
        } else if (keyParam.startsWith('in.(') && keyParam.endsWith(')')) {
          const inner = keyParam.slice(4, -1);
          const wanted = new Set(
            inner
              .split(',')
              .map((s) => decodeURIComponent(s.trim().replace(/^"|"$/g, '')))
              .filter(Boolean)
          );
          rows = rows.filter((r) => wanted.has(r.key));
        }
        if (selectParam === 'key,updated_at') {
          return makeJsonResponse(
            200,
            rows.map((r) => ({ key: r.key, updated_at: r.updated_at }))
          );
        }
        return makeJsonResponse(200, rows);
      }

      if (method === 'POST' || method === 'PATCH') {
        const body = init.body ? JSON.parse(String(init.body)) : {};
        const items = Array.isArray(body) ? body : [body];
        for (const item of items) {
          if (item && item.key) {
            cloudKvTable.set(item.key, {
              key: item.key,
              payload: structuredClone(item.payload),
              updated_at: item.updated_at || new Date().toISOString(),
            });
          }
        }
        return makeJsonResponse(201, items);
      }

      if (method === 'DELETE') {
        if (keyParam.startsWith('eq.')) {
          const targetKey = decodeURIComponent(keyParam.slice(3));
          cloudKvTable.delete(targetKey);
        }
        return makeJsonResponse(204, []);
      }
    }

    return makeJsonResponse(200, []);
  };

  const mockNavigator = { onLine: true };
  globalThis.localStorage = localStorageMock;
  globalThis.indexedDB = indexedDBMock;
  Object.defineProperty(globalThis, 'navigator', {
    value: mockNavigator,
    configurable: true,
    writable: true,
  });
  globalThis.window = {
    localStorage: localStorageMock,
    indexedDB: indexedDBMock,
    navigator: mockNavigator,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };

  return {
    localStorageMock,
    indexedDBMock,
    cloudKvTable,
    setNetworkMode(mode) {
      networkMode = mode;
      mockNavigator.onLine = mode === 'online';
    },
  };
}

async function importAppModules() {
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
  const guardMod = await import(
    pathToFileURL(path.join(ROOT_DIR, 'src', 'utils', 'securityIntegrityGuard.ts')).href
  );
  const avatarMod = await import(pathToFileURL(path.join(ROOT_DIR, 'src', 'utils', 'avatarHelper.ts')).href);
  const vaultMod = await import(
    pathToFileURL(path.join(ROOT_DIR, 'src', 'services', 'permanentMediaVaultService.ts')).href
  );
  const supaMod = await import(
    pathToFileURL(path.join(ROOT_DIR, 'src', 'services', 'supabaseService.ts')).href
  );
  const foodsMod = await import(pathToFileURL(path.join(ROOT_DIR, 'src', 'data', 'seedFoods.ts')).href);
  const restsMod = await import(
    pathToFileURL(path.join(ROOT_DIR, 'src', 'data', 'seedRestaurants.ts')).href
  );
  const destsMod = await import(
    pathToFileURL(path.join(ROOT_DIR, 'src', 'data', 'seedDestinations.ts')).href
  );

  return {
    ...typesMod,
    ...guardMod,
    ...avatarMod,
    ...vaultMod,
    ...supaMod,
    initial200Foods: foodsMod.initial200Foods,
    initial100Restaurants: restsMod.initial100Restaurants,
    initialDestinations: destsMod.initial100Destinations || destsMod.initialRealDestinations || destsMod.initialDestinations,
  };
}

/**
 * Extracts and executes the REAL pre-boot migration blocks (Steps 0, 1 & 2) from `src/main.tsx`
 * so our test exercises the exact code that runs on a user's Android device when installing a new APK!
 */
function createMainPreBootExecutor(sanitizeStartupCurrentUser, APP_VERSION_NAME, APP_BUILD_CODE) {
  const mainTsxPath = path.join(ROOT_DIR, 'src', 'main.tsx');
  const rawMain = fs.readFileSync(mainTsxPath, 'utf8');
  const startIdx = rawMain.indexOf('// 0. Pre-boot cache sanitation');
  const endIdx = rawMain.indexOf('// 2b. Protect original food photography');
  assert.ok(startIdx > 0 && endIdx > startIdx, 'Could not locate pre-boot migration block in src/main.tsx');
  const preBootTs = rawMain.slice(startIdx, endIdx);
  const transpiledJs = ts.transpileModule(preBootTs, {
    fileName: 'main-preboot.ts',
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return function runPreBootUpgrade(simulatedVersionName = APP_VERSION_NAME, simulatedBuildCode = APP_BUILD_CODE) {
    const fn = new Function(
      'localStorage',
      'sanitizeStartupCurrentUser',
      'APP_VERSION_NAME',
      'APP_BUILD_CODE',
      transpiledJs
    );
    fn(globalThis.localStorage, sanitizeStartupCurrentUser, simulatedVersionName, simulatedBuildCode);
  };
}

async function flushAsyncMicrotasks() {
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

async function main() {
  const t0 = Date.now();
  console.log('========================================================================');
  console.log(' App Update Migration, Quota Safety & Permanent Media Vault Audit Suite');
  console.log('========================================================================');

  const env = createSimulatedEnvironment();
  const app = await importAppModules();
  const runMainPreBoot = createMainPreBootExecutor(
    app.sanitizeStartupCurrentUser,
    app.APP_VERSION_NAME,
    app.APP_BUILD_CODE
  );

  // ===========================================================================
  // SUITE 1: localStorage 5MB Quota Overflow, IndexedDB & Offline/Slow Supabase
  // ===========================================================================
  {
    env.localStorageMock.clear();
    env.indexedDBMock.__clearAllDatabases();
    env.cloudKvTable.clear();
    if (typeof app.__resetMediaVaultInMemoryStateForTests === 'function') {
      app.__resetMediaVaultInMemoryStateForTests();
    }

    // 1A. Simulate tight localStorage quota (~320KB limit) & offline network
    env.localStorageMock.setQuotaChars(320_000);
    env.setNetworkMode('offline');

    const heavyPhoto1 = `data:image/jpeg;base64,${'A'.repeat(180_000)}_CUSTOM_FOOD_1`;
    const heavyPhoto2 = `data:image/jpeg;base64,${'B'.repeat(180_000)}_CUSTOM_FOOD_2`;
    const heavyDestPhoto = `data:image/jpeg;base64,${'C'.repeat(140_000)}_CUSTOM_DEST_1`;

    const sampleFood1 = { ...app.initial200Foods[0], photoUrl: heavyPhoto1, isCustomPhoto: true };
    const sampleFood2 = { ...app.initial200Foods[1], photoUrl: heavyPhoto2, isCustomPhoto: true };
    const sampleDest1 = { ...app.initialDestinations[0], photoUrl: heavyDestPhoto, isCustomPhoto: true };

    // Must NOT crash even when 2x 180KB + 140KB = 500KB exceeds 320KB localStorage quota AND network is offline!
    await app.saveAdminFoodOverridePermanently(sampleFood1, { awaitCloud: false });
    await app.saveAdminFoodOverridePermanently(sampleFood2, { awaitCloud: false });
    app.recordPermanentDestinationOverride(sampleDest1);
    await flushAsyncMicrotasks();

    const pendingOffline = app.loadPendingMediaCloudQueue();
    assert.ok(
      pendingOffline[`food:${sampleFood1.id}`] &&
        pendingOffline[`food:${sampleFood2.id}`] &&
        pendingOffline[`dest:${sampleDest1.id}`],
      'Unsynced media overrides must be queued safely while offline'
    );

    // 1B. Simulate slow network timeout -> must degrade gracefully with zero crashes
    env.setNetworkMode('slow_timeout');
    const hydratedUnderTimeout = await app.hydrateAndSyncMediaOverrides({ force: true });
    assert.equal(hydratedUnderTimeout.foods[sampleFood1.id]?.photoUrl, heavyPhoto1);
    assert.equal(hydratedUnderTimeout.foods[sampleFood2.id]?.photoUrl, heavyPhoto2);
    assert.equal(hydratedUnderTimeout.destinations[sampleDest1.id]?.photoUrl, heavyDestPhoto);

    // 1C. Simulate cold restart (clear in-memory cache) -> IndexedDB must restore ALL 3 full base64 photos 100%!
    if (typeof app.__resetMediaVaultInMemoryStateForTests === 'function') {
      app.__resetMediaVaultInMemoryStateForTests();
    }
    const restoredFromIdb = await app.hydrateFromLocalIdbImmediate();
    assert.equal(
      restoredFromIdb.foods[sampleFood1.id]?.photoUrl,
      heavyPhoto1,
      'IndexedDB must preserve 100% of Food 1 base64 image despite localStorage quota overflow'
    );
    assert.equal(
      restoredFromIdb.foods[sampleFood2.id]?.photoUrl,
      heavyPhoto2,
      'IndexedDB must preserve 100% of Food 2 base64 image despite localStorage quota overflow'
    );
    assert.equal(
      restoredFromIdb.destinations[sampleDest1.id]?.photoUrl,
      heavyDestPhoto,
      'IndexedDB must preserve 100% of Destination 1 base64 image despite localStorage quota overflow'
    );

    // 1D. Restore network online -> pending queue must flush to Supabase Cloud automatically!
    env.setNetworkMode('online');
    await app.flushPendingMediaCloudQueue();
    await flushAsyncMicrotasks();
    const pendingAfterOnline = app.loadPendingMediaCloudQueue();
    assert.equal(
      Object.keys(pendingAfterOnline).length,
      0,
      'Pending cloud queue must flush & empty once network reconnects'
    );
    assert.ok(
      env.cloudKvTable.has(`kft_ov_food_${sampleFood1.id}`) &&
        env.cloudKvTable.has(`kft_ov_food_${sampleFood2.id}`) &&
        env.cloudKvTable.has(`kft_ov_dest_${sampleDest1.id}`),
      'Flushed records must exist in Supabase Cloud KV table'
    );

    env.localStorageMock.setQuotaChars(2_500_000);
    console.log(
      '✓ Suite 1 (Quota Overflow, IndexedDB & Slow/Offline Cloud Resilience) : PASS (500KB overrides survived 320KB quota + offline/timeout)'
    );
  }

  // ===========================================================================
  // SUITE 2: Protect Registered Users, Active Session, Profile Avatars, VIP
  //          Durations (30d / Stacked 165d / Annual 365d), VIP Shops & Payments
  // ===========================================================================
  {
    env.localStorageMock.clear();
    env.indexedDBMock.__clearAllDatabases();
    env.cloudKvTable.clear();
    env.setNetworkMode('online');
    env.localStorageMock.setQuotaChars(900_000); // Tight ~1.8MB limit packed with 760KB of obsolete v9/v8 caches!

    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const customAvatarSokha = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==_SOKHA';
    const customAvatarDara = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==_DARA';

    // 1. Registered Free User
    const freeUser = {
      id: 'usr-email-sokha',
      name: 'Sokha Free Member',
      email: 'sokha.free@gmail.com',
      phone: '012334455',
      role: 'user',
      authProvider: 'email',
      linkedProviders: ['email'],
      passwordHash: 'pbkdf2_sha256$2026$sokha_hash',
      avatar: customAvatarSokha,
      isVerified: true,
      createdAt: '2026-09-10',
      registeredAtIso: '2026-09-10T08:00:00.000Z',
    };

    // 2. Active 30-day VIP User (Currently Logged In + Owns 2 VIP Shops + Paid Extra Slot)
    const vip30ExpiryIso = new Date(nowMs + 24 * dayMs).toISOString();
    const vip30StartIso = new Date(nowMs - 6 * dayMs).toISOString();
    const loggedInVip30User = {
      id: 'usr-email-dara30',
      name: 'Dara VIP Shop Owner',
      email: 'dara.vip30@gmail.com',
      phone: '098776655',
      role: 'owner',
      authProvider: 'email',
      linkedProviders: ['email'],
      passwordHash: 'pbkdf2_sha256$2026$dara_hash',
      avatar: customAvatarDara,
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      vipStatus: 'active',
      paymentStatus: 'verified',
      vipPlanType: 'quarterly',
      vipPlanDays: 30,
      subscriptionStartDate: vip30StartIso,
      subscriptionExpiryDate: vip30ExpiryIso,
      vipExpiresAt: vip30ExpiryIso,
      transactionRef: 'TXN-30D-1001',
      approvedStoresCount: 2,
      paidAdditionalStoreSlots: 1,
      additionalStorePaymentIds: ['TXN-SLOT-1002'],
    };
    loggedInVip30User.integritySeal = app.computeUserIntegritySealSync(loggedInVip30User);

    // 3. Stacked Early-Renewal 90-day VIP User (90d + 75d remaining = 165 days remaining!)
    const stacked165ExpiryIso = new Date(nowMs + 165 * dayMs).toISOString();
    const stacked165StartIso = new Date(nowMs - 15 * dayMs).toISOString();
    const stackedVipUser = {
      id: 'usr-email-pisey-stacked',
      name: 'Pisey Stacked Renewal VIP',
      email: 'pisey.stacked@gmail.com',
      role: 'owner',
      authProvider: 'email',
      linkedProviders: ['email'],
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      vipStatus: 'active',
      paymentStatus: 'verified',
      vipPlanType: '90d',
      vipPlanDays: 90,
      subscriptionStartDate: stacked165StartIso,
      subscriptionExpiryDate: stacked165ExpiryIso,
      vipExpiresAt: stacked165ExpiryIso,
      transactionRef: 'TXN-90D-2002',
    };
    stackedVipUser.integritySeal = app.computeUserIntegritySealSync(stackedVipUser);

    // 4. Legitimate 365-day Annual VIP User (pre-v2.5.0 annual schema without vipPlanDays field)
    const annual365StartIso = new Date(nowMs - 10 * dayMs).toISOString();
    const annual365ExpiryIso = new Date(nowMs + 355 * dayMs).toISOString();
    const annualVipUser = {
      id: 'usr-email-vanna-annual',
      name: 'Vanna Annual 365 VIP',
      email: 'vanna.annual@company.com.kh',
      role: 'owner',
      authProvider: 'google',
      linkedProviders: ['google'],
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      vipStatus: 'active',
      paymentStatus: 'verified',
      vipPlanType: 'annual',
      subscriptionStartDate: annual365StartIso,
      subscriptionExpiryDate: annual365ExpiryIso,
      vipExpiresAt: annual365ExpiryIso,
      transactionRef: 'ABA-ANNUAL-998877',
    };
    annualVipUser.integritySeal = app.computeUserIntegritySealSync(annualVipUser);

    // 5. VIP-Owned Custom Shops (1 verified GPS + 1 newly submitted shop with GPS awaiting Admin review)
    const vipShopVerified = {
      id: 'rest-vip-dara-shop-1',
      nameKh: 'ភោជនីយដ្ឋាន តារា ម្ហូបខ្មែរ VIP',
      nameEn: 'Dara Khmer VIP Kitchen',
      descriptionKh: 'ហាងម្ហូបខ្មែររបស់សមាជិក VIP',
      descriptionEn: 'VIP member authentic Khmer restaurant',
      photoUrl: 'data:image/jpeg;base64,VIP_SHOP_1_PHOTO_DATA',
      profileImage: 'data:image/jpeg;base64,VIP_SHOP_1_PHOTO_DATA',
      addressKh: 'ទួលគោក រាជធានីភ្នំពេញ',
      provinceKh: 'រាជធានីភ្នំពេញ',
      phone: '098776655',
      latitude: 11.5761,
      longitude: 104.8992,
      locationVerificationStatus: 'verified',
      locationNeedsReview: false,
      ownerId: loggedInVip30User.id,
      ownerName: loggedInVip30User.name,
      ownerEmail: loggedInVip30User.email,
      dataSource: 'vip_owner',
      status: 'approved',
      isVerified: true,
      isPromoted: true,
      membershipTier: 'premium',
      paymentStatus: 'verified',
      menuItems: [
        { id: 'm-vip-1', nameKh: 'អាម៉ុកត្រីពិសេស', nameEn: 'Special Fish Amok', priceUsd: 6.5, priceRiel: 26000 },
      ],
      updatedAt: new Date(nowMs - 3600_000).toISOString(),
    };

    const vipShopPendingGps = {
      id: 'rest-vip-dara-pending-gps-2',
      nameKh: 'ហាងកាហ្វេ តារា សាខាទី២ (រង់ចាំផ្ទៀងផ្ទាត់ផែនទី)',
      nameEn: 'Dara Cafe Branch 2',
      photoUrl: 'data:image/jpeg;base64,VIP_SHOP_2_PHOTO_DATA',
      profileImage: 'data:image/jpeg;base64,VIP_SHOP_2_PHOTO_DATA',
      addressKh: 'ក្រុងសៀមរាប ខេត្តសៀមរាប',
      provinceKh: 'សៀមរាប',
      phone: '098776655',
      latitude: 0,
      longitude: 0,
      locationVerificationStatus: 'needs_admin_review',
      locationNeedsReview: true,
      ownerId: loggedInVip30User.id,
      ownerName: loggedInVip30User.name,
      ownerEmail: loggedInVip30User.email,
      dataSource: 'vip_owner',
      status: 'pending',
      isVerified: false,
      membershipTier: 'premium',
      paymentStatus: 'verified',
      updatedAt: new Date(nowMs - 1800_000).toISOString(),
    };

    // 6. Verified Payment History
    const paymentHistory = [
      {
        id: 'TXN-30D-1001',
        userId: loggedInVip30User.id,
        userName: loggedInVip30User.name,
        userEmail: loggedInVip30User.email,
        amountUsd: 4.99,
        planType: 'quarterly',
        planDays: 30,
        paymentType: 'vip_membership',
        transactionRef: 'TXN-30D-1001',
        status: 'verified',
        createdAt: vip30StartIso,
        expiresAt: vip30ExpiryIso,
      },
      {
        id: 'TXN-SLOT-1002',
        userId: loggedInVip30User.id,
        userName: loggedInVip30User.name,
        userEmail: loggedInVip30User.email,
        amountUsd: 4.99,
        paymentType: 'additional_store',
        transactionRef: 'TXN-SLOT-1002',
        status: 'verified',
        createdAt: vip30StartIso,
      },
      {
        id: 'TXN-90D-2002',
        userId: stackedVipUser.id,
        userName: stackedVipUser.name,
        userEmail: stackedVipUser.email,
        amountUsd: 14.99,
        planType: '90d',
        planDays: 90,
        paymentType: 'vip_membership',
        transactionRef: 'TXN-90D-2002',
        status: 'verified',
        createdAt: stacked165StartIso,
        expiresAt: stacked165ExpiryIso,
      },
    ];

    // Seed old APK v2.4.9_1332 localStorage state + pack 750KB of obsolete v9/v8 caches so quota is nearly 100% full!
    env.localStorageMock.setItem('kft_app_installed_ver', '2.4.9_1332');
    env.localStorageMock.setItem('kft_foods_200_v9', 'X'.repeat(420_000));
    env.localStorageMock.setItem('kft_destinations_real_v8', 'Y'.repeat(330_000));
    env.localStorageMock.setItem(
      'kft_users_v4',
      JSON.stringify([freeUser, loggedInVip30User, stackedVipUser, annualVipUser])
    );
    env.localStorageMock.setItem('kft_current_user_v4', JSON.stringify(loggedInVip30User));
    env.localStorageMock.setItem('kft_transactions_v4', JSON.stringify(paymentHistory));
    if (typeof app.__resetMediaVaultInMemoryStateForTests === 'function') {
      app.__resetMediaVaultInMemoryStateForTests();
    }
    app.recordPermanentRestaurantOverride(vipShopVerified);
    app.recordPermanentRestaurantOverride(vipShopPendingGps);
    await flushAsyncMicrotasks();

    // TRIGGER SIMULATED APK UPDATE TO CURRENT BUILD (v2.5.0_1333) AND THEN FUTURE BUILD (v2.6.0_1334)!
    runMainPreBoot('2.5.0', 1333);
    runMainPreBoot('2.6.0', 1334);

    // Verify obsolete bulk caches were evicted and installed version updated
    assert.equal(env.localStorageMock.getItem('kft_foods_200_v9'), null);
    assert.equal(env.localStorageMock.getItem('kft_destinations_real_v8'), null);
    assert.equal(env.localStorageMock.getItem('kft_app_installed_ver'), '2.6.0_1334');

    // Verify active logged-in session survived upgrade 100% intact
    const postUpgradeCur = JSON.parse(env.localStorageMock.getItem('kft_current_user_v5'));
    assert.ok(postUpgradeCur, 'Active logged-in user session must survive APK upgrade');
    assert.equal(postUpgradeCur.id, loggedInVip30User.id);
    assert.equal(postUpgradeCur.email, loggedInVip30User.email);
    assert.equal(postUpgradeCur.avatar, customAvatarDara, 'Logged-in user profile avatar must remain 100% intact');
    assert.equal(app.isUserVipActive(postUpgradeCur), true, 'Logged-in VIP status must remain active');
    assert.equal(postUpgradeCur.subscriptionExpiryDate, vip30ExpiryIso, '30-day VIP expiry date must remain exact');
    assert.equal(postUpgradeCur.paidAdditionalStoreSlots, 1, 'Paid additional store slots must remain intact');

    // Verify ALL 4 registered users survived in `kft_users_v5`, `kft_pre_update_db_backup_v1`, and `deduplicateAndNormalizeUsers`
    const rawUsersV5 = JSON.parse(env.localStorageMock.getItem('kft_users_v5'));
    const preUpdateSnap = JSON.parse(env.localStorageMock.getItem('kft_pre_update_db_backup_v1'));
    assert.equal(rawUsersV5.length, 4, 'All 4 registered accounts (free + 3 VIPs) must survive in kft_users_v5');
    assert.equal(preUpdateSnap.allUsers.length, 4, 'Pre-update backup must snapshot all 4 registered accounts');
    assert.equal(preUpdateSnap.vipUsers.length, 3, 'Pre-update backup must snapshot all 3 active VIP accounts');
    assert.equal(
      preUpdateSnap.verifiedTransactions.length,
      3,
      'Pre-update backup must snapshot all 3 verified payment transactions'
    );

    const normalizedUsers = app.deduplicateAndNormalizeUsers(rawUsersV5, []).map(app.sanitizeUserVipPlanAndExpiry);
    const byEmail = new Map(normalizedUsers.map((u) => [u.email, u]));

    // Check Free User + Avatar + PasswordHash
    const sokhaAfter = byEmail.get('sokha.free@gmail.com');
    assert.ok(sokhaAfter, 'Free registered user Sokha must be preserved');
    assert.equal(sokhaAfter.avatar, customAvatarSokha, 'Sokha custom profile avatar must be preserved');
    assert.equal(sokhaAfter.passwordHash, freeUser.passwordHash, 'Sokha passwordHash must be preserved');
    assert.equal(app.resolveUserAvatarUrl(sokhaAfter), customAvatarSokha);

    // Check Stacked Renewal 165-day VIP User (must NOT be truncated to 90 days!)
    const piseyAfter = byEmail.get('pisey.stacked@gmail.com');
    assert.ok(piseyAfter && app.isUserVipActive(piseyAfter), 'Stacked VIP user Pisey must remain active VIP');
    assert.equal(
      piseyAfter.subscriptionExpiryDate,
      stacked165ExpiryIso,
      'Stacked early VIP renewal (165 days) must NEVER be truncated during update!'
    );

    // Check Legitimate 365-day Annual VIP User (must NOT be truncated to 30 days!)
    const vannaAfter = byEmail.get('vanna.annual@company.com.kh');
    assert.ok(vannaAfter && app.isUserVipActive(vannaAfter), 'Annual 365d VIP user Vanna must remain active VIP');
    assert.equal(
      vannaAfter.subscriptionExpiryDate,
      annual365ExpiryIso,
      'Legitimate 365-day annual VIP expiry must NEVER be truncated during update!'
    );

    // Check Legacy Synthetic 365d Pollution (`VIP-PERMANENT-IGP2026D`) IS still properly sanitized to 30d
    const legacyPolluted = app.sanitizeUserVipPlanAndExpiry({
      id: 'usr-legacy-polluted',
      name: 'Legacy Polluted',
      email: 'igp2026d@gmail.com',
      role: 'owner',
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      vipPlanType: 'quarterly',
      subscriptionExpiryDate: new Date(nowMs + 360 * dayMs).toISOString(),
      transactionRef: 'VIP-PERMANENT-IGP2026D',
    });
    const legacyRemainingDays = Math.round(
      (Date.parse(legacyPolluted.subscriptionExpiryDate) - nowMs) / dayMs
    );
    assert.ok(
      legacyRemainingDays >= 29 && legacyRemainingDays <= 31,
      `Expected synthetic VIP-PERMANENT-IGP2026D pollution to sanitize to ~30d, got ${legacyRemainingDays}d`
    );

    // Check Both VIP-Owned Shops (Verified GPS + Pending GPS Review) survive vault reconstruction & Supabase sync!
    const reconstructedRests = app.applyRestaurantOverrides(app.initial100Restaurants);
    const shop1After = reconstructedRests.find((r) => r.id === vipShopVerified.id);
    const shop2After = reconstructedRests.find((r) => r.id === vipShopPendingGps.id);
    assert.ok(shop1After, 'VIP-owned verified shop must survive APK update & override reconstruction');
    assert.equal(shop1After.menuItems?.length, 1, 'VIP-owned shop menu items must survive APK update');
    assert.ok(
      shop2After,
      'VIP-owned shop with GPS pending Admin review must ALSO survive override reconstruction without being dropped!'
    );
    assert.equal(shop2After.ownerId, loggedInVip30User.id);

    // Check Cloud User & Shop Sync recovery even if local users & customRestaurants arrays were accidentally empty on boot
    const cloudSyncRes = await app.syncAllAppDataWithSupabase({
      users: [],
      deletedUsers: [],
      currentUser: postUpgradeCur,
      customRestaurants: [],
      transactions: JSON.parse(env.localStorageMock.getItem('kft_transactions_v4')),
      supportTickets: [],
      paymentProofsVault: {},
      appSettings: { vipQuarterlyPriceUsd: 4.99, vipAnnualPriceUsd: 14.99 },
    });
    assert.equal(
      cloudSyncRes.mergedUsers.length,
      4,
      'syncAllAppDataWithSupabase must recover all 4 registered users from pre-update backup even if localState.users was empty'
    );
    assert.equal(cloudSyncRes.mergedTransactions.length, 3, 'All 3 payment transactions must survive cloud sync');
    assert.ok(
      cloudSyncRes.mergedCustomRestaurants.some((r) => r.id === vipShopVerified.id) &&
        cloudSyncRes.mergedCustomRestaurants.some((r) => r.id === vipShopPendingGps.id),
      'Both VIP-owned custom shops must ALSO be recovered by syncAllAppDataWithSupabase from pre-update backup!'
    );

    env.localStorageMock.setQuotaChars(2_500_000);
    console.log(
      '✓ Suite 2 (Registered Users, Session, Avatars, VIP 30d/165d/365d, VIP Shops & Txns) : PASS (100% preserved across 2 APK upgrades)'
    );
  }

  // ===========================================================================
  // SUITE 3: Never Restore Old Seed Pictures & Never Resurrect Deleted Items
  // ===========================================================================
  {
    env.localStorageMock.clear();
    env.indexedDBMock.__clearAllDatabases();
    env.cloudKvTable.clear();
    env.setNetworkMode('online');
    if (typeof app.__resetMediaVaultInMemoryStateForTests === 'function') {
      app.__resetMediaVaultInMemoryStateForTests();
    }

    const NEW_FOOD_PHOTO = 'data:image/jpeg;base64,NEW_ADMIN_FOOD1_PHOTO_PERMANENT_2027';
    const NEW_REST_PHOTO = 'data:image/jpeg;base64,NEW_OWNER_REST19_PHOTO_PERMANENT_2027';
    const NEW_DEST_PHOTO = 'data:image/jpeg;base64,NEW_ADMIN_DEST1_ANGKOR_PERMANENT_2027';

    const targetFoodEdit = app.initial200Foods[0]; // food-1
    const targetFoodDelete = app.initial200Foods[4]; // food-5
    const targetRestEdit = app.initial100Restaurants[0];
    const targetRestDelete = app.initial100Restaurants[1];
    const targetDestEdit = app.initialDestinations[0];
    const targetDestDelete = app.initialDestinations[1];

    // 1. Seed OLD stale cloud records first (simulating outdated pictures & deleted items still sitting in legacy cloud)
    const oldStaleIso = '2026-10-15T00:00:00.000Z';
    env.cloudKvTable.set(`kft_ov_food_${targetFoodEdit.id}`, {
      key: `kft_ov_food_${targetFoodEdit.id}`,
      payload: {
        id: targetFoodEdit.id,
        photoUrl: 'https://stale.example.com/old_food1_v0.jpg',
        revision: 1,
        adminApprovedAt: oldStaleIso,
        isCustomPhoto: true,
        updatedAt: oldStaleIso,
      },
      updated_at: oldStaleIso,
    });
    env.cloudKvTable.set(`kft_ov_food_${targetFoodDelete.id}`, {
      key: `kft_ov_food_${targetFoodDelete.id}`,
      payload: {
        id: targetFoodDelete.id,
        photoUrl: 'https://stale.example.com/deleted_food5.jpg',
        revision: 1,
        isCustomPhoto: true,
        updatedAt: oldStaleIso,
      },
      updated_at: oldStaleIso,
    });
    env.cloudKvTable.set(`kft_ov_dest_${targetDestDelete.id}`, {
      key: `kft_ov_dest_${targetDestDelete.id}`,
      payload: {
        id: targetDestDelete.id,
        photoUrl: 'https://stale.example.com/deleted_dest2.jpg',
        revision: 1,
        isCustomPhoto: true,
        updatedAt: oldStaleIso,
      },
      updated_at: oldStaleIso,
    });
    env.cloudKvTable.set('kft_cloud_media_overrides_v1', {
      key: 'kft_cloud_media_overrides_v1',
      payload: {
        foods: {
          [targetFoodEdit.id]: {
            id: targetFoodEdit.id,
            photoUrl: 'https://stale.example.com/legacy_bundle_old_food1.jpg',
            revision: 1,
            isCustomPhoto: true,
            updatedAt: oldStaleIso,
          },
          [targetFoodDelete.id]: {
            id: targetFoodDelete.id,
            photoUrl: 'https://stale.example.com/legacy_bundle_deleted_food5.jpg',
            revision: 1,
            isCustomPhoto: true,
            updatedAt: oldStaleIso,
          },
        },
        restaurants: {
          [targetRestDelete.id]: {
            id: targetRestDelete.id,
            photoUrl: 'https://stale.example.com/legacy_deleted_rest.jpg',
            profileImage: 'https://stale.example.com/legacy_deleted_rest.jpg',
            isCustomPhoto: true,
            updatedAt: oldStaleIso,
          },
        },
        destinations: {
          [targetDestEdit.id]: {
            id: targetDestEdit.id,
            photoUrl: 'https://stale.example.com/legacy_old_dest1.jpg',
            revision: 1,
            isCustomPhoto: true,
            updatedAt: oldStaleIso,
          },
          [targetDestDelete.id]: {
            id: targetDestDelete.id,
            photoUrl: 'https://stale.example.com/legacy_deleted_dest2.jpg',
            revision: 1,
            isCustomPhoto: true,
            updatedAt: oldStaleIso,
          },
        },
        trendingFoods: {},
        updatedAt: oldStaleIso,
      },
      updated_at: oldStaleIso,
    });

    // 2. Admin / Shop Owner updates pictures on food-1, rest-0, dest-0 AND deletes food-5, rest-1, dest-1
    await app.saveAdminFoodOverridePermanently(
      { ...targetFoodEdit, photoUrl: NEW_FOOD_PHOTO, isCustomPhoto: true, isAdminEdited: true },
      { awaitCloud: true }
    );
    app.recordPermanentRestaurantOverride({
      ...targetRestEdit,
      photoUrl: NEW_REST_PHOTO,
      profileImage: NEW_REST_PHOTO,
      isCustomPhoto: true,
      isAdminEdited: true,
    });
    app.recordPermanentDestinationOverride({
      ...targetDestEdit,
      photoUrl: NEW_DEST_PHOTO,
      isCustomPhoto: true,
      isAdminEdited: true,
    });
    await flushAsyncMicrotasks();

    app.removePermanentFoodOverride(targetFoodDelete.id);
    app.removePermanentRestaurantOverride(targetRestDelete.id, targetRestDelete.googlePlaceId ? [`gplace:${targetRestDelete.googlePlaceId}`, targetRestDelete.googlePlaceId] : []);
    app.removePermanentDestinationOverride(targetDestDelete.id, targetDestDelete.googlePlaceId ? [`gplace:${targetDestDelete.googlePlaceId}`, targetDestDelete.googlePlaceId] : []);
    await flushAsyncMicrotasks();

    // 3. Simulate APK Build Upgrade + Cold Restart + Full Cloud Sync!
    env.localStorageMock.setItem('kft_app_installed_ver', '2.5.0_1333');
    env.localStorageMock.setItem(app.VAULT_KEYS.LAST_SYNCED_BUILD, '1333');
    if (typeof app.__resetMediaVaultInMemoryStateForTests === 'function') {
      app.__resetMediaVaultInMemoryStateForTests();
    }
    runMainPreBoot('2.7.0', 1335);

    const syncedAfterUpgrade = await app.hydrateAndSyncMediaOverrides({ force: true });
    await flushAsyncMicrotasks();

    // Apply overrides over raw seed arrays (simulating fresh APK seed arrays + resetAllData)
    const foodsAfter = app.applyFoodOverrides(
      app.initial200Foods,
      syncedAfterUpgrade.foods,
      syncedAfterUpgrade.deletedFoods
    );
    const restsAfter = app.applyRestaurantOverrides(
      app.initial100Restaurants,
      syncedAfterUpgrade.restaurants,
      syncedAfterUpgrade.deletedRestaurants
    );
    const destsAfter = app.applyDestinationOverrides(
      app.initialDestinations,
      syncedAfterUpgrade.destinations,
      syncedAfterUpgrade.deletedDestinations
    );

    // Assert NEW custom photos NEVER reverted to seed or older cloud photos!
    const editedFoodAfter = foodsAfter.find((f) => f.id === targetFoodEdit.id);
    const editedRestAfter = restsAfter.find((r) => r.id === targetRestEdit.id);
    const editedDestAfter = destsAfter.find((d) => d.id === targetDestEdit.id);

    assert.ok(editedFoodAfter?.photoUrl, 'Edited food must have a valid photoUrl');
    assert.notEqual(
      editedFoodAfter.photoUrl,
      targetFoodEdit.photoUrl,
      'Edited food photo must NEVER revert to old seed photo!'
    );
    assert.ok(
      editedFoodAfter.photoUrl === NEW_FOOD_PHOTO || editedFoodAfter.photoUrl.includes('/storage/v1/object/public/'),
      `Edited food photo must be the new custom photo or its uploaded Supabase Storage URL, got ${editedFoodAfter.photoUrl}`
    );

    assert.ok(editedRestAfter?.photoUrl, 'Edited restaurant must have a valid photoUrl');
    assert.notEqual(
      editedRestAfter.photoUrl,
      targetRestEdit.photoUrl,
      'Edited restaurant photo must NEVER revert to old seed photo!'
    );

    assert.ok(editedDestAfter?.photoUrl, 'Edited destination must have a valid photoUrl');
    assert.notEqual(
      editedDestAfter.photoUrl,
      targetDestEdit.photoUrl,
      'Edited destination photo must NEVER revert to old seed photo!'
    );

    // Assert DELETED food, restaurant, and destination NEVER resurrected!
    assert.equal(
      foodsAfter.some((f) => f.id === targetFoodDelete.id),
      false,
      `Admin-deleted food (${targetFoodDelete.id}) must NEVER resurrect after app update or cloud sync!`
    );
    assert.equal(
      restsAfter.some((r) => r.id === targetRestDelete.id),
      false,
      `Admin-deleted restaurant (${targetRestDelete.id}) must NEVER resurrect after app update or cloud sync!`
    );
    assert.equal(
      destsAfter.some((d) => d.id === targetDestDelete.id),
      false,
      `Admin-deleted tourist destination (${targetDestDelete.id}) must NEVER resurrect after app update or cloud sync!`
    );

    // 4. Simulate a BRAND-NEW SECOND DEVICE installing the APK (empty localStorage & empty IndexedDB) syncing from Supabase Cloud!
    env.localStorageMock.clear();
    env.indexedDBMock.__clearAllDatabases();
    if (typeof app.__resetMediaVaultInMemoryStateForTests === 'function') {
      app.__resetMediaVaultInMemoryStateForTests();
    }

    const secondDeviceBundle = await app.hydrateAndSyncMediaOverrides({ force: true });
    const secondDeviceFoods = app.applyFoodOverrides(
      app.initial200Foods,
      secondDeviceBundle.foods,
      secondDeviceBundle.deletedFoods
    );
    const secondDeviceRests = app.applyRestaurantOverrides(
      app.initial100Restaurants,
      secondDeviceBundle.restaurants,
      secondDeviceBundle.deletedRestaurants
    );
    const secondDeviceDests = app.applyDestinationOverrides(
      app.initialDestinations,
      secondDeviceBundle.destinations,
      secondDeviceBundle.deletedDestinations
    );

    assert.equal(
      secondDeviceFoods.some((f) => f.id === targetFoodDelete.id),
      false,
      'Deleted food must ALSO stay deleted on a brand-new device syncing from Supabase Cloud tombstones!'
    );
    assert.equal(
      secondDeviceRests.some((r) => r.id === targetRestDelete.id),
      false,
      'Deleted restaurant must ALSO stay deleted on a brand-new device syncing from Supabase Cloud tombstones!'
    );
    assert.equal(
      secondDeviceDests.some((d) => d.id === targetDestDelete.id),
      false,
      'Deleted tourist destination must ALSO stay deleted on a brand-new device syncing from Supabase Cloud tombstones!'
    );
    assert.notEqual(
      secondDeviceFoods.find((f) => f.id === targetFoodEdit.id)?.photoUrl,
      targetFoodEdit.photoUrl,
      'Second device must receive the new Admin food photo from Cloud, never the old seed photo!'
    );
    assert.notEqual(
      secondDeviceDests.find((d) => d.id === targetDestEdit.id)?.photoUrl,
      targetDestEdit.photoUrl,
      'Second device must receive the new Admin destination photo from Cloud, never the old seed photo!'
    );

    console.log(
      '✓ Suite 3 (Anti-Revert Custom Photos & Anti-Resurrect Deleted Items) : PASS (Food, Shop & Tourism verified on upgrade + fresh device sync)'
    );
  }

  const elapsedMs = Date.now() - t0;
  console.log('========================================================================');
  console.log(` ALL 3 MIGRATION & DATA SAFETY SUITES PASSED 100% (${elapsedMs} ms)`);
  console.log('========================================================================');
}

main().catch((err) => {
  console.error('\n[MIGRATION AUDIT FAILED]:', err);
  process.exit(1);
});
