import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Bookmark, Plus, Trash2, Heart, Store, 
  ChefHat, Mountain, ChevronRight, Check, ListPlus 
} from 'lucide-react';
import { Wishlist, WishlistItem } from '../types';

export const WishlistsModal: React.FC = () => {
  const { 
    isWishlistsModalOpen, setIsWishlistsModalOpen,
    wishlists, createWishlist, deleteWishlist, addToWishlist, removeFromWishlist,
    targetWishlistItem, setTargetWishlistItem,
    language, setSelectedFood, setSelectedRestaurant, setSelectedDestination,
    foods, restaurants, destinations 
  } = useApp();

  const isKm = language === 'km';
  const [activeListId, setActiveListId] = useState<string>(wishlists[0]?.id || 'wl-default-1');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListEmoji, setNewListEmoji] = useState('📍');

  const activeWishlist = wishlists.find(w => w.id === activeListId) || wishlists[0];

  if (!isWishlistsModalOpen) return null;

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    createWishlist(newListTitle.trim(), newListTitle.trim(), newListEmoji);
    setNewListTitle('');
    setIsCreatingList(false);
  };

  const handleItemClick = (item: WishlistItem) => {
    if (item.type === 'food') {
      const f = foods.find(x => x.id === item.id);
      if (f) {
        setSelectedFood(f);
        setIsWishlistsModalOpen(false);
      }
    } else if (item.type === 'restaurant') {
      const r = restaurants.find(x => x.id === item.id);
      if (r) {
        setSelectedRestaurant(r);
        setIsWishlistsModalOpen(false);
      }
    } else if (item.type === 'destination') {
      const d = destinations.find(x => x.id === item.id);
      if (d) {
        setSelectedDestination(d);
        setIsWishlistsModalOpen(false);
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
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-moul text-sm text-white">
                {isKm ? 'បញ្ជីកន្លែងដែលចង់ទៅ' : 'My Travel & Food Wishlists'}
              </h3>
              <p className="text-[11px] text-emerald-100 font-khmer">
                {isKm ? 'បង្កើតបញ្ជីផ្ទាល់ខ្លួនតាមចំណង់ចំណូលចិត្ត' : 'Personalized wishlists saved to your account'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsWishlistsModalOpen(false);
              setTargetWishlistItem(null);
            }}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Item Prompt if adding */}
        {targetWishlistItem && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between gap-3 shrink-0 font-khmer">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={targetWishlistItem.photoUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                  {isKm ? 'ជ្រើសរើសបញ្ជីដើម្បីរក្សាទុក៖' : 'Save to which wishlist?'}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {isKm ? targetWishlistItem.nameKh : targetWishlistItem.nameEn}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (activeWishlist) {
                  addToWishlist(activeWishlist.id, targetWishlistItem);
                  setTargetWishlistItem(null);
                }
              }}
              className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-bold shadow-xs shrink-0 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isKm ? 'រក្សាទុក' : 'Save Here'}</span>
            </button>
          </div>
        )}

        {/* Wishlists Tabs Row */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 font-khmer">
          {wishlists.map(w => (
            <button
              key={w.id}
              onClick={() => setActiveListId(w.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeListId === w.id
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
              }`}
            >
              <span>{w.emoji}</span>
              <span>{isKm ? w.nameKh : w.nameEn}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeListId === w.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-600 text-slate-500'
              }`}>
                {w.items.length}
              </span>
            </button>
          ))}

          <button
            onClick={() => setIsCreatingList(true)}
            className="p-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-[#064E3B] transition shadow-2xs shrink-0"
            title={isKm ? 'បង្កើតបញ្ជីថ្មី' : 'Create New List'}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Create List Input Modal / Form */}
        {isCreatingList && (
          <form onSubmit={handleCreateList} className="p-3 bg-emerald-50 dark:bg-slate-800 border-b border-emerald-100 dark:border-slate-700 space-y-2 shrink-0 font-khmer">
            <div className="text-xs font-bold text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
              <ListPlus className="w-4 h-4" />
              <span>{isKm ? 'បង្កើតបញ្ជីផ្ទាល់ខ្លួនថ្មី' : 'Create Custom Wishlist'}</span>
            </div>

            <div className="flex gap-2">
              <select
                value={newListEmoji}
                onChange={e => setNewListEmoji(e.target.value)}
                className="w-14 p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-center text-base"
              >
                {['🍽️', '👨‍👩‍👧‍👦', '☀️', '☕', '🏕️', '🏖️', '🍜', '🛵', '❤️'].map(em => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>

              <input
                type="text"
                value={newListTitle}
                onChange={e => setNewListTitle(e.target.value)}
                placeholder={isKm ? 'ឧទាហរណ៍៖ កន្លែងចង់ទៅជាមួយមិត្តភក្តិ...' : 'e.g. Weekend Trips with Friends...'}
                className="flex-1 p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
                autoFocus
              />

              <button
                type="submit"
                className="px-3 py-2 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {isKm ? 'បង្កើត' : 'Add'}
              </button>

              <button
                type="button"
                onClick={() => setIsCreatingList(false)}
                className="px-2 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs"
              >
                {isKm ? 'បោះបង់' : 'Cancel'}
              </button>
            </div>
          </form>
        )}

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar font-khmer">
          {activeWishlist && activeWishlist.items.length > 0 ? (
            activeWishlist.items.map(item => (
              <div
                key={item.id}
                className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:border-emerald-500 transition flex items-center justify-between gap-3"
              >
                <div 
                  onClick={() => handleItemClick(item)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <img src={item.photoUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-[#064E3B] text-[9px] font-bold">
                        {item.type === 'food' ? '🍲 ម្ហូប' : item.type === 'restaurant' ? '🏪 ហាង' : '🌄 ទេសចរណ៍'}
                      </span>
                      {item.provinceKh && (
                        <span className="text-[10px] text-slate-500 truncate">{item.provinceKh}</span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white truncate mt-0.5">
                      {isKm ? item.nameKh : item.nameEn}
                    </h4>
                    {item.priceDisplay && (
                      <span className="text-[11px] font-mono text-[#059669] font-bold">
                        {item.priceDisplay}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removeFromWishlist(activeWishlist.id, item.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition shrink-0"
                  title={isKm ? 'ដកចេញ' : 'Remove'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 space-y-3 font-khmer">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-slate-800 text-[#064E3B] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-slate-700 shadow-xs">
                <Bookmark className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0F172A] dark:text-white">
                  {isKm ? `បញ្ជី «${activeWishlist?.nameKh}» នៅទទេស្អាត` : 'This wishlist is empty'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  {isKm ? 'ចុចលើរូបបេះដូង ❤️ ឬប៊ូតុង "ដាក់ក្នុងបញ្ជី" លើមុខម្ហូប ហាង ឬកន្លែងដើរលេង ដើម្បីរក្សាទុកក្នុងបញ្ជីនេះ។' : 'Tap the heart icon or "Add to Wishlist" on any food, restaurant or destination.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Delete Wishlist if custom */}
        {activeWishlist && !activeWishlist.isDefault && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0 font-khmer">
            <button
              onClick={() => {
                if (window.confirm(isKm ? `តើលោកអ្នកចង់លុបបញ្ជី «${activeWishlist.nameKh}» មែនទេ?` : 'Delete this list?')) {
                  deleteWishlist(activeWishlist.id);
                  setActiveListId(wishlists[0]?.id || 'wl-default-1');
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isKm ? 'លុបបញ្ជីនេះ' : 'Delete this wishlist'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};