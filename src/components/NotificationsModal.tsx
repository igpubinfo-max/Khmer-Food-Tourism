import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Bell, BellOff, Tag, Sparkles, 
  CheckCheck, Trash2, ArrowRight, Mountain, ChefHat, RotateCcw, CheckCircle2, CircleDot
} from 'lucide-react';
import { AppNotification } from '../types';
import { tr, translateTextToChinese } from '../utils/i18n';

export const NotificationsModal: React.FC = () => {
  const { 
    isNotificationsModalOpen, setIsNotificationsModalOpen,
    notifications, notificationsEnabled, setNotificationsEnabled,
    markNotificationAsRead, toggleNotificationRead, deleteNotification,
    restoreDefaultNotifications, markAllNotificationsAsRead, clearAllNotifications,
    language, setSelectedFood, setSelectedRestaurant, setSelectedDestination,
    foods, restaurants, destinations, setActiveTab
  } = useApp();

  const [filterType, setFilterType] = useState<'all' | 'promo' | 'new_spot' | 'daily_dish' | 'system'>('all');

  if (!isNotificationsModalOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'promo') return n.type === 'promo' || n.type === 'discount';
    if (filterType === 'new_spot') return n.type === 'new_spot';
    if (filterType === 'daily_dish') return n.type === 'daily_dish' || n.targetType === 'food';
    if (filterType === 'system') return n.type === 'system';
    return true;
  });

  const formatNotificationDate = (rawDate: string): string => {
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

  const getCategoryMeta = (n: AppNotification) => {
    if (n.type === 'promo' || n.type === 'discount') {
      return {
        icon: <Tag className="w-4 h-4" />,
        bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60',
        label: tr(language, 'ប្រូម៉ូសិន', 'Promo', '优惠促销'),
      };
    }
    if (n.type === 'new_spot') {
      return {
        icon: <Mountain className="w-4 h-4" />,
        bgClass: 'bg-emerald-100 text-[#064E3B] dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-700/60',
        label: tr(language, 'កន្លែងថ្មី', 'Viral Spot', '热门景点'),
      };
    }
    if (n.type === 'daily_dish' || n.targetType === 'food') {
      return {
        icon: <ChefHat className="w-4 h-4" />,
        bgClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-300/70 dark:border-teal-700/60',
        label: tr(language, 'មុខម្ហូបឆ្នើម', 'Daily Dish', '每日美食'),
      };
    }
    return {
      icon: <Sparkles className="w-4 h-4" />,
      bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300/70 dark:border-sky-700/60',
      label: tr(language, 'ប្រព័ន្ធ', 'System', '系统通知'),
    };
  };

  const handleNotificationClick = (n: AppNotification) => {
    markNotificationAsRead(n.id);
    if (n.targetType === 'restaurant' && n.targetId) {
      const r = restaurants.find(x => x.id === n.targetId) || restaurants[0];
      if (r) {
        setActiveTab('restaurants');
        setSelectedRestaurant(r);
        setIsNotificationsModalOpen(false);
      }
    } else if (n.targetType === 'destination' && n.targetId) {
      const d = destinations.find(x => x.id === n.targetId) || destinations[0];
      if (d) {
        setActiveTab('tourism');
        setSelectedDestination(d);
        setIsNotificationsModalOpen(false);
      }
    } else if (n.targetType === 'food' && n.targetId) {
      const f = foods.find(x => x.id === n.targetId) || foods[0];
      if (f) {
        setActiveTab('food');
        setSelectedFood(f);
        setIsNotificationsModalOpen(false);
      }
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

  const filterTabs: { id: 'all' | 'promo' | 'new_spot' | 'daily_dish' | 'system'; label: string; count: number }[] = [
    {
      id: 'all',
      label: tr(language, 'ទាំងអស់', 'All', '全部'),
      count: notifications.length,
    },
    {
      id: 'promo',
      label: tr(language, 'ប្រូម៉ូសិន', 'Promos', '优惠促销'),
      count: notifications.filter(n => n.type === 'promo' || n.type === 'discount').length,
    },
    {
      id: 'new_spot',
      label: tr(language, 'កន្លែងថ្មី', 'New Spots', '热门景点'),
      count: notifications.filter(n => n.type === 'new_spot').length,
    },
    {
      id: 'daily_dish',
      label: tr(language, 'មុខម្ហូប', 'Daily Dish', '每日美食'),
      count: notifications.filter(n => n.type === 'daily_dish' || n.targetType === 'food').length,
    },
    {
      id: 'system',
      label: tr(language, 'ប្រព័ន្ធ', 'System', '系统通知'),
      count: notifications.filter(n => n.type === 'system').length,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={() => setIsNotificationsModalOpen(false)}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] to-[#047857] text-white flex items-center justify-between gap-2 shrink-0">
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
                  {tr(language, 'ការជូនដំណឹងដែលមានប្រយោជន៍', 'Helpful Notifications', '实用通知与优惠中心')}
                </h3>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer leading-normal">
                {tr(
                  language,
                  'ប្រូម៉ូសិនហាង កន្លែងថ្មី និងមុខម្ហូបឆ្នើមប្រចាំថ្ងៃ',
                  'VIP shop promos, viral spots & daily dish picks',
                  'VIP 餐厅优惠、热门景点与每日精选美食'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationsModalOpen(false)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white transition shrink-0 cursor-pointer"
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Toggle Switch: «អ្នកប្រើអាចបិទការជូនដំណឹងបាន» */}
        <div className="px-4 py-3 bg-emerald-50/80 dark:bg-slate-800/90 border-b border-emerald-100 dark:border-slate-700/80 flex items-center justify-between gap-3 shrink-0 font-khmer">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              notificationsEnabled
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400'
            }`}>
              {notificationsEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                {tr(language, 'បើក/បិទការជូនដំណឹង', 'Enable / Disable Notifications', '开启 / 关闭通知提醒')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                {notificationsEnabled 
                  ? tr(language, 'កំពុងបើកដំណើរការ (ទទួលបានប្រូម៉ូសិន)', 'Active (Receiving alerts & promos)', '已开启（正常接收优惠与通知）')
                  : tr(language, 'បានបិទការជូនដំណឹងបណ្តោះអាសន្ន', 'Notifications muted', '通知已静音关闭')}
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
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

        {/* Category Filter Pills & Bulk Action Bar */}
        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0 font-khmer">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {filterTabs.map(tab => {
              if (tab.id === 'system' && tab.count === 0 && filterType !== 'system') return null;
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
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons Row: Unread Status + Mark All Read + Delete All */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {unreadCount > 0
                  ? tr(
                      language,
                      `មិនទាន់អាន ${unreadCount} សារ`,
                      `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`,
                      `${unreadCount} 条未读通知`
                    )
                  : tr(language, 'បានអានទាំងអស់ ✓', 'All caught up ✓', '全部已读 ✓')}
              </span>

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
                  title={tr(language, 'សម្គាល់ថាបានអានទាំងអស់', 'Mark all as read', '全部标为已读')}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{tr(language, 'អានទាំងអស់', 'Mark All Read', '全部已读')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllWithConfirm}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/70 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title={tr(language, 'លុបការជូនដំណឹងទាំងអស់', 'Delete all notifications', '清空所有通知')}
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
                    'សូមបើកកុងតាក់ខាងលើឡើងវិញ ដើម្បីទទួលបានព័ត៌មានប្រូម៉ូសិន និងការបញ្ចុះតម្លៃពីហាងដៃគូ VIP។',
                    'Turn the switch back on above to receive VIP promotions and discount alerts.',
                    '请开启上方开关，以便接收 VIP 合作餐厅的专属折扣与热门通知。'
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
            filteredNotifications.map(n => {
              const catMeta = getCategoryMeta(n);
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-2 relative ${
                    !n.isRead
                      ? 'bg-emerald-50/75 dark:bg-emerald-950/25 border-emerald-400/90 dark:border-emerald-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/90'
                  }`}
                >
                  {/* Top Row: Category Badge, Read/Unread Status Toggle, Date, & Delete Button */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${catMeta.bgClass}`}>
                        {catMeta.icon}
                        <span>{catMeta.label}</span>
                      </span>

                      {n.discountPercent && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black font-mono">
                          -{n.discountPercent}% OFF
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          toggleNotificationRead(n.id);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          !n.isRead
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                        title={tr(
                          language,
                          n.isRead ? 'ចុចដើម្បីដាក់ថាមិនទាន់អាន' : 'ចុចដើម្បីដាក់ថាបានអាន',
                          n.isRead ? 'Mark as unread' : 'Mark as read',
                          n.isRead ? '标为未读' : '标为已读'
                        )}
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
                        {formatNotificationDate(n.date)}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
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

                  {/* Title — Full text without truncation or subscript clipping */}
                  <h5 className="font-bold text-xs sm:text-[13px] text-[#0F172A] dark:text-white leading-relaxed py-0.5 break-words">
                    {getNotificationTitle(n)}
                  </h5>

                  {/* Message Body */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                    {getNotificationMessage(n)}
                  </p>

                  {/* Action Footer */}
                  {n.targetId && (
                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-[#064E3B] dark:text-emerald-400 font-bold">
                      <span>{tr(language, 'ចុចដើម្បីមើលព័ត៌មានលម្អិត', 'Tap to view details', '点击查看详情')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
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
                  {tr(language, 'គ្មានការជូនដំណឹងក្នុងផ្នែកនេះទេ', 'No notifications found', '暂无相关通知')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {tr(
                    language,
                    'ព័ត៌មានប្រូម៉ូសិន កន្លែងថ្មី និងការជូនដំណឹងប្រព័ន្ធនឹងបង្ហាញនៅទីនេះ។',
                    'Promotions, viral spots, and system updates will appear here.',
                    '餐厅优惠、热门打卡地与系统消息将显示在这里。'
                  )}
                </p>
              </div>
              {notifications.length === 0 && (
                <button
                  type="button"
                  onClick={restoreDefaultNotifications}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#064E3B] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr(language, 'ស្តារការជូនដំណឹងដើមឡើងវិញ', 'Restore Default Notifications', '恢复默认通知列表')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
