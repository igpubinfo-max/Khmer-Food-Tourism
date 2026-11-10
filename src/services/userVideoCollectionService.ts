/**
 * Account-Isolated Social Video Collection & Cloud Synchronization Service
 *
 * Guarantees:
 * 1. Strict Account Data Isolation:
 *    - Every saved video record is strictly bound to an authenticated `userId`.
 *    - When User A logs out and User B logs in, ONLY User B's saved videos and personal data are loaded and displayed.
 *    - When User A logs in again, User A's original videos and data are restored cleanly.
 *    - Never mixes videos, favorites, history, or saved content between different accounts.
 * 2. Permanent Cloud & Cross-Device Synchronization:
 *    - Saves collected videos permanently to Supabase (`kft_user_video_collection_<userId>`) in addition to per-user local storage (`kft_user_saved_videos_v1_<userId>`).
 *    - Deduplicates video records by canonical `(userId, platform, videoId/sourceUrl)` when logging in/out or syncing across devices.
 *    - Never deletes permanent database or local per-user records during logout.
 * 3. Temporary Session Cache Cleanup on Account Switch:
 *    - Clears active in-memory/temporary session caches when switching accounts so previous account data never flashes during loading.
 */

import { isSupabaseConfigured, pushCloudDocument, pullCloudDocument } from './supabaseService';
import type { OnlineFoodDiscoveryItem, DiscoveryPlatformId } from './onlineFoodDiscoveryService';
import type { TrendingFoodCategorySlug } from '../types';

export interface UserSavedVideoRecord {
  /** Canonical authenticated user ID who owns this saved video */
  userId: string;
  /** Canonical video identifier (e.g. 19-digit TikTok ID, 11-char YouTube ID, or canonical URL hash) */
  videoId: string;
  /** Social media platform */
  platform: DiscoveryPlatformId;
  /** Direct video watch URL */
  sourceUrl: string;
  /** Creator profile URL */
  originalAccountUrl?: string;
  /** Creator handle (e.g. @fatame.cooking) */
  authorHandle?: string;
  /** Creator / channel display name */
  sourceName: string;
  /** Khmer title */
  titleKh: string;
  /** English title */
  titleEn: string;
  /** Khmer description / caption */
  descriptionKh: string;
  /** English description */
  descriptionEn: string;
  /** Validated thumbnail URL */
  thumbnailUrl: string;
  /** Optional inline video ID */
  inlineVideoId?: string;
  /** Category slug */
  categorySlug: TrendingFoodCategorySlug;
  /** Province in Khmer */
  provinceKh: string;
  /** Province in English */
  provinceEn: string;
  /** Original publication date (ISO or YYYY-MM-DD) */
  publishedOrUpdatedAt: string;
  /** Timestamp when the user collected/saved this video (ISO) */
  savedAt: string;
  /** Original discovery item ID */
  discoveryItemId: string;
}

export interface UserVideoCollectionEnvelope {
  userId: string;
  updatedAt: string;
  videos: UserSavedVideoRecord[];
}

export interface UserPersonalVaultEnvelope {
  userId: string;
  updatedAt: string;
  bookmarks: string[];
  wishlists: any[];
  tripPlans: any[];
}

const LOCAL_VIDEO_COLLECTION_PREFIX = 'kft_user_saved_videos_v1_';
const CLOUD_VIDEO_COLLECTION_PREFIX = 'kft_user_video_collection_';
const CLOUD_PERSONAL_VAULT_PREFIX = 'kft_user_personal_vault_';
const ACTIVE_SESSION_VIDEO_CACHE_KEY = 'kft_active_session_video_cache_v1';

// In-memory isolated cache keyed strictly by canonical userId
const memoryVideoCollectionByUser = new Map<string, UserSavedVideoRecord[]>();
let activeSessionUserId: string | null = null;

/**
 * Normalizes a user ID for storage keys. Returns null for unauthenticated / guest users.
 */
