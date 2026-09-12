import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { t } = useLanguage();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg shadow-amber-900/20"
    >
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>{t.pwa.offlineBanner}</span>
    </div>
  );
};
