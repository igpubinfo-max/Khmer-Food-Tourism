import React, { useMemo } from 'react';
import { Restaurant, getRestaurantRatingSummary, getVipFeaturedRotationState, isAdminAccount } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, Phone, Star, Navigation, CheckCircle2, AlertCircle, Share2, Edit2, Trash2, Heart, Crown } from 'lucide-react';
import { sanitizeDialablePhone, resolveRestaurantPhoneOnDemand } from '../services/googlePlacesService';
import { shareRichContent } from '../utils/androidMediaHelper';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';

import type { Language } from '../types';

let _cachedRotRestaurants: Restaurant[] | null = null;
let _cachedRotUsers: any = null;
let _cachedRotSettings: any = null;
let _cachedRotState: ReturnType<typeof getVipFeaturedRotationState> | null = null;

function getCachedVipRotation(
  restaurants: Restaurant[],
  users: any[],
  appSettings: any
): ReturnType<typeof getVipFeaturedRotationState> {
  if (
    _cachedRotState &&
    _cachedRotRestaurants === restaurants &&
    _cachedRotUsers === users &&
    _cachedRotSettings === appSettings
  ) {
    return _cachedRotState;
  }
  _cachedRotRestaurants = restaurants;
  _cachedRotUsers = users;
  _cachedRotSettings = appSettings;
  _cachedRotState = getVipFeaturedRotationState(restaurants, users, appSettings);
  return _cachedRotState;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
}

interface RestaurantCardViewProps {
  restaurant: Restaurant;
  language: Language;
  bookmarked: boolean;
  isAdmin: boolean;
  isTopFeaturedVip: boolean;
  setSelectedRestaurant: (r: Restaurant | null) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  openManageMyVipStore: (id?: string) => void;
  deleteRestaurant: (id: string) => void;
  trackRestaurantView: (id: string) => void;
  trackRestaurantCall: (id: string) => void;
  trackRestaurantMap: (id: string) => void;
  trackRestaurantShare: (id: string) => void;
  toggleBookmark: (id: string) => void;
}