export function normalizeAuthenticatedUserId(userId?: string | null): string | null {
  if (!userId || typeof userId !== 'string') return null;
  const trimmed = userId.trim();
  if (!trimmed || trimmed === 'guest' || trimmed === 'anonymous') return null;
  return trimmed;
}

/**
 * Safe storage key suffix for a user ID
 */
function toSafeStorageKeySuffix(userId: string): string {
  return userId.trim().replace(/[^a-zA-Z0-9._@-]/g, '_');
}

export function getLocalVideoCollectionStorageKey(userId: string): string {
  return `${LOCAL_VIDEO_COLLECTION_PREFIX}${toSafeStorageKeySuffix(userId)}`;
}

export function getCloudVideoCollectionDocKey(userId: string): string {
  return `${CLOUD_VIDEO_COLLECTION_PREFIX}${toSafeStorageKeySuffix(userId)}`;
}

export function getCloudPersonalVaultDocKey(userId: string): string {
  return `${CLOUD_PERSONAL_VAULT_PREFIX}${toSafeStorageKeySuffix(userId)}`;
}

/**
 * Extracts a canonical, deterministic video ID from an OnlineFoodDiscoveryItem or UserSavedVideoRecord
 * so the same video is never duplicated when logging in/out or syncing across devices.
 */
export function extractCanonicalVideoId(item: {
  id?: string;
  discoveryItemId?: string;
  videoId?: string;
  platform?: string;
  sourceUrl?: string;
  inlineVideoId?: string;
}): string {
  if (item.videoId && typeof item.videoId === 'string' && item.videoId.trim()) {
    return item.videoId.trim();
  }
  const url = String(item.sourceUrl || '').trim();
  // 1. TikTok 19-digit video ID
  const ttMatch = url.match(/\/video\/(\d{15,22})/);
  if (ttMatch && ttMatch[1]) {
    return `tiktok:${ttMatch[1]}`;
  }
  // 2. YouTube 11-char video ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `youtube:${ytMatch[1]}`;
  }
  if (item.platform === 'youtube' && item.inlineVideoId && /^[A-Za-z0-9_-]{11}$/.test(item.inlineVideoId.trim())) {
    return `youtube:${item.inlineVideoId.trim()}`;
  }
  // 3. Facebook reel / video URL
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const cleanFb = url.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
    return `facebook:${cleanFb}`;
  }
  // 4. Fallback to discovery item ID or normalized URL
  if (url) {
    return `${item.platform || 'social'}:${url.replace(/\/+$/, '').toLowerCase()}`;
  }
  return `${item.platform || 'social'}:${item.discoveryItemId || item.id || 'unknown'}`;
}

/**
 * Converts an OnlineFoodDiscoveryItem into a strictly owned UserSavedVideoRecord.
 */
