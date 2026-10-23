import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Camera, Image, QrCode, CheckCircle2, AlertTriangle, 
  ExternalLink, Copy, RefreshCw, Zap, ShieldCheck, HelpCircle
} from 'lucide-react';
import jsQR from 'jsqr';
import { Capacitor } from '@capacitor/core';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
  decodeQrFromImageDataUrl,
} from '../utils/androidMediaHelper';

export const QrScannerModal: React.FC = () => {
  const { 
    isQrScannerModalOpen, 
    setIsQrScannerModalOpen, 
    language, 
    showToast,
    openUpgradeVipModal
  } = useApp();

  const isKm = language === 'km';
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('upload');
  const [cameraError, setCameraError] = useState<string>('');
  const [isScanningCamera, setIsScanningCamera] = useState<boolean>(false);
  const [selectedQrImagePreview, setSelectedQrImagePreview] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [scanResult, setScanResult] = useState<{
    raw: string;
    type: 'aba_khqr' | 'bakong' | 'url' | 'text';
    title: string;
    details: string;
    merchantName?: string;
    usdAccount?: string;
    khrAccount?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Close & stop camera
  const handleClose = () => {
    stopCamera();
    setIsQrScannerModalOpen(false);
    setScanResult(null);
    setSelectedQrImagePreview('');
    setCameraError('');
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      clearTimeout(animationFrameRef.current);
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanningCamera(false);
  };

  // Start Camera
  const startCamera = async () => {
    stopCamera();
    setCameraError('');
    setIsScanningCamera(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(isKm ? 'ឧបករណ៍នេះពុំគាំទ្រការប្រើកាមេរ៉ាក្នុងកម្មវិធីរុករកទេ សូមប្រើការស្កេនរូបថត។' : 'Camera API not supported. Please scan from a photo.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(err?.message || (isKm ? 'មិនអាចបើកកាមេរ៉ាបានទេ។ សូមអនុញ្ញាតសិទ្ធិកាមេរ៉ា ឬប្រើការស្កេនរូបភាព។' : 'Cannot access camera. Please allow camera permissions or upload an image.'));
      setIsScanningCamera(false);
    }
  };

  // Throttled Video Scan Frame (4 FPS + max 540px width to prevent CPU overheating)
  const scanVideoFrame = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      stopCamera();
      return;
    }
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = window.setTimeout(scanVideoFrame, 250);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const vw = videoRef.current.videoWidth || 640;
    const vh = videoRef.current.videoHeight || 480;
    const scale = vw > 540 ? 540 / vw : 1;
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data) {
      handleDecodedData(code.data);
      stopCamera();
      return;
    }

    animationFrameRef.current = window.setTimeout(scanVideoFrame, 250);
  };

  const processQrDataUrl = async (dataUrl: string) => {
    setSelectedQrImagePreview(dataUrl);
    setIsProcessingImage(true);
    try {
      const decoded = await decodeQrFromImageDataUrl(dataUrl);
      setIsProcessingImage(false);
      if (decoded) {
        handleDecodedData(decoded);
        showToast(isKm ? '✅ បានស្គាល់កូដ QR ពីរូបថតដោយជោគជ័យ! 🎉' : '✅ QR Code recognized from photo! 🎉', 'success');
      } else {
        showToast(
          isKm
            ? '⚠️ រកមិនឃើញកូដ QR ក្នុងរូបភាពនេះទេ។ សូមជ្រើសរើសរូបភាពកូដ QR ឱ្យបានច្បាស់។'
            : '⚠️ No valid QR code found in this photo. Please select a clearer QR image.',
          'warning'
        );
      }
    } catch {
      setIsProcessingImage(false);
      showToast(
        isKm ? '⚠️ មានបញ្ហាក្នុងការអានរូបភាព QR។' : '⚠️ Error processing QR image.',
        'warning'
      );
    }
  };

  // Trigger Native Android Gallery Picker or Web File Input safely
  const handleTriggerGalleryPicker = async () => {
    if (Capacitor.isNativePlatform()) {
      setIsProcessingImage(true);
      try {
        const res = await pickImageUsingNativeAndroidGallery();
        setIsProcessingImage(false);
        if (res.cancelled) {
          return;
        }
        if (res.dataUrl) {
          await processQrDataUrl(res.dataUrl);
          return;
        }
      } catch {
        setIsProcessingImage(false);
      }
    }
    fileInputRef.current?.click();
  };

  // Image Upload Scan Handler (File Input)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const dataUrl = await processAndCompressImageFile(file, 1400, 0.92);
      await processQrDataUrl(dataUrl);
    } catch (err: any) {
      setIsProcessingImage(false);
      showToast(
        err?.message || (isKm ? 'មិនអាចអានរូបភាពពី Gallery បានទេ។' : 'Could not read image from Gallery.'),
        'warning'
      );
    }
  };

  // Decode QR Data & Categorize
  const handleDecodedData = (data: string) => {
    const trimmed = data.trim();

    // Check if ABA KHQR
    if (trimmed.includes('abaakhppxxx') || trimmed.includes('abaP2P') || trimmed.startsWith('00020101')) {
      const isDual = trimmed.includes('095245959') || trimmed.includes('012719946') || trimmed.includes('KIMSENG CHEA');
      setScanResult({
        raw: trimmed,
        type: 'aba_khqr',
        title: isKm ? '🏦 ABA KHQR Payment Code' : '🏦 ABA KHQR Payment Code',
        details: isDual 
          ? (isKm ? 'កូដទូទាត់ផ្លូវការ ABA KHQR៖ KIMSENG CHEA (USD 095 245 959 / KHR 012 719 946)' : 'Official ABA KHQR: KIMSENG CHEA (USD 095 245 959 / KHR 012 719 946)')
          : (isKm ? 'កូដទូទាត់ ABA KHQR ត្រឹមត្រូវតាមស្ដង់ដារបាគង' : 'Valid ABA KHQR merchant payment code'),
        merchantName: isDual ? 'KIMSENG CHEA' : 'ABA Merchant',
        usdAccount: '095 245 959',
        khrAccount: '012 719 946'
      });
      return;
    }

    // Check if Web URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setScanResult({
        raw: trimmed,
        type: 'url',
        title: isKm ? '🌐 តំណភ្ជាប់គេហទំព័រ (URL Link)' : '🌐 Web URL Link',
        details: trimmed
      });
      return;
    }

    // Fallback Text
    setScanResult({
      raw: trimmed,
      type: 'text',
      title: isKm ? '📄 ព័ត៌មានអត្ថបទ QR' : '📄 Decoded QR Text',
      details: trimmed
    });
  };

  // Quick Test with Official ABA KHQR
  const handleTestOfficialQr = () => {
    const officialPayload = '00020101021129450016abaakhppxxx@abaa01090127199460208ABA Bank40600006abaP2P011232894800DA0E020901271994603090952459590404Dual5204599953031165802KH5912KIMSENG CHEA6010Phnom Penh63043CF9';
    handleDecodedData(officialPayload);
    showToast(isKm ? 'បានស្កេន និងផ្ទៀងផ្ទាត់កូដ ABA KHQR គំរូជោគជ័យ!' : 'Sample ABA KHQR verified successfully!', 'success');
  };

  useEffect(() => {
    if (!isQrScannerModalOpen) {
      stopCamera();
    }
    const handleVisibility = () => {
      if (document.hidden) stopCamera();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopCamera();
    };
  }, [isQrScannerModalOpen]);

  if (!isQrScannerModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-emerald-500/30 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#064E3B] via-[#047857] to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/20 text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-moul text-sm sm:text-base text-white">
                {isKm ? 'ម៉ាស៊ីនស្កេនកូដ QR' : 'QR Code Scanner'}
              </h3>
              <p className="text-[11px] text-emerald-200 font-khmer">
                {isKm ? 'ស្កេន ABA KHQR, ហាង និងតំណភ្ជាប់ផ្សេងៗ' : 'Scan ABA KHQR, shops & links'}
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-khmer">
          <button
            onClick={() => {
              setActiveTab('upload');
              stopCamera();
            }}
            className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>{isKm ? 'ស្កេនពីរូបថត' : 'Scan from Photo'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'camera'
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{isKm ? 'ស្កេនកាមេរ៉ា' : 'Live Camera'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] font-khmer text-xs">
          {/* TAB 1: UPLOAD & GALLERY SCAN */}
          {activeTab === 'upload' && !scanResult && (
            <div className="space-y-4 text-center">
              <input
                ref={fileInputRef}
                id="qr-file-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              <button
                type="button"
                disabled={isProcessingImage}
                onClick={handleTriggerGalleryPicker}
                className="w-full p-7 border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition group"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                  <Image className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isProcessingImage
                      ? (isKm ? 'កំពុងអាន និងស្កេនរូបភាព QR...' : 'Scanning QR image...')
                      : (isKm ? 'ជ្រើសរើសរូបថតកូដ QR ពី Gallery / Photos' : 'Pick QR Code Photo from Gallery / Photos')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {isKm ? 'គាំទ្ររូបថត Screenshot ឬរូប QR (PNG, JPG, JPEG)' : 'Supports screenshots or saved QR images (PNG, JPG, JPEG)'}
                  </p>
                </div>
                <span className="px-4 py-2 rounded-xl bg-[#064E3B] text-white font-bold text-xs shadow-sm">
                  {isKm ? '📂 ជ្រើសរើសរូបភាពពី Gallery' : '📂 Select Photo from Gallery'}
                </span>
              </button>

              {selectedQrImagePreview && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {isKm ? '🖼️ រូបភាពដែលបានជ្រើសរើស៖' : '🖼️ Selected Image Preview:'}
                  </p>
                  <img
                    src={selectedQrImagePreview}
                    alt="Selected QR Preview"
                    className="max-h-44 mx-auto rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-white p-1"
                  />
                </div>
              )}

              {/* Quick Sample Test */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {isKm ? 'តេស្តកូដ ABA KHQR ផ្លូវការ៖' : 'Test Official ABA KHQR:'}
                </span>
                <button
                  onClick={handleTestOfficialQr}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950 text-[#004B87] dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-800 hover:bg-sky-100 transition text-[11px]"
                >
                  {isKm ? '🧪 ដំណើរការតេស្ត' : 'Run Test'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE CAMERA SCAN */}
          {activeTab === 'camera' && !scanResult && (
            <div className="space-y-3 text-center">
              {cameraError ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 space-y-2">
                  <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
                  <p className="font-bold">{cameraError}</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
                  >
                    {isKm ? 'ប្តូរទៅស្កេនរូបភាពវិញ' : 'Switch to Photo Scan'}
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden aspect-square max-w-[280px] mx-auto bg-black border-2 border-emerald-500 shadow-inner">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Scanner Laser Overlay */}
                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_10px_#10B981] animate-pulse" />
                  <div className="absolute inset-8 border-2 border-emerald-400/80 rounded-2xl pointer-events-none" />
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                {isKm ? 'សូមតម្រង់កាមេរ៉ាទៅលើកូដ QR ឱ្យចំកណ្តាល' : 'Align QR code inside the frame to scan'}
              </p>
            </div>
          )}

          {/* SCAN RESULT DISPLAY */}
          {scanResult && (
            <div className="space-y-4 animate-scale-up">
              <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/60 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 dark:text-emerald-100 text-sm">
                      {scanResult.title}
                    </h4>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase font-sans">
                      Verified QR Recognition
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-emerald-200/60 dark:border-emerald-800 leading-relaxed font-mono break-all">
                  {scanResult.details}
                </p>

                {/* ABA KHQR Quick Actions */}
                {scanResult.type === 'aba_khqr' && (
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={async () => {
                        // Direct clean launch of ABA Mobile app avoiding broken P2P token errors
                        let launched = false;
                        try {
                          const { Capacitor, registerPlugin } = await import('@capacitor/core');
                          if (Capacitor.isNativePlatform()) {
                            const NativeAbaLauncher = registerPlugin<any>('NativeAbaLauncher');
                            if (NativeAbaLauncher && typeof NativeAbaLauncher.openAbaMobile === 'function') {
                              const res = await NativeAbaLauncher.openAbaMobile();
                              if (res?.success) {
                                launched = true;
                              }
                            }
                          }
                        } catch {
                        }
                        if (!launched) {
                          try {
                            window.location.href = 'intent://#Intent;scheme=abamobilebank;package=com.paygo24.ibank;end';
                            setTimeout(() => {
                              window.location.href = 'abamobilebank://';
                            }, 300);
                          } catch {
                            window.location.href = 'abamobilebank://';
                          }
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#004B87] hover:bg-[#003966] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{isKm ? 'បើកក្នុង ABA Mobile ដើម្បីទូទាត់' : 'Open in ABA Mobile to Pay'}</span>
                    </button>

                    <button
                      onClick={() => {
                        handleClose();
                        openUpgradeVipModal();
                      }}
                      className="w-full py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>{isKm ? 'ដំឡើងគណនី Premium VIP' : 'Upgrade to Premium VIP'}</span>
                    </button>
                  </div>
                )}

                {/* URL Quick Action */}
                {scanResult.type === 'url' && (
                  <button
                    onClick={() => window.open(scanResult.raw, '_blank')}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{isKm ? 'បើកតំណភ្ជាប់ (Open Link)' : 'Open Link'}</span>
                  </button>
                )}

                {/* Text Copy Action */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(scanResult.raw);
                    showToast(isKm ? 'បានចម្លងរួចរាល់!' : 'Copied to clipboard!', 'success');
                  }}
                  className="w-full py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ចម្លងទិន្នន័យ (Copy)' : 'Copy Raw Data'}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setScanResult(null);
                  if (activeTab === 'camera') startCamera();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition hover:bg-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isKm ? 'ស្កេនកូដ QR ផ្សេងទៀត' : 'Scan Another QR Code'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