const RestaurantCardView: React.FC<RestaurantCardViewProps> = React.memo(({
  restaurant,
  language,
  bookmarked,
  isAdmin,
  isTopFeaturedVip,
  setSelectedRestaurant,
  showToast,
  openManageMyVipStore,
  deleteRestaurant,
  trackRestaurantView,
  trackRestaurantCall,
  trackRestaurantMap,
  trackRestaurantShare,
  toggleBookmark,
}) => {
  const isKm = language === 'km';
  const ratingSummary = getRestaurantRatingSummary(restaurant);
  const loc = useMemo(() => getLocalizedRestaurant(restaurant, language), [restaurant, language]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackRestaurantShare(restaurant.id);
    shareRichContent(
      {
        title: loc.name,
        nameKh: loc.name,
        nameEn: loc.name,
        description: loc.description,
        location: `${loc.address} (${loc.province})`,
        phone: restaurant.phone,
        signatureDishes: loc.signatureDishes,
        photoUrl: restaurant.photoUrl,
        mapUrl: restaurant.mapUrl,
        itemType: 'restaurant',
        itemId: restaurant.id,
        isKm,
      },
      showToast
    );
  };

  return (
    <div 
      onClick={() => {
        setSelectedRestaurant(restaurant);
      }}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '280px' }}
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-colors duration-150 cursor-pointer flex flex-col border border-slate-200/90 dark:border-slate-700/80"
    >
      {/* Cover image */}
      <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img 
          src={
            restaurant.photoUrl && !restaurant.photoUrl.startsWith('/foods/') && !restaurant.photoUrl.startsWith('/restaurants/')
              ? restaurant.photoUrl
              : restaurant.profileImage && !restaurant.profileImage.startsWith('/foods/') && !restaurant.profileImage.startsWith('/restaurants/')
              ? restaurant.profileImage
              : '/Shop/rest-1.jpg'
          } 
          alt={loc.name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/Shop/rest-1.jpg';
          }}
        />

        {/* Top Bar: Left (Featured + Province) & Right (Verification + Price) with proper flex separation */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-start justify-between gap-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto max-w-[60%]">
            {isTopFeaturedVip && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border border-white/80 shadow-md flex items-center gap-1 font-khmer whitespace-nowrap shrink-0">
                <Crown className="w-3 h-3 fill-slate-950 text-slate-950 shrink-0" />
                <span>{tr(language, 'ហាង VIP មុខគេ', 'Top Featured VIP', '置顶推荐 VIP')}</span>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#064E3B]/95 text-emerald-100 border border-emerald-400/30 shadow-xs font-khmer whitespace-nowrap truncate max-w-full">
              {loc.province}
            </span>
          </div>

          {/* Verification & Price Level Badge */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end pointer-events-auto shrink-0">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs flex items-center gap-1 font-khmer whitespace-nowrap shrink-0 ${
              restaurant.isVerified
                ? 'bg-[#059669] text-white border border-emerald-300/40'
                : 'bg-slate-800/95 text-slate-200 border border-slate-600/40'
            }`}>
              {restaurant.isVerified ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-white shrink-0" />
                  <span>{tr(language, 'ផ្ទៀងផ្ទាត់រួច', 'Verified', '已认证')}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-slate-300 shrink-0" />
                  <span>{tr(language, 'មិនទាន់ផ្ទៀងផ្ទាត់', 'Unverified', '未认证')}</span>
                </>
              )}
            </span>


          </div>
        </div>

        {/* Bottom-Left Admin Actions Bar (Edit & Delete) — Dedicated row so labels never overlap */}
        {isAdmin && (
          <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                (window as any).__kft_manage_initial_tab = 'info';
                openManageMyVipStore(restaurant.id);
              }}
              className="px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-md flex items-center gap-1.5 transition active:scale-95 font-khmer cursor-pointer whitespace-nowrap shrink-0 border border-amber-300/80"
              title={tr(language, 'គ្រប់គ្រងហាងនេះ (Admin)', 'Manage Shop (Admin)', '管理店铺（管理员）')}
            >
              <Edit2 className="w-3.5 h-3.5 shrink-0" />
              <span>{tr(language, 'កែប្រែ', 'Edit', '编辑')}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteRestaurant(restaurant.id);
              }}
              className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 font-khmer cursor-pointer whitespace-nowrap shrink-0 border border-rose-400/50"
              title={tr(language, 'លុបហាងនេះ (Admin)', 'Delete Shop (Admin)', '删除店铺（管理员）')}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{tr(language, 'លុប', 'Delete', '删除')}</span>
            </button>
          </div>
        )}

        {/* Reference Image Label (រូបភាពយោង) */}
        <div className="absolute bottom-2 right-2.5 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-xs text-[8px] sm:text-[9px] text-white/85 font-khmer border border-white/15 select-none pointer-events-none shadow-2xs z-10">
          <span>{tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A] dark:text-white group-hover:text-[#059669] transition line-clamp-2 leading-snug font-khmer">
              {loc.name}
            </h3>
          </div>

          <div className="flex items-start gap-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-2.5 line-clamp-1 font-khmer">
            <MapPin className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
            <span>{loc.address}</span>
          </div>

          {/* Signature dishes tags */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {loc.signatureDishes.slice(0, 2).map((dish, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-slate-600/60 font-khmer">
                🍽️ {dish}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom actions — Customer Rating strictly separated from VIP status & Verification */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
          {ratingSummary.hasReviews ? (
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm" title={tr(language, 'ការវាយតម្លៃពិតប្រាកដពីអតិថិជន', 'Genuine customer rating', '真实顾客评分')}>
              <Star className="w-4 h-4 fill-current text-amber-500 shrink-0" />
              <span>{ratingSummary.averageRating.toFixed(1)}</span>
              <span className="text-slate-400 text-xs">({ratingSummary.reviewCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-khmer" title={tr(language, 'មិនទាន់មានអតិថិជនដាក់ផ្កាយវាយតម្លៃនៅឡើយទេ', 'No customer ratings yet', '暂无顾客评分')}>
              <Star className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              <span>{tr(language, 'មិនទាន់មានការវាយតម្លៃ', 'No ratings yet', '暂无评分')}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                trackRestaurantCall(restaurant.id);
                const dialable = sanitizeDialablePhone(restaurant.phone);
                if (dialable) {
                  window.location.href = `tel:${dialable}`;
                  return;
                }
                const found = await resolveRestaurantPhoneOnDemand(
                  restaurant.nameKh || restaurant.nameEn,
                  restaurant.provinceKh
                );
                const cleanFound = sanitizeDialablePhone(found);
                if (cleanFound) {
                  window.location.href = `tel:${cleanFound}`;
                  return;
                }
                showToast(
                  tr(
                    language,
                    'ហាងនេះមិនបានដាក់លេខទូរស័ព្ទលើផែនទីទេ — កំពុងបើកទីតាំងលើ Google Maps!',
                    'Phone number not listed on map — opening Google Maps!',
                    '该店铺未在地图上标注电话 — 正在打开 Google 地图！'
                  ),
                  'warning'
                );
                if (restaurant.mapUrl) {
                  window.open(restaurant.mapUrl, '_blank');
                }
              }}
              className="p-1.5 rounded-lg bg-emerald-50 text-[#064E3B] hover:bg-[#064E3B] hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 transition"
              title={tr(language, 'ហៅទូរស័ព្ទទៅហាង', 'Call restaurant', '拨打餐厅电话')}
            >
              <Phone className="w-3.5 h-3.5" />
            </button>

            <a
              href={restaurant.mapUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                trackRestaurantMap(restaurant.id);
              }}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:text-blue-300 transition"
              title={tr(language, 'មើលលើ Google Maps', 'Open in Google Maps', '在 Google 地图中查看')}
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(restaurant.id);
              }}
              aria-pressed={bookmarked}
              className={`p-1.5 rounded-lg transition ${
                bookmarked
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
              title={tr(language, 'រក្សាទុកជាចំណូលចិត្ត', 'Save to favorites', '加入收藏')}
            >
              <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 transition"
              title={tr(language, 'ចែករំលែកតំណភ្ជាប់ហាង', 'Share restaurant', '分享餐厅链接')}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.restaurant === next.restaurant &&
  prev.language === next.language &&
  prev.bookmarked === next.bookmarked &&
  prev.isAdmin === next.isAdmin &&
  prev.isTopFeaturedVip === next.isTopFeaturedVip
);

const RestaurantCardInner: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const { 
    language, setSelectedRestaurant, showToast, currentUser, restaurants, users, appSettings,
    openManageMyVipStore, deleteRestaurant,
    trackRestaurantView, trackRestaurantCall, trackRestaurantMap, trackRestaurantShare,
    isBookmarked, toggleBookmark
  } = useApp();
  const bookmarked = isBookmarked(restaurant.id);
  const isAdmin = isAdminAccount(currentUser);
  const isTopFeaturedVip = useMemo(() => {
    const rotation = getCachedVipRotation(restaurants, users, appSettings);
    return rotation.currentlyFeaturedIds.has(restaurant.id);
  }, [restaurants, users, appSettings, restaurant.id]);
  return (
    <RestaurantCardView
      restaurant={restaurant}
      language={language}
      bookmarked={bookmarked}
      isAdmin={isAdmin}
      isTopFeaturedVip={isTopFeaturedVip}
      setSelectedRestaurant={setSelectedRestaurant}
      showToast={showToast}
      openManageMyVipStore={openManageMyVipStore}
      deleteRestaurant={deleteRestaurant}
      trackRestaurantView={trackRestaurantView}
      trackRestaurantCall={trackRestaurantCall}
      trackRestaurantMap={trackRestaurantMap}
      trackRestaurantShare={trackRestaurantShare}
      toggleBookmark={toggleBookmark}
    />
  );
};

export const RestaurantCard = React.memo(RestaurantCardInner);
