import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppReleaseInfo, UserSession } from '../types';
import { subscribeAppRelease, publishAppRelease, addAuditLog } from '../services/dataService';

export interface VersionInfo {
  version: string;
  buildId: string;
  buildTime: string;
  releaseNotes: string[];
  publishedBy?: string;
}

interface AppUpdateContextValue {
  currentVersion: string;
  currentBuildId: string;
  currentBuildTime: string;
  updateAvailable: boolean;
  updateSource: 'service_worker' | 'version_json' | 'firestore' | null;
  versionInfo: VersionInfo | null;
  isUpdating: boolean;
  updateProgress: number;
  updateStageLabel: string;
  isChecking: boolean;
  checkStatusMessage: string | null;
  lastCheckedAt: string | null;
  autoUpdateEnabled: boolean;
  setAutoUpdateEnabled: (enabled: boolean) => void;
  autoCountdown: number | null;
  cancelAutoCountdown: () => void;
  isUpdateModalOpen: boolean;
  openUpdateModal: () => void;
  closeUpdateModal: () => void;
  applyUpdate: () => void;
  dismissUpdate: () => void;
  triggerManualCheck: () => Promise<boolean>;
  isPushingRelease: boolean;
  pushLiveUpdateToDevices: (customNote?: string) => Promise<boolean>;
}

const LOCAL_APPLIED_BUILD_KEY = 'dip_bhola_applied_build_id';
const LOCAL_AUTO_UPDATE_KEY = 'dip_bhola_auto_update_enabled';

const RUNNING_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.6.0';
const RUNNING_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : '2.6.0-base';
const RUNNING_BUILD_TIME =
  typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '2026-11-12T19:45:00.000Z';

