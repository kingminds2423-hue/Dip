import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Users,
  PieChart,
  Plus,
  Minus,
  ArrowRight,
  Printer,
  AlertTriangle,
  Wrench,
  Hash,
  Search,
  RotateCcw,
  CalendarDays,
  FileSpreadsheet,
  Clock,
  ChevronRight,
  Filter,
  Zap,
  CheckCircle,
  X,
  Receipt,
  Coins,
  Monitor,
  UserCheck,
  MessageCircle,
  QrCode,
  Shield,
  Database,
  Building2,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { Transaction, Staff, Partner, Company, UserSession, CustomerComplaint, WhatsAppGroupConfig } from '../types';
import {
  formatCurrency,
  toBengaliNumber,
  formatBengaliDate,
  getTodayString,
  getYesterdayString,
  getLastMonthString
} from '../utils/formatters';
import { PrintStudioModal } from './PrintStudioModal';
const MonthlyComparisonChart = React.lazy(() =>
  import('./MonthlyComparisonChart').then((m) => ({ default: m.MonthlyComparisonChart }))
);

interface DashboardProps {
  transactions: Transaction[];
  staffs: Staff[];
  partners: Partner[];
  company: Company | null;
  currentUser: UserSession;
  complaints?: CustomerComplaint[];
  whatsappGroupConfig?: WhatsAppGroupConfig | null;
  onOpenAddModal: (type: 'income' | 'expense') => void;
  onViewAllTransactions: () => void;
  onViewStaff: () => void;
  onViewPartners: () => void;
  onViewComplaints?: () => void;
  onOpenAddComplaint?: () => void;
  onOpenAppLinks?: () => void;
  onQuickExpense?: (data: { title: string; category: string; amount: number; paymentMethod: string; note?: string }) => Promise<void>;
  onNavigateTab?: (tab: string) => void;
  onOpenWhatsAppGroups?: () => void;
  onOpenStaffQr?: () => void;
  onOpenMonthlyPdf?: () => void;
  onOpenSecurityDashboard?: () => void;
  onOpenBackup?: () => void;
  onOpenCompanySetup?: () => void;
}

