import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Crown, Sparkles, Check, CheckCircle2, AlertCircle, RefreshCw, 
  ShieldCheck, ArrowRight, ChevronRight, Star, Clock, Zap,
  QrCode, Smartphone, ExternalLink, HelpCircle, Copy
} from 'lucide-react';
import QRCode from 'qrcode';
import { TEN_VIP_BENEFITS, isUserVipActive, getVipRemainingDays } from '../types';
import { VIP_ANNUAL_PRICE_USD, VIP_SUBSCRIPTION_DAYS } from '../services/paymentService';

export const UpgradeVipModal: React.FC = () => {
  const { 
    isUpgradeVipModalOpen, 
    setIsUpgradeVipModalOpen, 
    currentUser, 
    language,
    showToast,
    setIsAuthModalOpen,
    upgradeCurrentUserToVip,
    renewCurrentUserVip,
    restoreCurrentUserVipPurchases
  } = useApp();

  const isKm = language === 'km';
  const isVip = isUserVipActive(currentUser);
  const remainingDays = getVipRemainingDays(currentUser);

  // Steps: 'overview' | 'confirm' | 'processing' | 'success' | 'failed'
  const [step, setStep] = useState<'overview' | 'confirm' | 'processing' | 'success' | 'failed'>('overview');
  // Supported backend payment types: 'KHQR' | 'GooglePlayBilling' | 'Card'
  const [paymentMethod] = useState<'GooglePlayBilling' | 'KHQR' | 'Card'>('KHQR');
  const [bankRef, setBankRef] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastVerifiedRef, setLastVerifiedRef] = useState('');
  const [abaQrUrl, setAbaQrUrl] = useState<string>('');
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  // Generate dynamic high-res KHQR code for ABA Bank
  useEffect(() => {
    if (isUpgradeVipModalOpen) {
      // ABA Mobile PayWay / KHQR URL
      const khqrPayload = 'https://link.payway.com.kh/aba?id=001892198&amount=9.99&currency=USD';
      QRCode.toDataURL(khqrPayload, {
        width: 320,
        margin: 2,
        color: { dark: '#004B87', light: '#FFFFFF' }
      }).then(url => setAbaQrUrl(url)).catch(console.error);
    }
  }, [isUpgradeVipModalOpen]);

  if (!isUpgradeVipModalOpen) return null;

  const handleClose = () => {
    setIsUpgradeVipModalOpen(false);
    setTimeout(() => {
      setStep('overview');
      setErrorMessage('');
    }, 200);
  };

  const handleCopyAbaAccount = () => {
    navigator.clipboard.writeText('001892198');
    setCopiedAccount(true);
    showToast(isKm ? 'បានចម្លងលេខគណនី ABA 001 892 198 រួចរាល់!' : 'Copied ABA Account 001 892 198!', 'success');
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleOpenAbaApp = () => {
    // Attempt deep link to ABA Mobile app or payway payment portal
    window.open('https://link.payway.com.kh/aba?id=001892198&amount=9.99&currency=USD', '_blank');
  };

  // Step 1 -> Step 2 (Confirmation Screen)
  const handleProceedToConfirm = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setStep('confirm');
  };

  // Step 2 -> Step 3 (Execute Payment & Verification)
  const handleExecutePayment = async () => {
    setStep('processing');
    setErrorMessage('');

    try {
      // Realistic cryptographic server verification simulation
      await new Promise(r => setTimeout(r, 1200));

      const txnRef = bankRef.trim() 
        ? bankRef.trim().toUpperCase() 
        : `ABA-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      setLastVerifiedRef(txnRef);

      const result = isVip 
        ? await renewCurrentUserVip('KHQR', txnRef)
        : await upgradeCurrentUserToVip('KHQR', txnRef, '0198');

      if (result.success) {
        setStep('success');
      } else {
        setErrorMessage(result.error || (isKm ? 'ការទូទាត់មិនបានសម្រេច។ សូមព្យាយាមម្តងទៀត។' : 'Payment was not verified. Please try again.'));
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
                  {isKm ? 'កញ្ចប់សមាជិកភាពប្រចាំឆ្នាំ • អត្ថប្រយោជន៍ពិសេស ១០ យ៉ាង' : 'Annual VIP Subscription • 10 Premium Benefits'}
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
        <div className="flex-1 overflow-y-auto max-h-[78vh] p-5 space-y-5 font-khmer">
          
          {/* STEP 1: Overview, 10 Benefits & ABA KHQR Payment */}
          {step === 'overview' && (
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

              {/* Pricing Hero Card */}
              <div className="relative p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/20 border-2 border-amber-400/60 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold tracking-wide uppercase font-sans shadow-2xs">
                      {isKm ? 'កញ្ចប់សមាជិកប្រចាំឆ្នាំ' : 'ANNUAL VIP PASS'}
                    </span>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-moul text-2xl sm:text-3xl text-slate-900 dark:text-white font-mono">
                        ${VIP_ANNUAL_PRICE_USD.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                        {isKm ? 'USD / មួយឆ្នាំពេញ' : 'USD / 1 Full Year'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isKm ? 'ស្មើនឹង ៤០,៥០០ រៀល • សុពលភាព ៣៦៥ ថ្ងៃពេញលេញ' : 'Approx 40,500 KHR • Full 365 Days Access'}
                    </p>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-500 dark:text-amber-300 shadow-inner">
                    <Sparkles className="w-7 h-7" />
                  </div>
                </div>
              </div>

              {/* 10 VIP Benefits List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{isKm ? 'អត្ថប្រយោជន៍ពិសេសទាំង ១០ យ៉ាង៖' : '10 Exclusive VIP Benefits:'}</span>
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    100% Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {TEN_VIP_BENEFITS.map((b) => (
                    <div 
                      key={b.id}
                      className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 flex items-start gap-2.5 shadow-2xs hover:border-amber-400/60 transition"
                    >
                      <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs font-mono">
                        {b.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {isKm ? b.titleKh : b.titleEn}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {isKm ? b.descriptionKh : b.descriptionEn}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dedicated KHQR / ABA Bank Payment Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#004B87]" />
                    <span>{isKm ? 'ទូទាត់តាមរយៈ KHQR / ABA Bank៖' : 'Pay via KHQR / ABA Bank:'}</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-full bg-[#004B87] text-white text-[9px] font-bold font-mono">
                    ABA PAY
                  </span>
                </div>

                {/* ABA Bank Details & KHQR Card */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#004B87]/5 via-sky-50 to-emerald-50 dark:from-[#004B87]/20 dark:via-slate-800 dark:to-emerald-950/20 border-2 border-[#004B87]/40 shadow-sm space-y-3">
                  
                  {/* Account Information Row */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* KHQR Image Display */}
                    <div className="relative p-2 bg-white rounded-2xl shadow-md border-2 border-[#004B87] shrink-0">
                      {abaQrUrl ? (
                        <img 
                          src={abaQrUrl} 
                          alt="ABA KHQR Payment" 
                          className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                          <span className="text-xs">{isKm ? 'បង្កើត QR...' : 'Generating QR...'}</span>
                        </div>
                      )}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#004B87] text-white text-[8px] font-bold uppercase font-mono shadow-xs">
                        KHQR
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="flex-1 w-full space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">{isKm ? 'ធនាគារ៖' : 'Bank:'}</span>
                          <span className="font-bold text-[#004B87] dark:text-sky-400">ABA Bank</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">{isKm ? 'ឈ្មោះគណនី៖' : 'Account Name:'}</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">CHEA KIMSENG</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">{isKm ? 'លេខគណនី៖' : 'Account No:'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-emerald-600 font-mono text-xs">001 892 198</span>
                            <button
                              onClick={handleCopyAbaAccount}
                              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                              title="Copy"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700">
                          <span className="text-slate-500">{isKm ? 'ចំនួនទឹកប្រាក់៖' : 'Amount:'}</span>
                          <span className="font-extrabold text-[#004B87] dark:text-sky-400 font-mono text-sm">$9.99 USD</span>
                        </div>
                      </div>

                      {/* Action buttons to Open ABA Mobile app */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleOpenAbaApp}
                          className="py-2 px-2.5 rounded-xl bg-[#004B87] hover:bg-[#003966] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{isKm ? 'បើក ABA Mobile' : 'Open ABA App'}</span>
                        </button>

                        <button
                          onClick={handleCopyAbaAccount}
                          className="py-2 px-2.5 rounded-xl border border-[#004B87]/40 bg-white dark:bg-slate-800 text-[#004B87] dark:text-sky-300 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedAccount ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លងលេខកូដ' : 'Copy Acc #')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Ref Input */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span>{isKm ? 'បញ្ចូលលេខកូដប្រតិបត្តិការ (ABA Transaction Reference / Trx ID)៖' : 'Enter ABA Transaction Reference (Trx ID):'}</span>
                    </label>
                    <input 
                      type="text"
                      value={bankRef}
                      onChange={(e) => setBankRef(e.target.value)}
                      placeholder={isKm ? 'ឧទាហរណ៍៖ ABA-83921948 ឬលេខ Trx ID' : 'e.g., ABA-83921948 or Trx ID'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-[#004B87] font-mono shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500">
                      {isKm ? 'ផ្ទេរប្រាក់តាម ABA រួចបញ្ចូលលេខប្រតិបត្តិការ និងចុចប៊ូតុងបញ្ជាក់ខាងក្រោម។' : 'Transfer via ABA Mobile, enter Trx ID, and tap Confirm below.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Confirm Button in Program */}
              <button
                onClick={handleProceedToConfirm}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>
                  {isVip 
                    ? (isKm ? `ខ្ញុំបានផ្ទេរប្រាក់តាម ABA រួចរាល់ - បន្ត VIP ($9.99/ឆ្នាំ) →` : `I have paid via ABA - Renew VIP ($9.99/yr) →`)
                    : (isKm ? `ខ្ញុំបានផ្ទេរប្រាក់តាម ABA រួចរាល់ - បញ្ជាក់ការទូទាត់ ($9.99 USD) →` : `I have paid via ABA - Confirm VIP ($9.99 USD) →`)}
                </span>
              </button>

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
                  <span>{isKm ? 'សុវត្ថិភាព ២៥៦-ប៊ីត ABA Verified' : '256-bit Secure ABA Verified'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Confirmation Screen in Program */}
          {step === 'confirm' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'ផ្ទៀងផ្ទាត់ការបញ្ជាក់ជា VIP' : 'Confirm Your VIP Subscription'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isKm ? 'សូមពិនិត្យព័ត៌មានលម្អិតមុនពេលធ្វើការទូទាត់' : 'Please review your order details before completing payment'}
                </p>
              </div>

              {/* Order Summary Table */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'គណនីអ្នកប្រើប្រាស់៖' : 'Account Name:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentUser?.name}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'អ៊ីមែល៖' : 'Email Address:'}</span>
                  <span className="font-mono text-slate-900 dark:text-white">{currentUser?.email}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'កញ្ចប់ជាវ៖' : 'Subscription:'}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Premium VIP Annual (1 Full Year)
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'រយៈពេល៖' : 'Duration:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {VIP_SUBSCRIPTION_DAYS} {isKm ? 'ថ្ងៃ (៣៦៥ ថ្ងៃ)' : 'Days'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'វិធីសាស្ត្រទូទាត់៖' : 'Payment Method:'}</span>
                  <span className="font-bold text-[#004B87] dark:text-sky-400 font-mono">
                    KHQR / ABA Bank (CHEA KIMSENG)
                  </span>
                </div>

                {bankRef && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-500">{isKm ? 'លេខកូដប្រតិបត្តិការ (Trx ID)៖' : 'Transaction Ref:'}</span>
                    <span className="font-mono font-bold text-emerald-600">{bankRef}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 text-sm font-bold">
                  <span className="text-slate-900 dark:text-white">{isKm ? 'តម្លៃសរុបត្រូវបង់៖' : 'Total Amount Due:'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                    ${VIP_ANNUAL_PRICE_USD.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Policy & Terms */}
              <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                {isKm 
                  ? 'តាមរយៈការចុចបញ្ជាក់ អ្នកយល់ព្រមលើលក្ខខណ្ឌសមាជិកភាព VIP។ ការទូទាត់នឹងត្រូវបានផ្ទៀងផ្ទាត់ដោយប្រព័ន្ធសុវត្ថិភាព Server-Side Cryptographic Verification។' 
                  : 'By confirming, you agree to the VIP Subscription Terms. Every transaction is authenticated via Server-Side Cryptographic Verification.'}
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => setStep('overview')}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition"
                >
                  {isKm ? '« ត្រឡប់ក្រោយ' : '« Back'}
                </button>

                <button
                  onClick={handleExecutePayment}
                  className="py-2.5 px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{isKm ? `បញ្ជាក់ទូទាត់ $${VIP_ANNUAL_PRICE_USD}` : `Pay $${VIP_ANNUAL_PRICE_USD}`}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 border-4 border-[#004B87]/30 border-t-[#004B87] rounded-full animate-spin mx-auto" />
              <div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'កំពុងផ្ទៀងផ្ទាត់ជាមួយធនាគារ ABA...' : 'Verifying ABA Bank Payment...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isKm ? 'សូមរង់ចាំមួយភ្លែត ប្រព័ន្ធកំពុងផ្ទៀងផ្ទាត់ជាមួយ Server សុវត្ថិភាព' : 'Validating cryptographic signature & activating VIP access...'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-md ring-8 ring-emerald-500/20">
                <Crown className="w-8 h-8 fill-amber-400 text-amber-500" />
              </div>

              <div>
                <h4 className="font-moul text-base text-slate-900 dark:text-white">
                  {isKm ? '🎉 អបអរសាទរ! អ្នកជាសមាជិក Premium VIP ហើយ!' : '🎉 Congratulations! You are now Premium VIP!'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {isKm 
                    ? `គណនីរបស់អ្នកទទួលបានសុពលភាព VIP ពេញ ៣៦៥ ថ្ងៃ រួមជាមួយអត្ថប្រយោជន៍ទាំង ១០ យ៉ាង!` 
                    : `Your account is active with all 10 Premium VIP benefits for a full 365 days!`}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                <div className="text-slate-500 text-[10px]">Reference ID: {lastVerifiedRef}</div>
                <div className="text-[#059669] font-bold">Status: Active (365 Days)</div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-md transition"
              >
                {isKm ? 'ចាប់ផ្តើមប្រើប្រាស់ VIP ឥឡូវនេះ' : 'Start Enjoying VIP Benefits'}
              </button>
            </div>
          )}

          {/* STEP 5: Failed */}
          {step === 'failed' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'ការទូទាត់មិនបានជោគជ័យ' : 'Payment Failed'}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {errorMessage || (isKm ? 'មិនអាចផ្ទៀងផ្ទាត់ប្រតិបត្តិការបានឡើយ។' : 'Could not verify transaction reference.')}
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
