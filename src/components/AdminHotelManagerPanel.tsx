import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  BedDouble,
  Camera,
  Check,
  Download,
  Edit2,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  TouristDestination,
  isPlaceLocationVerified,
  inferBusinessTypeAndCategory,
  isHotelBusinessRecord,
  resolveFoodPhotoUrl,
} from '../types';
import { DISH_PROVINCES } from '../utils/foodFilters';
import { tr } from '../utils/i18n';

interface AdminHotelManagerPanelProps {
  onOpenImageModal: (hotel: TouristDestination) => void;
  onOpenGpsEditor: (hotel: TouristDestination) => void;
  onNavigateToOwnerUser?: (ownerQuery: string) => void;
}

const HOTEL_CATEGORY_OPTIONS = [
  { kh: 'សណ្ឋាគារ & កន្លែងស្នាក់នៅ', en: 'Hotel & Stay' },
  { kh: 'សណ្ឋាគារប្រណីត & រីសត', en: 'Luxury Hotel & Resort' },
  { kh: 'ប៊ូទិក & វីឡា', en: 'Boutique & Villa' },
  { kh: 'ផ្ទះសំណាក់ & បឹងហ្គាឡូ', en: 'Guesthouse & Lodge' },
];

const compressHotelImageFile = (
  file: File,
  maxWidth = 760,
  maxHeight = 520,
  quality = 0.78
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const webp = canvas.toDataURL('image/webp', quality);
          if (webp.startsWith('data:image/webp')) {
            resolve(webp);
            return;
          }
        } catch {}
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const AdminHotelManagerPanel: React.FC<AdminHotelManagerPanelProps> = ({
  onOpenImageModal,
  onOpenGpsEditor,
  onNavigateToOwnerUser,
}) => {
  const {
    destinations,
    restaurants,
    users,
    language,
    addDestination,
    updateDestination,
    updateRestaurant,
    deleteDestination,
    deleteRestaurant,
    approveRestaurant,
    rejectRestaurant,
    approveListingUpgradeRequest,
    rejectListingUpgradeRequest,
    approveShopPhotoReplacement,
    rejectShopPhotoReplacement,
    openManageMyVipStore,
    showToast,
  } = useApp();

  const isKm = language === 'km';
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'owned_hotel' | 'with_photo' | 'no_photo' | 'big_card' | 'compact_row'>('all');
  const [transferringHotelId, setTransferringHotelId] = useState<string | null>(null);
  const [transferOwnerSearch, setTransferOwnerSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(40);

  useEffect(() => {
    setVisibleCount(40);
  }, [searchQuery, statusFilter, provinceFilter]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<TouristDestination>>({});
  const [isBatchUploading, setIsBatchUploading] = useState(false);

  // New hotel form states
  const [newNameKh, setNewNameKh] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newProvinceKh, setNewProvinceKh] = useState('រាជធានីភ្នំពេញ');
  const [newCategoryKh, setNewCategoryKh] = useState(HOTEL_CATEGORY_OPTIONS[0].kh);
  const [newPriceRange, setNewPriceRange] = useState('$25+ / យប់');
  const [newPhone, setNewPhone] = useState('');
  const [newAddressKh, setNewAddressKh] = useState('');
  const [newLat, setNewLat] = useState('11.5564');
  const [newLng, setNewLng] = useState('104.9282');
  const [newIsFeatured, setNewIsFeatured] = useState(false);

  // Pending Hotel / Accommodation Approval Queues
  const pendingHotelSubmissions = useMemo(
    () => restaurants.filter((r) => isHotelBusinessRecord(r) && r.status === 'pending'),
    [restaurants]
  );
  const pendingHotelUpgrades = useMemo(
    () => restaurants.filter((r) => isHotelBusinessRecord(r) && r.pendingUpgradeRequest?.status === 'pending'),
    [restaurants]
  );
  const pendingHotelPhotos = useMemo(
    () => restaurants.filter((r) => isHotelBusinessRecord(r) && r.pendingPhotoReplacement?.status === 'pending'),
    [restaurants]
  );

  // Combine VIP-added hotels + seed/admin hotels
  const vipHotelDestinations = useMemo<TouristDestination[]>(() => {
    return restaurants
      .filter((r) => r && isHotelBusinessRecord(r))
      .map((r) => {
        const catInfo = inferBusinessTypeAndCategory(r);
        return {
          id: r.id,
          nameKh: r.nameKh,
          nameEn: r.nameEn || r.nameKh,
          categorySlug: 'hotel' as const,
          categoryKh: r.categoryKh || catInfo.shortKh,
          categoryEn: r.categoryEn || catInfo.shortEn,
          descriptionKh: r.descriptionKh || `${r.nameKh} — កន្លែងស្នាក់នៅស្អាត និងមានផាសុកភាព។`,
          descriptionEn: r.descriptionEn || `${r.nameEn || r.nameKh} — Verified accommodation in ${r.provinceEn}.`,
          photoUrl: r.profileImage || r.photoUrl || '',
          galleryPhotos: r.galleryPhotos || [],
          provinceKh: r.provinceKh,
          provinceEn: r.provinceEn,
          addressKh: r.addressKh || r.provinceKh,
          addressEn: r.addressEn || r.provinceEn,
          phone: r.phone,
          priceRange: r.priceLevel || '$$',
          entranceFeeKh: `តម្លៃបន្ទប់៖ ${r.priceLevel || '$$'}`,
          entranceFeeEn: `Room Rate: ${r.priceLevel || '$$'}`,
          bestTimeToVisitKh: r.openingHoursKh || 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង',
          bestTimeToVisitEn: r.openingHoursEn || 'Open 24 Hours',
          mapUrl: r.mapUrl || `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
          latitude: r.latitude,
          longitude: r.longitude,
          rating: r.rating || 4.9,
          reviewCount: r.reviewCount || 128,
          highlightsKh: r.signatureDishesKh || [],
          isFeatured: true,
          isAdminEdited: true,
          locationVerificationStatus: 'verified' as const,
        };
      });
  }, [restaurants]);

  const vipHotelIdSet = useMemo(() => new Set(vipHotelDestinations.map((h) => h.id)), [vipHotelDestinations]);

  const hotelRestById = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of restaurants) {
      if (r && isHotelBusinessRecord(r)) {
        map.set(r.id, r);
      }
    }
    return map;
  }, [restaurants]);

  const resolveHotelOwnerInfo = useMemo(() => {
    const byId = new Map<string, any>();
    const byEmail = new Map<string, any>();
    const byPhone = new Map<string, any>();
    for (const u of users || []) {
      if (!u) continue;
      if (u.id) byId.set(String(u.id).trim(), u);
      if (u.email) byEmail.set(String(u.email).trim().toLowerCase(), u);
      if (u.phone) byPhone.set(String(u.phone).replace(/\s+/g, ''), u);
    }
    return (hotelId: string) => {
      const rest = hotelRestById.get(hotelId);
      if (!rest) return { hasOwner: false, userId: '', ownerName: '', ownerEmail: '', ownerPhone: '', isSuspended: false, rest: null };
      const rawId = String(rest.ownerId || rest.pendingUpgradeRequest?.submittedByUserId || '').trim();
      const rawEmail = String(rest.ownerEmail || rest.pendingUpgradeRequest?.submittedByEmail || '').trim().toLowerCase();
      const rawPhone = String(rest.ownerPhone || rest.pendingUpgradeRequest?.submittedByPhone || '').trim();
      const matchedUser =
        (rawId && byId.get(rawId)) ||
        (rawEmail && byEmail.get(rawEmail)) ||
        (rawPhone && byPhone.get(rawPhone.replace(/\s+/g, ''))) ||
        null;
      const hasOwner = Boolean(matchedUser || rawId || rawEmail || rest.ownerName);
      return {
        hasOwner,
        userId: matchedUser?.id || rawId || '',
        ownerName: matchedUser?.name || rest.ownerName || rest.pendingUpgradeRequest?.submittedByName || 'VIP Hotel Owner',
        ownerEmail: matchedUser?.email || rawEmail || '',
        ownerPhone: matchedUser?.phone || rawPhone || rest.phone || '',
        isSuspended: Boolean(rest.isSuspended || rest.status === 'suspended'),
        rest,
      };
    };
  }, [users, hotelRestById]);

  const allHotels = useMemo<TouristDestination[]>(() => {
    const seedHotels = destinations.filter((d) => Boolean(d && d.categorySlug === 'hotel'));
    return [...vipHotelDestinations, ...seedHotels.filter((d) => !vipHotelIdSet.has(d.id))];
  }, [destinations, vipHotelDestinations, vipHotelIdSet]);

  const isHotelBigCard = (h: TouristDestination): boolean => {
    return vipHotelIdSet.has(h.id) || Boolean(h.isAdminEdited && h.isFeatured);
  };

  const stats = useMemo(() => {
    let withPhoto = 0;
    let bigCard = 0;
    let verifiedGps = 0;
    let ownedCount = 0;
    for (const h of allHotels) {
      if (h.photoUrl && h.photoUrl.trim()) withPhoto++;
      if (isHotelBigCard(h)) bigCard++;
      if (isPlaceLocationVerified(h)) verifiedGps++;
      if (resolveHotelOwnerInfo(h.id).hasOwner || vipHotelIdSet.has(h.id)) ownedCount++;
    }
    return {
      total: allHotels.length,
      ownedCount,
      withPhoto,
      noPhoto: allHotels.length - withPhoto,
      bigCard,
      compactRow: allHotels.length - bigCard,
      verifiedGps,
    };
  }, [allHotels, vipHotelIdSet, resolveHotelOwnerInfo]);

  const filteredHotels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cleanProv = provinceFilter === 'all' ? '' : provinceFilter.replace(/^រាជធានី|^ខេត្ត/g, '').trim();

    return allHotels.filter((h) => {
      const hasPhoto = Boolean(h.photoUrl && h.photoUrl.trim());
      const big = isHotelBigCard(h);
      const ownerInfo = resolveHotelOwnerInfo(h.id);
      if (statusFilter === 'owned_hotel' && !ownerInfo.hasOwner && !vipHotelIdSet.has(h.id)) return false;
      if (statusFilter === 'with_photo' && !hasPhoto) return false;
      if (statusFilter === 'no_photo' && hasPhoto) return false;
      if (statusFilter === 'big_card' && !big) return false;
      if (statusFilter === 'compact_row' && big) return false;

      if (cleanProv && !(h.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanProv)) {
        return false;
      }

      if (q) {
        const hay = `${h.id} ${h.nameKh || ''} ${h.nameEn || ''} ${h.provinceKh || ''} ${h.provinceEn || ''} ${h.phone || ''} ${h.addressKh || ''} ${ownerInfo.userId} ${ownerInfo.ownerName} ${ownerInfo.ownerEmail} ${ownerInfo.ownerPhone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allHotels, searchQuery, statusFilter, provinceFilter, vipHotelIdSet, resolveHotelOwnerInfo]);

  const handleDownloadHotelExcelTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx';
    link.download = 'KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(
      tr(
        language,
        'បានទាញយកគំរូ Excel សម្រាប់ដាក់រូបភាពសណ្ឋាគារ (KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx)',
        'Downloaded Hotel Photo Excel Template (KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx)',
        '已下载酒店图片 Excel 模板'
      ),
      'success'
    );
  };

  const handleBatchPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsBatchUploading(true);
    let matchedCount = 0;
    try {
      for (const file of files) {
        const match = file.name.match(/hotel-(\d+)/i);
        if (!match) continue;
        const targetId = `hotel-${match[1]}`;
        const existing = allHotels.find((h) => h.id.toLowerCase() === targetId.toLowerCase());
        if (!existing || vipHotelIdSet.has(existing.id)) continue;

        const dataUrl = await compressHotelImageFile(file);
        updateDestination({
          ...existing,
          photoUrl: dataUrl,
          galleryPhotos: [dataUrl],
          isCustomPhoto: true,
          isAdminEdited: true,
          photoUpdatedAt: new Date().toISOString(),
        });
        matchedCount++;
      }

      if (matchedCount > 0) {
        showToast(
          tr(
            language,
            `បានបញ្ចូលរូបភាពសណ្ឋាគារចំនួន ${matchedCount} កន្លែងដោយជោគជ័យ!`,
            `Successfully uploaded photos for ${matchedCount} hotel(s)!`,
            `已成功上传 ${matchedCount} 家酒店的图片！`
          ),
          'success'
        );
      } else {
        showToast(
          tr(
            language,
            'សូមដាក់ឈ្មោះឯកសាររូបភាពតាមលេខសម្គាល់សណ្ឋាគារ (ឧ. hotel-1.jpg, hotel-2.jpg...)',
            'Please name image files with the Hotel ID (e.g., hotel-1.jpg, hotel-2.jpg...)',
            '请将图片文件命名为酒店编号（例如 hotel-1.jpg, hotel-2.jpg...）'
          ),
          'warning'
        );
      }
    } finally {
      setIsBatchUploading(false);
      if (batchFileInputRef.current) batchFileInputRef.current.value = '';
    }
  };

  const handleCreateNewHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameKh.trim()) return;

    const provMeta = DISH_PROVINCES.find((p) => p.fullKh === newProvinceKh || p.kh === newProvinceKh);
    const catMeta = HOTEL_CATEGORY_OPTIONS.find((c) => c.kh === newCategoryKh) || HOTEL_CATEGORY_OPTIONS[0];
    const lat = Number(newLat) || 11.5564;
    const lng = Number(newLng) || 104.9282;

    addDestination({
      nameKh: newNameKh.trim(),
      nameEn: newNameEn.trim() || newNameKh.trim(),
      categorySlug: 'hotel',
      categoryKh: catMeta.kh,
      categoryEn: catMeta.en,
      descriptionKh: `${newNameKh.trim()} ជាកន្លែងស្នាក់នៅដែលមានទីតាំងនៅ ${newAddressKh.trim() || newProvinceKh}។`,
      descriptionEn: `${newNameEn.trim() || newNameKh.trim()} is a verified accommodation in ${provMeta?.en || 'Cambodia'}.`,
      photoUrl: '',
      galleryPhotos: [],
      provinceKh: newProvinceKh,
      provinceEn: provMeta?.en || 'Phnom Penh',
      addressKh: newAddressKh.trim() || newProvinceKh,
      addressEn: newAddressKh.trim() || provMeta?.en || 'Phnom Penh',
      phone: newPhone.trim(),
      priceRange: newPriceRange.trim() || '$25+ / យប់',
      entranceFeeKh: `តម្លៃបន្ទប់៖ ${newPriceRange.trim() || '$25+ / យប់'}`,
      entranceFeeEn: `Room Rate: ${newPriceRange.trim() || '$25+ / night'}`,
      bestTimeToVisitKh: 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង (Check-in 14:00 • Check-out 12:00)',
      bestTimeToVisitEn: 'Open 24 Hours (Check-in 2:00 PM • Check-out 12:00 PM)',
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      latitude: lat,
      longitude: lng,
      highlightsKh: [
        `តម្លៃបន្ទប់ចាប់ពី៖ ${newPriceRange.trim() || '$25+ / យប់'}`,
        ...(newPhone.trim() ? [`លេខទូរស័ព្ទកក់បន្ទប់៖ ${newPhone.trim()}`] : []),
        'បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ Wi-Fi និងចំណតរថយន្តសុវត្ថិភាព',
      ],
      isFeatured: newIsFeatured,
      isAdminEdited: true,
      locationVerificationStatus: 'verified',
      locationNeedsReview: false,
    });

    setNewNameKh('');
    setNewNameEn('');
    setNewPhone('');
    setNewAddressKh('');
    setShowAddForm(false);
    showToast(
      tr(language, 'បានបន្ថែមសណ្ឋាគារថ្មីដោយជោគជ័យ!', 'Added new hotel successfully!', '已成功添加新酒店！'),
      'success'
    );
  };

  const startInlineEdit = (hotel: TouristDestination) => {
    setEditingHotelId(hotel.id);
    setEditDraft({
      nameKh: hotel.nameKh,
      nameEn: hotel.nameEn,
      provinceKh: hotel.provinceKh,
      categoryKh: hotel.categoryKh,
      priceRange: hotel.priceRange || '',
      phone: hotel.phone || '',
      addressKh: hotel.addressKh || '',
      addressEn: hotel.addressEn || '',
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      mapUrl: hotel.mapUrl || '',
      descriptionKh: hotel.descriptionKh || '',
      isFeatured: Boolean(hotel.isAdminEdited && hotel.isFeatured),
    });
  };

  const saveInlineEdit = (hotel: TouristDestination) => {
    const provMeta = DISH_PROVINCES.find(
      (p) => p.fullKh === editDraft.provinceKh || p.kh === editDraft.provinceKh
    );
    const catMeta =
      HOTEL_CATEGORY_OPTIONS.find((c) => c.kh === editDraft.categoryKh) || HOTEL_CATEGORY_OPTIONS[0];
    const lat = Number(editDraft.latitude) || hotel.latitude;
    const lng = Number(editDraft.longitude) || hotel.longitude;

    const matchingRest = hotelRestById.get(hotel.id);
    if (matchingRest) {
      updateRestaurant({
        ...matchingRest,
        nameKh: (editDraft.nameKh || hotel.nameKh).trim(),
        nameEn: (editDraft.nameEn || hotel.nameEn).trim(),
        provinceKh: editDraft.provinceKh || hotel.provinceKh,
        provinceEn: provMeta?.en || hotel.provinceEn,
        categoryKh: catMeta.kh,
        categoryEn: catMeta.en,
        priceLevel: (editDraft.priceRange ?? hotel.priceRange ?? '').trim(),
        phone: (editDraft.phone ?? hotel.phone ?? '').trim(),
        addressKh: (editDraft.addressKh ?? hotel.addressKh ?? '').trim(),
        addressEn: (editDraft.addressEn ?? hotel.addressEn ?? '').trim(),
        latitude: lat,
        longitude: lng,
        mapUrl:
          (editDraft.mapUrl || '').trim() ||
          `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        descriptionKh: (editDraft.descriptionKh ?? hotel.descriptionKh ?? '').trim(),
        isAdminEdited: true,
        updatedAt: new Date().toISOString(),
      });
    }

    updateDestination({
      ...hotel,
      nameKh: (editDraft.nameKh || hotel.nameKh).trim(),
      nameEn: (editDraft.nameEn || hotel.nameEn).trim(),
      provinceKh: editDraft.provinceKh || hotel.provinceKh,
      provinceEn: provMeta?.en || hotel.provinceEn,
      categoryKh: catMeta.kh,
      categoryEn: catMeta.en,
      priceRange: (editDraft.priceRange ?? hotel.priceRange ?? '').trim(),
      phone: (editDraft.phone ?? hotel.phone ?? '').trim(),
      addressKh: (editDraft.addressKh ?? hotel.addressKh ?? '').trim(),
      addressEn: (editDraft.addressEn ?? hotel.addressEn ?? '').trim(),
      latitude: lat,
      longitude: lng,
      mapUrl:
        (editDraft.mapUrl || '').trim() ||
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      descriptionKh: (editDraft.descriptionKh ?? hotel.descriptionKh ?? '').trim(),
      isFeatured: Boolean(editDraft.isFeatured),
      isAdminEdited: true,
    });

    setEditingHotelId(null);
    setEditDraft({});
    showToast(
      tr(language, 'បានរក្សាទុកព័ត៌មានសណ្ឋាគារដោយជោគជ័យ!', 'Saved hotel details!', '已保存酒店信息！'),
      'success'
    );
  };

  const handleToggleBigCard = (hotel: TouristDestination) => {
    if (vipHotelIdSet.has(hotel.id)) {
      showToast(
        tr(
          language,
          'សណ្ឋាគារ VIP បង្ហាញជាកាតធំដោយស្វ័យប្រវត្តិ',
          'VIP hotels are automatically displayed as large cards',
          'VIP 酒店默认显示为大卡片'
        ),
        'info'
      );
      return;
    }
    const nextBig = !Boolean(hotel.isAdminEdited && hotel.isFeatured);
    updateDestination({
      ...hotel,
      isFeatured: nextBig,
      isAdminEdited: true,
    });
    showToast(
      nextBig
        ? tr(language, `បានប្តូរ «${hotel.nameKh}» ឱ្យបង្ហាញជាកាតធំ`, `Set "${hotel.nameEn}" to Large Card`, '已设为大卡片展示')
        : tr(language, `បានប្តូរ «${hotel.nameKh}» ឱ្យបង្ហាញជាជួរតូច`, `Set "${hotel.nameEn}" to Compact Row`, '已设为紧凑行展示'),
      'success'
    );
  };

  return (
    <div className="space-y-4 font-khmer">
      {/* =====================================================================
          0. PENDING HOTEL / ACCOMMODATION SUBMISSIONS & UPGRADES FOR ADMIN APPROVAL
          ===================================================================== */}
      {pendingHotelSubmissions.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-bold text-amber-900 dark:text-amber-200 font-khmer text-xs sm:text-sm flex items-center gap-1.5">
              <span>
                ⏳{' '}
                {isKm
                  ? `សណ្ឋាគារ និងកន្លែងស្នាក់នៅរង់ចាំការត្រួតពិនិត្យ និងអនុម័តពី Admin (${pendingHotelSubmissions.length})`
                  : `Pending Hotel / Accommodation Submissions for Admin Approval (${pendingHotelSubmissions.length})`}
              </span>
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
              ADMIN HOTEL APPROVAL REQUIRED
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingHotelSubmissions.map((rest) => {
              const catInfo = inferBusinessTypeAndCategory(rest);
              return (
                <div
                  key={`pending-hotel-${rest.id}`}
                  className="p-3.5 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={rest.photoUrl}
                      alt={rest.nameKh}
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-amber-400"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
                          {rest.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                          {isKm ? catInfo.labelKh : catInfo.labelEn}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[9px] font-bold">
                          {isKm ? 'រង់ចាំអនុម័ត' : 'Pending Approval'}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white break-words">
                        {rest.nameKh} {rest.nameEn && rest.nameEn !== rest.nameKh ? `(${rest.nameEn})` : ''}
                      </h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        📍 {rest.provinceKh} {rest.addressKh ? `(${rest.addressKh})` : ''} • 📞 {rest.phone} • 👤{' '}
                        {rest.ownerName || 'Hotel Owner'}
                      </p>
                      {rest.mapUrl && (
                        <a
                          href={rest.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{isKm ? 'បើកមើលទីតាំងលើ Google Maps' : 'Open Location in Google Maps'}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-stone-700">
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).__kft_manage_initial_tab = 'info';
                        openManageMyVipStore(rest.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-black shadow-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isKm ? 'កែប្រែ' : 'Edit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => approveRestaurant(rest.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                    >
                      {isKm ? '✅ អនុម័ត (Approve)' : '✅ Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectRestaurant(rest.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                    >
                      {isKm ? '🚫 បដិសេធ (Reject)' : '🚫 Reject'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRestaurant(rest.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isKm ? 'លុប' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Existing Hotel Upgrade Requests from VIP Users */}
      {pendingHotelUpgrades.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-bold text-amber-950 dark:text-amber-200 font-khmer text-xs sm:text-sm flex items-center gap-1.5">
              <span>
                ⬆️{' '}
                {isKm
                  ? `សំណើដំឡើង និងកែប្រែសណ្ឋាគារដែលមានស្រាប់ពីសមាជិក VIP (${pendingHotelUpgrades.length})`
                  : `Pending Existing Hotel Upgrade Requests (${pendingHotelUpgrades.length})`}
              </span>
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
              ADMIN HOTEL APPROVAL REQUIRED
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingHotelUpgrades.map((rest) => {
              const upg = rest.pendingUpgradeRequest!;
              const ch = upg.proposedChanges || {};
              const catInfo = inferBusinessTypeAndCategory(rest);
              return (
                <div
                  key={`upg-hotel-${rest.id}`}
                  className="p-3.5 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={ch.photoUrl || rest.photoUrl}
                      alt={ch.nameKh || rest.nameKh}
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border-2 border-amber-400"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
                          {rest.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                          {isKm ? catInfo.labelKh : catInfo.labelEn}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[9px] font-bold">
                          {isKm ? 'សំណើដំឡើងសណ្ឋាគារដែលមានស្រាប់' : 'Existing Hotel Upgrade'}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white break-words">
                        {ch.nameKh || rest.nameKh} ({ch.nameEn || rest.nameEn})
                      </h5>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300">
                        👤 VIP: <b>{upg.submittedByName}</b>{' '}
                        {upg.submittedByPhone ? `• 📞 ${upg.submittedByPhone}` : ''} • 📍{' '}
                        {ch.provinceKh || rest.provinceKh}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        📞 {ch.phone || rest.phone} • 🕒 {ch.openingHoursKh || rest.openingHoursKh} • 📍{' '}
                        {ch.addressKh || rest.addressKh}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-stone-700">
                    <button
                      type="button"
                      onClick={() => approveListingUpgradeRequest(rest.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
                    >
                      {isKm ? '✅ អនុម័ត និងផ្សព្វផ្សាយ (Approve)' : '✅ Approve & Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectListingUpgradeRequest(rest.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
                    >
                      {isKm ? '🚫 បដិសេធ (Reject)' : '🚫 Reject'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Hotel Photo Replacement Requests */}
      {pendingHotelPhotos.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-bold text-amber-900 dark:text-amber-300 text-xs sm:text-sm">
              {isKm
                ? `📸 សំណើប្តូររូបភាពសណ្ឋាគារថ្មី (${pendingHotelPhotos.length} រង់ចាំការអនុម័ត)`
                : `📸 Hotel Photo Replacement Requests (${pendingHotelPhotos.length} Pending Approval)`}
            </h4>
          </div>
          <div className="space-y-2.5">
            {pendingHotelPhotos.map((rest) => {
              const req = rest.pendingPhotoReplacement!;
              return (
                <div
                  key={`hotel-photo-req-${rest.id}`}
                  className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-amber-200 dark:border-amber-800/60 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {rest.nameKh} ({rest.id})
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {rest.provinceKh} • 📞 {rest.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => approveShopPhotoReplacement(rest.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isKm ? 'អនុម័តរូបភាពថ្មី' : 'Approve Photo'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          rejectShopPhotoReplacement(
                            rest.id,
                            isKm ? 'បដិសេធដោយ Admin' : 'Rejected by Admin'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{isKm ? 'បដិសេធ' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">
                        {isKm ? '១. រូបបច្ចុប្បន្ន' : '1. Current Photo'}
                      </span>
                      <img
                        src={resolveFoodPhotoUrl(rest.photoUrl)}
                        alt={rest.nameKh}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-amber-800 mb-1">
                        {isKm ? '២. រូបថ្មីដែលស្នើប្តូរ' : '2. Submitted Photo'}
                      </span>
                      <img
                        src={resolveFoodPhotoUrl(req.newPhotoUrl)}
                        alt={rest.nameKh}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-24 object-cover rounded-lg border border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          1. HEADER & EXCEL PHOTO TEMPLATE TOOLBAR
          ===================================================================== */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center shrink-0">
              <BedDouble className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {tr(
                  language,
                  `គ្រប់គ្រងសណ្ឋាគារ & ផ្ទះសំណាក់ (${stats.total})`,
                  `Manage Hotels & Stays (${stats.total})`,
                  `管理酒店与客栈 (${stats.total})`
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(
                  language,
                  'បន្ថែមសណ្ឋាគារថ្មី ប្តូររូបភាព កែតម្លៃបន្ទប់ លេខទូរស័ព្ទ GPS ឬទាញយកគំរូ Excel សម្រាប់ដាក់រូបភាព',
                  'Add hotels, upload photos, edit room rates, phone, GPS, or download the Excel photo template',
                  '添加酒店、上传图片、修改房价电话与 GPS 或下载 Excel 图片模板'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>{tr(language, 'បន្ថែមសណ្ឋាគារថ្មី', 'Add Hotel', '添加酒店')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHotelExcelTemplate}
              className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" strokeWidth={1.75} />
              <span>{tr(language, 'ទាញយកគំរូ Excel ដាក់រូបភាព (.xlsx)', 'Download Excel Photo Template', '下载 Excel 图片模板')}</span>
            </button>

            <input
              ref={batchFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBatchPhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isBatchUploading}
              onClick={() => batchFileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-slate-800 dark:text-stone-200 border border-slate-300 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-700 dark:text-emerald-400" strokeWidth={1.75} />
              <span>
                {isBatchUploading
                  ? tr(language, 'កំពុងបញ្ចូលរូប...', 'Uploading...', '正在上传...')
                  : tr(language, 'បញ្ចូលរូបច្រើនរូប (hotel-1.jpg...)', 'Batch Upload Photos', '批量上传图片')}
              </span>
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-stone-800/80 border border-slate-200/80 dark:border-stone-700">
            <div className="text-[10px] text-slate-500">{tr(language, 'សណ្ឋាគារសរុប', 'Total Hotels', '酒店总数')}</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
            <div className="text-[10px] text-emerald-800 dark:text-emerald-300">{tr(language, 'មានរូបភាព', 'With Photo', '已有图片')}</div>
            <div className="text-sm font-black text-emerald-900 dark:text-emerald-200 mt-0.5">{stats.withPhoto}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
            <div className="text-[10px] text-amber-800 dark:text-amber-300">{tr(language, 'រង់ចាំដាក់រូប (Icon)', 'No Photo (Icon)', '待上传图片')}</div>
            <div className="text-sm font-black text-amber-900 dark:text-amber-200 mt-0.5">{stats.noPhoto}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-stone-800/80 border border-slate-200/80 dark:border-stone-700">
            <div className="text-[10px] text-slate-500">{tr(language, 'បង្ហាញជាកាតធំ (VIP)', 'Big Card (VIP)', '大卡片展示')}</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{stats.bigCard}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-stone-800/80 border border-slate-200/80 dark:border-stone-700">
            <div className="text-[10px] text-slate-500">{tr(language, 'បង្ហាញជាជួរតូច', 'Compact Rows', '紧凑行展示')}</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{stats.compactRow}</div>
          </div>
        </div>

        {/* Add New Hotel Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateNewHotel}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-stone-800 border border-emerald-700/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-300">
                {tr(language, 'បន្ថែមសណ្ឋាគារ / ផ្ទះសំណាក់ថ្មី', 'Add New Hotel / Guesthouse', '添加新酒店/客栈')}
              </h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <input
                type="text"
                required
                value={newNameKh}
                onChange={(e) => setNewNameKh(e.target.value)}
                placeholder={tr(language, 'ឈ្មោះសណ្ឋាគារ (ភាសាខ្មែរ) *', 'Hotel Name (Khmer) *', '酒店柬文名称 *')}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder={tr(language, 'ឈ្មោះសណ្ឋាគារ (English)', 'Hotel Name (English)', '酒店英文名称')}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
              />
              <select
                value={newProvinceKh}
                onChange={(e) => setNewProvinceKh(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
              >
                {DISH_PROVINCES.map((p) => (
                  <option key={p.id} value={p.fullKh}>
                    {p.fullKh} ({p.en})
                  </option>
                ))}
              </select>
              <select
                value={newCategoryKh}
                onChange={(e) => setNewCategoryKh(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
              >
                {HOTEL_CATEGORY_OPTIONS.map((c) => (
                  <option key={c.kh} value={c.kh}>
                    {c.kh} ({c.en})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newPriceRange}
                onChange={(e) => setNewPriceRange(e.target.value)}
                placeholder={tr(language, 'តម្លៃបន្ទប់ (ឧ. $35+ / យប់)', 'Room Rate (e.g. $35+ / night)', '房价（如 $35+ / 晚）')}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder={tr(language, 'លេខទូរស័ព្ទកក់បន្ទប់ (ឧ. 023 999 888)', 'Phone Number', '联系电话')}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newAddressKh}
                onChange={(e) => setNewAddressKh(e.target.value)}
                placeholder={tr(language, 'អាសយដ្ឋានលម្អិត', 'Street / District Address', '详细地址')}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white sm:col-span-2"
              />
              <input
                type="text"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                placeholder="Latitude (e.g. 11.5564)"
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newLng}
                onChange={(e) => setNewLng(e.target.value)}
                placeholder="Longitude (e.g. 104.9282)"
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsFeatured}
                  onChange={(e) => setNewIsFeatured(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>{tr(language, 'បង្ហាញជាកាតធំ (ដូចសណ្ឋាគារ VIP)', 'Show as Large Featured Card (VIP style)', '以 VIP 大卡片展示')}</span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" strokeWidth={1.75} />
                <span>{tr(language, 'រក្សាទុកសណ្ឋាគារថ្មី', 'Save New Hotel', '保存新酒店')}</span>
              </button>
            </div>
          </form>
        )}

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="relative sm:col-span-2">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកតាមឈ្មោះសណ្ឋាគារ លេខសម្គាល់ (hotel-1..205) ទូរស័ព្ទ ឬខេត្ត...',
                'Search by hotel name, ID (hotel-1..205), phone, or province...',
                '按酒店名称、编号 (hotel-1..205)、电话或省份搜索...'
              )}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>

          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold cursor-pointer"
          >
            <option value="all">
              {tr(language, `គ្រប់រាជធានី-ខេត្តទាំង ២៥ (${allHotels.length})`, `All 25 Provinces (${allHotels.length})`, `全部 25 省市 (${allHotels.length})`)}
            </option>
            {DISH_PROVINCES.map((p) => {
              const clean = p.kh.replace(/^រាជធានី|^ខេត្ត/g, '').trim();
              const c = allHotels.filter((h) => (h.provinceKh || '').includes(clean)).length;
              return (
                <option key={p.id} value={p.kh}>
                  {p.fullKh} ({c})
                </option>
              );
            })}
          </select>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {[
            { id: 'all', label: tr(language, `ទាំងអស់ (${stats.total})`, `All (${stats.total})`, `全部 (${stats.total})`) },
            { id: 'owned_hotel', label: tr(language, `👤 មានម្ចាស់គណនី (${stats.ownedCount})`, `👤 Owned Hotels (${stats.ownedCount})`, `👤 已有店主 (${stats.ownedCount})`) },
            { id: 'with_photo', label: tr(language, `មានរូបភាព (${stats.withPhoto})`, `With Photo (${stats.withPhoto})`, `有图片 (${stats.withPhoto})`) },
            { id: 'no_photo', label: tr(language, `គ្មានរូបភាព (${stats.noPhoto})`, `No Photo (${stats.noPhoto})`, `无图片 (${stats.noPhoto})`) },
            { id: 'big_card', label: tr(language, `កាតធំ / VIP (${stats.bigCard})`, `Big Card / VIP (${stats.bigCard})`, `大卡片 (${stats.bigCard})`) },
            { id: 'compact_row', label: tr(language, `ជួរតូច (${stats.compactRow})`, `Compact Row (${stats.compactRow})`, `紧凑行 (${stats.compactRow})`) },
          ].map((pill) => {
            const active = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer border ${
                  active
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-300 border-slate-200 dark:border-stone-700 hover:bg-slate-50'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. HOTEL ITEMS LIST WITH INLINE ADMIN CONTROLS
          ===================================================================== */}
      <div className="space-y-2.5 max-h-[62vh] overflow-y-auto no-scrollbar">
        {filteredHotels.slice(0, visibleCount).map((h) => {
          const hasPhoto = Boolean(h.photoUrl && h.photoUrl.trim());
          const isBig = isHotelBigCard(h);
          const isVipRecord = vipHotelIdSet.has(h.id);
          const isEditingThis = editingHotelId === h.id;

          return (
            <div
              key={h.id}
              className="p-3 bg-white dark:bg-stone-800/90 rounded-2xl border border-slate-200 dark:border-stone-700 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail / Icon clickable to upload photo */}
                  <div
                    onClick={() => onOpenImageModal(h)}
                    className="relative w-14 h-14 rounded-xl overflow-hidden bg-emerald-900 border border-emerald-700/60 shrink-0 cursor-pointer group flex items-center justify-center"
                    title={tr(language, 'ចុចដើម្បីដាក់ ឬប្តូររូបភាពសណ្ឋាគារ', 'Click to upload or change hotel photo', '点击上传或更换酒店图片')}
                  >
                    {hasPhoto ? (
                      <img src={h.photoUrl} alt={h.nameKh} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <BedDouble className="w-6 h-6 text-emerald-200" strokeWidth={1.75} />
                    )}
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Camera className="w-4 h-4 text-amber-300" strokeWidth={1.75} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200">
                        {h.id}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                        {h.provinceKh}
                      </span>
                      {h.priceRange && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                          {h.priceRange}
                        </span>
                      )}
                      {isBig && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                          {isVipRecord
                            ? tr(language, 'VIP កាតធំ', 'VIP Big Card', 'VIP 大卡片')
                            : tr(language, 'កាតធំ', 'Big Card', '大卡片')}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-stone-100 text-xs sm:text-sm truncate mt-1">
                      {h.nameKh}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      <span className="truncate">{h.nameEn}</span>
                      {h.phone && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                          <Phone className="w-3 h-3" strokeWidth={1.75} />
                          <span>{h.phone}</span>
                        </span>
                      )}
                    </div>
                    {(() => {
                      const ownerInfo = resolveHotelOwnerInfo(h.id);
                      if (!ownerInfo.hasOwner && !isVipRecord) return null;
                      return (
                        <div className="mt-1 px-2 py-1 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[10px] text-amber-950 dark:text-amber-200 flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold">👤 {ownerInfo.ownerName || 'Hotel Owner'}</span>
                          {ownerInfo.userId && <span className="font-mono px-1 rounded bg-white/80 dark:bg-stone-900 border border-amber-300/60">User ID: {ownerInfo.userId}</span>}
                          {ownerInfo.ownerEmail && <span>• ✉️ {ownerInfo.ownerEmail}</span>}
                          {ownerInfo.ownerPhone && <span>• 📞 {ownerInfo.ownerPhone}</span>}
                          {ownerInfo.isSuspended && <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold">⏸️ SUSPENDED</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 flex-wrap">
                  {(() => {
                    const ownerInfo = resolveHotelOwnerInfo(h.id);
                    return (
                      <>
                        {(ownerInfo.hasOwner || isVipRecord) && onNavigateToOwnerUser && (
                          <button
                            type="button"
                            onClick={() => onNavigateToOwnerUser(ownerInfo.userId || ownerInfo.ownerEmail || ownerInfo.ownerName || h.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs cursor-pointer"
                            title={isKm ? 'មើលគណនីម្ចាស់សណ្ឋាគារក្នុងផ្នែកអ្នកប្រើប្រាស់' : 'View Hotel Owner in Users Tab'}
                          >
                            👤 {isKm ? 'មើលម្ចាស់' : 'Owner'}
                          </button>
                        )}
                        {isVipRecord && (
                          <button
                            type="button"
                            onClick={() => openManageMyVipStore(h.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                            title={isKm ? 'បើកផ្ទាំងគ្រប់គ្រងសណ្ឋាគារពេញលេញ' : 'Open Full Hotel Manager'}
                          >
                            🏨 {isKm ? 'គ្រប់គ្រង' : 'Manage'}
                          </button>
                        )}
                        {ownerInfo.rest && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextSusp = !ownerInfo.isSuspended;
                              updateRestaurant({
                                ...ownerInfo.rest,
                                isSuspended: nextSusp,
                                status: nextSusp ? ('suspended' as any) : 'approved',
                                updatedAt: new Date().toISOString(),
                              });
                              showToast(
                                nextSusp
                                  ? (isKm ? `⏸️ បានផ្អាកសណ្ឋាគារ "${h.nameKh}"` : `⏸️ Suspended "${h.nameEn || h.nameKh}"`)
                                  : (isKm ? `▶️ បានបើកសណ្ឋាគារ "${h.nameKh}" ឡើងវិញ` : `▶️ Reactivated "${h.nameEn || h.nameKh}"`),
                                'info'
                              );
                            }}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer border ${
                              ownerInfo.isSuspended
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {ownerInfo.isSuspended ? (isKm ? '▶️ បើកវិញ' : '▶️ Activate') : (isKm ? '⏸️ ផ្អាក' : '⏸️ Suspend')}
                          </button>
                        )}
                        {ownerInfo.rest && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferringHotelId(transferringHotelId === h.id ? null : h.id);
                              setTransferOwnerSearch('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 font-bold text-xs cursor-pointer"
                          >
                            🔄 {isKm ? 'ផ្ទេរម្ចាស់' : 'Transfer'}
                          </button>
                        )}
                      </>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(h)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/70 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" strokeWidth={1.75} />
                    <span>{hasPhoto ? tr(language, 'ប្តូររូប', 'Photo', '换图') : tr(language, 'ដាក់រូប', 'Add Photo', '加图')}</span>
                  </button>

                  {!isVipRecord && (
                    <button
                      type="button"
                      onClick={() => handleToggleBigCard(h)}
                      className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border ${
                        isBig
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-300 border-slate-200 dark:border-stone-700 hover:bg-slate-50'
                      }`}
                      title={tr(language, 'ប្តូរទម្រង់បង្ហាញ (កាតធំ / ជួរតូច)', 'Toggle Big Card / Compact Row', '切换大卡片 / 紧凑行')}
                    >
                      <Star className={`w-4 h-4 ${isBig ? 'fill-current' : ''}`} strokeWidth={1.75} />
                      <span>{isBig ? tr(language, 'កាតធំ', 'Big Card', '大卡') : tr(language, 'ជួរតូច', 'Row', '小行')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => (isEditingThis ? setEditingHotelId(null) : startInlineEdit(h))}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" strokeWidth={1.75} />
                    <span>{tr(language, 'កែប្រែ', 'Edit', '编辑')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenGpsEditor(h)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-slate-800 dark:text-stone-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title={tr(language, 'កែទីតាំង GPS លើផែនទី', 'Edit GPS on Map', '在地图上修改 GPS')}
                  >
                    <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" strokeWidth={1.75} />
                    <span>GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isVipRecord) {
                        deleteRestaurant(h.id);
                      } else {
                        deleteDestination(h.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title={tr(language, 'លុបសណ្ឋាគារ', 'Delete Hotel', '删除酒店')}
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {/* Inline Hotel Owner Transfer Selector */}
              {transferringHotelId === h.id && hotelRestById.get(h.id) && (
                <div className="pt-3 border-t border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      🔄 {isKm ? `ផ្ទេរសិទ្ធិគ្រប់គ្រងសណ្ឋាគារ «${h.nameKh}» ទៅគណនីអ្នកប្រើប្រាស់៖` : `Transfer Hotel "${h.nameEn || h.nameKh}" Ownership to User:`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTransferringHotelId(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={transferOwnerSearch}
                    onChange={(e) => setTransferOwnerSearch(e.target.value)}
                    placeholder={isKm ? 'ស្វែងរកគណនីតាមឈ្មោះ អ៊ីមែល លេខទូរស័ព្ទ ឬ User ID...' : 'Search user by name, email, phone, or User ID...'}
                    className="w-full px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                  />
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {(users || [])
                      .filter((u) => {
                        if (!u) return false;
                        const q = transferOwnerSearch.trim().toLowerCase();
                        if (!q) return true;
                        return `${u.id} ${u.name || ''} ${u.email || ''} ${u.phone || ''}`.toLowerCase().includes(q);
                      })
                      .slice(0, 8)
                      .map((u) => (
                        <div key={u.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700">
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 ml-1.5">ID: {u.id}</span>
                            {u.email && <span className="text-[10px] text-slate-500 ml-1.5">• {u.email}</span>}
                            {u.phone && <span className="text-[10px] text-emerald-700 ml-1.5">• {u.phone}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const targetRest = hotelRestById.get(h.id);
                              if (!targetRest) return;
                              updateRestaurant({
                                ...targetRest,
                                ownerId: u.id,
                                ownerName: u.name,
                                ownerEmail: u.email || targetRest.ownerEmail,
                                ownerPhone: u.phone || targetRest.ownerPhone || targetRest.phone,
                                updatedAt: new Date().toISOString(),
                              });
                              setTransferringHotelId(null);
                              showToast(
                                isKm
                                  ? `✅ បានផ្ទេរសណ្ឋាគារ «${h.nameKh}» ទៅគណនី ${u.name} (${u.id}) ជោគជ័យ!`
                                  : `✅ Transferred "${h.nameEn || h.nameKh}" to ${u.name} (${u.id})!`,
                                'success'
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                          >
                            {isKm ? 'ជ្រើសរើសគណនីនេះ' : 'Assign Owner'}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Inline Hotel Editor */}
              {isEditingThis && (
                <div className="pt-3 border-t border-slate-200 dark:border-stone-700 space-y-2.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        {tr(language, 'ឈ្មោះសណ្ឋាគារ (ខ្មែរ)', 'Hotel Name (Khmer)', '柬文名称')}
                      </label>
                      <input
                        type="text"
                        value={editDraft.nameKh || ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, nameKh: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        {tr(language, 'ឈ្មោះសណ្ឋាគារ (English)', 'Hotel Name (English)', '英文名称')}
                      </label>
                      <input
                        type="text"
                        value={editDraft.nameEn || ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, nameEn: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        {tr(language, 'ខេត្ត / រាជធានី', 'Province', '省份')}
                      </label>
                      <select
                        value={editDraft.provinceKh || h.provinceKh}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, provinceKh: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      >
                        {DISH_PROVINCES.map((p) => (
                          <option key={p.id} value={p.fullKh}>
                            {p.fullKh} ({p.en})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        {tr(language, 'ប្រភេទសណ្ឋាគារ', 'Category', '类别')}
                      </label>
                      <select
                        value={editDraft.categoryKh || h.categoryKh}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, categoryKh: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      >
                        {HOTEL_CATEGORY_OPTIONS.map((c) => (
                          <option key={c.kh} value={c.kh}>
                            {c.kh} ({c.en})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        {tr(language, 'តម្លៃបន្ទប់ (Room Rate)', 'Room Rate', '房价')}
                      </label>
                      <input
                        type="text"
                        value={editDraft.priceRange ?? ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, priceRange: e.target.value }))}
                        placeholder="$35+ / យប់"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        {tr(language, 'លេខទូរស័ព្ទ (Phone)', 'Phone Number', '电话')}
                      </label>
                      <input
                        type="text"
                        value={editDraft.phone ?? ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="023 999 888"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        {tr(language, 'អាសយដ្ឋាន (Address)', 'Address', '地址')}
                      </label>
                      <input
                        type="text"
                        value={editDraft.addressKh ?? ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, addressKh: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={editDraft.latitude ?? h.latitude}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={editDraft.longitude ?? h.longitude}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-stone-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editDraft.isFeatured)}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                        className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span>{tr(language, 'បង្ហាញជាកាតធំ (VIP Showcase Card)', 'Show as Large Featured Card', '以大卡片展示')}</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingHotelId(null)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-stone-700 text-slate-700 dark:text-stone-200 font-bold text-xs cursor-pointer"
                      >
                        {tr(language, 'បោះបង់', 'Cancel', '取消')}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveInlineEdit(h)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-4 h-4" strokeWidth={1.75} />
                        <span>{tr(language, 'រក្សាទុក', 'Save', '保存')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {visibleCount < filteredHotels.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 50)}
            className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs transition-colors cursor-pointer"
          >
            {tr(
              language,
              `បង្ហាញសណ្ឋាគារបន្ថែម (${visibleCount}/${filteredHotels.length})`,
              `Show More Hotels (${visibleCount}/${filteredHotels.length})`,
              `显示更多酒店 (${visibleCount}/${filteredHotels.length})`
            )}
          </button>
        )}

        {filteredHotels.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-xs">
            {isKm ? 'រកមិនឃើញសណ្ឋាគារដែលត្រូវនឹងការស្វែងរកទេ' : 'No hotels matched your search'}
          </div>
        )}
      </div>
    </div>
  );
};
