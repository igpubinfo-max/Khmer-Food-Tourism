import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Upload,
  CheckCircle2,
  Clock,
  Crown,
  Image as ImageIcon,
  Trash2,
  User as UserIcon,
  ShieldCheck,
  FileText,
  Sparkles,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDynamicVipPlans, SupportTicket, AbaReceiptVerificationReport } from '../types';
import { tr } from '../utils/i18n';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';
import { verifyAbaPaymentAndReceipt } from '../services/aiPaymentVerificationService';
import { Capacitor } from '@capacitor/core';

export const PaymentSupportModal: React.FC = () => {
  const {
    language,
    currentUser,
    appSettings,
    isRefreshingSettings,
    settingsSyncError,
    refreshAppSettingsFromServer,
    isSupportTicketModalOpen,
    setIsSupportTicketModalOpen,
    supportModalPrefill,
    supportTickets,
    createSupportTicket,
    replyToSupportTicket,
    markSupportTicketRead,
    transactions,
    showToast,
  } = useApp();

  const dynamicPlans = getDynamicVipPlans(appSettings);

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedPlan, setSelectedPlan] = useState<'quarterly' | 'annual'>('quarterly');
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isVerifyingAi, setIsVerifyingAi] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<AbaReceiptVerificationReport | null>(null);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  const myTickets = supportTickets.filter(
    (t) => currentUser && t.userId === currentUser.id
  );
  const unreadRepliesCount = myTickets.filter((t) => t.unreadByUser).length;

  useEffect(() => {
    if (isSupportTicketModalOpen && currentUser) {
      refreshAppSettingsFromServer(true);
      if (supportModalPrefill?.planType) {
        setSelectedPlan(supportModalPrefill.planType);
      }
      const latestTxn = transactions.find((t) => t.userId === currentUser.id);
      const rawRef =
        supportModalPrefill?.paymentRef ||
        currentUser.transactionRef ||
        latestTxn?.transactionRef ||
        '';
      setPaymentRef(/^ABA-KHQR-/i.test(rawRef) ? '' : rawRef);
      if (supportModalPrefill?.receiptUrl) {
        setReceiptDataUrl(supportModalPrefill.receiptUrl);
      }
      if (myTickets.some((t) => t.unreadByUser)) {
        setActiveTab('history');
        const firstUnread = myTickets.find((t) => t.unreadByUser);
        if (firstUnread) {
          setSelectedTicketId(firstUnread.id);
          markSupportTicketRead(firstUnread.id);
        }
      } else if (myTickets.length > 0 && !supportModalPrefill) {
        setSelectedTicketId(myTickets[0].id);
      }
    }
  }, [isSupportTicketModalOpen]);

  const currentPlanConfig = dynamicPlans[selectedPlan];

  // Automatically run AI + Deterministic Receipt Verification whenever a receipt image is attached or plan/ref/price changes
  useEffect(() => {
    let cancelled = false;
    if (!receiptDataUrl || !currentUser) {
      setAiReport(null);
      setIsVerifyingAi(false);
      return;
    }

    const planCfg = dynamicPlans[selectedPlan];
    setIsVerifyingAi(true);
    verifyAbaPaymentAndReceipt({
      receiptDataUrl,
      expectedAmountUsd: planCfg.priceUsd,
      expectedDurationDays: planCfg.durationDays,
      submittedTrxId: paymentRef.trim(),
      submittedDate: paymentDate,
      userId: currentUser.id,
      existingTransactions: transactions,
    })
      .then((report) => {
        if (cancelled) return;
        setAiReport(report);
        // If AI/OCR extracted a real Trx. ID from the receipt and user hasn't typed one yet, auto-fill it
        if (
          report.extractedReceipt?.trxId &&
          (!paymentRef.trim() || /^ABA-\d{6}$/i.test(paymentRef.trim()))
        ) {
          setPaymentRef(report.extractedReceipt.trxId);
        }
      })
      .catch(() => {
        if (!cancelled) setAiReport(null);
      })
      .finally(() => {
        if (!cancelled) setIsVerifyingAi(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    receiptDataUrl,
    selectedPlan,
    paymentDate,
    paymentRef,
    currentPlanConfig.priceUsd,
    currentPlanConfig.durationDays,
  ]);

  if (!isSupportTicketModalOpen || !currentUser) return null;

  const handleChooseReceipt = async (isReply: boolean = false) => {
    if (Capacitor.isNativePlatform()) {
      setIsUploading(true);
      try {
        const res = await pickImageUsingNativeAndroidGallery();
        if (!res.cancelled && res.dataUrl) {
          if (isReply) {
            setReplyAttachmentUrl(res.dataUrl);
          } else {
            setReceiptDataUrl(res.dataUrl);
          }
          showToast(
            tr(
              language,
              '✅ បានជ្រើសរើសរូបភាពវិក្កយបត្រពីបណ្ណាល័យរូបភាពរួចរាល់!',
              '✅ Selected receipt image from Gallery!',
              '✅ 已从相册选择付款凭证截图！'
            ),
            'success'
          );
          setIsUploading(false);
          return;
        }
        if (res.cancelled) {
          setIsUploading(false);
          return;
        }
      } catch {
        // Fallback to standard file input below
      }
      setIsUploading(false);
    }

    if (isReply) {
      replyFileInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isReply: boolean = false
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await processAndCompressImageFile(file, 1100, 0.84);
      if (isReply) {
        setReplyAttachmentUrl(compressed);
      } else {
        setReceiptDataUrl(compressed);
      }
      showToast(
        tr(
          language,
          '✅ បានភ្ជាប់រូបភាពវិក្កយបត្ររួចរាល់!',
          '✅ Payment receipt attached!',
          '✅ 付款凭证已附上！'
        ),
        'success'
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          tr(
            language,
            'មិនអាចអានរូបភាពបានទេ។',
            'Could not process selected image.',
            '无法处理所选图片。'
          ),
        'warning'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      showToast(
        tr(
          language,
          'សូមសរសេរសារពន្យល់ពីបញ្ហាការបង់ប្រាក់របស់អ្នក។',
          'Please describe your payment issue.',
          '请描述您的付款问题。'
        ),
        'warning'
      );
      return;
    }

    const latestSettings = await refreshAppSettingsFromServer(true);
    const livePlans = getDynamicVipPlans(latestSettings);
    const livePlanCfg = livePlans[selectedPlan];

    let finalReport = aiReport;
    if (
      receiptDataUrl &&
      (!finalReport ||
        Math.abs((finalReport.checks.amount.expected ? parseFloat(finalReport.checks.amount.expected.replace(/[^0-9.]/g, '')) : 0) - livePlanCfg.priceUsd) > 0.01)
    ) {
      setIsVerifyingAi(true);
      try {
        finalReport = await verifyAbaPaymentAndReceipt({
          receiptDataUrl,
          expectedAmountUsd: livePlanCfg.priceUsd,
          expectedDurationDays: livePlanCfg.durationDays,
          submittedTrxId: paymentRef.trim(),
          submittedDate: paymentDate,
          userId: currentUser.id,
          existingTransactions: transactions,
        });
        setAiReport(finalReport);
      } finally {
        setIsVerifyingAi(false);
      }
    }

    const created = createSupportTicket({
      message: messageText.trim(),
      planType: selectedPlan,
      paymentDate,
      paymentRef:
        paymentRef.trim() ||
        finalReport?.extractedReceipt?.trxId ||
        `ABA-${Date.now().toString().slice(-6)}`,
      receiptUrl: receiptDataUrl || undefined,
      aiVerificationReport: finalReport || undefined,
    });

    if (created) {
      setMessageText('');
      setReceiptDataUrl('');
      setAiReport(null);
      setSelectedTicketId(created.id);
      setActiveTab('history');
    }
  };

  const handleSendReply = (ticket: SupportTicket) => {
    if (!replyText.trim() && !replyAttachmentUrl) {
      showToast(
        tr(
          language,
          'សូមសរសេរសារ ឬភ្ជាប់រូបភាពមុនពេលផ្ញើ។',
          'Please enter a message or attach a receipt.',
          '请输入留言或附上付款凭证后再发送。'
        ),
        'warning'
      );
      return;
    }

    const ok = replyToSupportTicket(
      ticket.id,
      replyText.trim(),
      replyAttachmentUrl || undefined
    );
    if (ok) {
      setReplyText('');
      setReplyAttachmentUrl('');
    }
  };

  const activeTicket =
    myTickets.find((t) => t.id === selectedTicketId) || myTickets[0] || null;

  const renderStatusBadge = (status: SupportTicket['status']) => {
    if (status === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          {tr(language, 'បានដោះស្រាយ', 'Resolved', '已解决')}
        </span>
      );
    }
    if (status === 'replied') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-300">
          <MessageSquare className="w-3 h-3" />
          {tr(language, 'រដ្ឋបាលបានឆ្លើយតប', 'Replied', '管理员已回复')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="w-3 h-3" />
        {tr(language, 'កំពុងរង់ចាំ', 'Pending', '待处理')}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white text-gray-900 rounded-3xl shadow-2xl border border-amber-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <MessageSquare className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold leading-tight">
                {tr(
                  language,
                  'ទាក់ទងរដ្ឋបាល / ជំនួយការបង់ប្រាក់ VIP',
                  'Contact Admin / VIP Payment Support',
                  '联系管理员 / VIP 付款支持'
                )}
              </h2>
              <p className="text-xs text-amber-100">
                {tr(
                  language,
                  'ផ្ញើសារ និងវិក្កយបត្របង់ប្រាក់ទៅកាន់រដ្ឋបាលផ្ទាល់ក្នុងកម្មវិធី',
                  'Direct two-way support & payment verification with Admin',
                  '在应用内直接向管理员发送留言与付款凭证'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSupportTicketModalOpen(false)}
            className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'new'
                ? 'border-amber-600 text-amber-700 bg-white shadow-sm'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Send className="w-4 h-4" />
            {tr(language, 'ផ្ញើសារជំនួយថ្មី', 'New Support Message', '发送新支持留言')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              if (activeTicket) markSupportTicketRead(activeTicket.id);
            }}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-700 bg-white shadow-sm'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {tr(
              language,
              `ប្រវត្តិសារ និងការឆ្លើយតប (${myTickets.length})`,
              `Support Messages (${myTickets.length})`,
              `留言记录 (${myTickets.length})`
            )}
            {unreadRepliesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-extrabold rounded-full animate-pulse">
                {unreadRepliesCount}
              </span>
            )}
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
          onChange={(e) => handleFileInputChange(e, false)}
          className="hidden"
        />
        <input
          ref={replyFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
          onChange={(e) => handleFileInputChange(e, true)}
          className="hidden"
        />

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'new' ? (
            <form onSubmit={handleSubmitNewTicket} className="space-y-4">
              {/* Auto-filled User & Payment Info Card */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-amber-600" />
                    {tr(
                      language,
                      'ព័ត៌មានគណនីរបស់អ្នក (ភ្ជាប់ដោយស្វ័យប្រវត្តិ)',
                      'Your Account Details (Auto-Attached)',
                      '您的账户信息（自动附上）'
                    )}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900">
                    {tr(language, 'លេខសម្គាល់៖', 'ID:', '编号：')} {currentUser.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 pt-1">
                  <div className="bg-white/80 rounded-xl p-2 border border-amber-100">
                    <span className="text-[10px] text-gray-500 block">
                      {tr(language, 'ឈ្មោះគណនី', 'Username', '账户名称')}
                    </span>
                    <span className="font-bold text-gray-900">
                      {currentUser.name} ({currentUser.username || currentUser.email})
                    </span>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2 border border-amber-100">
                    <span className="text-[10px] text-gray-500 block">
                      {tr(language, 'កាលបរិច្ឆេទបង់ប្រាក់', 'Payment Date', '付款日期')}
                    </span>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      style={{ color: '#000000' }}
                      className="font-bold text-gray-900 bg-transparent w-full focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Select Purchased VIP Plan (Dynamic Admin-Configured Prices & Durations) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-gray-800">
                    {tr(
                      language,
                      'ជ្រើសរើសកញ្ចប់ VIP ដែលអ្នកបានបង់ប្រាក់៖',
                      'Select the VIP Plan You Paid For:',
                      '选择您所支付的 VIP 套餐：'
                    )}
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('quarterly')}
                    className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                      selectedPlan === 'quarterly'
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-900">
                        {tr(language, dynamicPlans.quarterly.nameKh, dynamicPlans.quarterly.nameEn, `${dynamicPlans.quarterly.durationDays}天 VIP 套餐`)}
                      </span>
                      <Crown className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-lg font-black text-amber-600 mt-1">
                      ${dynamicPlans.quarterly.priceUsd.toFixed(2)}{' '}
                      <span className="text-xs font-semibold text-gray-600">
                        / {dynamicPlans.quarterly.durationDays} {tr(language, 'ថ្ងៃ', 'days', '天')}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('annual')}
                    className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                      selectedPlan === 'annual'
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-900">
                        {tr(language, dynamicPlans.annual.nameKh, dynamicPlans.annual.nameEn, `${dynamicPlans.annual.durationDays}天 VIP 套餐`)}
                      </span>
                      <Sparkles className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-lg font-black text-orange-600 mt-1">
                      ${dynamicPlans.annual.priceUsd.toFixed(2)}{' '}
                      <span className="text-xs font-semibold text-gray-600">
                        / {dynamicPlans.annual.durationDays} {tr(language, 'ថ្ងៃ', 'days', '天')}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Reference Input */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1">
                  {tr(
                    language,
                    'លេខយោងប្រតិបត្តិការធនាគារ៖',
                    'ABA Payment Reference / Transaction ID:',
                    'ABA 交易参考号 / 交易编号：'
                  )}
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder={tr(
                    language,
                    'ឧ. 176121426630955',
                    'e.g. 176121426630955',
                    '例如：176121426630955'
                  )}
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Upload Payment Receipt / Screenshot */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                  {tr(
                    language,
                    'ភ្ជាប់រូបភាពវិក្កយបត្របង់ប្រាក់៖',
                    'Attach ABA Payment Receipt or Screenshot:',
                    '附上 ABA 付款凭证截图：'
                  )}
                </label>
                {receiptDataUrl ? (
                  <div className="space-y-2.5">
                    <div className="relative rounded-2xl border-2 border-emerald-400 bg-emerald-50/40 p-3 flex items-center gap-3">
                      <img
                        src={receiptDataUrl}
                        alt="Payment Receipt Preview"
                        className="w-20 h-24 object-cover rounded-xl border border-emerald-300 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          {tr(
                            language,
                            'បានភ្ជាប់រូបភាពវិក្កយបត្ររួចរាល់',
                            'Payment receipt attached',
                            '付款凭证已附上'
                          )}
                        </p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          {tr(language, currentPlanConfig.nameKh, currentPlanConfig.nameEn, `${currentPlanConfig.durationDays}天 VIP 套餐`)} (${currentPlanConfig.priceUsd.toFixed(2)} /{' '}
                          {currentPlanConfig.durationDays} {tr(language, 'ថ្ងៃ', 'days', '天')})
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => handleChooseReceipt(false)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
                          >
                            {tr(language, 'ប្តូររូបភាព', 'Replace', '更换图片')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptDataUrl('');
                              setAiReport(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {tr(language, 'លុប', 'Remove', '删除')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Clean, non-alarming receipt status banner */}
                    {isVerifyingAi ? (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-3 flex items-center gap-2.5 text-xs font-bold text-blue-900">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                        <span>
                          {tr(
                            language,
                            'កំពុងពិនិត្យរូបភាពវិក្កយបត្របង់ប្រាក់...',
                            'Checking payment receipt image...',
                            '正在检查付款凭证图片...'
                          )}
                        </span>
                      </div>
                    ) : (
                      aiReport && (
                        <div
                          className={`rounded-2xl border p-3 text-xs font-semibold flex items-center gap-2 ${
                            !aiReport.checks.antiReplay.passed
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : 'border-emerald-300 bg-emerald-50/80 text-emerald-900'
                          }`}
                        >
                          {!aiReport.checks.antiReplay.passed ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span>
                            {!aiReport.checks.antiReplay.passed
                              ? tr(
                                  language,
                                  'វិក្កយបត្រនេះធ្លាប់ត្រូវបានប្រើរួចហើយ។ រដ្ឋបាលនឹងពិនិត្យផ្ទាល់ពេលអ្នកផ្ញើសារ។',
                                  'This receipt was used previously. Admin will review manually upon submission.',
                                  '此凭证曾被使用过，提交后管理员将进行人工审核。'
                                )
                              : tr(
                                  language,
                                  'រូបភាពវិក្កយបត្ររួចរាល់សម្រាប់បញ្ជូនទៅរដ្ឋបាលពិនិត្យ និងអនុម័ត។',
                                  'Receipt image is ready to submit for administrator review and approval.',
                                  '付款凭证已准备就绪，可提交给管理员审核与批准。'
                                )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => handleChooseReceipt(false)}
                    className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/40 hover:bg-amber-50 text-amber-800 flex flex-col items-center justify-center gap-1.5 transition"
                  >
                    <Upload className="w-6 h-6 text-amber-600" />
                    <span className="text-xs sm:text-sm font-extrabold">
                      {isUploading
                        ? tr(language, 'កំពុងអានរូបភាព...', 'Loading image...', '正在读取图片...')
                        : tr(
                            language,
                            '📸 ចុចជ្រើសរើសរូបភាពវិក្កយបត្របង់ប្រាក់ពីបណ្ណាល័យរូបភាព',
                            '📸 Select ABA Payment Receipt from Gallery / Photos',
                            '📸 从相册选择 ABA 付款凭证截图'
                          )}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {tr(
                        language,
                        'គាំទ្រឯកសាររូបភាពគ្រប់ប្រភេទ',
                        'Supports JPG, JPEG, PNG',
                        '支持 JPG、JPEG、PNG 格式'
                      )}
                    </span>
                  </button>
                )}
              </div>

              {/* Message Explaining Payment Problem */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1">
                  {tr(
                    language,
                    'សារពន្យល់ទៅកាន់រដ្ឋបាល *៖',
                    'Your Message to Admin *:',
                    '给管理员的留言说明 *：'
                  )}
                </label>
                <textarea
                  rows={3}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={tr(
                    language,
                    `ឧ. ខ្ញុំបានបង់ប្រាក់រួចហើយសម្រាប់កញ្ចប់ ${currentPlanConfig.nameKh} ($${currentPlanConfig.priceUsd.toFixed(2)}) សូមរដ្ឋបាលជួយពិនិត្យវិក្កយបត្រ...`,
                    `e.g., I already paid via ABA for ${currentPlanConfig.nameEn} ($${currentPlanConfig.priceUsd.toFixed(2)}). Please verify my attached receipt...`,
                    `例如：我已通过 ABA 支付 $${currentPlanConfig.priceUsd.toFixed(2)} 购买 VIP 套餐，请管理员核实所附凭证...`
                  )}
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                {tr(
                  language,
                  'ផ្ញើសារ និងវិក្កយបត្រទៅកាន់រដ្ឋបាល',
                  'Submit Support Message & Receipt to Admin',
                  '提交支持留言与付款凭证给管理员'
                )}
              </button>
            </form>
          ) : (
            /* Support History & Conversation Thread */
            <div className="space-y-4">
              {myTickets.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200 p-6">
                  <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">
                    {tr(
                      language,
                      'មិនទាន់មានសារជំនួយនៅឡើយទេ',
                      'No support messages yet',
                      '暂无支持留言记录'
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    {tr(
                      language,
                      'ប្រសិនបើអ្នកបានបង់ប្រាក់រួចហើយតែមិនទាន់ទទួលបាន VIP សូមផ្ញើសារ និងវិក្កយបត្រមកកាន់រដ្ឋបាល។',
                      'If you paid via ABA and need VIP activation, send a message with your receipt.',
                      '如果您已通过 ABA 付款但尚未开通 VIP，请发送留言并附上付款凭证。'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
                  >
                    {tr(
                      language,
                      '➕ ផ្ញើសារជំនួយថ្មី',
                      '➕ Create Support Message',
                      '➕ 发送新支持留言'
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Ticket Selector Pills */}
                  {myTickets.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {myTickets.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTicketId(t.id);
                            markSupportTicketRead(t.id);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 flex items-center gap-1.5 ${
                            activeTicket?.id === t.id
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          <span>#{t.id.slice(-6)}</span>
                          <span>({t.durationDays}{tr(language, 'ថ្ងៃ', 'd', '天')})</span>
                          {t.unreadByUser && (
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTicket && (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                      {/* Ticket Summary Header */}
                      <div className="bg-white p-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-900">
                              #{activeTicket.id}
                            </span>
                            {renderStatusBadge(activeTicket.status)}
                          </div>
                          <p className="text-xs font-bold text-amber-700 mt-1">
                            ${activeTicket.amountUsd.toFixed(2)} ({activeTicket.durationDays} {tr(language, 'ថ្ងៃ', 'days', '天')}) • {activeTicket.paymentRef} • {activeTicket.paymentDate}
                          </p>
                        </div>
                        {activeTicket.vipApproved && (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5" />
                            {tr(
                              language,
                              'VIP ត្រូវបានបើកដំណើរការ',
                              'VIP Activated',
                              'VIP 已激活'
                            )}
                          </span>
                        )}
                      </div>

                      {/* Messages Thread */}
                      <div className="p-3.5 space-y-3 max-h-72 overflow-y-auto">
                        {activeTicket.messages.map((msg) => {
                          const isAdmin = msg.senderRole === 'admin';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${
                                isAdmin ? 'items-start' : 'items-end'
                              }`}
                            >
                              <div
                                className={`max-w-[86%] rounded-2xl p-3 text-xs sm:text-sm shadow-sm ${
                                  isAdmin
                                    ? 'bg-white border-2 border-blue-200 text-gray-900'
                                    : 'bg-amber-600 text-white'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  {isAdmin ? (
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                  ) : (
                                    <UserIcon className="w-3.5 h-3.5 text-amber-200" />
                                  )}
                                  <span
                                    className={`text-[11px] font-extrabold ${
                                      isAdmin ? 'text-blue-700' : 'text-amber-100'
                                    }`}
                                  >
                                    {msg.senderName}
                                  </span>
                                  <span
                                    className={`text-[10px] ml-auto ${
                                      isAdmin ? 'text-gray-400' : 'text-amber-200'
                                    }`}
                                  >
                                    {msg.createdAt}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed">
                                  {msg.message}
                                </p>
                                {msg.attachmentUrl && (
                                  <div className="mt-2">
                                    <img
                                      src={msg.attachmentUrl}
                                      alt="Attached Receipt"
                                      className="max-h-44 rounded-xl border border-black/10 object-contain bg-black/5"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Input Box */}
                      <div className="p-3 bg-white border-t border-gray-200 space-y-2">
                        {replyAttachmentUrl && (
                          <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-200">
                            <img
                              src={replyAttachmentUrl}
                              alt="Reply attachment"
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <span className="text-xs font-bold text-amber-900 flex-1">
                              {tr(
                                language,
                                'រូបភាពវិក្កយបត្រភ្ជាប់បន្ថែម',
                                'Receipt image attached',
                                '已附上补充凭证图片'
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => setReplyAttachmentUrl('')}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleChooseReceipt(true)}
                            title={tr(
                              language,
                              'ភ្ជាប់រូបភាពវិក្កយបត្រ',
                              'Attach receipt image',
                              '附上付款凭证图片'
                            )}
                            className="p-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 shrink-0"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={tr(
                              language,
                              'សរសេរសារឆ្លើយតបទៅកាន់រដ្ឋបាល...',
                              'Write a reply to Admin...',
                              '输入回复管理员的消息...'
                            )}
                            style={{ color: '#000000', backgroundColor: '#ffffff' }}
                            className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSendReply(activeTicket)}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1 shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {tr(language, 'ផ្ញើ', 'Send', '发送')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
