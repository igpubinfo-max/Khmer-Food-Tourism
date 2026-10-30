import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Crown, Sparkles, AlertCircle, RefreshCw, 
  ShieldCheck, Star, Clock,
  QrCode, ExternalLink, CheckCircle2,
  Download, Copy, Check, ArrowRight, ShieldAlert, BadgeCheck,
  CheckCircle, XCircle, Upload, Image as ImageIcon, Camera, Trash2, MessageSquareWarning
} from 'lucide-react';
import { 
  isUserVipActive, getVipRemainingDays,
  APP_VERSION, APP_BUILD_CODE,
  getDynamicVipPlans, getDynamicVipBenefits, getAdditionalStoreFeeUsd
} from '../types';
import {
  savePngDataUrlToGallery,
  pickImageUsingNativeAndroidGallery,
} from '../utils/androidMediaHelper';
import { Capacitor } from '@capacitor/core';
import { tr } from '../utils/i18n';

interface VipPlanOption {
  id: 'annual' | 'quarterly';
  titleKh: string;
  titleEn: string;
  days: number;
  priceUsd: number;
  priceKhrApprox: string;
  isPopular?: boolean;
}

// Strict Payment Status Flow (Requirement 6 + Admin Request More Info)
export type PaymentStatusFlow = 
  | 'AWAITING_PAYMENT'
  | 'PENDING_ADMIN_APPROVAL'
  | 'NEEDS_MORE_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_FAILED'
  | 'EXPIRED';

