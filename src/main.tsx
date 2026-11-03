import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { sanitizeStartupCurrentUser } from './utils/securityIntegrityGuard.ts'
import { APP_VERSION_NAME, APP_BUILD_CODE } from './types/index.ts'

// 0. Pre-boot cache sanitation & obsolete bulk cache eviction:
// Free up localStorage quota FIRST on every boot / version update so account & VIP keys (`kft_current_user_v5`,
// `kft_users_v5`, `kft_vip_registry_backup_v1`) NEVER fail with QuotaExceededError during an APK update!
try {
  const obsoleteBulkKeys = [
    'kft_foods_v4',
    'kft_foods_100_v1',
    'kft_foods_100_v2',
    'kft_foods_100_v3',
    'kft_foods_200_v5',
    'kft_foods_200_v6',
    'kft_foods_200_v7',
    'kft_foods_200_v8',
    'kft_destinations_100_v1',
    'kft_destinations_real_v5',
    'kft_destinations_real_v6',
    'kft_destinations_real_v7',
    'kft_restaurants_v3',
    'kft_restaurants_membership_v1',
    'kft_restaurants_membership_v2',
    'kft_posts_v3',
    'kft_posts_v4',
    'kft_posts_v6',
    'kft_settings_v3',
    'kft_settings_v4',
  ];
  for (const key of obsoleteBulkKeys) {
    localStorage.removeItem(key);
  }
  if (localStorage.getItem('kft_foods_200_v10')) {
    localStorage.removeItem('kft_foods_200_v9');
  }
  if (localStorage.getItem('kft_destinations_real_v9')) {
    localStorage.removeItem('kft_destinations_real_v8');
  }
  if (localStorage.getItem('kft_restaurants_real_v13')) {
    localStorage.removeItem('kft_restaurants_real_v12');
    localStorage.removeItem('kft_restaurants_real_v11');
    localStorage.removeItem('kft_restaurants_real_v10');
  }

  // Safely migrate legacy v4 user lists into v5 if v5 is missing
  const rawUsersV5 = localStorage.getItem('kft_users_v5');
  const rawUsersV4 = localStorage.getItem('kft_users_v4');
  if ((!rawUsersV5 || rawUsersV5 === 'undefined' || rawUsersV5 === 'null' || rawUsersV5 === '[]') && rawUsersV4 && rawUsersV4 !== 'undefined' && rawUsersV4 !== 'null') {
    localStorage.setItem('kft_users_v5', rawUsersV4);
  }

  const keysToSanitize = [
    'kft_current_user_v5',
    'kft_current_user_v4',
    'kft_users_v5',
    'kft_users_v4',
    'kft_vip_registry_backup_v1',
    'kft_pre_update_db_backup_v1',
    'kft_bookmarks_v4',
    'kft_bookmarks_v3',
    'kft_settings_v5',
    'kft_transactions_v4',
  ];
  keysToSanitize.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw === 'undefined' || raw === 'null') {
      localStorage.removeItem(key);
    }
  });
} catch (e) {
  console.warn('Pre-boot cache sanitation warning:', e);
}

