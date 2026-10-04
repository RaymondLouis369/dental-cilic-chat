import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { safeStorage } from '../lib/storage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in App Component Tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  private handleClearDataAndReload = () => {
    try {
      safeStorage.removeItem('dental_saas_session');
      safeStorage.removeItem('dental_saas_patient_session');
      safeStorage.removeItem('dental_portal_mode');
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected runtime exception occurred.';
      const stackTrace = this.state.errorInfo?.componentStack || this.state.error?.stack || '';

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans antialiased text-slate-100 dir-rtl" dir="rtl">
          <div className="max-w-xl w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md p-6 sm:p-8 space-y-6">
            {/* Header Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white leading-tight">
                    حدث خطأ غير متوقع في المنظومة
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    خطأ برمجي
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  System Exception Detected — Dental Center Management System
                </p>
              </div>
            </div>

            {/* User Friendly Message */}
            <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-slate-200">
                عذراً، حدث خطأ أثناء تشغيل الواجهة. تم احتواء الخطأ لمنع توقف الخدمة.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                An unexpected error occurred in the component tree. The error boundary successfully caught the exception.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة (Try Again)</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearDataAndReload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs border border-slate-600 transition"
              >
                <Home className="w-4 h-4" />
                <span>تحديث الجلسة وتفريغ المؤقت</span>
              </button>
            </div>

            {/* Collapsible Technical Details */}
            <div className="pt-2 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-slate-200 py-1 transition"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-teal-400" />
                  <span>تفاصيل الخلل البرمجي للمطورين (Technical Diagnostics)</span>
                </span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3.5 rounded-xl bg-black/60 border border-slate-800 font-mono text-[11px] text-rose-300 space-y-2 overflow-x-auto max-h-60" dir="ltr">
                  <div>
                    <span className="text-slate-500 font-bold">Error: </span>
                    <span>{errorMessage}</span>
                  </div>
                  {stackTrace && (
                    <div>
                      <span className="text-slate-500 font-bold">Component Stack:</span>
                      <pre className="text-[10px] text-slate-400 whitespace-pre-wrap mt-1">
                        {stackTrace}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
