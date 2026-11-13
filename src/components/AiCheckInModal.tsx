import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Camera, Image as ImageIcon, MapPin, ShieldCheck, CheckCircle2, 
  AlertCircle, RefreshCw, Send, Store, Utensils, Phone, Info 
} from 'lucide-react';
import { 
  compressImage, captureCurrentLocation, analyzeCheckInPhotoWithAi, 
  LocationCoordinates, getProvinceFromGps, checkSubmissionRateLimit 
} from '../services/aiCheckInService';
import { tr } from '../utils/i18n';

export const AiCheckInModal: React.FC = () => {
  const { 
    isAiCheckInModalOpen, 
    setIsAiCheckInModalOpen, 
    currentUser, 
    setIsAuthModalOpen, 
    language, 
    showToast,
    submitAiCheckIn
  } = useApp();

  const isKm = language === 'km';

  // Step state: 'pick_photo' | 'analyzing' | 'confirm_details' | 'submitting'
  const [step, setStep] = useState<'pick_photo' | 'analyzing' | 'confirm_details' | 'submitting'>('pick_photo');

  // Photo & Location
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [gpsCoords, setGpsCoords] = useState<LocationCoordinates>({ latitude: 11.5564, longitude: 104.9282, accuracyMeters: 10 });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string>('');

  // Editable Form Fields detected by AI
  const [restaurantNameKh, setRestaurantNameKh] = useState<string>('');
  const [restaurantNameEn, setRestaurantNameEn] = useState<string>('');
  const [foodCategoryKh, setFoodCategoryKh] = useState<string>('ភោជនីយដ្ឋាន & អាហារដ្ឋាន');
  const [foodCategoryEn, setFoodCategoryEn] = useState<string>('Restaurant & Eatery');
  const [provinceKh, setProvinceKh] = useState<string>('រាជធានីភ្នំពេញ');
  const [provinceEn, setProvinceEn] = useState<string>('Phnom Penh');
  const [addressKh, setAddressKh] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [signatureDishes, setSignatureDishes] = useState<string>('');
  const [aiDescriptionKh, setAiDescriptionKh] = useState<string>('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0.85);
  const [isFoodOnlyPhoto, setIsFoodOnlyPhoto] = useState<boolean>(false);

  // File Inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Auto locate GPS when modal opens
  useEffect(() => {
    if (isAiCheckInModalOpen) {
      setStep('pick_photo');
      setPhotoDataUrl('');
      setIsLocating(true);
      setLocationStatus(tr(language, 'កំពុងស្វែងរកទីតាំង GPS...', 'Acquiring GPS location...', '正在获取 GPS 定位...'));
      
      captureCurrentLocation()
        .then(coords => {
          setGpsCoords(coords);
          const prov = getProvinceFromGps(coords.latitude, coords.longitude);
          setProvinceKh(prov.provinceKh);
          setProvinceEn(prov.provinceEn);
          setIsLocating(false);
          setLocationStatus(tr(language, `GPS រួចរាល់ (${prov.provinceKh})`, `GPS Ready (${prov.provinceEn})`, `GPS 就绪 (${prov.provinceEn})`));
        })
        .catch(() => {
          setIsLocating(false);
          setLocationStatus(tr(language, 'ប្រើប្រាស់ទីតាំងលំនាំដើម', 'Using default location', '使用默认位置'));
        });
    }
  }, [isAiCheckInModalOpen, isKm]);

  if (!isAiCheckInModalOpen) return null;

  const handleClose = () => {
    setIsAiCheckInModalOpen(false);
    setStep('pick_photo');
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) {
      showToast(tr(language, 'សូមចូលគណនី Administrator ជាមុនសិន!', 'Please sign in with an Administrator account first!', '请先使用管理员账户登录！'), 'warning');
      setIsAuthModalOpen(true);
      return;
    }

    if (currentUser.role !== 'admin') {
      showToast(tr(language, 'មុខងារឆែកអ៊ីន & បន្ថែមហាងដោយ AI ត្រូវបានកំណត់សម្រាប់តែ Administrator ប៉ុណ្ណោះ!', 'AI Food Check-in is restricted to Administrator accounts only!', 'AI 美食打卡仅限管理员账户使用！'), 'warning');
      return;
    }

    // Rate limit check
    const rate = checkSubmissionRateLimit(currentUser.id);
    if (!rate.allowed) {
      showToast(
        tr(language, `អ្នកបានឆែកអ៊ីនលើសកម្រិតកំណត់ (អតិបរមា ១០ ដង/ម៉ោង)។ សូមរង់ចាំ ${rate.waitMinutes} នាទីទៀត!`, `Rate limit reached. Please wait ${rate.waitMinutes} minutes!`, `已达到频率限制。请等待 ${rate.waitMinutes} 分钟！`),
        'warning'
      );
      return;
    }

    try {
      setStep('analyzing');
      const compressed = await compressImage(file, 1200, 1200, 0.82);
      setPhotoDataUrl(compressed);

      // Run AI Vision & OCR Analysis
      const aiResult = await analyzeCheckInPhotoWithAi(compressed, gpsCoords);

      setRestaurantNameKh(aiResult.detectedRestaurantNameKh);
      setRestaurantNameEn(aiResult.detectedRestaurantNameEn);
      setFoodCategoryKh(aiResult.detectedFoodCategoryKh);
      setFoodCategoryEn(aiResult.detectedFoodCategoryEn);
      setSignatureDishes(aiResult.signatureDishes.join(', '));
      setAddressKh(aiResult.extractedAddressKh);
      setPhone(aiResult.extractedPhone || '');
      setAiDescriptionKh(aiResult.aiDescriptionKh);
      setConfidenceScore(aiResult.confidenceScore);
      setIsFoodOnlyPhoto(aiResult.isFoodOnlyPhoto);

      setStep('confirm_details');
    } catch (err: any) {
      console.error('Image processing error:', err);
      showToast(tr(language, 'បរាជ័យក្នុងការវិភាគរូបថត សូមព្យាយាមម្តងទៀត', 'Failed to analyze photo, please try again', '分析照片失败，请重试'), 'warning');
      setStep('pick_photo');
    }
  };

  const handleSubmit = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast(tr(language, 'មុខងារឆែកអ៊ីន & បន្ថែមហាងដោយ AI ត្រូវបានកំណត់សម្រាប់តែ Administrator ប៉ុណ្ណោះ!', 'AI Food Check-in is restricted to Administrator accounts only!', 'AI 美食打卡仅限管理员账户使用！'), 'warning');
      if (!currentUser) setIsAuthModalOpen(true);
      return;
    }

    if (!restaurantNameKh.trim()) {
      showToast(tr(language, 'សូមបញ្ចូលឈ្មោះហាង ឬអាហារដ្ឋាន!', 'Please enter restaurant name!', '请输入餐馆名称！'), 'warning');
      return;
    }

    setStep('submitting');

    const dishesArray = signatureDishes
      .split(/[,、،]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const submissionData = {
      userId: currentUser.id,
      userName: currentUser.name,
      restaurantNameKh: restaurantNameKh.trim(),
      restaurantNameEn: restaurantNameEn.trim() || restaurantNameKh.trim(),
      foodCategoryKh,
      foodCategoryEn,
      signatureDishes: dishesArray.length > 0 ? dishesArray : ['ម្ហូបពិសេសប្រចាំហាង'],
      photoUrl: photoDataUrl,
      latitude: gpsCoords.latitude,
      longitude: gpsCoords.longitude,
      addressKh: addressKh.trim() || `ស្ថិតនៅ ${provinceKh}`,
      addressEn: `Located in ${provinceEn}`,
      provinceKh,
      provinceEn,
      phone: phone.trim() || undefined,
      aiDescriptionKh: aiDescriptionKh.trim() || `ហាងដែលបានឆែកអ៊ីន និងបន្ថែមដោយ AI ក្នុង ${provinceKh}។`,
      aiDescriptionEn: `Restaurant verified via AI Smart Check-in in ${provinceEn}.`,
      confidenceScore: isFoodOnlyPhoto ? 0.75 : confidenceScore,
      verificationSource: (isFoodOnlyPhoto ? 'user_assisted' : 'ai_vision_ocr') as any,
      isFoodOnlyPhoto,
    };

    const res = await submitAiCheckIn(submissionData);

    setStep('pick_photo');
    setIsAiCheckInModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="kft-khmer-modal-header px-4 sm:px-5 pt-3 pb-3.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-moul text-xs sm:text-sm text-white">
                  {tr(language, 'ឆែកអ៊ីន & បន្ថែមហាងដោយ AI', 'AI Food Check-in', 'AI 美食打卡')}
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black shadow-xs">
                  Admin Only 🛡️
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 font-khmer flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-300" />
                <span>{locationStatus || (tr(language, 'GPS រួចរាល់', 'GPS Ready', 'GPS 就绪'))}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-khmer text-xs">
          {(!currentUser || currentUser.role !== 'admin') ? (
            <div className="py-10 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-moul text-sm text-stone-800 dark:text-stone-100">
                  {tr(language, 'មុខងារសម្រាប់ Administrator ប៉ុណ្ណោះ', 'Administrator Access Only', '仅限管理员访问')}
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                  {tr(language, 'មុខងារឆែកអ៊ីន & បន្ថែមហាងដោយស្វ័យប្រវត្តិតាមរយៈ AI ត្រូវបានកំណត់សិទ្ធិសម្រាប់តែគណនី Administrator ដើម្បីគ្រប់គ្រង និងត្រួតពិនិត្យទិន្នន័យ។', 'AI Check-in & Auto Add Restaurant is strictly restricted to Administrator accounts for data verification.', 'AI 打卡与自动添加餐馆仅限管理员账户使用，以确保数据核验准确。')}
                </p>
              </div>
              <button
                onClick={() => {
                  handleClose();
                  setIsAuthModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95"
              >
                {tr(language, 'ចូលគណនី Administrator', 'Sign in as Administrator', '以管理员身份登录')}
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: PICK PHOTO */}
          {step === 'pick_photo' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-slate-700 dark:text-emerald-200 space-y-2">
                <h4 className="font-bold text-sm text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{tr(language, 'ដំណើរការឆែកអ៊ីន ៣ ជំហានងាយៗ', '3 Simple Check-in Steps', '简单 3 步完成打卡')}</span>
                </h4>
                <p className="text-[11px] leading-relaxed">
                  {tr(language, 'គ្រាន់តែថតរូបស្លាកហាង ឬមុខម្ហូបពេលអ្នកទៅដល់ហាងអាហារ។ AI នឹងកំណត់អត្តសញ្ញាណទីតាំង និងព័ត៌មានហាងដោយស្វ័យប្រវត្តិ!', 'Simply take a photo of the shop sign or food. AI automatically identifies the place, location, and adds it!', '只需拍摄店铺招牌或美食照片。AI 即可自动识别地点、定位并完成添加！')}
                </p>
              </div>

              {/* Photo Input Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* Take Photo directly with Camera */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-6 rounded-3xl bg-gradient-to-br from-[#064E3B] to-[#047857] text-white flex flex-col items-center justify-center gap-2.5 shadow-md hover:scale-[1.02] active:scale-95 transition"
                >
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                    <Camera className="w-7 h-7 text-emerald-200" />
                  </div>
                  <span className="font-bold text-xs text-center">
                    {tr(language, 'ថតរូបភាពផ្ទាល់ (Camera)', 'Take Photo (Camera)', '拍照（相机）')}
                  </span>
                </button>

                {/* Pick from Gallery */}
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2.5 shadow-xs hover:scale-[1.02] active:scale-95 transition"
                >
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 text-slate-600 dark:text-slate-300" />
                  </div>
                  <span className="font-bold text-xs text-center">
                    {tr(language, 'រូបភាពរបស់ខ្ញុំ', 'My Photos', '我的相册')}
                  </span>
                </button>
              </div>

              {/* Hidden Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelected}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected}
              />

              {/* GPS status banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    GPS: {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#064E3B] dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px] font-bold">
                  ±{gpsCoords.accuracyMeters}m
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING WITH AI */}
          {step === 'analyzing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-moul text-sm text-[#064E3B] dark:text-emerald-400">
                  {tr(language, 'AI កំពុងវិភាគរូបថត & ស្គែនអក្សរ OCR...', 'AI Vision & OCR Scanning...', 'AI 视觉与 OCR 识别中...')}
                </h4>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  {tr(language, 'កំពុងសម្គាល់ស្លាកហាង មុខម្ហូប និងផ្ទៀងផ្ទាត់កូអរដោនេ GPS...', 'Detecting signage, food dishes, and spatial coordinates...', '正在检测招牌、菜品及空间坐标...')}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & EDIT DETAILS */}
          {step === 'confirm_details' && (
            <div className="space-y-4">
              {/* Photo preview banner */}
              <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-slate-200 dark:border-slate-700">
                <img loading="lazy" decoding="async" src={photoDataUrl} alt="Check-in Preview" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>AI Confidence: {Math.round(confidenceScore * 100)}%</span>
                  </span>
                </div>
              </div>

              {/* Food-only Warning prompt (Strictly prevents fabricating missing restaurant name) */}
              {isFoodOnlyPhoto && !restaurantNameKh && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      {tr(language, 'រូបថតនេះជាមុខម្ហូប (គ្មានស្លាកហាងច្បាស់លាស់)', 'Food dish detected without shop sign', '检测到菜品，未发现店铺招牌')}
                    </span>
                    <span className="text-[11px]">
                      {tr(language, 'ដើម្បីធានាភាពត្រឹមត្រូវ សូមជួយបញ្ចូលឈ្មោះហាង ឬតូបអាហារខាងក្រោម។', 'To ensure data integrity, please enter the restaurant or stall name below.', '为确保数据完整性，请在下方输入餐馆或摊位名称。')}
                    </span>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3">
                {/* Restaurant Name Khmer */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr(language, 'ឈ្មោះហាង ឬតូបអាហារ (ភាសាខ្មែរ) *', 'Restaurant Name (Khmer) *', '餐馆名称（高棉语）*')}
                  </label>
                  <input
                    type="text"
                    value={restaurantNameKh}
                    onChange={e => setRestaurantNameKh(e.target.value)}
                    placeholder={tr(language, 'ឧ. អាហារដ្ឋានខ្មែរឆ្ងាញ់', 'e.g. Khmer Food Place', '例如：高棉特色美食')}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-khmer text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                {/* Restaurant Name English */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr(language, 'ឈ្មោះហាង (អក្សរឡាតាំង/English)', 'Restaurant Name (English)', '餐馆名称（英语）')}
                  </label>
                  <input
                    type="text"
                    value={restaurantNameEn}
                    onChange={e => setRestaurantNameEn(e.target.value)}
                    placeholder="e.g. Khmer Tasty Restaurant"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-khmer text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                {/* Food Category & Province */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {tr(language, 'ប្រភេទអាហារ', 'Food Category', '美食分类')}
                    </label>
                    <select
                      value={foodCategoryKh}
                      onChange={e => setFoodCategoryKh(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-khmer text-xs outline-hidden"
                    >
                      <option value="អាហារដ្ឋាន & អាហារពេលព្រឹក">អាហារដ្ឋាន & អាហារពេលព្រឹក</option>
                      <option value="អាហារតាមផ្លូវ (Street Food)">អាហារតាមផ្លូវ (Street Food)</option>
                      <option value="ភោជនីយដ្ឋានម្ហូបខ្មែរ">ភោជនីយដ្ឋានម្ហូបខ្មែរ</option>
                      <option value="ហាងកាហ្វេ & ភេសជ្ជៈ">ហាងកាហ្វេ & ភេសជ្ជៈ</option>
                      <option value="បង្អែម & អាហារសម្រន់">បង្អែម & អាហារសម្រន់</option>
                      <option value="គ្រឿងសមុទ្រស្រស់">គ្រឿងសមុទ្រស្រស់</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {tr(language, 'រាជធានី/ខេត្ត', 'Province', '省份')}
                    </label>
                    <input
                      type="text"
                      value={provinceKh}
                      onChange={e => setProvinceKh(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-khmer text-xs outline-hidden"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr(language, 'លេខទូរស័ព្ទហាង (បើមាន)', 'Phone Number (Optional)', '电话号码（选填）')}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="012 345 678"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-khmer text-xs outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUBMITTING */}
          {step === 'submitting' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
              <h4 className="font-moul text-sm text-[#064E3B] dark:text-emerald-400">
                {tr(language, 'កំពុងកត់ត្រាការឆែកអ៊ីន & ត្រួតពិនិត្យភាពស្ទួន...', 'Recording Check-in & Checking Duplicates...', '正在记录打卡并检查重复项...')}
              </h4>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {currentUser?.role === 'admin' && step === 'confirm_details' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={() => setStep('pick_photo')}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-khmer text-xs font-bold transition"
            >
              {tr(language, 'ថតរូបឡើងវិញ', 'Retake', '重拍')}
            </button>

            <button
              onClick={handleSubmit}
              className="flex-1 py-2.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl shadow-md font-khmer text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Send className="w-4 h-4 text-emerald-300" />
              <span>{tr(language, 'បញ្ជាក់ & បន្ថែមហាង (Check in Now)', 'Confirm & Check in Now', '确认并立即打卡')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
