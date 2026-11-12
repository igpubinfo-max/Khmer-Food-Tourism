import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Crown, AlertCircle, RefreshCw, 
  ShieldCheck, Star, Clock,
  QrCode, ExternalLink, CheckCircle2,
  Download, Copy, Check, ArrowRight, ShieldAlert, BadgeCheck, Share2,
  CheckCircle, XCircle, Upload, Image as ImageIcon, Camera, Trash2, MessageSquareWarning
} from 'lucide-react';
import { 
  isUserVipActive, isUserOnConsumerFreeTrial, getVipRemainingDays,
  APP_VERSION, APP_BUILD_CODE,
  getDynamicVipBenefits,
  OfficialPlanId,
  getConsumerVipPricingCatalog,
  isConsumerTrial7dEligible,
  isConsumerPromo099Eligible,
  hasAuthenticatedEmailAccount, hasAuthenticatedPhoneAccount, isAdminAccount, isIosOrIpadAppStoreRuntime
} from '../types';
import {
  savePngDataUrlToGallery,
  shareQrImageNativeOrWeb,
  pickImageUsingNativeAndroidGallery,
} from '../utils/androidMediaHelper';
import { Capacitor } from '@capacitor/core';
import { tr } from '../utils/i18n';

interface VipPlanOption {
  id: 'annual' | 'quarterly';
  planId: OfficialPlanId;
  titleKh: string;
  titleEn: string;
  days: number;
  priceUsd: number;
  badgeText?: string;
  isPopular?: boolean;
  isWinbackPromo?: boolean;
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
    openUpgradeVipModal,
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
    claimConsumerFreeTrial,
    submitVipUpgradeRequest,
    uploadPaymentProofToTransaction,
    restoreCurrentUserVipPurchases,
    configureVipAutoRenew,
    cancelVipAutoRenew,
    retryFailedVipAutoRenew
  } = useApp();

  const isKm = language === 'km';
  const isVip = isUserVipActive(currentUser);
  const isFreeTrial7d = isUserOnConsumerFreeTrial(currentUser);
  const remainingDays = getVipRemainingDays(currentUser);

  const consumerCatalog = useMemo(() => getConsumerVipPricingCatalog(appSettings), [appSettings]);
  const canClaimTrial7d = useMemo(
    () => Boolean(consumerCatalog.consumerVipEnabled && consumerCatalog.trialPlan.enabled && isConsumerTrial7dEligible(currentUser)),
    [consumerCatalog, currentUser]
  );
  const canClaimWinback099 = useMemo(
    () => Boolean(consumerCatalog.consumerVipEnabled && consumerCatalog.promo30dPlan.enabled && isConsumerPromo099Eligible(currentUser)),
    [consumerCatalog, currentUser]
  );
  const [isClaimingTrial, setIsClaimingTrial] = useState(false);

  // Dynamically derive official Consumer VIP paid plans ($0.99 post-trial win-back, $2.99/30d, $6.99/90d, $19.99/365d)
  const dynamicPlansList = useMemo<VipPlanOption[]>(() => {
    const list: VipPlanOption[] = [];
    if (canClaimWinback099) {
      const p = consumerCatalog.promo30dPlan;
      list.push({
        id: 'quarterly',
        planId: p.planId,
        titleKh: p.titleKm,
        titleEn: p.titleEn,
        days: p.durationDays,
        priceUsd: p.priceUsd,
        badgeText: tr(language, p.badgeKm || '១ ដងគត់ក្រោយសាកល្បង', p.badgeEn || 'Post-Trial Special', '试用后专属特惠'),
        isWinbackPromo: true,
      });
    }
    for (const p of [consumerCatalog.monthlyPlan, consumerCatalog.quarterlyPlan, consumerCatalog.yearlyPlan]) {
      if (!p.enabled) continue;
      const zhBadge =
        p.planId === 'consumer_90d'
          ? '超值季度'
          : p.planId === 'consumer_365d'
          ? '年度最划算'
          : '月度体验';
      list.push({
        id: p.durationDays >= 300 ? 'annual' : 'quarterly',
        planId: p.planId,
        titleKh: p.titleKm,
        titleEn: p.titleEn,
        days: p.durationDays,
        priceUsd: p.priceUsd,
        badgeText: tr(language, p.badgeKm || '', p.badgeEn || '', zhBadge),
        isPopular: p.planId === 'consumer_90d' || p.planId === 'consumer_365d',
      });
    }
    return list;
  }, [consumerCatalog, canClaimWinback099, language]);

  const dynamicBenefits = useMemo(() => getDynamicVipBenefits(appSettings), [appSettings]);
  const isVipConfigValid = useMemo(
    () =>
      Boolean(consumerCatalog.consumerVipEnabled) &&
      dynamicPlansList.length >= 1 &&
      dynamicPlansList.every(p => Number.isFinite(p.priceUsd) && p.priceUsd > 0 && Number.isFinite(p.days) && p.days > 0),
    [consumerCatalog.consumerVipEnabled, dynamicPlansList]
  );

  const [selectedOfficialPlanId, setSelectedOfficialPlanId] = useState<OfficialPlanId>('consumer_90d');
  useEffect(() => {
    if (canClaimWinback099) {
      setSelectedOfficialPlanId('consumer_promo_30d');
    } else if (!dynamicPlansList.some((p) => p.planId === selectedOfficialPlanId) && dynamicPlansList[0]) {
      setSelectedOfficialPlanId(dynamicPlansList[0].planId);
    }
  }, [canClaimWinback099, dynamicPlansList]);

  const selectedPlan = useMemo(
    () => dynamicPlansList.find(p => p.planId === selectedOfficialPlanId) || dynamicPlansList[0],
    [dynamicPlansList, selectedOfficialPlanId]
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

  // Automatic VIP Renewal Authorization State (ON by default with clear user consent)
  const [autoRenewOptIn, setAutoRenewOptIn] = useState<boolean>(true);
  const [autoRenewConsentChecked, setAutoRenewConsentChecked] = useState<boolean>(true);
  const [autoRenewMethodChoice, setAutoRenewMethodChoice] = useState<'KHQR' | 'Bakong' | 'Card'>('KHQR');
  const [autoRenewPlanChoice, setAutoRenewPlanChoice] = useState<'quarterly' | 'annual'>('quarterly');
  const [showApprovedAutoRenewConfirm, setShowApprovedAutoRenewConfirm] = useState<boolean>(false);
  const [approvedConsentChecked, setApprovedConsentChecked] = useState<boolean>(false);
  const [isRetryingAutoRenew, setIsRetryingAutoRenew] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      setAutoRenewMethodChoice(
        currentUser.autoRenewPaymentMethod === 'Bakong' || currentUser.autoRenewPaymentMethod === 'Card'
          ? currentUser.autoRenewPaymentMethod
          : 'KHQR'
      );
      setAutoRenewPlanChoice(
        currentUser.autoRenewPlanId === 'annual' || currentUser.vipPlanType === 'annual'
          ? 'annual'
          : 'quarterly'
      );
    }
  }, [currentUser?.id, currentUser?.autoRenewPaymentMethod, currentUser?.autoRenewPlanId, currentUser?.vipPlanType]);

  // Find latest VIP transaction for this user from persisted database (case-insensitive email & legacyIds safe)
  const userLatestVipTxn = useMemo(() => {
    if (!currentUser) return undefined;
    const curEmail = (currentUser.email || '').trim().toLowerCase();
    const curIdSet = new Set([currentUser.id, ...(currentUser.legacyIds || [])].filter(Boolean));
    return transactions.find(t => {
      if (!t || t.type !== 'user_vip_upgrade') return false;
      if (t.userId && curIdSet.has(t.userId)) return true;
      if (t.ownerId && curIdSet.has(t.ownerId)) return true;
      if (curEmail && t.userEmail && t.userEmail.trim().toLowerCase() === curEmail) return true;
      return false;
    });
  }, [transactions, currentUser]);

  // Synchronize UI when modal opens AND react live when Admin approves VIP in background
  useEffect(() => {
    if (!isUpgradeVipModalOpen) return;
    refreshAppSettingsFromServer?.(true);
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

    if (isUserVipActive(currentUser) && !isFreeTrial7d) {
      setPaymentState('APPROVED');
    } else if (userLatestVipTxn?.status === 'needs_more_info') {
      setPaymentState('NEEDS_MORE_INFO');
    } else if (userLatestVipTxn?.status === 'pending_verification' && paymentState === 'PENDING_ADMIN_APPROVAL') {
      setPaymentState('PENDING_ADMIN_APPROVAL');
    } else {
      setPaymentState('AWAITING_PAYMENT');
    }
  }, [
    isUpgradeVipModalOpen,
    isVipRenewMode,
    currentUser?.id,
    currentUser?.membershipTier,
    currentUser?.subscriptionStatus,
    currentUser?.subscriptionExpiryDate,
    currentUser?.paymentStatus,
    userLatestVipTxn?.id,
    userLatestVipTxn?.status,
  ]);

  // Hard authentication guard: never allow VIP payment page or ABA QR code to render without email login
  useEffect(() => {
    if (
      isUpgradeVipModalOpen &&
      !isAdminAccount(currentUser) &&
      !hasAuthenticatedEmailAccount(currentUser) &&
      !hasAuthenticatedPhoneAccount(currentUser)
    ) {
      openUpgradeVipModal(isVipRenewMode);
    }
  }, [isUpgradeVipModalOpen, currentUser, isVipRenewMode]);

  if (!isUpgradeVipModalOpen || isIosOrIpadAppStoreRuntime()) return null;
  if (
    !isAdminAccount(currentUser) &&
    !hasAuthenticatedEmailAccount(currentUser) &&
    !hasAuthenticatedPhoneAccount(currentUser)
  ) {
    return null;
  }

  const handleClose = () => {
    setIsVipRenewMode(false);
    setIsUpgradeVipModalOpen(false);
  };

  const handleOpenContactAdminSupport = () => {
    setIsUpgradeVipModalOpen(false);
    openSupportTicketModal({
      planType: selectedPlan.id,
      planId: selectedPlan.planId,
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
              '✅ បានជ្រើសរើសរូបភាពវិក្កយបត្រពី រូបភាពរបស់ខ្ញុំ រួចរាល់!',
              '✅ Selected payment receipt from My Photos!',
              '✅ 已从我的照片中选择付款凭证截图！'
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
    setSelectedOfficialPlanId(plan.planId);
    setCustomTxnRef(`ABA-KHQR-${plan.days}D-${Date.now().toString(36).toUpperCase()}`);
    setSessionExpiryTime(Date.now() + 15 * 60 * 1000);
    try {
      localStorage.setItem('kft_user_active_plan_type', plan.id);
    } catch {}
  };

  const handleClaimFreeTrial = async () => {
    if (isClaimingTrial) return;
    setIsClaimingTrial(true);
    try {
      await claimConsumerFreeTrial();
    } finally {
      setIsClaimingTrial(false);
    }
  };

  const handleRestartSession = () => {
    setCustomTxnRef(`ABA-KHQR-${selectedPlan.days}D-${Date.now().toString(36).toUpperCase()}`);
    setSessionExpiryTime(Date.now() + 15 * 60 * 1000);
    setPaymentState('AWAITING_PAYMENT');
    setErrorMessage('');
  };

  const handleSaveQrImage = async () => {
    try {
      const fileName = `ABA-KHQR-CHEA-SAVUTH-000056833.png`;
      const result = await savePngDataUrlToGallery(qrCodeDataUrl, fileName);
      showToast(
        result.duplicate
          ? tr(language, '✅ រូបភាព ABA QR ច្បាប់ដើមត្រូវបានរក្សាទុករួចហើយនៅក្នុង រូបភាពរបស់ខ្ញុំ!', '✅ Original ABA QR image is already saved in My Photos!', '✅ 原始 ABA 二维码图片已保存在我的照片中！')
          : tr(language, '✅ បានទាញយក និងរក្សាទុករូបភាព ABA QR ច្បាប់ដើមទៅក្នុង រូបភាពរបស់ខ្ញុំ រួចរាល់!', '✅ Saved original ABA QR image directly to My Photos!', '✅ 原始 ABA 二维码已保存到我的照片！'),
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || tr(language, 'សូមថតអេក្រង់រូបភាពកូដ QR ដើម្បីស្កេន', 'Please screenshot QR to scan', '请截图保存二维码进行扫描'), 'warning');
    }
  };

  const handleShareQrImage = async () => {
    try {
      await shareQrImageNativeOrWeb(qrCodeDataUrl, 'ABA KHQR — CHEA SAVUTH (000 056 833)');
    } catch {
      handleSaveQrImage();
    }
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('000 056 833');
    setHasCopiedAccount(true);
    setTimeout(() => setHasCopiedAccount(false), 3000);
    showToast(
      tr(
        language,
        '✅ បានចម្លងលេខគណនី ABA៖ 000 056 833 (CHEA SAVUTH)!',
        '✅ Copied ABA Account: 000 056 833 (CHEA SAVUTH)!',
        '✅ 已复制 ABA 账号：000 056 833 (CHEA SAVUTH)！'
      ),
      'success'
    );
  };

  // Requirement 1: Launch ABA Mobile cleanly WITHOUT unsupported type=payway parameter (Eliminates [MAPP-PW] Invalid Qr Merchant Data)
  const handleLaunchAbaApp = async () => {
    // Auto-save clean QR image to device Photos so user can tap "Upload QR" inside ABA Mobile Scan
    handleSaveQrImage();
    navigator.clipboard?.writeText('000 056 833').catch(() => {});

    let launchedNatively = false;
    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const NativeAbaLauncher = registerPlugin<any>('NativeAbaLauncher');
        if (NativeAbaLauncher && typeof NativeAbaLauncher.openAbaMobile === 'function') {
          const res = await NativeAbaLauncher.openAbaMobile({
            amount: selectedPlan.priceUsd.toString(),
            paymentUrl: 'https://pay.ababank.com/oRF8/tyy7642t'
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
        window.open('https://pay.ababank.com/oRF8/tyy7642t', '_blank', 'noopener,noreferrer');
      } catch {
        window.location.href = 'https://pay.ababank.com/oRF8/tyy7642t';
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

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const extLower = file.name.toLowerCase();
    const isPdfFile = file.type === 'application/pdf' || extLower.endsWith('.pdf');
    const isValidType =
      isPdfFile ||
      allowedTypes.includes(file.type) ||
      extLower.endsWith('.jpg') ||
      extLower.endsWith('.jpeg') ||
      extLower.endsWith('.png') ||
      extLower.endsWith('.webp');

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

      if (isPdfFile || rawDataUrl.startsWith('data:application/pdf')) {
        setPaymentProofDraft({
          dataUrl: rawDataUrl,
          fileName: file.name || `aba_receipt_${Date.now()}.pdf`,
          mimeType: 'application/pdf',
        });
        setIsProcessingProofImage(false);
        showToast(
          tr(
            language,
            '\u2705 \u1794\u17b6\u1793\u1787\u17d2\u179a\u17be\u179f\u179a\u17be\u179f\u179c\u17b7\u1780\u17d2\u1780\u1799\u1794\u178f\u17d2\u179a PDF \u179a\u17bd\u1785\u179a\u17b6\u179b\u17cb!',
            '\u2705 PDF payment receipt ready!',
            '\u2705 PDF \u4ed8\u6b3e\u51ed\u8bc1\u5df2\u51c6\u5907\u5c31\u7eea\uff01'
          ),
          'success'
        );
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
      const latestSettings = (await refreshAppSettingsFromServer?.(true)) || appSettings;
      const liveCatalog = getConsumerVipPricingCatalog(latestSettings);
      const allLivePlans = [
        liveCatalog.promo30dPlan,
        liveCatalog.monthlyPlan,
        liveCatalog.quarterlyPlan,
        liveCatalog.yearlyPlan,
      ];
      const liveSelected = allLivePlans.find((p) => p.planId === selectedPlan.planId) || liveCatalog.monthlyPlan;

      const reqResult = await submitVipUpgradeRequest(
        liveSelected.durationDays,
        liveSelected.priceUsd,
        customTxnRef,
        `Consumer VIP (${liveSelected.planId}: ${liveSelected.durationDays} Days / $${liveSelected.priceUsd.toFixed(2)} USD) via ABA KHQR`,
        paymentProofDraft || undefined,
        {
          enabled: autoRenewOptIn,
          paymentMethod: 'KHQR',
          paymentLabel: 'ABA KHQR (000 056 833)',
          explicitConsent: autoRenewOptIn,
        },
        liveSelected.planId
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
    <div
      style={{
        paddingTop: 'max(var(--kft-safe-top, 0px), 0.5rem)',
        paddingBottom: 'max(var(--kft-safe-bottom, 0px), 0.5rem)',
      }}
      className="fixed inset-0 z-[95] flex items-center justify-center px-2 sm:px-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      {/* Hidden File Inputs for Payment Proof Upload (Gallery & Camera) */}
      <input
        ref={proofGalleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.pdf"
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
        className="relative w-full max-w-lg md:max-w-xl bg-[#1E293B] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700/80 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="kft-khmer-modal-header relative px-4 sm:px-5 pt-3 pb-3.5 text-white shrink-0 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-2xl bg-amber-400 text-slate-900 shadow-md shrink-0">
                <Crown className="w-5 h-5 fill-slate-900" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-moul text-xs sm:text-sm text-white leading-[1.7] py-0.5 break-words">
                  {tr(language, 'ដំឡើងសមាជិកភាព VIP', 'Upgrade to VIP', '升级 VIP 会员')}
                </h3>
                <p className="text-[11px] text-amber-200 font-khmer leading-[1.55] break-words">
                  {tr(
                    language,
                    `ជំនួយការ AI ម្ហូប & ទេសចរណ៍ (${consumerCatalog.paidAiDailyLimit} ដង/ថ្ងៃ) • ផែនការដើរលេងពិសេស`,
                    `AI Food & Travel Assistant (${consumerCatalog.paidAiDailyLimit}/day) • Smart Trip Planner`,
                    `AI 美食与旅游助手（每日 ${consumerCatalog.paidAiDailyLimit} 次）• 智能行程规划`
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer shrink-0"
              title={tr(language, 'បិទ', 'Close', '关闭')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body — Dark Slate (#1E293B) Modern UI with Clean White Cards */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100dvh-6.5rem)] p-3 space-y-3 font-khmer bg-[#1E293B]">
          {/* STATE 3: APPROVED (Displayed ONLY after Administrator approves in Admin Dashboard) */}
          {paymentState === 'APPROVED' && isVip && (
            <div className="p-4 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] text-center space-y-4 animate-scale-up text-slate-900">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg ring-8 ring-amber-400/20">
                  <Crown className="w-10 h-10 text-white fill-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-white">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>

              <div>
                <h4 className="font-moul text-lg text-slate-900 mt-2">
                  {isFreeTrial7d
                    ? tr(language, '🎁 កំពុងប្រើការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃ!', '🎁 7-Day Consumer Free Trial Active!', '🎁 7 天免费试用生效中！')
                    : tr(language, '🎉 សមាជិកភាព VIP បង់ប្រាក់ត្រូវបានអនុម័ត!', '🎉 Paid VIP Membership Approved!', '🎉 付费 VIP 会员已获批生效！')}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  {isFreeTrial7d
                    ? tr(
                        language,
                        `អ្នកកំពុងប្រើប្រាស់ការសាកល្បងឥតគិតថ្លៃសម្រាប់ជំនួយការ AI (${consumerCatalog.trialAiDailyLimit} ដង/ថ្ងៃ • នៅសល់ ${remainingDays} ថ្ងៃ)។ មិនរួមបញ្ចូលកញ្ចប់ដាក់ហាង Featured Placement ឬ Store Analytics ឡើយ។`,
                        `You are using the Consumer Free Trial (${consumerCatalog.trialAiDailyLimit} AI requests/day • ${remainingDays} days remaining). Paid Shop Package, Featured Placement & Store Analytics are not included.`,
                        `您正在使用个人版免费试用（每日 ${consumerCatalog.trialAiDailyLimit} 次 AI • 剩余 ${remainingDays} 天）。不含开店套餐、置顶推荐与店铺统计。`
                      )
                    : tr(
                        language,
                        `រដ្ឋបាលបានផ្ទៀងផ្ទាត់ការទូទាត់ និងអនុម័តគណនី VIP បង់ប្រាក់របស់អ្នករួចរាល់ (នៅសល់ ${remainingDays} ថ្ងៃ)!`,
                        `Administrator verified your payment and activated your Paid VIP account (${remainingDays} days remaining)!`,
                        `管理员已核实您的付款并开通正式付费 VIP 会员（剩余 ${remainingDays} 天）！`
                      )}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">{tr(language, 'ស្ថានភាពគណនី៖', 'Account Status:', '账户状态：')}</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{tr(language, `VIP សកម្ម (${remainingDays} ថ្ងៃ)`, `VIP Active (${remainingDays} Days)`, `VIP 已生效（${remainingDays} 天）`)}</span>
                  </span>
                </div>
                {currentUser?.subscriptionExpiryDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{tr(language, 'ថ្ងៃផុតកំណត់៖', 'Expiration Date:', '到期日期：')}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {currentUser.subscriptionExpiryDate.split('T')[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Automatic VIP Renewal Toggle, Cancel Subscription & Billing Dates Card for Active VIP Members */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate">
                          {tr(language, 'កុងតាក់បន្តសុពលភាពស្វ័យប្រវត្តិ', 'Auto-Renewal Toggle', '自动续费开关')}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
                            currentUser?.autoRenew !== false && !currentUser?.autoRenewCancelledAt
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {currentUser?.autoRenew !== false && !currentUser?.autoRenewCancelledAt
                            ? tr(language, 'បើក (ON)', 'ON', '开启 (ON)')
                            : tr(language, 'បិទ (OFF)', 'OFF', '关闭 (OFF)')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive ON/OFF Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(currentUser?.autoRenew !== false && !currentUser?.autoRenewCancelledAt)}
                    onClick={() => {
                      if (currentUser?.autoRenew !== false && !currentUser?.autoRenewCancelledAt) {
                        cancelVipAutoRenew();
                      } else {
                        configureVipAutoRenew({
                          enabled: true,
                          planId:
                            currentUser?.autoRenewPlanId === 'annual' || currentUser?.vipPlanType === 'annual'
                              ? 'annual'
                              : 'quarterly',
                          paymentMethod: 'KHQR',
                          paymentLabel: 'ABA KHQR',
                          explicitConsent: true,
                        });
                      }
                    }}
                    className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentUser?.autoRenew !== false && !currentUser?.autoRenewCancelledAt
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        currentUser?.autoRenew !== false && !currentUser?.autoRenewCancelledAt
                          ? 'translate-x-6'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Next Billing Date & Membership Expiration Date */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500">
                      {tr(language, 'ថ្ងៃផុតកំណត់សមាជិកភាព', 'Membership Expiration Date', '会员到期日')}
                    </div>
                    <div className="text-xs font-black text-slate-900 mt-0.5 font-mono">
                      {currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500">
                      {tr(language, 'ថ្ងៃបង់ប្រាក់បន្ទាប់', 'Next Billing Date', '下次续费日期')}
                    </div>
                    <div className="text-xs font-black text-emerald-600 mt-0.5 font-mono">
                      {currentUser?.autoRenew !== false && !currentUser?.autoRenewCancelledAt
                        ? currentUser?.subscriptionExpiryDate
                          ? currentUser.subscriptionExpiryDate.split('T')[0]
                          : '—'
                        : tr(language, 'គ្មានការកាត់ប្រាក់បន្ថែម', 'No Further Charges', '不再扣款')}
                    </div>
                  </div>
                </div>

                {currentUser?.autoRenew !== false && !currentUser?.autoRenewCancelledAt ? (
                  <button
                    type="button"
                    onClick={() => {
                      cancelVipAutoRenew();
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold transition cursor-pointer"
                  >
                    {tr(language, 'បោះបង់ការជាវ (Cancel Subscription)', 'Cancel Subscription', '取消订阅 (Cancel Subscription)')}
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                    {tr(
                      language,
                      `✅ ការបន្តស្វ័យប្រវត្តិត្រូវបានបិទ (OFF)។ មិនមានការកាត់ប្រាក់បន្ថែមទៀតទេ ហើយគណនី VIP នៅតែមានសុពលភាពរហូតដល់ថ្ងៃទី ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : '—'}។`,
                      `✅ Auto-renewal is OFF. No further payments will be charged, and your VIP membership remains active until ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : '—'}.`,
                      `✅ 自动续费已关闭，不会再产生任何扣款。您的 VIP 权益将有效至 ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : '—'}。`
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleClose}
                  style={{
                    background: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
                  }}
                  className="w-full py-3 px-4 rounded-2xl text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <span>{tr(language, '🚀 បន្តប្រើប្រាស់កម្មវិធី', '🚀 Continue to App', '🚀 继续使用应用')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STATE 2B: NEEDS_MORE_INFO */}
          {paymentState === 'NEEDS_MORE_INFO' && (
            <div className="p-4 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] text-center space-y-4 animate-fade-in text-slate-900">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-400/20">
                <MessageSquareWarning className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-moul text-base text-slate-900 mt-2">
                  {tr(language, '💬 រដ្ឋបាលស្នើសុំវិក្កយបត្របង់ប្រាក់បន្ថែម', '💬 Admin Requested Clearer Receipt', '💬 管理员请求上传更清晰的付款凭证')}
                </h4>
                <p className="text-xs text-amber-700 mt-1 max-w-sm mx-auto leading-relaxed font-semibold">
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

              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-amber-400/60 text-left space-y-3">
                {(paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl) && (
                  <img loading="lazy" decoding="async"
                    src={paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl}
                    alt="Payment Proof Preview"
                    className="w-full max-h-56 object-contain rounded-xl border border-slate-200 bg-white p-1"
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePickReceiptFromGallery}
                    style={{
                      background: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
                    }}
                    className="py-2.5 px-3 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{tr(language, 'រូបភាពរបស់ខ្ញុំ', 'My Photos', '我的照片')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => proofCameraInputRef.current?.click()}
                    style={{
                      background: 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)',
                    }}
                    className="py-2.5 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{tr(language, 'ថតរូបវិក្កយបត្រ', 'Take Photo', '拍摄凭证')}</span>
                  </button>
                </div>

                {paymentProofDraft && (
                  <button
                    type="button"
                    onClick={handleUploadProofToExistingRequest}
                    style={{
                      background: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
                    }}
                    className="w-full py-3 px-4 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
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
            <div className="p-4 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] text-center space-y-4 animate-fade-in text-slate-900">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-400/20">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-moul text-base text-slate-900 mt-2">
                  {tr(language, '⏳ កំពុងរង់ចាំរដ្ឋបាលអនុម័ត', '⏳ Pending Admin Approval', '⏳ 等待管理员审核')}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  {tr(
                    language,
                    'សំណើរបស់អ្នកត្រូវបានបញ្ជូនរួចរាល់។ រដ្ឋបាលនឹងពិនិត្យវិក្កយបត្រ និងបើកដំណើរការ VIP ជូនអ្នក។',
                    'Your request has been submitted. Admin will verify your ABA receipt and activate VIP.',
                    '您的申请已提交，管理员核实 ABA 付款凭证后将为您开通 VIP。'
                  )}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{tr(language, 'កញ្ចប់ដែលបានស្នើសុំ៖', 'Requested Plan:', '申请套餐：')}</span>
                  <span className="font-bold text-slate-900">
                    ${(userLatestVipTxn?.amountUsd || selectedPlan.priceUsd).toFixed(2)} ({userLatestVipTxn?.durationDays || selectedPlan.days} {tr(language, 'ថ្ងៃ', 'Days', '天')})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{tr(language, 'ភស្តុតាងបង់ប្រាក់៖', 'Payment Receipt:', '付款凭证：')}</span>
                  <span className={`font-bold ${userLatestVipTxn?.paymentProofUrl || paymentProofDraft ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {userLatestVipTxn?.paymentProofUrl || paymentProofDraft
                      ? tr(language, '✅ បានភ្ជាប់វិក្កយបត្រ', '✅ Receipt Attached', '✅ 已附上凭证')
                      : tr(language, 'មិនទាន់ភ្ជាប់រូបភាព', 'Not attached yet', '尚未附上凭证')}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                {(paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl) && (
                  <img loading="lazy" decoding="async"
                    src={paymentProofDraft?.dataUrl || userLatestVipTxn?.paymentProofUrl}
                    alt="Uploaded Payment Proof"
                    className="w-full max-h-48 object-contain rounded-xl border border-slate-200 bg-white p-1"
                  />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePickReceiptFromGallery}
                    style={{
                      background: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
                    }}
                    className="flex-1 py-2 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                      style={{
                        background: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
                      }}
                      className="py-2 px-3.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
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
            <div className="p-4 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] text-center space-y-4 animate-fade-in text-slate-900">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                <XCircle className="w-9 h-9" />
              </div>

              <div>
                <h4 className="font-moul text-sm text-slate-900 mt-2">
                  {tr(language, '❌ សំណើទូទាត់ត្រូវបានបដិសេធដោយរដ្ឋបាល', '❌ Payment Request Rejected', '❌ 付款申请未通过审核')}
                </h4>
                <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto leading-relaxed">
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
                style={{
                  background: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
                }}
                className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold transition cursor-pointer shadow-md"
              >
                {tr(language, '🔄 បង្កើតសំណើទូទាត់ប្រាក់ថ្មី', '🔄 Start New Payment Request', '🔄 重新发起付款申请')}
              </button>
            </div>
          )}

          {/* STATE 5: PAYMENT_FAILED */}
          {paymentState === 'PAYMENT_FAILED' && (
            <div className="p-4 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] text-center space-y-4 animate-fade-in text-slate-900">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-moul text-sm text-slate-900 mt-2">
                  {tr(language, 'សំណើទូទាត់មិនជោគជ័យ', 'Payment Request Failed', '付款申请提交失败')}
                </h4>
                <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto leading-relaxed">
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
                  style={{
                    background: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
                  }}
                  className="py-2.5 px-4 rounded-xl text-white text-xs font-bold transition cursor-pointer shadow-md"
                >
                  {tr(language, '🔄 ព្យាយាមម្តងទៀត', '🔄 Try Again', '🔄 重试')}
                </button>
                <button
                  onClick={() => setPaymentState('AWAITING_PAYMENT')}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {tr(language, 'ត្រឡប់ក្រោយ', 'Back', '返回')}
                </button>
              </div>
            </div>
          )}

          {/* STATE 6: EXPIRED */}
          {paymentState === 'EXPIRED' && (
            <div className="p-4 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] text-center space-y-4 animate-fade-in text-slate-900">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-moul text-sm text-slate-900 mt-2">
                  {tr(language, 'វគ្គទូទាត់ប្រាក់បានផុតកំណត់', 'Payment Session Expired', '付款会话已过期')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
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
                style={{
                  background: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
                }}
                className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                {tr(language, '🔄 បង្កើតវគ្គទូទាត់ថ្មី', '🔄 Start New Payment Session', '🔄 开始新的付款会话')}
              </button>
            </div>
          )}

          {paymentState === 'AWAITING_PAYMENT' && !consumerCatalog.consumerVipEnabled && (
            <div className="p-5 rounded-2xl bg-white border border-emerald-300 text-center space-y-2.5 shadow-xs">
              <div className="font-bold text-sm text-slate-900">
                {tr(language, '🌿 ការប្រើប្រាស់កម្មវិធីគឺឥតគិតថ្លៃ!', '🌿 Core App Browsing is Free!', '🌿 核心浏览功能免费开放！')}
              </div>
              <p className="text-xs text-slate-600">
                {tr(language, 'ការមើលម្ហូប ហាង សណ្ឋាគារ តំបន់ទេសចរណ៍ និងផែនទី គឺ FREE ជារៀងរហូត។', 'Browsing dishes, shops, hotels, attractions, and maps is FREE forever.', '浏览美食、餐厅、酒店、景点与地图永久免费。')}
              </p>
            </div>
          )}

          {/* STATE 1: AWAITING_PAYMENT — Clean, Short 4-Step VIP Payment Screen on Dark Slate (#1E293B) */}
          {paymentState === 'AWAITING_PAYMENT' && isVipConfigValid && (
            <div className="space-y-2.5">
              {/* If user has a pending verification request, show a friendly status bar without blocking the upgrade flow */}
              {(userLatestVipTxn?.status === 'pending_verification' ||
                userLatestVipTxn?.status === 'needs_more_info') && (
                <div className="p-3 rounded-2xl bg-white border border-amber-300 shadow-xs flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold">
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

              {/* Free Forever Core Browsing Reassurance Banner (Clean White Card) */}
              <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/90 shadow-[0_4px_12px_rgba(15,23,42,0.08)] text-[11px] text-emerald-950 font-bold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {tr(
                    language,
                    'ការមើលម្ហូប រូបមន្ត ហាង សណ្ឋាគារ តំបន់ទេសចរណ៍ និងផែនទីនាំផ្លូវ គឺ FREE ជារៀងរហូត! VIP គឺសម្រាប់មុខងារ AI កម្រិតខ្ពស់បន្ថែមប៉ុណ្ណោះ។',
                    'Browsing dishes, recipes, shops, hotels, attractions & map navigation is FREE forever! VIP is an optional AI & planner upgrade.',
                    '浏览菜品、食谱、餐厅、酒店、景点与地图导航永久免费！VIP 仅为可选 AI 增强升级。'
                  )}
                </span>
              </div>

              {/* 1-Time 7-Day Free Consumer VIP Trial Card */}
              {canClaimTrial7d && (
                <div className="p-3 rounded-2xl bg-white border-2 border-amber-400 shadow-[0_4px_14px_rgba(15,23,42,0.10)] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      <span>
                        {tr(
                          language,
                          `🎁 សាកល្បង VIP ឥតគិតថ្លៃ ${consumerCatalog.trialPlan.durationDays} ថ្ងៃ ($0)`,
                          `🎁 Free ${consumerCatalog.trialPlan.durationDays}-Day VIP Trial ($0)`,
                          `🎁 免费试用 ${consumerCatalog.trialPlan.durationDays} 天 VIP ($0)`
                        )}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
                      {tr(language, '១ ដងគត់', '1-Time Only', '仅限 1 次')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug">
                    {tr(
                      language,
                      `បើកប្រើជំនួយការ AI (${consumerCatalog.trialAiDailyLimit} ដង/ថ្ងៃ) និងផែនការដើរលេង ដោយឥតគិតថ្លៃ ${consumerCatalog.trialPlan.durationDays} ថ្ងៃ (មិនរួមបញ្ចូលកញ្ចប់ដាក់ហាងទេ)។`,
                      `Try AI assistant (${consumerCatalog.trialAiDailyLimit} requests/day) & smart trip planner free for ${consumerCatalog.trialPlan.durationDays} days (Shop Package sold separately).`,
                      `免费体验 ${consumerCatalog.trialPlan.durationDays} 天 AI 助手（每日 ${consumerCatalog.trialAiDailyLimit} 次）与智能行程规划（不含开店套餐）。`
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={isClaimingTrial}
                    onClick={handleClaimFreeTrial}
                    style={{
                      background: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
                    }}
                    className="w-full py-2.5 px-3 rounded-xl text-white font-black text-xs shadow-sm flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer disabled:opacity-60"
                  >
                    {isClaimingTrial ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Crown className="w-4 h-4 fill-white shrink-0" />
                    )}
                    <span>
                      {tr(
                        language,
                        `ចាប់ផ្តើមសាកល្បងឥតគិតថ្លៃ ${consumerCatalog.trialPlan.durationDays} ថ្ងៃឥឡូវនេះ`,
                        `Start Free ${consumerCatalog.trialPlan.durationDays}-Day Trial Now`,
                        `立即开启 ${consumerCatalog.trialPlan.durationDays} 天免费试用`
                      )}
                    </span>
                  </button>
                </div>
              )}

              {/* Post-Trial Win-Back Highlight Banner ($0.99 vs 90-day $6.99 Saver) */}
              {canClaimWinback099 && (
                <div className="p-2.5 rounded-2xl bg-white border border-amber-400 text-[11px] text-amber-950 font-bold shadow-xs">
                  {tr(
                    language,
                    `✨ ផ្តល់ជូនពិសេសក្រោយសាកល្បង៖ ខែដំបូងត្រឹមតែ $${consumerCatalog.promo30dPlan.priceUsd.toFixed(2)} (30 ថ្ងៃ) ឬជ្រើសកញ្ចប់សន្សំ 90 ថ្ងៃ $${consumerCatalog.quarterlyPlan.priceUsd.toFixed(2)} (-22%)!`,
                    `✨ Post-Trial Offer: First 30 days just $${consumerCatalog.promo30dPlan.priceUsd.toFixed(2)}, or lock in 90 days for $${consumerCatalog.quarterlyPlan.priceUsd.toFixed(2)} (-22% saver)!`,
                    `✨ 试用结束特惠：首 30 天仅 $${consumerCatalog.promo30dPlan.priceUsd.toFixed(2)}，或选择 90 天省钱套餐 $${consumerCatalog.quarterlyPlan.priceUsd.toFixed(2)} (-22%)！`
                  )}
                </div>
              )}

              {/* Official Consumer VIP Plan Selector inside Clean White Container with Colorful Gradient Plan Cards (Matching Reference Image 2) */}
              <div className="p-2.5 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] space-y-2">
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {dynamicPlansList.map((plan, idx) => {
                    const isSelected = selectedPlan?.planId === plan.planId;
                    const planGradients = [
                      'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)',
                      'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
                      'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
                      'linear-gradient(180deg, #F75977 0%, #C41D4B 100%)',
                    ];
                    const cardGradient = planGradients[idx % planGradients.length];
                    return (
                      <div
                        key={plan.planId}
                        onClick={() => handleSelectPlan(plan)}
                        style={{
                          background: cardGradient,
                          boxShadow: isSelected
                            ? '0 6px 14px rgba(15, 23, 42, 0.25), 0 0 0 2.5px #064E3B, inset 0 1px 1px rgba(255, 255, 255, 0.45)'
                            : '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
                        }}
                        className="relative px-3 py-2.5 rounded-[16px] cursor-pointer transition active:scale-[0.98] text-left flex items-center justify-between gap-2 text-white"
                      >
                        <span
                          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[16px]"
                          style={{
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)',
                          }}
                        />
                        {plan.badgeText && (
                          <span
                            className={`absolute -top-2 right-2 z-20 px-2 py-px rounded-full text-slate-950 text-[9px] font-black tracking-wide font-khmer shadow-xs ${
                              plan.isWinbackPromo
                                ? 'bg-amber-300'
                                : 'bg-white border border-emerald-500/40 text-emerald-900'
                            }`}
                          >
                            {plan.badgeText}
                          </span>
                        )}
                        <div className="relative z-10 min-w-0">
                          <div className="text-[11px] font-extrabold text-white/95 truncate drop-shadow-2xs">
                            {isKm ? plan.titleKh : plan.titleEn}
                          </div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="font-moul text-base sm:text-lg text-white font-mono leading-tight drop-shadow-2xs">
                              {'$'}{plan.priceUsd.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-white/90 font-bold">
                              / {tr(language, `${plan.days}ថ្ងៃ`, `${plan.days}d`, `${plan.days}天`)}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`relative z-10 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-white bg-white text-emerald-700' : 'border-white/75 bg-white/15'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[10.5px] text-slate-700 font-bold flex items-center justify-between gap-2">
                  <span>🤖 {tr(language, `កូតា AI៖ ${consumerCatalog.paidAiDailyLimit} ដង/ថ្ងៃ`, `AI Quota: ${consumerCatalog.paidAiDailyLimit}/day`, `AI 配额：每日 ${consumerCatalog.paidAiDailyLimit} 次`)}</span>
                  <span>🏪 {tr(language, 'កញ្ចប់ដាក់ហាងគិតដាច់ដោយឡែក', 'Shop Package is separate', '开店套餐单独计费')}</span>
                </div>
              </div>

              {/* STEP 1 & 2: Scan / save ABA KHQR + pay via ABA Mobile (Clean White Card) */}
              <div className="p-3 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5 min-w-0">
                    <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {tr(language, '១. ស្កេន ឬរក្សាទុកកូដ QR', '1. Scan or save ABA KHQR', '1. 扫描或保存二维码')}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold font-mono shrink-0">
                    {tr(language, 'បាគង KHQR', 'Bakong KHQR', '巴孔二维码')}
                  </span>
                </div>

                <div className="flex gap-3 items-stretch">
                  <button
                    type="button"
                    onClick={handleSaveQrImage}
                    title={tr(language, 'ចុចលើរូប QR ដើម្បីរក្សាទុកទៅក្នុង រូបភាពរបស់ខ្ញុំ', 'Tap QR code to save original image to My Photos', '点击二维码保存原图到我的照片')}
                    className="w-[42%] max-w-[162px] p-1.5 bg-white rounded-2xl shadow-sm border-2 border-emerald-500/40 hover:border-emerald-500 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition"
                  >
                    <img loading="lazy" decoding="async"
                      src={qrCodeDataUrl}
                      alt="ABA KHQR Code"
                      className="w-full aspect-square object-contain rounded-lg select-none"
                    />
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                    <div className="p-2 rounded-2xl bg-sky-50 border border-sky-200">
                      <div className="text-[11px] font-bold text-slate-700 leading-snug">
                        {tr(language, 'ឈ្មោះគណនី៖ CHEA SAVUTH', 'Account: CHEA SAVUTH', '账户：CHEA SAVUTH')}
                      </div>
                      <div className="font-mono font-extrabold text-xs sm:text-sm text-[#004B87] leading-tight mt-0.5">
                        USD: 000 056 833
                      </div>
                      <div className="font-mono font-bold text-[11px] text-emerald-700 leading-tight mt-0.5">
                        KHR: 003 787 096
                      </div>
                      <a
                        href="https://pay.ababank.com/oRF8/tyy7642t"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline break-all"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span>pay.ababank.com/oRF8/tyy7642t</span>
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={handleSaveQrImage}
                        className="py-2 px-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer border border-slate-200"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{tr(language, 'រក្សាទុក QR', 'Save QR', '保存二维码')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className="py-2 px-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer border border-slate-200"
                      >
                        {hasCopiedAccount ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate">
                          {hasCopiedAccount
                            ? tr(language, 'បានចម្លង!', 'Copied!', '已复制！')
                            : tr(language, 'ចម្លងលេខ', 'Copy number', '复制账号')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLaunchAbaApp}
                  style={{
                    background: 'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)',
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-white shrink-0" />
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

              {/* STEP 3 & 4: Upload receipt + submit for admin approval (Clean White Card) */}
              <div className="p-3 rounded-[22px] bg-white border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.10)] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5 min-w-0">
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {tr(language, '៣. អាប់ឡូតវិក្កយបត្របង់ប្រាក់', '3. Upload the payment receipt', '3. 上传付款凭证截图')}
                    </span>
                  </span>
                </div>

                {paymentProofDraft && (
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-emerald-50 border border-emerald-300 animate-fade-in">
                    {paymentProofDraft.mimeType === 'application/pdf' ? (
                      <div className="w-10 h-10 rounded-lg bg-rose-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                        PDF
                      </div>
                    ) : (
                      <img loading="lazy" decoding="async"
                        src={paymentProofDraft.dataUrl}
                        alt="Selected Payment Proof Preview"
                        className="w-10 h-10 object-cover rounded-lg bg-white border border-slate-200 shrink-0"
                      />
                    )}
                    <span className="flex-1 min-w-0 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{paymentProofDraft.fileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaymentProofDraft(null)}
                      className="p-1.5 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition cursor-pointer shrink-0"
                      title={tr(language, 'លុបរូបភាព', 'Remove image', '删除图片')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePickReceiptFromGallery}
                    disabled={isProcessingProofImage}
                    style={{
                      background: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
                    }}
                    className="py-2.5 px-3 rounded-2xl text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {tr(language, 'រូបភាពរបស់ខ្ញុំ', 'My Photos', '我的照片')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => proofCameraInputRef.current?.click()}
                    disabled={isProcessingProofImage}
                    style={{
                      background: 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)',
                    }}
                    className="py-2.5 px-3 rounded-2xl text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer disabled:opacity-60"
                  >
                    <Camera className="w-4 h-4 text-white shrink-0" />
                    <span className="truncate">{tr(language, 'ថតរូបវិក្កយបត្រ', 'Take Photo', '拍摄凭证')}</span>
                  </button>
                </div>

                {/* Automatic VIP Renewal Consent (ON by Default with Clear User Consent, Cancel Anytime) */}
                <label className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-300 flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRenewOptIn}
                    onChange={(e) => {
                      setAutoRenewOptIn(e.target.checked);
                      setAutoRenewConsentChecked(e.target.checked);
                    }}
                    className="mt-0.5 w-4 h-4 rounded accent-emerald-600 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0 text-[11px] text-slate-800 leading-snug">
                    <div className="font-extrabold text-emerald-900 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                      <span>
                        {tr(
                          language,
                          `បើកការបន្ត VIP ស្វ័យប្រវត្តិ (ON ជាលំនាំដើម — $${selectedPlan.priceUsd.toFixed(2)} / ${selectedPlan.days} ថ្ងៃ)`,
                          `Auto-Renew VIP ON by Default ($${selectedPlan.priceUsd.toFixed(2)} / ${selectedPlan.days} days)`,
                          `默认开启 VIP 自动续费（$${selectedPlan.priceUsd.toFixed(2)} / ${selectedPlan.days} 天）`
                        )}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 mt-0.5">
                      {tr(
                        language,
                        'ប្រព័ន្ធនឹងផ្ញើសាររំលឹកមុនផុតកំណត់ ៣ ថ្ងៃ ហើយបន្តសុពលភាពតែពេលការបង់ប្រាក់ជោគជ័យប៉ុណ្ណោះ។ អ្នកអាចបិទ (Turn OFF) បានគ្រប់ពេលនៅក្នុងផ្ទាំង សមាជិកភាព។',
                        'We send a reminder 3 days before expiry and renew only upon confirmed payment. You can turn OFF Auto-Renewal anytime in the Membership tab.',
                        '到期前 3 天将发送提醒，仅在确认付款成功后续期。您可随时在“会员”页面关闭自动续费。'
                      )}
                    </p>
                  </div>
                </label>

                <button
                  onClick={handleSubmitPaymentForAdminApproval}
                  disabled={isSubmittingRequest || isProcessingProofImage}
                  style={{
                    background: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
                  }}
                  className="w-full py-3 px-4 rounded-2xl text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRequest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white shrink-0" />
                      <span>{tr(language, 'កំពុងបញ្ជូនទៅរដ្ឋបាល...', 'Submitting to Admin...', '正在提交审核...')}</span>
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-4 h-4 text-white shrink-0" />
                      <span>
                        {tr(
                          language,
                          `៤. បញ្ជូនសំណើអនុម័ត ($${selectedPlan.priceUsd.toFixed(2)})`,
                          `4. Submit for approval ($${selectedPlan.priceUsd.toFixed(2)})`,
                          `4. 提交审核 ($${selectedPlan.priceUsd.toFixed(2)})`
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
        <div className="px-4 py-1.5 bg-[#1E293B] border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-300 font-mono shrink-0">
          <span className="font-semibold text-slate-300">
            {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨美食与旅游')} {APP_VERSION} ({APP_BUILD_CODE})
          </span>
          <a
            href="/privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 font-medium hover:underline"
          >
            {tr(language, 'គោលការណ៍ឯកជនភាព', 'Privacy Policy', '隐私政策')}
          </a>
        </div>
      </div>
    </div>
  );
};
