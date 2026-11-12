import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X, Utensils, ExternalLink, Navigation, Phone, Share2, Calendar,
  UtensilsCrossed, RefreshCw, ChefHat, CheckCircle2, Play,
  Search, Sparkles, AlertCircle, RotateCcw, ChevronRight, Loader2, WifiOff, Volume2, VolumeX
} from 'lucide-react';
import {
  TrendingFoodCategorySlug,
  openTrendingFoodGoogleExternal,
  getTrendingFoodGoogleExternalUrl,
  openExternalUrlNativeSafe,
  resolveFoodPhotoUrl,
  handleFoodImageError,
} from '../types';
import { shareRichContent } from '../utils/androidMediaHelper';
import { openAiAssistantWithQuery, getAskAiButtonLabel } from '../utils/aiSearchBridge';
import { tr, translateProvince } from '../utils/i18n';
import { getFallbackAvatarDataUri } from '../utils/avatarHelper';
import {
  getLocalizedFood,
  getLocalizedRestaurant,
  getLocalizedDestination,
  translateDynamicTextToZh,
} from '../utils/zhDynamicTranslator';
import {
  normalizeKhmerSearchText,
  searchCambodiaPlacesWithSmartCache,
  performUnifiedCambodiaSearch,
  GooglePlaceCachedItem,
  openExternalPlaceInGoogleMaps,
} from '../services/googlePlacesService';
import {
  searchAndDiscoverSocialFood,
  extractEmbedPlayerInfo,
  extractYouTubeVideoId,
  markYouTubeVideoUnavailable,
  getReplacementCambodianVideo,
  getNextPlayableSocialVideoId,
  matchesExpandedYouTubeQuery,
  advanceVideoRotationCycle,
  getCurrentVideoRotationCycle,
  rotateLatestVideosForScope,
  deduplicateSingleVideoList,
  OnlineFoodDiscoveryItem,
  resolveOriginalSocialAccountUrl,
  resolvePlayableTikTokStreamUrl,
  getCachedTikTokStreamUrl,
  prewarmTikTokStreams,
  CAMBODIA_FOOD_YOUTUBE_SEARCH_KEYWORDS,
} from '../services/onlineFoodDiscoveryService';
import { savedVideoRecordToDiscoveryItem } from '../services/userVideoCollectionService';

const VIDEO_BATCH_SIZE = 20;

