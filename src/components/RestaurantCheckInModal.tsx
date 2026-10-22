import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Camera, Image as ImageIcon, MapPin, CheckCircle2, 
  AlertCircle, Star, Sparkles, Navigation, Send, Store, ShieldCheck
} from 'lucide-react';
import { 
  getCurrentDeviceLocation, 
  findNearbyRestaurants, 
  checkUserCheckInRateLimit, 
  recordCheckInAttempt, 
  saveCheckInRecord, 
  formatDistance, 
  NearbyRestaurantMatch, 
  GpsLocationResult,
  VERIFIED_CHECKIN_MAX_DISTANCE_METERS
} from '../services/restaurantCheckInService';
import { Restaurant } from '../types';

export const RestaurantCheckInModal: React.FC = () => {
  const { 
    isRestaurantCheckInModalOpen, 
    setIsRestaurantCheckInModalOpen, 
    restaurants, 
    currentUser, 
    language, 
    showToast,
    setIsAuthModalOpen,
    openUpgradeVipModal
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

  // Review & Details
  const [rating, setRating] = useState<number>(5);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [dishName, setDishName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Auto locate GPS when modal opens
  useEffect(() => {
    if (isRestaurantCheckInModalOpen) {
      setStep('photo_loc');
      setPhotoDataUrl('');
      setSelectedMatch(null);
      setReviewNote('');
      setIsLocating(true);

      getCurrentDeviceLocation().then(loc => {
        setGps(loc);
        setIsLocating(false);
        if (loc.isInsideCambodia) {
          const matches = findNearbyRestaurants(loc.latitude, loc.longitude, restaurants);
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

  const handleSubmitCheckIn = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!selectedMatch) {
      showToast(isKm ? 'សូមជ្រើសរើសភោជនីយដ្ឋានដើម្បីឆែកអ៊ីន!' : 'Please select a restaurant to check in!', 'warning');
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
    await new Promise(r => setTimeout(r, 600));

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
          
          {step === 'success' ? (
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
                    ? `អ្នកបានឆែកអ៊ីននៅ «${selectedMatch?.restaurant.nameKh}» រួចរាល់។` 
                    : `Checked in at "${selectedMatch?.restaurant.nameEn}".`}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'ស្ថានភាពទីតាំង៖' : 'Location Status:'}</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{selectedMatch?.isWithinThreshold ? (isKm ? 'បញ្ជាក់ទីតាំងពិត (Verified)' : 'Verified at Venue') : (isKm ? 'រង់ចាំពិនិត្យ' : 'Pending Review')}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'ចម្ងាយពីហាង៖' : 'Distance:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatDistance(selectedMatch?.distanceMeters || 0, isKm)}
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
                      const matches = findNearbyRestaurants(loc.latitude, loc.longitude, restaurants);
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

              {/* Nearby Restaurants Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>{isKm ? 'ជ្រើសរើសភោជនីយដ្ឋាននៅជិតអ្នក៖' : 'Select nearby restaurant:'}</span>
                  <span className="text-[10px] text-slate-500">
                    {nearbyList.length} {isKm ? 'ហាងរកឃើញ' : 'found'}
                  </span>
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {nearbyList.slice(0, 5).map((match) => {
                    const isSelected = selectedMatch?.restaurant.id === match.restaurant.id;
                    return (
                      <div
                        key={match.restaurant.id}
                        onClick={() => setSelectedMatch(match)}
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
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
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
                </div>
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
                disabled={isSubmitting || !selectedMatch}
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
