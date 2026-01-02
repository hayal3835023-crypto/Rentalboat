import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 30 seconds or on second visit
      const visitCount = parseInt(localStorage.getItem('visitCount') || '0') + 1;
      localStorage.setItem('visitCount', visitCount.toString());
      
      if (visitCount >= 2 || !localStorage.getItem('pwaPromptDismissed')) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS prompt on second visit
    if (isIOSDevice) {
      const visitCount = parseInt(localStorage.getItem('visitCount') || '0') + 1;
      localStorage.setItem('visitCount', visitCount.toString());
      
      if (visitCount >= 2 && !localStorage.getItem('pwaPromptDismissed')) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', 'true');
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full"
        >
          <X size={18} className="text-slate-400" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 512 512" className="w-8 h-8">
              <g transform="translate(256, 256)">
                <path d="M0,-140 L0,-100 M-60,-100 L60,-100 M0,-100 L0,100 M-80,60 Q0,140 80,60" 
                      stroke="white" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="0" cy="-140" r="30" fill="white"/>
              </g>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 mb-1">Installer l'application</h3>
            <p className="text-sm text-slate-500 mb-3">
              Accédez rapidement à BoatRental depuis votre écran d'accueil
            </p>

            {isIOS ? (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <p className="flex items-center gap-2 mb-1">
                  <Share size={16} /> Appuyez sur <strong>Partager</strong>
                </p>
                <p>Puis <strong>"Sur l'écran d'accueil"</strong></p>
              </div>
            ) : (
              <Button 
                onClick={handleInstall}
                className="w-full rounded-full bg-teal-600 hover:bg-teal-700"
                data-testid="pwa-install-btn"
              >
                <Download size={18} className="mr-2" />
                Installer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
