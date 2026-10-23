import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Camera, Image as ImageIcon, MapPin, CheckCircle2, 
  AlertCircle, Star, Sparkles, Navigation, Send, Store, ShieldCheck, PlusCircle, Search
} from 'lucide-react';
import { 
  getCurrentDeviceLocation, 
  findNearbyRestaurants, 
  checkUserCheckInRateLimit, 
  recordCheckInAttempt, 
  saveCheckInRecord, 
  formatDistance, 
  NearbyRestaurantMatch, 
  GpsLocationResult
} from '../services/restaurantCheckInService';

const CAMBODIA_PROVINCES = [
  { kh: 'រាជធានីភ្នំពេញ', en: 'Phnom Penh' },
  { kh: 'សៀមរាប', en: 'Siem Reap' },
  { kh: 'ព្រះសីហនុ', en: 'Preah Sihanouk' },
  { kh: 'បាត់ដំបង', en: 'Battambang' },
  { kh: 'កំពត', en: 'Kampot' },
  { kh: 'កែប', en: 'Kep' },
  { kh: 'កណ្តាល', en: 'Kandal' },
  { kh: 'កំពង់ចាម', en: 'Kampong Cham' },
  { kh: 'កំពង់ឆ្នាំង', en: 'Kampong Chhnang' },
  { kh: 'កំពង់ស្ពឺ', en: 'Kampong Speu' },
  { kh: 'កំពង់ធំ', en: 'Kampong Thom' },
  { kh: 'កោះកុង', en: 'Koh Kong' },
  { kh: 'ក្រចេះ', en: 'Kratie' },
  { kh: 'មណ្ឌលគិរី', en: 'Mondulkiri' },
  { kh: 'រតនគិរី', en: 'Ratanakiri' },
  { kh: 'ព្រៃវែង', en: 'Prey Veng' },
  { kh: 'ពោធិ៍សាត់', en: 'Pursat' },
  { kh: 'ស្វាយរៀង', en: 'Svay Rieng' },
  { kh: 'តាកែវ', en: 'Takeo' },
  { kh: 'បន្ទាយមានជ័យ', en: 'Banteay Meanchey' },
  { kh: 'ប៉ៃលិន', en: 'Pailin' },
  { kh: 'ឧត្តរមានជ័យ', en: 'Oddar Meanchey' },
  { kh: 'ព្រះវិហារ', en: 'Preah Vihear' },
  { kh: 'ស្ទឹងត្រែង', en: 'Stung Treng' },
  { kh: 'ត្បូងឃ្មុំ', en: 'Tboung Khmum' },
];

