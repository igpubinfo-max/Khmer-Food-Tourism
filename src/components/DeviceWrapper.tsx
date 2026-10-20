import React, { useState } from 'react';
import { Smartphone, Monitor, QrCode, Wifi, Download, Check, Sparkles } from 'lucide-react';

interface DeviceWrapperProps {
  children: React.ReactNode;
}

export const DeviceWrapper: React.FC<DeviceWrapperProps> = ({ children }) => {
  const [isMobileFrame, setIsMobileFrame] = useState(true);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  // Local IP address detected earlier from network: 192.168.88.28
  const localUrl = `http://192.168.88.28:5173`;

  const copyUrl = () => {
    navigator.clipboard.writeText(localUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center">
      {/* Top Testing Control Toolbar */}
      <div className="w-full bg-stone-950/90 border-b border-stone-800 px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-amber-400">Khmer Food & Tourism</span>
          <span className="hidden sm:inline text-stone-500">|</span>
          <span className="hidden sm:inline text-stone-400 text-[11px]">Android & iOS Hybrid Mobile App</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile on device QR / Network pill */}
          <button
            onClick={() => setShowNetworkInfo(!showNetworkInfo)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
            title="តេស្តលើទូរស័ព្ទដៃផ្ទាល់ (Test on physical phone)"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium hidden sm:inline">Phone Test</span>
          </button>

          {/* Toggle Mobile Frame / Responsive */}
          <div className="flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700">
            <button
              onClick={() => setIsMobileFrame(true)}
              className={`p-1.5 rounded-md transition ${
                isMobileFrame ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-400 hover:text-white'
              }`}
              title="Mobile Device Mockup View"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMobileFrame(false)}
              className={`p-1.5 rounded-md transition ${
                !isMobileFrame ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-400 hover:text-white'
              }`}
              title="Full Window View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Network Modal Drawer */}
      {showNetworkInfo && (
        <div className="w-full max-w-md bg-stone-900 border-b border-stone-800 p-4 animate-in slide-in-from-top-2 text-xs text-stone-300 space-y-2">
          <div className="flex items-center justify-between font-bold text-amber-300">
            <span className="flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              តេស្តលើទូរស័ព្ទដៃ Android ផ្ទាល់ (Live Phone Testing)
            </span>
            <button onClick={() => setShowNetworkInfo(false)} className="text-stone-400 hover:text-white">✕</button>
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            លោកអ្នកអាចបើកកម្មវិធីរុករក (Chrome / Safari) លើទូរស័ព្ទដៃរបស់អ្នកដែលភ្ជាប់ Wi-Fi ដូចគ្នា រួចវាយអាសយដ្ឋានខាងក្រោម ឬចុច Add to Home Screen ដើម្បីដំឡើងជា App៖
          </p>
          <div className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800">
            <code className="text-emerald-400 font-mono text-xs">{localUrl}</code>
            <button
              onClick={copyUrl}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : null}
              {copied ? 'បានចម្លង!' : 'Copy URL'}
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className={`w-full flex-1 flex items-center justify-center ${isMobileFrame ? 'py-4 sm:py-8' : ''}`}>
        {isMobileFrame ? (
          /* Android / iPhone Modern Phone Mockup Frame */
          <div className="relative w-full max-w-[410px] h-[860px] max-h-[92vh] bg-black rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_0_12px_#292524,0_0_0_14px_#44403c] border-4 border-stone-800 flex flex-col overflow-hidden">
            {/* Phone Speaker & Camera Punch-hole */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full bg-stone-900 border border-stone-800" />
                <div className="w-10 h-1 bg-stone-900 rounded-full" />
              </div>
            </div>

            {/* Simulated Phone Screen */}
            <div className="w-full h-full rounded-[38px] overflow-hidden bg-amber-950/5 flex flex-col relative no-scrollbar">
              {children}
            </div>

            {/* Simulated Bottom Home Indicator Pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-stone-400/60 rounded-full pointer-events-none z-50" />
          </div>
        ) : (
          /* Full Screen Responsive View */
          <div className="w-full min-h-screen bg-amber-950/5 flex flex-col">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
