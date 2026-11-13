import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Minus,
  Trash2,
  Edit,
  Calendar,
  RotateCcw,
  Printer,
  MessageCircle,
  WifiOff,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Transaction, UserSession, WhatsAppGroupConfig, Company } from '../types';
import {
  formatCurrency,
  toBengaliNumber,
  formatBengaliDate,
  CATEGORIES_EXPENSE,
  CATEGORIES_INCOME,
  getTodayString,
  getYesterdayString
} from '../utils/formatters';
import { normalizeWhatsAppGroupLink } from '../utils/appUrls';
import type { OfflineSyncState } from '../services/offlineSync';
import { PrintStudioModal } from './PrintStudioModal';

interface TransactionsTableProps {
  transactions: Transaction[];
  currentUser: UserSession;
  company?: Company | null;
  whatsappGroupConfig?: WhatsAppGroupConfig;
  offlineSyncState?: OfflineSyncState;
  onManualSyncNow?: () => void;
  onOpenAddModal: (type: 'income' | 'expense') => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onExportCsv: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  currentUser,
  company,
  whatsappGroupConfig,
  offlineSyncState,
  onManualSyncNow,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  onExportCsv,
}) => {
  const todayStr = useMemo(() => getTodayString(), []);
  const yesterdayStr = useMemo(() => getYesterdayString(), []);
  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const [filterSpecificDate, setFilterSpecificDate] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const isStaffRole = currentUser.role === 'staff';
  const isAdminOnly = currentUser.role === 'admin' || currentUser.role === 'director';

  // Strictly isolate transactions so Staff ONLY sees their own entries
  const scopedTransactions = useMemo(() => {
    if (!isStaffRole) return transactions;
    return transactions.filter(
      (tx) =>
        tx.addedById === currentUser.id ||
        (tx.addedBy || '').trim() === currentUser.name.trim()
    );
  }, [transactions, isStaffRole, currentUser.id, currentUser.name]);

  // Extract distinct months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    scopedTransactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        months.add(tx.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [scopedTransactions]);

  // Extract distinct addedBy names
  const availablePersons = useMemo(() => {
    if (isStaffRole) return [];
    const persons = new Set<string>();
    scopedTransactions.forEach((tx) => {
      if (tx.addedBy) persons.add(tx.addedBy);
    });
    return Array.from(persons);
  }, [scopedTransactions, isStaffRole]);

  // Quick Date Setters
  const handleSetToday = () => {
    setFilterSpecificDate(todayStr);
    setFilterMonth('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleSetYesterday = () => {
    setFilterSpecificDate(yesterdayStr);
    setFilterMonth('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleSetCurrentMonth = () => {
    setFilterMonth(currentMonthStr);
    setFilterSpecificDate('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterCategory('all');
    setFilterMonth('all');
    setFilterPerson('all');
    setFilterSpecificDate('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return scopedTransactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
      if (!isStaffRole && filterPerson !== 'all' && tx.addedBy !== filterPerson) return false;

      // Specific Date Filter
      if (filterSpecificDate.trim()) {
        if (tx.date !== filterSpecificDate) return false;
      } else {
        // Date Range
        if (filterDateFrom && tx.date < filterDateFrom) return false;
        if (filterDateTo && tx.date > filterDateTo) return false;
        // Month filter
        if (filterMonth !== 'all' && !tx.date.startsWith(filterMonth)) return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = (tx.title || '').toLowerCase().includes(q);
        const noteMatch = (tx.note || '').toLowerCase().includes(q);
        const idMatch = (tx.id || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        const personMatch = (tx.addedBy || '').toLowerCase().includes(q);
        const dateMatch = (tx.date || '').toLowerCase().includes(q);
        if (!titleMatch && !noteMatch && !idMatch && !catMatch && !personMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    scopedTransactions,
    isStaffRole,
    filterType,
    filterCategory,
    filterMonth,
    filterPerson,
    filterSpecificDate,
    filterDateFrom,
    filterDateTo,
    search
  ]);

  // Totals for filtered list
  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredList.forEach((tx) => {
      if (tx.type === 'income') inc += tx.amount;
      else exp += tx.amount;
    });
    return {
      income: inc,
      expense: exp,
      net: inc - exp,
    };
  }, [filteredList]);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...CATEGORIES_EXPENSE, ...CATEGORIES_INCOME]));
  }, []);

  const hasActiveFilters = Boolean(
    search ||
    filterType !== 'all' ||
    filterCategory !== 'all' ||
    filterMonth !== 'all' ||
    filterPerson !== 'all' ||
    filterSpecificDate ||
    filterDateFrom ||
    filterDateTo
  );

  const staffGroupUrl = normalizeWhatsAppGroupLink(
    whatsappGroupConfig?.staffGroupInviteLink || whatsappGroupConfig?.groupInviteLink
  );
  const pendingOfflineCount = scopedTransactions.filter((t) => t._pendingSync).length;

  return (
    <div className="space-y-4">
      {/* Staff Personal Page Banner */}
      {isStaffRole && (
        <div className="bg-gradient-to-r from-[#022c20] via-[#054431] to-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-emerald-500/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold mb-1">
              <span>নিজস্ব স্টাফ প্যানেল · {currentUser.designation}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              স্বাগতম, {currentUser.name}
            </h2>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              মোবাইল: {currentUser.phone || 'নিবন্ধিত'} · এখান থেকে আপনি জমা ও খরচ এন্ট্রি দিতে এবং নিজের এন্ট্রি দেখতে পারবেন। কোনো তথ্য ডিলিট বা পরিবর্তন শুধুমাত্র অ্যাডমিন করতে পারবেন।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-right">
              <div className="text-[10px] text-emerald-200">আপনার মোট এন্ট্রি</div>
              <div className="text-sm font-black text-white">{toBengaliNumber(scopedTransactions.length)} টি</div>
            </div>
          </div>
        </div>
      )}

      {/* Offline / Pending Auto-Sync Strip */}
      {((offlineSyncState && !offlineSyncState.isOnline) || pendingOfflineCount > 0) && (
        <div className="rounded-2xl p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 text-amber-950 dark:text-amber-200">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {offlineSyncState && !offlineSyncState.isOnline
                ? 'অফলাইন মোড: এন্ট্রিগুলো নিরাপদে ডিভাইসে সংরক্ষিত থাকছে, ইন্টারনেট আসলেই স্বয়ংক্রিয়ভাবে অনলাইন সিঙ্ক হবে।'
                : `${toBengaliNumber(pendingOfflineCount)}টি অফলাইন এন্ট্রি অনলাইন সার্ভারে সিঙ্ক হওয়ার অপেক্ষায় আছে।`}
            </span>
          </div>
          {offlineSyncState?.isOnline && onManualSyncNow && pendingOfflineCount > 0 && (
            <button
              type="button"
              onClick={onManualSyncNow}
              disabled={offlineSyncState.isSyncing}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${offlineSyncState.isSyncing ? 'animate-spin' : ''}`} />
              <span>{offlineSyncState.isSyncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই অনলাইন সিঙ্ক করুন'}</span>
            </button>
          )}
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{isStaffRole ? 'আমার দৈনিক আয়-ব্যয় খাতা' : 'দৈনিক আয়-ব্যয় খাতা (Transactions Ledger)'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
              {toBengaliNumber(filteredList.length)} টি রেকর্ড
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ফিল্টার করা মোট জমা: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(totals.income)}</span> | মোট খরচ: <span className="text-rose-600 dark:text-rose-400 font-bold">{formatCurrency(totals.expense)}</span> | নিট ব্যালেন্স: <span className={`font-bold ${totals.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{formatCurrency(totals.net)}</span>
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setIsPrintStudioOpen(true)}
            className="px-3 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            title="A4/Legal প্রিন্ট, PDF ডাউনলোড, PDF Reader এবং WhatsApp/Gmail শেয়ার"
          >
            <Printer className="w-3.5 h-3.5" />
            প্রিন্ট / PDF
          </button>
          <button
            onClick={onExportCsv}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
            title="CSV ফাইলে ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5" />
            CSV এক্সপোর্ট
          </button>
          <button
            onClick={() => onOpenAddModal('income')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            + জমা এন্ট্রি
          </button>
          <button
            onClick={() => onOpenAddModal('expense')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Minus className="w-3.5 h-3.5" />
            - খরচ এন্ট্রি
          </button>
        </div>
      </div>

      {/* Filter and Date Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Quick Date Buttons Row */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              তারিখ নির্বাচন:
            </span>
            <button
              onClick={handleSetToday}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterSpecificDate === todayStr
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              আজ
            </button>
            <button
              onClick={handleSetYesterday}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterSpecificDate === yesterdayStr
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              গতকাল
            </button>
            <button
              onClick={handleSetCurrentMonth}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterMonth === currentMonthStr && !filterSpecificDate
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              চলতি মাস
            </button>
            {filterSpecificDate && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                নির্বাচিত তারিখ: {formatBengaliDate(filterSpecificDate)}
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
            >
              <RotateCcw className="w-3 h-3" />
              ফিল্টার মুছুন
            </button>
          )}
        </div>

        {/* Search and Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="বিবরণ, মন্তব্য, তারিখ বা আইডি দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Specific Date Picker Input */}
          <div>
            <input
              type="date"
              value={filterSpecificDate}
              onChange={(e) => {
                setFilterSpecificDate(e.target.value);
                if (e.target.value) {
                  setFilterMonth('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }
              }}
              title="নির্দিষ্ট যেকোনো তারিখ বেছে নিন"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">সব ধরনের হিসাব (All)</option>
              <option value="expense">ব্যয় / খরচ (Expense)</option>
              <option value="income">আয় / জমা (Income)</option>
            </select>
          </div>

          {/* Month filter */}
          <div>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                if (e.target.value !== 'all') {
                  setFilterSpecificDate('');
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">সব মাস (All Months)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  মাস: {toBengaliNumber(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Added By Person filter (Hidden for Staff so other staff/director names are never exposed) */}
          {!isStaffRole && (
            <div>
              <select
                value={filterPerson}
                onChange={(e) => setFilterPerson(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">সকল এন্ট্রিদাতা</option>
                {availablePersons.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">ক্যাটাগরি:</span>
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filterCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            সব ক্যাটাগরি
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">ক্রমিক</th>
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">ধরন</th>
                <th className="py-3 px-4">কাজের বিবরণ / খাত</th>
                <th className="py-3 px-4">ক্যাটাগরি</th>
                <th className="py-3 px-4 text-right">টাকার পরিমাণ</th>
                <th className="py-3 px-4">পেমেন্ট</th>
                <th className="py-3 px-4">এন্ট্রিদাতা</th>
                <th className="py-3 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    কোনো তথ্য খুঁজে পাওয়া যায়নি। অনুসন্ধান পরিবর্তন করুন বা নতুন এন্ট্রি দিন।
                  </td>
                </tr>
              ) : (
                filteredList.map((tx, idx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-medium">
                        {toBengaliNumber(idx + 1)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="font-semibold">{tx.date}</div>
                        <div className="text-[10px] text-slate-400">{formatBengaliDate(tx.date)}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isIncome
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {isIncome ? '+ জমা (Income)' : '- খরচ (Expense)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium max-w-xs">
                        <div className="font-semibold flex flex-wrap items-center gap-1.5">
                          <span>{tx.title}</span>
                          {tx._pendingSync && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              <Clock className="w-2.5 h-2.5" />
                              অফলাইন · সিঙ্ক বাকি
                            </span>
                          )}
                        </div>
                        {tx.note && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                            নোট: {tx.note}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {tx.id}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-sm sm:text-base">
                        <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                        {tx.paymentMethod === 'bkash' ? 'বিকাশ (bKash)' : tx.paymentMethod === 'nagad' ? 'নগদ (Nagad)' : tx.paymentMethod === 'bank' ? 'ব্যাংক' : 'নগদ ক্যাশ'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="font-medium text-xs">{tx.addedBy}</div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isStaffRole ? (
                          <span
                            className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
                            title="কোনো এন্ট্রি এডিট বা ডিলিট শুধুমাত্র অ্যাডমিন করতে পারবেন"
                          >
                            সংরক্ষিত (শুধু এডমিন)
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onEditTransaction(tx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                              title="সম্পাদনা করুন"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {isAdminOnly && (
                              <button
                                onClick={() => {
                                  if (confirm(`আপনি কি নিশ্চিতভাবে "${tx.title}" লেনদেনটি মুছে ফেলতে চান?`)) {
                                    onDeleteTransaction(tx.id);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors"
                                title="মুছে ফেলুন (শুধুমাত্র অ্যাডমিন)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print & PDF Publication Studio Modal for Ledger */}
      <PrintStudioModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        documentTitle={`দৈনিক আয়-ব্যয় খাতা (${toBengaliNumber(filteredList.length)} টি রেকর্ড)`}
        fileNamePrefix={`DIP-BHOLA-Ledger-${todayStr}`}
        summaryText={[
          `📒 *${company?.name || 'DIP BHOLA NETWORK'} — আয়-ব্যয় লেনদেন খাতা*`,
          `👤 ব্যবহারকারী: ${currentUser.name}`,
          `📝 রেকর্ড সংখ্যা: ${filteredList.length} টি`,
          `➕ মোট জমা: ৳ ${totals.income.toLocaleString()}`,
          `➖ মোট খরচ: ৳ ${totals.expense.toLocaleString()}`,
          `💰 নিট ব্যালেন্স: ৳ ${totals.net.toLocaleString()}`
        ].join('\n')}
        whatsappGroupConfig={whatsappGroupConfig}
      >
        <div className="bg-white text-slate-900 space-y-4">
          <div data-print-section="header" className="border-b-2 border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900">{company?.name || 'DIP BHOLA NETWORK'}</h1>
              <p className="text-[11px] text-slate-600 font-semibold">{company?.subTitle || 'দৈনিক আয়-ব্যয় খাতা ও হিসাব বিবরণী'}</p>
              <p className="text-[10px] text-slate-500">ঠিকানা: {company?.address || '৩নং পশ্চিম ইলিশা, ভোলা সদর'}</p>
            </div>
            <div className="text-right text-[11px] text-slate-700">
              <div className="font-bold text-slate-900">লেনদেনের প্রিন্ট কপি</div>
              <div>তারিখ: <strong>{formatBengaliDate(todayStr)}</strong></div>
              <div>প্রস্তুতকারী: <strong>{currentUser.name}</strong></div>
            </div>
          </div>

          <div data-print-section="summary" className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 border border-slate-300 rounded">
              <div className="text-[10px] text-slate-500 font-bold">মোট রেকর্ড</div>
              <div className="text-sm font-black text-slate-900">{toBengaliNumber(filteredList.length)} টি</div>
            </div>
            <div className="p-2 border border-slate-300 rounded">
              <div className="text-[10px] text-slate-500 font-bold">মোট জমা</div>
              <div className="text-sm font-black text-emerald-700">{formatCurrency(totals.income)}</div>
            </div>
            <div className="p-2 border border-slate-300 rounded">
              <div className="text-[10px] text-slate-500 font-bold">মোট খরচ</div>
              <div className="text-sm font-black text-rose-700">{formatCurrency(totals.expense)}</div>
            </div>
            <div className="p-2 border border-slate-300 rounded">
              <div className="text-[10px] text-slate-500 font-bold">নিট ব্যালেন্স</div>
              <div className="text-sm font-black text-slate-900">{formatCurrency(totals.net)}</div>
            </div>
          </div>

          <table className="w-full text-[10px] text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold">
                <th className="p-1.5 border border-slate-300 text-center">নং</th>
                <th className="p-1.5 border border-slate-300">তারিখ</th>
                <th className="p-1.5 border border-slate-300">ধরন</th>
                <th className="p-1.5 border border-slate-300">বিবরণ / খাত</th>
                <th className="p-1.5 border border-slate-300">ক্যাটাগরি</th>
                <th className="p-1.5 border border-slate-300 text-right">পরিমাণ</th>
                <th className="p-1.5 border border-slate-300">পেমেন্ট</th>
                <th className="p-1.5 border border-slate-300">এন্ট্রিদাতা</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-400">কোনো লেনদেন পাওয়া যায়নি।</td>
                </tr>
              ) : (
                filteredList.map((tx, idx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <tr key={tx.id}>
                      <td className="p-1 border border-slate-300 text-center">{toBengaliNumber(idx + 1)}</td>
                      <td className="p-1 border border-slate-300">{tx.date}</td>
                      <td className={`p-1 border border-slate-300 font-bold ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isIncome ? 'জমা' : 'খরচ'}
                      </td>
                      <td className="p-1 border border-slate-300 font-semibold text-slate-900">
                        {tx.title}
                        {tx.note && <div className="text-[9px] text-slate-500 font-normal">নোট: {tx.note}</div>}
                      </td>
                      <td className="p-1 border border-slate-300">{tx.category}</td>
                      <td className={`p-1 border border-slate-300 text-right font-bold ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="p-1 border border-slate-300">
                        {tx.paymentMethod === 'bkash' ? 'বিকাশ' : tx.paymentMethod === 'nagad' ? 'নগদ' : tx.paymentMethod === 'bank' ? 'ব্যাংক' : 'ক্যাশ'}
                      </td>
                      <td className="p-1 border border-slate-300">{tx.addedBy}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div data-print-section="signatures" className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">এন্ট্রিদাতা / স্টাফ স্বাক্ষর</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">পরিচালক / ম্যানেজার অনুমোদন</div>
            </div>
          </div>
        </div>
      </PrintStudioModal>
    </div>
  );
};
