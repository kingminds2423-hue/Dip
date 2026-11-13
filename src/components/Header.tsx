import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import { Company, UserSession } from '../types';

interface HeaderProps {
  company: Company | null;
  currentUser?: UserSession;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  currentUser,
}) => {
  const companyName = company?.name || 'DIP BHOLA NETWORK';
  const subTitle = company?.subTitle || 'দৈনিক আয়-ব্যয় হিসাব ও কেন্দ্রীয় স্টাফ মনিটরিং সিস্টেম';
  const ownerName = company?.ownerName || 'জাহিদুল ইসলাম';
  const phone = company?.phone || '01721200049';
  const email = company?.email || 'zahidulislam53330@gmail.com';
  const address = company?.address || '৩নং পশ্চিম ইলিশা, ভোলা সদর, ভোলা';
  const logoUrl = company?.logoUrl || '/assets/aistudio/FB_IMG_1793200670972_1fb968d5.jpg';

  const isStaffRole = currentUser?.role === 'staff';

  return (
    <header className="bg-white dark:bg-slate-900 border-t-4 border-t-emerald-700 border-b border-slate-200 dark:border-slate-800 shadow-xs relative z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* LEFT ZONE: Official Pad Logo Box */}
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl bg-white dark:bg-slate-950 border-2 border-emerald-700/20 dark:border-emerald-500/30 shadow-xs flex items-center justify-center overflow-hidden p-1.5 shrink-0">
            <img
              src={logoUrl}
              alt={companyName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/aistudio/FB_IMG_1793200670972_1fb968d5.jpg';
              }}
            />
          </div>

          {/* CENTER ZONE: Official Business Letterhead Pad Block */}
          <div className="flex-1 text-center min-w-0 px-1 sm:px-4">
            <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide mb-0.5">
              বিসমিল্লাহির রাহমানির রাহিম · অনুমোদিত ব্রডব্যান্ড ইন্টারনেট ও কেবল নেটওয়ার্ক
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              {companyName}
            </h1>

            <p className="text-emerald-800 dark:text-emerald-300 text-[11px] sm:text-sm font-bold mt-1 truncate">
              {subTitle}
            </p>

            {/* Hairline Official Pad Metadata Divider (Hidden Director details for Staff) */}
            {!isStaffRole ? (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <UserCheck className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">পরিচালক:</span>
                  <strong className="font-bold text-slate-900 dark:text-white">{ownerName}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
                  <Phone className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">মোবাইল:</span>
                  <strong className="font-bold text-slate-900 dark:text-white">{phone}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 hidden md:inline">|</span>
                <span className="hidden md:inline-flex items-center gap-1 whitespace-nowrap">
                  <Mail className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">{email}</span>
                </span>
              </div>
            ) : (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300">
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>স্বাগতম, {currentUser?.name}</span>
                  {currentUser?.designation && (
                    <span className="text-slate-500 dark:text-slate-400 font-medium">· {currentUser.designation}</span>
                  )}
                </span>
              </div>
            )}

            <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">
              <MapPin className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="truncate">কার্যালয় ও ঠিকানা: {address}</span>
            </div>
          </div>

          {/* RIGHT SYMMETRY SPACER (desktop balance so letterhead stays dead-center) */}
          <div className="hidden sm:block w-20 shrink-0" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
};
