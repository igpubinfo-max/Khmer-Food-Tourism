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
    try {
      // Clear corrupt cache
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-6 font-khmer">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#064E3B]">
              <AlertTriangle className="w-8 h-8 text-[#059669]" />
            </div>

            <div>
              <h2 className="font-moul text-base text-[#064E3B]">
                អាហារ និងទេសចរណ៍ខ្មែរ
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                ប្រព័ន្ធបានជួបប្រទះបញ្ហាក្នុងការផ្ទុកទិន្នន័យបណ្តោះអាសន្ន
              </p>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              សូមចុចប៊ូតុងខាងក្រោមដើម្បីសម្អាត Cache និងបើកដំណើរការកម្មវិធីឡើងវិញដោយសុវត្ថិភាព។
            </p>

            <button
              onClick={this.handleRecover}
              className="w-full py-3.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-emerald-300" />
              <span>សម្អាត Cache និងបើកឡើងវិញ</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