export const RestaurantCheckInModal: React.FC = () => {
  const { 
    isRestaurantCheckInModalOpen, 
    setIsRestaurantCheckInModalOpen, 
    restaurants, 
    addRestaurant,
    currentUser, 
    language, 
    showToast,
    setIsAuthModalOpen
  } = useApp();

  const isKm = language === 'km';

  // Step: 'photo_loc' | 'select_restaurant' | 'success'
  const [step, setStep] = useState<'photo_loc' | 'select_restaurant' | 'success'>('photo_loc');

  // Photo
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  
  // GPS & Nearby
  const [gps, setGps] = useState<GpsLocationResult | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [nearbyList, setNearbyList] = useState<NearbyRestaurantMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<NearbyRestaurantMatch | null>(null);
  const [shopSearchQuery, setShopSearchQuery] = useState<string>('');

  // Custom / "Other" Shop States (when shop is not in list)
  const [isCustomShop, setIsCustomShop] = useState<boolean>(false);
  const [customShopName, setCustomShopName] = useState<string>('');
  const [customShopAddress, setCustomShopAddress] = useState<string>('');
  const [customShopProvinceKh, setCustomShopProvinceKh] = useState<string>('រាជធានីភ្នំពេញ');
  const [customShopPhone, setCustomShopPhone] = useState<string>('');
  const [saveCustomShopToDirectory, setSaveCustomShopToDirectory] = useState<boolean>(true);
  const [checkedInShopDisplay, setCheckedInShopDisplay] = useState<{
    nameKh: string;
    nameEn: string;
    distanceMeters: number;
    isVerified: boolean;
  } | null>(null);

  // Review & Details
  const [rating, setRating] = useState<number>(5);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [dishName, setDishName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Filtered nearby list based on search query
  const filteredNearbyList = useMemo(() => {
    const q = shopSearchQuery.trim().toLowerCase();
    if (!q) return nearbyList.slice(0, 8);
    return nearbyList.filter(m => 
      (m.restaurant.nameKh || '').toLowerCase().includes(q) ||
      (m.restaurant.nameEn || '').toLowerCase().includes(q) ||
      (m.restaurant.addressKh || '').toLowerCase().includes(q) ||
      (m.restaurant.provinceKh || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [nearbyList, shopSearchQuery]);

  // Auto locate GPS when modal opens
  useEffect(() => {
    if (isRestaurantCheckInModalOpen) {
      setStep('photo_loc');
      setPhotoDataUrl('');
      setSelectedMatch(null);
      setIsCustomShop(false);
      setCustomShopName('');
      setCustomShopAddress('');
      setCustomShopPhone('');
      setShopSearchQuery('');
      setReviewNote('');
      setDishName('');
      setCheckedInShopDisplay(null);
      setIsLocating(true);

      getCurrentDeviceLocation().then(loc => {
        setGps(loc);
        setIsLocating(false);
        if (loc.isInsideCambodia) {
          const matches = findNearbyRestaurants(loc.latitude, loc.longitude, restaurants, 50000, 215);
          setNearbyList(matches);
          if (matches.length > 0 && matches[0].isWithinThreshold) {
            setSelectedMatch(matches[0]);
          }
        }
      });
    }
  }, [isRestaurantCheckInModalOpen, restaurants]);

  if (!isRestaurantCheckInModalOpen) return null;

  const handleClose = () => {
    setIsRestaurantCheckInModalOpen(false);
  };

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectOtherShop = () => {
    setIsCustomShop(true);
    setSelectedMatch(null);
    if (shopSearchQuery.trim() && !customShopName.trim()) {
      setCustomShopName(shopSearchQuery.trim());
    }
  };

  const handleSubmitCheckIn = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast(
        isKm
          ? '🔒 មុខងារឆែកអ៊ីន & បញ្ជាក់ទីតាំង GPS Live គឺអនុញ្ញាតសម្រាប់តែ Administrator ប៉ុណ្ណោះ!'
          : '🔒 Check-in & GPS Live verification is restricted to Administrators only!',
        'warning'
      );
      if (!currentUser) setIsAuthModalOpen(true);
      return;
    }

    if (!selectedMatch && !isCustomShop) {
      showToast(
        isKm 
          ? 'សូមជ្រើសរើសហាងពីបញ្ជី ឬចុច «➕ ផ្សេងៗ (ហាងមិនមានក្នុងបញ្ជី)»!' 
          : 'Please select a restaurant or tap "+ Other (Shop Not in List)"!',
        'warning'
      );
      return;
    }

    if (isCustomShop && !customShopName.trim()) {
      showToast(
        isKm 
          ? 'សូមវាយបញ្ចូលឈ្មោះហាង ឬភោជនីយដ្ឋានជាមុនសិន!' 
          : 'Please enter the shop/restaurant name first!',
        'warning'
      );
      return;
    }

    // Rate limit check
    const rate = checkUserCheckInRateLimit(currentUser.id);
    if (!rate.allowed) {
      showToast(
        isKm 
          ? `អ្នកបានឆែកអ៊ីនលើសកម្រិតកំណត់ (១០ ដង/ម៉ោង)។ សូមរង់ចាំ ${rate.waitMinutes} នាទី!` 
          : `Rate limit reached. Please wait ${rate.waitMinutes} minutes!`,
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));

    const lat = gps?.latitude || 11.5564;
    const lng = gps?.longitude || 104.9282;

    if (isCustomShop) {
      const cleanName = customShopName.trim();
      const provObj = CAMBODIA_PROVINCES.find(p => p.kh === customShopProvinceKh) || CAMBODIA_PROVINCES[0];
      const cleanAddress = customShopAddress.trim() || `${provObj.kh} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      const customRestId = `rest-custom-${Date.now()}`;

      if (saveCustomShopToDirectory && addRestaurant) {
        addRestaurant({
          nameKh: cleanName,
          nameEn: cleanName,
          categoryKh: 'ភោជនីយដ្ឋាន & អាហារដ្ឋាន',
          categoryEn: 'Restaurant & Eatery',
          provinceKh: provObj.kh,
          provinceEn: provObj.en,
          addressKh: cleanAddress,
          addressEn: cleanAddress,
          descriptionKh: reviewNote.trim() || `ហាងអាហារដែលបានណែនាំតាមរយៈការឆែកអ៊ីនផ្ទាល់ (${dishName.trim() || 'ម្ហូបខ្មែរ'})។`,
          descriptionEn: reviewNote.trim() || `Community check-in discovered restaurant (${dishName.trim() || 'Khmer Cuisine'}).`,
          priceRange: '$1.50 - $10.00',
          openingHours: '07:00 AM - 09:00 PM',
          phone: customShopPhone.trim() || 'មិនទាន់មានលេខទូរស័ព្ទ',
          latitude: lat,
          longitude: lng,
          photoUrl: photoDataUrl || '/Shop/rest-1.jpg',
          signatureDishesKh: dishName.trim() ? [dishName.trim()] : ['ម្ហូបខ្មែរប្រពៃណី'],
          isFeatured: false,
          membershipTier: 'free',
        });
      }

      const checkInRecord = {
        id: `chk_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        restaurantId: customRestId,
        restaurantNameKh: cleanName,
        restaurantNameEn: cleanName,
        photoUrl: photoDataUrl || '/Shop/rest-1.jpg',
        latitude: lat,
        longitude: lng,
        distanceMeters: 0,
        isLocationVerified: Boolean(gps?.isInsideCambodia ?? true),
        rating,
        noteKh: reviewNote,
        visitedDishNameKh: dishName,
        status: 'verified' as const,
        createdAt: new Date().toISOString()
      };

      saveCheckInRecord(checkInRecord);
      recordCheckInAttempt(currentUser.id);

      setCheckedInShopDisplay({
        nameKh: cleanName,
        nameEn: cleanName,
        distanceMeters: 0,
        isVerified: true,
      });
    } else if (selectedMatch) {
      const checkInRecord = {
        id: `chk_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        restaurantId: selectedMatch.restaurant.id,
        restaurantNameKh: selectedMatch.restaurant.nameKh,
        restaurantNameEn: selectedMatch.restaurant.nameEn,
        photoUrl: photoDataUrl || selectedMatch.restaurant.photoUrl,
        latitude: gps?.latitude || selectedMatch.restaurant.latitude,
        longitude: gps?.longitude || selectedMatch.restaurant.longitude,
        distanceMeters: selectedMatch.distanceMeters,
        isLocationVerified: selectedMatch.isWithinThreshold,
        rating,
        noteKh: reviewNote,
        visitedDishNameKh: dishName,
        status: selectedMatch.isWithinThreshold ? ('verified' as const) : ('pending_moderation' as const),
        createdAt: new Date().toISOString()
      };

      saveCheckInRecord(checkInRecord);
      recordCheckInAttempt(currentUser.id);

      setCheckedInShopDisplay({
        nameKh: selectedMatch.restaurant.nameKh,
        nameEn: selectedMatch.restaurant.nameEn,
        distanceMeters: selectedMatch.distanceMeters,
        isVerified: selectedMatch.isWithinThreshold,
      });
    }

    setIsSubmitting(false);
    setStep('success');
    showToast(
      isKm 
        ? '🎉 ឆែកអ៊ីនទីតាំងភោជនីយដ្ឋានបានជោគជ័យ!' 
        : '🎉 Restaurant check-in recorded successfully!',
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-emerald-500/30 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#064E3B] via-[#047857] to-teal-700 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-400 text-slate-950 shadow-md">
                <MapPin className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <h3 className="font-moul text-sm sm:text-base text-white flex items-center gap-2">
                  <span>{isKm ? 'ឆែកអ៊ីន & បញ្ជាក់ទីតាំងហាង' : 'Restaurant Check-in & GPS'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-sans font-bold">
                    GPS Live
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-200 font-khmer">
                  {isKm ? 'បញ្ជាក់ទីតាំងពិតប្រាកដ • រូបថតម្ហូប • ការពារទិន្នន័យផ្ទាល់ខ្លួន' : 'Spatial Verification • Venue Photo • Privacy Guard'}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh] font-khmer text-xs">
          {(!currentUser || currentUser.role !== 'admin') ? (
            <div className="py-10 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-moul text-sm text-slate-800 dark:text-slate-100">
                  {isKm ? 'មុខងារសម្រាប់តែ Administrator ប៉ុណ្ណោះ' : 'Administrator Access Only'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  {isKm
                    ? 'មុខងារឆែកអ៊ីន & បញ្ជាក់ទីតាំងហាងតាមរយៈ GPS Live ត្រូវបានកំណត់សិទ្ធិសម្រាប់តែគណនី Administrator ដើម្បីត្រួតពិនិត្យឈ្មោះ រូបភាព និងទីតាំងហាងឱ្យបានត្រឹមត្រូវ ១០០%។'
                    : 'Check-in & GPS Live restaurant verification is restricted to Administrator accounts only.'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                {isKm ? 'យល់ព្រម (បិទ)' : 'Close'}
              </button>
            </div>
          ) : step === 'success' ? (
            /* Success Screen */
            <div className="py-8 text-center space-y-4 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="font-moul text-base text-slate-900 dark:text-white">
                  {isKm ? '🎉 ឆែកអ៊ីនជោគជ័យ!' : '🎉 Check-in Successful!'}
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                  {isKm 
                    ? `អ្នកបានឆែកអ៊ីននៅ «${checkedInShopDisplay?.nameKh || selectedMatch?.restaurant.nameKh || customShopName}» រួចរាល់។` 
                    : `Checked in at "${checkedInShopDisplay?.nameEn || selectedMatch?.restaurant.nameEn || customShopName}".`}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'ស្ថានភាពទីតាំង៖' : 'Location Status:'}</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      {(checkedInShopDisplay?.isVerified ?? selectedMatch?.isWithinThreshold) 
                        ? (isKm ? 'បញ្ជាក់ទីតាំងពិត (Verified)' : 'Verified at Venue') 
                        : (isKm ? 'រង់ចាំពិនិត្យ' : 'Pending Review')}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'ចម្ងាយពីហាង៖' : 'Distance:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatDistance(checkedInShopDisplay?.distanceMeters ?? selectedMatch?.distanceMeters ?? 0, isKm)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {isKm ? 'រួចរាល់ (បិទ)' : 'Done (Close)'}
              </button>
            </div>
          ) : (
            /* Check-in Form */
            <div className="space-y-4">
              {/* GPS Acquisition Banner */}
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <Navigation className={`w-4 h-4 text-emerald-600 ${isLocating ? 'animate-spin' : ''}`} />
                  <div>
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                      {isLocating 
                        ? (isKm ? 'កំពុងស្វែងរកទីតាំង GPS...' : 'Acquiring GPS location...') 
                        : (isKm ? 'ទីតាំង GPS បានទទួលជោគជ័យ' : 'GPS location acquired')}
                    </span>
                    {gps && (
                      <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                        {isKm ? `កម្រិតលម្អិត ±${gps.accuracyMeters}m • ក្នុងប្រទេសកម្ពុជា` : `Accuracy ±${gps.accuracyMeters}m • Cambodia`}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsLocating(true);
                    getCurrentDeviceLocation().then(loc => {
                      setGps(loc);
                      setIsLocating(false);
                      const matches = findNearbyRestaurants(loc.latitude, loc.longitude, restaurants, 50000, 215);
                      setNearbyList(matches);
                    });
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] hover:bg-emerald-100 transition cursor-pointer shrink-0"
                >
                  {isKm ? '🔄 ផ្ទុកឡើងវិញ' : 'Refresh'}
                </button>
              </div>

              {/* Photo Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  {isKm ? 'រូបថតនៅហាង ឬរូបថតម្ហូប (Venue Photo)៖' : 'Photo at venue or food dish:'}
                </label>

                {photoDataUrl ? (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 h-40 border border-slate-200 dark:border-slate-700">
                    <img src={photoDataUrl} alt="Venue photo" className="w-full h-40 object-cover" />
                    <button
                      onClick={() => setPhotoDataUrl('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-3 rounded-2xl border-2 border-dashed border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Camera className="w-5 h-5 text-emerald-600" />
                      <span>{isKm ? 'ថតរូបភ្លាមៗ' : 'Take Photo'}</span>
                    </button>
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="p-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <ImageIcon className="w-5 h-5 text-amber-500" />
                      <span>{isKm ? 'ជ្រើសពី Gallery' : 'Choose Photo'}</span>
                    </button>
                  </div>
                )}

                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />
                <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
              </div>

              {/* Nearby Restaurants Selector + "Other / Shop Not in List" */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    {isKm ? 'ជ្រើសរើសភោជនីយដ្ឋាននៅជិតអ្នក៖' : 'Select nearby restaurant:'}
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectOtherShop}
                    className={`px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 transition cursor-pointer ${
                      isCustomShop
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-400/50'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{isKm ? 'ផ្សេងៗ (ហាងមិនមានក្នុងបញ្ជី)' : 'Other (Not in list)'}</span>
                  </button>
                </div>

                {/* Search Input for Restaurant List */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={shopSearchQuery}
                    onChange={(e) => setShopSearchQuery(e.target.value)}
                    placeholder={isKm ? 'ស្វែងរកឈ្មោះហាងក្នុងបញ្ជី ឬចុច «ផ្សេងៗ» ខាងក្រោម...' : 'Search shop in list or select "Other" below...'}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Custom / "Other" Shop Form when selected */}
                {isCustomShop && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-400 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>{isKm ? 'បញ្ចូលព័ត៌មានហាងថ្មី (ហាងមិនមានក្នុងបញ្ជី)៖' : 'Enter Custom Shop (Not in List):'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomShop(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-white underline cursor-pointer"
                      >
                        {isKm ? 'ត្រឡប់ទៅបញ្ជីវិញ' : 'Back to list'}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={customShopName}
                      onChange={(e) => setCustomShopName(e.target.value)}
                      placeholder={isKm ? 'ឈ្មោះហាង / ភោជនីយដ្ឋាន * (ឧ. ហាងគុយទាវអ៊ុំស្រី)...' : 'Shop / Restaurant Name * ...'}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-amber-500 font-bold"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={customShopProvinceKh}
                        onChange={(e) => setCustomShopProvinceKh(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-amber-500"
                      >
                        {CAMBODIA_PROVINCES.map(p => (
                          <option key={p.kh} value={p.kh}>
                            {isKm ? p.kh : p.en}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={customShopPhone}
                        onChange={(e) => setCustomShopPhone(e.target.value)}
                        placeholder={isKm ? 'លេខទូរស័ព្ទហាង (បើមាន)...' : 'Shop Phone (Optional)...'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-amber-500"
                      />
                    </div>

                    <input
                      type="text"
                      value={customShopAddress}
                      onChange={(e) => setCustomShopAddress(e.target.value)}
                      placeholder={isKm ? 'អាសយដ្ឋាន ឬទីតាំងសម្គាល់ (ទុកទទេដើម្បីប្រើ GPS ផ្ទាល់)...' : 'Address or landmark (leave blank to use live GPS)...'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-amber-500"
                    />

                    <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={saveCustomShopToDirectory}
                        onChange={(e) => setSaveCustomShopToDirectory(e.target.checked)}
                        className="rounded accent-emerald-600 w-3.5 h-3.5"
                      />
                      <span>
                        {isKm 
                          ? 'បន្ថែមហាងថ្មីនេះចូលក្នុងបញ្ជីភោជនីយដ្ឋានរបស់កម្មវិធីដោយស្វ័យប្រវត្តិ' 
                          : 'Automatically add this new shop to the app directory'}
                      </span>
                    </label>
                  </div>
                )}

                {/* Nearby List + Prominent "Other" Option Card */}
                {!isCustomShop && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {filteredNearbyList.map((match) => {
                      const isSelected = selectedMatch?.restaurant.id === match.restaurant.id;
                      return (
                        <div
                          key={match.restaurant.id}
                          onClick={() => {
                            setIsCustomShop(false);
                            setSelectedMatch(match);
                          }}
                          className={`p-2.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img 
                              src={match.restaurant.photoUrl} 
                              alt={match.restaurant.nameKh}
                              className="w-10 h-10 rounded-xl object-cover shrink-0" 
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[200px]">
                                {match.restaurant.nameKh}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate block max-w-[200px]">
                                {match.restaurant.addressKh}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold block ${
                              match.isWithinThreshold
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {formatDistance(match.distanceMeters, isKm)}
                            </span>
                            {match.isWithinThreshold && (
                              <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
                                ✓ {isKm ? 'ក្នុងរង្វង់ 500m' : '< 500m verified'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Always-visible "Other / Shop Not in List" Card inside the list */}
                    <div
                      onClick={handleSelectOtherShop}
                      className="p-3 rounded-2xl border-2 border-dashed border-amber-400/80 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-500 flex items-center justify-center shrink-0">
                          <PlusCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-amber-800 dark:text-amber-300 block">
                            {isKm ? '➕ ផ្សេងៗ — ហាងមិនមានក្នុងបញ្ជី (Other)' : '➕ Other — Shop Not in List'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            {isKm ? 'ចុចទីនេះដើម្បីវាយបញ្ចូលឈ្មោះហាងថ្មីដោយខ្លួនឯង' : 'Tap here to type a custom shop name'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold shrink-0">
                        {isKm ? '+ បន្ថែមហាង' : '+ Custom'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Rating & Review Note */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {isKm ? 'ការវាយតម្លៃរសជាតិ៖' : 'Food Rating:'}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-amber-400 hover:scale-110 transition cursor-pointer"
                      >
                        <Star className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder={isKm ? 'មុខម្ហូបដែលអ្នកបានញ៉ាំ (ឧ. អាម៉ុកត្រី)...' : 'Dish ordered (e.g. Fish Amok)...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                />

                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  placeholder={isKm ? 'ចំណាប់អារម្មណ៍ ឬការណែនាំរបស់អ្នក...' : 'Your experience / review note...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Submit Check-In Button */}
              <button
                onClick={handleSubmitCheckIn}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? (isKm ? 'កំពុងកត់ត្រា...' : 'Submitting...') 
                    : (isKm ? '✅ បញ្ជាក់ & បោះពុម្ពផ្សាយការឆែកអ៊ីន' : '✅ Confirm & Publish Check-in')}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
