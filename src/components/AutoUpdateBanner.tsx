import React from 'react';
import { Sparkles, RefreshCw, X, Info } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { toBengaliNumber } from '../utils/formatters';

export const AutoUpdateBanner: React.FC = () => {
  const {
    updateAvailable,
    versionInfo,
    isUpdating,
    updateProgress,
    updateStageLabel,
    autoCountdown,
    cancelAutoCountdown,
    applyUpdate,
    dismissUpdate,
    openUpdateModal,
  } = useAppUpdate();

  if (!updateAvailable && !isUpdating) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-xl animate-in slide-in-from-top-4 duration-300 print:hidden">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border-2 border-emerald-400 shadow-2xl shadow-emerald-950/60 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-white">
                  অ্যাপে নতুন আপডেট এসেছে!
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black font-mono">
                  v{versionInfo?.version || '2.6.0'}
                </span>
                {autoCountdown !== null && !isUpdating && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold">
                    {toBengaliNumber(autoCountdown)} সেকেন্ডে অটো আপডেট...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5 truncate">
                {isUpdating
                  ? updateStageLabel
                  : versionInfo?.releaseNotes?.[0] ||
                    'AI Studio থেকে নতুন আপডেট যুক্ত হয়েছে — ইনস্টল করা অ্যাপে চালু করতে আপডেট করুন।'}
              </p>
            </div>
          </div>

          {!isUpdating && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={openUpdateModal}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 font-bold text-xs transition-colors cursor-pointer"
                title="আপডেটের বিস্তারিত দেখুন"
              >
                <Info className="w-3.5 h-3.5" />
                <span>বিস্তারিত</span>
              </button>
              <button
                onClick={applyUpdate}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/40 transition-transform cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>আপডেট করুন</span>
              </button>
              <button
                onClick={() => {
                  cancelAutoCountdown();
                  dismissUpdate();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="পরে আপডেট করব"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Live Progress Bar during update */}
        {isUpdating && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
              <span>Google Play স্টাইল অটো-আপডেট চলছে...</span>
              <span className="font-mono">{toBengaliNumber(updateProgress)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-300 ease-out"
                style={{ width: `${updateProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
