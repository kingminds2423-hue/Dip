import React, { useState } from 'react';
import {
  Menu,
  Share2,
  QrCode,
  Download,
  Database,
  Building2,
  Shield,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Smartphone,
  LogOut,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
  MessageCircle
} from 'lucide-react';
import { UserSession, WhatsAppGroupConfig } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { normalizeWhatsAppGroupLink } from '../utils/appUrls';
import type { OfflineSyncState } from '../services/offlineSync';

interface QuickCommandBarProps {
  currentUser: UserSession;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSidebarMenu?: () => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAppLinks: () => void;
  onOpenDownloadLinks: () => void;
  onOpenWhatsAppGroups?: () => void;
  pendingJoinRequestsCount?: number;
  whatsappGroupConfig?: WhatsAppGroupConfig;
  offlineSyncState?: OfflineSyncState;
  onManualSync?: () => void;
  onOpenStaffQr: () => void;
  onOpenMonthlyPdf: () => void;
  onOpenSecurityDashboard: () => void;
  onOpenBackup: () => void;
  onOpenCompanySetup: () => void;
  onLogout: () => void;
}

export const QuickCommandBar: React.FC<QuickCommandBarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenSidebarMenu,
  isFullScreen,
  onToggleFullScreen,
  isDarkMode,
  onToggleDarkMode,
  onOpenAppLinks,
  onOpenDownloadLinks,
  onOpenWhatsAppGroups,
  pendingJoinRequestsCount = 0,
  whatsappGroupConfig,
  offlineSyncState,
  onManualSync,
  onOpenStaffQr,
  onOpenMonthlyPdf,
  onOpenSecurityDashboard,
  onOpenBackup,
  onOpenCompanySetup,
  onLogout,
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const { updateAvailable, currentVersion, openUpdateModal } = useAppUpdate();
  const [installDoneToast, setInstallDoneToast] = useState(false);

  const isStaffRole = currentUser.role === 'staff';
  const isPartnerRole = currentUser.role === 'partner';
  const isRestrictedRole = isStaffRole || isPartnerRole;
  const isAdminOnly = currentUser.role === 'director' || currentUser.role === 'admin';

  const directGroupUrl = normalizeWhatsAppGroupLink(
    isPartnerRole
      ? whatsappGroupConfig?.partnerGroupInviteLink || whatsappGroupConfig?.groupInviteLink
      : isStaffRole
      ? whatsappGroupConfig?.staffGroupInviteLink || whatsappGroupConfig?.groupInviteLink
      : ''
  );

  const handleInstallAppClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallDoneToast(true);
        setTimeout(() => setInstallDoneToast(false), 3000);
        return;
      }
    }
    openUpdateModal();
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#042f22] via-[#063829] to-[#042a38] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-emerald-700/70 dark:border-slate-800 px-2.5 sm:px-4 py-1.5 shadow-md select-none print:hidden">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2">
        {/* ALWAYS-PINNED LEFT MENU BUTTON RIGHT BELOW DIGITAL DISPLAY */}
        {onOpenSidebarMenu && (
          <button
            type="button"
            onClick={onOpenSidebarMenu}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 shadow-md shadow-emerald-950/50 border border-white/60 transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            title="সব অপশন ও মেন্যু খুলুন (সবসময় ডিজিটাল ডিসপ্লের নিচে)"
          >
            <span className="w-5 h-5 rounded-md bg-slate-950/15 flex items-center justify-center shrink-0">
              <Menu className="w-3.5 h-3.5 stroke-[2.6] text-slate-950" />
            </span>
            <span>মেন্যু</span>
          </button>
        )}

        <div className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. Install App & Auto-Update (App Control: Admin Only) */}
          {isAdminOnly && (
            <>
              <button
                type="button"
                onClick={handleInstallAppClick}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-950/90 hover:bg-emerald-900 text-emerald-50 border border-emerald-500/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="মোবাইল বা কম্পিউটারে আসল অ্যাপ হিসেবে ইনস্টল করুন"
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                  {isInstalled || installDoneToast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                  ) : (
                    <Smartphone className="w-3.5 h-3.5 text-slate-950" />
                  )}
                </span>
                <span>{isInstalled || installDoneToast ? 'অ্যাপ ইনস্টলড' : 'অ্যাপ ইনস্টল'}</span>
              </button>

              <button
                type="button"
                onClick={openUpdateModal}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  updateAvailable
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-200 animate-pulse'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-amber-100 border-amber-500/40'
                }`}
                title="অটো-আপডেট ও ইনস্টল সিস্টেম দেখুন"
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                  {updateAvailable ? (
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
                  )}
                </span>
                <span>{updateAvailable ? 'নতুন আপডেট!' : `আপডেট v${currentVersion}`}</span>
              </button>
            </>
          )}

          {/* Offline / Auto-Online Sync Status Pill */}
          {offlineSyncState && (
            <button
              type="button"
              onClick={() => onManualSync && onManualSync()}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !offlineSyncState.isOnline
                  ? 'bg-amber-500 text-slate-950 border-amber-200 animate-pulse'
                  : offlineSyncState.isSyncing
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                  : offlineSyncState.pendingCount > 0
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-slate-900/80 text-cyan-100 border-cyan-500/40'
              }`}
              title="অফলাইন ও অনলাইন অটো-সিঙ্ক স্ট্যাটাস (ক্লিক করে সিঙ্ক করুন)"
            >
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center shrink-0">
                {!offlineSyncState.isOnline ? (
                  <WifiOff className="w-3.5 h-3.5 text-slate-950" />
                ) : offlineSyncState.isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-slate-950" />
                )}
              </span>
              <span>
                {!offlineSyncState.isOnline
                  ? `অফলাইন${offlineSyncState.pendingCount > 0 ? ` (${offlineSyncState.pendingCount})` : ''}`
                  : offlineSyncState.isSyncing
                  ? 'সিঙ্ক হচ্ছে...'
                  : offlineSyncState.pendingCount > 0
                  ? `সিঙ্ক বাকি (${offlineSyncState.pendingCount})`
                  : 'অনলাইন সিঙ্ক'}
              </span>
            </button>
          )}

          {/* Partner direct WhatsApp Group Join Button (Staff excluded from extra app controls) */}
          {isPartnerRole && directGroupUrl && (
            <a
              href={directGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-[#25D366] hover:bg-[#20ba59] text-slate-950 transition-colors whitespace-nowrap shrink-0"
              title="WhatsApp গ্রুপে জয়েন করুন"
            >
              <span className="w-5 h-5 rounded-lg bg-slate-950/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-slate-950" />
              </span>
              <span>WhatsApp গ্রুপ</span>
            </a>
          )}

          {/* STRICT ADMIN ONLY: App Download, WhatsApp Groups, App Links, Staff QR */}
          {isAdminOnly && (
            <>
              <button
                type="button"
                onClick={onOpenDownloadLinks}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-teal-100 border border-teal-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="অ্যাপ্লিকেশন ডাউনলোড লিঙ্ক ও ইনস্টল লিঙ্ক দেখুন"
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5 text-slate-950" />
                </span>
                <span>ডাউনলোড লিঙ্ক</span>
              </button>

              {onOpenWhatsAppGroups && (
                <button
                  type="button"
                  onClick={onOpenWhatsAppGroups}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-[#128C7E]/40 hover:bg-[#128C7E]/70 text-white border border-[#25D366]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="WhatsApp গ্রুপ লিংক ও স্টাফ/পার্টনার ইনভাইট সিস্টেম"
                >
                  <span className="w-5 h-5 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0">
                    <MessageCircle className="w-3.5 h-3.5 text-slate-950" />
                  </span>
                  <span>WhatsApp গ্রুপ</span>
                  {pendingJoinRequestsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px]">
                      {pendingJoinRequestsCount}
                    </span>
                  )}
                </button>
              )}
            </>
          )}

          {/* 3. Google Play Store Page (Hidden for Staff) */}
          {!isStaffRole && (
            <button
              type="button"
              onClick={() => setActiveTab('playstore')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'playstore'
                  ? 'bg-white text-slate-900 border-white shadow-sm'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-emerald-100 border-emerald-500/40'
              }`}
              title="Google Play Store স্টাইল অ্যাপ পেজ"
            >
              <span className="w-5 h-5 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-2xs">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M4 3.5V20.5L16.5 12L4 3.5Z" fill="#00C1A4" />
                  <path d="M4 3.5L13.5 12.8L16.5 12L4 3.5Z" fill="#00A0FF" />
                  <path d="M16.5 12L13.5 11.2L4 20.5L16.5 12Z" fill="#FF3333" />
                  <path d="M16.5 12L13.5 11.2L13.5 12.8L16.5 12Z" fill="#FFBA00" />
                </svg>
              </span>
              <span>Play Store</span>
            </button>
          )}

          {isAdminOnly && (
            <>
              <button
                type="button"
                onClick={onOpenAppLinks}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-sky-100 border border-sky-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="অ্যাডমিন, ম্যানেজার ও স্টাফ পোর্টাল লিঙ্ক শেয়ার"
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shrink-0">
                  <Share2 className="w-3 h-3 text-white" />
                </span>
                <span>অ্যাপ লিঙ্ক</span>
              </button>

              <button
                type="button"
                onClick={onOpenStaffQr}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-indigo-100 border border-indigo-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="স্টাফ QR কোড ও আইডি কার্ড"
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                  <QrCode className="w-3.5 h-3.5 text-white" />
                </span>
                <span>স্টাফ QR</span>
              </button>
            </>
          )}

          {/* Fullscreen & Dark Mode (Hidden for Staff) */}
          {!isStaffRole && (
            <>
              <button
                type="button"
                onClick={onToggleFullScreen}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-emerald-100 border border-emerald-600/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title={isFullScreen ? 'উপরের প্যাড হেডার দেখান' : 'উপরের প্যাড হেডার লুকান'}
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shrink-0">
                  {isFullScreen ? (
                    <Maximize2 className="w-3 h-3 text-slate-950" />
                  ) : (
                    <Minimize2 className="w-3 h-3 text-slate-950" />
                  )}
                </span>
                <span>{isFullScreen ? 'হেডার দেখান' : 'ফুল স্ক্রিন'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-amber-100 border border-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title={isDarkMode ? 'লাইট মোড' : 'ডার্ক মোড'}
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center shrink-0">
                  {isDarkMode ? (
                    <Sun className="w-3.5 h-3.5 text-slate-950" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-slate-950" />
                  )}
                </span>
                <span>{isDarkMode ? 'লাইট' : 'ডার্ক'}</span>
              </button>
            </>
          )}

          {!isRestrictedRole && (
            <button
              type="button"
              onClick={onOpenMonthlyPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-orange-100 border border-orange-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="AI রিপোর্ট ও PDF প্রিন্ট স্টুডিও"
            >
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shrink-0">
                <ExternalLink className="w-3 h-3 text-white" />
              </span>
              <span>AI রিপোর্ট PDF</span>
            </button>
          )}

          {/* STRICT ADMIN ONLY: Security, Backup, Company Setup */}
          {isAdminOnly && (
            <>
              <button
                type="button"
                onClick={onOpenSecurityDashboard}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-violet-100 border border-violet-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="অ্যাডমিন সিকিউরিটি ড্যাশবোর্ড ও অডিট লগ"
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0">
                  <Shield className="w-3 h-3 text-white" />
                </span>
                <span>সিকিউরিটি</span>
              </button>

              <button
                type="button"
                onClick={onOpenBackup}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-blue-100 border border-blue-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="ক্লাউড ব্যাকআপ ও রিস্টোর"
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0">
                  <Database className="w-3 h-3 text-white" />
                </span>
                <span>ব্যাকআপ</span>
              </button>

              <button
                type="button"
                onClick={onOpenCompanySetup}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-emerald-100 border border-emerald-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="কোম্পানি ও প্যাড সেটআপ পরিবর্তন"
              >
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-3 h-3 text-white" />
                </span>
                <span>কোম্পানি</span>
              </button>
            </>
          )}

          {/* Switch Account / Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-950/90 hover:bg-rose-900 text-rose-100 border border-rose-600/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="ব্যবহারকারী পরিবর্তন বা লগআউট"
          >
            <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0">
              <LogOut className="w-3 h-3 text-white" />
            </span>
            <span>{currentUser.name.split(' ')[0]} · বদলান</span>
          </button>
        </div>
      </div>
    </div>
  );
};
