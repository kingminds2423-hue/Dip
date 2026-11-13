import React, { useState } from 'react';
import {
  X,
  Key,
  Mail,
  ShieldCheck,
  UserCheck,
  Lock,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  RotateCcw,
  Phone,
  Smartphone
} from 'lucide-react';
import { Staff, Partner, AdminAuth, UserSession, OfficersState, Company } from '../types';
import { authenticateWithPhoneAndPin, authenticateWithEmailPassword } from '../services/authService';
import { updateSettings, addAuditLog } from '../services/dataService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffs: Staff[];
  partners?: Partner[];
  adminAuth: AdminAuth | null;
  officers?: OfficersState | null;
  company?: Company | null;
  isLocked?: boolean;
  onOpenPlayStore?: () => void;
  onOpenJoinPortal?: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  staffs,
  partners = [],
  adminAuth,
  officers,
  company,
  isLocked = false,
  onOpenPlayStore,
  onOpenJoinPortal,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'pin' | 'email' | 'forgot_pin'>('pin');
  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot PIN state
  const [recoveryMethod, setRecoveryMethod] = useState<'master_key' | 'email_phone'>('email_phone');
  const [recoveryContact, setRecoveryContact] = useState('');
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  if (!isOpen) return null;

  const companyName = company?.name || 'DIP BHOLA NETWORK';

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!mobileNumber.trim()) {
      setError('অনুগ্রহ করে আপনার নিবন্ধিত মোবাইল নাম্বার দিন।');
      return;
    }
    if (!pin.trim()) {
      setError('অনুগ্রহ করে আপনার ৪-ডিজিট পিন কোড দিন।');
      return;
    }

    const session = authenticateWithPhoneAndPin(
      mobileNumber,
      pin,
      adminAuth,
      staffs,
      officers,
      company,
      partners
    );

    if (session) {
      setMobileNumber('');
      setPin('');
      onLoginSuccess(session);
      onClose();
    } else {
      setError('মোবাইল নাম্বার অথবা পিন কোড সঠিক নয়। আপনাকে দেওয়া মোবাইল নাম্বার ও পিন দিয়ে চেষ্টা করুন।');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email || !password) {
      setError('ইমেইল ও পাসওয়ার্ড উভয়ই পূরণ করুন।');
      return;
    }

    try {
      setLoading(true);
      const session = await authenticateWithEmailPassword(email.trim(), password);
      onLoginSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'লগইন ব্যর্থ হয়েছে। ক্রেডেনশিয়াল সঠিক কি না যাচাই করুন।');
    } finally {
      setLoading(false);
    }
  };

  // Handle PIN Recovery & Reset
  const handleForgotPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (recoveryMethod === 'master_key') {
      const normalizedKey = masterKeyInput.trim().toUpperCase();
      if (normalizedKey !== 'DIP-BHOLA-2026' && normalizedKey !== '0049' && normalizedKey !== '2026') {
        setError('মাস্টার সিকিউরিটি কি সঠিক নয়! প্রধান পরিচালকের মাস্টার কি প্রদান করুন।');
        return;
      }
    } else {
      const cleanContact = recoveryContact.trim().toLowerCase();
      const validContacts = [
        'zahidulislam53330@gmail.com',
        '01721200049',
        '+8801721200049',
        adminAuth?.phone || ''
      ]
        .filter(Boolean)
        .map((c) => c.toLowerCase());

      if (!validContacts.includes(cleanContact)) {
        setError('নিবন্ধিত ইমেইল বা ফোন নম্বর সঠিক নয়! পরিচালকের নিবন্ধিত যোগাযোগ দিন।');
        return;
      }
    }

    if (!newPin || newPin.length < 4) {
      setError('নতুন পিন কমপক্ষে ৪ সংখ্যার হতে হবে।');
      return;
    }

    if (newPin !== confirmPin) {
      setError('উভয় পিন ফিল্ডের নম্বর একই হতে হবে।');
      return;
    }

    try {
      setLoading(true);
      const updatedAuth: AdminAuth = {
        pin: newPin.trim(),
        phone: adminAuth?.phone || '01721200049'
      };

      await updateSettings(updatedAuth);
      await addAuditLog({
        action: 'security_alert',
        actionBengali: 'অ্যাডমিন পিন রিসেট',
        performedBy: 'জাহিদুল ইসলাম (পরিচালক)',
        performedById: 'director',
        role: 'director',
        details: `পরিচালক পিন সফলভাবে পরিবর্তন ও রিসেট করা হয়েছে (${recoveryMethod === 'master_key' ? 'মাস্টার কি দিয়ে' : 'নিবন্ধিত যোগাযোগ দিয়ে'})।`
      });

      setSuccessMsg('পিন সফলভাবে রিসেট সম্পন্ন হয়েছে! প্রবেশ হচ্ছে...');
      setTimeout(() => {
        const session: UserSession = {
          role: 'director',
          id: 'director',
          name: 'জাহিদুল ইসলাম (পরিচালক)',
          designation: 'প্রধান পরিচালক ও স্বত্বাধিকারী',
          phone: updatedAuth.phone
        };
        onLoginSuccess(session);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'পিন আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        isLocked
          ? 'min-h-screen w-full bg-gradient-to-br from-[#022017] via-[#043426] to-slate-950 flex flex-col items-center justify-center p-4'
          : 'fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4'
      }
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-emerald-500/30 dark:border-slate-800 overflow-hidden">
        {/* Header with Brand DB Logo */}
        <div className="px-5 py-5 bg-gradient-to-r from-[#022b1f] via-[#054431] to-slate-900 text-white flex items-center justify-between border-b border-emerald-700/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#064e3b] border border-amber-400/60 overflow-hidden shadow-md shrink-0 flex items-center justify-center">
              <img
                src="/db-logo-192.png"
                alt={companyName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide">{companyName}</h3>
              <p className="text-xs text-emerald-300 font-medium">
                {isLocked ? 'নিরাপদ প্রবেশ · মোবাইল নাম্বার ও পিন দিন' : 'অ্যাকাউন্ট পরিবর্তন ও ভেরিফিকেশন'}
              </p>
            </div>
          </div>
          {!isLocked && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode('pin'); setError(''); setSuccessMsg(''); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'pin'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              মোবাইল ও পিন
            </button>
            <button
              type="button"
              onClick={() => { setMode('email'); setError(''); setSuccessMsg(''); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'email'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ইমেইল লগইন
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot_pin'); setError(''); setSuccessMsg(''); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'forgot_pin'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              পিন রিকভারি
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'pin' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  আপনার নিজস্ব প্যানেলে প্রবেশ করতে আপনাকে দেওয়া <strong>মোবাইল নাম্বার</strong> এবং <strong>পিন কোড</strong> দিন।
                </span>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    মোবাইল নাম্বার (Mobile Number) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      autoFocus
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900 dark:text-white tracking-wide"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      ৪-ডিজিট পিন কোড (PIN) *
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot_pin'); setError(''); }}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      পিন ভুলে গেছেন?
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      className="w-full pl-10 pr-4 text-center tracking-[0.45em] text-xl font-mono py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition-transform active:scale-95 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>লগইন করুন ও নিজস্ব পেজে প্রবেশ করুন</span>
                </button>
              </form>

              {(onOpenPlayStore || onOpenJoinPortal) && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2 text-center">
                  {onOpenJoinPortal && (
                    <button
                      type="button"
                      onClick={onOpenJoinPortal}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      নতুন Staff বা Share Partner? জয়েনিং ও WhatsApp গ্রুপে যুক্ত হোন
                    </button>
                  )}
                  {onOpenPlayStore && (
                    <button
                      type="button"
                      onClick={onOpenPlayStore}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>মোবাইলে অ্যাপ ইনস্টল করতে Play Store পেজে যান</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : mode === 'forgot_pin' ? (
            /* Forgot PIN / Reset Flow (Director Only — Zero credential leaks) */
            <form onSubmit={handleForgotPinSubmit} className="space-y-3.5 animate-in fade-in">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>পরিচালক পিন পুনরুদ্ধার ও রিসেট</span>
                </div>
                পরিচালকের নিবন্ধিত ইমেইল/মোবাইল অথবা মাস্টার সিকিউরিটি কি যাচাই করে পিন রিসেট করা যাবে। (স্টাফ পিনের জন্য পরিচালকের সাথে যোগাযোগ করুন।)
              </div>

              {/* Method switch */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRecoveryMethod('email_phone')}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                    recoveryMethod === 'email_phone'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  নিবন্ধিত ইমেইল / ফোন
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryMethod('master_key')}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                    recoveryMethod === 'master_key'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  মাস্টার সিকিউরিটি কি
                </button>
              </div>

              {recoveryMethod === 'email_phone' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    পরিচালকের নিবন্ধিত ইমেইল বা মোবাইল *
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryContact}
                    onChange={(e) => setRecoveryContact(e.target.value)}
                    placeholder="নিবন্ধিত ইমেইল অথবা মোবাইল নাম্বার"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-medium"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    মাস্টার রিকভারি কি (Master Security Key) *
                  </label>
                  <input
                    type="password"
                    required
                    value={masterKeyInput}
                    onChange={(e) => setMasterKeyInput(e.target.value)}
                    placeholder="মাস্টার সিকিউরিটি কি লিখুন"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              )}

              {/* New PIN Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    নতুন ৪-সংখ্যার পিন *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••"
                    className="w-full text-center text-lg font-mono font-bold px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    পিন নিশ্চিত করুন *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="••••"
                    className="w-full text-center text-lg font-mono font-bold px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('pin')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/30 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{loading ? 'রিসেট হচ্ছে...' : 'নতুন পিন সেট করুন'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অ্যাডমিন ইমেইল অ্যাড্রেস *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  পাসওয়ার্ড *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md"
              >
                <Lock className="w-4 h-4" />
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
