import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Crown, Sparkles, AlertCircle, RefreshCw, 
  ShieldCheck, Star, Clock,
  QrCode, ExternalLink, Send, CheckCircle2, ChevronRight
} from 'lucide-react';
import { TEN_VIP_BENEFITS, isUserVipActive, getVipRemainingDays } from '../types';
import { 
  VIP_ANNUAL_PRICE_USD, 
  VIP_SUBSCRIPTION_DAYS,
  VIP_QUARTERLY_PRICE_USD,
  VIP_QUARTERLY_DAYS 
} from '../services/paymentService';

// Official ABA KHQR Payload for KIMSENG CHEA (Dual Currency USD/KHR)
const OFFICIAL_ABA_KHQR_PAYLOAD = '00020101021129450016abaakhppxxx@abaa01090127199460208ABA Bank40600006abaP2P011232894800DA0E020901271994603090952459590404Dual5204599953031165802KH5912KIMSENG CHEA6010Phnom Penh63043CF9';

interface VipPlanOption {
  id: 'annual' | 'quarterly';
  titleKh: string;
  titleEn: string;
  days: number;
  priceUsd: number;
  priceKhrApprox: string;
  isPopular?: boolean;
}

const VIP_PLANS: VipPlanOption[] = [
  {
    id: 'annual',
    titleKh: 'កញ្ចប់សមាជិកប្រចាំឆ្នាំ (Annual VIP)',
    titleEn: 'Annual VIP Pass (365 Days)',
    days: VIP_SUBSCRIPTION_DAYS, // 365
    priceUsd: VIP_ANNUAL_PRICE_USD, // 9.99
    priceKhrApprox: '៤០,៥០០ រៀល',
    isPopular: true
  },
  {
    id: 'quarterly',
    titleKh: 'កញ្ចប់ ៣ ខែ (Quarterly VIP)',
    titleEn: 'Quarterly VIP Pass (90 Days)',
    days: VIP_QUARTERLY_DAYS, // 90
    priceUsd: VIP_QUARTERLY_PRICE_USD, // 2.99
    priceKhrApprox: '១២,២០០ រៀល',
    isPopular: false
  }
];

