import React, { useState, useEffect } from 'react';
import {
  CustomerComplaint,
  Staff,
  UserSession,
  ComplaintPriority,
  ComplaintStatus,
  Company,
  WhatsAppGroupConfig
} from '../types';
import {
  X,
  AlertCircle,
  Phone,
  MapPin,
  Hash,
  User,
  FileText,
  Wrench,
  CheckCircle2,
  MessageCircle,
  Copy,
  Check,
  Send,
  ExternalLink
} from 'lucide-react';
import {
  formatComplaintGroupSms,
  buildWhatsAppShareUrl,
  buildDeviceSmsUrl,
  openAnchorLinkSafely,
  dispatchComplaintToWebhook
} from '../utils/complaintWhatsApp';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (complaint: Omit<CustomerComplaint, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  editingComplaint: CustomerComplaint | null;
  staffs: Staff[];
  currentUser: UserSession;
  company?: Company | null;
  whatsappGroupConfig?: WhatsAppGroupConfig | null;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingComplaint,
  staffs,
  currentUser,
  company,
  whatsappGroupConfig
}) => {
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [complainDetails, setComplainDetails] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('normal');
  const [status, setStatus] = useState<ComplaintStatus>('pending');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [sendToWhatsAppGroup, setSendToWhatsAppGroup] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSmsText, setSavedSmsText] = useState<string | null>(null);
  const [copiedSms, setCopiedSms] = useState(false);
  const [webhookSent, setWebhookSent] = useState(false);

  useEffect(() => {
    setSavedSmsText(null);
    setCopiedSms(false);
    setWebhookSent(false);
    if (editingComplaint) {
      setName(editingComplaint.name || '');
      setIdNumber(editingComplaint.idNumber || '');
      setMobileNumber(editingComplaint.mobileNumber || '');
      setAddress(editingComplaint.address || '');
      setComplainDetails(editingComplaint.complainDetails || '');
      setPriority(editingComplaint.priority || 'normal');
      setStatus(editingComplaint.status || 'pending');
      setAssignedStaffId(editingComplaint.assignedStaffId || '');
      setResolutionNote(editingComplaint.resolutionNote || '');
      setSendToWhatsAppGroup(false);
    } else {
      setName('');
      const randNum = Math.floor(100 + Math.random() * 900);
      setIdNumber(`DBN-${randNum}`);
      setMobileNumber('');
      setAddress('');
      setComplainDetails('');
      setPriority('normal');
      setStatus('pending');
      setAssignedStaffId(currentUser.role === 'staff' ? currentUser.id : '');
      setResolutionNote('');
      setSendToWhatsAppGroup(whatsappGroupConfig?.autoOpenWhatsAppOnSubmit ?? true);
    }
    setErrorMsg('');
  }, [editingComplaint, isOpen, currentUser.id, currentUser.role, whatsappGroupConfig?.autoOpenWhatsAppOnSubmit]);

  if (!isOpen) return null;

  const companyName = company?.name || 'DIP BHOLA NETWORK';
  const groupName = whatsappGroupConfig?.groupName || 'DIP BHOLA NETWORK - Complain Group';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('অনুগ্রহ করে গ্রাহকের নাম লিখুন');
      return;
    }
    if (!idNumber.trim()) {
      setErrorMsg('অনুগ্রহ করে আইডি নম্বর লিখুন');
      return;
    }
    if (!mobileNumber.trim()) {
      setErrorMsg('অনুগ্রহ করে মোবাইল নম্বর লিখুন');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('অনুগ্রহ করে গ্রাহকের ঠিকানা / এলাকা লিখুন');
      return;
    }
    if (!complainDetails.trim()) {
      setErrorMsg('অনুগ্রহ করে অভিযোগের বিস্তারিত বিবরণ লিখুন');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const selectedStaff = staffs.find((s) => s.id === assignedStaffId);
      const assignedName =
        selectedStaff?.name ||
        (currentUser.role === 'staff' && assignedStaffId === currentUser.id ? currentUser.name : undefined);

      const payload: Omit<CustomerComplaint, 'id' | 'createdAt'> & { id?: string } = {
        ...(editingComplaint?.id ? { id: editingComplaint.id } : {}),
        name: name.trim(),
        idNumber: idNumber.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        complainDetails: complainDetails.trim(),
        status,
        priority,
        ...(assignedStaffId ? { assignedStaffId } : {}),
        ...(assignedName ? { assignedStaffName: assignedName } : {}),
        reportedBy: editingComplaint?.reportedBy || currentUser.name,
        reportedById: editingComplaint?.reportedById || currentUser.id,
        ...(resolutionNote.trim() ? { resolutionNote: resolutionNote.trim() } : {}),
        ...(status === 'resolved'
          ? { resolvedAt: editingComplaint?.resolvedAt || new Date().toISOString() }
          : {})
      };

      await onSave(payload);

      const smsText = formatComplaintGroupSms(
        { ...payload, createdAt: editingComplaint?.createdAt || new Date().toISOString() },
        companyName,
        groupName
      );

      // Fire optional external WhatsApp bot/gateway webhook asynchronously without blocking UI
      if (whatsappGroupConfig?.webhookUrl) {
        dispatchComplaintToWebhook(whatsappGroupConfig, payload, smsText)
          .then((ok) => {
            if (ok) setWebhookSent(true);
          })
          .catch(() => {});
      }

      if (sendToWhatsAppGroup) {
        setSavedSmsText(smsText);
        // Trigger WhatsApp safely; user also has direct 1-tap WhatsApp Group SMS button on screen
        try {
          openAnchorLinkSafely(buildWhatsAppShareUrl(smsText));
        } catch {
          // ignore popup block; post-save button handles manual 1-tap cleanly
        }
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error saving complaint:', err);
      const errMessage = err instanceof Error ? err.message : '';
      setErrorMsg(
        errMessage
          ? `অভিযোগ সংরক্ষণ করতে সমস্যা হয়েছে: ${errMessage}`
          : 'অভিযোগ সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySavedSms = () => {
    if (!savedSmsText) return;
    navigator.clipboard.writeText(savedSmsText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  const quickSymptoms = [
    'ইন্টারনেট সংযোগ সম্পূর্ণ বিচ্ছিন্ন (লাল বাতি জ্বলছে)',
    'অপটিক্যাল ফাইবার ড্রপ ক্যাবল কাটা পড়েছে',
    'নেট ব্রাউজিং স্পিড অত্যন্ত ধীরগতি',
    'রাউটারে পাওয়ার আসছে কিন্তু ইন্টারনেট কানেক্ট হচ্ছে না',
    'কানেকশন ঘন ঘন ড্রপ বা ডিসকানেক্ট হচ্ছে',
    'নতুন রাউটার কনফিগারেশন ও আইপি রিবাইন্ডিং প্রয়োজন'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <Wrench className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {savedSmsText
                  ? 'অভিযোগ সংরক্ষিত হয়েছে · WhatsApp SMS'
                  : editingComplaint
                  ? 'গ্রাহক অভিযোগ সংশোধন'
                  : 'নতুন গ্রাহক অভিযোগ এন্ট্রি'}
              </h2>
              <p className="text-xs text-emerald-100">
                কাস্টমার কমপ্লেইন ও সরাসরি WhatsApp SMS গ্রুপে পাঠান
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post-Save WhatsApp SMS Group Dispatch Screen */}
        {savedSmsText ? (
          <div className="p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  {typeof navigator !== 'undefined' && !navigator.onLine
                    ? 'অফলাইনে অভিযোগটি নিরাপদে সংরক্ষিত হয়েছে!'
                    : 'অভিযোগটি সফলভাবে সেভ হয়েছে!'}
                </div>
                <div className="text-xs mt-0.5 text-emerald-800 dark:text-emerald-300">
                  {typeof navigator !== 'undefined' && !navigator.onLine
                    ? 'ইন্টারনেট সংযোগ আসলেই এই অভিযোগটি অটোমেটিক অনলাইনে সেভ হয়ে যাবে। চাইলে নিচের বাটনে SMS কপি বা পাঠাতে পারেন।'
                    : webhookSent
                    ? 'আপনার অটো-বট ওয়েবহুকের মাধ্যমে SMS পাঠানো হয়েছে এবং নিচের বাটন থেকেও WhatsApp গ্রুপে পাঠানো যাবে।'
                    : `এখন নিচের সবুজ বাটনে চাপলেই WhatsApp খুলবে—আপনার "${groupName}" গ্রুপটি সিলেক্ট করে Send চাপুন।`}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                WhatsApp গ্রুপ SMS প্রিভিউ:
              </label>
              <pre className="whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 font-sans leading-relaxed max-h-56 overflow-y-auto">
                {savedSmsText}
              </pre>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <a
                href={buildWhatsAppShareUrl(savedSmsText)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[200px] py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp গ্রুপে SMS পাঠান</span>
              </a>

              {whatsappGroupConfig?.groupInviteLink && (
                <a
                  href={whatsappGroupConfig.groupInviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>গ্রুপ খুলুন</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleCopySavedSms}
                className="py-3 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                {copiedSms ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSms ? 'কপি হয়েছে!' : 'SMS কপি'}</span>
              </button>

              <a
                href={buildDeviceSmsUrl(savedSmsText, whatsappGroupConfig?.smsAlertPhone)}
                className="py-3 px-3.5 rounded-xl bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ফোন SMS</span>
              </a>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl"
              >
                সম্পন্ন ও বন্ধ করুন
              </button>
            </div>
          </div>
        ) : (
          /* Modal Form Body */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Customer Name (গ্রাহকের নাম) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  গ্রাহকের নাম (Name) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মোঃ হোসেন / হারুন"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* 2. Customer ID / Line ID (আইডি নম্বর) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  আইডি নম্বর (ID Number) *
                </label>
                <input
                  type="text"
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="যেমন: DBN-101 / 1024"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              {/* 3. Mobile Number (মোবাইল নম্বর) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  মোবাইল নম্বর (Mobile Number) *
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="যেমন: 01721200049"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* 4. Address / Area (ঠিকানা) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ঠিকানা / এলাকা (Address) *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: বিশ্বরোড মোড় / বাপ্তা / ভোলা সদর"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* 5. Complain Details (অভিযোগের বিবরণ) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                অভিযোগের বিবরণ (Complain Details) *
              </label>
              <textarea
                required
                rows={3}
                value={complainDetails}
                onChange={(e) => setComplainDetails(e.target.value)}
                placeholder="গ্রাহকের ইন্টারনেট সমস্যা বা লাইনের বিস্তারিত বিবরণ লিখুন..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
              {/* Quick symptom picker */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 self-center">দ্রুত নির্বাচন:</span>
                {quickSymptoms.map((sym, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setComplainDetails(sym)}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition-colors"
                  >
                    {sym.length > 25 ? sym.slice(0, 25) + '...' : sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority & Status & Assigned Staff */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  অগ্রাধিকার (Priority)
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="normal">🔵 সাধারণ (Normal - Blue)</option>
                  <option value="urgent">🟠 জরুরি (Urgent - Orange)</option>
                  <option value="critical">🔴 অতি জরুরি (Critical - Red)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  স্ট্যাটাস (Status)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="pending">⏳ পেন্ডিং (Pending)</option>
                  <option value="in_progress">🔧 কাজ চলছে (In Progress)</option>
                  <option value="resolved">✅ সমাধানকৃত (Resolved)</option>
                </select>
              </div>

              {/* Assigned Staff (Director/Manager only; Staff keeps self assignment) */}
              {currentUser.role !== 'staff' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    দায়িত্বপ্রাপ্ত টেকনিশিয়ান
                  </label>
                  <select
                    value={assignedStaffId}
                    onChange={(e) => setAssignedStaffId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">-- কাউকে নিয়োগ দেওয়া হয়নি --</option>
                    {staffs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.designation || 'টেকনিশিয়ান'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Resolution Note (shown if resolving or edit) */}
            {(status === 'resolved' || editingComplaint?.resolutionNote) && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  সমাধানের বিবরণ ও ফলাফল (Resolution Note)
                </label>
                <input
                  type="text"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="যেমন: ফাইবার স্প্লাইসিং সম্পন্ন, সিগন্যাল ওকে, নেট চালু হয়েছে।"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            )}

            {/* WhatsApp SMS Group Auto-Send Option */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#25D366] text-slate-950 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    সংরক্ষণের পর WhatsApp SMS গ্রুপে পাঠান
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    টার্গেট গ্রুপ: {groupName}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={sendToWhatsAppGroup}
                onChange={(e) => setSendToWhatsAppGroup(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting
                  ? 'সংরক্ষণ হচ্ছে...'
                  : editingComplaint
                  ? 'আপডেট করুন'
                  : sendToWhatsAppGroup
                  ? 'দাখিল ও গ্রুপে SMS পাঠান'
                  : 'অভিযোগ দাখিল করুন'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

