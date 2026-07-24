import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Check, Share } from "lucide-react";

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is running in standalone mode (already installed PWA)
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isInStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Capture PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalledSuccess(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(!showIosGuide);
    }
  };

  // Do not render if standalone or dismissed or no prompt available (unless iOS where user can manually add)
  if (isStandalone || dismissed || (!deferredPrompt && !isIos)) {
    if (installedSuccess) {
      return (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <Check className="w-5 h-5" />
          <span className="text-xs font-bold">Vidcourse PWA installed successfully!</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 sm:px-6 z-40 transition-all shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Vidcourse App Icon"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover border border-slate-700 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-tight text-white font-sans">
                Install Vidcourse App
              </span>
              <span className="bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Offline video catalog, faster loading & full-screen learning experience.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleInstallClick}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            {isIos ? (
              <>
                <Share className="w-3.5 h-3.5" />
                <span>Add to Home Screen</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </>
            )}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Instructions Dropdown */}
      {showIosGuide && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-xs text-slate-300 flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <Smartphone className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>
            To install on iOS: Tap the <strong className="text-white">Share</strong> button in Safari, then select <strong className="text-white">"Add to Home Screen"</strong>.
          </span>
        </div>
      )}
    </div>
  );
};