export function buildUserSavedVideoRecord(
  userId: string,
  item: OnlineFoodDiscoveryItem,
  savedAtIso?: string
): UserSavedVideoRecord {
  const authUid = normalizeAuthenticatedUserId(userId);
  if (!authUid) {
    throw new Error('Cannot build saved video record without an authenticated userId');
  }
  const canonicalVid = extractCanonicalVideoId(item);
  const handleMatch = String(item.sourceUrl || item.originalAccountUrl || '').match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);

  return {
    userId: authUid,
    videoId: canonicalVid,
    platform: item.platform,
    sourceUrl: item.sourceUrl,
    originalAccountUrl: item.originalAccountUrl,
    authorHandle: handleMatch?.[1] ? `@${handleMatch[1].replace(/^@/, '')}` : undefined,
    sourceName: item.sourceName || 'Cambodia Food Creator',
    titleKh: item.titleKh || item.titleEn || 'វីដេអូម្ហូបខ្មែរ',
    titleEn: item.titleEn || item.titleKh || 'Cambodian Food Video',
    descriptionKh: item.descriptionKh || item.descriptionEn || '',
    descriptionEn: item.descriptionEn || item.descriptionKh || '',
    thumbnailUrl: item.thumbnailUrl || '/foods/food-1.jpg',
    inlineVideoId: item.inlineVideoId,
    categorySlug: item.categorySlug || 'popular_food',
    provinceKh: item.provinceKh || 'ភ្នំពេញ',
    provinceEn: item.provinceEn || 'Phnom Penh',
    publishedOrUpdatedAt: item.publishedOrUpdatedAt || new Date().toISOString().slice(0, 10),
    savedAt: savedAtIso || new Date().toISOString(),
    discoveryItemId: item.id || `saved-${canonicalVid.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
  };
}

/**
 * Converts a UserSavedVideoRecord back to an OnlineFoodDiscoveryItem for display in TrendingSocialModal.
 */
export function savedVideoRecordToDiscoveryItem(rec: UserSavedVideoRecord): OnlineFoodDiscoveryItem {
  return {
    id: rec.discoveryItemId || `saved-${rec.videoId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    platform: rec.platform,
    titleKh: rec.titleKh,
    titleEn: rec.titleEn,
    descriptionKh: rec.descriptionKh,
    descriptionEn: rec.descriptionEn,
    thumbnailUrl: rec.thumbnailUrl,
    sourceUrl: rec.sourceUrl,
    originalAccountUrl: rec.originalAccountUrl,
    sourceName: rec.sourceName,
    authorHandle: rec.authorHandle,
    publishedOrUpdatedAt: rec.publishedOrUpdatedAt,
    isLiveFetched: true,
    verificationBadgeKh: 'វីដេអូបានរក្សាទុកក្នុងគណនីរបស់អ្នក',
    verificationBadgeEn: 'Saved in Your Account',
    verificationBadgeZh: '已保存在您的账户中',
    categorySlug: rec.categorySlug || 'popular_food',
    provinceKh: rec.provinceKh || 'រាជធានីភ្នំពេញ',
    provinceEn: rec.provinceEn || 'Phnom Penh',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: rec.platform !== 'facebook',
    inlineVideoId: rec.inlineVideoId,
  };
}

/**
 * Deduplicates and strictly filters video records so ONLY records belonging to `targetUserId` are kept.
 * Never allows cross-account leakage!
 */
export function deduplicateAndIsolateUserVideos(
  records: UserSavedVideoRecord[],
  targetUserId: string
): UserSavedVideoRecord[] {
  const authUid = normalizeAuthenticatedUserId(targetUserId);
  if (!authUid || !Array.isArray(records)) return [];

  const byCanonicalKey = new Map<string, UserSavedVideoRecord>();

  for (const raw of records) {
    if (!raw || typeof raw !== 'object') continue;
    // STRICT ACCOUNT ISOLATION: reject any record whose userId does not match targetUserId
    if (raw.userId && raw.userId.trim() !== authUid) {
      continue;
    }
    const vid = extractCanonicalVideoId(raw);
    if (!vid || !raw.sourceUrl) continue;

    const normalized: UserSavedVideoRecord = {
      ...raw,
      userId: authUid,
      videoId: vid,
      savedAt: raw.savedAt || new Date().toISOString(),
    };

    const existing = byCanonicalKey.get(vid);
    if (!existing) {
      byCanonicalKey.set(vid, normalized);
    } else {
      // Keep the earliest savedAt or latest updated metadata without creating a duplicate
      const existingSavedMs = Date.parse(existing.savedAt) || 0;
      const incomingSavedMs = Date.parse(normalized.savedAt) || 0;
      byCanonicalKey.set(vid, {
        ...existing,
        ...normalized,
        userId: authUid,
        videoId: vid,
        savedAt: incomingSavedMs > 0 && incomingSavedMs >= existingSavedMs ? normalized.savedAt : existing.savedAt,
      });
    }
  }

  return Array.from(byCanonicalKey.values()).sort((a, b) => {
    const tB = Date.parse(b.savedAt) || 0;
    const tA = Date.parse(a.savedAt) || 0;
    return tB - tA;
  });
}

