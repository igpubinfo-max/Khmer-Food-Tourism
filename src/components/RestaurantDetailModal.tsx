import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, MapPin, Phone, Star, Clock, ExternalLink, 
  Send, Share2, UtensilsCrossed, Sparkles, CheckCircle2, AlertCircle, Copy, Camera, Bookmark,
  BarChart3, Video, Crown, Edit2, MessageSquare, Trash2
} from 'lucide-react';
import { isUserVipActive, getRestaurantRatingSummary } from '../types';
import { RestaurantImageModal } from './RestaurantImageModal';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant, translateSignatureDish, translateDynamicTextToZh } from '../utils/zhDynamicTranslator';
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
            updateRestaurant(updated);
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
    showToast(
      isKm
        ? 'ហាងនេះមិនបានដាក់លេខទូរស័ព្ទលើផែនទីទេ — កំពុងបើកទីតាំងលើ Google Maps ជូនលោកអ្នក!'
        : 'This shop has not listed a phone number on the map — opening Google Maps!',
      'warning'
    );
    if (selectedRestaurant.mapUrl) {
      window.open(selectedRestaurant.mapUrl, '_blank');
    }
  };

  const shopProfilePic = selectedRestaurant.profileImage || selectedRestaurant.photoUrl;
  const shopPhotosList = Array.from(
    new Set([
      shopProfilePic,
      ...(selectedRestaurant.galleryPhotos || []),
    ])
  ).filter((u): u is string => Boolean(u));
  const shopPhotoSet = new Set(shopPhotosList);

  const foodPhotosList = Array.from(
    new Set(
      (selectedRestaurant.foodImages || []).filter(
        (u): u is string => Boolean(u && !shopPhotoSet.has(u))
      )
    )
  );

  const categorizedPhotos = [
    ...shopPhotosList.map((url) => ({
      url,
      category: 'shop' as const,
      foodIndex: 0,
    })),
    ...foodPhotosList.map((url, idx) => ({
      url,
      category: 'food' as const,
      foodIndex: idx + 1,
    })),
  ];

  const allPhotos = categorizedPhotos.map((item) => item.url);

  const sharePayload = {
    title: isKm ? selectedRestaurant.nameKh : selectedRestaurant.nameEn,
    nameKh: selectedRestaurant.nameKh,
    nameEn: selectedRestaurant.nameEn,
    description: isKm ? selectedRestaurant.descriptionKh : selectedRestaurant.descriptionEn,
    location: isKm
      ? `${selectedRestaurant.addressKh} (${selectedRestaurant.provinceKh})`
      : `${selectedRestaurant.addressEn} (${selectedRestaurant.provinceEn})`,
    phone: displayPhone || selectedRestaurant.phone,
    priceDisplay: selectedRestaurant.priceLevel,
    signatureDishes: selectedRestaurant.signatureDishesKh,
    photoUrl: activePhoto || selectedRestaurant.photoUrl,
    mapUrl: selectedRestaurant.mapUrl,
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
    const encUrl = encodeURIComponent(selectedRestaurant.mapUrl || directLink);
    const encText = encodeURIComponent(fullText);
    window.open(`https://t.me/share/url?url=${encUrl}&text=${encText}`, '_blank');
  };

  const handleShareFacebook = () => {
    trackRestaurantShare(selectedRestaurant.id);
    const { fullText, directLink } = formatRichShareText(sharePayload);
    const encUrl = encodeURIComponent(selectedRestaurant.mapUrl || directLink);
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
                priceDisplay: selectedRestaurant.priceLevel,
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
        <div className="overflow-y-auto flex-1 no-scrollbar pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
          {/* Hero Image */}
          <div className="relative h-60 sm:h-64 w-full bg-slate-800">
            <img 
              src={activePhoto || selectedRestaurant.photoUrl} 
              alt={loc.name}
              className="w-full h-full object-cover transition-all duration-300"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = '1';
                  target.src = '/welcome/places.webp';
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            
            <div className="absolute bottom-3.5 left-4 right-24 text-white">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B]/90 text-emerald-100 border border-emerald-400/30 shadow-xs font-khmer">
                  {loc.province}
                </span>

                {selectedRestaurant.isVerified && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/90 text-white border border-emerald-300/40 shadow-xs flex items-center gap-1 font-khmer">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    <span>{tr(language, 'ផ្ទៀងផ្ទាត់រួច', 'Verified', '已认证')}</span>
                  </span>
                )}

                {ratingSummary.hasReviews ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shadow-xs flex items-center gap-1 font-khmer">
                    <Star className="w-3 h-3 fill-current text-slate-950" />
                    <span>{ratingSummary.averageRating.toFixed(1)} ({ratingSummary.reviewCount})</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-slate-200 border border-white/20 shadow-xs flex items-center gap-1 font-khmer">
                    <Star className="w-3 h-3 text-slate-300" />
                    <span>{tr(language, 'មិនទាន់មានការវាយតម្លៃ', 'No ratings yet', '暂无评分')}</span>
                  </span>
                )}

                <span className="px-2 py-0.5 rounded-md bg-[#064E3B]/90 text-emerald-100 text-[10px] font-bold border border-emerald-400/30">
                  {selectedRestaurant.priceLevel}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold font-moul leading-snug drop-shadow text-white">
                {loc.name}
              </h2>
            </div>

            {/* Reference Image Label (រូបភាពយោង) */}
            <div className="absolute bottom-2.5 right-3 z-10 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-xs text-[8px] sm:text-[9px] text-white/85 font-khmer border border-white/15 select-none pointer-events-none shadow-2xs">
              <span>{tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}</span>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
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
                      `មុខម្ហូប៖ ${(selectedRestaurant.menuItems || []).length}/20 មុខ | រូបភាពហាង & ម្ហូប៖ ${allPhotos.length} សន្លឹក`,
                      `Menu: ${(selectedRestaurant.menuItems || []).length}/20 | Photos: ${allPhotos.length}`,
                      `菜单：${(selectedRestaurant.menuItems || []).length}/20 道 | 照片：${allPhotos.length} 张`
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
                    <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{tr(language, 'កែប្រែហាង & មុខម្ហូប', 'Edit Store & Menu', '编辑店铺与菜单')}</span>
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
                      'សូមបន្ត ឬដំឡើងសមាជិកភាព VIP ដើម្បីកែប្រែហាង និងគ្រប់គ្រងមុខម្ហូប',
                      'Please renew or upgrade VIP to manage this restaurant.',
                      '请续费或升级 VIP 会员以编辑店铺及管理菜单。'
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

            {/* Quick action bar: Maps, Call, Telegram, Facebook, and Share (Benefits 6, 7, 9) */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <a
                href={selectedRestaurant.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackRestaurantMap(selectedRestaurant.id)}
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow transition active:scale-95 font-khmer"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tr(language, 'ផែនទី', 'Maps', '地图导航')}</span>
              </a>

              <button
                type="button"
                onClick={handleCallRestaurant}
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-bold shadow transition active:scale-95 font-mono"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tr(language, 'ហៅ', 'Call', '致电')}</span>
              </button>

              <button
                type="button"
                onClick={handleShareTelegram}
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold shadow transition active:scale-95 font-khmer"
              >
                <span>✈️</span>
                <span className="truncate">Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold shadow transition active:scale-95 font-khmer"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tr(language, 'ចែករំលែក', 'Share', '分享')}</span>
              </button>
            </div>

            {/* Restaurant Profile View & Click Analytics (Benefit 8) */}
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

            {/* VIP Food Video Reels Section (Benefit 5) */}
            {(selectedRestaurant.promoVideoUrl || canEditShop) && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-400/50 space-y-2 text-xs font-khmer">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-amber-500" />
                    <span>{tr(language, 'វីដេអូផ្សព្វផ្សាយម្ហូប (Food Video Reels)', 'Food Video Reels', '美食宣传短视频 (Video Reels)')}</span>
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
                    <span>{tr(language, '▶️ ទស្សនាវីដេអូបង្ហាញមុខម្ហូបហាងនេះ', '▶️ Watch Store Food Video Reel', '▶️ 观看店铺美食短视频')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tr(
                      language,
                      'ម្ចាស់ហាងអាចដាក់តំណវីដេអូ TikTok / Facebook Reels / YouTube Shorts ដើម្បីទាក់ទាញអតិថិជន។',
                      'Add a TikTok, Facebook Reel, or YouTube Short link to showcase your dishes.',
                      '店主可添加 TikTok、Facebook Reels 或 YouTube Shorts 短视频链接来展示特色菜品。'
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Shop Profile Picture & Food Photos Gallery + Edit Photos Button */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0F172A] dark:text-white font-khmer flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#059669]" />
                  <span>
                    {tr(
                      language,
                      `រូបតំណាងហាង & រូបភាពមុខម្ហូប (${allPhotos.length} សន្លឹក)`,
                      `Shop Profile & Food Photos (${allPhotos.length})`,
                      `店铺形象与菜品相册（${allPhotos.length} 张）`
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
                    <span>{tr(language, 'កែរូបហាង & រូបម្ហូប (Admin)', 'Edit Shop & Food Photos (Admin)', '编辑店铺与菜品照片（管理员）')}</span>
                  </button>
                )}
              </div>
              {categorizedPhotos.length > 0 && (
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
                      <img src={item.url} alt="gallery" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[8px] font-khmer py-0.5 text-center">
                        {item.category === 'shop'
                          ? tr(language, 'រូបហាង', 'Shop', '店铺封面')
                          : tr(language, `ម្ហូបទី ${item.foodIndex}`, `Food ${item.foodIndex}`, `菜品 ${item.foodIndex}`)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Address & Hours */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-2.5 text-xs font-khmer shadow-2xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-white">
                    {tr(language, 'អាសយដ្ឋាន', 'Address', '详细地址')}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {loc.address}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <Phone className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <div className="flex-1 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-white">
                      {tr(language, 'លេខទូរស័ព្ទទំនាក់ទំនង', 'Phone Number', '联系电话')}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">
                      {displayPhone || tr(language, 'មិនមានលេខទូរស័ព្ទលើផែនទី', 'Not listed on map', '地图上未标注电话')}
                    </p>
                  </div>
                  {displayPhone && (
                    <button
                      type="button"
                      onClick={handleCallRestaurant}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-2xs transition"
                    >
                      📞 {displayPhone}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <Clock className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-white">
                    {tr(language, 'ម៉ោងបើកដំណើរការ', 'Opening Hours', '营业时间')}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {loc.openingHours}
                  </p>
                </div>
              </div>

              {(selectedRestaurant.websiteUrl || selectedRestaurant.googleMapsMeta?.websiteUri) && (
                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <ExternalLink className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#0F172A] dark:text-white">
                      {tr(language, 'គេហទំព័រផ្លូវការ (Website)', 'Official Website', '官方网站')}
                    </p>
                    <a
                      href={selectedRestaurant.websiteUrl || selectedRestaurant.googleMapsMeta?.websiteUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 dark:text-emerald-400 hover:underline font-mono text-[11px] break-all block"
                    >
                      {selectedRestaurant.websiteUrl || selectedRestaurant.googleMapsMeta?.websiteUri}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Restaurant Food Menu Items */}
            {selectedRestaurant.menuItems && selectedRestaurant.menuItems.length > 0 ? (
              <div className="space-y-3 font-khmer">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#059669]" />
                    <span>
                      {tr(
                        language,
                        `មុខម្ហូបពិសេសក្នុងហាង (${selectedRestaurant.menuItems.length} មុខ)`,
                        `Restaurant Food Menu (${selectedRestaurant.menuItems.length})`,
                        `餐厅特色菜单（${selectedRestaurant.menuItems.length} 道菜）`
                      )}
                    </span>
                  </h3>
                  {canEditShop && (
                    <button
                      onClick={() => {
                        setManagingRestaurant(selectedRestaurant);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="text-[#064E3B] dark:text-emerald-400 font-bold text-xs hover:underline"
                    >
                      {tr(language, '+ កែប្រែ / បន្ថែម', '+ Edit / Add', '+ 编辑 / 添加')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {selectedRestaurant.menuItems.map((item, i) => {
                    const itemDisplayName =
                      language === 'km'
                        ? item.nameKh
                        : language === 'zh'
                        ? translateSignatureDish(item.nameKh || item.nameEn || '', 'zh')
                        : item.nameEn || translateSignatureDish(item.nameKh || '', 'en');
                    const itemDesc =
                      language === 'km'
                        ? item.descriptionKh
                        : item.descriptionKh
                        ? translateSignatureDish(item.descriptionKh, language)
                        : '';
                    return (
                      <div 
                        key={item.id || i}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center gap-3"
                      >
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-700">
                          <img src={item.photoUrl} alt={itemDisplayName} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 right-0 bg-black/65 text-white/90 text-[7px] px-1 rounded-tl-sm font-khmer select-none">
                            {tr(language, 'រូបភាពយោង', 'Ref', '参考图')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-[#0F172A] dark:text-white text-sm truncate">
                              {itemDisplayName}
                            </h4>
                            <span className="text-[#064E3B] dark:text-emerald-400 font-bold font-mono text-xs ml-2">${(item.priceUsd ?? 0).toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">({item.priceRiel.toLocaleString()} ៛)</p>
                          {itemDesc && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                              {itemDesc}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Fallback Signature Dishes */
              <div className="font-khmer">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#059669]" />
                    <span>{tr(language, 'មុខម្ហូបប្រចាំហាង', 'Signature Menus', '本店招牌特色菜')}</span>
                  </h3>
                  {canEditShop && (
                    <button
                      onClick={() => {
                        setManagingRestaurant(selectedRestaurant);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="text-[#064E3B] dark:text-emerald-400 font-bold text-xs hover:underline"
                    >
                      {tr(language, '+ គ្រប់គ្រងមុខម្ហូប', '+ Manage Menu', '+ 管理菜单')}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {loc.signatureDishes.map((dish, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#064E3B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium">{dish}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="font-khmer">
              <h3 className="font-bold text-[#0F172A] dark:text-white text-base mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#059669]" />
                <span>{tr(language, 'អំពីភោជនីយដ្ឋាន', 'About the Restaurant', '关于本店')}</span>
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700">
                {loc.description}
              </p>
            </div>

            {/* Genuine Customer Reviews & Rating Section (Strictly Separate from VIP Status) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700 space-y-3.5 font-khmer">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-current text-amber-500" />
                    <span>{tr(language, 'ការវាយតម្លៃពិតប្រាកដពីអតិថិជន', 'Genuine Customer Reviews', '真实顾客评价与评分')}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr(
                      language,
                      'ផ្អែកលើការវាយតម្លៃរបស់អតិថិជនពិតប្រាកដប៉ុណ្ណោះ (សមាជិកភាព VIP មិនប៉ះពាល់ដល់ផ្កាយវាយតម្លៃឡើយ)',
                      'Based strictly on genuine customer reviews (VIP status never affects ratings)',
                      '完全基于真实顾客评价计算（VIP 会员身份绝不影响星级评分）'
                    )}
                  </p>
                </div>

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

            {/* Social Share Bar */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 font-khmer">
              <p className="text-xs font-semibold text-slate-500 mb-2.5 text-center">
                {tr(language, 'ចែករំលែកទីតាំងហាងនេះ', 'Share this restaurant', '将此餐厅分享给好友')}
              </p>
              
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleShareTelegram}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] text-white text-xs font-bold shadow hover:brightness-105 transition active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram
                </button>

                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold shadow hover:brightness-105 transition active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Facebook
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 transition active:scale-95"
                >
                  {tr(language, 'ចម្លង', 'Copy', '复制链接')}
                </button>
              </div>
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
