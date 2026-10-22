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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VIP_PLANS, SupportTicket } from '../types';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';
import { Capacitor } from '@capacitor/core';

export const PaymentSupportModal: React.FC = () => {
  const {
    language,
    currentUser,
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

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedPlan, setSelectedPlan] = useState<'quarterly' | 'annual'>('quarterly');
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

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
      if (supportModalPrefill?.planType) {
        setSelectedPlan(supportModalPrefill.planType);
      }
      const latestTxn = transactions.find((t) => t.userId === currentUser.id);
      setPaymentRef(
        supportModalPrefill?.paymentRef ||
          currentUser.transactionRef ||
          latestTxn?.transactionRef ||
          `ABA-${Date.now().toString().slice(-6)}`
      );
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

  if (!isSupportTicketModalOpen || !currentUser) return null;

  const currentPlanConfig = VIP_PLANS[selectedPlan];

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
            language === 'km'
              ? '✅ បានជ្រើសរើសរូបភាពវិក្កយបត្រពី Gallery រួចរាល់!'
              : '✅ Selected receipt image from Gallery!',
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
        language === 'km'
          ? '✅ បានភ្ជាប់រូបភាពវិក្កយបត្ររួចរាល់!'
          : '✅ Payment receipt attached!',
        'success'
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === 'km'
            ? 'មិនអាចអានរូបភាពបានទេ។'
            : 'Could not process selected image.'),
        'warning'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitNewTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      showToast(
        language === 'km'
          ? 'សូមសរសេរសារពន្យល់ពីបញ្ហាការបង់ប្រាក់របស់អ្នក។'
          : 'Please describe your payment issue.',
        'warning'
      );
      return;
    }

    const created = createSupportTicket({
      message: messageText.trim(),
      planType: selectedPlan,
      paymentDate,
      paymentRef: paymentRef.trim(),
      receiptUrl: receiptDataUrl || undefined,
    });

    if (created) {
      setMessageText('');
      setReceiptDataUrl('');
      setSelectedTicketId(created.id);
      setActiveTab('history');
    }
  };

  const handleSendReply = (ticket: SupportTicket) => {
    if (!replyText.trim() && !replyAttachmentUrl) {
      showToast(
        language === 'km'
          ? 'សូមសរសេរសារ ឬភ្ជាប់រូបភាពមុនពេលផ្ញើ។'
          : 'Please enter a message or attach a receipt.',
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
          {language === 'km' ? 'បានដោះស្រាយ (Resolved)' : 'Resolved'}
        </span>
      );
    }
    if (status === 'replied') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-300">
          <MessageSquare className="w-3 h-3" />
          {language === 'km' ? 'Admin បានឆ្លើយតប (Replied)' : 'Replied'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="w-3 h-3" />
        {language === 'km' ? 'កំពុងរង់ចាំ (Pending)' : 'Pending'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <MessageSquare className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold leading-tight">
                {language === 'km'
                  ? 'ទាក់ទង Admin / ជំនួយការបង់ប្រាក់ VIP'
                  : 'Contact Admin / VIP Payment Support'}
              </h2>
              <p className="text-xs text-amber-100">
                {language === 'km'
                  ? 'ផ្ញើសារ និងវិក្កយបត្រ ABA ទៅកាន់ Admin ផ្ទាល់ក្នុងកម្មវិធី'
                  : 'Direct two-way support & payment verification with Admin'}
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
            {language === 'km'
              ? 'ផ្ញើសារជំនួយថ្មី'
              : 'New Support Message'}
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
            {language === 'km'
              ? `ប្រវត្តិសារ & ការឆ្លើយតប (${myTickets.length})`
              : `Support Messages (${myTickets.length})`}
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
                    {language === 'km'
                      ? 'ព័ត៌មានគណនីរបស់អ្នក (ភ្ជាប់ដោយស្វ័យប្រវត្តិ)'
                      : 'Your Account Details (Auto-Attached)'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900">
                    ID: {currentUser.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 pt-1">
                  <div className="bg-white/80 rounded-xl p-2 border border-amber-100">
                    <span className="text-[10px] text-gray-500 block">
                      {language === 'km' ? 'ឈ្មោះគណនី (Username)' : 'Username'}
                    </span>
                    <span className="font-bold text-gray-900">
                      {currentUser.name} ({currentUser.username || currentUser.email})
                    </span>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2 border border-amber-100">
                    <span className="text-[10px] text-gray-500 block">
                      {language === 'km' ? 'កាលបរិច្ឆេទបង់ប្រាក់' : 'Payment Date'}
                    </span>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="font-bold text-gray-900 bg-transparent w-full focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Select Purchased VIP Plan ($2.99 / 30 Days or $4.99 / 90 Days) */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                  {language === 'km'
                    ? 'ជ្រើសរើសកញ្ចប់ VIP ដែលអ្នកបានបង់ប្រាក់៖'
                    : 'Select the VIP Plan You Paid For:'}
                </label>
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
                        VIP 30 Days
                      </span>
                      <Crown className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-lg font-black text-amber-600 mt-1">
                      $2.99{' '}
                      <span className="text-xs font-semibold text-gray-600">
                        / 30 {language === 'km' ? 'ថ្ងៃ' : 'days'}
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
                        VIP 90 Days
                      </span>
                      <Sparkles className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-lg font-black text-orange-600 mt-1">
                      $4.99{' '}
                      <span className="text-xs font-semibold text-gray-600">
                        / 90 {language === 'km' ? 'ថ្ងៃ' : 'days'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Reference Input */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1">
                  {language === 'km'
                    ? 'លេខយោងប្រតិបត្តិការ ABA (Payment Reference / Trx ID)៖'
                    : 'ABA Payment Reference / Transaction ID:'}
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="ឧ. ABA-12345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Upload Payment Receipt / Screenshot */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                  {language === 'km'
                    ? 'ភ្ជាប់រូបភាពវិក្កយបត្របង់ប្រាក់ ABA (Receipt / Screenshot)៖'
                    : 'Attach ABA Payment Receipt or Screenshot:'}
                </label>
                {receiptDataUrl ? (
                  <div className="relative rounded-2xl border-2 border-emerald-400 bg-emerald-50/40 p-3 flex items-center gap-3">
                    <img
                      src={receiptDataUrl}
                      alt="Payment Receipt Preview"
                      className="w-20 h-24 object-cover rounded-xl border border-emerald-300 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        {language === 'km'
                          ? 'បានភ្ជាប់រូបភាពវិក្កយបត្ររួចរាល់'
                          : 'Payment receipt attached'}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {currentPlanConfig.nameEn} (${currentPlanConfig.priceUsd.toFixed(2)} /{' '}
                        {currentPlanConfig.durationDays} days)
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleChooseReceipt(false)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
                        >
                          {language === 'km' ? 'ប្តូររូបភាព' : 'Replace'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptDataUrl('')}
                          className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {language === 'km' ? 'លុប' : 'Remove'}
                        </button>
                      </div>
                    </div>
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
                        ? language === 'km'
                          ? 'កំពុងអានរូបភាព...'
                          : 'Loading image...'
                        : language === 'km'
                        ? '📸 ចុចជ្រើសរើសរូបភាពវិក្កយបត្រ ABA ពី Gallery / Photos'
                        : '📸 Select ABA Payment Receipt from Gallery / Photos'}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {language === 'km'
                        ? 'គាំទ្ររូបភាព JPG, JPEG, PNG'
                        : 'Supports JPG, JPEG, PNG'}
                    </span>
                  </button>
                )}
              </div>

              {/* Message Explaining Payment Problem */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1">
                  {language === 'km'
                    ? 'សារពន្យល់ទៅកាន់ Admin (Message to Admin) *៖'
                    : 'Your Message to Admin *:'}
                </label>
                <textarea
                  rows={3}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    language === 'km'
                      ? 'ឧ. ខ្ញុំបានបង់ប្រាក់តាម ABA រួចហើយសម្រាប់កញ្ចប់ VIP 30 ថ្ងៃ ($2.99) ប៉ុន្តែគណនី VIP មិនទាន់បើកដំណើរការទេ សូម Admin ជួយពិនិត្យវិក្កយបត្រ...'
                      : 'e.g., I already paid via ABA for VIP 30 Days ($2.99) but my VIP access is not active yet. Please verify my attached receipt...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                {language === 'km'
                  ? 'ផ្ញើសារ និងវិក្កយបត្រទៅកាន់ Admin'
                  : 'Submit Support Message & Receipt to Admin'}
              </button>
            </form>
          ) : (
            /* Support History & Conversation Thread */
            <div className="space-y-4">
              {myTickets.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200 p-6">
                  <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">
                    {language === 'km'
                      ? 'មិនទាន់មានសារជំនួយនៅឡើយទេ'
                      : 'No support messages yet'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    {language === 'km'
                      ? 'ប្រសិនបើអ្នកបានបង់ប្រាក់តាម ABA រួចហើយតែមិនទាន់ទទួលបាន VIP សូមផ្ញើសារ និងវិក្កយបត្រមកកាន់ Admin។'
                      : 'If you paid via ABA and need VIP activation, send a message with your receipt.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
                  >
                    {language === 'km'
                      ? '➕ ផ្ញើសារជំនួយថ្មី'
                      : '➕ Create Support Message'}
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
                          <span>({t.paymentPlanLabel.split(' ')[1]}d)</span>
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
                            {activeTicket.paymentPlanLabel} • Ref:{' '}
                            {activeTicket.paymentRef} • {activeTicket.paymentDate}
                          </p>
                        </div>
                        {activeTicket.vipApproved && (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5" />
                            {language === 'km'
                              ? 'VIP ត្រូវបានបើកដំណើរការ'
                              : 'VIP Activated'}
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
                              {language === 'km'
                                ? 'រូបភាពវិក្កយបត្រភ្ជាប់បន្ថែម'
                                : 'Receipt image attached'}
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
                            title={
                              language === 'km'
                                ? 'ភ្ជាប់រូបភាពវិក្កយបត្រ'
                                : 'Attach receipt image'
                            }
                            className="p-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 shrink-0"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={
                              language === 'km'
                                ? 'សរសេរសារឆ្លើយតបទៅកាន់ Admin...'
                                : 'Write a reply to Admin...'
                            }
                            className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSendReply(activeTicket)}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1 shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {language === 'km' ? 'ផ្ញើ' : 'Send'}
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