// 1. Version & Build Migration: Safe non-destructive upgrade preserving ALL registered user accounts,
//    active sessions, profile avatars, VIP entitlements, VIP-owned shops, and verified payment history
try {
  const CURRENT_VER_BUILD = `${APP_VERSION_NAME}_${APP_BUILD_CODE}`;
  const installedVer = localStorage.getItem('kft_app_installed_ver');
  if (installedVer !== CURRENT_VER_BUILD) {
    // Step 1A: Evict heavy expendable legacy bulk caches FIRST so pre-upgrade backups NEVER hit QuotaExceededError!
    // (All custom Admin/Owner food, restaurant & destination overrides live safely in kft_permanent_*_overrides_v1 + IndexedDB.)
    for (const staleBulkKey of [
      'kft_foods_200_v8',
      'kft_foods_200_v9',
      'kft_destinations_real_v7',
      'kft_destinations_real_v8',
      'kft_restaurants_real_v9',
      'kft_google_places_smart_cache_v1',
    ]) {
      localStorage.removeItem(staleBulkKey);
    }
    if (localStorage.getItem('kft_restaurants_real_v13')) {
      localStorage.removeItem('kft_restaurants_real_v12');
      localStorage.removeItem('kft_restaurants_real_v11');
      localStorage.removeItem('kft_restaurants_real_v10');
    }

    const safeWriteUpgradeKey = (key: string, serialized: string): boolean => {
      try {
        localStorage.setItem(key, serialized);
        return true;
      } catch {
        for (const expendableKey of [
          'kft_trending_foods_v5',
          'kft_posts_v7',
          'kft_foods_200_v10',
          'kft_destinations_real_v9',
          'kft_restaurants_real_v13',
        ]) {
          localStorage.removeItem(expendableKey);
          try {
            localStorage.setItem(key, serialized);
            return true;
          } catch {}
        }
        return false;
      }
    };

    // Step 1B: Harvest & preserve ALL registered users (free + pending + VIP), custom avatars, VIP shops & transactions
    try {
      let deletedUserTombstones: Record<string, string> = {};
      try {
        const rawDelUsers = localStorage.getItem('kft_deleted_activity_users_v1');
        if (rawDelUsers && rawDelUsers !== 'undefined' && rawDelUsers !== 'null') {
          const parsedDel = JSON.parse(rawDelUsers);
          if (parsedDel && typeof parsedDel === 'object') deletedUserTombstones = parsedDel;
        }
      } catch {}

      let deletedRestTombstones: Record<string, string> = {};
      try {
        const rawDelRests = localStorage.getItem('kft_deleted_restaurants_v1');
        if (rawDelRests && rawDelRests !== 'undefined' && rawDelRests !== 'null') {
          const parsedDelR = JSON.parse(rawDelRests);
          if (parsedDelR && typeof parsedDelR === 'object') deletedRestTombstones = parsedDelR;
        }
      } catch {}

      let prevPreUpdateSnap: any = null;
      try {
        const rawSnap = localStorage.getItem('kft_pre_update_db_backup_v1');
        if (rawSnap && rawSnap !== 'undefined' && rawSnap !== 'null') {
          prevPreUpdateSnap = JSON.parse(rawSnap);
        }
      } catch {}

      const candidateUsers: any[] = [];
      if (prevPreUpdateSnap && typeof prevPreUpdateSnap === 'object') {
        if (Array.isArray(prevPreUpdateSnap.allUsers)) candidateUsers.push(...prevPreUpdateSnap.allUsers);
        if (Array.isArray(prevPreUpdateSnap.vipUsers)) candidateUsers.push(...prevPreUpdateSnap.vipUsers);
      }
      for (const k of [
        'kft_vip_registry_backup_v1',
        'kft_users_v5',
        'kft_users_v4',
        'kft_cloud_users_v2',
        'kft_cloud_users_v1',
      ]) {
        try {
          const rawList = localStorage.getItem(k);
          if (rawList && rawList !== 'undefined' && rawList !== 'null') {
            const arr = JSON.parse(rawList);
            if (Array.isArray(arr)) candidateUsers.push(...arr);
          }
        } catch {}
      }
      for (const ck of ['kft_current_user_v5', 'kft_current_user_v4']) {
        try {
          const rawCur = localStorage.getItem(ck);
          if (rawCur && rawCur !== 'undefined' && rawCur !== 'null') {
            const curObj = JSON.parse(rawCur);
            if (curObj && typeof curObj === 'object' && !Array.isArray(curObj)) candidateUsers.push(curObj);
          }
        } catch {}
      }

      // Preserve custom avatars into `kft_user_avatar_cache_v1` (matching avatarHelper.ts) as well
      let avatarCache: Record<string, string> = {};
      try {
        const rawAv = localStorage.getItem('kft_user_avatar_cache_v1');
        if (rawAv && rawAv !== 'undefined' && rawAv !== 'null') {
          const parsedAv = JSON.parse(rawAv);
          if (parsedAv && typeof parsedAv === 'object') avatarCache = parsedAv;
        }
      } catch {}
      let avatarCacheDirty = false;

      const isDeletedUserRecord = (u: any): boolean => {
        const uid = String(u?.id || '').trim();
        const email = String(u?.email || '').trim().toLowerCase();
        return Boolean((uid && deletedUserTombstones[`id:${uid}`]) || (email && deletedUserTombstones[`email:${email}`]));
      };

      const mergeRegisteredUserRecords = (existing: any, incoming: any): any => {
        const exExp = Date.parse(String(existing.subscriptionExpiryDate || existing.vipExpiresAt || '')) || 0;
        const inExp = Date.parse(String(incoming.subscriptionExpiryDate || incoming.vipExpiresAt || '')) || 0;
        const primary = inExp > exExp ? { ...existing, ...incoming } : { ...incoming, ...existing };
        // Never lose custom avatar, passwordHash, phone, or higher store slot counts
        const exAvatar = typeof existing.avatar === 'string' ? existing.avatar.trim() : '';
        const inAvatar = typeof incoming.avatar === 'string' ? incoming.avatar.trim() : '';
        if (inAvatar.startsWith('data:image/') || (!exAvatar && inAvatar)) {
          primary.avatar = inAvatar;
        } else if (exAvatar) {
          primary.avatar = exAvatar;
        }
        if (!primary.passwordHash && (existing.passwordHash || incoming.passwordHash)) {
          primary.passwordHash = existing.passwordHash || incoming.passwordHash;
        }
        if (!primary.phone && (existing.phone || incoming.phone)) {
          primary.phone = existing.phone || incoming.phone;
        }
        if (typeof existing.paidAdditionalStoreSlots === 'number' || typeof incoming.paidAdditionalStoreSlots === 'number') {
          primary.paidAdditionalStoreSlots = Math.max(
            existing.paidAdditionalStoreSlots || 0,
            incoming.paidAdditionalStoreSlots || 0
          );
        }
        if (typeof existing.approvedStoresCount === 'number' || typeof incoming.approvedStoresCount === 'number') {
          primary.approvedStoresCount = Math.max(
            existing.approvedStoresCount || 0,
            incoming.approvedStoresCount || 0
          );
        }
        return primary;
      };

      const nowMs = Date.now();
      const allRegisteredById = new Map<string, any>();
      const emailToId = new Map<string, string>();
      const activeVipsById = new Map<string, any>();

      for (const u of candidateUsers) {
        if (!u || typeof u !== 'object' || !u.id) continue;
        const uid = String(u.id).trim();
        if (!uid || u.isGuest || u.role === 'guest' || uid.startsWith('guest-')) continue;
        if (isDeletedUserRecord(u)) continue;

        const normEmail = String(u.email || '').trim().toLowerCase();
        const uidKey = uid.toLowerCase();
        const avVal = typeof u.avatar === 'string' ? u.avatar.trim() : '';
        const isStockAv =
          avVal.includes('photo-1534528741775-53994a69daeb') ||
          avVal.includes('photo-1507003211169-0a1dd7228f2d') ||
          avVal.includes('photo-1517841905240-472988babdf9') ||
          avVal.includes('photo-1535713875002-d1d0cf377fde') ||
          avVal.startsWith('data:image/svg+xml');
        if (avVal.length > 12 && !isStockAv) {
          if (avatarCache[uidKey] !== avVal) {
            avatarCache[uidKey] = avVal;
            avatarCacheDirty = true;
          }
          if (normEmail && avatarCache[normEmail] !== avVal) {
            avatarCache[normEmail] = avVal;
            avatarCacheDirty = true;
          }
        } else {
          const cachedAv = avatarCache[uidKey] || (normEmail ? avatarCache[normEmail] : '');
          if (cachedAv) u.avatar = cachedAv;
        }

        if (u.role !== 'admin') {
          const canonicalId = (normEmail && emailToId.get(normEmail)) || uid;
          const prevUser = allRegisteredById.get(canonicalId);
          const mergedUser = prevUser ? mergeRegisteredUserRecords(prevUser, u) : { ...u };
          allRegisteredById.set(canonicalId, mergedUser);
          if (normEmail && !emailToId.has(normEmail)) {
            emailToId.set(normEmail, canonicalId);
          }

          const isCancelled =
            mergedUser.subscriptionStatus === 'cancelled' || mergedUser.paymentStatus === 'cancelled';
          const isVip =
            !isCancelled &&
            (mergedUser.membershipTier === 'premium_vip' ||
              mergedUser.subscriptionStatus === 'active' ||
              mergedUser.vipStatus === 'active');
          const rawExp = mergedUser.subscriptionExpiryDate || mergedUser.vipExpiresAt;
          const expMs = rawExp ? Date.parse(String(rawExp)) || 0 : 0;
          if (isVip && expMs > nowMs) {
            activeVipsById.set(canonicalId, mergedUser);
          }
        }
      }

      if (avatarCacheDirty) {
        safeWriteUpgradeKey('kft_user_avatar_cache_v1', JSON.stringify(avatarCache));
      }
      if (activeVipsById.size > 0) {
        safeWriteUpgradeKey('kft_vip_registry_backup_v1', JSON.stringify(Array.from(activeVipsById.values())));
      }

      // Ensure `kft_users_v5` never loses any harvested registered user across an upgrade
      if (allRegisteredById.size > 0) {
        let existingV5: any[] = [];
        try {
          const rawV5 = localStorage.getItem('kft_users_v5');
          if (rawV5 && rawV5 !== 'undefined' && rawV5 !== 'null') {
            const parsedV5 = JSON.parse(rawV5);
            if (Array.isArray(parsedV5)) existingV5 = parsedV5;
          }
        } catch {}
        const existingIds = new Set(existingV5.map((x) => x?.id).filter(Boolean));
        const missingRegistered = Array.from(allRegisteredById.values()).filter((u) => !existingIds.has(u.id));
        if (existingV5.length === 0 || missingRegistered.length > 0) {
          safeWriteUpgradeKey('kft_users_v5', JSON.stringify([...existingV5, ...missingRegistered]));
        }
      }

      // Harvest VIP-owned & Admin-edited custom restaurants so no VIP shop is ever lost during upgrade
      const customRestsById = new Map<string, any>();
      const pushCandidateRest = (r: any) => {
        if (!r || typeof r !== 'object' || !r.id) return;
        const rid = String(r.id).trim();
        if (!rid || deletedRestTombstones[rid]) return;
        const isVipOrCustom =
          Boolean(r.ownerId && r.ownerId !== 'owner-1') ||
          r.dataSource === 'vip_owner' ||
          Boolean(r.isAdminEdited);
        if (!isVipOrCustom) return;
        const prev = customRestsById.get(rid);
        const prevTs = prev ? Date.parse(String(prev.updatedAt || '')) || 0 : 0;
        const nextTs = Date.parse(String(r.updatedAt || '')) || 0;
        if (!prev || nextTs >= prevTs) {
          customRestsById.set(rid, r);
        }
      };

      if (prevPreUpdateSnap && Array.isArray(prevPreUpdateSnap.customRestaurants)) {
        prevPreUpdateSnap.customRestaurants.forEach(pushCandidateRest);
      }
      try {
        const rawRestOv = localStorage.getItem('kft_permanent_restaurant_overrides_v1');
        if (rawRestOv && rawRestOv !== 'undefined' && rawRestOv !== 'null') {
          const parsedOv = JSON.parse(rawRestOv);
          if (parsedOv && typeof parsedOv === 'object') {
            Object.values(parsedOv).forEach(pushCandidateRest);
          }
        }
      } catch {}
      for (const rk of ['kft_restaurants_real_v13', 'kft_restaurants_real_v12']) {
        try {
          const rawR = localStorage.getItem(rk);
          if (rawR && rawR !== 'undefined' && rawR !== 'null') {
            const arrR = JSON.parse(rawR);
            if (Array.isArray(arrR)) arrR.forEach(pushCandidateRest);
          }
        } catch {}
      }

      // Harvest verified payment transactions
      const verifiedTxnsById = new Map<string, any>();
      const pushCandidateTxn = (tx: any) => {
        if (!tx || typeof tx !== 'object' || !tx.id) return;
        if (tx.status === 'verified' || tx.status === 'pending') {
          verifiedTxnsById.set(String(tx.id), tx);
        }
      };
      if (prevPreUpdateSnap && Array.isArray(prevPreUpdateSnap.verifiedTransactions)) {
        prevPreUpdateSnap.verifiedTransactions.forEach(pushCandidateTxn);
      }
      for (const tk of ['kft_transactions_v4', 'kft_transactions_v3']) {
        try {
          const rawT = localStorage.getItem(tk);
          if (rawT && rawT !== 'undefined' && rawT !== 'null') {
            const arrT = JSON.parse(rawT);
            if (Array.isArray(arrT)) arrT.forEach(pushCandidateTxn);
          }
        } catch {}
      }

      let harvestedGeminiKey = typeof prevPreUpdateSnap?.geminiApiKey === 'string' ? prevPreUpdateSnap.geminiApiKey.trim() : '';
      let harvestedMapsKey = typeof prevPreUpdateSnap?.googleMapsApiKey === 'string' ? prevPreUpdateSnap.googleMapsApiKey.trim() : '';
      for (const [k, gField, mField] of [
        ['kft_cloud_api_config_v1', 'geminiApiKey', 'googleMapsApiKey'],
        ['kft_settings_v5', 'geminiApiKey', 'googleMapsApiKey'],
        ['kft_ai_vision_config_v1', 'apiKey', ''],
      ] as const) {
        try {
          const rawCfg = localStorage.getItem(k);
          if (rawCfg && rawCfg !== 'undefined' && rawCfg !== 'null') {
            const parsedCfg = JSON.parse(rawCfg);
            if (!harvestedGeminiKey && gField && typeof parsedCfg?.[gField] === 'string' && parsedCfg[gField].trim().length > 10) {
              harvestedGeminiKey = parsedCfg[gField].trim();
            }
            if (!harvestedMapsKey && mField && typeof parsedCfg?.[mField] === 'string' && parsedCfg[mField].trim().length > 10) {
              harvestedMapsKey = parsedCfg[mField].trim();
            }
          }
        } catch {}
      }

      if (
        allRegisteredById.size > 0 ||
        activeVipsById.size > 0 ||
        customRestsById.size > 0 ||
        verifiedTxnsById.size > 0 ||
        Boolean(harvestedGeminiKey) ||
        Boolean(harvestedMapsKey)
      ) {
        const preUpdateSnapshot = {
          version: APP_VERSION_NAME,
          buildCode: APP_BUILD_CODE,
          previousVersion: installedVer || 'initial',
          backedUpAt: new Date().toISOString(),
          allUsers: Array.from(allRegisteredById.values()),
          vipUsers: Array.from(activeVipsById.values()),
          customRestaurants: Array.from(customRestsById.values()),
          verifiedTransactions: Array.from(verifiedTxnsById.values()),
          geminiApiKey: harvestedGeminiKey || undefined,
          googleMapsApiKey: harvestedMapsKey || undefined,
        };
        if (!safeWriteUpgradeKey('kft_pre_update_db_backup_v1', JSON.stringify(preUpdateSnapshot))) {
          // Compact oversized inline base64 images inside backup snapshot if device storage is ultra-constrained
          const compactSnap = {
            ...preUpdateSnapshot,
            allUsers: preUpdateSnapshot.allUsers.map((u) =>
              typeof u.avatar === 'string' && u.avatar.startsWith('data:') && u.avatar.length > 24000
                ? { ...u, avatar: '' }
                : u
            ),
            vipUsers: preUpdateSnapshot.vipUsers.map((u) =>
              typeof u.avatar === 'string' && u.avatar.startsWith('data:') && u.avatar.length > 24000
                ? { ...u, avatar: '' }
                : u
            ),
            customRestaurants: preUpdateSnapshot.customRestaurants.map((r) => ({
              ...r,
              image: typeof r.image === 'string' && r.image.startsWith('data:') ? '' : r.image,
              gallery: Array.isArray(r.gallery)
                ? r.gallery.filter((g: any) => typeof g === 'string' && !g.startsWith('data:'))
                : undefined,
            })),
          };
          safeWriteUpgradeKey('kft_pre_update_db_backup_v1', JSON.stringify(compactSnap));
        }
      }
    } catch {}

    safeWriteUpgradeKey('kft_app_installed_ver', CURRENT_VER_BUILD);
  }
} catch (e) {
  console.warn('Version migration warning:', e);
}

// 2. Startup Session & VIP Self-Healing Check
try {
  sanitizeStartupCurrentUser();
} catch (e) {
  console.warn('Startup session integrity check warning:', e);
}

// 2b. Protect original food photography: block long-press / right-click "save image" and dragging on dish & shop photos
try {
  const isProtectedImage = (t: EventTarget | null): boolean => {
    if (!(t instanceof HTMLImageElement)) return false;
    const src = t.currentSrc || t.src || '';
    return src.includes('/foods/') || src.includes('/Shop/') || src.startsWith('data:image');
  };
  document.addEventListener('contextmenu', (e) => {
    if (isProtectedImage(e.target)) e.preventDefault();
  });
  document.addEventListener('dragstart', (e) => {
    if (isProtectedImage(e.target)) e.preventDefault();
  });
} catch (e) {
  console.warn('Image protection warning:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
