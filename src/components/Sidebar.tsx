import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  UserPlus,
  Coins,
  PieChart,
  Monitor,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  QrCode,
  Download,
  Database,
  Building2,
  LogOut,
  X,
  Sparkles,
  Zap,
  Smartphone,
  UserCheck,
  Moon,
  Sun,
  Share2,
  Shield,
  Wrench,
  MessageCircle
} from 'lucide-react';
import { UserSession } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserSession;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onOpenStaffQr: () => void;
  onOpenMonthlyPdf: () => void;
  onOpenBackup: () => void;
  onOpenCompanySetup: () => void;
  onOpenAddStaff: () => void;
  onOpenAppLinks: () => void;
  onOpenWhatsAppGroups?: () => void;
  pendingJoinRequestsCount?: number;
  onOpenAuditLog: () => void;
  onOpenSecurityDashboard?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  stats?: {
    txCount: number;
    staffCount: number;
    duesCount: number;
    netBalance: number;
    complaintsCount?: number;
    pendingComplaintsCount?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  isFullScreen,
  onToggleFullScreen,
  onOpenStaffQr,
  onOpenMonthlyPdf,
  onOpenBackup,
  onOpenCompanySetup,
  onOpenAddStaff,
  onOpenAppLinks,
  onOpenWhatsAppGroups,
  pendingJoinRequestsCount = 0,
  onOpenAuditLog,
  onOpenSecurityDashboard,
  isDarkMode,
  onToggleDarkMode,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  stats
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();

  const isStaffRole = currentUser.role === 'staff';
  const isPartnerRole = currentUser.role === 'partner';
  const isDirectorRole = currentUser.role === 'director' || currentUser.role === 'admin';

  // Each option has its own distinct digital app logo gradient, icon, Bengali title, and subtitle
  const allNavBars = [
    {
      id: 'dashboard',
      label: 'ডৈনিক ড্যাশবোর্ড',
      subtitle: 'লাইভ হিসাব ও সংক্ষিপ্ত চিত্র',
      icon: LayoutDashboard,
      badge: 'লাইভ',
      badgeColor: 'bg-emerald-400 text-slate-950',
      logoBg: 'from-emerald-400 via-teal-500 to-green-600',
      activeGradient: 'from-emerald-600 via-teal-600 to-emerald-800 border-emerald-300 shadow-emerald-950/60',
      hideForStaff: true,
      hideForPartner: true
    },
    {
      id: 'transactions',
      label: isStaffRole ? 'জমা ও খরচ এন্ট্রি' : 'দৈনিক হিসাব খাতা',
      subtitle: 'আয় (জমা), ব্যয় (খরচ) ও তালিকা',
      icon: Receipt,
      badge: !isStaffRole && stats?.txCount !== undefined ? `${stats.txCount}টি` : isStaffRole ? 'জমা/খরচ' : undefined,
      badgeColor: 'bg-cyan-400 text-slate-950',
      logoBg: 'from-cyan-400 via-sky-500 to-blue-600',
      activeGradient: 'from-cyan-600 via-sky-700 to-blue-800 border-cyan-300 shadow-cyan-950/60',
      hideForPartner: true
    },
    {
      id: 'complaints',
      label: 'গ্রাহক অভিযোগ কেন্দ্র',
      subtitle: 'লাইন সমস্যা ও WhatsApp SMS',
      icon: Wrench,
      badge:
        stats?.pendingComplaintsCount !== undefined && stats.pendingComplaintsCount > 0
          ? `${stats.pendingComplaintsCount} বাকি`
          : stats?.complaintsCount !== undefined && stats.complaintsCount > 0
          ? `${stats.complaintsCount}টি`
          : undefined,
      badgeColor: 'bg-rose-500 text-white font-bold',
      logoBg: 'from-rose-400 via-red-500 to-orange-600',
      activeGradient: 'from-rose-600 via-red-700 to-orange-800 border-rose-300 shadow-rose-950/60',
      hideForStaff: true,
      hideForPartner: true
    },
    {
      id: 'staff',
      label: 'স্টাফ তালিকা ও বেতন',
      subtitle: 'কর্মী ব্যবস্থাপনা ও জয়েনিং',
      icon: Users,
      badge: stats?.staffCount !== undefined ? `${stats.staffCount}জন` : undefined,
      badgeColor: 'bg-indigo-300 text-slate-950',
      logoBg: 'from-blue-400 via-indigo-500 to-violet-600',
      activeGradient: 'from-blue-600 via-indigo-700 to-violet-800 border-indigo-300 shadow-indigo-950/60',
      hideForStaff: true,
      hideForPartner: true
    },
    {
      id: 'quick_add_staff',
      label: 'নতুন স্টাফ নিয়োগ',
      subtitle: '১-ক্লিক নিয়োগ ও সিভি ফরম',
      icon: UserPlus,
      isAction: true,
      action: onOpenAddStaff,
      badge: '+ ফরম',
      badgeColor: 'bg-teal-300 text-slate-950 font-black',
      logoBg: 'from-teal-400 via-emerald-500 to-cyan-600',
      hideForStaff: true,
      hideForPartner: true
    },
    {
      id: 'dues',
      label: 'বাকি খাতা (লেজার)',
      subtitle: 'গ্রাহক বকেয়া ও বিল আদায়',
      icon: Coins,
      badge: stats?.duesCount !== undefined && stats.duesCount > 0 ? `${stats.duesCount} বাকি` : undefined,
      badgeColor: 'bg-amber-400 text-slate-950 font-bold',
      logoBg: 'from-amber-400 via-orange-500 to-yellow-600',
      activeGradient: 'from-amber-600 via-orange-700 to-red-800 border-amber-300 shadow-amber-950/60',
      hideForStaff: true,
      hideForPartner: true
    },
    {
      id: 'partners',
      label: isPartnerRole ? 'আমার শেয়ার পোর্টাল' : 'অংশীদার ও মূলধন',
      subtitle: 'বিনিয়োগ ও লাভ-লোকসান বণ্টন',
      icon: PieChart,
      badge: isPartnerRole ? 'শেয়ার' : undefined,
      badgeColor: 'bg-fuchsia-300 text-slate-950 font-bold',
      logoBg: 'from-purple-400 via-fuchsia-500 to-pink-600',
      activeGradient: 'from-purple-600 via-fuchsia-700 to-pink-800 border-purple-300 shadow-purple-950/60',
      directorOrPartnerOnly: true
    },
    {
      id: 'officers',
      label: 'ম্যানেজার ও অডিটর',
      subtitle: 'দায়িত্বপ্রাপ্ত কর্মকর্তা ও সিল',
      icon: UserCheck,
      badge: 'কর্মকর্তা',
      badgeColor: 'bg-yellow-300 text-slate-950 font-bold',
      logoBg: 'from-yellow-400 via-amber-500 to-orange-600',
      activeGradient: 'from-amber-700 via-yellow-700 to-orange-800 border-yellow-300 shadow-amber-950/60',
      hideForStaff: true,
      hideForPartner: true
    },
    {
      id: 'display',
      label: 'ডিজিটাল ডিসপ্লে বোর্ড',
      subtitle: isDirectorRole ? 'LED নোটিশ ও লাইভ স্ক্রিন' : 'লাইভ LED ডিসপ্লে (শুধু দেখুন)',
      icon: Monitor,
      badge: 'LED',
      badgeColor: 'bg-lime-400 text-slate-950 font-mono',
      logoBg: 'from-lime-400 via-green-500 to-emerald-600',
      activeGradient: 'from-lime-700 via-emerald-700 to-green-900 border-lime-300 shadow-emerald-950/60',
      hideForPartner: true
    },
    {
      id: 'reports',
      label: 'AI রিপোর্ট ও প্রিন্ট স্টুডিও',
      subtitle: 'A4/Legal/Custom PDF ও সিল-স্বাক্ষর',
      icon: FileSpreadsheet,
      badge: 'AI+PDF',
      badgeColor: 'bg-sky-300 text-slate-950 font-black',
      logoBg: 'from-sky-400 via-blue-500 to-indigo-600',
      activeGradient: 'from-sky-600 via-blue-700 to-indigo-800 border-sky-300 shadow-sky-950/60',
      hideForStaff: true,
      hideForPartner: true
    },
    {
      id: 'playstore',
      label: 'প্লে স্টোর অ্যাপ সেন্টার',
      subtitle: 'অ্যাপ ইনস্টল, আপডেট ও লিঙ্ক',
      icon: Smartphone,
      badge: 'Store',
      badgeColor: 'bg-emerald-300 text-slate-950 font-black',
      logoBg: 'from-emerald-400 via-cyan-500 to-blue-500',
      activeGradient: 'from-emerald-700 via-teal-700 to-cyan-800 border-emerald-300 shadow-emerald-950/60',
      hideForStaff: true,
      isPlayStore: true
    }
  ];

  const navBars = allNavBars.filter((item) => {
    if (item.directorOrPartnerOnly && !isDirectorRole && !isPartnerRole) return false;
    if (item.hideForStaff && isStaffRole) return false;
    if (item.hideForPartner && isPartnerRole) return false;
    return true;
  });

  const handleNavClick = (item: typeof navBars[0]) => {
    if (item.isAction && item.action) {
      item.action();
    } else {
      setActiveTab(item.id);
    }
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  const userInitial = currentUser.name ? currentUser.name.trim().charAt(0) : 'জ';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#042f22] via-[#03241b] to-[#021913] text-emerald-50 select-none shadow-2xl">
      {/* Top Brand Header */}
      <div className="p-3.5 border-b border-emerald-800/80 flex items-center justify-between bg-gradient-to-r from-emerald-900/80 via-teal-900/70 to-cyan-900/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white border-2 border-emerald-300/70 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            <img
              src="/assets/aistudio/FB_IMG_1793200670972_1fb968d5.jpg"
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black tracking-wide text-white truncate uppercase">
                DIP BHOLA NETWORK
              </h2>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-black bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-950 shadow-2xs">
                DIGITAL
              </span>
            </div>
            <p className="text-[10px] text-emerald-200 font-semibold truncate">
              ডিজিটাল অ্যাপ মেন্যু ও কন্ট্রোল
            </p>
          </div>
        </div>

        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          title="মেন্যু বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
        {/* SECTION 1: প্রধান ডিজিটাল মডিউল (প্রতিটি অপশনের নিজস্ব লোগো ও নাম) */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              অ্যাপ মডিউল ও রেজিস্টার
            </span>
            <span className="text-[10px] text-emerald-300/80 font-bold">{navBars.length} অপশন</span>
          </div>

          <div className="space-y-1.5">
            {navBars.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-2xl text-left transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${item.activeGradient || 'from-emerald-600 to-teal-700'} text-white shadow-lg border-2 border-white/60`
                      : 'bg-white/5 hover:bg-white/10 text-emerald-50 border border-white/10 hover:border-emerald-400/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Dedicated Colorful App Logo Icon per Option */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                        item.isPlayStore
                          ? 'bg-white border border-emerald-200'
                          : `bg-gradient-to-br ${item.logoBg} text-white`
                      }`}
                    >
                      {item.isPlayStore ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <path d="M4 3.5V20.5L16.5 12L4 3.5Z" fill="#00C1A4" />
                          <path d="M4 3.5L13.5 12.8L16.5 12L4 3.5Z" fill="#00A0FF" />
                          <path d="M16.5 12L13.5 11.2L4 20.5L16.5 12Z" fill="#FF3333" />
                          <path d="M16.5 12L13.5 11.2L13.5 12.8L16.5 12Z" fill="#FFBA00" />
                        </svg>
                      ) : (
                        <Icon className="w-4 h-4 stroke-[2.3]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">{item.label}</div>
                      <div className="text-[10px] text-emerald-200/80 truncate">{item.subtitle}</div>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1 ${
                        isActive ? 'bg-white text-slate-950' : item.badgeColor || 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: কুইক ডিজিটাল টুলস ও অ্যাপ কন্ট্রোল (স্টাফের জন্য গোপন, অ্যাপ কন্ট্রোল শুধু এডমিন) */}
        {!isStaffRole && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {isDirectorRole ? 'অ্যাডমিন অ্যাপ কন্ট্রোল ও টুলস' : 'ডিজিটাল টুলস'}
            </span>
          </div>

          <div className="space-y-1.5">
            {isDirectorRole && !isInstalled && (
              <button
                onClick={async () => {
                  if (isInstallable) {
                    await install();
                  } else if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                  if (isOpenMobile) onCloseMobile();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-white border border-emerald-400/50"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-md">
                  <Smartphone className="w-4 h-4 text-slate-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold truncate">অ্যাপ ইনস্টল (WebAPK)</div>
                  <div className="text-[10px] text-emerald-200/80 truncate">মোবাইল হোম স্ক্রিনে রাখুন</div>
                </div>
              </button>
            )}

            <button
              onClick={onToggleFullScreen}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-white/10"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shrink-0 shadow-md">
                {isFullScreen ? (
                  <Maximize2 className="w-4 h-4 text-slate-950" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-slate-950" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">
                  {isFullScreen ? 'প্যাড হেডার দেখান' : 'ফুল স্ক্রিন ভিউ'}
                </div>
                <div className="text-[10px] text-emerald-200/75 truncate">টপবার লুকান বা দেখান</div>
              </div>
            </button>

            <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-white/10"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center shrink-0 shadow-md">
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-slate-950" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-950" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">
                  {isDarkMode ? 'লাইট মোড চালু করুন' : 'নাইট ভিউ (ডার্ক মোড)'}
                </div>
                <div className="text-[10px] text-emerald-200/75 truncate">স্ক্রিন থিম পরিবর্তন</div>
              </div>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/15 text-amber-200">
                {isDarkMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {currentUser.role !== 'partner' && (
              <button
                onClick={() => {
                  onOpenMonthlyPdf();
                  if (isOpenMobile) onCloseMobile();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-amber-400/40"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shrink-0 shadow-md">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold truncate">PDF প্রিন্ট ও কালার স্টুডিও</div>
                  <div className="text-[10px] text-emerald-200/80 truncate">সাইজ, কালার পরিবর্তন ও সেভ</div>
                </div>
              </button>
            )}

            {isDirectorRole && (
              <>
                {onOpenWhatsAppGroups && (
                  <button
                    onClick={() => {
                      onOpenWhatsAppGroups();
                      if (isOpenMobile) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-[#25D366]/40"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0 shadow-md">
                      <MessageCircle className="w-4 h-4 text-slate-950" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold truncate">WhatsApp গ্রুপ ও ইনভাইট</div>
                      <div className="text-[10px] text-emerald-200/80 truncate">স্টাফ ও পার্টনার জয়েনিং</div>
                    </div>
                    {pendingJoinRequestsCount > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-600 text-white">
                        {pendingJoinRequestsCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenAppLinks();
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-white/10"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
                    <Share2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">অ্যাপ লিঙ্ক শেয়ার</div>
                    <div className="text-[10px] text-emerald-200/75 truncate">Play Store ও পোর্টাল লিঙ্ক</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onOpenStaffQr();
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-white/10"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shrink-0 shadow-md">
                    <QrCode className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">স্টাফ QR ও ID কার্ড</div>
                    <div className="text-[10px] text-emerald-200/75 truncate">ভেরিফিকেশন কার্ড প্রিন্ট</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (onOpenSecurityDashboard) onOpenSecurityDashboard();
                    else onOpenAuditLog();
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-white/10"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">নিরাপত্তা ও অডিট লগ</div>
                    <div className="text-[10px] text-emerald-200/75 truncate">অ্যাক্টিভিটি ও পিন সুরক্ষা</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onOpenBackup();
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-white/10"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">ক্লাউড ব্যাকআপ ও ড্রাইভ</div>
                    <div className="text-[10px] text-emerald-200/75 truncate">তথ্য সংরক্ষণ ও রিস্টোর</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onOpenCompanySetup();
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-left transition-all bg-white/5 hover:bg-white/10 text-emerald-50 border border-white/10"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shrink-0 shadow-md">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">কোম্পানি ও প্যাড সেটআপ</div>
                    <div className="text-[10px] text-emerald-200/75 truncate">নাম, লোগো ও ঠিকানা</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
        )}
      </div>

      {/* SECTION 3 (Bottom): ইউজার প্রোফাইল ও লগআউট */}
      <div className="p-3 border-t border-emerald-900/90 bg-[#022117] space-y-2 shrink-0">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gradient-to-r from-emerald-950 to-[#043324] border border-emerald-700/70 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 border border-white/60 shadow-2xs">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate leading-tight">{currentUser.name}</div>
            <div className="text-[10px] text-emerald-300 font-semibold truncate leading-tight">
              {currentUser.role === 'admin' ? 'পরিচালক / এডমিন' : currentUser.designation}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>লগআউট / অ্যাকাউন্ট বদলান</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:flex w-72 lg:w-76 xl:w-80 shrink-0 h-screen sticky top-0 border-r border-emerald-950 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile / Quick Menu Drawer Overlay (Works on ALL screens when triggered!) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-80 max-w-[86vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