/**
 * Reads a user's saved video collection synchronously from local storage (strictly scoped to `userId`).
 */
export function getLocalUserSavedVideos(userId?: string | null): UserSavedVideoRecord[] {
  const authUid = normalizeAuthenticatedUserId(userId);
  if (!authUid) return [];

  const cached = memoryVideoCollectionByUser.get(authUid);
  if (cached) {
    return cached;
  }

  try {
    const key = getLocalVideoCollectionStorageKey(authUid);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw && raw !== 'undefined' && raw !== 'null') {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.videos)
          ? parsed.videos
          : [];
      const isolated = deduplicateAndIsolateUserVideos(list, authUid);
      memoryVideoCollectionByUser.set(authUid, isolated);
      return isolated;
    }
  } catch (err) {
    console.warn('[UserVideoCollection] Failed to read local user videos:', err);
  }

  memoryVideoCollectionByUser.set(authUid, []);
  return [];
}

/**
 * Persists a user's saved video collection to their isolated localStorage key (`kft_user_saved_videos_v1_<userId>`).
 */
export function saveLocalUserSavedVideos(
  userId: string,
  videos: UserSavedVideoRecord[]
): UserSavedVideoRecord[] {
  const authUid = normalizeAuthenticatedUserId(userId);
  if (!authUid) return [];

  const isolated = deduplicateAndIsolateUserVideos(videos, authUid);
  memoryVideoCollectionByUser.set(authUid, isolated);

  try {
    const key = getLocalVideoCollectionStorageKey(authUid);
    const envelope: UserVideoCollectionEnvelope = {
      userId: authUid,
      updatedAt: new Date().toISOString(),
      videos: isolated,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(envelope));
      if (activeSessionUserId === authUid) {
        sessionStorage.setItem(ACTIVE_SESSION_VIDEO_CACHE_KEY, JSON.stringify({ userId: authUid, count: isolated.length }));
      }
    }
  } catch (err) {
    console.warn('[UserVideoCollection] Failed to write local user videos:', err);
  }

  return isolated;
}

/**
 * Synchronizes a user's saved video collection with the backend database (Supabase `kft_app_kv_store`).
 * Merges local + cloud records for the same `userId` without duplicates, and writes back to both.
 */
export async function syncUserVideoCollectionWithCloud(
  userId?: string | null,
  pushLocalChanges = true
): Promise<UserSavedVideoRecord[]> {
  const authUid = normalizeAuthenticatedUserId(userId);
  if (!authUid) return [];

  const localVideos = getLocalUserSavedVideos(authUid);
  if (!isSupabaseConfigured()) {
    return localVideos;
  }

  const cloudKey = getCloudVideoCollectionDocKey(authUid);
  try {
    const cloudDoc = await pullCloudDocument<UserVideoCollectionEnvelope | UserSavedVideoRecord[]>(cloudKey, 5000);
    const cloudList: UserSavedVideoRecord[] = Array.isArray(cloudDoc)
      ? cloudDoc
      : Array.isArray(cloudDoc?.videos)
        ? cloudDoc!.videos
        : [];

    const merged = deduplicateAndIsolateUserVideos([...localVideos, ...cloudList], authUid);
    saveLocalUserSavedVideos(authUid, merged);

    if (pushLocalChanges && (merged.length !== cloudList.length || localVideos.length > 0)) {
      await pushCloudDocument(
        cloudKey,
        {
          userId: authUid,
          updatedAt: new Date().toISOString(),
          videos: merged,
        } satisfies UserVideoCollectionEnvelope,
        6000
      );
    }

    return merged;
  } catch (err) {
    console.warn('[UserVideoCollection] Cloud sync fallback to local:', err);
    return localVideos;
  }
}

/**
 * Adds/collects a video into the authenticated user's personal collection and permanently saves to local + cloud DB.
 */
