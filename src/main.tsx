import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// 0. Version Migration: Safe non-destructive upgrade to v1.5.8
try {
  const CURRENT_VER = '1.5.8';
  const installedVer = localStorage.getItem('kft_app_installed_ver');
  if (installedVer !== CURRENT_VER) {
    // Keep all existing user accounts, credentials, and v4 data intact
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

// 1. Pre-boot cache sanitation: Purge invalid or corrupt values
try {
  const keysToCheck = [
    'kft_current_user_v4', 'kft_users_v4', 'kft_foods_100_v1', 'kft_foods_100_v2',
    'kft_restaurants_membership_v2', 'kft_destinations_100_v1',
    'kft_posts_v4', 'kft_posts_v3', 'kft_bookmarks_v4', 'kft_bookmarks_v3',
    'kft_settings_v4', 'kft_settings_v3', 'kft_transactions_v4'
  ];
  keysToCheck.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw === 'undefined' || raw === 'null') {
      localStorage.removeItem(key);
    } else if (raw) {
      try {
        JSON.parse(raw);
      } catch {
        localStorage.removeItem(key);
      }
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

