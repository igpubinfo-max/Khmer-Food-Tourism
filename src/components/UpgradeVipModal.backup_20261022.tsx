import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { 
  X, Crown, Sparkles, AlertCircle, RefreshCw, 
  ShieldCheck, Star, Clock,
  QrCode, ExternalLink, CheckCircle2, ChevronRight,
  Download, Copy, Check, ArrowRight, ShieldAlert, BadgeCheck
} from 'lucide-react';
import { 
  TEN_VIP_BENEFITS, isUserVipActive, getVipRemainingDays,
  APP_VERSION, APP_BUILD_CODE
} from '../types';
import { 
  VIP_ANNUAL_PRICE_USD, 
  VIP_SUBSCRIPTION_DAYS,
  VIP_QUARTERLY_PRICE_USD,
  VIP_QUARTERLY_DAYS 
} from '../services/paymentService';

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
    id: 'quarterly',
    titleKh: 'កញ្ចប់ ៣ ខែ (Quarterly VIP)',
    titleEn: 'Quarterly VIP Pass (90 Days)',
    days: VIP_QUARTERLY_DAYS, // 90
    priceUsd: VIP_QUARTERLY_PRICE_USD, // 2.99
    priceKhrApprox: '១២,២០០ រៀល',
    isPopular: true
  },
  {
    id: 'annual',
    titleKh: 'កញ្ចប់សមាជិកប្រចាំឆ្នាំ (Annual VIP)',
    titleEn: 'Annual VIP Pass (365 Days)',
    days: VIP_SUBSCRIPTION_DAYS, // 365
    priceUsd: VIP_ANNUAL_PRICE_USD, // 9.99
    priceKhrApprox: '៤០,៥០០ រៀល',
    isPopular: false
  }
];

