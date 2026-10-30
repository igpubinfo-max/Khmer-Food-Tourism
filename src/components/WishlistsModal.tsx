import React, { useEffect, useMemo, useState } from 'react';
import { 
  X, Bookmark, Plus, Trash2, Check, ListPlus, Heart, ExternalLink 
} from 'lucide-react';
import { WishlistItem } from '../types';
import { useApp } from '../context/AppContext';
import { tr, translateProvince } from '../utils/i18n';
import { translateDynamicTextToZh, sanitizeStrictLanguageText } from '../utils/zhDynamicTranslator';
import { getLocalSmartCache, openExternalPlaceInGoogleMaps } from '../services/googlePlacesService';

const DEFAULT_WISHLIST_ZH_NAMES: Record<string, string> = {
  'Places to Visit': '想去的景点',
  'Must-Try Dishes': '必尝的高棉美食',
  'Favorite Restaurants': '收藏的美味餐厅',
};

const SAVED_BOOKMARKS_LIST_ID = 'saved-bookmarks';

export const WishlistsModal: React.FC = () => {
  const { 
    isWishlistsModalOpen, setIsWishlistsModalOpen,
    wishlists, createWishlist, deleteWishlist, addToWishlist, removeFromWishlist,
    targetWishlistItem, setTargetWishlistItem,
    bookmarks, toggleBookmark,
    language, setSelectedFood, setSelectedRestaurant, setSelectedDestination,
    foods, restaurants, destinations 
  } = useApp();

  const [activeListId, setActiveListId] = useState<string>(SAVED_BOOKMARKS_LIST_ID);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListEmoji, setNewListEmoji] = useState('📍');

  // When opening with a targetWishlistItem ("Add to Wishlist"), select the first custom/default wishlist;
  // when opening directly from "ចំណូលចិត្តរបស់ខ្ញុំ" (My Favorites), default to 'saved-bookmarks'.
  useEffect(() => {
    if (!isWishlistsModalOpen) return;
    if (targetWishlistItem) {
      setActiveListId(wishlists[0]?.id || 'wl-default-1');
    } else {
      setActiveListId(SAVED_BOOKMARKS_LIST_ID);
    }
  }, [isWishlistsModalOpen, targetWishlistItem, wishlists]);

  // Resolve all bookmarked IDs into displayable items (matching foods, restaurants, destinations, custom wishlists, or cached places)
  const bookmarkedItems = useMemo<WishlistItem[]>(() => {
    if (!bookmarks || bookmarks.length === 0) return [];
    const smartCache = getLocalSmartCache();
    const allWishlistItems = wishlists.flatMap(w => w.items);

    return bookmarks
      .map((bookmarkId): WishlistItem | null => {
        const food = foods.find(f => f.id === bookmarkId);
        if (food) {
          return {
            id: food.id,
            type: 'food',
            nameKh: food.nameKh,
            nameEn: food.nameEn,
            photoUrl: food.photoUrl,
            provinceKh: food.provinceKh,
            priceDisplay: food.calories ? `${food.calories} kcal` : undefined,
            addedAt: '',
          };
        }
        const restaurant = restaurants.find(r => r.id === bookmarkId);
        if (restaurant) {
          return {
            id: restaurant.id,
            type: 'restaurant',
            nameKh: restaurant.nameKh,
            nameEn: restaurant.nameEn,
            photoUrl: restaurant.photoUrl,
            provinceKh: restaurant.provinceKh,
            priceDisplay: undefined,
            addedAt: '',
          };
        }
        const destination = destinations.find(d => d.id === bookmarkId);
        if (destination) {
          return {
            id: destination.id,
            type: 'destination',
            nameKh: destination.nameKh,
            nameEn: destination.nameEn,
            photoUrl: destination.photoUrl,
            provinceKh: destination.provinceKh,
            priceDisplay: undefined,
            addedAt: '',
          };
        }
        const fromWishlist = allWishlistItems.find(item => item.id === bookmarkId);
        if (fromWishlist) return fromWishlist;

        const cachedPlace = smartCache.find(
          p => p.placeId === bookmarkId || `gplace-${p.placeId}` === bookmarkId
        );
        if (cachedPlace) {
          return {
            id: bookmarkId,
            type: cachedPlace.category === 'tourism' ? 'destination' : 'restaurant',
            nameKh: cachedPlace.nameKh || cachedPlace.nameEn,
            nameEn: cachedPlace.nameEn || cachedPlace.nameKh,
            photoUrl: cachedPlace.photoUrl,
            provinceKh: cachedPlace.provinceKh || cachedPlace.province,
            priceDisplay: undefined,
            addedAt: '',
          };
        }
        return null;
      })
      .filter((item): item is WishlistItem => item !== null);
  }, [bookmarks, foods, restaurants, destinations, wishlists]);

  const isSavedBookmarksTab = activeListId === SAVED_BOOKMARKS_LIST_ID;
  const activeWishlist = isSavedBookmarksTab
    ? null
    : wishlists.find(w => w.id === activeListId) || wishlists[0];

  const displayedItems: WishlistItem[] = isSavedBookmarksTab
    ? bookmarkedItems
    : activeWishlist?.items || [];

  if (!isWishlistsModalOpen) return null;

  const getWishlistDisplayName = (w: { nameKh: string; nameEn: string }) => {
    if (language === 'km') return sanitizeStrictLanguageText(w.nameKh, 'km');
    if (language === 'zh') return sanitizeStrictLanguageText(DEFAULT_WISHLIST_ZH_NAMES[w.nameEn] || translateDynamicTextToZh(w.nameEn) || w.nameEn, 'zh');
    return sanitizeStrictLanguageText(w.nameEn, 'en');
  };

  const getWishlistItemDisplayName = (item: WishlistItem) => {
    if (language === 'km') return sanitizeStrictLanguageText(item.nameKh, 'km');
    if (language === 'zh') return sanitizeStrictLanguageText(translateDynamicTextToZh(item.nameEn || item.nameKh) || item.nameEn || item.nameKh, 'zh');
    return sanitizeStrictLanguageText(item.nameEn || item.nameKh, 'en');
  };

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
        return;
      }
    } else if (item.type === 'restaurant') {
      const r = restaurants.find(x => x.id === item.id);
      if (r) {
        setSelectedRestaurant(r);
        setIsWishlistsModalOpen(false);
        return;
      }
    } else if (item.type === 'destination') {
      const d = destinations.find(x => x.id === item.id);
      if (d) {
        setSelectedDestination(d);
        setIsWishlistsModalOpen(false);
        return;
      }
    }
    // Fallback for external cached Google Maps place
    const smartCache = getLocalSmartCache();
    const cachedPlace = smartCache.find(
      p => p.placeId === item.id || `gplace-${p.placeId}` === item.id
    );
    if (cachedPlace) {
      openExternalPlaceInGoogleMaps(cachedPlace);
      setIsWishlistsModalOpen(false);
    }
  };

  const handleRemoveItem = (item: WishlistItem) => {
    if (isSavedBookmarksTab) {
      toggleBookmark(item.id);
    } else if (activeWishlist) {
      removeFromWishlist(activeWishlist.id, item.id);
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
                {tr(language, 'ចំណូលចិត្ត និងបញ្ជីដែលបានរក្សាទុក', 'My Favorites & Wishlists', '我的收藏与心愿单')}
              </h3>
              <p className="text-[11px] text-emerald-100 font-khmer">
                {tr(language, 'មុខម្ហូប ហាង និងកន្លែងដើរលេងដែលអ្នកបានរក្សាទុក ❤️', 'Your saved dishes, shops & travel destinations', '您收藏的美食、餐厅与旅行景点 ❤️')}
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
                  {tr(language, 'ជ្រើសរើសបញ្ជីដើម្បីរក្សាទុក៖', 'Save to which wishlist?', '选择要保存到的心愿单：')}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {getWishlistItemDisplayName(targetWishlistItem)}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (isSavedBookmarksTab) {
                  if (!bookmarks.includes(targetWishlistItem.id)) {
                    toggleBookmark(targetWishlistItem.id);
                  }
                  setTargetWishlistItem(null);
                } else if (activeWishlist) {
                  addToWishlist(activeWishlist.id, targetWishlistItem);
                  setTargetWishlistItem(null);
                }
              }}
              className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-bold shadow-xs shrink-0 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{tr(language, 'រក្សាទុក', 'Save Here', '保存在此')}</span>
            </button>
          </div>
        )}

        {/* Wishlists Tabs Row */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 font-khmer">
          {/* Primary Saved Favorites / Bookmarks Tab */}
          <button
            onClick={() => setActiveListId(SAVED_BOOKMARKS_LIST_ID)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              isSavedBookmarksTab
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSavedBookmarksTab ? 'fill-current text-white' : 'text-rose-500 fill-current'}`} />
            <span>{tr(language, 'ចំណូលចិត្តរបស់ខ្ញុំ', 'My Favorites', '我的收藏')}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              isSavedBookmarksTab ? 'bg-white/25 text-white' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300'
            }`}>
              {bookmarkedItems.length}
            </span>
          </button>

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
              <span>{getWishlistDisplayName(w)}</span>
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
            title={tr(language, 'បង្កើតបញ្ជីថ្មី', 'Create New List', '新建心愿单')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Create List Input Modal / Form */}
        {isCreatingList && (
          <form onSubmit={handleCreateList} className="p-3 bg-emerald-50 dark:bg-slate-800 border-b border-emerald-100 dark:border-slate-700 space-y-2 shrink-0 font-khmer">
            <div className="text-xs font-bold text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
              <ListPlus className="w-4 h-4" />
              <span>{tr(language, 'បង្កើតបញ្ជីផ្ទាល់ខ្លួនថ្មី', 'Create Custom Wishlist', '新建自定义心愿单')}</span>
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
                placeholder={tr(language, 'ឧទាហរណ៍៖ កន្លែងចង់ទៅជាមួយមិត្តភក្តិ...', 'e.g. Weekend Trips with Friends...', '例如：周末与朋友必去清单...')}
                className="flex-1 p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
                autoFocus
              />

              <button
                type="submit"
                className="px-3 py-2 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {tr(language, 'បង្កើត', 'Add', '创建')}
              </button>

              <button
                type="button"
                onClick={() => setIsCreatingList(false)}
                className="px-2 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs"
              >
                {tr(language, 'បោះបង់', 'Cancel', '取消')}
              </button>
            </div>
          </form>
        )}

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar font-khmer">
          {displayedItems.length > 0 ? (
            displayedItems.map(item => (
              <div
                key={item.id}
                className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:border-emerald-500 transition flex items-center justify-between gap-3"
              >
                <div 
                  onClick={() => handleItemClick(item)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-slate-700 flex items-center justify-center shrink-0 text-xl">
                      {item.type === 'food' ? '🍲' : item.type === 'restaurant' ? '🏪' : '🌄'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-[#064E3B] text-[9px] font-bold">
                        {item.type === 'food'
                          ? tr(language, '🍲 ម្ហូប', '🍲 Dish', '🍲 美食')
                          : item.type === 'restaurant'
                          ? tr(language, '🏪 ហាង', '🏪 Shop', '🏪 餐厅')
                          : tr(language, '🌄 ទេសចរណ៍', '🌄 Spot', '🌄 景点')}
                      </span>
                      {item.provinceKh && (
                        <span className="text-[10px] text-slate-500 truncate">
                          {translateProvince(item.provinceKh, language)}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white truncate mt-0.5 flex items-center gap-1">
                      <span className="truncate">{getWishlistItemDisplayName(item)}</span>
                      <ExternalLink className="w-3 h-3 text-emerald-600 shrink-0 opacity-70" />
                    </h4>
                    {item.priceDisplay &&
                      item.type === 'food' &&
                      (item.priceDisplay.includes('គីឡូកាឡូរី') || item.priceDisplay.includes('kcal')) && (
                      <span className="text-[11px] font-mono text-[#059669] font-bold">
                        {item.priceDisplay}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveItem(item)}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition shrink-0"
                  title={tr(language, 'ដកចេញ', 'Remove', '移除')}
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
                  {isSavedBookmarksTab
                    ? tr(
                        language,
                        'បញ្ជីចំណូលចិត្តរបស់ខ្ញុំនៅទទេស្អាត',
                        'Your Favorites list is empty',
                        '您的收藏列表暂无内容'
                      )
                    : tr(
                        language,
                        `បញ្ជី «${activeWishlist?.nameKh}» នៅទទេស្អាត`,
                        'This wishlist is empty',
                        `「${activeWishlist ? getWishlistDisplayName(activeWishlist) : ''}」心愿单暂无内容`
                      )}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  {tr(
                    language,
                    'ចុចលើរូបបេះដូង ❤️ ឬប៊ូតុង "ដាក់ក្នុងបញ្ជី" លើមុខម្ហូប ហាង ឬកន្លែងដើរលេង ដើម្បីរក្សាទុកក្នុងបញ្ជីនេះ។',
                    'Tap the heart icon or "Add to Wishlist" on any food, restaurant or destination.',
                    '点击任意菜品、餐厅或景点上的爱心 ❤️ 或“加入心愿单”按钮即可收藏到此列表。'
                  )}
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
                if (window.confirm(tr(language, `តើលោកអ្នកចង់លុបបញ្ជី «${activeWishlist.nameKh}» មែនទេ?`, 'Delete this list?', '确定要删除此心愿单吗？'))) {
                  deleteWishlist(activeWishlist.id);
                  setActiveListId(SAVED_BOOKMARKS_LIST_ID);
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{tr(language, 'លុបបញ្ជីនេះ', 'Delete this wishlist', '删除此心愿单')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