type QuickDateFilter = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'custom_single' | 'custom_range' | 'all';

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  staffs,
  partners,
  company,
  currentUser,
  complaints = [],
  whatsappGroupConfig,
  onOpenAddModal,
  onViewAllTransactions,
  onViewStaff,
  onViewPartners,
  onViewComplaints,
  onOpenAddComplaint,
  onOpenAppLinks,
  onQuickExpense,
  onNavigateTab,
  onOpenWhatsAppGroups,
  onOpenStaffQr,
  onOpenMonthlyPdf,
  onOpenSecurityDashboard,
  onOpenBackup,
  onOpenCompanySetup,
}) => {
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);

  // Quick Expense state
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [quickSuccessToast, setQuickSuccessToast] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState('অফিস পরিচালনা খরচ');
  const [customPayment, setCustomPayment] = useState('cash');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  const quickPresets = [
    { title: 'অফিসের নাস্তা ও চা-বিস্কুট', amount: 100, category: 'অফিস পরিচালনা খরচ', icon: '☕' },
    { title: 'যাতায়াত ও রিকশা ভাড়া', amount: 60, category: 'যাতায়াত ও ডেলিভারি খরচ', icon: '🛺' },
    { title: 'স্টেশনারি ও খাতা-কলম', amount: 120, category: 'স্টেশনারি ও প্রিন্টিং', icon: '📝' },
    { title: 'জরুরি ড্রপ ক্যাবল ও ক্লিপ', amount: 200, category: 'নেটওয়ার্ক সরঞ্জাম ও অপটিক্যাল ফাইবার', icon: '🔌' },
    { title: 'জেনারেটর / বাইক তেল খরচ', amount: 350, category: 'পরিবহন ও ফুয়েল', icon: '⛽' },
    { title: 'ইন্টারনেট ব্যান্ডউইথ ও আপস্ট্রিম বিল', amount: 5000, category: 'ইন্টারনেট ব্যান্ডউইথ বিল', icon: '🌐' }
  ];

  const triggerQuickExpense = async (data: { title: string; category: string; amount: number; paymentMethod?: string }) => {
    if (!data.amount || data.amount <= 0 || !data.title.trim()) return;
    setIsSubmittingQuick(true);
    try {
      if (onQuickExpense) {
        await onQuickExpense({
          title: data.title.trim(),
          category: data.category,
          amount: data.amount,
          paymentMethod: data.paymentMethod || 'cash',
          note: 'দ্রুত খরচ এন্ট্রি'
        });
      } else {
        onOpenAddModal('expense');
      }
      setQuickSuccessToast(`"৳${toBengaliNumber(data.amount)} - ${data.title}" খরচ সফলভাবে সংরক্ষিত হয়েছে!`);
      setTimeout(() => setQuickSuccessToast(null), 3500);
      setIsQuickExpenseOpen(false);
      setCustomTitle('');
      setCustomAmount('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Today & Month strings
  const todayStr = useMemo(() => getTodayString(), []);
  const yesterdayStr = useMemo(() => getYesterdayString(), []);
  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);
  const lastMonthStr = useMemo(() => getLastMonthString(), []);

  // Dedicated Date Search & Filter States
  const [activeDateFilter, setActiveDateFilter] = useState<QuickDateFilter>('today');
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>(todayStr);
  const [dateRangeStart, setDateRangeStart] = useState<string>(todayStr);
  const [dateRangeEnd, setDateRangeEnd] = useState<string>(todayStr);
  const [dateSearchQuery, setDateSearchQuery] = useState<string>('');

  // 1. Overall Lifetime Statistics
  const lifetimeStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach((tx) => {
      if (tx.type === 'income') totalIncome += tx.amount;
      else totalExpense += tx.amount;
    });
    const totalInvestment = partners.reduce((sum, p) => sum + (p.investment || 0), 0);
    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      totalCount: transactions.length,
      totalInvestment
    };
  }, [transactions, partners]);

  // 2. Today's Statistics
  const todayStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = 0;
    transactions.forEach((tx) => {
      if (tx.date === todayStr) {
        count++;
        if (tx.type === 'income') income += tx.amount;
        else expense += tx.amount;
      }
    });
    return {
      income,
      expense,
      net: income - expense,
      count
    };
  }, [transactions, todayStr]);

  // 3. This Month's Statistics
  const monthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = 0;
    transactions.forEach((tx) => {
      if (tx.date && tx.date.startsWith(currentMonthStr)) {
        count++;
        if (tx.type === 'income') income += tx.amount;
        else expense += tx.amount;
      }
    });
    return {
      income,
      expense,
      net: income - expense,
      count
    };
  }, [transactions, currentMonthStr]);

  // 4. Interactive Date-Filtered Transactions List & Stats
  const { filteredTransactions, filteredStats, filterLabel } = useMemo(() => {
    let list: Transaction[] = [];
    let label = '';

    if (activeDateFilter === 'today') {
      label = `আজকের হিসাব (${formatBengaliDate(todayStr)})`;
      list = transactions.filter((t) => t.date === todayStr);
    } else if (activeDateFilter === 'yesterday') {
      label = `গতকালের হিসাব (${formatBengaliDate(yesterdayStr)})`;
      list = transactions.filter((t) => t.date === yesterdayStr);
    } else if (activeDateFilter === 'this_month') {
      label = `চলতি মাসের হিসাব (${toBengaliNumber(currentMonthStr)})`;
      list = transactions.filter((t) => t.date && t.date.startsWith(currentMonthStr));
    } else if (activeDateFilter === 'last_month') {
      label = `গত মাসের হিসাব (${toBengaliNumber(lastMonthStr)})`;
      list = transactions.filter((t) => t.date && t.date.startsWith(lastMonthStr));
    } else if (activeDateFilter === 'custom_single') {
      label = `নির্দিষ্ট তারিখ: ${formatBengaliDate(selectedSingleDate)}`;
      list = transactions.filter((t) => t.date === selectedSingleDate);
    } else if (activeDateFilter === 'custom_range') {
      label = `${formatBengaliDate(dateRangeStart)} থেকে ${formatBengaliDate(dateRangeEnd)}`;
      list = transactions.filter((t) => {
        if (!t.date) return false;
        return t.date >= dateRangeStart && t.date <= dateRangeEnd;
      });
    } else {
      label = 'সর্বমোট সকল দিনের হিসাব';
      list = [...transactions];
    }

    // Additional search query within date filter
    if (dateSearchQuery.trim()) {
      const q = dateSearchQuery.toLowerCase();
      list = list.filter((t) =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.note || '').toLowerCase().includes(q) ||
        (t.addedBy || '').toLowerCase().includes(q)
      );
    }

    let inc = 0;
    let exp = 0;
    list.forEach((t) => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });

    return {
      filteredTransactions: list,
      filteredStats: {
        income: inc,
        expense: exp,
        net: inc - exp,
        count: list.length
      },
      filterLabel: label
    };
  }, [
    transactions,
    activeDateFilter,
    todayStr,
    yesterdayStr,
    currentMonthStr,
    lastMonthStr,
    selectedSingleDate,
    dateRangeStart,
    dateRangeEnd,
    dateSearchQuery
  ]);

  const threshold = company?.dailyExpenseThreshold || 5000;
  const isManagerOrDirector =
    currentUser.role === 'admin' || currentUser.role === 'director' || currentUser.role === 'manager';
  const isThresholdCrossed = isManagerOrDirector && todayStats.expense >= threshold;

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
      {/* Daily Expense Alert Notification Banner for Manager & Director */}
      {isThresholdCrossed && !isAlertDismissed && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 text-white border-2 border-rose-500 shadow-xl shadow-rose-950/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/90 border border-rose-400 flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-5 h-5 text-yellow-300 animate-bounce" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
                    <span>⚠️ আজকের মোট ব্যয় নির্ধারিত সীমা অতিক্রম করেছে!</span>
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-400 text-slate-950">
                    দৈনিক সীমা সতর্কবার্তা
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-rose-100 mt-1">
                  কোম্পানি সেটিংসে নির্ধারিত দৈনিক ব্যয়ের সীমা <strong>{formatCurrency(threshold)}</strong>। কিন্তু আজ মোট ব্যয় হয়েছে{' '}
                  <strong className="text-yellow-300 text-sm">{formatCurrency(todayStats.expense)}</strong>{' '}
                  (সীমার চেয়ে অতিরিক্ত: <strong>{formatCurrency(todayStats.expense - threshold)}</strong>)।
                </p>
                <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => {
                      setActiveDateFilter('today');
                      const el = document.getElementById('date-explorer-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-950 text-xs font-bold rounded-lg shadow-sm transition-all"
                  >
                    আজকের খরচের তালিকা পরীক্ষা করুন →
                  </button>
                  <button
                    onClick={() => setIsAlertDismissed(true)}
                    className="px-3 py-1.5 bg-rose-800/90 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-lg transition-all"
                  >
                    অবহিত হলাম (বন্ধ করুন)
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsAlertDismissed(true)}
              className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800/60 transition-colors shrink-0"
              title="বিজ্ঞপ্তি বন্ধ করুন"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
              <img
                src={company?.logoUrl || '/assets/aistudio/FB_IMG_1793200670972_1fb968d5.jpg'}
                alt={company?.name || 'Dip Bhola network'}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  স্বাগতম, {currentUser.name} ({currentUser.role === 'admin' ? 'পরিচালক' : currentUser.role === 'manager' ? 'ম্যানেজার' : 'স্টাফ'})
                </span>
                <span className="text-xs text-slate-400">
                  • আজ: {formatBengaliDate(todayStr)}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {company?.name || 'DIP BHOLA NETWORK'} এর কেন্দ্রীয় হিসাব ড্যাশবোর্ড
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                দৈনিক খরচ ও জমা, মাসিক বিবরণী এবং যেকোনো তারিখ সার্চ করে হিসাব বের করার রিয়েল-টাইম সিস্টেম।
              </p>
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setIsQuickExpenseOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-transform active:scale-95"
              title="ছোট ছোট নিয়মিত খরচ ১-ক্লিকে এন্ট্রি করুন"
            >
              <Zap className="w-4 h-4 fill-amber-200 text-white animate-pulse" />
              দ্রুত খরচ (Quick Expense)
            </button>
            <button
              onClick={() => onOpenAddModal('income')}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-900/40 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              নতুন জমা / আয়
            </button>
            <button
              onClick={() => onOpenAddModal('expense')}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-rose-900/40 transition-transform active:scale-95"
            >
              <Minus className="w-4 h-4" />
              নতুন খরচ / ব্যয়
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none"></div>
      </div>

      {/* ========================================================================= */}
      {/* ডিজিটাল অ্যাপ মেন্যু: প্রতিটি অপশনে নিজস্ব রঙিন লোগো ও বাংলা নাম         */}
      {/* ========================================================================= */}
      <div
        id="digital-app-hub"
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-md space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                ডিজিটাল অ্যাপ মেন্যু (সব অপশন)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                প্রতিটি সেবার নিজস্ব রঙিন লোগো ও নামে ১-ক্লিকে সরাসরি প্রবেশ করুন
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            সক্রিয় মড্যুলসমূহ
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
          {/* 1. হিসাব খাতা */}
          <button
            type="button"
            onClick={onViewAllTransactions}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-cyan-50/70 dark:bg-slate-800/70 hover:bg-cyan-100/80 dark:hover:bg-slate-800 border border-cyan-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-2 group-hover:scale-105 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              হিসাব খাতা
            </span>
          </button>

          {/* 2. নতুন জমা */}
          <button
            type="button"
            onClick={() => onOpenAddModal('income')}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/70 hover:bg-emerald-100/80 dark:hover:bg-slate-800 border border-emerald-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-2 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              নতুন জমা
            </span>
          </button>

          {/* 3. নতুন খরচ */}
          <button
            type="button"
            onClick={() => onOpenAddModal('expense')}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-rose-50/70 dark:bg-slate-800/70 hover:bg-rose-100/80 dark:hover:bg-slate-800 border border-rose-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 via-red-500 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 mb-2 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              নতুন খরচ
            </span>
          </button>

          {/* 4. গ্রাহক অভিযোগ */}
          <button
            type="button"
            onClick={() => (onViewComplaints ? onViewComplaints() : onNavigateTab?.('complaints'))}
            className="group relative flex flex-col items-center text-center p-2.5 rounded-2xl bg-orange-50/70 dark:bg-slate-800/70 hover:bg-orange-100/80 dark:hover:bg-slate-800 border border-orange-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 via-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 mb-2 group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              অভিযোগ কেন্দ্র
            </span>
          </button>

          {/* 5. বাকি খাতা */}
          <button
            type="button"
            onClick={() => onNavigateTab?.('dues')}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/70 hover:bg-amber-100/80 dark:hover:bg-slate-800 border border-amber-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 mb-2 group-hover:scale-105 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              বাকি খাতা
            </span>
          </button>

          {/* 6. স্টাফ তালিকা */}
          <button
            type="button"
            onClick={onViewStaff}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/70 hover:bg-indigo-100/80 dark:hover:bg-slate-800 border border-indigo-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-2 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              স্টাফ ও বেতন
            </span>
          </button>

          {/* 7. শেয়ার পার্টনার */}
          <button
            type="button"
            onClick={onViewPartners}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-purple-50/70 dark:bg-slate-800/70 hover:bg-purple-100/80 dark:hover:bg-slate-800 border border-purple-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 mb-2 group-hover:scale-105 transition-transform">
              <PieChart className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              শেয়ার অংশীদার
            </span>
          </button>

          {/* 8. AI রিপোর্ট ও PDF */}
          <button
            type="button"
            onClick={() => (onOpenMonthlyPdf ? onOpenMonthlyPdf() : onNavigateTab?.('reports'))}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-sky-50/70 dark:bg-slate-800/70 hover:bg-sky-100/80 dark:hover:bg-slate-800 border border-sky-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/25 mb-2 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              AI রিপোর্ট ও PDF
            </span>
          </button>

          {/* 9. ডিজিটাল ডিসপ্লে */}
          <button
            type="button"
            onClick={() => onNavigateTab?.('display')}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-lime-50/70 dark:bg-slate-800/70 hover:bg-lime-100/80 dark:hover:bg-slate-800 border border-lime-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-400 via-green-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-lime-500/25 mb-2 group-hover:scale-105 transition-transform">
              <Monitor className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              ডিজিটাল ডিসপ্লে
            </span>
          </button>

          {/* 10. ম্যানেজার ও অডিটর */}
          <button
            type="button"
            onClick={() => onNavigateTab?.('officers')}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-yellow-50/70 dark:bg-slate-800/70 hover:bg-yellow-100/80 dark:hover:bg-slate-800 border border-yellow-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-yellow-500/25 mb-2 group-hover:scale-105 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              ম্যানেজার-অডিটর
            </span>
          </button>

          {/* 11. WhatsApp গ্রুপ */}
          <button
            type="button"
            onClick={() => (onOpenWhatsAppGroups ? onOpenWhatsAppGroups() : onOpenAppLinks?.())}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/70 hover:bg-emerald-100/80 dark:hover:bg-slate-800 border border-emerald-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#25D366] via-emerald-500 to-[#128C7E] text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-2 group-hover:scale-105 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              WhatsApp গ্রুপ
            </span>
          </button>

          {/* 12. স্টাফ QR */}
          <button
            type="button"
            onClick={() => onOpenStaffQr?.()}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-teal-50/70 dark:bg-slate-800/70 hover:bg-teal-100/80 dark:hover:bg-slate-800 border border-teal-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 mb-2 group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              স্টাফ QR কার্ড
            </span>
          </button>

          {/* 13. নিরাপত্তা ও অডিট */}
          <button
            type="button"
            onClick={() => onOpenSecurityDashboard?.()}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-violet-50/70 dark:bg-slate-800/70 hover:bg-violet-100/80 dark:hover:bg-slate-800 border border-violet-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/25 mb-2 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              নিরাপত্তা ও অডিট
            </span>
          </button>

          {/* 14. ব্যাকআপ ও ড্রাইভ */}
          <button
            type="button"
            onClick={() => onOpenBackup?.()}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/70 hover:bg-blue-100/80 dark:hover:bg-slate-800 border border-blue-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-slate-800 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-2 group-hover:scale-105 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              ক্লাউড ব্যাকআপ
            </span>
          </button>

          {/* 15. কোম্পানি সেটআপ */}
          <button
            type="button"
            onClick={() => onOpenCompanySetup?.()}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/70 hover:bg-emerald-100/80 dark:hover:bg-slate-800 border border-emerald-200/80 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-800 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-2 group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              কোম্পানি সেটআপ
            </span>
          </button>

          {/* 16. প্লে স্টোর অ্যাপ */}
          <button
            type="button"
            onClick={() => onNavigateTab?.('playstore')}
            className="group flex flex-col items-center text-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg mb-2 group-hover:scale-105 transition-transform">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                <path d="M4 3.5V20.5L16.5 12L4 3.5Z" fill="#00C1A4" />
                <path d="M4 3.5L13.5 12.8L16.5 12L4 3.5Z" fill="#00A0FF" />
                <path d="M16.5 12L13.5 11.2L4 20.5L16.5 12Z" fill="#FF3333" />
                <path d="M16.5 12L13.5 11.2L13.5 12.8L16.5 12Z" fill="#FFBA00" />
              </svg>
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              প্লে স্টোর অ্যাপ
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ৩টি আলাদা আলাদা ড্যাশবোর্ড সেকশন: ১) দৈনিক হিসাব, ২) মাসিক হিসাব, ৩) সর্বমোট হিসাব */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* সেকশন ১: দৈনিক হিসাব (আজকের) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-emerald-300 dark:border-emerald-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    ১. দৈনিক হিসাব (আজকের)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatBengaliDate(todayStr)}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                {toBengaliNumber(todayStats.count)}টি লেনদেন
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">আজকের জমা (Income):</span>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(todayStats.income)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">আজকের খরচ (Expense):</span>
                <span className="text-sm font-extrabold text-rose-700 dark:text-rose-400">
                  {formatCurrency(todayStats.expense)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">আজকের নিট ক্যাশ:</span>
            <span className={`text-base font-black ${
              todayStats.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {formatCurrency(todayStats.net)}
            </span>
          </div>
        </div>

        {/* সেকশন ২: মাসিক হিসাব (চলতি মাস) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-indigo-300 dark:border-indigo-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    ২. মাসিক হিসাব (চলতি মাস)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    মাস: {toBengaliNumber(currentMonthStr)}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
                {toBengaliNumber(monthStats.count)}টি লেনদেন
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">চলতি মাসের জমা:</span>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(monthStats.income)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">চলতি মাসের খরচ:</span>
                <span className="text-sm font-extrabold text-rose-700 dark:text-rose-400">
                  {formatCurrency(monthStats.expense)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">মাসিক নিট ব্যালেন্স:</span>
            <span className={`text-base font-black ${
              monthStats.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {formatCurrency(monthStats.net)}
            </span>
          </div>
        </div>

        {/* সেকশন ৩: মোট জমা ও খরচ হিসাব (সর্বমোট লাইফটাইম) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-teal-300 dark:border-teal-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    ৩. মোট জমা ও খরচ (সর্বমোট)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    কেন্দ্রীয় লেজার ব্যালেন্স
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300">
                {toBengaliNumber(lifetimeStats.totalCount)}টি মোট রেকর্ড
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">সর্বমোট জমা (All-time):</span>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(lifetimeStats.totalIncome)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">সর্বমোট খরচ (All-time):</span>
                <span className="text-sm font-extrabold text-rose-700 dark:text-rose-400">
                  {formatCurrency(lifetimeStats.totalExpense)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">মোট ক্যাশ ইন হ্যান্ড:</span>
            <span className={`text-base font-black ${
              lifetimeStats.netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {formatCurrency(lifetimeStats.netBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* তারিখ অনুযায়ী সার্চ ও খরচ-জমা অনুসন্ধান সেকশন (Date-wise Accounting Explorer) */}
      {/* ========================================================================= */}
      <div id="date-explorer-section" className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-400 dark:border-emerald-700 shadow-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                তারিখ সার্চ করে দৈনিক, গতকাল বা মাসের হিসাব অনুসন্ধান
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              যেকোনো নির্দিষ্ট তারিখ সিলেক্ট করুন অথবা তারিখের রেঞ্জ দিয়ে সরাসরি খরচ ও জমা হিসাব বের করুন।
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setActiveDateFilter('today');
                setSelectedSingleDate(todayStr);
                setDateSearchQuery('');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              রিসেট
            </button>
            <button
              onClick={() => setIsPrintStudioOpen(true)}
              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-xs"
              title="নির্বাচিত তারিখের ভাউচার A4/Legal প্রিন্ট, PDF ডাউনলোড ও WhatsApp/Gmail এ শেয়ার করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              এই তারিখের ভাউচার প্রিন্ট / PDF
            </button>
          </div>
        </div>

        {/* Quick Date Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">দ্রুত ফিল্টার:</span>
          <button
            onClick={() => setActiveDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDateFilter === 'today'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            আজ (Today)
          </button>
          <button
            onClick={() => setActiveDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDateFilter === 'yesterday'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            গতকাল (Yesterday)
          </button>
          <button
            onClick={() => setActiveDateFilter('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDateFilter === 'this_month'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            চলতি মাস (This Month)
          </button>
          <button
            onClick={() => setActiveDateFilter('last_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDateFilter === 'last_month'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            গত মাস (Last Month)
          </button>
          <button
            onClick={() => setActiveDateFilter('custom_single')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDateFilter === 'custom_single'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            নির্দিষ্ট তারিখ বেছে নিন
          </button>
          <button
            onClick={() => setActiveDateFilter('custom_range')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDateFilter === 'custom_range'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            তারিখের রেঞ্জ (From - To)
          </button>
          <button
            onClick={() => setActiveDateFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDateFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            সব হিসাব
          </button>
        </div>

        {/* Date Pickers Bar & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          {activeDateFilter === 'custom_single' ? (
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                নির্দিষ্ট তারিখ নির্বাচন করুন:
              </label>
              <input
                type="date"
                value={selectedSingleDate}
                onChange={(e) => setSelectedSingleDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ) : activeDateFilter === 'custom_range' ? (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  শুরু তারিখ (From):
                </label>
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  শেষ তারিখ (To):
                </label>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          ) : (
            <div className="lg:col-span-2 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold">বর্তমান ফিল্টার:</span>
              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded-md">
                {filterLabel}
              </span>
            </div>
          )}

          {/* Search by text inside the date */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              বিবরণ, এন্ট্রিদাতা বা ক্যাটাগরি দিয়ে খুঁজুন:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={dateSearchQuery}
                onChange={(e) => setDateSearchQuery(e.target.value)}
                placeholder="যেমন: লাইন সমস্যা, তেল খরচ, বা নাম..."
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Selected Period Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">মোট জমা (Income)</span>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(filteredStats.income)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">মোট খরচ (Expense)</span>
            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {formatCurrency(filteredStats.expense)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">নিট উদ্বৃত্ত (Net)</span>
            <div className={`text-base sm:text-lg font-black mt-0.5 ${
              filteredStats.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {formatCurrency(filteredStats.net)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">মোট রেকর্ড</span>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {toBengaliNumber(filteredStats.count)} টি
            </div>
          </div>
        </div>

        {/* Selected Period Transactions Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>{filterLabel} এর সকল লেনদেনের তালিকা:</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {toBengaliNumber(filteredTransactions.length)}টি এন্ট্রি পাওয়া গেছে
            </span>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                এই তারিখ বা রেঞ্জে কোনো আয় বা ব্যয়ের রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-[11px] font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">নং</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">ধরন</th>
                    <th className="py-2.5 px-3">বিবরণ (Title)</th>
                    <th className="py-2.5 px-3">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3">পেমেন্ট</th>
                    <th className="py-2.5 px-3">এন্ট্রিদাতা</th>
                    <th className="py-2.5 px-3 text-right">টাকার পরিমাণ (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.map((tx, idx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {toBengaliNumber(idx + 1)}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatBengaliDate(tx.date)}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {isIncome ? 'আয় / জমা' : 'ব্যয় / খরচ'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {tx.title}
                          </div>
                          {tx.note && (
                            <div className="text-[10px] text-slate-400 italic">
                              নোট: {tx.note}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                          {tx.paymentMethod === 'bkash' ? 'বিকাশ' : tx.paymentMethod === 'nagad' ? 'নগদ' : tx.paymentMethod === 'bank' ? 'ব্যাংক' : 'নগদ ক্যাশ'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                          {tx.addedBy}
                        </td>
                        <td className={`py-2 px-3 text-right font-extrabold ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Income vs Expense Comparison Bar Chart */}
      <React.Suspense
        fallback={
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 h-72 flex items-center justify-center text-xs text-slate-400">
            চার্ট লোড হচ্ছে...
          </div>
        }
      >
        <MonthlyComparisonChart transactions={transactions} />
      </React.Suspense>

      {/* Customer Complaints Quick Overview Banner / Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 text-white border border-slate-700/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  গ্রাহক অভিযোগ ও সার্ভিস মনিটরিং (Live Support Tickets)
                </h3>
                {complaints.filter((c) => c.status === 'pending').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                    {toBengaliNumber(complaints.filter((c) => c.status === 'pending').length)}টি পেন্ডিং
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                গ্রাহক লাইন সমস্যা, ফাইবার মেরামত ও টেকনিশিয়ান ট্র্যাকিং
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onOpenAddComplaint && (
              <button
                onClick={onOpenAddComplaint}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>নতুন অভিযোগ</span>
              </button>
            )}
            {onViewComplaints && (
              <button
                onClick={onViewComplaints}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center gap-1 border border-white/10"
              >
                <span>সব অভিযোগ দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}
          </div>
        </div>

        {/* Complaints Mini Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          {complaints.slice(0, 3).map((cmp) => (
            <div
              key={cmp.id}
              onClick={onViewComplaints}
              className={`p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border transition-all cursor-pointer space-y-1.5 ${
                cmp.priority === 'critical'
                  ? 'border-l-4 border-l-red-500 border-slate-700'
                  : cmp.priority === 'urgent'
                  ? 'border-l-4 border-l-orange-500 border-slate-700'
                  : 'border-l-4 border-l-blue-500 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {cmp.idNumber}
                  </span>
                  {cmp.priority === 'critical' ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-red-500/25 text-red-300 border border-red-500/40">
                      অতি জরুরি
                    </span>
                  ) : cmp.priority === 'urgent' ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-orange-500/25 text-orange-300 border border-orange-500/40">
                      জরুরি
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-500/25 text-blue-300 border border-blue-500/40">
                      সাধারণ
                    </span>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  cmp.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : cmp.status === 'in_progress'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {cmp.status === 'pending' ? 'পেন্ডিং' : cmp.status === 'in_progress' ? 'কাজ চলছে' : 'সমাধানকৃত'}
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate">{cmp.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{cmp.complainDetails}</div>
              <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-700/60">
                <span>{cmp.address}</span>
                <span className="text-emerald-300 font-semibold">{cmp.assignedStaffName || 'স্টাফ অনির্ধারিত'}</span>
              </div>
            </div>
          ))}
          {complaints.length === 0 && (
            <div className="col-span-3 text-center py-4 text-xs text-slate-400">
              বর্তমানে কোনো পেন্ডিং অভিযোগ নেই। সব লাইন সচল রয়েছে।
            </div>
          )}
        </div>
      </div>

      {/* Partners Equity & Staff Quick Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partner Equity Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  অংশীদার মূলধন ও শেয়ার বণ্টন
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  মোট পার্টনার বিনিয়োগ: {formatCurrency(lifetimeStats.totalInvestment)}
                </p>
              </div>
            </div>
            <button
              onClick={onViewPartners}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              বিস্তারিত <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
              {partners.map((p, idx) => (
                <div
                  key={p.id}
                  style={{ width: `${p.sharePercentage}%` }}
                  className={`h-full transition-all ${
                    idx === 0 ? 'bg-emerald-600' : 'bg-teal-400'
                  }`}
                  title={`${p.name}: ${toBengaliNumber(p.sharePercentage)}%`}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {partners.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3.5 h-3.5 rounded-full ${idx === 0 ? 'bg-emerald-600' : 'bg-teal-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">{formatCurrency(p.investment)}</div>
                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{toBengaliNumber(p.sharePercentage)}% শেয়ার</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Quick Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">কেন্দ্রীয় স্টাফ মনিটরিং</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">মোট সক্রিয় স্টাফ: {toBengaliNumber(staffs.length)} জন</p>
              </div>
            </div>
            <button
              onClick={onViewStaff}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              সকল স্টাফ <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {staffs.map((st) => (
              <div
                key={st.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0 border border-emerald-200">
                    {st.photoUrl && st.photoUrl.startsWith('data:') ? (
                      <img src={st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
                    ) : (
                      st.name.substring(0, 2)
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{st.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{st.designation}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatCurrency(st.salary)}</span>
                  <div className="text-[10px] text-slate-400">মাসিক বেতন</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Dedicated Printable Summary Report (Visible ONLY during Direct Print) */}
      <div id="printable-daily-summary" className="hidden print:block p-6 bg-white text-slate-900 font-sans space-y-5">
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-2xl font-black uppercase tracking-wide">
            {company?.name || 'DIP BHOLA NETWORK'}
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            {company?.subTitle || 'কেন্দ্রীয় দৈনিক আয়-ব্যয় ও স্টাফ মনিটরিং ব্যবস্থা'}
          </p>
          <div className="text-xs text-slate-700 mt-1 flex justify-center gap-4">
            <span>পরিচালক: {company?.ownerName || 'জাহিদুল ইসলাম'}</span>
            <span>•</span>
            <span>মোবাইল: {company?.phone || '01721200049'}</span>
            <span>•</span>
            <span>ঠিকানা: {company?.address || '৩নং পশ্চিম ইলিশা, ভোলা সদর'}</span>
          </div>
          <div className="mt-3 inline-block px-4 py-1 rounded bg-slate-100 border border-slate-300 text-xs font-bold">
            হিসাব বিবরণী • {filterLabel}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 border border-slate-300 rounded-lg">
            <div className="text-[11px] text-slate-500 font-bold">মোট জমা (Income)</div>
            <div className="text-base font-extrabold text-emerald-800 mt-0.5">
              {formatCurrency(filteredStats.income)}
            </div>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <div className="text-[11px] text-slate-500 font-bold">মোট খরচ (Expense)</div>
            <div className="text-base font-extrabold text-rose-800 mt-0.5">
              {formatCurrency(filteredStats.expense)}
            </div>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <div className="text-[11px] text-slate-500 font-bold">নিট ক্যাশ ব্যালেন্স</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {formatCurrency(filteredStats.net)}
            </div>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <div className="text-[11px] text-slate-500 font-bold">মোট লেনদেন</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {toBengaliNumber(filteredStats.count)} টি
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-400 pb-1 mb-2">
            লেনদেন বিবরণী ({toBengaliNumber(filteredTransactions.length)}টি এন্ট্রি):
          </h3>
          {filteredTransactions.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">কোনো লেনদেন রেকর্ড নেই।</p>
          ) : (
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                  <th className="border border-slate-300 p-2">তারিখ</th>
                  <th className="border border-slate-300 p-2">বিবরণ (Title)</th>
                  <th className="border border-slate-300 p-2">ক্যাটাগরি</th>
                  <th className="border border-slate-300 p-2">পেমেন্ট</th>
                  <th className="border border-slate-300 p-2">এন্ট্রিদাতা</th>
                  <th className="border border-slate-300 p-2 text-right">পরিমাণ (BDT)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id}>
                    <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-1.5 whitespace-nowrap">{formatBengaliDate(tx.date)}</td>
                    <td className="border border-slate-300 p-1.5 font-bold">
                      {tx.title}
                      {tx.note && <span className="block text-[10px] text-slate-500 font-normal">({tx.note})</span>}
                    </td>
                    <td className="border border-slate-300 p-1.5">{tx.category}</td>
                    <td className="border border-slate-300 p-1.5">{tx.paymentMethod}</td>
                    <td className="border border-slate-300 p-1.5">{tx.addedBy}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-extrabold">
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-t border-slate-800 pt-1.5 font-bold">
              শাখা ও জেনারেল ম্যানেজার স্বাক্ষর
            </div>
            <div className="text-[10px] text-slate-500">DIP BHOLA NETWORK</div>
          </div>
          <div>
            <div className="border-t border-slate-800 pt-1.5 font-bold">
              প্রধান পরিচালক / স্বত্বাধিকারী স্বাক্ষর
            </div>
            <div className="text-[10px] text-slate-500">DIP BHOLA NETWORK</div>
          </div>
        </div>
      </div>

      {/* Floating Success Toast for Quick Expense */}
      {quickSuccessToast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-emerald-500 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold">{quickSuccessToast}</div>
        </div>
      )}

      {/* Quick Expense Modal Dialog */}
      {isQuickExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 fill-amber-200" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold">দ্রুত খরচ এন্ট্রি (Quick Expense)</h3>
                  <p className="text-[11px] text-amber-100">১-ক্লিকে নিয়মিত ছোট খরচসমূহ রেকর্ড করুন</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickExpenseOpen(false)}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Preset 1-Click Buttons */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  ১-ক্লিকে তাৎক্ষণিক রেকর্ড করুন:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {quickPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      disabled={isSubmittingQuick}
                      onClick={() => triggerQuickExpense(preset)}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-left transition-all active:scale-95 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{preset.icon}</span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                          {formatCurrency(preset.amount)}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                        {preset.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {preset.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Or Quick Custom Expense */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  অথবা কাস্টম পরিমাণ দিয়ে দ্রুত সেভ করুন:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">খরচের বিবরণ *</label>
                    <input
                      type="text"
                      placeholder="যেমন: লাইন ক্লিপ, পানি, চা ইত্যাদি"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">টাকার পরিমাণ (BDT) *</label>
                    <input
                      type="number"
                      placeholder="টাকা (যেমন: 150)"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">ক্যাটাগরি</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <option value="অফিস পরিচালনা খরচ">অফিস পরিচালনা খরচ</option>
                      <option value="যাতায়াত ও ডেলিভারি খরচ">যাতায়াত ও ডেলিভারি খরচ</option>
                      <option value="নেটওয়ার্ক সরঞ্জাম ও অপটিক্যাল ফাইবার">নেটওয়ার্ক সরঞ্জাম</option>
                      <option value="স্টেশনারি ও প্রিন্টিং">স্টেশনারি ও প্রিন্টিং</option>
                      <option value="পরিবহন ও ফুয়েল">পরিবহন ও ফুয়েল</option>
                      <option value="ইন্টারনেট ব্যান্ডউইথ বিল">ইন্টারনেট ব্যান্ডউইথ বিল</option>
                      <option value="অন্যান্য বিবিধ খরচ">অন্যান্য বিবিধ খরচ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">পেমেন্ট মাধ্যম</label>
                    <select
                      value={customPayment}
                      onChange={(e) => setCustomPayment(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <option value="cash">নগদ ক্যাশ (Cash)</option>
                      <option value="bkash">বিকাশ (bKash)</option>
                      <option value="nagad">নগদ (Nagad)</option>
                      <option value="bank">ব্যাংক (Bank)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmittingQuick || !customTitle.trim() || !customAmount}
                  onClick={() => triggerQuickExpense({
                    title: customTitle,
                    category: customCategory,
                    amount: parseFloat(customAmount) || 0,
                    paymentMethod: customPayment
                  })}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-950/30 disabled:opacity-50 transition-all active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-amber-200" />
                  <span>{isSubmittingQuick ? 'সংরক্ষণ হচ্ছে...' : 'তাত্ক্ষণিক খরচ সেভ করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print & PDF Publication Studio Modal */}
      <PrintStudioModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        documentTitle={`দৈনিক হিসাব ভাউচার — ${filterLabel}`}
        fileNamePrefix={`DIP-BHOLA-Voucher-${todayStr}`}
        summaryText={[
          `🧾 *${company?.name || 'DIP BHOLA NETWORK'} — হিসাব বিবরণী (${filterLabel})*`,
          `➕ মোট জমা: ৳ ${filteredStats.income.toLocaleString()}`,
          `➖ মোট খরচ: ৳ ${filteredStats.expense.toLocaleString()}`,
          `💰 নিট ক্যাশ ব্যালেন্স: ৳ ${filteredStats.net.toLocaleString()}`,
          `📝 মোট লেনদেন: ${filteredStats.count} টি`
        ].join('\n')}
        whatsappGroupConfig={whatsappGroupConfig}
      >
        <div className="bg-white text-slate-900 font-sans space-y-4">
          <div data-print-section="header" className="border-b-2 border-slate-900 pb-3 text-center">
            <h1 className="text-xl font-black uppercase">
              {company?.name || 'DIP BHOLA NETWORK'}
            </h1>
            <p className="text-[11px] font-semibold text-slate-600">
              {company?.subTitle || 'কেন্দ্রীয় দৈনিক আয়-ব্যয় ও স্টাফ মনিটরিং ব্যবস্থা'}
            </p>
            <div className="text-[10px] text-slate-700 mt-1 flex justify-center gap-3 flex-wrap">
              <span>পরিচালক: {company?.ownerName || 'জাহিদুল ইসলাম'}</span>
              <span>•</span>
              <span>মোবাইল: {company?.phone || '01721200049'}</span>
              <span>•</span>
              <span>ঠিকানা: {company?.address || '৩নং পশ্চিম ইলিশা, ভোলা সদর'}</span>
            </div>
            <div className="mt-2 inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-xs font-bold">
              হিসাব বিবরণী • {filterLabel}
            </div>
          </div>

          <div data-print-section="summary" className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 border border-slate-300 rounded-lg">
              <div className="text-[10px] text-slate-500 font-bold">মোট জমা (Income)</div>
              <div className="text-sm font-extrabold text-emerald-800">{formatCurrency(filteredStats.income)}</div>
            </div>
            <div className="p-2 border border-slate-300 rounded-lg">
              <div className="text-[10px] text-slate-500 font-bold">মোট খরচ (Expense)</div>
              <div className="text-sm font-extrabold text-rose-800">{formatCurrency(filteredStats.expense)}</div>
            </div>
            <div className="p-2 border border-slate-300 rounded-lg">
              <div className="text-[10px] text-slate-500 font-bold">নিট ব্যালেন্স</div>
              <div className="text-sm font-extrabold text-slate-900">{formatCurrency(filteredStats.net)}</div>
            </div>
            <div className="p-2 border border-slate-300 rounded-lg">
              <div className="text-[10px] text-slate-500 font-bold">মোট লেনদেন</div>
              <div className="text-sm font-extrabold text-slate-900">{toBengaliNumber(filteredStats.count)} টি</div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-400 pb-1 mb-2">
              লেনদেন বিবরণী ({toBengaliNumber(filteredTransactions.length)}টি এন্ট্রি):
            </h3>
            {filteredTransactions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">কোনো লেনদেন রেকর্ড নেই।</p>
            ) : (
              <table className="w-full text-[10px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-1.5 text-center w-8">নং</th>
                    <th className="border border-slate-300 p-1.5">তারিখ</th>
                    <th className="border border-slate-300 p-1.5">বিবরণ (Title)</th>
                    <th className="border border-slate-300 p-1.5">ক্যাটাগরি</th>
                    <th className="border border-slate-300 p-1.5">পেমেন্ট</th>
                    <th className="border border-slate-300 p-1.5">এন্ট্রিদাতা</th>
                    <th className="border border-slate-300 p-1.5 text-right">পরিমাণ (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx, idx) => (
                    <tr key={tx.id}>
                      <td className="border border-slate-300 p-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-1">{formatBengaliDate(tx.date)}</td>
                      <td className="border border-slate-300 p-1 font-bold">
                        {tx.title}
                        {tx.note && <span className="block text-[9px] text-slate-500 font-normal">({tx.note})</span>}
                      </td>
                      <td className="border border-slate-300 p-1">{tx.category}</td>
                      <td className="border border-slate-300 p-1">{tx.paymentMethod}</td>
                      <td className="border border-slate-300 p-1">{tx.addedBy}</td>
                      <td className={`border border-slate-300 p-1 text-right font-extrabold ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div data-print-section="signatures" className="pt-10 grid grid-cols-2 gap-8 text-center text-[11px]">
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">শাখা ও জেনারেল ম্যানেজার স্বাক্ষর</div>
              <div className="text-[9px] text-slate-500">{company?.name || 'DIP BHOLA NETWORK'}</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">প্রধান পরিচালক / স্বত্বাধিকারী স্বাক্ষর</div>
              <div className="text-[9px] text-slate-500">{company?.name || 'DIP BHOLA NETWORK'}</div>
            </div>
          </div>
        </div>
      </PrintStudioModal>
    </div>
  );
};
