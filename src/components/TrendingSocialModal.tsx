import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X, Flame, ExternalLink, Navigation, Phone, Share2, Calendar,
  UtensilsCrossed, RefreshCw, Info, Plus, ChefHat, CheckCircle2, Globe, ChevronDown, Play,
  Search, AlertCircle, RotateCcw
} from 'lucide-react';
import { TrendingFoodCategorySlug } from '../types';
import { shareRichContent } from '../utils/androidMediaHelper';
import { tr, translateProvince } from '../utils/i18n';
import { translateDynamicTextToZh } from '../utils/zhDynamicTranslator';
import {
  searchAndDiscoverSocialFood,
  extractEmbedPlayerInfo,
  extractYouTubeVideoId,
  addCustomDiscoveryUrl,
  markYouTubeVideoUnavailable,
  getReplacementCambodianVideo,
   fetchPublicOEmbedMetadata,
  OnlineFoodDiscoveryItem,
  PlatformApiStatus,
} from '../services/onlineFoodDiscoveryService';

export const TrendingSocialModal: React.FC = () => {
  const {
    isTrendingSocialModalOpen,
    setIsTrendingSocialModalOpen,
    trendingFoods,
    foods,
    language,
    setSelectedTrendingFood,
    setIsTrendingFoodDetailModalOpen,
    setSelectedFood,
    showToast,
  } = useApp();

  const isKm = language === 'km';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<TrendingFoodCategorySlug>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');

  const [discoveryItems, setDiscoveryItems] = useState<OnlineFoodDiscoveryItem[]>([]);
  const [apiStatuses, setApiStatuses] = useState<PlatformApiStatus[]>([]);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const [showStatusPanel, setShowStatusPanel] = useState<boolean>(false);
  const [showAddUrlPanel, setShowAddUrlPanel] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isAddingUrl, setIsAddingUrl] = useState<boolean>(false);

  // Active inline video player tracking & embed fallback state
  const [activePlayerItemId, setActivePlayerItemId] = useState<string | null>(null);
  const [embedFallbackItemIds, setEmbedFallbackItemIds] = useState<Record<string, boolean>>({});
  const [verifyingPlayItemId, setVerifyingPlayItemId] = useState<string | null>(null);
  const activeIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Concurrency guard ref to prevent overlapping fetches
  const isFetchingRef = useRef<boolean>(false);

  /** Automatically replace an unavailable video with a verified playable Cambodian video */
  const handleReplaceUnavailableVideo = useCallback(
    (unavailableItem: OnlineFoodDiscoveryItem, notifyUser = false) => {
      markYouTubeVideoUnavailable(unavailableItem.sourceUrl);
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
        return prev.map((x) => (x.id === unavailableItem.id ? replacement : x));
      });

      if (activePlayerItemId === unavailableItem.id) {
        setActivePlayerItemId(null);
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

  // Listen to YouTube IFrame Player API postMessage events (detects Error 100 / 101 / 150)
  useEffect(() => {
    if (!activePlayerItemId) return;

    const handleYouTubeMessage = (event: MessageEvent) => {
      if (!event.origin || !event.origin.includes('youtube')) return;
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (data?.event === 'onError') {
          const errorCode = Number(data?.info);
          const currentItem = discoveryItems.find((x) => x.id === activePlayerItemId);
          if (!currentItem) return;

          // Error 100 = Video not found / removed / private -> auto-replace immediately
          if (errorCode === 100) {
            handleReplaceUnavailableVideo(currentItem, true);
            return;
          }

          // Error 101 / 150 / 2 / 5 = Embedding disabled by owner or WebView restriction -> show clean Watch on YouTube fallback
          setEmbedFallbackItemIds((prev) => ({ ...prev, [activePlayerItemId]: true }));
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [activePlayerItemId, discoveryItems, handleReplaceUnavailableVideo]);

  const loadFeed = useCallback(
    async (force = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsRefreshing(true);
      setHasError(false);
      try {
        const res = await searchAndDiscoverSocialFood({
          query: searchQuery,
          platform: 'youtube',
          categorySlug: categoryFilter,
          foods,
          trendingFoods,
          forceRefresh: force,
        });
        setDiscoveryItems(res.items);
        setApiStatuses(res.statuses);
        setLastCheckedAt(res.lastCheckedAt);
        setCooldownSec(res.cooldownRemainingSec);

        if (force) {
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
                `✅ បានពិនិត្យវីដេអូ YouTube ថ្មីៗ (${res.items.length} វីដេអូ)`,
                `✅ Checked latest YouTube videos (${res.items.length} videos)`,
                `✅ 已获取最新 YouTube 视频（共 ${res.items.length} 条）`
              ),
              'success'
            );
          }
        }
      } catch {
        setHasError(true);
        if (force) {
          showToast(
            tr(
              language,
              '⚠️ មិនអាចទាញយកវីដេអូ YouTube បានទេ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត',
              '⚠️ Could not load YouTube trending feed. Please check connection.',
              '⚠️ 无法加载 YouTube 热门视频，请检查网络连接。'
            ),
            'warning'
          );
        }
      } finally {
        setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [searchQuery, categoryFilter, foods, trendingFoods, language, showToast]
  );

  // Initial load when modal opens + 60-second background auto-refresh when open & visible
  useEffect(() => {
    if (!isTrendingSocialModalOpen) return;
    loadFeed(false);

    const interval = setInterval(() => {
      if (!document.hidden && !isFetchingRef.current) {
        loadFeed(false);
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [isTrendingSocialModalOpen, loadFeed]);

  // Cooldown countdown ticker
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => {
      setCooldownSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  // Stop inline video when modal closes
  useEffect(() => {
    if (!isTrendingSocialModalOpen) {
      setActivePlayerItemId(null);
      setVerifyingPlayItemId(null);
    }
  }, [isTrendingSocialModalOpen]);

  const handleAddCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    setIsAddingUrl(true);
    try {
      const res = await addCustomDiscoveryUrl(customUrlInput.trim(), foods);
      if (!res.ok || !res.item) {
        showToast(
          tr(
            language,
            res.errorKh || 'តំណភ្ជាប់មិនត្រឹមត្រូវ',
            res.errorEn || 'Invalid YouTube video URL',
            res.errorZh || '无效的 YouTube 视频链接'
          ),
          'warning'
        );
        return;
      }
      setDiscoveryItems((prev) => [res.item!, ...prev.filter((x) => x.sourceUrl !== res.item!.sourceUrl)]);
      setCustomUrlInput('');
      setShowAddUrlPanel(false);
      showToast(
        tr(
          language,
          '✅ បានផ្ទៀងផ្ទាត់ និងបន្ថែមវីដេអូ YouTube ថ្មី!',
          '✅ Verified and saved YouTube video!',
          '✅ 已通过验证并保存 YouTube 视频！'
        ),
        'success'
      );
    } finally {
      setIsAddingUrl(false);
    }
  };

  const filteredItems = useMemo(() => {
    return discoveryItems.filter((item) => {
      if (categoryFilter !== 'all' && item.categorySlug !== categoryFilter) return false;
      if (
        provinceFilter !== 'all' &&
        item.provinceKh !== provinceFilter &&
        item.provinceEn !== provinceFilter &&
        item.provinceKh !== 'ទូទាំងប្រទេសកម្ពុជា'
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${item.titleKh} ${item.titleEn} ${item.titleZh || ''} ${item.descriptionKh} ${item.descriptionEn} ${item.sourceName} ${item.matchedFoodNameKh || ''} ${item.matchedFoodNameEn || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [discoveryItems, categoryFilter, provinceFilter, searchQuery]);

  if (!isTrendingSocialModalOpen) return null;

  // 4 Main YouTube Categories + All Trending
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
          (fallbackQuery || 'Cambodian food travel') + ' Khmer food'
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
   * - Check oEmbed / thumbnail status if not yet verified
   * - If unavailable, auto-replace with a verified playable Cambodian video
   * - If embedding is disabled, show the clear "Watch on YouTube" fallback UI
   */
  const handlePlayOrOpenItem = async (item: OnlineFoodDiscoveryItem) => {
    if (activePlayerItemId === item.id) {
      setActivePlayerItemId(null);
      return;
    }

    const playerInfo = extractEmbedPlayerInfo(item);
    if (!playerInfo.videoId) {
      openExternalVideoSafely(playerInfo.watchUrl, item.titleEn || item.titleKh);
      return;
    }

    // Verify availability before opening player if online
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      setVerifyingPlayItemId(item.id);
      const meta = await fetchPublicOEmbedMetadata(playerInfo.watchUrl);
      setVerifyingPlayItemId(null);

      if (!meta) {
        // Video is unavailable/deleted -> automatically replace with a playable video!
        handleReplaceUnavailableVideo(item, true);
        return;
      }

      if (meta.canEmbed === false) {
        setEmbedFallbackItemIds((prev) => ({ ...prev, [item.id]: true }));
        setActivePlayerItemId(item.id);
        return;
      }
    }

    if (playerInfo.canInlineEmbed && playerInfo.embedUrl) {
      setActivePlayerItemId(item.id);
      return;
    }

    if (playerInfo.watchUrl) {
      openExternalVideoSafely(playerInfo.watchUrl, item.titleEn || item.titleKh);
      return;
    }

    if (item.trendingItem) {
      setSelectedTrendingFood(item.trendingItem);
      setIsTrendingFoodDetailModalOpen(true);
      return;
    }

    if (item.matchedFoodId) {
      const f = foods.find((x) => x.id === item.matchedFoodId);
      if (f) setSelectedFood(f);
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
    if (t?.mapUrl) {
      window.open(t.mapUrl, '_blank', 'noopener,noreferrer');
    } else if (t?.latitude && t?.longitude) {
      window.open(`https://maps.google.com/?q=${t.latitude},${t.longitude}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.titleEn + ' Cambodia')}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = (item: OnlineFoodDiscoveryItem) => {
    const t = item.trendingItem;
    const mapLink =
      t?.mapUrl ||
      (t?.latitude && t?.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${t.latitude},${t.longitude}`
        : item.sourceUrl);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200 overscroll-none"
      onClick={() => setIsTrendingSocialModalOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-rose-500/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-moul text-xs sm:text-sm text-white truncate">
                  {tr(language, 'វីដេអូពេញនិយម YouTube (ម្ហូប & ទេសចរណ៍)', 'Trending YouTube Videos (Food & Travel)', 'YouTube 热门视频（美食与旅行）')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold shadow-xs">
                  YouTube Only
                </span>
              </div>
              <p className="text-[11px] text-pink-200 font-khmer truncate">
                {tr(
                  language,
                  `កែប្រែស្វ័យប្រវត្តរៀងរាល់ ៦០វិនាទី • បានពិនិត្យ៖ ${formattedLastChecked}`,
                  `Auto-refreshes every 60s · Last checked: ${formattedLastChecked}`,
                  `每60秒自动刷新 · 最后检查：${formattedLastChecked}`
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

        {/* Search Input Bar (Multilingual km / en / zh) */}
        <div className="p-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកវីដេអូ YouTube ម្ហូបខ្មែរ ឬតំបន់ទេសចរណ៍...',
                'Search YouTube videos, Khmer dishes or attractions...',
                '搜索 YouTube 高棉美食与景点视频...'
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
        </div>

        {/* Action Bar: YouTube API Status + Add Video URL */}
        <div className="px-3 py-2 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 font-khmer text-[11px]">
          <button
            type="button"
            onClick={() => setShowStatusPanel(!showStatusPanel)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold border border-slate-700 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{tr(language, 'ស្ថានភាព YouTube API', 'YouTube API Status', 'YouTube API 状态')}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStatusPanel ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddUrlPanel(!showAddUrlPanel)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tr(language, 'បន្ថែមវីដេអូ YouTube', 'Add YouTube URL', '添加 YouTube 视频')}</span>
          </button>
        </div>

        {/* Expandable YouTube Transparency Panel */}
        {showStatusPanel && (
          <div className="p-3 bg-slate-950 text-slate-200 border-b border-slate-800 space-y-2 shrink-0 font-khmer text-[11px] max-h-56 overflow-y-auto">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>
                {tr(
                  language,
                  'របាយការណ៍តម្លាភាពនៃការតភ្ជាប់ YouTube ផ្លូវការ៖',
                  'Official YouTube API & Transparency Report:',
                  '官方 YouTube API 与透明度说明：'
                )}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {apiStatuses.map((st) => (
                <div key={st.platform} className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-white">{tr(language, st.nameKh, st.nameEn, st.nameZh)}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        st.mode === 'live_api'
                          ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-600/40'
                          : 'bg-rose-900/70 text-rose-300 border border-rose-600/40'
                      }`}
                    >
                      {tr(language, st.statusLabelKh, st.statusLabelEn, st.statusLabelZh)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    {tr(language, st.explanationKh, st.explanationEn, st.explanationZh)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Add YouTube URL Form */}
        {showAddUrlPanel && (
          <form onSubmit={handleAddCustomUrl} className="p-3 bg-slate-900 border-b border-slate-800 space-y-2 shrink-0 font-khmer">
            <label className="block text-[11px] font-bold text-emerald-300">
              {tr(
                language,
                'បិទភ្ជាប់តំណវីដេអូ YouTube (https://www.youtube.com/... ឬ youtu.be/...)៖',
                'Paste a YouTube video URL (https://www.youtube.com/... or youtu.be/...):',
                '粘贴 YouTube 视频链接 (https://www.youtube.com/... 或 youtu.be/...)：'
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
              <button
                type="submit"
                disabled={isAddingUrl}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isAddingUrl
                  ? tr(language, 'កំពុងពិនិត្យ...', 'Verifying...', '验证中...')
                  : tr(language, 'រក្សាទុក', 'Verify & Save', '验证并保存')}
              </button>
            </div>
          </form>
        )}

        {/* Category Tabs: 4 YouTube Categories + All Trending */}
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
              <span>{c.icon}</span>
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

        {/* Video List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 no-scrollbar font-khmer text-xs [-webkit-overflow-scrolling:touch]">
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
          ) : filteredItems.length === 0 ? (
            /* Empty State with Reset Filters Button */
            <div className="py-12 text-center text-slate-400 space-y-3">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-500" />
              <p className="text-sm font-bold text-slate-300">
                {tr(
                  language,
                  'រកមិនឃើញវីដេអូ YouTube ត្រូវនឹងការស្វែងរកនេះទេ',
                  'No YouTube videos matching this filter',
                  '未找到符合筛选条件的 YouTube 视频'
                )}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs cursor-pointer border border-slate-700 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{tr(language, 'សម្អាតតម្រងទាំងអស់', 'Reset Filters', '重置所有筛选')}</span>
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
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

              return (
                <div
                  key={item.id}
                  className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-3 transition hover:shadow-md"
                >
                  {/* Inline YouTube Embed Player OR Fallback OR High-Res Thumbnail */}
                  {isPlayingInline ? (
                    isEmbedFallback || !playerInfo.embedUrl ? (
                      /* Clear Message + Working "Watch on YouTube" Button if Embedding is Disabled */
                      <div className="relative aspect-16/9 w-full bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-2.5">
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-25 blur-[2px] pointer-events-none"
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
                              onClick={() => openExternalVideoSafely(playerInfo.watchUrl, displayTitle)}
                              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>{tr(language, 'មើលលើ YouTube', 'Watch on YouTube', '在 YouTube 上观看')}</span>
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
                        <iframe
                          ref={activeIframeRef}
                          src={playerInfo.embedUrl}
                          title={displayTitle}
                          className="w-full h-full border-0"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                          allowFullScreen
                          onLoad={(e) => {
                            try {
                              e.currentTarget.contentWindow?.postMessage(
                                JSON.stringify({ event: 'listening', id: item.id }),
                                '*'
                              );
                            } catch {
                              // ignore cross-origin postMessage errors
                            }
                          }}
                          onError={() => {
                            setEmbedFallbackItemIds((prev) => ({ ...prev, [item.id]: true }));
                          }}
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                          <button
                            type="button"
                            onClick={() => openExternalVideoSafely(playerInfo.watchUrl, displayTitle)}
                            className="px-2.5 py-1 rounded-lg bg-black/85 hover:bg-red-600 text-white text-[10px] font-bold flex items-center gap-1 border border-white/25 backdrop-blur-xs cursor-pointer transition"
                            title={tr(language, 'មើលលើ YouTube', 'Watch on YouTube', '在 YouTube 上观看')}
                          >
                            <ExternalLink className="w-3 h-3 text-red-400" />
                            <span>{tr(language, 'មើលលើ YouTube', 'Watch on YouTube', '在 YouTube 观看')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActivePlayerItemId(null)}
                            className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-md cursor-pointer"
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
                        onLoad={(e) => {
                          // YouTube dead video placeholder is exactly 120x90. Auto-skip and replace immediately!
                          if (e.currentTarget.naturalWidth > 0 && e.currentTarget.naturalWidth <= 120) {
                            handleReplaceUnavailableVideo(item, false);
                          }
                        }}
                        onError={() => {
                          if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                            handleReplaceUnavailableVideo(item, false);
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                      {/* YouTube & Verification Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black shadow-xs bg-red-600 text-white flex items-center gap-1">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>YouTube</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/70 text-emerald-200 text-[9px] font-bold backdrop-blur-xs flex items-center gap-1 border border-white/15">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{tr(language, item.verificationBadgeKh, item.verificationBadgeEn, item.verificationBadgeZh)}</span>
                        </span>
                      </div>

                      {/* Quick Watch on YouTube pill at top-right */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openExternalVideoSafely(playerInfo.watchUrl, displayTitle);
                        }}
                        className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/75 hover:bg-red-600 text-white text-[9px] font-bold backdrop-blur-xs flex items-center gap-1 border border-white/20 transition cursor-pointer"
                      >
                        <span>{tr(language, 'បើក YouTube', 'Watch on YouTube', '打开 YouTube')}</span>
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

                      {/* Title & Source Attribution */}
                      <div className="absolute bottom-2.5 left-3 right-3">
                        <h4 className="font-moul text-xs sm:text-sm text-white drop-shadow leading-snug line-clamp-2">
                          {displayTitle}
                        </h4>
                        <p className="text-[10px] text-amber-200 font-bold truncate mt-0.5">
                          📡 {item.sourceName} • 📍 {displayProv}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Content Details */}
                  <div className="p-3 pt-0 space-y-2.5">
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {displayDesc}
                    </p>

                    {/* Matched Recipe Link */}
                    {item.matchedFoodId && (
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <ChefHat className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                          <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 truncate">
                            {tr(
                              language,
                              `ម្ហូបខ្មែរក្នុងកម្មវិធី៖ ${item.matchedFoodNameKh || ''}`,
                              `Matched Khmer Recipe: ${item.matchedFoodNameEn || ''}`,
                              `匹配应用内高棉食谱：${item.matchedFoodNameEn || ''}`
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenRecipeDish(item.matchedFoodId)}
                          className="px-2.5 py-1 rounded-lg bg-[#064E3B] hover:bg-emerald-800 text-white text-[10px] font-extrabold shrink-0 cursor-pointer"
                        >
                          {tr(language, 'មើលរូបមន្ត', 'View Recipe', '查看食谱')}
                        </button>
                      </div>
                    )}

                    {/* Date + Direct Watch on YouTube Link */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {tr(language, 'កាលបរិច្ឆេទ៖', 'Published:', '发布日期：')}{' '}
                          {item.publishedOrUpdatedAt}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => openExternalVideoSafely(playerInfo.watchUrl, displayTitle)}
                        className="text-red-500 hover:text-red-600 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{tr(language, 'មើលលើ YouTube', 'Watch on YouTube', '在 YouTube 观看')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePlayOrOpenItem(item)}
                        className={`py-1.5 px-2 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer ${
                          isPlayingInline
                            ? 'bg-slate-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                        }`}
                      >
                        {isPlayingInline ? (
                          <>
                            <X className="w-3 h-3" />
                            <span>{tr(language, 'បិទ', 'Close', '关闭')}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>{tr(language, 'ចាក់វីដេអូ', 'Play', '播放')}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMap(item)}
                        className="py-1.5 px-2 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <Navigation className="w-3 h-3 text-emerald-300" />
                        <span>{tr(language, 'ផែនទី', 'Map', '地图')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCall(item.trendingItem?.phone)}
                        className={`py-1.5 px-2 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer ${
                          item.trendingItem?.phone
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}
                      >
                        <Phone className="w-3 h-3" />
                        <span>{tr(language, 'ទូរស័ព្ទ', 'Call', '致电')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(item)}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition border border-slate-200 dark:border-slate-600 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>{tr(language, 'ចែករំលែក', 'Share', '分享')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
