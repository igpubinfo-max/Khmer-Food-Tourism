import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, MapPin, Phone, Star, Clock, ExternalLink, Compass,
  Send, Share2, CheckCircle2, AlertCircle, Copy, Camera, Bookmark,
  BarChart3, Video, Crown, Edit2, MessageSquare, Trash2
} from 'lucide-react';
import {
  isUserVipActive,
  getRestaurantRatingSummary,
  getRestaurantGoogleExternalUrl,
  openRestaurantGoogleExternal,
  isPlaceLocationVerified,
  sanitizeRestaurantShopPhoto,
} from '../types';
import { RestaurantImageModal } from './RestaurantImageModal';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant, translateDynamicTextToZh } from '../utils/zhDynamicTranslator';
import {
  sanitizeDialablePhone,
  formatDisplayPhone,
  resolveRestaurantPhoneOnDemand,
} from '../services/googlePlacesService';
import {
  shareRichContent,
  formatRichShareText,
  copyTextNativeOrWeb,
} from '../utils/androidMediaHelper';

export const RestaurantDetailModal: React.FC = () => {
  const { 
    selectedRestaurant, 
    setSelectedRestaurant, 
    language, 
    showToast,
    currentUser,
    setManagingRestaurant,
    setIsManageMenuModalOpen,
    openManageMyVipStore,
    addRestaurantReview,
    trackRestaurantView,
    trackRestaurantCall,
    trackRestaurantMap,
    trackRestaurantShare,
    updateRestaurant,
    deleteRestaurant,
    openAddToWishlist,
    openUpgradeVipModal,
  } = useApp();

  const [activePhoto, setActivePhoto] = useState<string>('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [userReviewStars, setUserReviewStars] = useState<number>(5);
  const [userReviewComment, setUserReviewComment] = useState<string>('');

  useEffect(() => {
    if (selectedRestaurant) {
      setActivePhoto(selectedRestaurant.photoUrl);
      trackRestaurantView(selectedRestaurant.id);
      if (!sanitizeDialablePhone(selectedRestaurant.phone)) {
        resolveRestaurantPhoneOnDemand(
          selectedRestaurant.nameKh || selectedRestaurant.nameEn,
          selectedRestaurant.provinceKh
        ).then((foundPhone) => {
          if (foundPhone) {
            const updated = { ...selectedRestaurant, phone: foundPhone };
            setSelectedRestaurant(updated);
            const canPersist =
              currentUser?.role === 'admin' ||
              currentUser?.id === 'admin-authorized-single' ||
              Boolean(currentUser?.id && selectedRestaurant.ownerId === currentUser.id);
            if (canPersist) {
              updateRestaurant(updated);
            }
          }
        });
      }
    }
  }, [selectedRestaurant?.id]);

  if (!selectedRestaurant) return null;

  const isKm = language === 'km';
  const loc = getLocalizedRestaurant(selectedRestaurant, language);
  const isOwner = Boolean(currentUser?.id && selectedRestaurant.ownerId === currentUser.id);
  const isAdmin = 
    currentUser?.role === 'admin' || 
    currentUser?.id === 'admin-authorized-single' || 
    currentUser?.username === 'admin' || 
    currentUser?.username === 'cheasavuth';
  const isApprovedVip = isUserVipActive(currentUser);
  const canEditShop = Boolean(isAdmin || (isOwner && isApprovedVip));
  const dialablePhone = sanitizeDialablePhone(selectedRestaurant.phone);
  const displayPhone = formatDisplayPhone(selectedRestaurant.phone);
  const ratingSummary = getRestaurantRatingSummary(selectedRestaurant);

  const handleOpenPhotoEditor = () => {
    if (!isAdmin) {
      showToast(
        tr(
          language,
          '⚠️ មានតែអ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) ប៉ុណ្ណោះដែលអាចប្តូរ ឬផ្ទុកឡើងរូបភាពហាងបាន!',
          '⚠️ Only an Administrator can upload or replace shop photos!',
          '⚠️ 仅限系统管理员 (Admin) 上传或更换店铺图片！'
        ),
        'warning'
      );
      return;
    }
    setIsImageModalOpen(true);
  };

  const handleCallRestaurant = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    trackRestaurantCall(selectedRestaurant.id);
    if (dialablePhone) {
      window.location.href = `tel:${dialablePhone}`;
      return;
    }
    showToast(
      isKm
        ? 'កំពុងស្វែងរកលេខទូរស័ព្ទហាងពី Google Maps...'
        : 'Checking Google Maps for restaurant phone number...',
      'info'
    );
    const foundPhone = await resolveRestaurantPhoneOnDemand(
      selectedRestaurant.nameKh || selectedRestaurant.nameEn,
      selectedRestaurant.provinceKh
    );
    const cleanFound = sanitizeDialablePhone(foundPhone);
    if (cleanFound) {
      const updated = { ...selectedRestaurant, phone: foundPhone };
      setSelectedRestaurant(updated);
      updateRestaurant(updated);
      window.location.href = `tel:${cleanFound}`;
      return;
    }
    if (isPlaceLocationVerified(selectedRestaurant)) {
      showToast(
        isKm
          ? 'ហាងនេះមិនបានដាក់លេខទូរស័ព្ទលើផែនទីទេ — កំពុងបើកទីតាំងលើ Google Maps ជូនលោកអ្នក!'
          : 'This shop has not listed a phone number on the map — opening Google Maps!',
        'warning'
      );
    }
    openRestaurantGoogleExternal(selectedRestaurant, 'maps');
  };

  const shopProfilePic = selectedRestaurant.profileImage || selectedRestaurant.photoUrl;
  const shopPhotosList = Array.from(
    new Set([
      shopProfilePic,
      ...(selectedRestaurant.galleryPhotos || []),
    ])
  ).filter((u): u is string => Boolean(u));

  const categorizedPhotos = shopPhotosList.map((url) => ({
    url,
    category: 'shop' as const,
    foodIndex: 0,
  }));

  const allPhotos = categorizedPhotos.map((item) => item.url);

  const verifiedExternalMapUrl = getRestaurantGoogleExternalUrl(selectedRestaurant, 'maps');

  const sharePayload = {
    title: isKm ? selectedRestaurant.nameKh : selectedRestaurant.nameEn,
    nameKh: selectedRestaurant.nameKh,
    nameEn: selectedRestaurant.nameEn,
    description: isKm ? selectedRestaurant.descriptionKh : selectedRestaurant.descriptionEn,
    location: isKm
      ? `${selectedRestaurant.addressKh} (${selectedRestaurant.provinceKh})`
      : `${selectedRestaurant.addressEn} (${selectedRestaurant.provinceEn})`,
    phone: displayPhone || selectedRestaurant.phone,
    signatureDishes: selectedRestaurant.signatureDishesKh,
    photoUrl: activePhoto || selectedRestaurant.photoUrl,
    mapUrl: verifiedExternalMapUrl,
    itemType: 'restaurant' as const,
    itemId: selectedRestaurant.id,
    isKm,
  };

  const handleShare = () => {
    trackRestaurantShare(selectedRestaurant.id);
    shareRichContent(sharePayload, showToast);
  };

  const handleShareTelegram = () => {
    trackRestaurantShare(selectedRestaurant.id);
    const { fullText, directLink } = formatRichShareText(sharePayload);
    const encUrl = encodeURIComponent(verifiedExternalMapUrl || directLink);
    const encText = encodeURIComponent(fullText);
    window.open(`https://t.me/share/url?url=${encUrl}&text=${encText}`, '_blank');
  };

  const handleShareFacebook = () => {
    trackRestaurantShare(selectedRestaurant.id);
    const { fullText, directLink } = formatRichShareText(sharePayload);
    const encUrl = encodeURIComponent(verifiedExternalMapUrl || directLink);
    const encQuote = encodeURIComponent(fullText);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encUrl}&quote=${encQuote}`, '_blank');
  };

  const handleCopyLink = async () => {
    trackRestaurantShare(selectedRestaurant.id);
    const { fullText, title } = formatRichShareText(sharePayload);
    const ok = await copyTextNativeOrWeb(fullText, title);
    if (ok) {
      showToast(
        tr(
          language,
          'បានចម្លងឈ្មោះ ពិពណ៌នា ទីតាំង និងតំណភ្ជាប់ហាងជោគជ័យ!',
          'Restaurant details & link copied to clipboard!',
          '已成功复制餐厅名称、介绍、地址与链接！'
        ),
        'success'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setSelectedRestaurant(null)}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg h-[90vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200/80 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => setSelectedRestaurant(null)}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white shadow pointer-events-auto transition active:scale-90"
            title={tr(language, 'បិទ', 'Close', '关闭')}
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => openAddToWishlist({
                id: selectedRestaurant.id,
                type: 'restaurant',
                nameKh: selectedRestaurant.nameKh,
                nameEn: selectedRestaurant.nameEn,
                photoUrl: selectedRestaurant.photoUrl,
                categoryKh: selectedRestaurant.provinceKh,
                provinceKh: selectedRestaurant.provinceKh,
                rating: selectedRestaurant.rating,
              })}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white shadow transition active:scale-95 border border-white/20"
              title={tr(language, 'ដាក់ក្នុងបញ្ជីចង់ទៅ', 'Add to Wishlist', '加入心愿单')}
            >
              <Bookmark className="w-4 h-4 text-amber-300" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_manage_initial_tab = 'info';
                  setManagingRestaurant(selectedRestaurant);
                  setIsManageMenuModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow transition active:scale-95 font-khmer border border-white/50 cursor-pointer"
                title={tr(language, 'កែប្រែព័ត៌មាន & រូបភាពហាង (Admin)', 'Edit Store Details & Photos (Admin)', '编辑店铺信息与照片（管理员）')}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{tr(language, 'កែប្រែហាង (Edit)', 'Edit Store', '编辑店铺')}</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => deleteRestaurant(selectedRestaurant.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow transition active:scale-95 font-khmer border border-white/40 cursor-pointer"
                title={tr(language, 'លុបហាងនេះ (Admin)', 'Delete Shop (Admin)', '删除店铺（管理员）')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{tr(language, 'លុបហាង', 'Delete', '删除')}</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenPhotoEditor}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold shadow transition active:scale-95 font-khmer border border-white/20"
                title={tr(language, 'ប្តូររូបភាពហាង (Admin)', 'Change Shop Photo (Admin)', '更换店铺照片（管理员）')}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-300" />
                <span>{tr(language, 'ប្តូររូបភាព', 'Change Photo', '更换照片')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCallRestaurant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow transition active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{tr(language, 'ហៅទូរស័ព្ទ', 'Call', '致电')}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 no-scrollbar pb-[calc(var(--kft-safe-bottom,0px)+24px)]">
          {/* Hero Image or Clean Shop Icon Banner (matching Hotel Detail Modal) */}
          {(() => {
            const rawHeroCandidate = (
              activePhoto ||
              selectedRestaurant.photoUrl ||
              selectedRestaurant.profileImage ||
              ''
            ).trim();
            const cleanCandidate = sanitizeRestaurantShopPhoto(
              selectedRestaurant.id,
              rawHeroCandidate
            );

            if (cleanCandidate) {
              return (
                <div className="relative h-64 sm:h-72 w-full bg-slate-800">
                  <ShopAvatar
                    restaurant={{
                      ...selectedRestaurant,
                      photoUrl: cleanCandidate,
                      profileImage: cleanCandidate,
                    }}
                    alt={loc.name}
                    className="w-full h-full rounded-none border-0"
                    imgClassName="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  <div className="absolute bottom-3.5 left-4 right-24 text-white">
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#064E3B] text-emerald-100 border border-emerald-400/40 shadow font-khmer">
                        {loc.province}
                      </span>
                      {ratingSummary.hasReviews && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow flex items-center gap-1 font-khmer">
                          <Star className="w-3 h-3 fill-current text-slate-950" />
                          <span>{ratingSummary.averageRating.toFixed(1)} ({ratingSummary.reviewCount})</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold font-moul leading-snug drop-shadow text-white">
                      {loc.name}
                    </h2>
                  </div>
                </div>
              );
            }

            return (
              <div className="relative pt-16 pb-5 px-4 sm:px-6 bg-gradient-to-br from-[#064E3B] via-[#093228] to-slate-900 border-b border-emerald-500/30 flex items-center gap-3.5">
                <ShopAvatar
                  restaurant={{
                    ...selectedRestaurant,
                    photoUrl: '',
                    profileImage: '',
                  }}
                  alt={loc.name}
                  className="w-14 h-14 rounded-2xl border border-emerald-400/40 shadow-md shrink-0"
                />
                <div className="min-w-0 flex-1 text-white">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 inline-block font-khmer">
                      {loc.province}
                    </span>
                    {ratingSummary.hasReviews && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1 font-khmer">
                        <Star className="w-3 h-3 fill-current text-slate-950" />
                        <span>{ratingSummary.averageRating.toFixed(1)} ({ratingSummary.reviewCount})</span>
                      </span>
                    )}
                    {selectedRestaurant.priceLevel && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 font-mono">
                        {selectedRestaurant.priceLevel}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold font-moul leading-snug text-white">
                    {loc.name}
                  </h2>
                </div>
              </div>
            );
          })()}

          <div className="p-4 sm:p-6 space-y-5">
            {/* Direct Google Maps, Directions & Call Action Buttons (matching Hotel Detail Modal) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(selectedRestaurant.websiteUrl || selectedRestaurant.googleMapsMeta?.websiteUri) && (
                <a
                  href={selectedRestaurant.websiteUrl || selectedRestaurant.googleMapsMeta?.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:col-span-2 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#064E3B] via-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-98 cursor-pointer font-khmer border border-emerald-400/30"
                >
                  <span>🏪</span>
                  <span>
                    {tr(
                      language,
                      'គេហទំព័រផ្លូវការរបស់ហាង (Official Website)',
                      'Official Shop Website',
                      '店铺官方网站'
                    )}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-85 shrink-0" />
                </a>
              )}

              <button
                type="button"
                onClick={handleCallRestaurant}
                className="sm:col-span-2 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-98 cursor-pointer font-khmer"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>
                  {displayPhone
                    ? tr(
                        language,
                        `ហៅទូរស័ព្ទទំនាក់ទំនង (${displayPhone})`,
                        `Call to Order / Contact (${displayPhone})`,
                        `致电联系 / 订餐 (${displayPhone})`
                      )
                    : tr(
                        language,
                        'ហៅទូរស័ព្ទទំនាក់ទំនងហាង',
                        'Call / Contact Shop',
                        '致电联系店铺'
                      )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (openRestaurantGoogleExternal(selectedRestaurant, 'maps')) {
                    trackRestaurantMap(selectedRestaurant.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition active:scale-98 cursor-pointer font-khmer"
              >
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{tr(language, 'បើកមើលលើ Google Maps', 'Open in Google Maps', '在 Google 地图中查看')}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (openRestaurantGoogleExternal(selectedRestaurant, 'directions')) {
                    trackRestaurantMap(selectedRestaurant.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-md transition active:scale-98 cursor-pointer font-khmer"
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>{tr(language, 'នាំផ្លូវទៅកាន់ទីតាំង', 'Navigate / Directions', '开始路线导航')}</span>
              </button>
            </div>

            {/* Quick Info Card: Opening Hours & Price Level (matching Hotel Detail Modal) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-1 font-khmer">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#064E3B] dark:text-emerald-400 font-bold text-xs">
                  <Clock className="w-4 h-4 text-[#059669]" />
                  <span>{tr(language, 'ម៉ោងបើកដំណើរការ', 'Opening Hours', '营业时间')}</span>
                </div>
                {selectedRestaurant.priceLevel && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-200/70 dark:border-amber-800/60">
                    {tr(language, `កម្រិតតម្លៃ៖ ${selectedRestaurant.priceLevel}`, `Price: ${selectedRestaurant.priceLevel}`, `价位：${selectedRestaurant.priceLevel}`)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                {loc.openingHours}
              </p>
            </div>

            {/* Location Address Card (matching Hotel Detail Modal) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-start gap-2.5 text-xs font-khmer">
              <MapPin className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#0F172A] dark:text-white">
                  {tr(language, 'ទីតាំងភូមិសាស្ត្រ / អាសយដ្ឋាន', 'Location Address', '详细地址')}
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {loc.address}
                </p>
                {displayPhone && (
                  <p className="mt-1 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                    📞 {displayPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Description (matching Hotel Detail Modal) */}
            <div className="font-khmer">
              <h3 className="font-bold text-[#0F172A] dark:text-white text-base mb-1.5 flex items-center gap-1.5">
                <span>{tr(language, 'អំពីហាងនេះ', 'About this Place', '店铺简介')}</span>
              </h3>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700">
                {loc.description}
              </p>
            </div>

            {/* Signature Dishes / Highlights List (matching Hotel Detail Modal) */}
            {loc.signatureDishes && loc.signatureDishes.length > 0 && (
              <div className="font-khmer">
                <h3 className="font-bold text-[#0F172A] dark:text-white text-base mb-2">
                  {tr(language, 'ចំណុចលេចធ្លោ និងមុខម្ហូបពិសេស', 'Signature Dishes & Highlights', '招牌特色推荐')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {loc.signatureDishes.map((dish, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs sm:text-sm flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                      <span className="font-medium text-[#0F172A] dark:text-slate-200">{dish}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shop Profile Photos + Edit Photos Button */}
            {(categorizedPhotos.length > 1 || isAdmin) && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A] dark:text-white font-khmer flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#059669]" />
                    <span>
                      {tr(
                        language,
                        `រូបភាពហាង (${allPhotos.length} សន្លឹក)`,
                        `Shop Photos (${allPhotos.length})`,
                        `店铺照片（${allPhotos.length} 张）`
                      )}
                    </span>
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenPhotoEditor}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#059669] hover:brightness-110 text-white font-khmer font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-200" />
                      <span>{tr(language, 'កែរូបភាពហាង (Admin)', 'Edit Shop Photos (Admin)', '编辑店铺照片（管理员）')}</span>
                    </button>
                  )}
                </div>
                {categorizedPhotos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {categorizedPhotos.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePhoto(item.url)}
                        className={`relative w-24 h-18 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                          (activePhoto || shopProfilePic) === item.url
                            ? 'border-[#064E3B] ring-2 ring-[#059669]'
                            : 'border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img src={item.url} alt="gallery" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[8px] font-khmer py-0.5 text-center">
                          {tr(language, 'រូបហាង', 'Shop', '店铺封面')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIP Store Video Reels Section (Benefit 5) */}
            {(selectedRestaurant.promoVideoUrl || canEditShop) && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-400/50 space-y-2 text-xs font-khmer">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-amber-500" />
                    <span>{tr(language, 'វីដេអូផ្សព្វផ្សាយហាង (Video Reels)', 'Store Video Reels', '店铺短视频 (Video Reels)')}</span>
                  </span>
                  {canEditShop && (
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).__kft_manage_initial_tab = 'video';
                        setManagingRestaurant(selectedRestaurant);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[10px] transition cursor-pointer"
                    >
                      {selectedRestaurant.promoVideoUrl
                        ? tr(language, '✏️ កែវីដេអូ', '✏️ Edit Video', '✏️ 编辑视频')
                        : tr(language, '+ ដាក់វីដេអូ Reels', '+ Add Video Reel', '+ 添加短视频')}
                    </button>
                  )}
                </div>
                {selectedRestaurant.promoVideoUrl ? (
                  <a
                    href={selectedRestaurant.promoVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    <Video className="w-4 h-4 text-amber-300" />
                    <span>{tr(language, '▶️ ទស្សនាវីដេអូបង្ហាញពីហាងនេះ', '▶️ Watch Store Video Reel', '▶️ 观看店铺短视频')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tr(
                      language,
                      'ម្ចាស់ហាងអាចដាក់តំណវីដេអូ TikTok / Facebook Reels / YouTube Shorts ដើម្បីទាក់ទាញអតិថិជន។',
                      'Add a TikTok, Facebook Reel, or YouTube Short link to showcase your restaurant.',
                      '店主可添加 TikTok、Facebook Reels 或 YouTube Shorts 短视频链接来展示店铺。'
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Owner / Admin Management Control Bar */}
            {canEditShop ? (
              <div className="p-3.5 bg-emerald-50 dark:bg-slate-800 rounded-2xl border-2 border-emerald-500/60 flex items-center justify-between font-khmer">
                <div>
                  <div className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 flex items-center gap-1.5">
                    <span>👑</span>
                    <span>{tr(language, 'ផ្ទាំងគ្រប់គ្រងម្ចាស់ហាង', 'Owner Management Hub', '店主管理中心')}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300">
                    {tr(
                      language,
                      `📍 ${loc.province} • រូបភាពហាង៖ ${allPhotos.length} សន្លឹក`,
                      `📍 ${loc.province} • Photos: ${allPhotos.length}`,
                      `📍 ${loc.province} • 照片：${allPhotos.length} 张`
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      (window as any).__kft_manage_initial_tab = 'info';
                      setManagingRestaurant(selectedRestaurant);
                      setIsManageMenuModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{tr(language, 'កែប្រែព័ត៌មានហាង', 'Edit Store', '编辑店铺')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRestaurant(selectedRestaurant.id)}
                    className="px-2.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    title={tr(language, 'លុបហាងនេះ', 'Delete this shop', '删除此店铺')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{tr(language, 'លុប', 'Delete', '删除')}</span>
                  </button>
                </div>
              </div>
            ) : isOwner ? (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-400/80 flex items-center justify-between gap-3 font-khmer">
                <div>
                  <div className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{tr(language, 'សមាជិកភាព VIP មិនទាន់សកម្ម', 'VIP Membership Not Active', 'VIP 会员尚未激活')}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300">
                    {tr(
                      language,
                      'សូមបន្ត ឬដំឡើងសមាជិកភាព VIP ដើម្បីកែប្រែព័ត៌មានហាងរបស់អ្នក',
                      'Please renew or upgrade VIP to manage this restaurant.',
                      '请续费或升级 VIP 会员以管理此店铺。'
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openUpgradeVipModal()}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-bold text-xs shadow transition cursor-pointer shrink-0"
                >
                  {tr(language, 'ដំឡើង VIP', 'Upgrade VIP', '升级 VIP')}
                </button>
              </div>
            ) : null}

            {/* Admin-only Location Review Notice if flagged */}
            {isAdmin && !isPlaceLocationVerified(selectedRestaurant) && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs font-khmer text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                <span>
                  📍{' '}
                  {tr(
                    language,
                    'ទីតាំង GPS របស់ហាងនេះត្រូវបានដាក់សម្គាល់សម្រាប់ Admin ផ្ទៀងផ្ទាត់ (មិនបើកទីតាំងស្មានឡើយ)',
                    'Location flagged for Admin GPS verification (unverified pin hidden)',
                    '该店铺 GPS 位置已标记待管理员核验（隐藏未核实定位）'
                  )}
                </span>
              </div>
            )}

            {/* Restaurant Profile View & Click Analytics (shown for Owner/Admin) */}
            {canEditShop && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 space-y-2 text-xs font-khmer">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>{tr(language, 'ស្ថិតិអ្នកចូលទស្សនា & ចុចមើល', 'Profile & Contact Analytics', '店铺浏览与互动统计')}</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">● {tr(language, 'តាមដានផ្ទាល់', 'Live Tracked', '实时统计')}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-400 text-[10px]">{tr(language, 'អ្នកមើល', 'Views', '浏览量')}</div>
                    <div className="font-bold font-mono text-[#064E3B] dark:text-emerald-400">{selectedRestaurant.analytics?.views || 1240}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-400 text-[10px]">{tr(language, 'ចុច Call', 'Calls', '拨打次数')}</div>
                    <div className="font-bold font-mono text-[#064E3B] dark:text-emerald-400">{selectedRestaurant.analytics?.phoneClicks || 180}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-400 text-[10px]">{tr(language, 'ចុច Map', 'Maps', '导航次数')}</div>
                    <div className="font-bold font-mono text-[#064E3B] dark:text-emerald-400">{selectedRestaurant.analytics?.mapClicks || 340}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-400 text-[10px]">{tr(language, 'ចែករំលែក', 'Shares', '分享次数')}</div>
                    <div className="font-bold font-mono text-[#064E3B] dark:text-emerald-400">{selectedRestaurant.analytics?.shareClicks || 95}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Genuine Customer Reviews & Rating Section (Strictly Separate from VIP Status) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700 space-y-3.5 font-khmer">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-current text-amber-500" />
                  <span>{tr(language, 'ការវាយតម្លៃពីអតិថិជន', 'Customer Reviews', '顾客评价')}</span>
                </h3>

                {ratingSummary.hasReviews ? (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/50 text-right">
                    <div className="flex items-center gap-1 font-black text-sm text-amber-600 dark:text-amber-400 font-mono">
                      <Star className="w-4 h-4 fill-current text-amber-500" />
                      <span>{ratingSummary.averageRating.toFixed(1)} / 5.0</span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">
                      {tr(language, `${ratingSummary.reviewCount} ការវាយតម្លៃ`, `${ratingSummary.reviewCount} reviews`, `${ratingSummary.reviewCount} 条评价`)}
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tr(language, 'មិនទាន់មានការវាយតម្លៃ', 'No ratings yet', '暂无顾客评分')}</span>
                  </div>
                )}
              </div>

              {/* Submit Genuine Customer Rating Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const ok = addRestaurantReview(selectedRestaurant.id, userReviewStars, userReviewComment);
                  if (ok) {
                    setUserReviewComment('');
                  }
                }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {tr(language, 'ដាក់ផ្កាយវាយតម្លៃហាងនេះ៖', 'Rate this shop:', '为本店打分：')}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserReviewStars(star)}
                        className="p-1 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-800 transition active:scale-90 cursor-pointer"
                        title={`${star} Stars`}
                      >
                        <Star
                          className={`w-5 h-5 transition ${
                            star <= userReviewStars
                              ? 'fill-current text-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-1 text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                      {userReviewStars}/5
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userReviewComment}
                    onChange={(e) => setUserReviewComment(e.target.value)}
                    placeholder={tr(
                      language,
                      'សរសេរមតិយោបល់របស់អ្នកអំពីរសជាតិម្ហូប និងសេវាកម្ម...',
                      'Share your genuine experience with the food & service...',
                      '分享您对本店菜品口味与服务体验的真实评价...'
                    )}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    {tr(language, 'ដាក់ផ្កាយ', 'Submit', '提交评价')}
                  </button>
                </div>
              </form>

              {/* Recent Genuine Customer Reviews List */}
              {Array.isArray(selectedRestaurant.reviews) && selectedRestaurant.reviews.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedRestaurant.reviews.slice(0, 10).map((rev) => (
                    <div
                      key={rev.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{rev.userName}</span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-3 h-3 ${
                                idx < rev.rating ? 'fill-current text-amber-400' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {rev.comment && (
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">{rev.comment}</p>
                      )}
                      <span className="block text-[9px] text-slate-400 font-mono">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Image Replacement Modal */}
      <RestaurantImageModal
        restaurant={selectedRestaurant}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSave={(updated) => {
          updateRestaurant(updated);
          setActivePhoto(updated.photoUrl);
          showToast(isKm ? 'បានផ្លាស់ប្តូររូបភាពហាងជោគជ័យ!' : 'Restaurant photo updated successfully!', 'success');
        }}
        isKm={isKm}
      />
    </div>
  );
};
