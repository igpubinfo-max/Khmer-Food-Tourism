import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { sanitizeStartupCurrentUser } from './utils/securityIntegrityGuard.ts'
import { installRuntimeAntiDebugGuard } from './utils/appCloneIntegrityGuard.ts'
import {
  APP_VERSION_NAME,
  APP_BUILD_CODE,
  REMOVED_DUPLICATE_FOOD_IDS,
  remapDuplicateFoodIdToCanonical,
  deduplicateFoodItems,
} from './types/index.ts'
import { runUserDataIntegrityCheck } from './services/userDataIntegrityService.ts'

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
    'kft_foods_real_v13',
    'kft_destinations_real_v15',
    'kft_trending_foods_v5',
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

  // Auto-upgrade any cached pre-v101 VIP pricing (legacy 30d or 60d prices) in kft_settings_v5 immediately on boot
  const rawSettingsV5 = localStorage.getItem('kft_settings_v5');
  if (rawSettingsV5) {
    try {
      const parsedSettings = JSON.parse(rawSettingsV5);
      if (parsedSettings && typeof parsedSettings === 'object') {
        const ver = Number(parsedSettings.settingsVersion) || 0;
        if (
          ver < 101 ||
          Number(parsedSettings.vipShortPriceUsd) > 2.99 ||
          Number(parsedSettings.consumer30dPriceUsd) > 2.99 ||
          Number(parsedSettings.vipLongDurationDays) === 60
        ) {
          parsedSettings.vipShortPriceUsd = 2.99;
          parsedSettings.vipShortDurationDays = 30;
          parsedSettings.vipLongPriceUsd = 6.99;
          parsedSettings.vipLongDurationDays = 90;
          parsedSettings.consumerPromo30dPriceUsd = 0.99;
          parsedSettings.consumer30dPriceUsd = 2.99;
          parsedSettings.consumer90dPriceUsd = 6.99;
          parsedSettings.consumer365dPriceUsd = 19.99;
          parsedSettings.shopMonthlyPriceUsd = 6.99;
          parsedSettings.shopYearlyPriceUsd = 59.99;
          parsedSettings.shopEarlyBirdYearlyPriceUsd = 49.99;
          parsedSettings.additionalStoreFeeUsd = 6.99;
          parsedSettings.promotionalFeeUsd = 2.99;
          parsedSettings.settingsVersion = Math.max(ver, 101);
          localStorage.setItem('kft_settings_v5', JSON.stringify(parsedSettings));
        }
      }
    } catch {
      // Ignore malformed settings JSON
    }
  }

  // Sanitize any cached legacy 30-day VIP history/transaction entries in localStorage on boot
  const sanitizeCachedVipHistoryInObject = (u: any): boolean => {
    if (!u || typeof u !== 'object' || !Array.isArray(u.vipMembershipHistory)) return false;
    let mod = false;
    u.vipMembershipHistory = u.vipMembershipHistory.map((h: any) => {
      if (!h || typeof h !== 'object') return h;
      let nextH = { ...h };
      let hMod = false;
      const is30d = !nextH.durationDays || nextH.durationDays <= 35 || nextH.planType === 'quarterly';
      if (is30d && (nextH.amountUsd === 4.99 || nextH.amountUsd === 9.99)) {
        nextH.amountUsd = 2.99;
        hMod = true;
      }
      if (typeof nextH.noteKh === 'string' && nextH.noteKh.includes('$4.99')) {
        nextH.noteKh = nextH.noteKh.split('$4.99').join('$2.99');
        hMod = true;
      }
      if (typeof nextH.noteEn === 'string' && nextH.noteEn.includes('$4.99')) {
        nextH.noteEn = nextH.noteEn.split('$4.99').join('$2.99');
        hMod = true;
      }
      if (hMod) mod = true;
      return hMod ? nextH : h;
    });
    return mod;
  };

  for (const singleUserKey of ['kft_current_user_v5', 'kft_current_user_v4']) {
    const rawCur = localStorage.getItem(singleUserKey);
    if (rawCur) {
      try {
        const parsedCur = JSON.parse(rawCur);
        if (sanitizeCachedVipHistoryInObject(parsedCur)) {
          localStorage.setItem(singleUserKey, JSON.stringify(parsedCur));
        }
      } catch {}
    }
  }

  for (const listUserKey of ['kft_users_v5', 'kft_users_v4', 'kft_vip_registry_backup_v1']) {
    const rawList = localStorage.getItem(listUserKey);
    if (rawList) {
      try {
        const parsedList = JSON.parse(rawList);
        if (Array.isArray(parsedList)) {
          let listMod = false;
          for (const item of parsedList) {
            if (sanitizeCachedVipHistoryInObject(item)) listMod = true;
          }
          if (listMod) {
            localStorage.setItem(listUserKey, JSON.stringify(parsedList));
          }
        }
      } catch {}
    }
  }

  for (const txnKey of ['kft_transactions_v4', 'kft_transactions_v3']) {
    const rawTxns = localStorage.getItem(txnKey);
    if (rawTxns) {
      try {
        const parsedTxns = JSON.parse(rawTxns);
        if (Array.isArray(parsedTxns)) {
          let txnMod = false;
          for (const t of parsedTxns) {
            if (!t || typeof t !== 'object') continue;
            const is30d = !t.durationDays || t.durationDays <= 35 || t.planType === 'quarterly';
            if (is30d && (t.amountUsd === 4.99 || t.amountUsd === 9.99)) {
              t.amountUsd = 2.99;
              txnMod = true;
            }
            if (typeof t.notes === 'string' && t.notes.includes('$4.99')) {
              t.notes = t.notes.split('$4.99').join('$2.99');
              txnMod = true;
            }
          }
          if (txnMod) {
            localStorage.setItem(txnKey, JSON.stringify(parsedTxns));
          }
        }
      } catch {}
    }
  }

  // Purge any removed duplicate food IDs from cached food overrides, ledger, cloud retry queue, and food catalog cache
  for (const mapKey of ['kft_permanent_food_overrides_v1', 'kft_food_revision_ledger_v1']) {
    const rawMap = localStorage.getItem(mapKey);
    if (rawMap) {
      try {
        const parsedMap = JSON.parse(rawMap);
        if (parsedMap && typeof parsedMap === 'object') {
          let changed = false;
          for (const fid of Object.keys(parsedMap)) {
            if (REMOVED_DUPLICATE_FOOD_IDS.has(fid)) {
              delete parsedMap[fid];
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem(mapKey, JSON.stringify(parsedMap));
          }
        }
      } catch {}
    }
  }

  const rawPendingQueue = localStorage.getItem('kft_pending_media_cloud_queue_v1');
  if (rawPendingQueue) {
    try {
      const parsedQueue = JSON.parse(rawPendingQueue);
      if (parsedQueue && typeof parsedQueue === 'object') {
        let qChanged = false;
        for (const qk of Object.keys(parsedQueue)) {
          const item = parsedQueue[qk];
          if (item && item.category === 'food' && REMOVED_DUPLICATE_FOOD_IDS.has(item.id)) {
            delete parsedQueue[qk];
            qChanged = true;
          }
        }
        if (qChanged) {
          localStorage.setItem('kft_pending_media_cloud_queue_v1', JSON.stringify(parsedQueue));
        }
      }
    } catch {}
  }

  const rawCachedFoods = localStorage.getItem('kft_foods_200_v10');
  if (rawCachedFoods) {
    try {
      const parsedFoods = JSON.parse(rawCachedFoods);
      if (Array.isArray(parsedFoods)) {
        const dedupedFoods = deduplicateFoodItems(parsedFoods);
        if (dedupedFoods.length !== parsedFoods.length) {
          localStorage.setItem('kft_foods_200_v10', JSON.stringify(dedupedFoods));
        }
      }
    } catch {}
  }

  // Remap any bookmarked duplicate food IDs to their canonical dish ID so user favorites are never lost
  const rawBookmarksV5 = localStorage.getItem('kft_bookmarks_v5');
  if (rawBookmarksV5) {
    try {
      const parsedBm = JSON.parse(rawBookmarksV5);
      if (Array.isArray(parsedBm)) {
        const remappedBm = Array.from(
          new Set(
            parsedBm
              .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
              .map((id) => remapDuplicateFoodIdToCanonical(id))
          )
        );
        if (remappedBm.length !== parsedBm.length || remappedBm.some((id, i) => id !== parsedBm[i])) {
          localStorage.setItem('kft_bookmarks_v5', JSON.stringify(remappedBm));
        }
      }
    } catch {}
  }
} catch (e) {
  console.warn('Pre-boot cache sanitation warning:', e);
}

