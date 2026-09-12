import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { useLanguage } from '../i18n/LanguageContext';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t } = useLanguage();

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        id="btn-pwa-install"
        className="flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t.pwa.installBtn}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          id="btn-pwa-ios-guide"
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-teal-600" />
          <span>{t.pwa.installIOS}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">{t.pwa.installIOS}</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                {t.pwa.iosInstructions}
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition"
              >
                {t.pwa.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
