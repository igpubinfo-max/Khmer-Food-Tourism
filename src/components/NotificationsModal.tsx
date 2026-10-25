import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Bell,
  BellOff,
  Tag,
  Sparkles,
  CheckCheck,
  Trash2,
  ArrowRight,
  Mountain,
  ChefHat,
  RotateCcw,
  CheckCircle2,
  CircleDot,
  Search,
  SlidersHorizontal,
  PartyPopper,
  Newspaper,
  MapPin,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { AppNotification } from '../types';
import { tr, translateTextToChinese } from '../utils/i18n';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  NotificationPreferences,
  formatRelativeTimestamp,
  CAMBODIA_PROVINCE_COORDS,
} from '../services/dailyDiscoveryAndNotificationService';

type NotifFilterTab = 'all' | 'promo' | 'new_spot' | 'event' | 'local_news' | 'daily_dish' | 'system';

export const NotificationsModal: React.FC = () => {
  const {
    isNotificationsModalOpen,
    setIsNotificationsModalOpen,
    notifications,
    notificationsEnabled,
    setNotificationsEnabled,
    markNotificationAsRead,
    toggleNotificationRead,
    deleteNotification,
    restoreDefaultNotifications,
    markAllNotificationsAsRead,
    clearAllNotifications,
    language,
    setSelectedFood,
    setSelectedRestaurant,
    setSelectedDestination,
    setIsDailyDiscoveriesModalOpen,
    foods,
    restaurants,
    destinations,
    setActiveTab,
    showToast,
  } = useApp();

  const [filterType, setFilterType] = useState<NotifFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPrefsPanel, setShowPrefsPanel] = useState<boolean>(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPreferences());

  const handleUpdatePref = (patch: Partial<NotificationPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveNotificationPreferences(next);
  };

  // Deduplicate notifications by id and sort newest/unread first
  const activeNotifications = useMemo(() => {
    const seen = new Set<string>();
    const list: AppNotification[] = [];
    for (const n of notifications) {
      if (!n || !n.id || seen.has(n.id)) continue;
      // Apply user category preferences
      if ((n.type === 'promo' || n.type === 'discount') && !prefs.promo) continue;
      if (n.type === 'new_spot' && !prefs.new_spot) continue;
      if (n.type === 'event' && !prefs.event) continue;
      if (n.type === 'local_news' && !prefs.local_news) continue;
      if (n.type === 'daily_dish' && !prefs.daily_dish) continue;
      if (n.type === 'system' && !prefs.system) continue;
      if (
        prefs.preferredProvinceKh !== 'all' &&
        n.provinceKh &&
        n.provinceKh !== 'ទូទាំងប្រទេសកម្ពុជា' &&
        n.provinceKh !== prefs.preferredProvinceKh
      ) {
        continue;
      }
      if (prefs.onlyUnread && n.isRead) continue;
      seen.add(n.id);
      list.push(n);
    }
    return list;
  }, [notifications, prefs]);

  if (!isNotificationsModalOpen) return null;

  const unreadCount = activeNotifications.filter((n) => !n.isRead).length;

  const getNotificationTitle = (n: AppNotification): string => {
    if (language === 'km') return n.titleKh || n.titleEn;
    if (language === 'zh') return n.titleZh || translateTextToChinese(n.titleEn || n.titleKh);
    return n.titleEn || n.titleKh;
  };

  const getNotificationMessage = (n: AppNotification): string => {
    if (language === 'km') return n.messageKh || n.messageEn;
    if (language === 'zh') return n.messageZh || translateTextToChinese(n.messageEn || n.messageKh);
    return n.messageEn || n.messageKh;
  };

  const filteredNotifications = activeNotifications.filter((n) => {
    if (filterType !== 'all') {
      if (filterType === 'promo' && n.type !== 'promo' && n.type !== 'discount') return false;
      if (filterType === 'new_spot' && n.type !== 'new_spot') return false;
      if (filterType === 'event' && n.type !== 'event') return false;
      if (filterType === 'local_news' && n.type !== 'local_news') return false;
      if (filterType === 'daily_dish' && n.type !== 'daily_dish' && n.targetType !== 'food') return false;
      if (filterType === 'system' && n.type !== 'system') return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const t = getNotificationTitle(n).toLowerCase();
      const m = getNotificationMessage(n).toLowerCase();
      const p = (n.provinceKh || '').toLowerCase() + ' ' + (n.provinceEn || '').toLowerCase();
      const s = (n.sourceName || '').toLowerCase();
      if (!t.includes(q) && !m.includes(q) && !p.includes(q) && !s.includes(q)) return false;
    }
    return true;
  });

  const formatNotificationDate = (n: AppNotification): string => {
    if (n.timestampIso) {
      return formatRelativeTimestamp(n.timestampIso, language);
    }
    const rawDate = n.date || '';
    if (!rawDate) return '';
    const cleanDate = rawDate.split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (cleanDate === todayStr) {
      return `${tr(language, 'ថ្ងៃនេះ', 'Today', '今天')} • ${cleanDate}`;
    }
    if (cleanDate === yesterdayStr) {
      return `${tr(language, 'ម្សិលមិញ', 'Yesterday', '昨天')} • ${cleanDate}`;
    }
    return cleanDate;
  };

  const getCategoryMeta = (n: AppNotification) => {
    if (n.type === 'promo' || n.type === 'discount') {
      return {
        icon: <Tag className="w-3.5 h-3.5" />,
        bgClass:
          'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60',
        label: tr(language, 'ប្រូម៉ូសិន', 'Promo', '优惠促销'),
      };
    }
    if (n.type === 'new_spot') {
      return {
        icon: <Mountain className="w-3.5 h-3.5" />,
        bgClass:
          'bg-emerald-100 text-[#064E3B] dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-700/60',
        label: tr(language, 'កន្លែងថ្មី', 'New Place', '热门景点'),
      };
    }
    if (n.type === 'event') {
      return {
        icon: <PartyPopper className="w-3.5 h-3.5" />,
        bgClass:
          'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300/70 dark:border-purple-700/60',
        label: tr(language, 'ព្រឹត្តិការណ៍', 'Event', '节庆活动'),
      };
    }
    if (n.type === 'local_news') {
      return {
        icon: <Newspaper className="w-3.5 h-3.5" />,
        bgClass:
          'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300/70 dark:border-sky-700/60',
        label: tr(language, 'ព័ត៌មាន', 'Local News', '本地资讯'),
      };
    }
    if (n.type === 'daily_dish' || n.targetType === 'food') {
      return {
        icon: <ChefHat className="w-3.5 h-3.5" />,
        bgClass:
          'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-300/70 dark:border-teal-700/60',
        label: tr(language, 'មុខម្ហូបឆ្នើម', 'Daily Dish', '每日美食'),
      };
    }
    return {
      icon: <Sparkles className="w-3.5 h-3.5" />,
      bgClass:
        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/70 dark:border-slate-700',
      label: tr(language, 'ប្រព័ន្ធ', 'System', '系统通知'),
    };
  };

  const handleNotificationClick = (n: AppNotification) => {
    markNotificationAsRead(n.id);
    if (n.targetType === 'restaurant' && n.targetId) {
      const r = restaurants.find((x) => x.id === n.targetId) || restaurants[0];
      if (r) {
        setActiveTab('restaurants');
        setSelectedRestaurant(r);
        setIsNotificationsModalOpen(false);
        return;
      }
    }
    if (n.targetType === 'destination' && n.targetId) {
      const d = destinations.find((x) => x.id === n.targetId) || destinations[0];
      if (d) {
        setActiveTab('tourism');
        setSelectedDestination(d);
        setIsNotificationsModalOpen(false);
        return;
      }
    }
    if (n.targetType === 'food' && n.targetId) {
      const f = foods.find((x) => x.id === n.targetId) || foods[0];
      if (f) {
        setActiveTab('food');
        setSelectedFood(f);
        setIsNotificationsModalOpen(false);
        return;
      }
    }
    if (n.targetType === 'daily_discovery') {
      setIsNotificationsModalOpen(false);
      setIsDailyDiscoveriesModalOpen(true);
      return;
    }
    if (n.sourceUrl) {
      window.open(n.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClearAllWithConfirm = () => {
    if (notifications.length === 0) return;
    const msg = tr(
      language,
      'តើអ្នកពិតជាចង់លុបការជូនដំណឹងទាំងអស់មែនទេ?',
      'Are you sure you want to delete all notifications?',
      '您确定要清空所有通知吗？'
    );
    if (window.confirm(msg)) {
      clearAllNotifications();
    }
  };

  const filterTabs: { id: NotifFilterTab; label: string; count: number }[] = [
    {
      id: 'all',
      label: tr(language, 'ទាំងអស់', 'All', '全部'),
      count: activeNotifications.length,
    },
    {
      id: 'promo',
      label: tr(language, 'ប្រូម៉ូសិន', 'Promos', '优惠促销'),
      count: activeNotifications.filter((n) => n.type === 'promo' || n.type === 'discount').length,
    },
    {
      id: 'new_spot',
      label: tr(language, 'កន្លែងថ្មី', 'New Spots', '热门景点'),
      count: activeNotifications.filter((n) => n.type === 'new_spot').length,
    },
    {
      id: 'event',
      label: tr(language, 'ព្រឹត្តិការណ៍', 'Events', '节庆活动'),
      count: activeNotifications.filter((n) => n.type === 'event').length,
    },
    {
      id: 'local_news',
      label: tr(language, 'ព័ត៌មាន', 'News', '本地资讯'),
      count: activeNotifications.filter((n) => n.type === 'local_news').length,
    },
    {
      id: 'daily_dish',
      label: tr(language, 'មុខម្ហូប', 'Daily Dish', '每日美食'),
      count: activeNotifications.filter((n) => n.type === 'daily_dish' || n.targetType === 'food').length,
    },
    {
      id: 'system',
      label: tr(language, 'ប្រព័ន្ធ', 'System', '系统通知'),
      count: activeNotifications.filter((n) => n.type === 'system').length,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={() => setIsNotificationsModalOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] via-[#047857] to-teal-800 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-xs shrink-0 relative">
              <Bell className="w-5 h-5" />
              {notificationsEnabled && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border border-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-moul text-[13px] sm:text-sm text-white leading-relaxed py-0.5">
                  {tr(language, 'ការជូនដំណឹង & ព័ត៌មានថ្មីៗ', 'Smart Notifications & Alerts', '智能通知与最新动态')}
                </h3>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer leading-normal truncate">
                {tr(
                  language,
                  'ប្រូម៉ូសិនហាង កន្លែងថ្មី ព្រឹត្តិការណ៍ និងព័ត៌មានទេសចរណ៍',
                  'Promos, new spots, festivals, news & daily dishes',
                  '餐厅优惠、新景点、节庆活动与本地文旅资讯'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowPrefsPanel((prev) => !prev)}
              className={`p-2 rounded-full transition cursor-pointer ${
                showPrefsPanel
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-white/10 hover:bg-white/20 text-emerald-100'
              }`}
              title={tr(language, 'កំណត់ចំណូលចិត្តការជូនដំណឹង', 'Notification Preferences', '通知偏好设置')}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsNotificationsModalOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white transition shrink-0 cursor-pointer"
              aria-label={tr(language, 'បិទ', 'Close', '关闭')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Toggle Switch + Sync Latest */}
        <div className="px-4 py-2.5 bg-emerald-50/80 dark:bg-slate-800/90 border-b border-emerald-100 dark:border-slate-700/80 flex items-center justify-between gap-3 shrink-0 font-khmer">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                notificationsEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400'
              }`}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                {tr(language, 'បើក/បិទការជូនដំណឹង', 'Enable / Disable Notifications', '开启 / 关闭通知提醒')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal truncate">
                {notificationsEnabled
                  ? tr(
                      language,
                      `សកម្ម • មានការជូនដំណឹងសរុប ${activeNotifications.length} មុខ`,
                      `Active • ${activeNotifications.length} verified updates`,
                      `已开启 • 共 ${activeNotifications.length} 条精选通知`
                    )
                  : tr(language, 'បានបិទការជូនដំណឹងបណ្តោះអាសន្ន', 'Notifications muted', '通知已静音关闭')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={restoreDefaultNotifications}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 border border-emerald-200 dark:border-slate-600 text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-50 transition cursor-pointer"
              title={tr(language, 'ធ្វើបច្ចុប្បន្នភាពការជូនដំណឹងថ្មីៗ', 'Sync Latest Notifications', '同步最新通知')}
            >
              <RefreshCw className="w-3 h-3" />
              <span>{tr(language, 'ទាញយកថ្មី', 'Sync', '同步')}</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                notificationsEnabled ? 'bg-[#059669]' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Optional Personalization Preferences Drawer */}
        {showPrefsPanel && (
          <div className="p-3.5 bg-amber-50/90 dark:bg-slate-800 border-b border-amber-200 dark:border-slate-700 space-y-2.5 shrink-0 font-khmer animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {tr(
                    language,
                    'កំណត់ប្រភេទការជូនដំណឹងផ្ទាល់ខ្លួន',
                    'Personalized Notification Settings',
                    '个性化通知偏好设置'
                  )}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowPrefsPanel(false)}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {tr(language, 'រួចរាល់ ✓', 'Done ✓', '完成 ✓')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
              {[
                { key: 'promo', label: tr(language, '🏷️ ប្រូម៉ូសិនហាង', '🏷️ Shop Promos', '🏷️ 促销优惠') },
                { key: 'new_spot', label: tr(language, '🏞️ កន្លែងថ្មីៗ', '🏞️ New Places', '🏞️ 新景点') },
                { key: 'event', label: tr(language, '🎉 ព្រឹត្តិការណ៍', '🎉 Events', '🎉 节庆活动') },
                { key: 'local_news', label: tr(language, '📰 ព័ត៌មានថ្មី', '📰 Local News', '📰 本地资讯') },
                { key: 'daily_dish', label: tr(language, '🍲 មុខម្ហូបឆ្នើម', '🍲 Daily Dish', '🍲 每日美食') },
                { key: 'system', label: tr(language, '⚙️ ប្រព័ន្ធ', '⚙️ System', '⚙️ 系统消息') },
              ].map((item) => {
                const checked = Boolean((prefs as any)[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleUpdatePref({ [item.key]: !checked } as any)}
                    className={`px-2.5 py-1.5 rounded-xl border text-left font-bold flex items-center justify-between transition cursor-pointer ${
                      checked
                        ? 'bg-emerald-700 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span>{checked ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {tr(language, '📍 ខេត្ត-ក្រុងអាទិភាព៖', '📍 Preferred Province:', '📍 优先省份：')}
              </span>
              <select
                value={prefs.preferredProvinceKh}
                onChange={(e) => handleUpdatePref({ preferredProvinceKh: e.target.value })}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="all">{tr(language, 'គ្រប់ខេត្ត-ក្រុងទាំង ២៥', 'All 25 Provinces', '全部 25 个省市')}</option>
                {Object.keys(CAMBODIA_PROVINCE_COORDS).map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Search, Category Filter Pills & Bulk Action Bar */}
        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0 font-khmer">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកការជូនដំណឹង, ហាង, ទីតាំង, ព្រឹត្តិការណ៍...',
                'Search notifications, places, promos, events...',
                '搜索通知、餐厅、景点或节庆活动...'
              )}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {filterTabs.map((tab) => {
              const isActive = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#064E3B] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-600 hover:border-emerald-500/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons Row: Unread Status + Mark All Read + Delete All */}
          {activeNotifications.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => handleUpdatePref({ onlyUnread: !prefs.onlyUnread })}
                className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                  prefs.onlyUnread
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200/60'
                }`}
              >
                <span>
                  {unreadCount > 0
                    ? tr(
                        language,
                        `មិនទាន់អាន ${unreadCount} សារ`,
                        `${unreadCount} unread`,
                        `${unreadCount} 条未读`
                      )
                    : tr(language, 'បានអានទាំងអស់ ✓', 'All caught up ✓', '全部已读 ✓')}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={markAllNotificationsAsRead}
                  disabled={unreadCount === 0}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    unreadCount > 0
                      ? 'bg-emerald-100/90 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300/70 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{tr(language, 'អានទាំងអស់', 'Mark All Read', '全部已读')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllWithConfirm}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/70 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{tr(language, 'លុបទាំងអស់', 'Clear All', '清空全部')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 no-scrollbar font-khmer">
          {!notificationsEnabled ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <BellOff className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  {tr(language, 'ការជូនដំណឹងត្រូវបានបិទ', 'Notifications are muted', '通知提醒已关闭')}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  {tr(
                    language,
                    'សូមបើកកុងតាក់ខាងលើឡើងវិញ ដើម្បីទទួលបានព័ត៌មានប្រូម៉ូសិន កន្លែងថ្មី និងព្រឹត្តិការណ៍ទេសចរណ៍។',
                    'Turn the switch back on above to receive promotions, new places, and event alerts.',
                    '请开启上方开关，以便接收餐厅优惠、新景点与节庆活动提醒。'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsEnabled(true)}
                className="px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {tr(language, '🔔 បើកការជូនដំណឹងឡើងវិញ', '🔔 Turn On Notifications', '🔔 重新开启通知')}
              </button>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => {
              const catMeta = getCategoryMeta(n);
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-2.5 relative ${
                    !n.isRead
                      ? 'bg-emerald-50/75 dark:bg-emerald-950/25 border-emerald-400/90 dark:border-emerald-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/90'
                  }`}
                >
                  {/* Top Row: Category Badge, Read/Unread Status Toggle, Date, & Delete Button */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${catMeta.bgClass}`}
                      >
                        {catMeta.icon}
                        <span>{catMeta.label}</span>
                      </span>

                      {n.discountPercent && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black font-mono">
                          -{n.discountPercent}% OFF
                        </span>
                      )}

                      {n.provinceKh && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{language === 'km' ? n.provinceKh : n.provinceEn || n.provinceKh}</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNotificationRead(n.id);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          !n.isRead
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {!n.isRead ? (
                          <>
                            <CircleDot className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                            <span>{tr(language, 'ថ្មី • មិនទាន់អាន', 'Unread', '未读')}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{tr(language, 'បានអាន', 'Read', '已读')}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">
                        {formatNotificationDate(n)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                        title={tr(language, 'លុបការជូនដំណឹងនេះ', 'Delete notification', '删除此通知')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Content with Thumbnail Image */}
                  <div className="flex items-start gap-3">
                    {n.photoUrl && (
                      <img
                        src={n.photoUrl}
                        alt={getNotificationTitle(n)}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h5 className="font-bold text-xs sm:text-[13px] text-[#0F172A] dark:text-white leading-snug break-words">
                        {getNotificationTitle(n)}
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                        {getNotificationMessage(n)}
                      </p>
                    </div>
                  </div>

                  {/* Action Footer with Source Link & Open CTA */}
                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      {n.sourceName && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {tr(language, 'ប្រភព៖', 'Source:', '来源：')} {n.sourceName}
                        </span>
                      )}
                      {n.sourceUrl && (
                        <a
                          href={n.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {(n.targetId || n.sourceUrl) && (
                      <span className="text-[#064E3B] dark:text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                        <span>{tr(language, 'បើកមើលមាតិកា', 'Open Content', '查看内容')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  {tr(language, 'គ្មានការជូនដំណឹងក្នុងតម្រងនេះទេ', 'No notifications match your filter', '当前筛选下暂无通知')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {tr(
                    language,
                    'សូមសម្អាតពាក្យស្វែងរក ឬចុចប៊ូតុងស្តារការជូនដំណឹងថ្មីៗឡើងវិញ។',
                    'Clear your search filter or restore the latest notifications below.',
                    '请清除搜索条件或点击下方按钮恢复最新通知。'
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {(filterType !== 'all' || searchQuery || prefs.onlyUnread || prefs.preferredProvinceKh !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType('all');
                      setSearchQuery('');
                      handleUpdatePref({ onlyUnread: false, preferredProvinceKh: 'all' });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                  >
                    <span>{tr(language, 'បង្ហាញគ្រប់ប្រភេទ', 'Reset Filters', '重置筛选')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    restoreDefaultNotifications();
                    showToast(
                      tr(
                        language,
                        '✨ បានទាញយកការជូនដំណឹងថ្មីៗទាំង ១២ មុខរួចរាល់!',
                        '✨ Synced 12 latest notifications!',
                        '✨ 已同步 12 条最新通知！'
                      ),
                      'success'
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#064E3B] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr(language, 'ស្តារការជូនដំណឹងថ្មីៗឡើងវិញ', 'Restore Latest Notifications', '恢复最新通知列表')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