// 1. Version & Build Migration: Safe non-destructive upgrade preserving ALL registered user accounts,
//    active sessions, profile avatars, VIP entitlements, VIP-owned shops, and verified payment history
try {
  const CURRENT_VER_BUILD = `${APP_VERSION_NAME}_${APP_BUILD_CODE}`;
  const installedVer = localStorage.getItem('kft_app_installed_ver');
  // Self-contained (no imports) so the upgrade audit also runs inside the scripted migration tests.
  const __kftCountStoredUsers = (): { users: number; vip: number } => {
    try {
      const ids = new Set<string>();
      let vip = 0;
      const nowTs = Date.now();
      for (const k of ['kft_users_v5', 'kft_users_v4']) {
        const rawU = localStorage.getItem(k);
        if (!rawU || rawU === 'undefined' || rawU === 'null') continue;
        const arrU = JSON.parse(rawU);
        if (!Array.isArray(arrU)) continue;
        for (const u of arrU) {
          if (!u || !u.id || u.role === 'admin' || u.isGuest) continue;
          const id = String(u.id);
          if (ids.has(id)) continue;
          ids.add(id);
          const exp = Date.parse(String(u.subscriptionExpiryDate || u.vipExpiresAt || '')) || 0;
          if ((u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active') && u.subscriptionStatus !== 'cancelled' && exp > nowTs) vip++;
        }
      }
      return { users: ids.size, vip };
    } catch {
      return { users: 0, vip: 0 };
    }
  };
  if (installedVer !== CURRENT_VER_BUILD) {
    const __auditBefore = __kftCountStoredUsers();
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

    // Upgrade audit: prove (and log) that no registered user / active VIP was lost by this version change.
    try {
      const __auditAfter = __kftCountStoredUsers();
      const auditEntry = {
        from: installedVer || 'initial',
        to: CURRENT_VER_BUILD,
        usersBefore: __auditBefore.users,
        usersAfter: __auditAfter.users,
        vipBefore: __auditBefore.vip,
        vipAfter: __auditAfter.vip,
        at: new Date().toISOString(),
      };
      const rawAudit = localStorage.getItem('kft_upgrade_audit_log_v1');
      const auditLog: any[] = rawAudit ? JSON.parse(rawAudit) : [];
      auditLog.unshift(auditEntry);
      auditLog.length = Math.min(auditLog.length, 40);
      localStorage.setItem('kft_upgrade_audit_log_v1', JSON.stringify(auditLog));
      if (auditEntry.usersAfter < auditEntry.usersBefore || auditEntry.vipAfter < auditEntry.vipBefore) {
        const rawLog = localStorage.getItem('kft_integrity_log_v1');
        const integrityLog: any[] = rawLog ? JSON.parse(rawLog) : [];
        integrityLog.unshift({
          at: auditEntry.at,
          level: 'critical',
          code: 'upgrade_lost_users',
          message: `Upgrade ${auditEntry.from} -> ${auditEntry.to}: users ${auditEntry.usersBefore} -> ${auditEntry.usersAfter}, VIP ${auditEntry.vipBefore} -> ${auditEntry.vipAfter}`,
          data: auditEntry,
        });
        integrityLog.length = Math.min(integrityLog.length, 200);
        localStorage.setItem('kft_integrity_log_v1', JSON.stringify(integrityLog));
        console.error('[KFT] Upgrade lost users!', auditEntry);
      }
    } catch {
      /* audit must never break the upgrade */
    }

    safeWriteUpgradeKey('kft_app_installed_ver', CURRENT_VER_BUILD);
  }
} catch (e) {
  console.warn('Version migration warning:', e);
}

// 1b. Runtime Anti-Debugging & Anti-Clone Origin Guard
try {
  installRuntimeAntiDebugGuard();
} catch {}

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

// 3. Boot-time user-data integrity check: logs shrinkage / duplicates / missing registration dates BEFORE any sync can propagate them
try {
  const rawBootUsers = localStorage.getItem('kft_users_v5');
  const bootUsers = rawBootUsers && rawBootUsers !== 'undefined' && rawBootUsers !== 'null' ? JSON.parse(rawBootUsers) : [];
  runUserDataIntegrityCheck(Array.isArray(bootUsers) ? bootUsers.filter((u: any) => u && u.role !== 'admin') : []);
} catch (e) {
  console.warn('Boot user-data integrity check warning:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
