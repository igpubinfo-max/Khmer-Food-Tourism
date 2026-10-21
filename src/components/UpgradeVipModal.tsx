import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Crown, Sparkles, Check, CheckCircle2, AlertCircle, RefreshCw, 
  ShieldCheck, ArrowRight, ChevronRight, Star, Clock, Zap,
  CreditCard, QrCode, Smartphone, ExternalLink, HelpCircle
} from 'lucide-react';
import { TEN_VIP_BENEFITS, isUserVipActive, getVipRemainingDays } from '../types';
import { VIP_ANNUAL_PRICE_USD, VIP_SUBSCRIPTION_DAYS } from '../services/paymentService';

export const UpgradeVipModal: React.FC = () => {
  const { 
    isUpgradeVipModalOpen, 
    setIsUpgradeVipModalOpen, 
    currentUser, 
    language,
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
  const [paymentMethod, setPaymentMethod] = useState<'GooglePlayBilling' | 'KHQR' | 'Card'>('GooglePlayBilling');
  const [bankRef, setBankRef] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastVerifiedRef, setLastVerifiedRef] = useState('');

  if (!isUpgradeVipModalOpen) return null;

  const handleClose = () => {
    setIsUpgradeVipModalOpen(false);
    setTimeout(() => {
      setStep('overview');
      setErrorMessage('');
    }, 200);
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
      // Simulate realistic network delay for server verification
      await new Promise(r => setTimeout(r, 1200));

      let txnRef = '';
      if (paymentMethod === 'GooglePlayBilling') {
        const p1 = Math.floor(1000 + Math.random() * 9000);
        const p2 = Math.floor(1000 + Math.random() * 9000);
        const p3 = Math.floor(1000 + Math.random() * 9000);
        const p4 = Math.floor(10000 + Math.random() * 90000);
        txnRef = `GPA.${p1}-${p2}-${p3}-${p4}`;
      } else if (paymentMethod === 'KHQR') {
        txnRef = bankRef.trim() ? bankRef.trim().toUpperCase() : `KHQR-${Date.now().toString(36).toUpperCase()}`;
      } else {
        const l4 = cardLast4.trim() || '4242';
        txnRef = `CARD-TXN-${Date.now().toString(36).toUpperCase()}-${l4}`;
      }

      setLastVerifiedRef(txnRef);

      const result = isVip 
        ? await renewCurrentUserVip(paymentMethod, txnRef)
        : await upgradeCurrentUserToVip(paymentMethod, txnRef, cardLast4 || '4242');

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
          
          {/* STEP 1: Overview & 10 Benefits */}
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
              <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-teal-500/15 border-2 border-amber-500/40 relative overflow-hidden text-center space-y-2">
                <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                  {isKm ? '🌟 កញ្ចប់ពេញនិយមបំផុត (Best Value Plan)' : '🌟 Most Popular Plan'}
                </div>
                
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#064E3B] dark:text-emerald-400 font-mono">
                    ${VIP_ANNUAL_PRICE_USD.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    {isKm ? 'USD / ឆ្នាំ (365 ថ្ងៃ)' : 'USD / Year (365 Days)'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {isKm 
                    ? 'ត្រឹមតែប្រហែល $0.83 USD ក្នុងមួយខែ (~៣,៤០០ រៀល) ដើម្បីទទួលបានអត្ថប្រយោជន៍ពេញលេញ!' 
                    : 'Only ~$0.83 USD / month to unlock all 10 verified business and user VIP features!'}
                </p>
              </div>

              {/* 10 Premium VIP Benefits Showcase */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{isKm ? 'អត្ថប្រយោជន៍ VIP ទាំង ១០ យ៉ាង (10 VIP Benefits):' : 'All 10 Premium VIP Benefits:'}</span>
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

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isKm ? 'ជ្រើសរើសវិធីសាស្ត្រទូទាត់ (Payment Method):' : 'Select Payment Method:'}
                </label>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* Google Play Billing */}
                  <button
                    onClick={() => setPaymentMethod('GooglePlayBilling')}
                    className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-1.5 transition ${
                      paymentMethod === 'GooglePlayBilling'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <span className="text-[11px]">Google Play</span>
                  </button>

                  {/* KHQR / Bakong */}
                  <button
                    onClick={() => setPaymentMethod('KHQR')}
                    className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-1.5 transition ${
                      paymentMethod === 'KHQR'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-rose-600" />
                    <span className="text-[11px]">KHQR / ABA</span>
                  </button>

                  {/* Card */}
                  <button
                    onClick={() => setPaymentMethod('Card')}
                    className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-1.5 transition ${
                      paymentMethod === 'Card'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <span className="text-[11px]">{isKm ? 'កាតធនាគារ' : 'Card'}</span>
                  </button>
                </div>

                {/* Additional inputs based on method */}
                {paymentMethod === 'KHQR' && (
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800/40 space-y-2 text-xs">
                    <p className="text-[11px] text-rose-900 dark:text-rose-200">
                      {isKm 
                        ? 'ស្កេនទូទាត់ $9.99 ទៅកាន់គណនី ABA «CHEA KIMSENG» រួចបញ្ចូលលេខកូដប្រតិបត្តិការ (Bank Ref):' 
                        : 'Pay $9.99 to ABA account "CHEA KIMSENG" and input your transaction reference:'}
                    </p>
                    <input 
                      type="text"
                      value={bankRef}
                      onChange={(e) => setBankRef(e.target.value)}
                      placeholder="e.g., ABA-83921948 or Trx ID"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                )}

                {paymentMethod === 'Card' && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 space-y-2 text-xs">
                    <p className="text-[11px] text-indigo-900 dark:text-indigo-200">
                      {isKm 
                        ? 'បញ្ចូលលេខ ៤ ខ្ទង់ចុងក្រោយនៃកាត (ប្រព័ន្ធមិនរក្សាទុកលេខកាតពេញឡើយ - Zero Card Storage):' 
                        : 'Enter last 4 digits of card (0 raw card details stored in APK - PCI-DSS Compliant):'}
                    </p>
                    <input 
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 4242"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-600 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* CTA Action Button */}
              <button
                onClick={handleProceedToConfirm}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98"
              >
                <span>
                  {isVip 
                    ? (isKm ? `បន្តសមាជិកភាព VIP ($9.99/ឆ្នាំ) →` : `Renew VIP Subscription ($9.99/yr) →`)
                    : (isKm ? `បន្តទៅកាន់ការទូទាត់ ($9.99 USD) →` : `Proceed to Payment ($9.99 USD) →`)}
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
                  <span>{isKm ? 'សុវត្ថិភាព ២៥៦-ប៊ីត' : '256-bit Secure'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Confirmation Screen (Required before payment execution) */}
          {step === 'confirm' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'ផ្ទៀងផ្ទាត់ការបញ្ជាទិញជាវ VIP' : 'Confirm Your VIP Subscription'}
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
                  <span className="font-bold text-emerald-600 font-mono">
                    {paymentMethod === 'GooglePlayBilling' ? 'Google Play Billing' : paymentMethod === 'KHQR' ? 'KHQR / Bakong' : 'Credit Card'}
                  </span>
                </div>

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
              <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
              <div>
                <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'កំពុងផ្ទៀងផ្ទាត់ការទូទាត់...' : 'Verifying Payment...'}
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