const DEFAULT_NOTES = [
  'দৈনিক খরচ ও জমা, মাসিক জমা-খরচ এবং সর্বমোট ক্যাশ হিসাবের ৩টি পৃথক ড্যাশবোর্ড সেকশন',
  'নির্দিষ্ট তারিখ সার্চ করে যেকোনো পুরোনো দিনের হিসাব বের করার উন্নত অনুসন্ধান বার',
  'Google Play Store স্টাইলের স্বয়ংক্রিয় অটো-আপডেট ও রিয়েল-টাইম AI Studio সিঙ্ক সিস্টেম',
  'অফিশিয়াল প্যাড হেডার, নোটিফিকেশন সেন্টার ও ফিক্সড কুইক কমান্ড বার'
];

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export const AppUpdateProvider: React.FC<{
  children: React.ReactNode;
  currentUser?: UserSession | null;
}> = ({ children, currentUser }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateSource, setUpdateSource] = useState<'service_worker' | 'version_json' | 'firestore' | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: RUNNING_VERSION,
    buildId: RUNNING_BUILD_ID,
    buildTime: RUNNING_BUILD_TIME,
    releaseNotes: DEFAULT_NOTES,
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStageLabel, setUpdateStageLabel] = useState('অপেক্ষমাণ...');
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatusMessage, setCheckStatusMessage] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isPushingRelease, setIsPushingRelease] = useState(false);
  const [dismissedBuildId, setDismissedBuildId] = useState<string | null>(null);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);

  const [autoUpdateEnabled, setAutoUpdateEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_AUTO_UPDATE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const autoSyncTriggeredRef = useRef(false);

  const setAutoUpdateEnabled = useCallback((enabled: boolean) => {
    setAutoUpdateEnabledState(enabled);
    try {
      localStorage.setItem(LOCAL_AUTO_UPDATE_KEY, String(enabled));
    } catch {
      // ignore
    }
    if (!enabled) {
      setAutoCountdown(null);
    }
  }, []);

  const cancelAutoCountdown = useCallback(() => {
    setAutoCountdown(null);
  }, []);

  const getAppliedBuildId = () => {
    try {
      return localStorage.getItem(LOCAL_APPLIED_BUILD_KEY);
    } catch {
      return null;
    }
  };

  // Mark current running build as applied on load
  useEffect(() => {
    try {
      // Clear any previous reload-guard if build changed
      const applied = localStorage.getItem(LOCAL_APPLIED_BUILD_KEY);
      if (applied === RUNNING_BUILD_ID) {
        // already recorded
      }
    } catch {
      // ignore
    }
  }, []);

  const checkVersionJson = useCallback(
    async (manual = false): Promise<boolean> => {
      if (manual) {
        setIsChecking(true);
        setCheckStatusMessage(null);
      }

      try {
        // Also ask Service Worker to check for byte updates on /sw.js
        if (swRegRef.current) {
          await swRegRef.current.update().catch(() => {});
        } else if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            swRegRef.current = reg;
            await reg.update().catch(() => {});
            if (reg.waiting) {
              setWaitingWorker(reg.waiting);
              setUpdateAvailable(true);
              setUpdateSource('service_worker');
            }
          }
        }

        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        setLastCheckedAt(new Date().toLocaleTimeString('bn-BD'));

        if (res.ok) {
          const data: VersionInfo = await res.json();
          const incomingBuildId = data.buildId || data.version;

          if (
            incomingBuildId &&
            incomingBuildId !== RUNNING_BUILD_ID &&
            incomingBuildId !== '2.6.0-base' &&
            incomingBuildId !== getAppliedBuildId() &&
            incomingBuildId !== dismissedBuildId
          ) {
            setVersionInfo(data);
            setUpdateAvailable(true);
            setUpdateSource('version_json');
            if (manual) {
              setCheckStatusMessage(`নতুন আপডেট পাওয়া গেছে! (ভার্সন ${data.version})`);
            }
            return true;
          } else {
            if (manual) {
              setCheckStatusMessage(
                `আপনার অ্যাপটি সম্পূর্ণ আপ-টু-ডেট (সর্বশেষ সংস্করণ v${RUNNING_VERSION} চলছে)।`
              );
            }
            return false;
          }
        }
      } catch {
        if (manual) {
          setCheckStatusMessage('সার্ভারের সাথে সংযোগ করতে সমস্যা হয়েছে। ইন্টারনেট পরীক্ষা করুন।');
        }
      } finally {
        if (manual) setIsChecking(false);
      }

      return false;
    },
    [dismissedBuildId]
  );

  // Service Worker lifecycle listeners + periodic version polling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let refreshing = false;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        swRegRef.current = reg;

        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
          setUpdateSource('service_worker');
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
              setUpdateSource('service_worker');
            }
          });
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Initial check + periodic polling every 30s + window focus/online
    const initialTimer = setTimeout(() => {
      checkVersionJson(false);
    }, 3000);

    const interval = setInterval(() => {
      checkVersionJson(false);
    }, 30 * 1000);

    const onFocus = () => {
      checkVersionJson(false);
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [checkVersionJson]);

  // Real-time Firestore App Release listener (Instant push from AI Studio to all installed apps)
  useEffect(() => {
    const unsub = subscribeAppRelease((remoteRelease: AppReleaseInfo | null) => {
      if (!remoteRelease) {
        // First initialization: seed current build quietly if director opens published app
        if (
          !autoSyncTriggeredRef.current &&
          (currentUser?.role === 'director' || currentUser?.role === 'admin')
        ) {
          autoSyncTriggeredRef.current = true;
          publishAppRelease({
            version: RUNNING_VERSION,
            buildId: RUNNING_BUILD_ID,
            buildTime: RUNNING_BUILD_TIME,
            releaseNotes: DEFAULT_NOTES,
            publishedBy: currentUser.name,
            forceAutoUpdate: false,
          }).catch(() => {});
        }
        return;
      }

      const remoteTime = Date.parse(remoteRelease.buildTime || '') || 0;
      const runningTime = Date.parse(RUNNING_BUILD_TIME) || 0;
      const isPublishedOrigin =
        typeof window !== 'undefined' && window.location.origin.includes('ais-pre-');

      // If THIS running app was just republished on AI Studio with a strictly newer build time,
      // auto-broadcast the new release to Firestore so already-installed phones detect it immediately!
      if (
        !autoSyncTriggeredRef.current &&
        isPublishedOrigin &&
        runningTime > remoteTime + 5000 &&
        (currentUser?.role === 'director' || currentUser?.role === 'admin')
      ) {
        autoSyncTriggeredRef.current = true;
        publishAppRelease({
          version: RUNNING_VERSION,
          buildId: RUNNING_BUILD_ID,
          buildTime: RUNNING_BUILD_TIME,
          releaseNotes: DEFAULT_NOTES,
          publishedBy: currentUser.name,
          forceAutoUpdate: true,
        }).catch(() => {});
        return;
      }

      // Check if remote Firestore release is newer or explicitly pushed after our running build
      const isNewerRemoteBuild =
        remoteRelease.buildId &&
        remoteRelease.buildId !== RUNNING_BUILD_ID &&
        remoteRelease.buildId !== getAppliedBuildId() &&
        remoteRelease.buildId !== dismissedBuildId &&
        (remoteTime > runningTime + 2000 || remoteRelease.forceAutoUpdate === true);

      if (isNewerRemoteBuild) {
        setVersionInfo({
          version: remoteRelease.version || RUNNING_VERSION,
          buildId: remoteRelease.buildId,
          buildTime: remoteRelease.buildTime,
          releaseNotes:
            remoteRelease.releaseNotes && remoteRelease.releaseNotes.length > 0
              ? remoteRelease.releaseNotes
              : DEFAULT_NOTES,
          publishedBy: remoteRelease.publishedBy,
        });
        setUpdateAvailable(true);
        setUpdateSource('firestore');
      }
    });

    return () => unsub();
  }, [currentUser?.role, currentUser?.name, dismissedBuildId]);

  const applyUpdate = useCallback(() => {
    setAutoCountdown(null);
    setIsUpdating(true);
    setUpdateProgress(18);
    setUpdateStageLabel('নতুন আপডেট ফাইল ডাউনলোড হচ্ছে...');

    const t1 = setTimeout(() => {
      setUpdateProgress(52);
      setUpdateStageLabel('পুরোনো ক্যাশ ও সার্ভিস ওয়ার্কার পরিষ্কার হচ্ছে...');
    }, 380);

    const t2 = setTimeout(() => {
      setUpdateProgress(85);
      setUpdateStageLabel('Google Play স্টাইল ইনস্টলেশন সম্পন্ন হচ্ছে...');
    }, 800);

    const t3 = setTimeout(() => {
      setUpdateProgress(100);
      setUpdateStageLabel('নতুন সংস্করণ চালু হচ্ছে...');
    }, 1150);

    const t4 = setTimeout(async () => {
      try {
        if (versionInfo?.buildId) {
          localStorage.setItem(LOCAL_APPLIED_BUILD_KEY, versionInfo.buildId);
        }
      } catch {
        // ignore
      }

      try {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        }
      } catch {
        // ignore
      }

      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        // Safety fallback reload in case controllerchange doesn't fire within 1.5s
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Bust browser HTML cache cleanly while keeping current path & query params
        const url = new URL(window.location.href);
        url.searchParams.set('_updated', Date.now().toString());
        window.location.replace(url.toString());
      }
    }, 1450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [waitingWorker, versionInfo]);

  // Automatic 6-second Google Play countdown when autoUpdateEnabled is ON
  useEffect(() => {
    if (!updateAvailable || !autoUpdateEnabled || isUpdating) {
      return;
    }

    // Only auto-countdown if running as installed standalone app OR update came from live SW/Firestore push
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

    if (!isStandalone && updateSource !== 'firestore' && updateSource !== 'service_worker') {
      return;
    }

    setAutoCountdown(6);
    const interval = setInterval(() => {
      setAutoCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          applyUpdate();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [updateAvailable, autoUpdateEnabled, isUpdating, updateSource, applyUpdate]);

  const dismissUpdate = useCallback(() => {
    setAutoCountdown(null);
    setUpdateAvailable(false);
    if (versionInfo?.buildId) {
      setDismissedBuildId(versionInfo.buildId);
    }
  }, [versionInfo]);

  const triggerManualCheck = useCallback(async () => {
    return checkVersionJson(true);
  }, [checkVersionJson]);

  const pushLiveUpdateToDevices = useCallback(
    async (customNote?: string): Promise<boolean> => {
      setIsPushingRelease(true);
      try {
        const pushBuildId = `${RUNNING_BUILD_ID}-push-${Date.now()}`;
        const notes = customNote?.trim()
          ? [customNote.trim(), ...DEFAULT_NOTES.slice(0, 3)]
          : DEFAULT_NOTES;

        // Record push build locally first so this pushing device itself doesn't prompt itself unnecessarily
        try {
          localStorage.setItem(LOCAL_APPLIED_BUILD_KEY, pushBuildId);
        } catch {
          // ignore
        }

        await publishAppRelease({
          version: RUNNING_VERSION,
          buildId: pushBuildId,
          buildTime: new Date().toISOString(),
          releaseNotes: notes,
          publishedBy: currentUser?.name || 'জাহিদুল ইসলাম (পরিচালক)',
          forceAutoUpdate: true,
        });

        if (currentUser) {
          await addAuditLog({
            action: 'app_release_push',
            actionBengali: 'অ্যাপ অটো-আপডেট পুশ',
            performedBy: currentUser.name,
            performedById: currentUser.id,
            role: currentUser.role,
            details: `সকল ইনস্টল করা ডিভাইসে নতুন আপডেট (v${RUNNING_VERSION}) পাঠানো হয়েছে।`,
          });
        }

        setCheckStatusMessage('সকল ইনস্টল করা অ্যাপে নতুন আপডেট নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!');
        return true;
      } catch (err) {
        console.warn('Push update error:', err);
        setCheckStatusMessage('আপডেট পুশ করতে সমস্যা হয়েছে।');
        return false;
      } finally {
        setIsPushingRelease(false);
      }
    },
    [currentUser]
  );

  return (
    <AppUpdateContext.Provider
      value={{
        currentVersion: RUNNING_VERSION,
        currentBuildId: RUNNING_BUILD_ID,
        currentBuildTime: RUNNING_BUILD_TIME,
        updateAvailable,
        updateSource,
        versionInfo,
        isUpdating,
        updateProgress,
        updateStageLabel,
        isChecking,
        checkStatusMessage,
        lastCheckedAt,
        autoUpdateEnabled,
        setAutoUpdateEnabled,
        autoCountdown,
        cancelAutoCountdown,
        isUpdateModalOpen,
        openUpdateModal: () => setIsUpdateModalOpen(true),
        closeUpdateModal: () => setIsUpdateModalOpen(false),
        applyUpdate,
        dismissUpdate,
        triggerManualCheck,
        isPushingRelease,
        pushLiveUpdateToDevices,
      }}
    >
      {children}
    </AppUpdateContext.Provider>
  );
};

export function useAppUpdate(): AppUpdateContextValue {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) {
    throw new Error('useAppUpdate must be used within AppUpdateProvider');
  }
  return ctx;
}