export const TrendingSocialModal: React.FC = () => {
  const {
    isTrendingSocialModalOpen,
    setIsTrendingSocialModalOpen,
    setIsWhatToEatModalOpen,
    trendingFoods,
    foods,
    restaurants,
    destinations,
    currentUser,
    language,
    setSelectedTrendingFood,
    setIsTrendingFoodDetailModalOpen,
    setSelectedFood,
    setSelectedRestaurant,
    setSelectedDestination,
    showToast,
    savedVideos,
    refreshUserSavedVideos,
  } = useApp();

  const isKm = language === 'km';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'tiktok' | 'facebook' | 'youtube' | 'saved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TrendingFoodCategorySlug>('all');

  useEffect(() => {
    if (isTrendingSocialModalOpen && typeof window !== 'undefined') {
      const initPlat = (window as any).__kft_trending_initial_platform;
      if (initPlat === 'tiktok' || initPlat === 'facebook' || initPlat === 'youtube' || initPlat === 'all') {
        setPlatformFilter(initPlat);
        (window as any).__kft_trending_initial_platform = undefined;
      }
    }
  }, [isTrendingSocialModalOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPlatEvent = (e: Event) => {
      const p = (e as CustomEvent<string>).detail;
      if (p === 'tiktok' || p === 'facebook' || p === 'youtube' || p === 'all') {
        setPlatformFilter(p);
      }
    };
    window.addEventListener('kft:trending-platform', onPlatEvent);
    return () => window.removeEventListener('kft:trending-platform', onPlatEvent);
  }, []);
  // Reset active inline player and refresh isolated user video collection when account switches
  useEffect(() => {
    setActivePlayerItemId(null);
    setVerifyingPlayItemId(null);
    if (platformFilter === 'saved' && (!currentUser?.id || currentUser.id === 'guest')) {
      setPlatformFilter('all');
    }
    if (currentUser?.id && currentUser.id !== 'guest') {
      refreshUserSavedVideos().catch(() => {});
    }
  }, [currentUser?.id, refreshUserSavedVideos]);
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [visibleVideoCount, setVisibleVideoCount] = useState<number>(VIDEO_BATCH_SIZE);
  const loadMoreVideosRef = useRef<HTMLDivElement | null>(null);

  const [discoveryItems, setDiscoveryItems] = useState<OnlineFoodDiscoveryItem[]>([]);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const [rotationCycle, setRotationCycle] = useState<number>(() => getCurrentVideoRotationCycle());

  // Live Google Maps & Smart Cache search state (reusing Home Screen search engine)
  const [smartCachePlaces, setSmartCachePlaces] = useState<GooglePlaceCachedItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);

  // Active inline video player tracking & embed fallback state
  const [activePlayerItemId, setActivePlayerItemId] = useState<string | null>(null);
  const [embedFallbackItemIds, setEmbedFallbackItemIds] = useState<Record<string, boolean>>({});
  const [resolvedDirectVideoUrls, setResolvedDirectVideoUrls] = useState<
    Record<string, { primaryUrl: string; backupUrl?: string; usingBackup?: boolean; failedAllDirect?: boolean }>
  >({});
  const [verifyingPlayItemId, setVerifyingPlayItemId] = useState<string | null>(null);
  const [isVideoBuffering, setIsVideoBuffering] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    () => typeof navigator !== 'undefined' && navigator.onLine === false
  );
  const [isRetryingConnection, setIsRetryingConnection] = useState<boolean>(false);
  const [playerReloadKey, setPlayerReloadKey] = useState<number>(0);
  const activeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);

  /** Lightweight connectivity probe to prevent Android WebView raw error page when offline */
  const checkYouTubeConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }
    if (typeof fetch !== 'function') {
      return true;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      await fetch(`https://www.youtube.com/generate_204?_=${Date.now()}`, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      return true;
    } catch {
      clearTimeout(timer);
      return false;
    }
  }, []);

  // Automatically sync online/offline state and reload active video when internet is restored
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleOnline = async () => {
      const reachable = await checkYouTubeConnectivity();
      if (reachable) {
        setIsOffline(false);
        setPlayerReloadKey((prev) => prev + 1);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkYouTubeConnectivity]);

  // Concurrency guard ref to prevent overlapping fetches
  const isFetchingRef = useRef<boolean>(false);
  // IDs already shown, used to detect newly uploaded videos on automatic refreshes
  const knownVideoIdsRef = useRef<Set<string>>(new Set());

  /** Automatically replace an unavailable video with a verified playable Cambodian video stream inline */
  const handleReplaceUnavailableVideo = useCallback(
    (unavailableItem: OnlineFoodDiscoveryItem, notifyUser = false) => {
      if (unavailableItem.platform === 'tiktok' || unavailableItem.platform === 'facebook') {
        const nextInlineVid = getNextPlayableSocialVideoId(unavailableItem.inlineVideoId);
        setDiscoveryItems((prev) =>
          prev.map((x) =>
            x.id === unavailableItem.id
              ? { ...x, inlineVideoId: nextInlineVid, canInlineEmbed: true }
              : x
          )
        );
        setEmbedFallbackItemIds((prev) => ({
          ...prev,
          [unavailableItem.id]: false,
        }));
        setPlayerReloadKey((prev) => prev + 1);
        return;
      }

      markYouTubeVideoUnavailable(unavailableItem.sourceUrl);
      let replacedId: string | null = null;
      setDiscoveryItems((prev) => {
        const existingVideoIds = prev
          .map((x) => extractYouTubeVideoId(x.sourceUrl) || '')
          .filter(Boolean);
        const replacement = getReplacementCambodianVideo(
          unavailableItem.categorySlug,
          existingVideoIds,
          foods
        );
        if (!replacement) {
          return prev.filter((x) => x.id !== unavailableItem.id);
        }
        replacedId = replacement.id;
        return prev.map((x) => (x.id === unavailableItem.id ? replacement : x));
      });

      if (activePlayerItemId === unavailableItem.id) {
        setActivePlayerItemId(replacedId);
      }

      if (notifyUser) {
        showToast(
          tr(
            language,
            '🔄 បានប្តូរវីដេអូដែលមិនអាចចាក់បាន ជំនួសដោយវីដេអូម្ហូប និងទេសចរណ៍ខ្មែរដែលអាចចាក់បាន!',
            '🔄 Replaced unavailable video with a verified playable Cambodian video!',
            '🔄 已自动将不可用视频替换为可播放的柬埔寨美食与旅游视频！'
          ),
          'info'
        );
      }
    },
    [activePlayerItemId, foods, language, showToast]
  );

  // Listen to YouTube IFrame Player API postMessage events (detects Error 100 / 101 / 150) and auto-swap inline stream
  useEffect(() => {
    if (!activePlayerItemId) return;

    const handleYouTubeMessage = (event: MessageEvent) => {
      if (!event.origin || !event.origin.includes('youtube')) return;
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (data?.event === 'onError') {
          const currentItem = discoveryItems.find((x) => x.id === activePlayerItemId);
          if (!currentItem) return;
          handleReplaceUnavailableVideo(currentItem, false);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [activePlayerItemId, discoveryItems, handleReplaceUnavailableVideo]);

  const loadFeed = useCallback(
    async (force = false, isAutoCycle = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (force || discoveryItems.length === 0) {
        setIsRefreshing(true);
      }
      setHasError(false);
      try {
        const nextCycle = advanceVideoRotationCycle();
        setRotationCycle(nextCycle);

        const res = await searchAndDiscoverSocialFood({
          query: '',
          platform: 'all',
          categorySlug: 'all',
          foods,
          trendingFoods,
          forceRefresh: force,
          skipRotation: true,
        });
        const prevIds = knownVideoIdsRef.current;
        const newItems = res.items.filter((it) => !prevIds.has(it.id));
        knownVideoIdsRef.current = new Set(res.items.map((it) => it.id));
        setDiscoveryItems(res.items);
        setLastCheckedAt(new Date().toISOString());
        if (!force && prevIds.size > 0 && newItems.length > 0) {
          showToast(
            tr(
              language,
              `🆕 បានរកឃើញវីដេអូម្ហូបថ្មីចំនួន ${newItems.length} ពី TikTok, Facebook និង YouTube`,
              `🆕 Discovered ${newItems.length} new food video(s) from TikTok, Facebook & YouTube`,
              `🆕 已发现 ${newItems.length} 条来自 TikTok、Facebook 和 YouTube 的新美食视频`
            ),
            'info'
          );
        }
        setCooldownSec(res.cooldownRemainingSec);

        if (force && !isAutoCycle) {
          if (res.cooldownRemainingSec > 0) {
            showToast(
              tr(
                language,
                `⏳ សូមរង់ចាំ ${res.cooldownRemainingSec} វិនាទីទៀតមុននឹងផ្ទុកឡើងវិញ`,
                `⏳ Please wait ${res.cooldownRemainingSec}s before refresh`,
                `⏳ 请等待 ${res.cooldownRemainingSec} 秒后再刷新`
              ),
              'info'
            );
          } else {
            showToast(
              tr(
                language,
                `✅ បានស្វែងរក និងធ្វើបច្ចុប្បន្នភាពវីដេអូម្ហូបថ្មីៗ (${res.items.length} វីដេអូ)`,
                `✅ Refreshed & discovered latest food videos (${res.items.length} videos)`,
                `✅ 已刷新并发现最新美食视频（共 ${res.items.length} 条）`
              ),
              'success'
            );
          }
        }
      } catch {
        setHasError(true);
        if (force && !isAutoCycle) {
          showToast(
            tr(
              language,
              '⚠️ មិនអាចទាញយកវីដេអូថ្មីបានទេ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត',
              '⚠️ Could not load trending video feed. Please check connection.',
              '⚠️ 无法加载热门视频，请检查网络连接。'
            ),
            'warning'
          );
        }
      } finally {
        setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [foods, trendingFoods, language, discoveryItems.length]
  );

  const activePlayerItemIdRef = useRef<string | null>(null);
  activePlayerItemIdRef.current = activePlayerItemId;

  // Initial load & rotation when modal opens, plus periodic background discovery when no inline video is playing
  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;
  useEffect(() => {
    if (!isTrendingSocialModalOpen) return;
    loadFeedRef.current(false, false);

    const autoDiscoverTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!activePlayerItemIdRef.current) {
        loadFeedRef.current(true, true);
      }
    }, 180 * 1000);

    return () => clearInterval(autoDiscoverTimer);
  }, [isTrendingSocialModalOpen]);

  // Stop inline video when modal closes
  useEffect(() => {
    if (!isTrendingSocialModalOpen) {
      setActivePlayerItemId(null);
      setVerifyingPlayItemId(null);
    }
  }, [isTrendingSocialModalOpen]);

  // Live Google Maps & Smart Cache Search (identical to HomeView search!)
  useEffect(() => {
    if (!isTrendingSocialModalOpen) return;
    const q = debouncedSearchQuery.trim();
    if (!q || q.length < 2) {
      setSmartCachePlaces([]);
      setIsSearchingOnline(false);
      return;
    }

    let cancelled = false;
    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      const res = await searchCambodiaPlacesWithSmartCache(
        q,
        provinceFilter === 'all' ? 'ទាំងអស់' : provinceFilter,
        'all'
      );
      if (!cancelled) {
        setSmartCachePlaces(res.results);
        setIsSearchingOnline(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isTrendingSocialModalOpen, debouncedSearchQuery, provinceFilter]);

  // Unified Home Screen Search across Foods, Drinks, Restaurants, Tourist Attractions + Smart Cache
  const homeSearchResults = useMemo(() => {
    const q = normalizeKhmerSearchText(searchQuery);
    if (!q) return null;

    const raw = performUnifiedCambodiaSearch({
      query: searchQuery,
      provinceFilter: provinceFilter === 'all' ? '' : provinceFilter,
      foods,
      restaurants,
      destinations,
      smartCachePlaces,
      currentUser,
    });

    let filteredFoods = raw.foods;
    let filteredRestaurants = raw.restaurants;
    let filteredDestinations = raw.destinations;

    if (categoryFilter === 'popular_food') {
      filteredRestaurants = [];
      filteredDestinations = [];
    } else if (categoryFilter === 'famous_restaurant') {
      filteredFoods = [];
      filteredDestinations = [];
    } else if (categoryFilter === 'tourist_attraction') {
      filteredFoods = [];
      filteredRestaurants = [];
    }

    const filteredExternal = raw.externalPlaces || [];
    const scopedTotal =
      filteredFoods.length + filteredRestaurants.length + filteredDestinations.length + filteredExternal.length;

    // If a specific category tab had 0 matches for the user's keyword (e.g., user typed "Pizza" while on "🍲 ម្ហូបខ្មែរល្បីៗ"),
    // show all matching categories from the unified Home search so relevant results are never hidden.
    if (scopedTotal === 0 && raw.totalCount > 0) {
      return raw;
    }

    return {
      foods: filteredFoods,
      restaurants: filteredRestaurants,
      destinations: filteredDestinations,
      externalPlaces: filteredExternal,
      totalCount: scopedTotal,
    };
  }, [
    searchQuery,
    provinceFilter,
    categoryFilter,
    foods,
    restaurants,
    destinations,
    smartCachePlaces,
    currentUser,
  ]);

  // Filter YouTube discovery videos using the exact same province, category, and multilingual token logic
  const filteredItems = useMemo(() => {
    const matchesProvince = (item: OnlineFoodDiscoveryItem) => {
      if (provinceFilter === 'all') return true;
      if (
        item.provinceKh === provinceFilter ||
        item.provinceEn === provinceFilter ||
        item.provinceKh === 'ទូទាំងប្រទេសកម្ពុជា'
      ) {
        return true;
      }
      const cleanSel = provinceFilter.replace(/^រាជធានី|^ខេត្ត/g, '').trim();
      const cleanItem = (item.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
      return Boolean(cleanSel && cleanItem.includes(cleanSel));
    };

    const sourcePool: OnlineFoodDiscoveryItem[] =
      platformFilter === 'saved'
        ? (currentUser?.id && currentUser.id !== 'guest'
            ? savedVideos
                .filter((rec) => rec.userId === currentUser.id)
                .map((rec) => savedVideoRecordToDiscoveryItem(rec))
            : [])
        : discoveryItems;

    const strictMatches = sourcePool.filter((item) => {
      if (platformFilter !== 'all' && platformFilter !== 'saved' && item.platform !== platformFilter) return false;
      if (categoryFilter !== 'all' && item.categorySlug !== categoryFilter) return false;
      if (!matchesProvince(item)) return false;
      if (debouncedSearchQuery.trim() && !matchesExpandedYouTubeQuery(item, debouncedSearchQuery)) return false;
      return true;
    });

    // If user typed a keyword while on a specific category tab and the matching video is in another category tab,
    // return the matching videos across categories (still strictly matching the searchQuery and provinceFilter!)
    if (strictMatches.length === 0 && debouncedSearchQuery.trim() && categoryFilter !== 'all') {
      return deduplicateSingleVideoList(
        discoveryItems.filter(
          (item) => matchesProvince(item) && matchesExpandedYouTubeQuery(item, debouncedSearchQuery)
        )
      );
    }

    if (platformFilter !== 'saved' && !debouncedSearchQuery.trim() && strictMatches.length > 1) {
      return rotateLatestVideosForScope(
        strictMatches,
        `${platformFilter}|${categoryFilter}|${provinceFilter}`,
        rotationCycle
      );
    }

    return deduplicateSingleVideoList(strictMatches);
  }, [discoveryItems, savedVideos, currentUser?.id, platformFilter, categoryFilter, provinceFilter, debouncedSearchQuery, rotationCycle]);

  useEffect(() => {
    setVisibleVideoCount(VIDEO_BATCH_SIZE);
  }, [platformFilter, categoryFilter, provinceFilter, debouncedSearchQuery]);

  const uniqueCreatorCount = useMemo(() => {
    const authors = new Set<string>();
    for (const it of filteredItems) {
      const a = (it.authorHandle || it.sourceName || '').trim().toLowerCase();
      if (a) authors.add(a);
    }
    return authors.size;
  }, [filteredItems]);

  const displayedVideos = useMemo(
    () => filteredItems.slice(0, visibleVideoCount),
    [filteredItems, visibleVideoCount]
  );

  // Pre-warm visible TikTok MP4 streams in the background so user taps play instantaneously with 0ms wait
  useEffect(() => {
    if (!isTrendingSocialModalOpen || displayedVideos.length === 0) return;
    let cancelled = false;
    prewarmTikTokStreams(displayedVideos, 8)
      .then((resolvedMap) => {
        if (cancelled || Object.keys(resolvedMap).length === 0) return;
        setResolvedDirectVideoUrls((prev) => {
          const next = { ...prev };
          for (const [id, entry] of Object.entries(resolvedMap)) {
            if (!next[id] || (!next[id].primaryUrl && entry.primaryUrl)) {
              next[id] = {
                primaryUrl: entry.primaryUrl,
                backupUrl: entry.backupUrl,
                usingBackup: false,
                failedAllDirect: false,
              };
            }
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isTrendingSocialModalOpen, displayedVideos]);

  // Stall watchdog: if a direct MP4 stream hangs at 0:00 for > 3.2s, auto-failover to backup MP4 or high-speed inline stream
  useEffect(() => {
    if (!activePlayerItemId || !isTrendingSocialModalOpen) return;
    const currentEntry = resolvedDirectVideoUrls[activePlayerItemId];
    if (currentEntry?.failedAllDirect) return;

    const timer = setTimeout(() => {
      const vidEl = activeVideoRef.current;
      if (!vidEl) return;
      if (vidEl.currentTime === 0 && vidEl.readyState < 3) {
        setResolvedDirectVideoUrls((prev) => {
          const curr = prev[activePlayerItemId];
          if (curr && !curr.usingBackup && curr.backupUrl && curr.backupUrl !== curr.primaryUrl) {
            return {
              ...prev,
              [activePlayerItemId]: { ...curr, usingBackup: true },
            };
          }
          return {
            ...prev,
            [activePlayerItemId]: {
              primaryUrl: curr?.primaryUrl || '',
              backupUrl: curr?.backupUrl,
              usingBackup: true,
              failedAllDirect: true,
            },
          };
        });
      }
    }, 3200);

    return () => clearTimeout(timer);
  }, [activePlayerItemId, isTrendingSocialModalOpen, resolvedDirectVideoUrls, playerReloadKey]);

  useEffect(() => {
    const node = loadMoreVideosRef.current;
    if (!node || visibleVideoCount >= filteredItems.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleVideoCount((prev) => Math.min(filteredItems.length, prev + VIDEO_BATCH_SIZE));
        }
      },
      { rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleVideoCount, filteredItems.length]);

  if (!isTrendingSocialModalOpen) return null;

  // 4 Main Categories + All Trending
  const categories: { id: TrendingFoodCategorySlug; labelKh: string; labelEn: string; labelZh: string; icon: string }[] = [
    { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All Trending', labelZh: '全部热门', icon: '🔥' },
    { id: 'popular_food', labelKh: 'ម្ហូបខ្មែរល្បីៗ', labelEn: 'Popular Khmer Food', labelZh: '高棉招牌名菜', icon: '🍲' },
    { id: 'famous_restaurant', labelKh: 'ភោជនីយដ្ឋានល្បីៗ', labelEn: 'Famous Restaurants', labelZh: '知名餐厅推荐', icon: '🏪' },
    { id: 'tourist_attraction', labelKh: 'តំបន់ទេសចរណ៍', labelEn: 'Tourist Attractions', labelZh: '热门旅游景点', icon: '🏛️' },
    { id: 'food_travel_vlog', labelKh: 'វីដេអូម្ហូប & ទេសចរណ៍', labelEn: 'Food & Travel Vlogs', labelZh: '美食与旅行 Vlog', icon: '🎬' },
  ];

  const provinces = [
    { id: 'all', labelKh: 'គ្រប់ខេត្ត/ក្រុង', labelEn: 'All Provinces', labelZh: '全柬省市' },
    { id: 'រាជធានីភ្នំពេញ', labelKh: 'ភ្នំពេញ', labelEn: 'Phnom Penh', labelZh: '金边市' },
    { id: 'ខេត្តសៀមរាប', labelKh: 'សៀមរាប', labelEn: 'Siem Reap', labelZh: '暹粒省' },
    { id: 'ខេត្តបាត់ដំបង', labelKh: 'បាត់ដំបង', labelEn: 'Battambang', labelZh: '马德望省' },
    { id: 'ខេត្តកំពត', labelKh: 'កំពត', labelEn: 'Kampot', labelZh: '贡布省' },
    { id: 'ខេត្តកែប', labelKh: 'កែប', labelEn: 'Kep', labelZh: '白马省' },
    { id: 'ខេត្តព្រះសីហនុ', labelKh: 'ព្រះសីហនុ', labelEn: 'Sihanoukville', labelZh: '西哈努克省' },
    { id: 'ខេត្តកំពង់ចាម', labelKh: 'កំពង់ចាម', labelEn: 'Kampong Cham', labelZh: '磅湛省' },
    { id: 'ខេត្តកំពង់ស្ពឺ', labelKh: 'កំពង់ស្ពឺ', labelEn: 'Kampong Speu', labelZh: '磅士卑省' },
  ];

  const openExternalVideoSafely = (rawUrl?: string, fallbackQuery?: string) => {
    const vid = extractYouTubeVideoId(rawUrl || '');
    const targetUrl = vid
      ? `https://www.youtube.com/watch?v=${vid}`
      : rawUrl && /^https?:\/\//i.test(rawUrl.trim())
      ? rawUrl.trim()
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(
          (fallbackQuery || 'Cambodian food travel') + ' Cambodia'
        )}`;
    try {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      try {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } catch {
        showToast(
          tr(
            language,
            'មិនអាចបើកតំណវីដេអូ YouTube បានទេ សូមព្យាយាមម្តងទៀត',
            'Could not open YouTube video, please try again',
            '无法打开 YouTube 视频，请重试'
          ),
          'warning'
        );
      }
    }
  };

  /**
   * Verify availability & embeddability before playing inline:
   * - Toggle off if already open
   * - Check internet connectivity before mounting YouTube Embed Player so Android WebView
   *   never renders the raw `Web page not available / net::ERR_INTERNET_DISCONNECTED` screen
   * - If embedding is disabled, show the clear "Watch on YouTube" fallback UI
   */

  /**
   * Opens the creator's original TikTok, Facebook, or YouTube account/video URL
   * when the user clicks the [TikTok], [Facebook], or [YouTube] button or creator account link.
   */
  const renderPlatformVectorIcon = (platform: 'tiktok' | 'facebook' | 'youtube', cls = 'w-3 h-3') => {
    if (platform === 'tiktok') {
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    }
    if (platform === 'facebook') {
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V6.65c0-1.05.29-1.73 1.76-1.73Z" />
        </svg>
      );
    }
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.56 31.56 0 0 0 0 12a31.56 31.56 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.56 31.56 0 0 0 24 12a31.56 31.56 0 0 0-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z" />
      </svg>
    );
  };

  const renderCategoryVectorIcon = (id: TrendingFoodCategorySlug) => {
    switch (id) {
      case 'all':
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2c1.5 3.5 4 5.5 4 9a4 4 0 1 1-8 0c0-2 1-3.5 2-5-.5 2 1 3 2 3 0-2.5 0-5 0-7z" />
            <path d="M8.5 14.5A6.5 6.5 0 0 0 18 11c0-3.5-2.5-6-4-8.5" />
          </svg>
        );
      case 'popular_food':
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 11h16a1 1 0 0 1 1 1v.5a7.5 7.5 0 0 1-15 0V12a1 1 0 0 1 1-1Z" />
            <path d="M7 20h10" />
            <path d="M9 7c0-1.5 1-2.5 1-4" />
            <path d="M14 7c0-1.5 1-2.5 1-4" />
          </svg>
        );
      case 'famous_restaurant':
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l1.8-5h14.4L21 9" />
            <path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" />
            <path d="M5 12v8h14v-8" />
            <path d="M10 15h4v5h-4z" />
          </svg>
        );
      case 'tourist_attraction':
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l2.2 4.5h-4.4L12 3z" />
            <path d="M6 10l1.5-3.5L9 10H6zm9 0l1.5-3.5L18 10h-3z" />
            <path d="M4 10h16v4H4z" />
            <path d="M2 14h20v6H2z" />
            <path d="M10 14v6m4-6v6" />
          </svg>
        );
      case 'food_travel_vlog':
      default:
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <polygon points="10 9 15 12 10 15 10 9" fill="currentColor" />
          </svg>
        );
    }
  };

  const openOriginalSocialAccount = (item: OnlineFoodDiscoveryItem, preferChannelUrl = false) => {
    const targetUrl =
      preferChannelUrl && item.platform === 'youtube' && item.originalAccountUrl
        ? item.originalAccountUrl
        : resolveOriginalSocialAccountUrl(item);
    const cap = typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
    if (cap?.isNativePlatform?.() && cap?.Plugins?.NativeAbaLauncher?.openExternalUrl) {
      cap.Plugins.NativeAbaLauncher.openExternalUrl({ url: targetUrl }).catch(() => {
        openExternalVideoSafely(targetUrl, item.titleEn || item.titleKh);
      });
      return;
    }
    openExternalVideoSafely(targetUrl, item.titleEn || item.titleKh);
  };

  const handlePlayOrOpenItem = async (item: OnlineFoodDiscoveryItem) => {
    if (activePlayerItemId === item.id) {
      setActivePlayerItemId(null);
      setIsVideoBuffering(false);
      return;
    }

    setEmbedFallbackItemIds((prev) => {
      if (!prev[item.id]) return prev;
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });

    setIsVideoMuted(false);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOffline(true);
      setIsVideoBuffering(false);
      setActivePlayerItemId(item.id);
      return;
    }

    setIsOffline(false);
    setIsVideoBuffering(true);

    if (item.platform === 'tiktok') {
      const syncStream = getCachedTikTokStreamUrl(item);
      if (syncStream?.primaryUrl) {
        setResolvedDirectVideoUrls((prev) => ({
          ...prev,
          [item.id]: {
            primaryUrl: syncStream.primaryUrl,
            backupUrl: syncStream.backupUrl,
            usingBackup: false,
            failedAllDirect: false,
          },
        }));
        setVerifyingPlayItemId(null);
        // Mount <video> synchronously inside user gesture so Android & iOS grant unmuted autoplay!
        setActivePlayerItemId(item.id);
        return;
      }

      // Mount player synchronously to preserve mobile WebView user-activation token, while resolving stream in parallel
      setActivePlayerItemId(item.id);
      setVerifyingPlayItemId(item.id);

      const streamRes = await Promise.race([
        resolvePlayableTikTokStreamUrl(item).catch(() => ({ primaryUrl: null, backupUrl: null })),
        new Promise<{ primaryUrl: null; backupUrl: null }>((resolve) =>
          setTimeout(() => resolve({ primaryUrl: null, backupUrl: null }), 2200)
        ),
      ]);

      setVerifyingPlayItemId((curr) => (curr === item.id ? null : curr));

      if (streamRes?.primaryUrl) {
        setResolvedDirectVideoUrls((prev) => ({
          ...prev,
          [item.id]: {
            primaryUrl: streamRes.primaryUrl!,
            backupUrl: streamRes.backupUrl || undefined,
            usingBackup: false,
            failedAllDirect: false,
          },
        }));
      }
      return;
    }

    // For Facebook & YouTube: mount inline player synchronously (0ms delay, preserving user gesture autoplay)
    setVerifyingPlayItemId(null);
    setActivePlayerItemId(item.id);
  };

  /** Retry loading and playing the inline video player once internet is restored */
  const handleRetryVideoPlayback = async (item: OnlineFoodDiscoveryItem) => {
    setIsRetryingConnection(true);
    const [reachable, streamRes] = await Promise.all([
      checkYouTubeConnectivity(),
      item.platform === 'tiktok'
        ? resolvePlayableTikTokStreamUrl(item).catch(() => ({ primaryUrl: null, backupUrl: null }))
        : Promise.resolve({ primaryUrl: null, backupUrl: null }),
    ]);
    setIsRetryingConnection(false);

    if (streamRes?.primaryUrl) {
      setResolvedDirectVideoUrls((prev) => ({
        ...prev,
        [item.id]: {
          primaryUrl: streamRes.primaryUrl!,
          backupUrl: streamRes.backupUrl || undefined,
          usingBackup: false,
          failedAllDirect: false,
        },
      }));
    }

    if (reachable || streamRes?.primaryUrl) {
      setIsOffline(false);
      setEmbedFallbackItemIds((prev) => ({ ...prev, [item.id]: false }));
      setPlayerReloadKey((prev) => prev + 1);
      setActivePlayerItemId(item.id);
    } else {
      setIsOffline(true);
      showToast(
        tr(
          language,
          'សូមភ្ជាប់អ៊ីនធឺណិត ដើម្បីមើលវីដេអូនេះ',
          'Please connect to the internet to watch this video',
          '请连接互联网以观看此视频'
        ),
        'warning'
      );
    }
  };

  const handleOpenRecipeDish = (foodId?: string) => {
    if (!foodId) return;
    const f = foods.find((x) => x.id === foodId);
    if (f) setSelectedFood(f);
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    } else {
      showToast(tr(language, 'មិនមានលេខទូរស័ព្ទសម្រាប់ហាងនេះទេ', 'No phone number available', '该店铺暂无联系电话'), 'info');
    }
  };

  const handleMap = (item: OnlineFoodDiscoveryItem) => {
    const t = item.trendingItem;
    if (t) {
      openTrendingFoodGoogleExternal(t, 'maps');
      return;
    }
    if (item.sourceUrl && item.sourceUrl.startsWith('http')) {
      openExternalUrlNativeSafe(item.sourceUrl);
      return;
    }
    showToast(
      tr(
        language,
        '📍 ទីតាំងនេះត្រូវបានដាក់សម្គាល់សម្រាប់ Admin ផ្ទៀងផ្ទាត់ — មិនបង្ហាញទីតាំងស្មានឡើយ',
        '📍 Location flagged for Admin review — unverified map pin hidden',
        '📍 该位置已标记待管理员核实，暂不显示未验证的定位'
      ),
      'warning'
    );
  };

  const handleShare = (item: OnlineFoodDiscoveryItem) => {
    const t = item.trendingItem;
    const mapLink = (t ? getTrendingFoodGoogleExternalUrl(t, 'maps') : '') || item.sourceUrl;
    shareRichContent(
      {
        title: isKm ? item.titleKh : item.titleEn,
        nameKh: item.titleKh,
        nameEn: item.titleEn,
        description: isKm ? item.descriptionKh : item.descriptionEn,
        location: isKm ? item.provinceKh : item.provinceEn,
        phone: t?.phone,
        photoUrl: item.thumbnailUrl,
        mapUrl: mapLink,
        itemType: 'trending',
        itemId: item.id,
        isKm,
      },
      showToast
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setPlatformFilter('all');
    setCategoryFilter('all');
    setProvinceFilter('all');
  };

  const formattedLastChecked = lastCheckedAt
    ? new Date(lastCheckedAt).toLocaleString(language === 'km' ? 'km-KH' : language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const totalCombinedMatches =
    filteredItems.length + (homeSearchResults ? homeSearchResults.totalCount : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200 overscroll-none"
      onClick={() => setIsTrendingSocialModalOpen(false)}
    >
      <div
        className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="kft-khmer-modal-header px-4 sm:px-5 pt-3 pb-3.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800/80 border border-emerald-500/30 flex items-center justify-center text-emerald-100 shadow-xs shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-moul text-xs sm:text-sm text-white leading-[1.7] py-0.5 break-words">
                  {tr(language, 'វីដេអូម្ហូប និងទេសចរណ៍កម្ពុជា', 'Cambodia Food & Travel Videos', '柬埔寨美食与旅行视频')}
                </h3>
              </div>
              <p className="text-[11px] text-pink-200 font-khmer leading-[1.55] break-words">
                {tr(
                  language,
                  `បានធ្វើបច្ចុប្បន្នភាព៖ ${formattedLastChecked}`,
                  `Updated: ${formattedLastChecked}`,
                  `更新于：${formattedLastChecked}`
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => loadFeed(true)}
              disabled={isRefreshing}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer disabled:opacity-50"
              title={tr(language, 'ផ្ទុកឡើងវិញឥឡូវនេះ', 'Refresh Now', '立即刷新')}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsTrendingSocialModalOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 text-pink-200 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input Bar (Multilingual km / en / zh — Reuses Home Screen Search Logic) */}
        <div className="p-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកវីដេអូ TikTok, Facebook និង YouTube ម្ហូបខ្មែរ...',
                'Search TikTok, Facebook & YouTube food or travel videos...',
                '搜索 TikTok、Facebook 与 YouTube 高棉美食与景点视频...'
              )}
              className="w-full pl-9 pr-8 py-2 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 font-khmer shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
                title={tr(language, 'សម្អាតការស្វែងរក', 'Clear search', '清除搜索')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchQuery.trim().length >= 2 && (
            <div className="flex justify-end pt-1.5">
              <button
                type="button"
                onClick={() => {
                  const q = searchQuery.trim();
                  setIsTrendingSocialModalOpen(false);
                  openAiAssistantWithQuery(q, setIsWhatToEatModalOpen);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-800 hover:bg-emerald-700 text-amber-300 text-[11px] font-bold shadow-2xs transition active:scale-95 cursor-pointer font-khmer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{getAskAiButtonLabel(language)}</span>
              </button>
            </div>
          )}
        </div>

        {/* Platform Filter Bar: All / TikTok / Facebook / YouTube */}
        <div className="px-2.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-1.5 shrink-0 font-khmer text-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'all' as const, label: tr(language, 'ទាំងអស់', 'All Platforms', '全部平台'), activeCls: 'bg-emerald-600 text-white' },
            { id: 'tiktok' as const, label: 'TikTok', activeCls: 'bg-black text-white border border-white/30' },
            { id: 'facebook' as const, label: 'Facebook', activeCls: 'bg-[#1877F2] text-white' },
            { id: 'youtube' as const, label: 'YouTube', activeCls: 'bg-[#FF0000] text-white' },
          ].map((plat) => (
            <button
              key={plat.id}
              type="button"
              onClick={() => setPlatformFilter(plat.id)}
              className={`px-3 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition text-xs flex items-center gap-1.5 cursor-pointer ${
                platformFilter === plat.id
                  ? `${plat.activeCls} shadow-xs`
                  : 'bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              {plat.id === 'tiktok' && (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              )}
              {plat.id === 'facebook' && (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V6.65c0-1.05.29-1.73 1.76-1.73Z" />
                </svg>
              )}
              {plat.id === 'youtube' && (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.56 31.56 0 0 0 0 12a31.56 31.56 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.56 31.56 0 0 0 24 12a31.56 31.56 0 0 0-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z" />
                </svg>
              )}
              <span>{plat.label}</span>
            </button>
          ))}
        </div>

        {/* Category Tabs: 4 Categories + All Trending */}
        <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-1.5 shrink-0 font-khmer text-xs overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-xs flex items-center gap-1 cursor-pointer ${
                categoryFilter === c.id
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              {renderCategoryVectorIcon(c.id)}
              <span>{tr(language, c.labelKh, c.labelEn, c.labelZh)}</span>
            </button>
          ))}
        </div>

        {/* Location Selector Bar */}
        <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-khmer text-xs shrink-0">
          <span className="text-[10px] text-slate-400 font-bold shrink-0">📍 {tr(language, 'ទីតាំង៖', 'City:', '城市：')}</span>
          {provinces.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvinceFilter(p.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition cursor-pointer ${
                provinceFilter === p.id
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tr(language, p.labelKh, p.labelEn, p.labelZh)}
            </button>
          ))}
        </div>

        {/* Multilingual Food Review Search Keywords Bar + Active Channel/Video Stats */}
        <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-khmer text-xs shrink-0">
          <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold whitespace-nowrap shrink-0">
            🎬 {filteredItems.length} {tr(language, 'វីដេអូ', 'Videos', '视频')} • {uniqueCreatorCount}{' '}
            {tr(language, 'ឆានែល', 'Channels', '频道')}
          </span>
          {CAMBODIA_FOOD_YOUTUBE_SEARCH_KEYWORDS.map((kw) => {
            const isSelected = searchQuery.trim().toLowerCase() === kw.query.toLowerCase();
            return (
              <button
                key={kw.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSearchQuery('');
                  } else {
                    setSearchQuery(kw.query);
                  }
                }}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer border ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-400 shadow-2xs'
                    : 'bg-slate-800/90 text-slate-300 hover:text-white border-slate-700'
                }`}
              >
                🔍 {tr(language, kw.labelKh, kw.labelEn, kw.labelZh)}
              </button>
            );
          })}
        </div>

        {/* Results & Video List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-[calc(var(--kft-safe-bottom,0px)+1.5rem)] space-y-4 no-scrollbar font-khmer text-xs [-webkit-overflow-scrolling:touch]">
          {/* Loading Skeleton */}
          {isRefreshing && discoveryItems.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((sk) => (
                <div key={sk} className="rounded-3xl bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 animate-pulse space-y-3">
                  <div className="aspect-16/9 w-full bg-slate-200 dark:bg-slate-700 rounded-2xl" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : hasError && discoveryItems.length === 0 ? (
            /* Error State with Retry Button */
            <div className="py-12 text-center text-slate-400 space-y-3">
              <AlertCircle className="w-12 h-12 mx-auto text-rose-500" />
              <p className="text-sm font-bold text-white">
                {tr(
                  language,
                  'មិនអាចទាញយកវីដេអូ YouTube បានទេ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត',
                  'Failed to load YouTube feed. Please check your connection.',
                  '无法加载 YouTube 视频，请检查网络连接。'
                )}
              </p>
              <button
                type="button"
                onClick={() => loadFeed(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{tr(language, 'សាកល្បងម្ដងទៀត', 'Retry', '重试')}</span>
              </button>
            </div>
          ) : isSearchingOnline && totalCombinedMatches === 0 ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              <span>
                {tr(
                  language,
                  'កំពុងស្វែងរកមុខម្ហូប ហាងអាហារ តំបន់ទេសចរណ៍ និងវីដេអូ...',
                  'Searching dishes, restaurants, attractions & videos...',
                  '正在搜索美食、餐厅、景点与视频...'
                )}
              </span>
            </div>
          ) : totalCombinedMatches === 0 ? (
            /* Empty State with Reset Filters Button */
            <div className="py-12 text-center text-slate-400 space-y-3">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-500" />
              <p className="text-sm font-bold text-slate-300">
                {tr(
                  language,
                  debouncedSearchQuery.trim()
                    ? `រកមិនឃើញលទ្ធផលត្រូវនឹង "${debouncedSearchQuery.trim()}" ទេ`
                    : 'រកមិនឃើញវីដេអូ YouTube ត្រូវនឹងការស្វែងរកនេះទេ',
                  debouncedSearchQuery.trim()
                    ? `No results found for "${debouncedSearchQuery.trim()}"`
                    : 'No YouTube videos matching this filter',
                  debouncedSearchQuery.trim()
                    ? `未找到与“${debouncedSearchQuery.trim()}”相关的结果`
                    : '未找到符合筛选条件的 YouTube 视频'
                )}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs cursor-pointer border border-slate-700 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr(language, 'សម្អាតតម្រងទាំងអស់', 'Reset Filters', '重置所有筛选')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openExternalVideoSafely(undefined, debouncedSearchQuery.trim() || 'Cambodian food travel')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>
                    {tr(
                      language,
                      debouncedSearchQuery.trim() ? `ស្វែងរក "${debouncedSearchQuery.trim()}" លើ YouTube` : 'ស្វែងរកលើ YouTube',
                      debouncedSearchQuery.trim() ? `Search "${debouncedSearchQuery.trim()}" on YouTube` : 'Search on YouTube',
                      debouncedSearchQuery.trim() ? `在 YouTube 搜索 "${debouncedSearchQuery.trim()}"` : '在 YouTube 搜索'
                    )}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Home Screen Search Results (Foods, Drinks, Restaurants, Tourist Attractions) */}
              {debouncedSearchQuery.trim() && homeSearchResults && homeSearchResults.totalCount > 0 && (
                <div className="space-y-2 rounded-2xl bg-slate-800/60 border border-slate-700/80 p-3">
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <span className="font-bold text-emerald-300 text-[11px]">
                      {tr(
                        language,
                        `🔍 លទ្ធផលស្វែងរកម្ហូប ហាង និងទេសចរណ៍ (${homeSearchResults.totalCount})`,
                        `🔍 Matching Dishes, Restaurants & Places (${homeSearchResults.totalCount})`,
                        `🔍 匹配的美食、餐厅与景点 (${homeSearchResults.totalCount})`
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => openExternalVideoSafely(undefined, debouncedSearchQuery.trim())}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{tr(language, 'មើលវីដេអូលើ YouTube', 'Watch on YouTube', '在 YouTube 观看')}</span>
                    </button>
                  </div>

                  {/* Matched Foods & Drinks */}
                  {homeSearchResults.foods.map((food) => {
                    const locF = getLocalizedFood(food, language);
                    return (
                      <div
                        key={`modal-food-${food.id}`}
                        onClick={() => setSelectedFood(food)}
                        className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-emerald-950/50 border border-slate-700/80 flex items-center justify-between gap-3 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 240, food.id)}
                            onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
                            alt={locF.name}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-700"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold shrink-0">
                                🍲 {tr(language, 'មុខម្ហូប', 'Dish', '菜品')}
                              </span>
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-emerald-400">
                                {locF.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {locF.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                      </div>
                    );
                  })}

                  {/* Matched Restaurants & Cafes */}
                  {homeSearchResults.restaurants.map((rest) => {
                    const locR = getLocalizedRestaurant(rest, language);
                    return (
                      <div
                        key={`modal-rest-${rest.id}`}
                        onClick={() => setSelectedRestaurant(rest)}
                        className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-emerald-950/50 border border-slate-700/80 flex items-center justify-between gap-3 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={rest.photoUrl}
                            alt={locR.name}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-700"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800/60 text-[10px] font-bold shrink-0">
                                🏪 {tr(language, 'ហាងអាហារ', 'Restaurant', '餐厅')}
                              </span>
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-emerald-400">
                                {locR.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              📍 {locR.address} {rest.phone ? `• 📞 ${rest.phone}` : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                      </div>
                    );
                  })}

                  {/* Matched Tourist Attractions */}
                  {homeSearchResults.destinations.map((dest) => {
                    const locD = getLocalizedDestination(dest, language);
                    return (
                      <div
                        key={`modal-dest-${dest.id}`}
                        onClick={() => setSelectedDestination(dest)}
                        className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-emerald-950/50 border border-slate-700/80 flex items-center justify-between gap-3 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={dest.photoUrl}
                            alt={locD.name}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-700"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800/60 text-[10px] font-bold shrink-0">
                                🏛️ {tr(language, 'ទេសចរណ៍', 'Place', '景点')}
                              </span>
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-emerald-400">
                                {locD.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              📍 {locD.province} ({locD.category})
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                      </div>
                    );
                  })}

                  {/* External Google Maps Places -> Tap opens directly in Google Maps */}
                  {(homeSearchResults.externalPlaces || []).map((place) => {
                    const extName =
                      language === 'km'
                        ? place.nameKh || place.name
                        : place.nameEn || place.name;
                    const extAddress =
                      language === 'km'
                        ? place.addressKh || place.address || place.provinceKh
                        : place.address || place.addressKh || place.provinceEn;
                    return (
                      <div
                        key={`modal-ext-${place.placeId}`}
                        onClick={() => openExternalPlaceInGoogleMaps(place)}
                        className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-blue-950/60 border border-blue-700/60 flex items-center justify-between gap-3 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {place.hasRealGooglePhoto && place.photoUrl ? (
                            <img loading="lazy" decoding="async"
                              src={place.photoUrl}
                              alt={extName}
                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-blue-700"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-teal-600 text-white flex flex-col items-center justify-center shrink-0">
                              <Navigation className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-700/70 text-[10px] font-bold shrink-0">
                                🗺️ {tr(language, 'Google Maps', 'Google Maps', '谷歌地图')}
                              </span>
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-blue-400">
                                {extName}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              📍 {extAddress}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-blue-400 shrink-0 group-hover:translate-x-0.5 transition" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Matching YouTube Videos */}
              {debouncedSearchQuery.trim() && filteredItems.length > 0 && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-200 text-[11px]">
                  <span className="font-bold truncate">
                    {tr(
                      language,
                      `🎬 វីដេអូ YouTube ត្រូវនឹង "${debouncedSearchQuery.trim()}" (${filteredItems.length})`,
                      `🎬 YouTube videos matching "${debouncedSearchQuery.trim()}" (${filteredItems.length})`,
                      `🎬 匹配 "${debouncedSearchQuery.trim()}" 的 YouTube 视频 (${filteredItems.length})`
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => openExternalVideoSafely(undefined, debouncedSearchQuery.trim())}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{tr(language, 'មើលបន្ថែមលើ YouTube', 'More on YouTube', '在 YouTube 查看更多')}</span>
                  </button>
                </div>
              )}

              {displayedVideos.map((item) => {
                const displayTitle =
                  language === 'km'
                    ? item.titleKh
                    : language === 'zh'
                    ? item.titleZh || translateDynamicTextToZh(item.titleEn) || item.titleEn
                    : item.titleEn;
                const displayDesc =
                  language === 'km'
                    ? item.descriptionKh
                    : language === 'zh'
                    ? item.descriptionZh || translateDynamicTextToZh(item.descriptionEn) || item.descriptionEn
                    : item.descriptionEn;
                const displayProv = translateProvince(item.provinceKh || item.provinceEn, language);

                const playerInfo = extractEmbedPlayerInfo(item);
                const isPlayingInline = activePlayerItemId === item.id;
                const isEmbedFallback = Boolean(embedFallbackItemIds[item.id] || !playerInfo.canInlineEmbed);
                const isVerifyingThis = verifyingPlayItemId === item.id;
                const directEntry = resolvedDirectVideoUrls[item.id];
                const activeDirectVideoUrl =
                  directEntry && !directEntry.failedAllDirect
                    ? directEntry.usingBackup && directEntry.backupUrl
                      ? directEntry.backupUrl
                      : directEntry.primaryUrl
                    : !directEntry?.failedAllDirect
                    ? playerInfo.directVideoUrl || null
                    : null;

                return (
                  <div
                    key={item.id}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}
                    className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-3 transition hover:shadow-md"
                  >
                    {/* Inline YouTube Embed Player OR Offline Friendly Notice OR Fallback OR High-Res Thumbnail */}
                    {isPlayingInline ? (
                      isOffline ? (
                        <div className="relative aspect-16/9 w-full bg-slate-950 overflow-hidden flex flex-col items-center justify-center p-4 text-center">
                          {/* Keep original video thumbnail visible when offline */}
                          <img loading="lazy" decoding="async"
                            src={item.thumbnailUrl}
                            alt={displayTitle}
                            className="absolute inset-0 w-full h-full object-cover opacity-45 pointer-events-none"
                            onError={(e) => {
                              const fallbackFood = item.matchedFoodId
                                ? foods.find((x) => x.id === item.matchedFoodId)
                                : undefined;
                              const fallbackSrc = fallbackFood
                                ? resolveFoodPhotoUrl(fallbackFood.photoUrl, fallbackFood.id)
                                : '/welcome/hero-bg.webp';
                              if (e.currentTarget.src !== window.location.origin + fallbackSrc) {
                                e.currentTarget.src = fallbackSrc;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/65 to-black/55 pointer-events-none" />

                          {/* Top-left YouTube & Verification attribution badges */}
                          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black shadow-xs bg-red-600 text-white flex items-center gap-1">
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>YouTube</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-black/70 text-emerald-200 text-[9px] font-bold flex items-center gap-1 border border-white/15">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span>{tr(language, item.verificationBadgeKh, item.verificationBadgeEn, item.verificationBadgeZh)}</span>
                            </span>
                          </div>

                          {/* Top-right Close button */}
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                            <button
                              type="button"
                              onClick={() => setActivePlayerItemId(null)}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-md cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>{tr(language, 'បិទ', 'Close', '关闭')}</span>
                            </button>
                          </div>

                          {/* Clean, professional Khmer offline message & Retry button */}
                          <div className="relative z-10 flex flex-col items-center max-w-xs space-y-2.5 px-3 py-2.5 rounded-2xl bg-slate-900/80 border border-white/15 shadow-xl">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                              <WifiOff className="w-5 h-5" />
                            </div>
                            <p className="text-xs sm:text-sm font-extrabold text-white leading-relaxed">
                              {tr(
                                language,
                                'សូមភ្ជាប់អ៊ីនធឺណិត ដើម្បីមើលវីដេអូនេះ',
                                'Please connect to the internet to watch this video',
                                '请连接互联网以观看此视频'
                              )}
                            </p>
                            <button
                              type="button"
                              disabled={isRetryingConnection}
                              onClick={() => handleRetryVideoPlayback(item)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg border border-emerald-400/40 cursor-pointer transition"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRetryingConnection ? 'animate-spin' : ''}`} />
                              <span>{tr(language, 'សាកល្បងម្ដងទៀត', 'Retry', '重试')}</span>
                            </button>
                          </div>

                          {/* Keep video title & source attribution visible at bottom */}
                          <div className="absolute bottom-2 left-3 right-3 z-10 text-left pointer-events-none">
                            <p className="text-[10px] text-amber-200 font-bold truncate drop-shadow">
                              📡 {item.sourceName} • 📍 {displayProv}
                            </p>
                          </div>
                        </div>
                      ) : isEmbedFallback || !playerInfo.embedUrl ? (
                        <div className="relative aspect-16/9 w-full bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-2.5">
                          <img loading="lazy" decoding="async"
                            src={item.thumbnailUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                          />
                          <div className="relative z-10 flex flex-col items-center max-w-xs space-y-2">
                            <AlertCircle className="w-8 h-8 text-amber-400" />
                            <p className="text-xs font-bold text-white leading-snug">
                              {tr(
                                language,
                                'ម្ចាស់វីដេអូនេះបានបិទការចាក់ផ្ទាល់ក្នុងកម្មវិធី ឬត្រូវការបើកក្នុងកម្មវិធី YouTube ផ្ទាល់។',
                                'This video restricts embedded playback. Tap below to watch it directly on YouTube.',
                                '该视频限制内嵌播放，请点击下方按钮直接在 YouTube 中观看。'
                              )}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => openOriginalSocialAccount(item)}
                                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg cursor-pointer"
                              >
                                {renderPlatformVectorIcon(item.platform, 'w-3.5 h-3.5')}
                                <span>
                                  {item.platform === 'tiktok'
                                    ? tr(language, 'មើលលើ TikTok', 'Watch on TikTok', '在 TikTok 上观看')
                                    : item.platform === 'facebook'
                                    ? tr(language, 'មើលលើ Facebook', 'Watch on Facebook', '在 Facebook 上观看')
                                    : tr(language, 'មើលលើ YouTube', 'Watch on YouTube', '在 YouTube 上观看')}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReplaceUnavailableVideo(item, true)}
                                className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold border border-slate-600 cursor-pointer"
                              >
                                {tr(language, 'ប្តូរវីដេអូផ្សេង', 'Skip & Replace', '更换其他视频')}
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActivePlayerItemId(null)}
                            className="absolute top-2 right-2 z-10 px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>{tr(language, 'បិទ', 'Close', '关闭')}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="relative aspect-16/9 w-full bg-black overflow-hidden shadow-inner">
                          {activeDirectVideoUrl ? (
                            <video
                              ref={activeVideoRef}
                              key={`${item.id}-${activeDirectVideoUrl}-${playerReloadKey}`}
                              src={activeDirectVideoUrl}
                              poster={item.thumbnailUrl}
                              controls
                              autoPlay
                              playsInline
                              muted={isVideoMuted}
                              preload="auto"
                              // @ts-expect-error referrerPolicy is supported on HTMLVideoElement in Chromium/WebKit
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain bg-black"
                              onLoadStart={() => setIsVideoBuffering(true)}
                              onLoadedMetadata={(e) => {
                                const v = e.currentTarget;
                                const playPromise = v.play();
                                if (playPromise && typeof playPromise.catch === 'function') {
                                  playPromise.catch(() => {
                                    // If mobile OS blocks unmuted autoplay, fallback to muted autoplay immediately so it never freezes at 0:00
                                    v.muted = true;
                                    setIsVideoMuted(true);
                                    v.play().catch(() => {});
                                  });
                                }
                              }}
                              onCanPlay={() => setIsVideoBuffering(false)}
                              onPlaying={() => setIsVideoBuffering(false)}
                              onTimeUpdate={(e) => {
                                if (e.currentTarget.currentTime > 0 && isVideoBuffering) {
                                  setIsVideoBuffering(false);
                                }
                              }}
                              onWaiting={() => setIsVideoBuffering(true)}
                              onStalled={() => {
                                const v = activeVideoRef.current;
                                if (v && v.currentTime === 0) {
                                  setResolvedDirectVideoUrls((prev) => {
                                    const curr = prev[item.id];
                                    if (curr && !curr.usingBackup && curr.backupUrl && curr.backupUrl !== curr.primaryUrl) {
                                      return { ...prev, [item.id]: { ...curr, usingBackup: true } };
                                    }
                                    return {
                                      ...prev,
                                      [item.id]: {
                                        primaryUrl: curr?.primaryUrl || activeDirectVideoUrl,
                                        backupUrl: curr?.backupUrl,
                                        usingBackup: true,
                                        failedAllDirect: true,
                                      },
                                    };
                                  });
                                }
                              }}
                              onError={() => {
                                if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                                  setIsOffline(true);
                                  setIsVideoBuffering(false);
                                  return;
                                }
                                setResolvedDirectVideoUrls((prev) => {
                                  const curr = prev[item.id];
                                  if (
                                    curr &&
                                    !curr.usingBackup &&
                                    curr.backupUrl &&
                                    curr.backupUrl !== curr.primaryUrl
                                  ) {
                                    return {
                                      ...prev,
                                      [item.id]: { ...curr, usingBackup: true },
                                    };
                                  }
                                  return {
                                    ...prev,
                                    [item.id]: {
                                      primaryUrl: curr?.primaryUrl || activeDirectVideoUrl,
                                      backupUrl: curr?.backupUrl,
                                      usingBackup: true,
                                      failedAllDirect: true,
                                    },
                                  };
                                });
                              }}
                            />
                          ) : (
                            <iframe
                              key={`${item.id}-${playerInfo.embedUrl}-${playerReloadKey}`}
                              ref={activeIframeRef}
                              src={playerInfo.embedUrl || ''}
                              title={displayTitle}
                              className="w-full h-full border-0"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                              allowFullScreen
                              onLoad={(e) => {
                                setIsVideoBuffering(false);
                                try {
                                  const win = e.currentTarget.contentWindow;
                                  win?.postMessage(JSON.stringify({ event: 'listening', id: item.id }), '*');
                                  win?.postMessage(
                                    JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
                                    '*'
                                  );
                                } catch {
                                  // ignore cross-origin postMessage errors
                                }
                              }}
                              onError={() => {
                                setIsVideoBuffering(false);
                                if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                                  setIsOffline(true);
                                  return;
                                }
                                handleReplaceUnavailableVideo(item, false);
                              }}
                            />
                          )}

                          {/* Non-blocking buffering indicator while initial video frames load */}
                          {(isVideoBuffering || isVerifyingThis) && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/25 z-10">
                              <div className="px-3 py-1.5 rounded-full bg-black/75 border border-white/20 text-white text-[11px] font-bold flex items-center gap-2 shadow-lg">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                <span>{tr(language, 'កំពុងផ្ទុកវីដេអូ...', 'Loading video...', '正在加载视频...')}</span>
                              </div>
                            </div>
                          )}

                          {/* Tap-to-unmute pill if mobile OS required muted autoplay */}
                          {activeDirectVideoUrl && isVideoMuted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeVideoRef.current) {
                                  activeVideoRef.current.muted = false;
                                  activeVideoRef.current.volume = 1;
                                  activeVideoRef.current.play().catch(() => {});
                                }
                                setIsVideoMuted(false);
                              }}
                              className="absolute bottom-12 left-3 z-20 px-3 py-1.5 rounded-full bg-emerald-600/95 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-lg border border-white/30 cursor-pointer"
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>{tr(language, 'ចុចបើកសំឡេង', 'Tap to Unmute', '点击开启声音')}</span>
                            </button>
                          )}
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openOriginalSocialAccount(item);
                              }}
                              title={
                                item.platform === 'tiktok'
                                  ? tr(language, 'បើកគណនី TikTok ដើម', 'Open Original TikTok Account', '打开原 TikTok 账号')
                                  : item.platform === 'facebook'
                                  ? tr(language, 'បើកគណនី Facebook ដើម', 'Open Original Facebook Account', '打开原 Facebook 账号')
                                  : tr(language, 'បើកគណនី YouTube ដើម', 'Open Original YouTube Channel', '打开原 YouTube 频道')
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black text-white flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition ${
                                item.platform === 'tiktok'
                                  ? 'bg-black/90 hover:bg-black border border-white/40'
                                  : item.platform === 'facebook'
                                  ? 'bg-[#1877F2] hover:bg-blue-600 border border-white/30'
                                  : 'bg-red-600 hover:bg-red-700 border border-white/30'
                              }`}
                            >
                              {renderPlatformVectorIcon(item.platform, 'w-3 h-3')}
                              <span>{item.platform === 'tiktok' ? 'TikTok' : item.platform === 'facebook' ? 'Facebook' : 'YouTube'}</span>
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-90" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePlayerItemId(null)}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-md cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>{tr(language, 'បិទ', 'Close', '关闭')}</span>
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div
                        onClick={() => handlePlayOrOpenItem(item)}
                        className="group relative aspect-16/9 w-full overflow-hidden bg-slate-900 cursor-pointer"
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={displayTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                          decoding="async"
                          onLoad={(e) => {
                            if (
                              item.platform === 'youtube' &&
                              !isOffline &&
                              (typeof navigator === 'undefined' || navigator.onLine !== false) &&
                              e.currentTarget.naturalWidth > 0 &&
                              e.currentTarget.naturalWidth <= 120
                            ) {
                              handleReplaceUnavailableVideo(item, false);
                            }
                          }}
                          onError={(e) => {
                            if (
                              item.platform !== 'youtube' ||
                              isOffline ||
                              (typeof navigator !== 'undefined' && navigator.onLine === false)
                            ) {
                              const fallbackFood = item.matchedFoodId
                                ? foods.find((x) => x.id === item.matchedFoodId)
                                : undefined;
                              const fallbackSrc = fallbackFood
                                ? resolveFoodPhotoUrl(fallbackFood.photoUrl, fallbackFood.photoUpdatedAt, 640, fallbackFood.id)
                                : '/foods/food-1.jpg';
                              if (!e.currentTarget.src.endsWith(fallbackSrc)) {
                                e.currentTarget.src = fallbackSrc;
                              }
                              return;
                            }
                            handleReplaceUnavailableVideo(item, false);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                        {/* Platform & Verification Badge (Click Platform Badge to Open Original Account) */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openOriginalSocialAccount(item);
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black shadow-xs text-white flex items-center gap-1 cursor-pointer active:scale-95 transition ${
                              item.platform === 'tiktok'
                                ? 'bg-black hover:bg-slate-900 border border-white/40'
                                : item.platform === 'facebook'
                                ? 'bg-[#1877F2] hover:bg-blue-600'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {renderPlatformVectorIcon(item.platform, 'w-3 h-3')}
                            <span>{item.platform === 'tiktok' ? 'TikTok' : item.platform === 'facebook' ? 'Facebook' : 'YouTube'}</span>
                          </button>
                          <span className="px-2 py-0.5 rounded-full bg-black/70 text-emerald-200 text-[9px] font-bold flex items-center gap-1 border border-white/15">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{tr(language, item.verificationBadgeKh, item.verificationBadgeEn, item.verificationBadgeZh)}</span>
                          </span>
                        </div>

                        {/* Top-Right Direct Link to Original TikTok / Facebook / YouTube Account */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOriginalSocialAccount(item);
                          }}
                          className="absolute top-2.5 right-2.5 z-10 px-2.5 py-0.5 rounded-full bg-black/80 hover:bg-slate-900 text-white text-[9px] font-bold flex items-center gap-1 border border-white/30 transition cursor-pointer active:scale-95"
                        >
                          <span>
                            {item.platform === 'tiktok'
                              ? tr(language, 'បើក TikTok', 'Open TikTok', '打开 TikTok')
                              : item.platform === 'facebook'
                              ? tr(language, 'បើក Facebook', 'Open Facebook', '打开 Facebook')
                              : tr(language, 'បើក YouTube', 'Open YouTube', '打开 YouTube')}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>

                        {/* Large Center YouTube Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-xl border-2 border-white/90 transition transform group-hover:scale-110">
                            {isVerifyingThis ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <Play className="w-6 h-6 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Title & Creator Profile Picture Attribution */}
                        <div className="absolute bottom-2.5 left-3 right-3">
                          <h4 className="font-moul text-xs sm:text-sm text-white drop-shadow leading-snug line-clamp-2">
                            {displayTitle}
                          </h4>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              openOriginalSocialAccount(item, true);
                            }}
                            className="inline-flex items-center gap-1.5 mt-1 max-w-full cursor-pointer hover:underline"
                          >
                            <img loading="lazy" decoding="async"
                              src={getFallbackAvatarDataUri(item.authorHandle || item.sourceName)}
                              alt={item.sourceName}
                              className="w-4 h-4 rounded-full object-cover border border-white/80 shrink-0"
                            />
                            <p className="text-[10px] text-amber-200 font-bold truncate">
                              {item.sourceName} • 📍 {displayProv}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Content Details */}
                    <div className="p-3 pt-0 space-y-2.5">
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {displayDesc}
                      </p>

                      {/* Date + Direct Link to Original TikTok / Facebook / YouTube Account */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {tr(language, 'កាលបរិច្ឆេទ៖', 'Published:', '发布日期：')}{' '}
                            {item.publishedOrUpdatedAt}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openOriginalSocialAccount(item)}
                            className="text-red-500 hover:text-red-400 font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition"
                          >
                          {renderPlatformVectorIcon(item.platform, 'w-3 h-3')}
                          <span>
                            {item.platform === 'tiktok'
                              ? tr(language, 'មើលលើ TikTok', 'View on TikTok', '在 TikTok 查看')
                              : item.platform === 'facebook'
                              ? tr(language, 'មើលលើ Facebook', 'View on Facebook', '在 Facebook 查看')
                              : tr(language, 'មើលលើ YouTube', 'View on YouTube', '在 YouTube 查看')}
                          </span>
                          <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibleVideoCount < filteredItems.length && (
                <div ref={loadMoreVideosRef} className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleVideoCount((prev) => Math.min(filteredItems.length, prev + VIDEO_BATCH_SIZE))}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-rose-300 shadow-2xs font-khmer cursor-pointer"
                  >
                    {tr(
                      language,
                      `បង្ហាញវីដេអូបន្ថែម (${displayedVideos.length} / ${filteredItems.length})`,
                      `Show More Videos (${displayedVideos.length} / ${filteredItems.length})`,
                      `加载更多视频 (${displayedVideos.length} / ${filteredItems.length})`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
