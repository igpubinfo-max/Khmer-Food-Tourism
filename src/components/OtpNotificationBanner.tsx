import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Copy, Check, X, BellRing } from 'lucide-react';
import { IncomingOtpEventDetail } from '../services/otpService';

export const OtpNotificationBanner: React.FC = () => {
  const [notification, setNotification] = useState<IncomingOtpEventDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleIncomingOtp = (e: Event) => {
      const customEvent = e as CustomEvent<IncomingOtpEventDetail>;
      if (customEvent.detail) {
        setNotification(customEvent.detail);
        setVisible(true);
        setCopied(false);
      }
    };

    window.addEventListener('kft:incoming_otp', handleIncomingOtp);
    return () => {
      window.removeEventListener('kft:incoming_otp', handleIncomingOtp);
    };
  }, []);

  // Auto-dismiss after 20 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, 20000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || !notification) return null;

  const isPhone = notification.type === 'phone';

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(notification.code);
      setCopied(true);
      // Broadcast event so AuthModal can fill if user chooses
      window.dispatchEvent(new CustomEvent('kft:paste_otp', { detail: { code: notification.code } }));
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-sm animate-in slide-in-from-top-6 duration-300">
      <div className="p-3.5 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md ring-2 ring-emerald-500/20 font-khmer">
        {/* Banner Top Header */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isPhone ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'} shadow-xs`}>
              {isPhone ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
            </div>
            <div className="flex items-center gap-1.5 font-bold tracking-tight">
              <span className="text-slate-200">
                {isPhone ? 'សារ SMS (Messages)' : 'Gmail'}
              </span>
              <span className="text-[10px] text-slate-400 font-normal font-mono">
                {isPhone ? '• KFT-Verify' : '• kftcam@gmail.com'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <BellRing className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
              <span>ឥឡូវនេះ</span>
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="បិទ (Dismiss)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message Content */}
        <div className="pt-2.5 pb-2 space-y-1.5">
          <div className="text-[11px] text-slate-300 leading-snug">
            {isPhone ? (
              <span>
                [Khmer Food & Tourism] លេខកូដផ្ទៀងផ្ទាត់ OTP របស់អ្នកគឺ៖
              </span>
            ) : (
              <span>
                សួស្តី <strong className="text-white">{notification.name}</strong>, លេខកូដផ្ទៀងផ្ទាត់គណនីរបស់អ្នកគឺ៖
              </span>
            )}
          </div>

          {/* Large Code Badge */}
          <div className="flex items-center justify-between gap-3 bg-slate-800/90 px-3 py-2 rounded-xl border border-emerald-500/30">
            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-[0.25em]">
              {notification.code}
            </span>
            <button
              onClick={handleCopyCode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-white" />
                  <span>បានចម្លង ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>ចម្លងលេខកូដ</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 leading-tight">
            {isPhone 
              ? '✓ សារ SMS ត្រូវបានបញ្ជូនទៅលេខរបស់អ្នក។ មានសុពលភាព ១០ នាទី។' 
              : '✓ អ៊ីមែលផ្ទៀងផ្ទាត់ត្រូវបានបញ្ជូនទៅប្រអប់សំបុត្រ។ មានសុពលភាព ១០ នាទី។'}
          </p>
        </div>
      </div>
    </div>
  );
};
