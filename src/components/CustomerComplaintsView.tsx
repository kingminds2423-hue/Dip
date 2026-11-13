import React, { useState, useMemo, useEffect } from 'react';
import {
  CustomerComplaint,
  Staff,
  UserSession,
  ComplaintStatus,
  ComplaintPriority,
  Company,
  WhatsAppGroupConfig
} from '../types';
import {
  Wrench,
  Search,
  Filter,
  Plus,
  Phone,
  MessageCircle,
  MapPin,
  Hash,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Edit2,
  Trash2,
  UserCheck,
  User,
  Printer,
  Receipt,
  Info,
  Settings,
  Send,
  Copy,
  Check,
  ExternalLink,
  Users
} from 'lucide-react';
import {
  formatComplaintGroupSms,
  formatMultipleComplaintsGroupSms,
  buildWhatsAppShareUrl,
  buildDeviceSmsUrl,
  openAnchorLinkSafely
} from '../utils/complaintWhatsApp';
import { formatBengaliDate, toBengaliNumber } from '../utils/formatters';
import { PrintStudioModal } from './PrintStudioModal';

interface CustomerComplaintsViewProps {
  complaints: CustomerComplaint[];
  staffs: Staff[];
  currentUser: UserSession;
  company?: Company | null;
  whatsappGroupConfig?: WhatsAppGroupConfig;
  onSaveWhatsAppGroupConfig?: (config: Partial<WhatsAppGroupConfig>) => Promise<void>;
  onOpenAddModal: () => void;
  onEditComplaint: (complaint: CustomerComplaint) => void;
  onDeleteComplaint: (id: string) => Promise<void>;
  onUpdateStatus: (id: string, newStatus: ComplaintStatus, resolutionNote?: string) => Promise<void>;
  onRecordLineExpense?: (complaint: CustomerComplaint) => void;
}

