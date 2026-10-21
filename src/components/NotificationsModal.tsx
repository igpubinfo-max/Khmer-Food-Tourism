import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Bell, BellOff, Tag, MapPin, Sparkles, 
  CheckCheck, Trash2, ArrowRight, Store, Mountain, ChefHat 
} from 'lucide-react';
import { AppNotification } from '../types';

export const NotificationsModal: React.FC = () => {
  const { 
    isNotificationsModalOpen, setIsNotificationsModalOpen,
    notifications, notificationsEnabled, setNotificationsEnabled,
    markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications,
    language, setSelectedFood, setSelectedRestaurant, setSelectedDestination,
    foods, restaurants, destinations 
  } = useApp();

  const isKm = language === 'km';
  const [filterType, setFilterType] = useState<'all' | 'promo' | 'new_spot'>('all');

  if (!isNotificationsModalOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'promo') return n.type === 'promo' || n.type === 'discount';
    if (filterType === 'new_spot') return n.type === 'new_spot';
    return true;
  });

  const handleNotificationClick = (n: AppNotification) => {
    markNotificationAsRead(n.id);
    if (n.targetType === 'restaurant' && n.targetId) {
      const r = restaurants.find(x => x.id === n.targetId);
      if (r) {
        setSelectedRestaurant(r);
        setIsNotificationsModalOpen(false);
      }
    } else if (n.targetType === 'destination' && n.targetId) {
      const d = destinations.find(x => x.id === n.targetId);
      if (d) {
        setSelectedDestination(d);
        setIsNotificationsModalOpen(false);
      }
    } else if (n.targetType === 'food' && n.targetId) {
      const f = foods.find(x => x.id === n.targetId);
      if (f) {
        setSelectedFood(f);
        setIsNotificationsModalOpen(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#064E3B] to-[#047857] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-moul text-sm text-white">
                {isKm ? 'ការជូនដំណឹងដែលមានប្រយោជន៍' : 'Helpful Notifications'}
              </h3>
              <p className="text-[11px] text-emerald-100 font-khmer">
                {isKm ? 'ប្រូម៉ូសិនហាង កន្លែងថ្មី និងការបញ្ចុះតម្លៃ' : 'Followed shop promos, discounts & viral spots'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationsModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Toggle Switch: «អ្នកប្រើអាចបិទការជូនដំណឹងបាន» */}
        <div className="p-3.5 bg-emerald-50/80 dark:bg-slate-800 border-b border-emerald-100 dark:border-slate-700 flex items-center justify-between shrink-0 font-khmer">
          <div className="flex items-center gap-2">
            {notificationsEnabled ? (
              <Bell className="w-4 h-4 text-emerald-600" />
            ) : (
              <BellOff className="w-4 h-4 text-rose-500" />
            )}
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {isKm ? 'បើក/បិទការជូនដំណឹង' : 'Enable/Disable Notifications'}
              </div>
              <div className="text-[10px] text-slate-500">
                {notificationsEnabled 
                  ? (isKm ? 'កំពុងបើកដំណើរការ (ទទួលបានប្រូម៉ូសិន)' : 'Active (Receiving alerts)')
                  : (isKm ? 'បានបិទការជូនដំណឹង' : 'Muted')}
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
              notificationsEnabled ? 'bg-[#064E3B]' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Filter subtabs & bulk actions */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 shrink-0 font-khmer">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                filterType === 'all'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isKm ? 'ទាំងអស់' : 'All'}
            </button>
            <button
              onClick={() => setFilterType('promo')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                filterType === 'promo'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isKm ? 'ប្រូម៉ូសិន' : 'Promos'}
            </button>
            <button
              onClick={() => setFilterType('new_spot')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                filterType === 'new_spot'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isKm ? 'កន្លែងថ្មី' : 'New Spots'}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={markAllNotificationsAsRead}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 rounded-lg text-[10px] font-bold flex items-center gap-0.5"
              title={isKm ? 'សម្គាល់ថាបានអានទាំងអស់' : 'Mark all read'}
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={clearAllNotifications}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg text-[10px]"
              title={isKm ? 'លុបទាំងអស់' : 'Clear all'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar font-khmer">
          {!notificationsEnabled ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <BellOff className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  {isKm ? 'ការជូនដំណឹងត្រូវបានបិទ' : 'Notifications are muted'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  {isKm ? 'សូមបើកកុងតាក់ខាងលើឡើងវិញ ដើម្បីកុំឱ្យខកខានការបញ្ចុះតម្លៃពីហាងដៃគូ VIP។' : 'Turn the switch back on to receive VIP promotions and discount alerts.'}
                </p>
              </div>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                  !n.isRead
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-[#064E3B] shrink-0">
                      {n.type === 'promo' ? <Tag className="w-3.5 h-3.5" /> :
                       n.type === 'new_spot' ? <Mountain className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </span>
                    <h5 className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                      {isKm ? n.titleKh : n.titleEn}
                    </h5>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">{n.date}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-7">
                  {isKm ? n.messageKh : n.messageEn}
                </p>

                {n.targetId && (
                  <div className="pl-7 pt-1 flex items-center justify-between text-[11px] text-[#064E3B] dark:text-emerald-400 font-bold">
                    <span>{isKm ? 'ចុចដើម្បីមើលលម្អិត' : 'Tap to view'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  {isKm ? 'គ្មានការជូនដំណឹងថ្មីទេ' : 'No notifications'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isKm ? 'ព័ត៌មានប្រូម៉ូសិននឹងបង្ហាញនៅទីនេះ' : 'Promotions & updates will appear here'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};