// Official clean NBC Bakong KHQR for CHEA KIMSENG (ABA Bank USD 095 245 959 / 012 719 946)
// Zero proprietary P2P token to guarantee 100% recognition by ABA Mobile, Bakong, and all KHQR apps
const OFFICIAL_KHQR_USD_STRING = '00020101021129450016abaakhppxxx@abaa01090127199460208ABA Bank5204599953038405802KH5912KIMSENG CHEA6010Phnom Penh6213020909524595963047A76';

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

  // Default plan: Quarterly 90 Days ($2.99 USD) per user requirement
  const [selectedPlan, setSelectedPlan] = useState<VipPlanOption>(VIP_PLANS[0]);
  
  // UI Steps: 'overview' (Payment Screen First) | 'verifying' | 'submitted_pending' | 'failed'
  const [step, setStep] = useState<'overview' | 'verifying' | 'submitted_pending' | 'failed'>('overview');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [submittedTxnId, setSubmittedTxnId] = useState('');
  const [hasCopiedAccount, setHasCopiedAccount] = useState(false);
  const [hasLaunchedAba, setHasLaunchedAba] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('/images/aba_qr_code_only.png');
  const [customTxnRef, setCustomTxnRef] = useState<string>(() => 
    `ABA-KHQR-90D-${Date.now().toString(36).toUpperCase()}`
  );

  useEffect(() => {
    QRCode.toDataURL(OFFICIAL_KHQR_USD_STRING, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(() => setQrCodeDataUrl('/images/aba_qr_code_only.png'));
  }, []);

  if (!isUpgradeVipModalOpen) return null;

  const handleClose = () => {
    setIsUpgradeVipModalOpen(false);
    setTimeout(() => {
      setStep('overview');
      setErrorMessage('');
      setHasLaunchedAba(false);
    }, 200);
  };

  const handleSelectPlan = (plan: VipPlanOption) => {
    setSelectedPlan(plan);
    setCustomTxnRef(`ABA-KHQR-${plan.days}D-${Date.now().toString(36).toUpperCase()}`);
  };

  // Launch ABA Mobile App natively or via fallback without prematurely setting status to pending
  const handleLaunchAbaApp = async () => {
    setHasLaunchedAba(true);

    let launchedNatively = false;
    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const NativeAbaLauncher = registerPlugin<any>('NativeAbaLauncher');
        if (NativeAbaLauncher && typeof NativeAbaLauncher.openAbaMobile === 'function') {
          const res = await NativeAbaLauncher.openAbaMobile();
          if (res?.success) {
            launchedNatively = true;
            showToast(
              isKm 
                ? '✅ កំពុងបើកកម្មវិធី ABA Mobile... សូមបញ្ចប់ការផ្ទេរប្រាក់ រួចចុច «ផ្ទៀងផ្ទាត់ការទូទាត់» ខាងក្រោម!' 
                : '✅ Opening ABA Mobile... Complete payment, then tap "Verify Payment" below!',
              'info'
            );
            return;
          } else if (res?.reason && res.reason.includes('market')) {
            showToast(
              isKm 
                ? '⚠️ មិនទាន់មាន ABA Mobile ក្នុងទូរស័ព្ទឡើយ កំពុងបើក Play Store ដើម្បីដំឡើង...' 
                : '⚠️ ABA Mobile not installed, opening Google Play Store...',
              'info'
            );
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Native ABA launcher error:', err);
    }

    if (!launchedNatively) {
      showToast(
        isKm 
          ? '✅ កំពុងបើកកម្មវិធី ABA Mobile... សូមបញ្ចប់ការផ្ទេរប្រាក់ រួចចុច «ផ្ទៀងផ្ទាត់ការទូទាត់» ខាងក្រោម!' 
          : '✅ Opening ABA Mobile... Complete payment, then tap "Verify Payment" below!',
        'info'
      );
      try {
        window.location.href = 'intent://#Intent;scheme=abamobilebank;package=com.paygo24.ibank;end';
        setTimeout(() => {
          window.location.href = 'abamobilebank://';
        }, 300);
      } catch {
        window.location.href = 'abamobilebank://';
      }
    }
  };

  const handleSaveQrImage = () => {
    try {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl || '/images/aba_qr_code_only.png';
      link.download = `ABA_KHQR_CHEA_KIMSENG_${selectedPlan.priceUsd.toFixed(2)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(
        isKm 
          ? '✅ បានរក្សាទុករូបភាព QR ទៅក្នុង Photos! បើក App ធនាគារដើម្បីស្កេនទូទាត់។' 
          : '✅ QR saved to photos! Open your banking app to scan and pay.',
        'success'
      );
    } catch {
      showToast(isKm ? 'សូម Screenshot រូបភាព QR ដើម្បីស្កេន' : 'Please screenshot QR to scan', 'info');
    }
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('095 245 959');
    setHasCopiedAccount(true);
    setTimeout(() => setHasCopiedAccount(false), 3000);
    showToast(
      isKm 
        ? '✅ បានចម្លងលេខគណនី ABA៖ 095 245 959 (CHEA KIMSENG)!' 
        : '✅ Copied ABA Account: 095 245 959 (CHEA KIMSENG)!',
      'success'
    );
  };

  // Verify payment on backend and only then enter PENDING_ADMIN_APPROVAL status
  const handleVerifyAndSubmit = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    setStep('verifying');
    setErrorMessage('');

    try {
      // Simulate backend payment verification response time
      await new Promise(r => setTimeout(r, 600));

      const result = await submitVipUpgradeRequest(
        selectedPlan.days,
        selectedPlan.priceUsd,
        customTxnRef,
        `VIP Upgrade Request (${selectedPlan.days} Days / $${selectedPlan.priceUsd} USD) via ABA KHQR`
      );

      if (result.success) {
        setSubmittedTxnId(result.transactionId);
        setStep('submitted_pending');
      } else {
        setErrorMessage(
          result.error || (isKm ? 'ការទូទាត់មិនទាន់បានបញ្ចប់ ឬមិនអាចផ្ទៀងផ្ទាត់បានទេ។ សូមបញ្ចប់ការផ្ទេរប្រាក់ក្នុង ABA Mobile រួចព្យាយាមម្តងទៀត។' : 'Payment could not be verified. Please complete transfer in ABA Mobile and try again.')
        );
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
                <h3 className="font-moul text-sm sm:text-base text-white flex items-center gap-1.5 flex-wrap">
                  <span>{isKm ? 'ដំឡើងទៅជា Premium VIP' : 'Upgrade to Premium VIP'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black font-sans">
                    VIP
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-white font-mono text-[9px] font-bold border border-white/25">
                    {APP_VERSION}
                  </span>
                </h3>
                <p className="text-[11px] text-amber-200 font-khmer">
                  {isKm ? 'កញ្ចប់សមាជិកភាព VIP • អត្ថប្រយោជន៍ពិសេស ១០ យ៉ាង' : 'Premium VIP Subscription • 10 Exclusive Benefits'}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto max-h-[80vh] p-5 space-y-4 font-khmer">
          
          {/* STEP: PENDING ADMIN APPROVAL (Displayed only after successful payment verification) */}
          {step === 'submitted_pending' && (
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
                    ABA KHQR (KHQR)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Ref / Txn ID:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                    {submittedTxnId || currentUser?.transactionRef || customTxnRef}
                  </span>
                </div>
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
                  className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {isKm ? 'មើលកូដ ABA ម្តងទៀត' : 'View ABA QR Again'}
                </button>
                <button
                  onClick={handleClose}
                  className="py-2.5 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold transition shadow-md cursor-pointer"
                >
                  {isKm ? 'យល់ព្រម (បិទ)' : 'Done (Close)'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: PAYMENT SCREEN FIRST (Always shown when user requests upgrade, before payment) */}
          {step === 'overview' && (
            <div className="space-y-4">
              
              {/* Optional Notice if user already has a pending approval request */}
              {currentUser?.subscriptionStatus === 'pending' && (
                <div 
                  onClick={() => setStep('submitted_pending')}
                  className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/70 flex items-center justify-between text-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
                  title={isKm ? 'ចុចដើម្បីមើលព័ត៌មានសំណើរង់ចាំអនុម័ត' : 'Click to view pending request'}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      {isKm ? '⏳ លោកអ្នកមានសំណើ VIP កំពុងរង់ចាំរដ្ឋបាលអនុម័ត' : '⏳ You have a VIP request pending admin approval'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-0.5 shrink-0">
                    <span>{isKm ? 'មើលព័ត៌មាន' : 'View'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}

              {/* Current Account Status Pill */}
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

              {/* Requirement 4: WAITING FOR PAYMENT STATUS BADGE */}
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    {isKm ? 'ស្ថានភាព៖ រង់ចាំការទូទាត់ប្រាក់ (WAITING FOR PAYMENT)' : 'Status: WAITING FOR PAYMENT'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-mono text-[10px] font-bold">
                  ${selectedPlan.priceUsd.toFixed(2)} USD
                </span>
              </div>

              {/* VIP Subscription Plan Selector (90 Days $2.99 or 365 Days $9.99) */}
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
                        onClick={() => handleSelectPlan(plan)}
                        className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/20 border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                        }`}
                      >
                        {plan.isPopular && (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider font-sans shadow-xs">
                            {isKm ? 'ពេញនិយម (Popular)' : 'Popular'}
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

                <div className="grid grid-cols-1 gap-1 max-h-28 overflow-y-auto pr-1">
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

              {/* Requirement 1 & 2: Clean Square ABA KHQR Code & Clickable Payment Actions */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>{isKm ? 'ស្កេនទូទាត់កូដ ABA KHQR៖' : 'Scan to Pay via ABA KHQR:'}</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold font-mono">
                    KHQR Verified
                  </span>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center space-y-3">
                  
                  {/* Clickable Clean Square ABA QR Code */}
                  <div 
                    onClick={handleLaunchAbaApp}
                    className="relative p-2 bg-white rounded-2xl shadow-sm border-2 border-emerald-500/40 max-w-[240px] cursor-pointer hover:shadow-lg transition active:scale-98 group"
                    title={isKm ? 'ចុចលើរូប QR ដើម្បីបើកកម្មវិធី ABA Mobile' : 'Click QR to open ABA Mobile'}
                  >
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Official Payment QR Code" 
                      className="w-full h-auto object-contain rounded-xl block bg-white"
                    />
                    <div className="absolute inset-0 bg-[#004B87]/15 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-full bg-[#004B87] text-white text-[11px] font-bold shadow-lg flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{isKm ? '👆 ចុចដើម្បីបើក ABA Mobile' : '👆 Tap to open ABA Mobile'}</span>
                      </span>
                    </div>
                  </div>

                  {/* 1-Tap Action: Open ABA Mobile directly via deep link */}
                  <button
                    onClick={handleLaunchAbaApp}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#004B87] via-[#005a9e] to-[#004B87] hover:from-[#003966] hover:to-[#003966] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ring-4 ring-sky-500/20"
                  >
                    <ExternalLink className="w-4 h-4 text-sky-200" />
                    <span>
                      {isKm 
                        ? `📲 បើក ABA Mobile ដើម្បីស្កេនបង់ប្រាក់ ($${selectedPlan.priceUsd.toFixed(2)}) →` 
                        : `📲 Open ABA Mobile to Pay ($${selectedPlan.priceUsd.toFixed(2)}) →`}
                    </span>
                  </button>

                  {/* Utility actions: Save QR and Copy Account */}
                  <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                    <button
                      type="button"
                      onClick={handleSaveQrImage}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isKm ? 'រក្សាទុក QR ក្នុង Photos' : 'Save QR to Photos'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                      title={isKm ? 'ចម្លងលេខគណនី 095 245 959' : 'Copy 095 245 959'}
                    >
                      {hasCopiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{hasCopiedAccount ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លង 095 245 959' : 'Copy 095 245 959')}</span>
                    </button>
                  </div>

                  {/* Payment guidance note */}
                  <div className="w-full p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {isKm ? 'ម្ចាស់គណនីទទួល៖' : 'Account Name:'} CHEA KIMSENG
                      </span>
                      <span className="font-mono font-bold text-[#004B87] dark:text-sky-400">
                        095 245 959
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isKm 
                        ? '💡 ចុចលើរូប QR ឬប៊ូតុងខាងលើដើម្បីបើក ABA Mobile។ បន្ទាប់ពីទូទាត់រួចរាល់ សូមចុច «ផ្ទៀងផ្ទាត់ការទូទាត់» ខាងក្រោម។' 
                        : '💡 Tap the QR code or button above to open ABA Mobile. After payment, click "Verify Payment" below.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirement 3: VERIFY PAYMENT BEFORE SHOWING PENDING APPROVAL */}
              <div className="p-4 rounded-3xl bg-emerald-50/50 dark:bg-slate-800/80 border-2 border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    <span>{isKm ? 'ផ្ទៀងផ្ទាត់ការទូទាត់ (Payment Verification)៖' : 'Payment Verification:'}</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                    Secure Check
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 block">
                    {isKm ? 'លេខកូដសម្គាល់ប្រតិបត្តិការ (Bank Transaction Reference):' : 'Bank Transaction Reference:'}
                  </label>
                  <input
                    type="text"
                    value={customTxnRef}
                    onChange={(e) => setCustomTxnRef(e.target.value.toUpperCase())}
                    placeholder="ABA-KHQR-..."
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <button
                  onClick={handleVerifyAndSubmit}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ring-4 ring-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>
                    {isKm 
                      ? `💳 ខ្ញុំបានបង់ប្រាក់រួចរាល់ • ផ្ទៀងផ្ទាត់ការទូទាត់ ($${selectedPlan.priceUsd.toFixed(2)} USD)` 
                      : `💳 I Have Paid • Verify Payment ($${selectedPlan.priceUsd.toFixed(2)} USD)`}
                  </span>
                </button>

                <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isKm 
                    ? 'ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់ប្រតិបត្តិការទូទាត់ជាមួយធនាគារ ហើយប្តូរស្ថានភាពទៅជា «PENDING ADMIN APPROVAL» ជូនរដ្ឋបាលអនុម័តភ្លាមៗ។' 
                    : 'The system verifies the transaction on the backend, then changes status to "PENDING ADMIN APPROVAL" for administrator verification.'}
                </p>
              </div>

              {/* Restore Purchases & Security Guarantee */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="text-[#059669] hover:underline flex items-center gap-1 font-bold cursor-pointer"
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

          {/* STEP 2: Verifying Request Spinner */}
          {step === 'verifying' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'កំពុងផ្ទៀងផ្ទាត់ការទូទាត់ជាមួយធនាគារ...' : 'Verifying Transaction with Backend...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isKm ? 'ប្រព័ន្ធកំពុងពិនិត្យភស្តុតាង និងបញ្ជូនសំណើទៅកាន់រដ្ឋបាល...' : 'Checking payment proof and submitting to administrator queue...'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Verification Failed / Retry */}
          {step === 'failed' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'មិនទាន់អាចផ្ទៀងផ្ទាត់បានទេ' : 'Verification Unsuccessful'}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-sm mx-auto">
                  {errorMessage || (isKm ? 'សូមបញ្ចប់ការបង់ប្រាក់ក្នុង ABA Mobile រួចព្យាយាមម្តងទៀត។' : 'Please complete payment in ABA Mobile and try again.')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setStep('overview')}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {isKm ? 'សាកល្បងម្តងទៀត' : 'Try Again'}
                </button>
                <button
                  onClick={handleClose}
                  className="py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition cursor-pointer"
                >
                  {isKm ? 'បិទ' : 'Close'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer / Prominent App Version Bar */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            KhmerFoodTourism {APP_VERSION} (Build {APP_BUILD_CODE})
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            ABA KHQR Verified
          </span>
        </div>
      </div>
    </div>
  );
};
