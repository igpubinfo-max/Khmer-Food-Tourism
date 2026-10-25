import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRecover = () => {
    // Recover safely without clearing localStorage or user data
    this.setState({ hasError: false, error: undefined });
    try {
      window.location.reload();
    } catch (e) {
      console.warn('Reload warning:', e);
    }
  };

  public render() {
    if (this.state.hasError) {
      let lang = 'km';
      try {
        lang = localStorage.getItem('kft_user_language_pref_v1') || 'km';
      } catch {}
      const isEn = lang === 'en';
      const isZh = lang === 'zh';

      return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-6 font-khmer">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#064E3B]">
              <AlertTriangle className="w-8 h-8 text-[#059669]" />
            </div>

            <div>
              <h2 className="font-moul text-base text-[#064E3B]">
                {isEn ? 'Khmer Food & Tourism' : isZh ? '高棉美食与旅游' : 'អាហារ និងទេសចរណ៍ខ្មែរ'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isEn
                  ? 'A temporary display issue occurred'
                  : isZh
                  ? '界面加载出现临时问题'
                  : 'ប្រព័ន្ធបានជួបប្រទះបញ្ហាបណ្តោះអាសន្នក្នុងការបង្ហាញផ្ទាំងនេះ'}
              </p>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {isEn
                ? 'Tap the button below to reload safely. Your account and saved data remain completely intact.'
                : isZh
                ? '请点击下方按钮安全重新加载，您的账户和收藏数据完好无损。'
                : 'សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើកដំណើរការកម្មវិធីឡើងវិញដោយសុវត្ថិភាព (ទិន្នន័យ និងគណនីរបស់អ្នកត្រូវបានរក្សាទុកទាំងស្រុង)។'}
            </p>

            {this.state.error && (
              <div className="text-[10px] text-rose-600 font-mono text-left break-all bg-rose-50/80 p-2.5 rounded-xl border border-rose-200/80">
                ⚠️ Error: {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleRecover}
              className="w-full py-3.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-emerald-300" />
              <span>
                {isEn ? 'Reload App Safely' : isZh ? '安全重新加载' : 'បើកដំណើរការឡើងវិញដោយសុវត្ថិភាព'}
              </span>
            </button>

            <div className="pt-2 text-center text-[10px] text-slate-500 font-khmer">
              <span>{isEn ? 'Support: ' : isZh ? '技术支持：' : 'មតិកែលម្អ / ជំនួយបច្ចេកទេស៖ '}</span>
              <a href="mailto:kftcam@gmail.com" className="font-mono text-[#064E3B] underline font-bold">
                kftcam@gmail.com
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
