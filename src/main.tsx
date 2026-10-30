import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { sanitizeStartupCurrentUser } from './utils/securityIntegrityGuard.ts'

// 0. Anti-Tamper & Security Integrity Check: Strip unsealed/tampered admin roles or fake VIP status
try {
  sanitizeStartupCurrentUser();
} catch (e) {
  console.warn('Startup anti-tamper integrity check warning:', e);
}

// 1. Version Migration: Safe non-destructive upgrade to v2.5.0 (Build 1250)
try {
  const CURRENT_VER = '2.5.0';
  const installedVer = localStorage.getItem('kft_app_installed_ver');
  if (installedVer !== CURRENT_VER) {
    // Keep all existing user accounts, credentials, and v5 data intact
    if (!installedVer) {
      localStorage.removeItem('kft_foods_100_v1');
      localStorage.removeItem('kft_restaurants_membership_v1');
      localStorage.removeItem('kft_destinations_100_v1');
      localStorage.removeItem('kft_restaurants_v3');
      localStorage.removeItem('kft_posts_v3');
    }
    localStorage.setItem('kft_app_installed_ver', CURRENT_VER);
  }
} catch (e) {
  console.warn('Version migration warning:', e);
}

// 2. Pre-boot cache sanitation: Purge invalid or corrupt values and clear legacy VIP settings caches
try {
  localStorage.removeItem('kft_settings_v3');
  localStorage.removeItem('kft_settings_v4');
  const keysToCheck = [
    'kft_current_user_v4', 'kft_users_v4', 'kft_foods_100_v1', 'kft_foods_100_v2',
    'kft_restaurants_membership_v2', 'kft_destinations_100_v1',
    'kft_posts_v4', 'kft_posts_v3', 'kft_bookmarks_v4', 'kft_bookmarks_v3',
    'kft_settings_v5', 'kft_transactions_v4'
  ];
  keysToCheck.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw === 'undefined' || raw === 'null') {
      localStorage.removeItem(key);
    }
  });
} catch (e) {
  console.warn('Cache sanitation warning:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