export const UpgradeVipModal: React.FC = () => {
  const { 
    isUpgradeVipModalOpen, 
    setIsUpgradeVipModalOpen,
    isVipRenewMode,
    setIsVipRenewMode,
    openSupportTicketModal,
    currentUser, 
    transactions,
    appSettings,
    isRefreshingSettings,
    settingsSyncError,
    refreshAppSettingsFromServer,
    language,
    showToast,
    setIsAuthModalOpen,
    submitVipUpgradeRequest,
    uploadPaymentProofToTransaction,
    restoreCurrentUserVipPurchases
  } = useApp();

  const isKm = language === 'km';
  const isVip = isUserVipActive(currentUser);
  const remainingDays = getVipRemainingDays(currentUser);

  // Dynamically derive VIP plans, benefits, and additional store fee from Admin settings
  const dynamicPlansList = useMemo<VipPlanOption[]>(() => {
    const plans = getDynamicVipPlans(appSettings);
    const shortPlan = plans.quarterly;
    const longPlan = plans.annual;
    return [
      {
        id: 'quarterly',
        titleKh: `${shortPlan.nameKh} ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} ថ្ងៃ)`,
        titleEn: `${shortPlan.nameEn} ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} days)`,
        days: shortPlan.durationDays,
        priceUsd: shortPlan.priceUsd,
        priceKhrApprox: shortPlan.priceKhrDisplay || '៤០,៩៥៩ រៀល',
        isPopular: true,
      },
      {
        id: 'annual',
        titleKh: `${longPlan.nameKh} ($${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} ថ្ងៃ)`,
        titleEn: `${longPlan.nameEn} ($${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} days)`,
        days: longPlan.durationDays,
        priceUsd: longPlan.priceUsd,
        priceKhrApprox: longPlan.priceKhrDisplay || '១០២,៤៥៩ រៀល',
        isPopular: false,
      },
    ];
  }, [appSettings]);

  const dynamicBenefits = useMemo(() => getDynamicVipBenefits(appSettings), [appSettings]);
  const additionalStoreFeeUsd = useMemo(() => getAdditionalStoreFeeUsd(appSettings), [appSettings]);
  const isVipConfigValid = useMemo(
    () =>
      dynamicPlansList.length >= 2 &&
      dynamicPlansList.every(p => Number.isFinite(p.priceUsd) && p.priceUsd > 0 && Number.isFinite(p.days) && p.days > 0) &&
      dynamicBenefits.length > 0,
    [dynamicPlansList, dynamicBenefits]
  );

  const [selectedPlanId, setSelectedPlanId] = useState<'quarterly' | 'annual'>('quarterly');
  const selectedPlan = useMemo(
    () => dynamicPlansList.find(p => p.id === selectedPlanId) || dynamicPlansList[0],
    [dynamicPlansList, selectedPlanId]
  );
  
  // Payment Lifecycle State
  const [paymentState, setPaymentState] = useState<PaymentStatusFlow>('AWAITING_PAYMENT');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [submittedTxnId, setSubmittedTxnId] = useState('');
  const [submissionTimestamp, setSubmissionTimestamp] = useState('');
  const [hasCopiedAccount, setHasCopiedAccount] = useState(false);
  const [qrCodeDataUrl] = useState<string>('/images/aba_qr_code_only.png');
  const [customTxnRef, setCustomTxnRef] = useState<string>(() => 
    `ABA-KHQR-30D-${Date.now().toString(36).toUpperCase()}`
  );
  const [sessionExpiryTime, setSessionExpiryTime] = useState<number>(() => Date.now() + 15 * 60 * 1000);

  // Payment Proof Upload State (Part 2 Requirement)
  const [paymentProofDraft, setPaymentProofDraft] = useState<{
    dataUrl: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [isProcessingProofImage, setIsProcessingProofImage] = useState(false);
  const proofGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const proofCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Find latest VIP transaction for this user from persisted database
  const userLatestVipTxn = useMemo(() => {
    if (!currentUser) return undefined;
    return transactions.find(
      t => t.type === 'user_vip_upgrade' && (t.userId === currentUser.id || t.userEmail === currentUser.email)
    );
  }, [transactions, currentUser]);

  // Synchronize UI when modal opens: ALWAYS open cleanly into AWAITING_PAYMENT (or APPROVED if already active VIP and not renewing)
  // Never show stale REJECTED or PAYMENT_FAILED error screens when the user clicks "Upgrade to VIP"!
  useEffect(() => {
    if (!isUpgradeVipModalOpen) return;
    refreshAppSettingsFromServer(true);
    setErrorMessage('');
    if (!currentUser) {
      setPaymentState('AWAITING_PAYMENT');
      return;
    }

    if (isVipRenewMode) {
      setPaymentState('AWAITING_PAYMENT');
      return;
    }

    if (userLatestVipTxn) {
      setSubmittedTxnId(userLatestVipTxn.id);
      setCustomTxnRef(userLatestVipTxn.transactionRef);
      setSubmissionTimestamp(userLatestVipTxn.createdAt);
    }

    if (isUserVipActive(currentUser) && currentUser.paymentStatus === 'verified') {
      setPaymentState('APPROVED');
    } else {
      setPaymentState('AWAITING_PAYMENT');
    }
  }, [isUpgradeVipModalOpen, isVipRenewMode]);

  if (!isUpgradeVipModalOpen) return null;

  const handleClose = () => {
    setIsVipRenewMode(false);
    setIsUpgradeVipModalOpen(false);
  };

  const handleOpenContactAdminSupport = () => {
    setIsUpgradeVipModalOpen(false);
    openSupportTicketModal({
      planType: selectedPlan.id,
      paymentRef: userLatestVipTxn?.transactionRef || customTxnRef,
      receiptUrl: paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl,
    });
  };

  const handlePickReceiptFromGallery = async () => {
    if (Capacitor.isNativePlatform()) {
      setIsProcessingProofImage(true);
      try {
        const res = await pickImageUsingNativeAndroidGallery();
        if (!res.cancelled && res.dataUrl) {
          setPaymentProofDraft({
            dataUrl: res.dataUrl,
            fileName: `aba_receipt_${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
          });
          setIsProcessingProofImage(false);
          showToast(
            tr(
              language,
              '✅ បានជ្រើសរើសរូបភាពវិក្កយបត្រពីបណ្ណាល័យរូបភាពរួចរាល់!',
              '✅ Selected payment receipt from Gallery!',
              '✅ 已从相册选择付款凭证截图！'
            ),
            'success'
          );
          return;
        }
        if (res.cancelled) {
          setIsProcessingProofImage(false);
          return;
        }
      } catch {
        // Fallback to standard file input below
      }
      setIsProcessingProofImage(false);
    }
    proofGalleryInputRef.current?.click();
  };

  const handleSelectPlan = (plan: VipPlanOption) => {
    setSelectedPlanId(plan.id);
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

  const handleSaveQrImage = async () => {
    try {
      const fileName = `ABA-KHQR-CHEA-KIMSENG-${selectedPlan.days}Days-${selectedPlan.priceUsd.toFixed(2)}.png`;
      const result = await savePngDataUrlToGallery(qrCodeDataUrl, fileName);
      showToast(
        result.duplicate
          ? tr(language, '✅ រូបភាពកូដ QR នេះត្រូវបានរក្សាទុករួចហើយនៅក្នុងបណ្ណាល័យរូបភាព!', '✅ QR image is already saved in your Gallery!', '✅ 二维码图片已保存在相册中！')
          : tr(language, '✅ បានរក្សាទុករូបភាពកូដ QR ទៅក្នុងបណ្ណាល័យរូបភាពរួចរាល់!', '✅ QR saved to Gallery!', '✅ 二维码已保存到相册！'),
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || tr(language, 'សូមថតអេក្រង់រូបភាពកូដ QR ដើម្បីស្កេន', 'Please screenshot QR to scan', '请截图保存二维码进行扫描'), 'warning');
    }
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('095 245 959');
    setHasCopiedAccount(true);
    setTimeout(() => setHasCopiedAccount(false), 3000);
    showToast(
      tr(
        language,
        '✅ បានចម្លងលេខគណនី ABA៖ 095 245 959 (CHEA KIMSENG)!',
        '✅ Copied ABA Account: 095 245 959 (CHEA KIMSENG)!',
        '✅ 已复制 ABA 账号：095 245 959 (CHEA KIMSENG)！'
      ),
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
              tr(
                language,
                '⚠️ មិនទាន់មានកម្មវិធីធនាគារ ABA ក្នុងទូរស័ព្ទឡើយ កំពុងបើក Play Store ដើម្បីដំឡើង...',
                '⚠️ ABA Mobile not installed, opening Google Play Store...',
                '⚠️ 尚未安装 ABA Mobile，正在打开应用商店...'
              ),
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
      tr(
        language,
        '📲 កំពុងបើក ABA Mobile...',
        '📲 Opening ABA Mobile...',
        '📲 正在打开 ABA Mobile...'
      ),
      'info'
    );
  };

  // PART 2: Validate, compress & preview Payment Proof Image (JPG, JPEG, PNG <= 10MB)
  const handleSelectPaymentProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const extLower = file.name.toLowerCase();
    const isValidType =
      allowedTypes.includes(file.type) ||
      extLower.endsWith('.jpg') ||
      extLower.endsWith('.jpeg') ||
      extLower.endsWith('.png');

    if (!isValidType) {
      showToast(
        tr(
          language,
          '⚠️ សូមជ្រើសរើសឯកសាររូបភាពដែលត្រឹមត្រូវ!',
          '⚠️ Please select a valid JPG, JPEG, or PNG image!',
          '⚠️ 请选择有效的 JPG、JPEG 或 PNG 图片！'
        ),
        'warning'
      );
      e.target.value = '';
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB max
    if (file.size > maxBytes) {
      showToast(
        tr(
          language,
          '⚠️ ទំហំរូបភាពធំពេក។ សូមជ្រើសរើសរូបភាពផ្សេងដែលតូចជាងនេះ។',
          '⚠️ Image file size exceeds 10MB limit. Please choose a smaller image.',
          '⚠️ 图片大小超过 10MB 限制，请选择较小的图片。'
        ),
        'warning'
      );
      e.target.value = '';
      return;
    }

    setIsProcessingProofImage(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) {
        setIsProcessingProofImage(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1080;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setPaymentProofDraft({
              dataUrl: compressedDataUrl,
              fileName: file.name || `aba_receipt_${Date.now()}.jpg`,
              mimeType: 'image/jpeg',
            });
          } else {
            setPaymentProofDraft({
              dataUrl: rawDataUrl,
              fileName: file.name,
              mimeType: file.type || 'image/png',
            });
          }
        } catch {
          setPaymentProofDraft({
            dataUrl: rawDataUrl,
            fileName: file.name,
            mimeType: file.type || 'image/png',
          });
        }
        setIsProcessingProofImage(false);
        showToast(
          tr(
            language,
            '✅ បានជ្រើសរើសវិក្កយបត្របង់ប្រាក់រួចរាល់!',
            '✅ Payment receipt ready!',
            '✅ 付款凭证已准备就绪！'
          ),
          'success'
        );
      };
      img.onerror = () => {
        setIsProcessingProofImage(false);
        showToast(
          tr(language, 'មិនអាចអានឯកសាររូបភាពនេះបានទេ', 'Could not read image file', '无法读取此图片文件'),
          'warning'
        );
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setIsProcessingProofImage(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload or replace payment proof on an already-submitted pending/needs_more_info request
  const handleUploadProofToExistingRequest = () => {
    if (!paymentProofDraft) {
      proofGalleryInputRef.current?.click();
      return;
    }
    const targetTxnId = userLatestVipTxn?.id || submittedTxnId;
    if (!targetTxnId) return;

    const res = uploadPaymentProofToTransaction(
      targetTxnId,
      paymentProofDraft.dataUrl,
      paymentProofDraft.fileName,
      paymentProofDraft.mimeType
    );
    if (res.success) {
      setPaymentProofDraft(null);
      setPaymentState('PENDING_ADMIN_APPROVAL');
    }
  };

  // Requirement 2 & 3: Submit Payment Confirmation Request to Admin Queue
  const handleSubmitPaymentForAdminApproval = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    // Require payment receipt attachment before submitting so we never submit empty requests or show false bank verification errors
    if (!paymentProofDraft?.dataUrl && !userLatestVipTxn?.paymentProofUrl) {
      showToast(
        tr(
          language,
          '📸 សូមភ្ជាប់រូបភាពវិក្កយបត្របង់ប្រាក់ជាមុនសិន (ជំហានទី ៣)',
          '📸 Please attach your payment receipt screenshot first (Step 3)',
          '📸 请先上传您的付款凭证截图（第 3 步）'
        ),
        'info'
      );
      return;
    }

    if (Date.now() > sessionExpiryTime) {
      setSessionExpiryTime(Date.now() + 15 * 60 * 1000);
    }

    setIsSubmittingRequest(true);
    setErrorMessage('');

    try {
      const latestSettings = await refreshAppSettingsFromServer(true);
      const livePlans = getDynamicVipPlans(latestSettings);
      const liveSelectedPlan = livePlans[selectedPlan.id];

      const reqResult = await submitVipUpgradeRequest(
        liveSelectedPlan.durationDays,
        liveSelectedPlan.priceUsd,
        customTxnRef,
        `VIP Upgrade Request (${liveSelectedPlan.durationDays} Days / $${liveSelectedPlan.priceUsd.toFixed(2)} USD) via ABA KHQR — Pending Admin Verification`,
        paymentProofDraft || undefined
      );

      setIsSubmittingRequest(false);

      if (reqResult.success) {
        setSubmittedTxnId(reqResult.transactionId);
        setSubmissionTimestamp(new Date().toISOString().replace('T', ' ').slice(0, 16));
        setPaymentState('PENDING_ADMIN_APPROVAL');
      } else {
        setErrorMessage(
          reqResult.error ||
            tr(
              language,
              'មិនអាចបញ្ជូនសំណើបានទេ សូមព្យាយាមម្តងទៀត។',
              'Could not submit payment request. Please try again.',
              '无法提交付款申请，请重试。'
            )
        );
        setPaymentState('PAYMENT_FAILED');
      }
    } catch (err: any) {
      setIsSubmittingRequest(false);
      setErrorMessage(
        err?.message ||
          tr(
            language,
            'មានបញ្ហាបច្ចេកទេសក្នុងការបញ្ជូនសំណើ។',
            'Technical error occurred while submitting request.',
            '提交申请时发生技术错误，请重试。'
          )
      );
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
      {/* Hidden File Inputs for Payment Proof Upload (Gallery & Camera) */}
      <input
        ref={proofGalleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleSelectPaymentProofFile}
        className="hidden"
      />
      <input
        ref={proofCameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        capture="environment"
        onChange={handleSelectPaymentProofFile}
        className="hidden"
      />

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
                  <span>{tr(language, 'ដំឡើងសមាជិកភាព VIP', 'Upgrade to VIP', '升级 VIP 会员')}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black font-sans">
                    VIP
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-white font-mono text-[9px] font-bold border border-white/25">
                    {APP_VERSION}
                  </span>
                </h3>
                <p className="text-[11px] text-amber-200 font-khmer">
                  {tr(language, 'ដោះសោមុខងារពិសេស និងឧបករណ៍គ្រប់គ្រងហាងអាហារ', 'Unlock dining perks & restaurant owner tools', '解锁专属美食权益与商家管理工具')}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer"
              title={tr(language, 'បិទ', 'Close', '关闭')}
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
                <h4 className="font-moul text-lg text-slate-900 dark:text-white mt-2">
                  {tr(language, '🎉 សមាជិកភាព VIP ត្រូវបានអនុម័ត!', '🎉 VIP Membership Approved!', '🎉 VIP 会员已获批生效！')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  {tr(
                    language,
                    `រដ្ឋបាលបានផ្ទៀងផ្ទាត់ការទូទាត់ និងអនុម័តគណនី VIP របស់អ្នករួចរាល់ (នៅសល់ ${remainingDays} ថ្ងៃ)!`,
                    `Administrator verified your payment and activated your VIP account (${remainingDays} days remaining)!`,
                    `管理员已核实您的付款并开通尊享 VIP 会员（剩余 ${remainingDays} 天）！`
                  )}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">{tr(language, 'ស្ថានភាពគណនី៖', 'Account Status:', '账户状态：')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{tr(language, `VIP សកម្ម (${remainingDays} ថ្ងៃ)`, `VIP Active (${remainingDays} Days)`, `VIP 已生效（${remainingDays} 天）`)}</span>
                  </span>
                </div>
                {currentUser?.subscriptionExpiryDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{tr(language, 'ថ្ងៃផុតកំណត់៖', 'Expiration Date:', '到期日期：')}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currentUser.subscriptionExpiryDate.split('T')[0]}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsVipRenewMode(true);
                    setPaymentState('AWAITING_PAYMENT');
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    {tr(
                      language,
                      `🔄 បន្តសុពលភាព VIP ($${dynamicPlansList[0].priceUsd.toFixed(2)} / ${dynamicPlansList[0].days} ថ្ងៃ)`,
                      `🔄 Renew VIP ($${dynamicPlansList[0].priceUsd.toFixed(2)} / ${dynamicPlansList[0].days} Days)`,
                      `🔄 续费 VIP 会员 ($${dynamicPlansList[0].priceUsd.toFixed(2)} / ${dynamicPlansList[0].days} 天)`
                    )}
                  </span>
                </button>

                <button
                  onClick={handleClose}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <span>{tr(language, '🚀 បន្តប្រើប្រាស់កម្មវិធី', '🚀 Continue to App', '🚀 继续使用应用')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STATE 2B: NEEDS_MORE_INFO */}
          {paymentState === 'NEEDS_MORE_INFO' && (
            <div className="py-5 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-400/20">
                <MessageSquareWarning className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-moul text-base text-slate-900 dark:text-white mt-2">
                  {tr(language, '💬 រដ្ឋបាលស្នើសុំវិក្កយបត្របង់ប្រាក់បន្ថែម', '💬 Admin Requested Clearer Receipt', '💬 管理员请求上传更清晰的付款凭证')}
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 max-w-sm mx-auto leading-relaxed font-semibold">
                  {userLatestVipTxn?.adminRequestNote ||
                    userLatestVipTxn?.notes ||
                    tr(
                      language,
                      'សូមអាប់ឡូតរូបភាពវិក្កយបត្របង់ប្រាក់ ABA ឱ្យបានច្បាស់លាស់។',
                      'Please upload a clearer ABA payment receipt screenshot.',
                      '请上传清晰的 ABA 付款凭证截图。'
                    )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-amber-400/60 text-left space-y-3">
                {(paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl) && (
                  <img
                    src={paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl}
                    alt="Payment Proof Preview"
                    className="w-full max-h-56 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1"
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePickReceiptFromGallery}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{tr(language, 'អាប់ឡូតវិក្កយបត្រ', 'Upload Receipt', '上传付款凭证')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => proofCameraInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{tr(language, 'ថតរូបវិក្កយបត្រ', 'Take Photo', '拍摄凭证')}</span>
                  </button>
                </div>

                {paymentProofDraft && (
                  <button
                    type="button"
                    onClick={handleUploadProofToExistingRequest}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{tr(language, '📤 បញ្ជូនវិក្កយបត្រថ្មីទៅរដ្ឋបាល', '📤 Submit Updated Receipt to Admin', '📤 提交新凭证给管理员')}</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                {tr(language, 'បិទផ្ទាំងនេះ', 'Close', '关闭')}
              </button>
            </div>
          )}

          {/* STATE 2: PENDING_ADMIN_APPROVAL */}
          {paymentState === 'PENDING_ADMIN_APPROVAL' && (
            <div className="py-5 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-400/20">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h4 className="font-moul text-base text-slate-900 dark:text-white mt-2">
                  {tr(language, '⏳ កំពុងរង់ចាំរដ្ឋបាលអនុម័ត', '⏳ Pending Admin Approval', '⏳ 等待管理员审核')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  {tr(
                    language,
                    'សំណើរបស់អ្នកត្រូវបានបញ្ជូនរួចរាល់។ រដ្ឋបាលនឹងពិនិត្យវិក្កយបត្រ និងបើកដំណើរការ VIP ជូនអ្នក។',
                    'Your request has been submitted. Admin will verify your ABA receipt and activate VIP.',
                    '您的申请已提交，管理员核实 ABA 付款凭证后将为您开通 VIP。'
                  )}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{tr(language, 'កញ្ចប់ដែលបានស្នើសុំ៖', 'Requested Plan:', '申请套餐：')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${(userLatestVipTxn?.amountUsd || selectedPlan.priceUsd).toFixed(2)} ({userLatestVipTxn?.durationDays || selectedPlan.days} {tr(language, 'ថ្ងៃ', 'Days', '天')})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{tr(language, 'ភស្តុតាងបង់ប្រាក់៖', 'Payment Receipt:', '付款凭证：')}</span>
                  <span className={`font-bold ${userLatestVipTxn?.paymentProofUrl || paymentProofDraft ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {userLatestVipTxn?.paymentProofUrl || paymentProofDraft
                      ? tr(language, '✅ បានភ្ជាប់វិក្កយបត្រ', '✅ Receipt Attached', '✅ 已附上凭证')
                      : tr(language, 'មិនទាន់ភ្ជាប់រូបភាព', 'Not attached yet', '尚未附上凭证')}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-left space-y-2.5">
                {(paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl) && (
                  <img
                    src={paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl}
                    alt="Uploaded Payment Proof"
                    className="w-full max-h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1"
                  />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePickReceiptFromGallery}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {userLatestVipTxn?.paymentProofUrl || paymentProofDraft
                        ? tr(language, 'ប្តូរវិក្កយបត្របង់ប្រាក់', 'Replace Receipt', '更换付款凭证')
                        : tr(language, 'អាប់ឡូតវិក្កយបត្របង់ប្រាក់', 'Upload Receipt', '上传付款凭证')}
                    </span>
                  </button>

                  {paymentProofDraft && (
                    <button
                      type="button"
                      onClick={handleUploadProofToExistingRequest}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{tr(language, 'រក្សាទុកវិក្កយបត្រថ្មី', 'Save New Receipt', '保存新凭证')}</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                {tr(language, 'យល់ព្រម', 'Close', '关闭')}
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
                <h4 className="font-moul text-sm text-slate-900 dark:text-white mt-2">
                  {tr(language, '❌ សំណើទូទាត់ត្រូវបានបដិសេធដោយរដ្ឋបាល', '❌ Payment Request Rejected', '❌ 付款申请未通过审核')}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {userLatestVipTxn?.notes ||
                    tr(
                      language,
                      'រដ្ឋបាលមិនឃើញមានប្រតិបត្តិការទូទាត់ប្រាក់នេះឡើយ។ សូមពិនិត្យ និងព្យាយាមម្តងទៀត។',
                      'Administrator could not verify this payment. Please check and retry.',
                      '管理员未能核实此笔付款，请检查后重试。'
                    )}
                </p>
              </div>

              <button
                onClick={handleRestartSession}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-md"
              >
                {tr(language, '🔄 បង្កើតសំណើទូទាត់ប្រាក់ថ្មី', '🔄 Start New Payment Request', '🔄 重新发起付款申请')}
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
                <h4 className="font-moul text-sm text-slate-900 dark:text-white mt-2">
                  {tr(language, 'សំណើទូទាត់មិនជោគជ័យ', 'Payment Request Failed', '付款申请提交失败')}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {errorMessage ||
                    tr(
                      language,
                      'សូមបញ្ចប់ការបង់ប្រាក់ក្នុង ABA Mobile រួចព្យាយាមម្តងទៀត។',
                      'Please complete the transfer in ABA Mobile and try again.',
                      '请在 ABA Mobile 中完成转账后重试。'
                    )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleRestartSession}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-md"
                >
                  {tr(language, '🔄 ព្យាយាមម្តងទៀត', '🔄 Try Again', '🔄 重试')}
                </button>
                <button
                  onClick={() => setPaymentState('AWAITING_PAYMENT')}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {tr(language, 'ត្រឡប់ក្រោយ', 'Back', '返回')}
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
                <h4 className="font-moul text-sm text-slate-900 dark:text-white mt-2">
                  {tr(language, 'វគ្គទូទាត់ប្រាក់បានផុតកំណត់', 'Payment Session Expired', '付款会话已过期')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {tr(
                    language,
                    'វគ្គទូទាត់នេះបានផុតកំណត់។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតវគ្គទូទាត់ថ្មី។',
                    'This payment session has timed out. Tap below to start a new session.',
                    '此付款会话已超时，请点击下方按钮重新开始。'
                  )}
                </p>
              </div>

              <button
                onClick={handleRestartSession}
                className="w-full py-2.5 px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                {tr(language, '🔄 បង្កើតវគ្គទូទាត់ថ្មី', '🔄 Start New Payment Session', '🔄 开始新的付款会话')}
              </button>
            </div>
          )}

          {/* STATE 1: AWAITING_PAYMENT — Clean, Short 4-Step VIP Payment Screen */}
          {paymentState === 'AWAITING_PAYMENT' && isVipConfigValid && (
            <div className="space-y-4">
              {/* If user has a pending verification request, show a friendly status bar without blocking the upgrade flow */}
              {(userLatestVipTxn?.status === 'pending_verification' ||
                userLatestVipTxn?.status === 'needs_more_info') && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        'អ្នកមានសំណើដំឡើង VIP កំពុងរង់ចាំរដ្ឋបាលអនុម័ត',
                        'You have a VIP upgrade request awaiting approval',
                        '您有一项 VIP 升级申请正在等待审核'
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentState('PENDING_ADMIN_APPROVAL')}
                    className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-[11px] shrink-0 cursor-pointer hover:bg-amber-600 transition"
                  >
                    {tr(language, 'មើលស្ថានភាព', 'View Status', '查看状态')}
                  </button>
                </div>
              )}

              {/* VIP Plan Selector */}
              <div className="grid grid-cols-2 gap-2.5">
                {dynamicPlansList.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className={`relative p-3 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/20 border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                      }`}
                    >
                      {plan.isPopular && (
                        <span className="absolute -top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider font-sans shadow-xs">
                          {tr(language, 'ពេញនិយម', 'Popular', '热门')}
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {tr(language, `${plan.days} ថ្ងៃ`, `${plan.days} Days`, `${plan.days} 天`)}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="font-moul text-lg sm:text-xl text-slate-900 dark:text-white font-mono">
                          ${plan.priceUsd.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                          {tr(language, 'ដុល្លារ', 'USD', '美元')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* STEP 1 & 2: Scan or save ABA KHQR + Pay via ABA Mobile */}
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center space-y-3">
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        '១. ស្កេន ឬរក្សាទុកកូដ QR',
                        '1. Scan or save ABA KHQR',
                        '1. 扫描或保存二维码'
                      )}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold font-mono">
                    {tr(language, 'បាគង KHQR', 'Bakong KHQR', '巴孔二维码')}
                  </span>
                </div>

                {/* Clickable Clean Square ABA QR Code */}
                <div
                  onClick={handleLaunchAbaApp}
                  className="relative p-2 bg-white rounded-2xl shadow-sm border-2 border-emerald-500/40 max-w-[220px] cursor-pointer hover:shadow-lg transition active:scale-98 group"
                >
                  <img
                    src={qrCodeDataUrl}
                    alt="ABA KHQR"
                    className="w-full h-auto object-contain rounded-xl block bg-white"
                  />
                </div>

                {/* Account Name & Phone Number */}
                <div className="w-full p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {tr(language, 'ឈ្មោះគណនី៖ ជា គីមសេង', 'Account Name: CHEA KIMSENG', '账户名称：CHEA KIMSENG')}
                  </span>
                  <span className="font-mono font-bold text-[#004B87] dark:text-sky-400">
                    095 245 959
                  </span>
                </div>

                {/* Save QR & Copy Phone Buttons */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleSaveQrImage}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{tr(language, 'រក្សាទុកកូដ QR', 'Save QR', '保存二维码')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    {hasCopiedAccount ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span>
                      {hasCopiedAccount
                        ? tr(language, 'បានចម្លង!', 'Copied!', '已复制！')
                        : tr(language, 'ចម្លង 095 245 959', 'Copy 095 245 959', '复制 095 245 959')}
                    </span>
                  </button>
                </div>

                {/* STEP 2 Button: Pay via ABA Mobile */}
                <button
                  onClick={handleLaunchAbaApp}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#004B87] via-[#005a9e] to-[#004B87] hover:from-[#003966] hover:to-[#003966] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ring-4 ring-sky-500/20"
                >
                  <ExternalLink className="w-4 h-4 text-sky-200 shrink-0" />
                  <span>
                    {tr(
                      language,
                      `២. បង់ប្រាក់ $${selectedPlan.priceUsd.toFixed(2)} តាមកម្មវិធី ABA`,
                      `2. Pay $${selectedPlan.priceUsd.toFixed(2)} via ABA Mobile`,
                      `2. 通过 ABA 手机银行支付 $${selectedPlan.priceUsd.toFixed(2)}`
                    )}
                  </span>
                </button>
              </div>

              {/* STEP 3: Upload the payment receipt */}
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border-2 border-emerald-500/40 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        '៣. អាប់ឡូតវិក្កយបត្របង់ប្រាក់',
                        '3. Upload the payment receipt',
                        '3. 上传付款凭证截图'
                      )}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                    {tr(language, 'រូបភាពវិក្កយបត្រ', 'Receipt Image', '凭证图片')}
                  </span>
                </div>

                {paymentProofDraft && (
                  <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-slate-900/90 border border-emerald-300 dark:border-emerald-700/60 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{paymentProofDraft.fileName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPaymentProofDraft(null)}
                        className="p-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 hover:bg-rose-200 transition cursor-pointer shrink-0"
                        title={tr(language, 'លុបរូបភាព', 'Remove image', '删除图片')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <img
                      src={paymentProofDraft.dataUrl}
                      alt="Selected Payment Proof Preview"
                      className="w-full max-h-48 object-contain rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePickReceiptFromGallery}
                    disabled={isProcessingProofImage}
                    className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>
                      {paymentProofDraft
                        ? tr(language, 'ប្តូរវិក្កយបត្រថ្មី', 'Replace Receipt', '更换付款凭证')
                        : tr(language, 'អាប់ឡូតវិក្កយបត្រ', 'Upload Receipt', '上传付款凭证')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => proofCameraInputRef.current?.click()}
                    disabled={isProcessingProofImage}
                    className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 transition active:scale-98 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{tr(language, 'ថតរូបវិក្កយបត្រ', 'Take Photo', '拍摄凭证')}</span>
                  </button>
                </div>
              </div>

              {/* STEP 4: Submit for Admin approval */}
              <div className="p-4 rounded-3xl bg-amber-50/60 dark:bg-slate-800/80 border-2 border-amber-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        '៤. បញ្ជូនសំណើទៅរដ្ឋបាលអនុម័ត',
                        '4. Submit for Admin approval',
                        '4. 提交管理员审核'
                      )}
                    </span>
                  </span>
                </div>

                <button
                  onClick={handleSubmitPaymentForAdminApproval}
                  disabled={isSubmittingRequest || isProcessingProofImage}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ring-4 ring-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmittingRequest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white shrink-0" />
                      <span>{tr(language, 'កំពុងបញ្ជូនទៅរដ្ឋបាល...', 'Submitting to Admin...', '正在提交审核...')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                      <span>
                        {tr(
                          language,
                          `បញ្ជូនសំណើទៅរដ្ឋបាលអនុម័ត ($${selectedPlan.priceUsd.toFixed(2)})`,
                          `Submit for Admin approval ($${selectedPlan.priceUsd.toFixed(2)})`,
                          `提交管理员审核 ($${selectedPlan.priceUsd.toFixed(2)})`
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer / Prominent App Version Bar */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨美食与旅游')} {APP_VERSION} ({APP_BUILD_CODE})
          </span>
          <a
            href="/privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
          >
            {tr(language, 'គោលការណ៍ឯកជនភាព', 'Privacy Policy', '隐私政策')}
          </a>
        </div>
      </div>
    </div>
  );
};