export async function collectVideoForUser(
  userId: string,
  item: OnlineFoodDiscoveryItem
): Promise<{ saved: boolean; videos: UserSavedVideoRecord[]; record: UserSavedVideoRecord }> {
  const authUid = normalizeAuthenticatedUserId(userId);
  if (!authUid) {
    throw new Error('Authentication required to collect videos');
  }

  const current = getLocalUserSavedVideos(authUid);
  const newRecord = buildUserSavedVideoRecord(authUid, item);
  const updated = deduplicateAndIsolateUserVideos([newRecord, ...current], authUid);
  saveLocalUserSavedVideos(authUid, updated);

  if (isSupabaseConfigured()) {
    const cloudKey = getCloudVideoCollectionDocKey(authUid);
    pushCloudDocument(
      cloudKey,
      {
        userId: authUid,
        updatedAt: new Date().toISOString(),
        videos: updated,
      } satisfies UserVideoCollectionEnvelope,
      6000,
      { allowDestructive: true }
    ).catch(() => {});
  }

  return { saved: true, videos: updated, record: newRecord };
}

/**
 * Removes a video from the authenticated user's personal collection and updates local + cloud DB.
 */
export async function removeCollectedVideoForUser(
  userId: string,
  itemOrVideoId: OnlineFoodDiscoveryItem | string
): Promise<{ removed: boolean; videos: UserSavedVideoRecord[] }> {
  const authUid = normalizeAuthenticatedUserId(userId);
  if (!authUid) return { removed: false, videos: [] };

  const targetVid =
    typeof itemOrVideoId === 'string'
      ? itemOrVideoId.trim()
      : extractCanonicalVideoId(itemOrVideoId);

  const current = getLocalUserSavedVideos(authUid);
  const filtered = current.filter(
    (v) =>
      v.videoId !== targetVid &&
      v.discoveryItemId !== targetVid &&
      v.sourceUrl !== targetVid
  );
  const saved = saveLocalUserSavedVideos(authUid, filtered);

  if (isSupabaseConfigured()) {
    const cloudKey = getCloudVideoCollectionDocKey(authUid);
    pushCloudDocument(
      cloudKey,
      {
        userId: authUid,
        updatedAt: new Date().toISOString(),
        videos: saved,
      } satisfies UserVideoCollectionEnvelope,
      6000,
      { allowDestructive: true }
    ).catch(() => {});
  }

  return { removed: filtered.length < current.length, videos: saved };
}

/**
 * Toggles a video in the authenticated user's personal collection.
 */
export async function toggleCollectVideoForUser(
  userId: string,
  item: OnlineFoodDiscoveryItem
): Promise<{ isSaved: boolean; videos: UserSavedVideoRecord[] }> {
  const authUid = normalizeAuthenticatedUserId(userId);
  if (!authUid) {
    throw new Error('Authentication required to save videos');
  }

  if (isVideoCollectedByUser(authUid, item)) {
    const res = await removeCollectedVideoForUser(authUid, item);
    return { isSaved: false, videos: res.videos };
  } else {
    const res = await collectVideoForUser(authUid, item);
    return { isSaved: true, videos: res.videos };
  }
}

/**
 * Checks whether a video is saved in `userId`'s collection.
 */
export function isVideoCollectedByUser(
  userId?: string | null,
  item?: OnlineFoodDiscoveryItem | { id?: string; videoId?: string; platform?: string; sourceUrl?: string; inlineVideoId?: string } | null
): boolean {
  const authUid = normalizeAuthenticatedUserId(userId);
  if (!authUid || !item) return false;

  const targetVid = extractCanonicalVideoId(item);
  const list = getLocalUserSavedVideos(authUid);
  return list.some(
    (v) =>
      v.userId === authUid &&
      (v.videoId === targetVid ||
        (item.id && v.discoveryItemId === item.id) ||
        (item.sourceUrl && v.sourceUrl === item.sourceUrl))
  );
}

