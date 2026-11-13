import React, { useState } from 'react';
import {
  Shield,
  X,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  Trash2,
  Edit,
  PlusCircle,
  AlertTriangle,
  FileText,
  UserCheck
} from 'lucide-react';
import { AuditLog, UserSession } from '../types';
import { formatBengaliDate, toBengaliNumber } from '../utils/formatters';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  currentUser: UserSession;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter((log) => {
    const matchSearch =
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.performedBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actionBengali || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchAction =
      actionFilter === 'all' ||
      (actionFilter === 'delete' && log.action.includes('delete')) ||
      (actionFilter === 'transaction' && log.action.includes('transaction')) ||
      (actionFilter === 'staff' && log.action.includes('staff')) ||
      (actionFilter === 'security' && (log.action.includes('security') || log.action.includes('officer')));

    return matchSearch && matchAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('delete')) {
      return {
        bg: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
        icon: Trash2
      };
    }
    if (action.includes('edit') || action.includes('update')) {
      return {
        bg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
        icon: Edit
      };
    }
    if (action.includes('add')) {
      return {
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
        icon: PlusCircle
      };
    }
    if (action.includes('officer')) {
      return {
        bg: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
        icon: UserCheck
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      icon: Activity
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03291d] to-[#064e3b] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800/80 border border-emerald-600 flex items-center justify-center text-emerald-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>নিরাপত্তা ও অডিট লগ (Audit Log)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black">
                  লাইভ সিকিউরিটি
                </span>
              </h2>
              <p className="text-xs text-emerald-200">
                মুছে ফেলা লেনদেন, আপডেট, কর্মী নিয়োগ ও পরিচালনা সংক্রান্ত সকল গুরুত্বপূর্ণ কার্যক্রমের স্থায়ী ইতিহাস
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="অডিট রেকর্ড খুঁজুন (বিবরণ, কর্মী, অ্যাকশন)..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActionFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                actionFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              সকল কার্যক্রম ({toBengaliNumber(auditLogs.length)})
            </button>
            <button
              onClick={() => setActionFilter('delete')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                actionFilter === 'delete'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              মুছে ফেলা ({toBengaliNumber(auditLogs.filter((l) => l.action.includes('delete')).length)})
            </button>
            <button
              onClick={() => setActionFilter('transaction')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                actionFilter === 'transaction'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              লেনদেন হিসাব
            </button>
            <button
              onClick={() => setActionFilter('staff')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                actionFilter === 'staff'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              স্টাফ পরিবর্তন
            </button>
          </div>
        </div>

        {/* List of Audit Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">কোনো অডিট রেকর্ড পাওয়া যায়নি।</p>
              <p className="text-xs mt-1 text-slate-500">
                যেকোনো গুরুত্বপূর্ণ অ্যাকশন (যেমন লেনদেন ডিলিট বা এডিট) স্বয়ংক্রিয়ভাবে এখানে সংরক্ষিত হয়।
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const Icon = badge.icon;
              const dateObj = new Date(log.timestamp);
              const timeStr = dateObj.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
              const dateStr = formatBengaliDate(log.timestamp.split('T')[0]);

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${badge.bg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}>
                          {log.actionBengali}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {log.details}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>সম্পাদনকারী: {log.performedBy}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                            {log.role}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-xs text-slate-500 dark:text-slate-400 flex sm:flex-col items-center sm:items-end gap-1.5 sm:gap-0.5 self-end sm:self-center font-mono">
                    <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {timeStr}
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans">{dateStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>মোট রেকর্ড: {toBengaliNumber(filteredLogs.length)} টি</span>
          <span>শুধুমাত্র পরিচালক ও ম্যানেজারের দৃশ্যমান</span>
        </div>
      </div>
    </div>
  );
};