export const UpgradeVipModal: React.FC = () => {
  const { 
    isUpgradeVipModalOpen, 
    setIsUpgradeVipModalOpen, 
    currentUser, 
    language,
    showToast,
    setIsAuthModalOpen,
    submitVipUpgradeRequest,
    restoreCurrentUserVipPurchases
  } = useApp();

  const isKm = language === 'km';
  const isVip = isUserVipActive(currentUser);
  const remainingDays = getVipRemainingDays(currentUser);
  const isPendingApproval = currentUser?.subscriptionStatus === 'pending';

  // Plan Selection: default to 365 days / $9.99 USD
  const [selectedPlan, setSelectedPlan] = useState<VipPlanOption>(VIP_PLANS[0]);
  
  // UI Steps: 'overview' | 'submitting' | 'submitted_pending' | 'failed'
  const [step, setStep] = useState<'overview' | 'submitting' | 'submitted_pending' | 'failed'>('overview');
  // Supported backend payment methods: GooglePlayBilling & KHQR
  const [paymentMethod] = useState<'GooglePlayBilling' | 'KHQR'>('KHQR');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [submittedTxnId, setSubmittedTxnId] = useState('');

  if (!isUpgradeVipModalOpen) return null;

  const handleClose = () => {
    setIsUpgradeVipModalOpen(false);
    setTimeout(() => {
      setStep('overview');
      setErrorMessage('');
    }, 200);
  };

  const handleOpenAbaApp = () => {
    showToast(
      isKm 
        ? 'កំពុងបើក ABA Mobile... សូមស្កេន ឬទូទាត់ រួចចុចផ្ញើសំណើជូនរដ្ឋបាល!' 
        : 'Opening ABA Mobile... Please pay and submit your request for admin approval!',
      'info'
    );
    
    // Official supported ABA Mobile deep link with KHQR payload
    const abaDeepLink = `aba://qr?data=${encodeURIComponent(OFFICIAL_ABA_KHQR_PAYLOAD)}`;
    window.location.href = abaDeepLink;

    setTimeout(() => {
      // Fallback to ABA PayWay link if ABA app is not installed
      window.open('https://link.payway.com.kh/aba?id=095245959', '_blank');
    }, 800);
  };

  // Submit VIP Upgrade Request to Administrator (Strict Admin Review Flow)
  const handleSubmitRequest = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    setStep('submitting');
    setErrorMessage('');

    try {
      // Brief smooth transition
      await new Promise(r => setTimeout(r, 600));

      const result = await submitVipUpgradeRequest(
        selectedPlan.days,
        selectedPlan.priceUsd,
        `VIP Upgrade Request (${selectedPlan.days} Days / $${selectedPlan.priceUsd} USD) via ABA KHQR`
      );

      if (result.success) {
        setSubmittedTxnId(result.transactionId);
        setStep('submitted_pending');
      } else {
        setErrorMessage(isKm ? 'មិនអាចផ្ញើសំណើបានទេ។ សូមព្យាយាមម្តងទៀត។' : 'Failed to submit request. Please try again.');
        setStep('failed');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isKm ? 'មានបញ្ហាបច្ចេកទេស។' : 'An unexpected error occurred.'));
      setStep('failed');
    }
  };

  // Restore Purchases Handler
  const handleRestore = async () => {
    setIsRestoring(true);
    await new Promise(r => setTimeout(r, 800));
    await restoreCurrentUserVipPurchases();
    setIsRestoring(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-amber-500/30 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-[#064E3B] via-[#047857] to-amber-700 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-400 text-slate-900 shadow-md">
                <Crown className="w-5 h-5 fill-slate-900" />
              </div>
              <div>
                <h3 className="font-moul text-sm sm:text-base text-white flex items-center gap-1.5">
                  <span>{isKm ? 'ដំឡើងទៅជា Premium VIP' : 'Upgrade to Premium VIP'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black font-sans">
                    VIP
                  </span>
                </h3>
                <p className="text-[11px] text-amber-200 font-khmer">
                  {isKm ? 'កញ្ចប់សមាជិកភាព VIP • អត្ថប្រយោជន៍ពិសេស ១០ យ៉ាង' : 'Premium VIP Subscription • 10 Exclusive Benefits'}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto max-h-[80vh] p-5 space-y-4 font-khmer">
          
          {/* STEP: PENDING ADMIN APPROVAL (Already Submitted or Just Submitted) */}
          {(step === 'submitted_pending' || (step === 'overview' && isPendingApproval && !isVip)) && (
            <div className="py-6 text-center space-y-4 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-md ring-8 ring-amber-500/20">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold font-sans">
                  PENDING ADMIN APPROVAL
                </span>
                <h4 className="font-moul text-base text-slate-900 dark:text-white mt-2">
                  {isKm ? 'សំណើដំឡើង VIP កំពុងរង់ចាំការអនុម័ត' : 'VIP Request Pending Admin Approval'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                  {isKm 
                    ? 'សំណើដំឡើង Premium VIP របស់អ្នកត្រូវបានបញ្ជូនទៅរដ្ឋបាល (Admin) រួចរាល់ហើយ។ រដ្ឋបាលនឹងពិនិត្យផ្ទៀងផ្ទាត់ និងធ្វើឱ្យគណនីរបស់អ្នកសកម្មក្នុងពេលឆាប់ៗនេះ។' 
                    : 'Your VIP upgrade request has been submitted to the Administrator. The admin will verify the payment and activate your VIP status shortly.'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'ស្ថានភាពបច្ចុប្បន្ន៖' : 'Status:'}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {isKm ? '⏳ រង់ចាំរដ្ឋបាលអនុម័ត (Pending)' : '⏳ Pending Admin Verification'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{isKm ? 'កញ្ចប់ដែលបានស្នើ៖' : 'Requested Plan:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    Premium VIP ({selectedPlan.days} ថ្ងៃ - ${selectedPlan.priceUsd.toFixed(2)} USD)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{isKm ? 'វិធីបង់ប្រាក់៖' : 'Payment Method:'}</span>
                  <span className="font-mono font-bold text-[#004B87] dark:text-sky-400">
                    ABA KHQR ({paymentMethod})
                  </span>
                </div>
                {(submittedTxnId || currentUser?.transactionRef) && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Ref / Txn ID:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                      {submittedTxnId || currentUser?.transactionRef}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 text-left flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {isKm 
                    ? '💡 លោកអ្នកនឹងទទួលបានសារជូនដំណឹង (Notification) លើទូរស័ព្ទភ្លាមៗ នៅពេលរដ្ឋបាលចុចអនុម័តដំឡើង VIP!' 
                    : '💡 You will receive an instant in-app notification once the administrator approves your VIP upgrade!'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setStep('overview')}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  {isKm ? 'មើលកូដ ABA ម្តងទៀត' : 'View ABA QR Again'}
                </button>
                <button
                  onClick={handleClose}
                  className="py-2.5 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold transition shadow-md"
                >
                  {isKm ? 'យល់ព្រម (បិទ)' : 'Done (Close)'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Overview, Clean ABA KHQR Flyer & Submit VIP Request */}
          {step === 'overview' && !isPendingApproval && (
            <div className="space-y-4">
              {/* Current Status Pill */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  {isKm ? 'ស្ថានភាពគណនីបច្ចុប្បន្ន៖' : 'Current Account Status:'}
                </span>
                {isVip ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                    <Crown className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{isKm ? `Premium VIP (នៅសល់ ${remainingDays} ថ្ងៃ)` : `Premium VIP (${remainingDays} days left)`}</span>
                  </span>
                ) : (
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {isKm ? 'គណនីឥតគិតថ្លៃ (Free User)' : 'Free User'}
                  </span>
                )}
              </div>

              {/* VIP Subscription Plan Selector (365 Days $9.99 or 90 Days $2.99) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{isKm ? 'ជ្រើសរើសកញ្ចប់សមាជិកភាព VIP៖' : 'Select VIP Subscription Plan:'}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VIP_PLANS.map((plan) => {
                    const isSelected = selectedPlan.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/20 border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                        }`}
                      >
                        {plan.isPopular && (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider font-sans shadow-xs">
                            {isKm ? 'ពេញនិយមបំផុត (Best Value)' : 'Recommended'}
                          </span>
                        )}

                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            <span>{isKm ? plan.titleKh : plan.titleEn}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>

                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="font-moul text-xl sm:text-2xl text-slate-900 dark:text-white font-mono">
                              ${plan.priceUsd.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                              USD / {plan.days} {isKm ? 'ថ្ងៃ' : 'Days'}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {isKm ? `ប្រហែល ${plan.priceKhrApprox} • សុពលភាព ${plan.days} ថ្ងៃពេញ` : `Approx ${plan.priceKhrApprox} • Full ${plan.days} Days`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 10 VIP Benefits Accordion / Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{isKm ? 'អត្ថប្រយោជន៍ពិសេសទាំង ១០ យ៉ាងនៃ VIP៖' : '10 Exclusive VIP Benefits:'}</span>
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    100% Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-1">
                  {TEN_VIP_BENEFITS.map((b) => (
                    <div 
                      key={b.id}
                      className="p-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 text-xs"
                    >
                      <span className="w-5 h-5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-[10px] font-mono">
                        {b.id}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {isKm ? b.titleKh : b.titleEn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SIMPLIFIED ABA BANK QR DISPLAY (Official Flyer Only, No Clutter) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#004B87]" />
                    <span>{isKm ? 'ស្កេនទូទាត់តាមរយៈ ABA KHQR៖' : 'Scan to Pay via ABA KHQR:'}</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-full bg-[#004B87] text-white text-[9px] font-bold font-mono">
                    ABA KHQR Verified
                  </span>
                </div>

                {/* Official ABA Stand Flyer Presentation Card */}
                <div className="p-3.5 rounded-3xl bg-slate-50 dark:bg-slate-800/90 border-2 border-[#004B87]/30 shadow-xs text-center space-y-3">
                  
                  {/* Clean, Unmodified Official ABA Flyer Image */}
                  <div className="flex justify-center">
                    <div 
                      onClick={handleOpenAbaApp}
                      className="relative p-1.5 bg-white rounded-2xl shadow-md border border-[#004B87]/40 max-w-[260px] cursor-pointer hover:shadow-lg transition group"
                      title={isKm ? 'ចុចលើរូបដើម្បីបើកកម្មវិធី ABA Mobile' : 'Tap to open ABA Mobile'}
                    >
                      <img 
                        src="/images/aba_official_qr.png" 
                        alt="Official ABA KHQR Payment Flyer - KIMSENG CHEA" 
                        className="w-full h-auto object-contain rounded-xl"
                      />
                      <div className="absolute inset-0 bg-[#004B87]/5 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-[#004B87] text-white text-[10px] font-bold shadow-md">
                          {isKm ? '👆 ចុចដើម្បីបើក ABA' : '👆 Tap to open ABA'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 1-Tap Action to Open ABA Mobile App */}
                  <button
                    onClick={handleOpenAbaApp}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#004B87] hover:bg-[#003966] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {isKm 
                        ? `បើកកម្មវិធី ABA Mobile ដើម្បីទូទាត់ ($${selectedPlan.priceUsd.toFixed(2)})` 
                        : `Open ABA Mobile App to Pay ($${selectedPlan.priceUsd.toFixed(2)})`}
                    </span>
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isKm 
                      ? '💡 បើក ABA Mobile ដើម្បីស្កេន ឬទូទាត់តាមកូដ KHQR ខាងលើ។ លោកអ្នកក៏អាច Screenshot រូបភាពនេះ រួច Scan ក្នុង App ធនាគារណាមួយដែលគាំទ្រ KHQR។' 
                      : '💡 Open ABA Mobile to scan or pay via the KHQR above, or save a screenshot to scan from your photo gallery in any KHQR-supported banking app.'}
                  </p>
                </div>
              </div>

              {/* SUBMIT VIP UPGRADE REQUEST TO ADMIN (Strict Admin Review Button) */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={handleSubmitRequest}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ring-4 ring-emerald-500/20"
                >
                  <Send className="w-4 h-4 text-emerald-200" />
                  <span>
                    {isKm 
                      ? `📩 ផ្ញើសំណើដំឡើង VIP ជូនរដ្ឋបាល (${selectedPlan.days} ថ្ងៃ - $${selectedPlan.priceUsd.toFixed(2)}) →` 
                      : `📩 Submit VIP Upgrade Request to Admin (${selectedPlan.days} Days - $${selectedPlan.priceUsd.toFixed(2)}) →`}
                  </span>
                </button>

                <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
                  {isKm 
                    ? 'បន្ទាប់ពីទូទាត់តាម ABA រួច សូមចុចប៊ូតុងខាងលើ។ រដ្ឋបាល (Admin) នឹងពិនិត្យ និងអនុម័តដំឡើង VIP ជូនលោកអ្នកភ្លាមៗ។' 
                    : 'After paying via ABA, tap above to submit your request. The administrator will review and activate your VIP subscription promptly.'}
                </p>
              </div>

              {/* Restore Purchases & Security Guarantee */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="text-[#059669] hover:underline flex items-center gap-1 font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isKm ? 'ស្តារការជាវឡើងវិញ' : 'Restore Purchases'}</span>
                </button>

                <div className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isKm ? 'គាំទ្រ GooglePlayBilling & KHQR' : 'GooglePlayBilling & KHQR Supported'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Submitting Request */}
          {step === 'submitting' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'កំពុងផ្ញើសំណើទៅកាន់រដ្ឋបាល...' : 'Submitting Request to Admin...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isKm ? 'ប្រព័ន្ធកំពុងបញ្ជូនព័ត៌មានទៅកាន់ Admin Dashboard...' : 'Sending request details to the administrator queue...'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Failed */}
          {step === 'failed' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'មិនអាចផ្ញើសំណើបានទេ' : 'Submission Failed'}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {errorMessage || (isKm ? 'សូមព្យាយាមម្តងទៀត។' : 'Please try again.')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setStep('overview')}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  {isKm ? 'សាកល្បងម្តងទៀត' : 'Try Again'}
                </button>
                <button
                  onClick={handleClose}
                  className="py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                >
                  {isKm ? 'បិទ' : 'Close'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