/**
 * Clears user-specific temporary in-memory/session caches when switching accounts or logging out.
 * IMPORTANT: Never deletes permanent database records or per-user localStorage vaults during logout!
 */
export function clearActiveVideoSessionCacheOnAccountSwitch(nextUserId?: string | null): void {
  const prevUserId = activeSessionUserId;
  const nextUid = normalizeAuthenticatedUserId(nextUserId);
  activeSessionUserId = nextUid;

  // Evict previous user's in-memory cache entry so a fresh read from disk/cloud occurs on next login
  if (prevUserId && prevUserId !== nextUid) {
    memoryVideoCollectionByUser.delete(prevUserId);
  }
  if (!nextUid) {
    memoryVideoCollectionByUser.clear();
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(ACTIVE_SESSION_VIDEO_CACHE_KEY);
    }
  } catch {}
}

/**
 * Synchronizes a user's personal Bookmarks, Wishlists, and Trip Plans with Supabase Cloud (`kft_user_personal_vault_<userId>`)
 * so personal data is isolated per account and restored across devices.
 */
export async function syncUserPersonalVaultWithCloud(params: {
  userId: string;
  localBookmarks: string[];
  localWishlists: any[];
  localTripPlans: any[];
  pushMerged?: boolean;
}): Promise<UserPersonalVaultEnvelope | null> {
  const authUid = normalizeAuthenticatedUserId(params.userId);
  if (!authUid || !isSupabaseConfigured()) return null;

  const cloudKey = getCloudPersonalVaultDocKey(authUid);
  try {
    const remote = await pullCloudDocument<UserPersonalVaultEnvelope>(cloudKey, 5000);
    const remoteBookmarks = Array.isArray(remote?.bookmarks) ? remote!.bookmarks : [];
    const remoteWishlists = Array.isArray(remote?.wishlists) ? remote!.wishlists : [];
    const remoteTripPlans = Array.isArray(remote?.tripPlans) ? remote!.tripPlans : [];

    const mergedBookmarks = Array.from(
      new Set([...params.localBookmarks, ...remoteBookmarks].filter((x): x is string => typeof x === 'string' && x.trim().length > 0))
    );

    const wishlistById = new Map<string, any>();
    for (const w of [...remoteWishlists, ...params.localWishlists]) {
      if (!w || !w.id) continue;
      // Ensure wishlist belongs to this user or is a default template
      if (w.userId && w.userId !== 'guest' && w.userId !== authUid) continue;
      const prev = wishlistById.get(w.id);
      if (!prev) {
        wishlistById.set(w.id, { ...w, userId: authUid });
      } else {
        const itemMap = new Map<string, any>();
        for (const it of [...(Array.isArray(prev.items) ? prev.items : []), ...(Array.isArray(w.items) ? w.items : [])]) {
          if (it && it.id) itemMap.set(it.id, it);
        }
        wishlistById.set(w.id, {
          ...prev,
          ...w,
          userId: authUid,
          items: Array.from(itemMap.values()),
        });
      }
    }

    const tripPlanById = new Map<string, any>();
    for (const p of [...remoteTripPlans, ...params.localTripPlans]) {
      if (!p || !p.id) continue;
      if (p.userId && p.userId !== 'guest' && p.userId !== authUid) continue;
      tripPlanById.set(p.id, { ...p, userId: authUid });
    }

    const mergedEnvelope: UserPersonalVaultEnvelope = {
      userId: authUid,
      updatedAt: new Date().toISOString(),
      bookmarks: mergedBookmarks,
      wishlists: Array.from(wishlistById.values()),
      tripPlans: Array.from(tripPlanById.values()),
    };

    if (params.pushMerged !== false) {
      pushCloudDocument(cloudKey, mergedEnvelope, 6000, { allowDestructive: true }).catch(() => {});
    }

    return mergedEnvelope;
  } catch {
    return null;
  }
}
