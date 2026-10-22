import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { 
  X, Crown, Sparkles, AlertCircle, RefreshCw, 
  ShieldCheck, Star, Clock,
  QrCode, ExternalLink, CheckCircle2,
  Download, Copy, Check, ArrowRight, ShieldAlert, BadgeCheck,
  CheckCircle, XCircle
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
// Zero proprietary P2P token and zero PayWay checkout wrapper to guarantee 100% recognition by ABA Scan & Bakong
const OFFICIAL_KHQR_USD_STRING = '00020101021129450016abaakhppxxx@abaa01090127199460208ABA Bank5204599953038405802KH5912KIMSENG CHEA6010Phnom Penh6213020909524595963047A76';

// Strict 6-State Payment Status Flow (Requirement 6)
export type PaymentStatusFlow = 
  | 'AWAITING_PAYMENT'
  | 'PENDING_ADMIN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_FAILED'
  | 'EXPIRED';

export const UpgradeVipModal: React.FC = () => {
  const { 
    isUpgradeVipModalOpen, 
    setIsUpgradeVipModalOpen, 
    currentUser, 
    transactions,
    language,
    showToast,
    setIsAuthModalOpen,
    submitVipUpgradeRequest,
    restoreCurrentUserVipPurchases
  } = useApp();

  const isKm = language === 'km';
  const isVip = isUserVipActive(currentUser);
  const remainingDays = getVipRemainingDays(currentUser);

  // Default plan: Quarterly 90 Days ($2.99 USD)
  const [selectedPlan, setSelectedPlan] = useState<VipPlanOption>(VIP_PLANS[0]);
  
  // Payment Lifecycle State
  const [paymentState, setPaymentState] = useState<PaymentStatusFlow>('AWAITING_PAYMENT');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [submittedTxnId, setSubmittedTxnId] = useState('');
  const [submissionTimestamp, setSubmissionTimestamp] = useState('');
  const [hasCopiedAccount, setHasCopiedAccount] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('/images/aba_qr_code_only.png');
  const [customTxnRef, setCustomTxnRef] = useState<string>(() => 
    `ABA-KHQR-90D-${Date.now().toString(36).toUpperCase()}`
  );
  const [sessionExpiryTime, setSessionExpiryTime] = useState<number>(() => Date.now() + 15 * 60 * 1000);

  // Find latest VIP transaction for this user from persisted database
  const userLatestVipTxn = useMemo(() => {
    if (!currentUser) return undefined;
    return transactions.find(
      t => t.type === 'user_vip_upgrade' && (t.userId === currentUser.id || t.userEmail === currentUser.email)
    );
  }, [transactions, currentUser]);

  // Synchronize UI with real backend/persisted status whenever modal opens or user/transactions change
  useEffect(() => {
    if (!isUpgradeVipModalOpen || !currentUser) return;

    if (isUserVipActive(currentUser) && currentUser.paymentStatus === 'verified') {
      setPaymentState('APPROVED');
    } else if (
      currentUser.subscriptionStatus === 'pending' || 
      currentUser.paymentStatus === 'paid_pending_approval' ||
      userLatestVipTxn?.status === 'pending_verification'
    ) {
      setPaymentState('PENDING_ADMIN_APPROVAL');
      if (userLatestVipTxn) {
        setSubmittedTxnId(userLatestVipTxn.id);
        setCustomTxnRef(userLatestVipTxn.transactionRef);
        setSubmissionTimestamp(userLatestVipTxn.createdAt);
      }
    } else if (
      currentUser.paymentStatus === 'failed' || 
      userLatestVipTxn?.status === 'rejected'
    ) {
      setPaymentState('REJECTED');
    } else {
      setPaymentState('AWAITING_PAYMENT');
    }
  }, [isUpgradeVipModalOpen, currentUser, userLatestVipTxn]);

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
  };

  const handleSelectPlan = (plan: VipPlanOption) => {
    setSelectedPlan(plan);
    setCustomTxnRef(`ABA-KHQR-${plan.days}D-${Date.now().toString(36).toUpperCase()}`);
    setSessionExpiryTime(Date.now() + 15 * 60 * 1000);
    try {
      localStorage.setItem('kft_user_active_plan_type', plan.id);
    } catch {}
  };

  const handleRestartSession = () => {
    setCustomTxnRef(`ABA-KHQR-${selectedPlan.days}D-${Date.now().toString(36).toUpperCase()}`);
    setSessionExpiryTime(Date.now() + 15 * 60 * 1000);
    setPaymentState('AWAITING_PAYMENT');
    setErrorMessage('');
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
          ? '✅ បានរក្សាទុករូបភាព QR ទៅក្នុង Photos! បើក ABA Scan រួចចុច Upload QR ដើម្បីបង់ប្រាក់។' 
          : '✅ QR saved to Photos! Open ABA Scan and tap Upload QR to pay.',
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

  // Requirement 1: Launch ABA Mobile cleanly WITHOUT unsupported type=payway parameter (Eliminates [MAPP-PW] Invalid Qr Merchant Data)
  const handleLaunchAbaApp = async () => {
    // Auto-save clean QR image to device Photos so user can tap "Upload QR" inside ABA Mobile Scan
    handleSaveQrImage();
    navigator.clipboard?.writeText('095 245 959').catch(() => {});

    let launchedNatively = false;
    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const NativeAbaLauncher = registerPlugin<any>('NativeAbaLauncher');
        if (NativeAbaLauncher && typeof NativeAbaLauncher.openAbaMobile === 'function') {
          const res = await NativeAbaLauncher.openAbaMobile({
            amount: selectedPlan.priceUsd.toString()
          });
          if (res?.success) {
            launchedNatively = true;
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
      try {
        window.location.href = 'intent://#Intent;scheme=abamobilebank;package=com.paygo24.ibank;end';
        setTimeout(() => {
          window.location.href = 'abamobilebank://';
        }, 300);
      } catch {
        window.location.href = 'abamobilebank://';
      }
    }

    showToast(
      isKm 
        ? '📲 កំពុងបើក ABA Mobile... សូមចុច "ABA Scan" រួចចុច "Upload QR" ដើម្បីជ្រើសរើសរូបភាព QR ដែលបានរក្សាទុក!' 
        : '📲 Opening ABA Mobile... Tap "ABA Scan" then "Upload QR" to select the saved QR image!',
      'info'
    );
  };

  // Requirement 2 & 3: Submit Payment Confirmation Request to Admin Queue (NEVER activates VIP directly!)
  const handleSubmitPaymentForAdminApproval = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    // Check session timeout (15 mins)
    if (Date.now() > sessionExpiryTime) {
      setPaymentState('EXPIRED');
      return;
    }

    setIsSubmittingRequest(true);
    setErrorMessage('');

    try {
      await new Promise(r => setTimeout(r, 800));

      const reqResult = await submitVipUpgradeRequest(
        selectedPlan.days,
        selectedPlan.priceUsd,
        customTxnRef,
        `VIP Upgrade Request (${selectedPlan.days} Days / $${selectedPlan.priceUsd.toFixed(2)} USD) via ABA KHQR — Pending Admin Verification`
      );

      setIsSubmittingRequest(false);

      if (reqResult.success) {
        setSubmittedTxnId(reqResult.transactionId);
        setSubmissionTimestamp(new Date().toISOString().replace('T', ' ').slice(0, 16));
        setPaymentState('PENDING_ADMIN_APPROVAL');
      } else {
        setErrorMessage(
          reqResult.error || (isKm ? 'មិនអាចបញ្ជូនសំណើបានទេ សូមព្យាយាមម្តងទៀត។' : 'Could not submit payment request. Please try again.')
        );
        setPaymentState('PAYMENT_FAILED');
      }
    } catch (err: any) {
      setIsSubmittingRequest(false);
      setErrorMessage(err?.message || (isKm ? 'មានបញ្ហាបច្ចេកទេសក្នុងការបញ្ជូនសំណើ។' : 'Technical error occurred while submitting request.'));
      setPaymentState('PAYMENT_FAILED');
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
                  {isKm ? 'កញ្ចប់សមាជិកភាព VIP • អនុម័តដោយរដ្ឋបាលផ្លូវការ' : 'Premium VIP Subscription • Official Admin Verification'}
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
          
          {/* STATE 3: APPROVED (Displayed ONLY after Administrator approves in Admin Dashboard) */}
          {paymentState === 'APPROVED' && isVip && (
            <div className="py-6 text-center space-y-4 animate-scale-up">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg ring-8 ring-amber-400/20">
                  <Crown className="w-10 h-10 text-white fill-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold font-sans">
                  PAYMENT VERIFIED • VIP ACTIVE
                </span>
                <h4 className="font-moul text-lg text-slate-900 dark:text-white mt-2">
                  {isKm ? '🎉 សមាជិកភាព VIP ត្រូវបានអនុម័ត!' : '🎉 VIP Membership Approved!'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  {isKm 
                    ? `រដ្ឋបាលបានផ្ទៀងផ្ទាត់ការទូទាត់ និងអនុម័តគណនី Premium VIP របស់អ្នករួចរាល់ (នៅសល់ ${remainingDays} ថ្ងៃ)!` 
                    : `Administrator verified your payment and activated your Premium VIP account (${remainingDays} days remaining)!`}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'ស្ថានភាពគណនី៖' : 'Account Status:'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isKm ? `VIP សកម្ម (${remainingDays} ថ្ងៃ)` : `VIP Active (${remainingDays} Days)`}</span>
                  </span>
                </div>
                {currentUser?.subscriptionExpiryDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isKm ? 'ថ្ងៃផុតកំណត់៖' : 'Expiration Date:'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currentUser.subscriptionExpiryDate.split('T')[0]}
                    </span>
                  </div>
                )}
                {currentUser?.transactionRef && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Ref:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                      {currentUser.transactionRef}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <span>{isKm ? '🚀 បន្តប្រើប្រាស់កម្មវិធី (រួចរាល់)' : '🚀 Continue to App (Done)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STATE 2: PENDING_ADMIN_APPROVAL (Displayed when user clicks confirmation button — VIP is NOT active) */}
          {paymentState === 'PENDING_ADMIN_APPROVAL' && (
            <div className="py-5 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-400/20">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold font-sans">
                  PENDING_ADMIN_APPROVAL
                </span>
                <h4 className="font-moul text-base text-slate-900 dark:text-white mt-2">
                  {isKm ? '⏳ កំពុងរង់ចាំ Admin ពិនិត្យការទូទាត់' : '⏳ Awaiting Admin Payment Verification'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  {isKm 
                    ? 'សំណើផ្ទៀងផ្ទាត់ការទូទាត់របស់អ្នកត្រូវបានកត់ត្រាទុកក្នុងប្រព័ន្ធ។ រដ្ឋបាល (Admin) នឹងពិនិត្យផ្ទៀងផ្ទាត់ទឹកប្រាក់ក្នុងគណនី ABA ជាមុនសិន មុននឹងបើកដំណើរការគណនី VIP ជូនលោកអ្នក។' 
                    : 'Your payment verification request has been recorded. An administrator will verify the actual receipt in ABA before activating your VIP membership.'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'ស្ថានភាពគណនីបច្ចុប្បន្ន៖' : 'Current Account Level:'}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {isKm ? 'គណនីធម្មតា (មិនទាន់បើក VIP)' : 'Free Account (VIP Locked)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{isKm ? 'ស្ថានភាពសំណើ៖' : 'Request Status:'}</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    {isKm ? 'កំពុងរង់ចាំ Admin អនុម័ត' : 'Pending Admin Approval'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{isKm ? 'កញ្ចប់ដែលបានស្នើសុំ៖' : 'Requested Plan:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${(userLatestVipTxn?.amountUsd || selectedPlan.priceUsd).toFixed(2)} USD ({userLatestVipTxn?.durationDays || selectedPlan.days} {isKm ? 'ថ្ងៃ' : 'Days'})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{isKm ? 'លេខសម្គាល់សំណើ (Ref)៖' : 'Payment Ref:'}</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {userLatestVipTxn?.transactionRef || customTxnRef}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{isKm ? 'ពេលវេលាបញ្ជូន៖' : 'Submitted At:'}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {submissionTimestamp || userLatestVipTxn?.createdAt || new Date().toISOString().replace('T', ' ').slice(0, 16)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 text-left">
                {isKm 
                  ? '🔒 សម្គាល់សុវត្ថិភាព៖ មុខងារ VIP នឹងត្រូវបានបើកដំណើរការដោយស្វ័យប្រវត្តិភ្លាមៗ បន្ទាប់ពីរដ្ឋបាលពិនិត្យឃើញទឹកប្រាក់ចូលក្នុងគណនី ABA និងចុចអនុម័ត (Approve)។' 
                  : '🔒 Security Note: VIP features will unlock automatically once the administrator confirms receipt in ABA and approves your request.'}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                {isKm ? 'យល់ព្រម (បិទផ្ទាំងនេះ)' : 'Understood (Close)'}
              </button>
            </div>
          )}

          {/* STATE 4: REJECTED */}
          {paymentState === 'REJECTED' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                <XCircle className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-bold font-sans">
                  REJECTED
                </span>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white mt-2">
                  {isKm ? '❌ សំណើទូទាត់ត្រូវបានបដិសេធដោយ Admin' : '❌ Payment Request Rejected'}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {userLatestVipTxn?.notes || (isKm ? 'រដ្ឋបាលមិនឃើញមានប្រតិបត្តិការទូទាត់ប្រាក់នេះក្នុងរបាយការណ៍ធនាគារ ABA ឡើយ។ សូមពិនិត្យ និងព្យាយាមបង់ប្រាក់ម្តងទៀត។' : 'Administrator could not verify this payment in the ABA bank statement. Please check and retry payment.')}
                </p>
              </div>

              <button
                onClick={handleRestartSession}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-md"
              >
                {isKm ? '🔄 បង្កើតសំណើទូទាត់ប្រាក់ថ្មី' : '🔄 Start New Payment Request'}
              </button>
            </div>
          )}

          {/* STATE 5: PAYMENT_FAILED */}
          {paymentState === 'PAYMENT_FAILED' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-bold font-sans">
                  PAYMENT_FAILED
                </span>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white mt-2">
                  {isKm ? 'សំណើទូទាត់មិនជោគជ័យ' : 'Payment Request Failed'}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {errorMessage || (isKm ? 'សូមបញ្ចប់ការបង់ប្រាក់ក្នុង ABA Mobile រួចព្យាយាមម្តងទៀត។' : 'Please complete the transfer in ABA Mobile and try again.')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleRestartSession}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-md"
                >
                  {isKm ? '🔄 ព្យាយាមម្តងទៀត' : '🔄 Try Again'}
                </button>
                <button
                  onClick={() => setPaymentState('AWAITING_PAYMENT')}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {isKm ? 'ត្រឡប់ក្រោយ' : 'Back'}
                </button>
              </div>
            </div>
          )}

          {/* STATE 6: EXPIRED */}
          {paymentState === 'EXPIRED' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-md">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-xs font-bold font-sans">
                  EXPIRED
                </span>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white mt-2">
                  {isKm ? 'វគ្គទូទាត់ប្រាក់បានផុតកំណត់' : 'Payment Session Expired'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {isKm 
                    ? 'វគ្គទូទាត់កូដ QR នេះបានផុតកំណត់ដើម្បីសុវត្ថិភាព។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតវគ្គទូទាត់ថ្មី។' 
                    : 'This payment session has timed out for security. Tap below to start a fresh session.'}
                </p>
              </div>

              <button
                onClick={handleRestartSession}
                className="w-full py-2.5 px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                {isKm ? '🔄 បង្កើតវគ្គទូទាត់ថ្មី' : '🔄 Start New Payment Session'}
              </button>
            </div>
          )}

          {/* STATE 1: AWAITING_PAYMENT (Payment Screen First) */}
          {paymentState === 'AWAITING_PAYMENT' && (
            <div className="space-y-4">
              
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

              {/* AWAITING_PAYMENT STATUS BADGE */}
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    {isKm ? 'ស្ថានភាព៖ រង់ចាំការទូទាត់ (AWAITING_PAYMENT)' : 'Status: AWAITING_PAYMENT'}
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
                    {isKm ? 'បើកក្រោយ Admin អនុម័ត' : 'Unlocks after Approval'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {TEN_VIP_BENEFITS.map((benefit) => (
                    <div 
                      key={benefit.id}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px]"
                    >
                      <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                        {benefit.id}
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {isKm ? benefit.titleKh : benefit.titleEn}
                        </span>
                      </div>
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirement 1: Official Clean ABA KHQR Payment Box */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>{isKm ? 'ស្កេនទូទាត់កូដ ABA KHQR៖' : 'Scan to Pay via ABA KHQR:'}</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold font-mono">
                    Bakong KHQR
                  </span>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center space-y-3">
                  
                  {/* Clickable Clean Square ABA QR Code */}
                  <div 
                    onClick={handleLaunchAbaApp}
                    className="relative p-2 bg-white rounded-2xl shadow-sm border-2 border-emerald-500/40 max-w-[230px] cursor-pointer hover:shadow-lg transition active:scale-98 group"
                    title={isKm ? 'ចុចលើរូប QR ដើម្បីរក្សាទុក QR និងបើកកម្មវិធី ABA Mobile' : 'Click QR to save QR and open ABA Mobile'}
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

                  {/* 1-Tap Action: Save QR & Open ABA Mobile cleanly */}
                  <button
                    onClick={handleLaunchAbaApp}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#004B87] via-[#005a9e] to-[#004B87] hover:from-[#003966] hover:to-[#003966] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ring-4 ring-sky-500/20"
                  >
                    <ExternalLink className="w-4 h-4 text-sky-200" />
                    <span>
                      {isKm 
                        ? `📲 រក្សាទុក QR & បើក ABA Mobile ($${selectedPlan.priceUsd.toFixed(2)}) →` 
                        : `📲 Save QR & Open ABA Mobile ($${selectedPlan.priceUsd.toFixed(2)}) →`}
                    </span>
                  </button>

                  {/* Step-by-Step Guidance */}
                  <div className="w-full p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{isKm ? 'របៀបបង់ប្រាក់ងាយៗលើទូរស័ព្ទដដែល៖' : 'Simple Guide on the same phone:'}</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                      <li>
                        <span className="font-bold">{isKm ? 'ជំហាន ១៖ ' : 'Step 1: '}</span>
                        {isKm ? 'ក្នុង ABA Mobile ចុចលើ ' : 'In ABA Mobile, tap '}
                        <strong className="text-[#004B87] dark:text-sky-400 font-sans">"ABA Scan"</strong>
                      </li>
                      <li>
                        <span className="font-bold">{isKm ? 'ជំហាន ២៖ ' : 'Step 2: '}</span>
                        {isKm ? 'ចុចប៊ូតុង ' : 'Tap '}
                        <strong className="text-emerald-700 dark:text-emerald-400 font-sans">"Upload QR"</strong>
                        {isKm ? ' នៅខាងក្រោម ដើម្បីជ្រើសរូបភាព QR ដែលបានរក្សាទុក' : ' at bottom to choose the saved QR'}
                      </li>
                      <li>
                        <span className="font-bold">{isKm ? 'ជំហាន ៣៖ ' : 'Step 3: '}</span>
                        {isKm ? `ផ្ទេរ $${selectedPlan.priceUsd.toFixed(2)} រួចចុចប៊ូតុងខាងក្រោមដើម្បីស្នើសុំ Admin ពិនិត្យ!` : `Pay $${selectedPlan.priceUsd.toFixed(2)}, then tap the button below to request Admin approval!`}
                      </li>
                    </ol>
                  </div>

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
                  <div className="w-full p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-left">
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
                        ? '💡 ក្រោយពីផ្ទេរប្រាក់ក្នុង ABA Mobile រួចរាល់ សូមចុចប៊ូតុងខាងក្រោមដើម្បីបញ្ជូនសំណើទៅកាន់ Admin ពិនិត្យ និងអនុម័ត VIP។' 
                        : '💡 After transferring in ABA Mobile, tap the button below to submit your request for Admin verification and VIP approval.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirement 2 & 3: SUBMIT FOR ADMIN VERIFICATION (Never activates VIP directly!) */}
              <div className="p-4 rounded-3xl bg-amber-50/60 dark:bg-slate-800/80 border-2 border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-amber-600" />
                    <span>{isKm ? 'ស្នើសុំការត្រួតពិនិត្យពីរដ្ឋបាល (Admin Verification)៖' : 'Request Admin Verification:'}</span>
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-bold">
                    Admin Approval Required
                  </span>
                </div>

                {/* Payment Confirmation Request Button */}
                <button
                  onClick={handleSubmitPaymentForAdminApproval}
                  disabled={isSubmittingRequest}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ring-4 ring-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmittingRequest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{isKm ? 'កំពុងបញ្ជូនសំណើទៅកាន់ Admin...' : 'Submitting request to Admin...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>
                        {isKm 
                          ? `💳 ខ្ញុំបានបង់ប្រាក់រួចរាល់ • ផ្ទៀងផ្ទាត់ការទូទាត់ ($${selectedPlan.priceUsd.toFixed(2)} USD)` 
                          : `💳 I Have Paid • Request Verification ($${selectedPlan.priceUsd.toFixed(2)} USD)`}
                      </span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isKm 
                    ? '🔒 ការចុចប៊ូតុងនេះនឹងបញ្ជូនសំណើទៅកាន់ Admin ដើម្បីពិនិត្យផ្ទៀងផ្ទាត់ទឹកប្រាក់។ គណនី VIP នឹងត្រូវបានបើកដំណើរការក្រោយពេល Admin អនុម័តប៉ុណ្ណោះ។' 
                    : '🔒 Clicking this button submits a verification request to the Administrator. VIP is activated only after Admin confirms payment receipt.'}
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

        </div>

        {/* Modal Footer / Prominent App Version Bar */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            KhmerFoodTourism {APP_VERSION} (Build {APP_BUILD_CODE})
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Admin-Verified KHQR
          </span>
        </div>
      </div>
    </div>
  );
};
