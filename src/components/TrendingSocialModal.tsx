import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  X, Flame, MapPin, Eye, ExternalLink, Navigation, Phone, Share2, Calendar,
  UtensilsCrossed, RefreshCw, Info, Plus, ChefHat, CheckCircle2, Globe, ChevronDown, Play,
  Search, AlertCircle, RotateCcw
} from 'lucide-react';
import { TrendingFoodCategorySlug } from '../types';
import { shareRichContent } from '../utils/androidMediaHelper';
import { tr, translateProvince } from '../utils/i18n';
import { translateDynamicTextToZh } from '../utils/zhDynamicTranslator';
import {
  fetchOnlineFoodDiscoveryFeed,
  searchAndDiscoverSocialFood,
  extractEmbedPlayerInfo,
  addCustomDiscoveryUrl,
  DiscoveryPlatformId,
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
  const [platformFilter, setPlatformFilter] = useState<'all' | DiscoveryPlatformId>('all');
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

  // Active inline video player tracking
  const [activePlayerItemId, setActivePlayerItemId] = useState<string | null>(null);

  const loadFeed = useCallback(
    async (force = false) => {
      setIsRefreshing(true);
      setHasError(false);
      try {
        const res = await searchAndDiscoverSocialFood({
          query: searchQuery,
          platform: platformFilter,
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
                `⏳ សូមរង់ចាំ ${res.cooldownRemainingSec} វិនាទីទៀតមុននឹងផ្ទុកឡើងវិញ (ការពារកូតា API)`,
                `⏳ Please wait ${res.cooldownRemainingSec}s before manual refresh (API quota guard)`,
                `⏳ 请等待 ${res.cooldownRemainingSec} 秒后再手动刷新（API 配额保护）`
              ),
              'info'
            );
          } else {
            showToast(
              tr(
                language,
                `✅ បានពិនិត្យប្រភពអនឡាញ (${res.items.length} មុខម្ហូប និងវីដេអូ)`,
                `✅ Checked online sources (${res.items.length} dishes & videos)`,
                `✅ 已检查在线来源（共 ${res.items.length} 条美食与视频）`
              ),
              'success'
            );
          }
        }
      } catch {
        setHasError(true);
        showToast(
          tr(
            language,
            '⚠️ មិនអាចទាញយកទិន្នន័យអនឡាញបានទេ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត',
            '⚠️ Could not reach online discovery feed. Please check connection.',
            '⚠️ 无法连接在线发现源，请检查网络连接。'
          ),
          'warning'
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [foods, trendingFoods, language, showToast, searchQuery, platformFilter]
  );

  // Automatic load on open + scheduled refresh check every 30 minutes while open
  useEffect(() => {
    if (!isTrendingSocialModalOpen) return;
    loadFeed(false);
    const interval = setInterval(() => {
      loadFeed(false);
    }, 30 * 60 * 1000);
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
            res.errorEn || 'Invalid URL',
            res.errorZh || '无效链接'
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
          '✅ បានផ្ទៀងផ្ទាត់ និងរក្សាទុកតំណភ្ជាប់ម្ហូបថ្មី!',
          '✅ Verified and saved food link via oEmbed!',
          '✅ 已通过 oEmbed 验证并保存美食链接！'
        ),
        'success'
      );
    } finally {
      setIsAddingUrl(false);
    }
  };

  const filteredItems = useMemo(() => {
    return discoveryItems.filter((item) => {
      if (platformFilter !== 'all' && item.platform !== platformFilter) return false;
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
  }, [discoveryItems, platformFilter, categoryFilter, provinceFilter, searchQuery]);

  if (!isTrendingSocialModalOpen) return null;

  const categories: { id: TrendingFoodCategorySlug; labelKh: string; labelEn: string; labelZh: string; icon: string }[] = [
    { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', labelZh: '全部', icon: '🔥' },
    { id: 'famous_dish', labelKh: 'មុខម្ហូបល្បីប្រចាំតំបន់', labelEn: 'Famous', labelZh: '招牌名菜', icon: '🍲' },
    { id: 'street_food', labelKh: 'អាហារតាមផ្លូវ', labelEn: 'Street Food', labelZh: '街头小吃', icon: '🍢' },
    { id: 'noodle_soup', labelKh: 'គុយទាវ & ស៊ុប', labelEn: 'Noodles', labelZh: '汤粉与面食', icon: '🍜' },
    { id: 'cafe_drink', labelKh: 'កាហ្វេ & ភេសជ្ជៈ', labelEn: 'Café & Drinks', labelZh: '咖啡与饮品', icon: '☕' },
    { id: 'dessert_snack', labelKh: 'បង្អែម & សម្រន់', labelEn: 'Desserts', labelZh: '甜品与小食', icon: '🍨' },
    { id: 'unusual_local', labelKh: 'ម្ហូបប្លែកៗ & កម្រ', labelEn: 'Unusual & Rare', labelZh: '特色稀有美食', icon: '✨' },
  ];

  const provinces = [
    { id: 'all', labelKh: 'គ្រប់ខេត្ត/ក្រុង', labelEn: 'All Provinces', labelZh: '全柬省市' },
    { id: 'រាជធានីភ្នំពេញ', labelKh: 'ភ្នំពេញ', labelEn: 'Phnom Penh', labelZh: '金边市' },
    { id: 'ខេត្តសៀមរាប', labelKh: 'សៀមរាប', labelEn: 'Siem Reap', labelZh: '暹粒省' },
    { id: 'ខេត្តបាត់ដំបង', labelKh: 'បាត់ដំបង', labelEn: 'Battambang', labelZh: '马德望省' },
    { id: 'ខេត្តកំពត', labelKh: 'កំពត', labelEn: 'Kampot', labelZh: '贡布省' },
    { id: 'ខេត្តកែប', labelKh: 'កែប', labelEn: 'Kep', labelZh: '白马省' },
    { id: 'ខេត្តកោះកុង', labelKh: 'កោះកុង', labelEn: 'Koh Kong', labelZh: '国公省' },
    { id: 'ខេត្តកំពង់ចាម', labelKh: 'កំពង់ចាម', labelEn: 'Kampong Cham', labelZh: '磅湛省' },
    { id: 'ខេត្តកំពង់ស្ពឺ', labelKh: 'កំពង់ស្ពឺ', labelEn: 'Kampong Speu', labelZh: '磅士卑省' },
  ];

  const openExternalVideoOrLinkSafely = (rawUrl?: string, fallbackQuery?: string) => {
    const targetUrl =
      rawUrl && /^https?:\/\//i.test(rawUrl.trim())
        ? rawUrl.trim()
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(
            (fallbackQuery || 'Cambodian food') + ' Khmer food'
          )}`;
    try {
      const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      try {
        window.location.assign(targetUrl);
      } catch {
        showToast(
          tr(
            language,
            'មិនអាចបើកតំណវីដេអូបានទេ សូមព្យាយាមម្តងទៀត',
            'Could not open video link, please try again',
            '无法打开视频链接，请重试'
          ),
          'warning'
        );
      }
    }
  };

  const handlePlayOrOpenItem = (item: OnlineFoodDiscoveryItem) => {
    const playerInfo = extractEmbedPlayerInfo(item);
    if (playerInfo.canInlineEmbed && playerInfo.embedUrl) {
      setActivePlayerItemId((prev) => (prev === item.id ? null : item.id));
      return;
    }

    const url = item.sourceUrl || item.trendingItem?.videoUrl || item.trendingItem?.sourceUrl;
    if (url) {
      openExternalVideoOrLinkSafely(url, item.titleEn || item.titleKh);
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

  const platformBadgeStyle = (p: DiscoveryPlatformId) => {
    if (p === 'youtube') return 'bg-red-600 text-white';
    if (p === 'tiktok') return 'bg-rose-600 text-white';
    if (p === 'facebook') return 'bg-blue-600 text-white';
    return 'bg-emerald-700 text-white';
  };

  const platformLabel = (p: DiscoveryPlatformId) => {
    if (p === 'youtube') return '▶ YouTube';
    if (p === 'tiktok') return '🎵 TikTok';
    if (p === 'facebook') return '👥 Facebook';
    return '🌐 Wikipedia';
  };

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
                  {tr(language, 'ម្ហូបខ្មែរកំពុងពេញនិយមលើអនឡាញ', 'Trending Khmer Food Discovery', '热门高棉美食在线发现')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shadow-xs">
                  YouTube · Wikipedia
                </span>
              </div>
              <p className="text-[11px] text-pink-200 font-khmer truncate">
                {tr(
                  language,
                  `បានពិនិត្យចុងក្រោយ៖ ${formattedLastChecked} • ប្រភពផ្លូវការ & សាធារណៈ`,
                  `Last checked: ${formattedLastChecked} · Official & public sources`,
                  `最后检查：${formattedLastChecked} · 官方与公开来源`
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
              title={tr(language, 'ពិនិត្យប្រភពថ្មីៗ', 'Refresh Sources', '刷新来源')}
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
                'ស្វែងរកមុខម្ហូបខ្មែរ វីដេអូ ឬប្រភព (YouTube, TikTok, FB)...',
                'Search Khmer dishes, videos or sources (YouTube, TikTok, FB)...',
                '搜索高棉美食、视频或来源 (YouTube, TikTok, FB)...'
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

        {/* Action & Transparency Bar: API Status + Add Video Link */}
        <div className="px-3 py-2 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 font-khmer text-[11px]">
          <button
            type="button"
            onClick={() => setShowStatusPanel(!showStatusPanel)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold border border-slate-700 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{tr(language, 'ស្ថានភាព API តាមវេទិកា (២)', 'Platform API Status (2)', '各平台 API 状态 (2)')}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStatusPanel ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddUrlPanel(!showAddUrlPanel)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tr(language, 'បន្ថែមតំណវីដេអូ', 'Add Video URL', '添加视频链接')}</span>
          </button>
        </div>

        {/* Expandable Platform API Transparency Panel */}
        {showStatusPanel && (
          <div className="p-3 bg-slate-950 text-slate-200 border-b border-slate-800 space-y-2 shrink-0 font-khmer text-[11px] max-h-56 overflow-y-auto">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>
                {tr(
                  language,
                  'របាយការណ៍តម្លាភាពនៃការតភ្ជាប់ API ផ្លូវការ (គ្មានការ Scrape ខុសច្បាប់)៖',
                  'Official API Access & Platform Transparency (Zero Prohibited Scraping):',
                  '官方 API 访问与平台透明度说明（严禁违规抓取）：'
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
                          : st.mode === 'oembed_verified'
                          ? 'bg-sky-900/70 text-sky-300 border border-sky-600/40'
                          : 'bg-amber-900/70 text-amber-300 border border-amber-600/40'
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

        {/* Expandable Add Custom URL Form (oEmbed verification) */}
        {showAddUrlPanel && (
          <form onSubmit={handleAddCustomUrl} className="p-3 bg-slate-900 border-b border-slate-800 space-y-2 shrink-0 font-khmer">
            <label className="block text-[11px] font-bold text-emerald-300">
              {tr(
                language,
                'បិទភ្ជាប់តំណវីដេអូម្ហូបខ្មែរពី YouTube, TikTok ឬ Facebook ដើម្បីទាញព័ត៌មានតាម oEmbed៖',
                'Paste a YouTube, TikTok, or Facebook Cambodian food URL to verify via official oEmbed:',
                '粘贴 YouTube、TikTok 或 Facebook 的高棉美食链接（通过官方 oEmbed 验证）：'
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
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

        {/* Filter Bar 1: Platform */}
        <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-1.5 shrink-0 font-khmer text-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'all', labelKh: `🔥 ទាំងអស់ (${discoveryItems.length})`, labelEn: `🔥 All (${discoveryItems.length})`, labelZh: `🔥 全部 (${discoveryItems.length})` },
            { id: 'youtube', labelKh: '▶ YouTube', labelEn: '▶ YouTube', labelZh: '▶ YouTube 视频' },
            { id: 'tiktok', labelKh: '🎵 TikTok', labelEn: '🎵 TikTok', labelZh: '🎵 TikTok' },
            { id: 'facebook', labelKh: '👥 Facebook', labelEn: '👥 Facebook', labelZh: '👥 Facebook' },
            { id: 'web_wiki', labelKh: '🌐 Wikipedia', labelEn: '🌐 Wikipedia', labelZh: '🌐 维基百科' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPlatformFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-xs cursor-pointer ${
                platformFilter === f.id
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              {tr(language, f.labelKh, f.labelEn, f.labelZh)}
            </button>
          ))}
        </div>

        {/* Filter Bar 2: Categories */}
        <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-khmer text-xs shrink-0">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                categoryFilter === c.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <span>{c.icon}</span>
              <span>{tr(language, c.labelKh, c.labelEn, c.labelZh)}</span>
            </button>
          ))}
        </div>

        {/* Filter Bar 3: Province Selector */}
        <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-khmer text-xs shrink-0">
          <span className="text-[10px] text-slate-400 font-bold shrink-0">📍 {tr(language, 'ទីតាំង៖', 'City:', '城市：')}</span>
          {provinces.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvinceFilter(p.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition cursor-pointer ${
                provinceFilter === p.id
                  ? 'bg-rose-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tr(language, p.labelKh, p.labelEn, p.labelZh)}
            </button>
          ))}
        </div>

        {/* List of Discovered & Trending Khmer Food Items */}
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
                  'មិនអាចទាញទិន្នន័យបានទេ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត',
                  'Failed to load social feed. Please check your connection.',
                  '无法加载内容，请检查网络连接。'
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
                  'រកមិនឃើញមុខម្ហូបត្រូវនឹងការស្វែងរកនេះទេ',
                  'No food discoveries matching this filter',
                  '未找到符合筛选条件的美食内容'
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

              return (
                <div
                  key={item.id}
                  className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-3 transition hover:shadow-md"
                >
                  {/* Inline Embed Player OR Thumbnail Banner */}
                  {isPlayingInline && playerInfo.canInlineEmbed && playerInfo.embedUrl ? (
                    <div className="relative aspect-16/9 w-full bg-black overflow-hidden shadow-inner">
                      <iframe
                        src={playerInfo.embedUrl}
                        title={displayTitle}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        <button
                          type="button"
                          onClick={() => openExternalVideoOrLinkSafely(item.sourceUrl, displayTitle)}
                          className="px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 border border-white/20 backdrop-blur-xs cursor-pointer"
                          title={tr(language, 'បើកក្នុងកម្មវិធីដើម', 'Open in App', '在应用中打开')}
                        >
                          <ExternalLink className="w-3 h-3 text-rose-400" />
                          <span>{tr(language, 'បើកក្នុង App', 'Open App', '在应用中打开')}</span>
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
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                      {/* Platform & Verification Status Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shadow-xs ${platformBadgeStyle(item.platform)}`}>
                          {platformLabel(item.platform)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/70 text-emerald-200 text-[9px] font-bold backdrop-blur-xs flex items-center gap-1 border border-white/15">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{tr(language, item.verificationBadgeKh, item.verificationBadgeEn, item.verificationBadgeZh)}</span>
                        </span>
                      </div>

                      {/* Center Play Overlay for Video Platforms */}
                      {item.platform === 'youtube' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-11 h-11 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white/80 transition transform group-hover:scale-110">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Title & Source Attribution Overlay */}
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

                    {/* Matched Cambodian Dish Chip (opens recipe modal in 1 tap) */}
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

                    {/* Publication / Revision Timestamp + Direct Source Link */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {item.isLiveFetched
                            ? tr(language, 'កាលបរិច្ឆេទប្រភព៖', 'Source date:', '来源日期：')
                            : tr(language, 'កាលបរិច្ឆេទផ្ទៀងផ្ទាត់៖', 'Verified date:', '核实日期：')}{' '}
                          {item.publishedOrUpdatedAt}
                        </span>
                      </span>
                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-rose-500 hover:text-rose-600 font-bold flex items-center gap-0.5"
                        >
                          <span>{tr(language, 'បើកប្រភពដើម', 'Open Original', '打开原链接')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePlayOrOpenItem(item)}
                        className={`py-1.5 px-2 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer ${
                          item.platform === 'youtube'
                            ? isPlayingInline
                              ? 'bg-slate-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-[#064E3B] dark:text-emerald-300'
                        }`}
                      >
                        {item.platform === 'youtube' ? (
                          isPlayingInline ? (
                            <>
                              <X className="w-3 h-3" />
                              <span>{tr(language, 'បិទ', 'Close', '关闭')}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>{tr(language, 'ចាក់វីដេអូ', 'Play', '播放')}</span>
                            </>
                          )
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>{tr(language, 'មើល', 'Open', '查看')}</span>
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
