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

// 1. Version & Build Migration: Safe non-destructive upgrade preserving all user accounts & VIP entitlements
try {
  const CURRENT_VER_BUILD = `${APP_VERSION_NAME}_${APP_BUILD_CODE}`;
  const installedVer = localStorage.getItem('kft_app_installed_ver');
  if (installedVer !== CURRENT_VER_BUILD) {
    // Seal any active VIP accounts from currentUser / user lists into `kft_vip_registry_backup_v1` BEFORE evicting old caches
    try {
      const candidateVips: any[] = [];
      for (const k of ['kft_vip_registry_backup_v1', 'kft_users_v5', 'kft_users_v4', 'kft_cloud_users_v2', 'kft_cloud_users_v1']) {
        const rawList = localStorage.getItem(k);
        if (rawList && rawList !== 'undefined' && rawList !== 'null') {
          const arr = JSON.parse(rawList);
          if (Array.isArray(arr)) candidateVips.push(...arr);
        }
      }
      for (const ck of ['kft_current_user_v5', 'kft_current_user_v4']) {
        const rawCur = localStorage.getItem(ck);
        if (rawCur && rawCur !== 'undefined' && rawCur !== 'null') {
          const curObj = JSON.parse(rawCur);
          if (curObj && typeof curObj === 'object' && !Array.isArray(curObj)) candidateVips.push(curObj);
        }
      }
      const nowMs = Date.now();
      const byId = new Map<string, any>();
      for (const u of candidateVips) {
        if (!u || typeof u !== 'object' || u.role === 'admin') continue;
        if (u.subscriptionStatus === 'cancelled' || u.paymentStatus === 'cancelled') continue;
        const isVip = u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active' || u.vipStatus === 'active';
        if (!isVip) continue;
        const rawExp = u.subscriptionExpiryDate || u.vipExpiresAt;
        const expMs = rawExp ? Date.parse(String(rawExp)) || 0 : 0;
        if (expMs > nowMs && u.id) {
          const prev = byId.get(u.id);
          const prevExp = prev ? Date.parse(String(prev.subscriptionExpiryDate || prev.vipExpiresAt || '')) || 0 : 0;
          if (!prev || expMs >= prevExp) {
            byId.set(u.id, u);
          }
        }
      }
      if (byId.size > 0) {
        localStorage.setItem('kft_vip_registry_backup_v1', JSON.stringify(Array.from(byId.values())));
      }
    } catch {}

    // Evict heavy expendable food/destination caches on build upgrade to guarantee ample space for account backups
    localStorage.removeItem('kft_foods_200_v9');
    localStorage.removeItem('kft_destinations_real_v8');
    if (localStorage.getItem('kft_restaurants_real_v13')) {
      localStorage.removeItem('kft_restaurants_real_v12');
    }
    localStorage.setItem('kft_app_installed_ver', CURRENT_VER_BUILD);
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