export const CustomerComplaintsView: React.FC<CustomerComplaintsViewProps> = ({
  complaints,
  staffs,
  currentUser,
  company,
  whatsappGroupConfig,
  onSaveWhatsAppGroupConfig,
  onOpenAddModal,
  onEditComplaint,
  onDeleteComplaint,
  onUpdateStatus,
  onRecordLineExpense
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ComplaintPriority>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [resolvingComplaintId, setResolvingComplaintId] = useState<string | null>(null);
  const [resolutionInput, setResolutionInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGroupSetupOpen, setIsGroupSetupOpen] = useState(false);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState(whatsappGroupConfig?.groupName || 'DIP BHOLA NETWORK - Complain Group');
  const [groupLinkInput, setGroupLinkInput] = useState(whatsappGroupConfig?.groupInviteLink || '');
  const [smsPhoneInput, setSmsPhoneInput] = useState(whatsappGroupConfig?.smsAlertPhone || '');
  const [autoOpenInput, setAutoOpenInput] = useState(whatsappGroupConfig?.autoOpenWhatsAppOnSubmit ?? true);
  const [webhookInput, setWebhookInput] = useState(whatsappGroupConfig?.webhookUrl || '');
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [groupSaveMsg, setGroupSaveMsg] = useState('');

  useEffect(() => {
    if (whatsappGroupConfig) {
      setGroupNameInput(whatsappGroupConfig.groupName || 'DIP BHOLA NETWORK - Complain Group');
      setGroupLinkInput(whatsappGroupConfig.groupInviteLink || '');
      setSmsPhoneInput(whatsappGroupConfig.smsAlertPhone || '');
      setAutoOpenInput(whatsappGroupConfig.autoOpenWhatsAppOnSubmit ?? true);
      setWebhookInput(whatsappGroupConfig.webhookUrl || '');
    }
  }, [whatsappGroupConfig]);

  // Permission checks
  const isAdminOnly = currentUser.role === 'director' || currentUser.role === 'admin';
  const isManagerOrDirector = isAdminOnly || currentUser.role === 'manager';
  const isStaffRole = currentUser.role === 'staff';

  // For Staff role, only show complaints assigned to them or reported by them
  const scopedComplaints = useMemo(() => {
    if (!isStaffRole) return complaints;
    return complaints.filter(
      (c) =>
        c.assignedStaffId === currentUser.id ||
        (c.assignedStaffName || '').trim() === currentUser.name.trim() ||
        c.reportedById === currentUser.id ||
        (c.reportedBy || '').trim() === currentUser.name.trim()
    );
  }, [complaints, isStaffRole, currentUser.id, currentUser.name]);

  // Metrics
  const totalCount = scopedComplaints.length;
  const pendingCount = scopedComplaints.filter((c) => c.status === 'pending').length;
  const inProgressCount = scopedComplaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = scopedComplaints.filter((c) => c.status === 'resolved').length;

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return scopedComplaints.filter((item) => {
      // Search matches name, idNumber, mobileNumber, address, complainDetails
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = (item.name || '').toLowerCase().includes(query);
        const matchesId = (item.idNumber || '').toLowerCase().includes(query);
        const matchesPhone = (item.mobileNumber || '').includes(query);
        const matchesAddress = (item.address || '').toLowerCase().includes(query);
        const matchesDetails = (item.complainDetails || '').toLowerCase().includes(query);
        const matchesStaff = (item.assignedStaffName || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesPhone && !matchesAddress && !matchesDetails && !matchesStaff) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false;
      }

      // Staff filter (Director/Manager only)
      if (!isStaffRole && staffFilter !== 'all') {
        if (staffFilter === 'unassigned' && item.assignedStaffId) return false;
        if (staffFilter !== 'unassigned' && item.assignedStaffId !== staffFilter) return false;
      }

      return true;
    });
  }, [scopedComplaints, isStaffRole, searchTerm, statusFilter, priorityFilter, staffFilter]);

  const handleQuickStatusChange = async (complaint: CustomerComplaint, nextStatus: ComplaintStatus) => {
    if (nextStatus === 'resolved') {
      setResolvingComplaintId(complaint.id);
      setResolutionInput(complaint.resolutionNote || 'সমস্যা সফলভাবে সমাধান করা হয়েছে।');
      return;
    }
    await onUpdateStatus(complaint.id, nextStatus);
  };

  const handleConfirmResolution = async (id: string, alsoSendGroupSms = false) => {
    const target = scopedComplaints.find((c) => c.id === id);
    const note = resolutionInput.trim();
    await onUpdateStatus(id, 'resolved', note);
    setResolvingComplaintId(null);
    setResolutionInput('');

    if (alsoSendGroupSms && target) {
      const resolvedSms = formatComplaintGroupSms(
        { ...target, status: 'resolved', resolutionNote: note },
        company?.name || 'DIP BHOLA NETWORK',
        whatsappGroupConfig?.groupName
      );
      openAnchorLinkSafely(buildWhatsAppShareUrl(resolvedSms));
    }
  };

  const handleSaveGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveWhatsAppGroupConfig) return;
    setIsSavingGroup(true);
    setGroupSaveMsg('');
    try {
      await onSaveWhatsAppGroupConfig({
        groupName: groupNameInput.trim() || 'DIP BHOLA NETWORK - Complain Group',
        groupInviteLink: groupLinkInput.trim(),
        smsAlertPhone: smsPhoneInput.trim(),
        autoOpenWhatsAppOnSubmit: autoOpenInput,
        webhookUrl: webhookInput.trim(),
        updatedBy: currentUser.name
      });
      setGroupSaveMsg('WhatsApp SMS গ্রুপ সেটিংস সংরক্ষিত হয়েছে!');
      setTimeout(() => {
        setGroupSaveMsg('');
        setIsGroupSetupOpen(false);
      }, 1200);
    } finally {
      setIsSavingGroup(false);
    }
  };

  const companyName = company?.name || 'DIP BHOLA NETWORK';
  const activeGroupName = whatsappGroupConfig?.groupName || 'DIP BHOLA NETWORK - Complain Group';

  const handleCopyComplaintSms = (item: CustomerComplaint) => {
    const sms = formatComplaintGroupSms(item, companyName, activeGroupName);
    navigator.clipboard.writeText(sms);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const bulkPendingSms = useMemo(
    () => formatMultipleComplaintsGroupSms(scopedComplaints, companyName, activeGroupName),
    [scopedComplaints, companyName, activeGroupName]
  );

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // Distinct color-coded priority badge renderer:
  // Red for critical, Orange for urgent, Blue for normal
  const renderPriorityBadge = (priority: ComplaintPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black tracking-wide bg-red-500/15 text-red-700 dark:text-red-300 border border-red-400/40 dark:border-red-500/50 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
            <span>অতি জরুরি (Critical)</span>
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-orange-400/40 dark:border-orange-500/50 shadow-xs">
            <span className="inline-flex rounded-full h-2 w-2 bg-orange-500" />
            <AlertCircle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
            <span>জরুরি (Urgent)</span>
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/40 dark:border-blue-500/50 shadow-xs">
            <span className="inline-flex rounded-full h-2 w-2 bg-blue-500" />
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>সাধারণ (Normal)</span>
          </span>
        );
    }
  };

  const getPriorityBorderClass = (priority: ComplaintPriority) => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-l-red-500';
      case 'urgent':
        return 'border-l-4 border-l-orange-500';
      case 'normal':
      default:
        return 'border-l-4 border-l-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-xs mb-2 border border-emerald-400/20">
              <Wrench className="w-3.5 h-3.5" />
              <span>DIP BHOLA NETWORK • হেল্পডেস্ক ও অভিযোগ ট্র্যাকিং</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              গ্রাহক অভিযোগ ব্যবস্থাপনা (Complain System)
            </h1>
            <p className="text-sm text-emerald-100/90 mt-1">
              গ্রাহকের নাম, আইডি, মোবাইল নম্বর, ঠিকানা ও লাইনের সমস্যার লাইভ রেকর্ড ও সমাধান মনিটরিং
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {scopedComplaints.length > 0 && (
              <a
                href={buildWhatsAppShareUrl(bulkPendingSms)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs transition-colors flex items-center gap-1.5 shadow-md"
                title="চলমান সব অভিযোগ একসাথে WhatsApp SMS গ্রুপে পাঠান"
              >
                <MessageCircle className="w-4 h-4" />
                <span>গ্রুপে সব পেন্ডিং SMS</span>
              </a>
            )}

            {isAdminOnly && onSaveWhatsAppGroupConfig && (
              <button
                type="button"
                onClick={() => setIsGroupSetupOpen((prev) => !prev)}
                className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 border border-white/15"
                title="WhatsApp SMS গ্রুপ লিংক ও সেটিংস নির্ধারণ করুন"
              >
                <Settings className="w-4 h-4 text-amber-300" />
                <span>WhatsApp গ্রুপ সেটআপ</span>
              </button>
            )}

            <button
              onClick={() => setIsPrintStudioOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 border border-white/10"
              title="A4/Legal প্রিন্ট, PDF ডাউনলোড, PDF Reader ও WhatsApp/Gmail শেয়ার"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>প্রিন্ট / PDF</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>নতুন অভিযোগ এন্ট্রি</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-700/40">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] text-emerald-200 font-medium">মোট অভিযোগ</div>
            <div className="text-2xl font-black mt-0.5">{totalCount}</div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">সর্বমোট রেকর্ড</div>
          </div>

          <div className="bg-amber-500/15 backdrop-blur-xs rounded-2xl p-3 border border-amber-400/30">
            <div className="text-[11px] text-amber-200 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              পেন্ডিং / বাকি
            </div>
            <div className="text-2xl font-black text-amber-300 mt-0.5">{pendingCount}</div>
            <div className="text-[10px] text-amber-200/80 mt-0.5">সমাধানের অপেক্ষায়</div>
          </div>

          <div className="bg-blue-500/15 backdrop-blur-xs rounded-2xl p-3 border border-blue-400/30">
            <div className="text-[11px] text-blue-200 font-medium">কাজ চলছে (Progress)</div>
            <div className="text-2xl font-black text-blue-300 mt-0.5">{inProgressCount}</div>
            <div className="text-[10px] text-blue-200/80 mt-0.5">টেকনিশিয়ান ফিল্ডে কর্মরত</div>
          </div>

          <div className="bg-emerald-500/15 backdrop-blur-xs rounded-2xl p-3 border border-emerald-400/30">
            <div className="text-[11px] text-emerald-200 font-medium">সমাধানকৃত (Resolved)</div>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">{resolvedCount}</div>
            <div className="text-[10px] text-emerald-200/80 mt-0.5">সফলভাবে সমাধান সম্পন্ন</div>
          </div>
        </div>
      </div>

      {/* Active WhatsApp Complain SMS Group Banner */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366] text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200">
                WhatsApp SMS গ্রুপ: {activeGroupName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                {(whatsappGroupConfig?.autoOpenWhatsAppOnSubmit ?? true)
                  ? 'অভিযোগ এন্ট্রিতে অটো SMS চালু'
                  : 'ম্যানুয়াল SMS'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
              অভিযোগ দাখিল বা সমাধানের সাথে সাথে সাজানো SMS তৈরি হয় — WhatsApp এ গিয়ে আপনার গ্রুপ সিলেক্ট করে ১ ক্লিকেই Send করুন।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {whatsappGroupConfig?.groupInviteLink && (
            <a
              href={whatsappGroupConfig.groupInviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>কমপ্লেইন গ্রুপ ওপেন</span>
            </a>
          )}

          {whatsappGroupConfig?.staffGroupInviteLink && (
            <a
              href={whatsappGroupConfig.staffGroupInviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>স্টাফ গ্রুপ</span>
            </a>
          )}

          {isAdminOnly && onSaveWhatsAppGroupConfig && (
            <button
              type="button"
              onClick={() => setIsGroupSetupOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{isGroupSetupOpen ? 'সেটআপ বন্ধ করুন' : 'সেটআপ পরিবর্তন'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Admin WhatsApp Group Setup Drawer */}
      {isGroupSetupOpen && isAdminOnly && onSaveWhatsAppGroupConfig && (
        <form
          onSubmit={handleSaveGroupSettings}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-[#25D366]/50 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                WhatsApp Complain SMS Group সেটিংস
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                এখানে সেভ করা গ্রুপের নাম, ইনভাইট লিংক ও বট ওয়েবহুক সব স্টাফ ও ম্যানেজারের অভিযোগ SMS-এ ব্যবহৃত হবে।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp গ্রুপের নাম
              </label>
              <input
                type="text"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="যেমন: DIP BHOLA NETWORK - Complain Group"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp গ্রুপ ইনভাইট লিংক (ঐচ্ছিক)
              </label>
              <input
                type="url"
                value={groupLinkInput}
                onChange={(e) => setGroupLinkInput(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                বিকল্প জরুরি ফোন SMS নম্বর (ঐচ্ছিক)
              </label>
              <input
                type="tel"
                value={smsPhoneInput}
                onChange={(e) => setSmsPhoneInput(e.target.value)}
                placeholder="যেমন: 017XXXXXXXX (ফোন SMS বাটনের জন্য)"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                অটো WhatsApp Bot Webhook URL (ঐচ্ছিক - এডভান্সড)
              </label>
              <input
                type="url"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="https://your-bot-gateway.example/send-group"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoOpenInput}
              onChange={(e) => setAutoOpenInput(e.target.checked)}
              className="w-4 h-4 accent-[#25D366] rounded"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              নতুন অভিযোগ সংরক্ষণের সাথে সাথে WhatsApp SMS গ্রুপে পাঠানোর প্রম্পট অটো-ওপেন করুন
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>
              {groupSaveMsg && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {groupSaveMsg}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsGroupSetupOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSavingGroup}
                className="px-4 py-2 text-xs font-black text-slate-950 bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-60 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingGroup ? 'সংরক্ষণ হচ্ছে...' : 'গ্রুপ সেটিংস সেভ করুন'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="গ্রাহকের নাম, আইডি নম্বর, মোবাইল, এলাকা বা অভিযোগের বিবরণ দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1"
              >
                মুছুন
              </button>
            )}
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সব ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              পেন্ডিং ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
              }`}
            >
              কাজ চলছে ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              সমাধানকৃত ({resolvedCount})
            </button>
          </div>
        </div>

        {/* Secondary Filters: Priority & Assigned Staff */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">ফিল্টার:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">অগ্রাধিকার:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none font-medium"
            >
              <option value="all">সব অগ্রাধিকার (All Priorities)</option>
              <option value="critical">🔴 অতি জরুরি (Critical - Red)</option>
              <option value="urgent">🟠 জরুরি (Urgent - Orange)</option>
              <option value="normal">🔵 সাধারণ (Normal - Blue)</option>
            </select>
          </div>

          {isManagerOrDirector && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">টেকনিশিয়ান:</span>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="all">সকল টেকনিশিয়ান</option>
                <option value="unassigned">দায়িত্ব নির্ধারণ হয়নি</option>
                {staffs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || staffFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setStaffFilter('all');
              }}
              className="ml-auto text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
            >
              ফিল্টার রিসেট করুন
            </button>
          )}
        </div>
      </div>

      {/* Complaints Cards List */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">কোনো অভিযোগ পাওয়া যায়নি</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'আপনার অনুসন্ধান বা ফিল্টারের সাথে মিলে এমন কোনো গ্রাহক অভিযোগ নেই।'
              : 'গ্রাহকের যেকোনো নেটওয়ার্ক বা লাইন সমস্যা দ্রুত রেকর্ড করতে নতুন অভিযোগ এন্ট্রি দিন।'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>প্রথম অভিযোগ যোগ করুন</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredComplaints.map((item) => {
            const isResolved = item.status === 'resolved';
            const isInProgress = item.status === 'in_progress';
            const isPending = item.status === 'pending';

            const cleanPhone = (item.mobileNumber || '').replace(/[^\d]/g, '');
            const waPhone = cleanPhone.startsWith('88')
              ? cleanPhone
              : cleanPhone.startsWith('0')
              ? `88${cleanPhone}`
              : `880${cleanPhone}`;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${getPriorityBorderClass(
                  item.priority
                )} ${
                  isPending
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : isInProgress
                    ? 'border-blue-300 dark:border-blue-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Card Top: ID, Priority, and Status Badge */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1">
                        <Hash className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {item.idNumber}
                      </span>

                      {/* Distinct color-coded Priority Badge: Red for critical, Orange for urgent, Blue for normal */}
                      {renderPriorityBadge(item.priority)}

                      {item._pendingSync && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <Clock className="w-2.5 h-2.5" />
                          অফলাইন · সিঙ্ক বাকি
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-400/40 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          পেন্ডিং
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-400/40 flex items-center gap-1.5">
                          <Wrench className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
                          কাজ চলছে
                        </span>
                      )}
                      {isResolved && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-400/40 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          সমাধানকৃত
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Name & Direct Call / WhatsApp */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{item.name}</span>
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{item.address}</span>
                      </div>
                    </div>

                    {/* Direct Contact Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.mobileNumber && (
                        <>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                            title={`সরাসরি কল করুন: ${item.mobileNumber}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                              `আসসালামু আলাইকুম ${item.name}, আপনার DIP BHOLA NETWORK ইন্টারনেট অভিযোগ (${item.idNumber}) সংক্রান্ত বিষয়ে যোগাযোগ করছি।`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                            title="হোয়াটসঅ্যাপে মেসেজ পাঠান"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Complain Details */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      অভিযোগের বিবরণ (Problem Description):
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-line">
                      {item.complainDetails}
                    </p>
                  </div>

                  {/* Assigned Staff & Created Time */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 dark:text-slate-400">দায়িত্বপ্রাপ্ত:</span>
                      {item.assignedStaffName ? (
                        <span className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          {item.assignedStaffName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">নির্ধারণ করা হয়নি</span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>দাখিল: {formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Resolution Box if resolved */}
                  {isResolved && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        সমাধান সম্পন্ন ({item.resolvedAt ? formatDateTime(item.resolvedAt) : 'সম্পন্ন'})
                      </div>
                      {item.resolutionNote && (
                        <p className="text-emerald-900/90 dark:text-emerald-200/90 mt-0.5">
                          {item.resolutionNote}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quick Resolution inline input if resolving */}
                  {resolvingComplaintId === item.id && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-2">
                      <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        সমাধানের সংক্ষিপ্ত নোট লিখুন:
                      </label>
                      <input
                        type="text"
                        value={resolutionInput}
                        onChange={(e) => setResolutionInput(e.target.value)}
                        placeholder="যেমন: ফাইবার ড্রপ ক্যাবল রিপেয়ার সম্পন্ন, লাইন ওকে।"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setResolvingComplaintId(null)}
                          className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 rounded-lg"
                        >
                          বাতিল
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmResolution(item.id, false)}
                          className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                        >
                          সমাধান নিশ্চিত করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmResolution(item.id, true)}
                          className="px-3 py-1 text-xs font-bold text-slate-950 bg-[#25D366] hover:bg-[#20ba59] rounded-lg flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>সমাধান ও গ্রুপে SMS</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  {/* Status Toggle & WhatsApp Group SMS Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a
                      href={buildWhatsAppShareUrl(formatComplaintGroupSms(item, companyName, activeGroupName))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[11px] font-black bg-[#25D366] hover:bg-[#20ba59] text-slate-950 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      title="এই অভিযোগটি WhatsApp SMS গ্রুপে পাঠান"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>গ্রুপে SMS</span>
                    </a>

                    <a
                      href={buildDeviceSmsUrl(
                        formatComplaintGroupSms(item, companyName, activeGroupName),
                        whatsappGroupConfig?.smsAlertPhone
                      )}
                      className="px-2 py-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1"
                      title="ফোনের সাধারণ SMS অ্যাপ দিয়ে পাঠান"
                    >
                      <Send className="w-3 h-3" />
                      <span>SMS</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyComplaintSms(item)}
                      className="px-2 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-1"
                      title="অভিযোগের SMS কপি করুন"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === item.id ? 'কপি!' : 'কপি'}</span>
                    </button>

                    {isPending && (
                      <button
                        onClick={() => handleQuickStatusChange(item, 'in_progress')}
                        className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1"
                        title="কাজ শুরু করুন"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>কাজ শুরু</span>
                      </button>
                    )}

                    {(isPending || isInProgress) && (
                      <button
                        onClick={() => handleQuickStatusChange(item, 'resolved')}
                        className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1"
                        title="সমাধান হিসেবে চিহ্নিত করুন"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>সমাধান সম্পন্ন</span>
                      </button>
                    )}

                    {isResolved && (
                      <button
                        onClick={() => onUpdateStatus(item.id, 'pending')}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        title="পুনরায় পেন্ডিং করুন"
                      >
                        পুনরায় ওপেন করুন
                      </button>
                    )}

                    {/* Quick Line Expense Link */}
                    {onRecordLineExpense && (
                      <button
                        onClick={() => onRecordLineExpense(item)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/60 transition-colors flex items-center gap-1"
                        title="এই লাইনের জন্য কোনো খরচ (ক্যাবল, যাতায়াত) থাকলে দ্রুত এন্ট্রি দিন"
                      >
                        <Receipt className="w-3 h-3 text-amber-600" />
                        <span>লাইন খরচ এন্ট্রি</span>
                      </button>
                    )}
                  </div>

                  {/* Edit and Delete Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditComplaint(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                      title="অভিযোগের তথ্য এডিট করুন"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {isAdminOnly && (
                      <button
                        onClick={() => {
                          if (window.confirm(`আপনি কি নিশ্চিত যে "${item.name}" এর অভিযোগটি মুছে ফেলতে চান?`)) {
                            onDeleteComplaint(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="মুছে ফেলুন (শুধুমাত্র অ্যাডমিন)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print & PDF Publication Studio Modal for Customer Complaints */}
      <PrintStudioModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        documentTitle={`গ্রাহক অভিযোগ প্রতিবেদন (${toBengaliNumber(filteredComplaints.length)} টি)`}
        fileNamePrefix={`DIP-BHOLA-Complaints-${new Date().toISOString().split('T')[0]}`}
        summaryText={formatMultipleComplaintsGroupSms(filteredComplaints, companyName, activeGroupName)}
        whatsappGroupConfig={whatsappGroupConfig}
      >
        <div className="bg-white text-slate-900 space-y-4">
          <div data-print-section="header" className="border-b-2 border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900">{companyName}</h1>
              <p className="text-[11px] text-slate-600 font-semibold">গ্রাহক অভিযোগ (কমপ্লেইন) ও ফিল্ড সার্ভিস প্রতিবেদন</p>
              <p className="text-[10px] text-slate-500">ঠিকানা: {company?.address || '৩নং পশ্চিম ইলিশা, ভোলা সদর'} | মোবাইল: {company?.phone || '01721200049'}</p>
            </div>
            <div className="text-right text-[11px] text-slate-700">
              <div className="font-bold text-slate-900">অভিযোগ তালিকা</div>
              <div>তারিখ: <strong>{formatBengaliDate(new Date().toISOString().split('T')[0])}</strong></div>
              <div>গ্রুপ: <strong>{activeGroupName}</strong></div>
            </div>
          </div>

          <div data-print-section="summary" className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 border border-slate-300 rounded">
              <div className="text-[10px] text-slate-500 font-bold">মোট অভিযোগ</div>
              <div className="text-sm font-black text-slate-900">{toBengaliNumber(totalCount)} টি</div>
            </div>
            <div className="p-2 border border-slate-300 rounded">
              <div className="text-[10px] text-slate-500 font-bold">পেন্ডিং</div>
              <div className="text-sm font-black text-amber-700">{toBengaliNumber(pendingCount)} টি</div>
            </div>
            <div className="p-2 border border-slate-300 rounded">
              <div className="text-[10px] text-slate-500 font-bold">কাজ চলছে</div>
              <div className="text-sm font-black text-blue-700">{toBengaliNumber(inProgressCount)} টি</div>
            </div>
            <div className="p-2 border border-slate-300 rounded">
              <div className="text-[10px] text-slate-500 font-bold">সমাধান হয়েছে</div>
              <div className="text-sm font-black text-emerald-700">{toBengaliNumber(resolvedCount)} টি</div>
            </div>
          </div>

          <table className="w-full text-[10px] text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold">
                <th className="p-1.5 border border-slate-300 text-center">নং</th>
                <th className="p-1.5 border border-slate-300">আইডি</th>
                <th className="p-1.5 border border-slate-300">গ্রাহক ও মোবাইল</th>
                <th className="p-1.5 border border-slate-300">এলাকা / ঠিকানা</th>
                <th className="p-1.5 border border-slate-300">সমস্যার বিবরণ</th>
                <th className="p-1.5 border border-slate-300">টেকনিশিয়ান</th>
                <th className="p-1.5 border border-slate-300">অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-400">কোনো অভিযোগ পাওয়া যায়নি।</td>
                </tr>
              ) : (
                filteredComplaints.map((c, idx) => (
                  <tr key={c.id}>
                    <td className="p-1 border border-slate-300 text-center">{toBengaliNumber(idx + 1)}</td>
                    <td className="p-1 border border-slate-300 font-bold">#{c.idNumber}</td>
                    <td className="p-1 border border-slate-300">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[9px] text-slate-600">{c.mobileNumber}</div>
                    </td>
                    <td className="p-1 border border-slate-300">{c.address}</td>
                    <td className="p-1 border border-slate-300">
                      <div>{c.complainDetails}</div>
                      {c.resolutionNote && <div className="text-[9px] text-emerald-700 mt-0.5">সমাধান: {c.resolutionNote}</div>}
                    </td>
                    <td className="p-1 border border-slate-300">{c.assignedStaffName || '-'}</td>
                    <td className="p-1 border border-slate-300 font-bold">
                      {c.status === 'resolved' ? 'সমাধানকৃত' : c.status === 'in_progress' ? 'কাজ চলছে' : 'পেন্ডিং'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div data-print-section="signatures" className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">ফিল্ড টেকনিশিয়ান / ইনচার্জ</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">পরিচালক / ম্যানেজার স্বাক্ষর</div>
            </div>
          </div>
        </div>
      </PrintStudioModal>
    </div>
  );
};
