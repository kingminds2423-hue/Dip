import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DigitalTickerBar } from './components/DigitalTickerBar';
import { MobileInstallNotice } from './components/MobileInstallNotice';
import { AutoUpdateBanner } from './components/AutoUpdateBanner';
import { QuickCommandBar } from './components/QuickCommandBar';
import { FixedNotificationBar } from './components/FixedNotificationBar';
import type { AppLinksTab } from './components/AppLinksModal';
import { AppUpdateProvider } from './hooks/useAppUpdate';

// Lazy-loaded heavy tabs & modals so initial app launch stays ultra-fast
const TransactionsTable = React.lazy(() => import('./components/TransactionsTable').then((m) => ({ default: m.TransactionsTable })));
const StaffManagement = React.lazy(() => import('./components/StaffManagement').then((m) => ({ default: m.StaffManagement })));
const PartnersView = React.lazy(() => import('./components/PartnersView').then((m) => ({ default: m.PartnersView })));
const CustomerDuesView = React.lazy(() => import('./components/CustomerDuesView').then((m) => ({ default: m.CustomerDuesView })));
const ReportsView = React.lazy(() => import('./components/ReportsView').then((m) => ({ default: m.ReportsView })));
const DigitalDisplayBoard = React.lazy(() => import('./components/DigitalDisplayBoard').then((m) => ({ default: m.DigitalDisplayBoard })));
const OfficersView = React.lazy(() => import('./components/OfficersView').then((m) => ({ default: m.OfficersView })));
const CustomerComplaintsView = React.lazy(() => import('./components/CustomerComplaintsView').then((m) => ({ default: m.CustomerComplaintsView })));
const PlayStoreAppView = React.lazy(() => import('./components/PlayStoreAppView').then((m) => ({ default: m.PlayStoreAppView })));

const TransactionModal = React.lazy(() => import('./components/TransactionModal').then((m) => ({ default: m.TransactionModal })));
const ComplaintModal = React.lazy(() => import('./components/ComplaintModal').then((m) => ({ default: m.ComplaintModal })));
const LoginModal = React.lazy(() => import('./components/LoginModal').then((m) => ({ default: m.LoginModal })));
const BackupModal = React.lazy(() => import('./components/BackupModal').then((m) => ({ default: m.BackupModal })));
const StaffQrModal = React.lazy(() => import('./components/StaffQrModal').then((m) => ({ default: m.StaffQrModal })));
const CompanySetupModal = React.lazy(() => import('./components/CompanySetupModal').then((m) => ({ default: m.CompanySetupModal })));
const AppLinksModal = React.lazy(() => import('./components/AppLinksModal').then((m) => ({ default: m.AppLinksModal })));
const AuditLogModal = React.lazy(() => import('./components/AuditLogModal').then((m) => ({ default: m.AuditLogModal })));
const PlayStoreUpdateModal = React.lazy(() => import('./components/PlayStoreUpdateModal').then((m) => ({ default: m.PlayStoreUpdateModal })));
const AdminSecurityDashboard = React.lazy(() => import('./components/AdminSecurityDashboard').then((m) => ({ default: m.AdminSecurityDashboard })));
const AdminPinPromptModal = React.lazy(() => import('./components/AdminPinPromptModal').then((m) => ({ default: m.AdminPinPromptModal })));
const JoiningModal = React.lazy(() => import('./components/JoiningModal').then((m) => ({ default: m.JoiningModal })));
import {
  Maximize2,
  LayoutDashboard,
  Receipt,
  Wrench,
  Monitor,
  ShieldAlert,
  X,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  PieChart
} from 'lucide-react';

import {
  Transaction,
  Staff,
  Partner,
  Company,
  CustomerDue,
  AdminAuth,
  UserSession,
  TransactionType,
  DigitalNotice,
  AppointedOfficer,
  OfficersState,
  AuditLog,
  CustomerComplaint,
  ComplaintStatus,
  WhatsAppGroupConfig,
  JoinRequest,
  NotificationControl
} from './types';

import {
  subscribeTransactions,
  subscribeStaffs,
  subscribePartners,
  subscribeCompany,
  subscribeCustomerDues,
  subscribeSettings,
  subscribeDigitalNotice,
  saveDigitalNotice,
  DEFAULT_DIGITAL_NOTICE,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addStaff,
  updateStaff,
  deleteStaff,
  addPartner,
  updatePartner,
  deletePartner,
  addPartnerInvestment,
  addCustomerDue,
  updateCustomerDue,
  deleteCustomerDue,
  updateCompany,
  seedInitialDataIfEmpty,
  generateCsvData,
  subscribeOfficers,
  appointOfficer,
  saveOfficers,
  DEFAULT_OFFICERS,
  subscribeAuditLogs,
  addAuditLog,
  subscribeComplaints,
  addComplaint,
  updateComplaint,
  deleteComplaint,
  subscribeWhatsAppGroupConfig,
  saveWhatsAppGroupConfig,
  DEFAULT_WHATSAPP_GROUP_CONFIG,
  subscribeJoinRequests,
  addJoinRequest,
  updateJoinRequest,
  subscribeNotificationControl,
  clearAllNotificationsInCloud,
  restoreNotificationsInCloud,
  DEFAULT_NOTIFICATION_CONTROL
} from './services/dataService';

import { getStoredSession, saveSession, logoutUser, isDirector } from './services/authService';
import {
  initOfflineAutoSync,
  subscribeOfflineSyncState,
  getOfflineSyncState,
  flushOfflineQueue,
  clearLastAutoSyncedNotice,
  OfflineSyncState
} from './services/offlineSync';
import { toBengaliNumber } from './utils/formatters';
import {
  applyDynamicPrintPageRule,
  getSavedPrintPreferences
} from './services/pdfPrintService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => getStoredSession());
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = getStoredSession();
    if (stored?.role === 'staff') return 'transactions';
    if (stored?.role === 'partner') return 'partners';
    return 'dashboard';
  });

  // Firestore real-time state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [customerDues, setCustomerDues] = useState<CustomerDue[]>([]);
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [adminAuth, setAdminAuth] = useState<AdminAuth | null>(null);
  const [digitalNotice, setDigitalNotice] = useState<DigitalNotice>(DEFAULT_DIGITAL_NOTICE);
  const [officers, setOfficers] = useState<OfficersState>(DEFAULT_OFFICERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [whatsappGroupConfig, setWhatsappGroupConfig] = useState<WhatsAppGroupConfig>(DEFAULT_WHATSAPP_GROUP_CONFIG);
  const [notificationControl, setNotificationControl] = useState<NotificationControl>(DEFAULT_NOTIFICATION_CONTROL);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [offlineSyncState, setOfflineSyncState] = useState<OfflineSyncState>(() => getOfflineSyncState());

  // Global Dark Mode Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dip_bhola_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Auto-logout security toast
  const [autoLogoutNotice, setAutoLogoutNotice] = useState<string | null>(null);

  // Layout & Toolbar states
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalDefaultType, setTxModalDefaultType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<CustomerComplaint | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isStaffQrOpen, setIsStaffQrOpen] = useState(false);
  const [isCompanySetupOpen, setIsCompanySetupOpen] = useState(false);
  const [isAppLinksOpen, setIsAppLinksOpen] = useState(false);
  const [appLinksTab, setAppLinksTab] = useState<AppLinksTab>('download');
  const [isJoiningModalOpen, setIsJoiningModalOpen] = useState(false);
  const [joiningInitialRole, setJoiningInitialRole] = useState<'staff' | 'partner'>('staff');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSecurityDashboardOpen, setIsSecurityDashboardOpen] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onVerified: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onVerified: () => {}
  });
  const [openAddStaffNonce, setOpenAddStaffNonce] = useState(0);
  const [openPrintStudioNonce, setOpenPrintStudioNonce] = useState(0);
  const [toggleNotifWindowNonce, setToggleNotifWindowNonce] = useState(0);

  const requireDirectorPin = (title: string, description: string, onVerified: () => void) => {
    setPinPrompt({
      isOpen: true,
      title,
      description,
      onVerified
    });
  };

  // Initialize default @page print rule on startup
  useEffect(() => {
    const prefs = getSavedPrintPreferences();
    applyDynamicPrintPageRule(
      prefs.size,
      prefs.orientation,
      prefs.marginMm,
      prefs.customWidthMm,
      prefs.customHeightMm
    );
  }, []);

  // Sync Dark Mode class with <html> element
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('dip_bhola_dark_mode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('dip_bhola_dark_mode', 'false');
      }
    } catch (e) {
      console.warn('Error setting dark mode:', e);
    }
  }, [isDarkMode]);

  // Auto-logout after 15 minutes of inactivity for shared devices
  useEffect(() => {
    if (!currentUser) return;
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetInactivityTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const prevUser = currentUser;
        logoutUser();
        setCurrentUser(null);
        setAutoLogoutNotice('১৫ মিনিট কোনো সক্রিয়তা না থাকায় নিরাপত্তার স্বার্থে আপনার সেশনটি স্বয়ংক্রিয়ভাবে লগআউট করা হয়েছে।');
        addAuditLog({
          action: 'security_alert',
          actionBengali: 'নিষ্ক্রিয়তায় অটো-লগআউট',
          performedBy: prevUser.name,
          performedById: prevUser.id,
          role: prevUser.role,
          details: '১৫ মিনিট নিষ্ক্রিয়তার কারণে ডিভাইসের ডেটা সুরক্ষায় অটো-লগআউট সক্রিয় হয়েছে।'
        });
      }, 15 * 60 * 1000); // 15 minutes
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [currentUser]);

  // Initialize and Seed Firestore if empty
  const initData = useCallback(async (force = false) => {
    setIsSyncing(true);
    try {
      await seedInitialDataIfEmpty(force);
    } catch (e) {
      console.warn('Initial seed error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Seed sample complaints for DIP BHOLA NETWORK if collection is empty
  const seedInitialComplaintsIfEmpty = useCallback(async (currentList: CustomerComplaint[]) => {
    if (currentList.length > 0) return;
    try {
      await addComplaint({
        name: 'মোঃ হোসেন',
        idNumber: 'DBN-101',
        mobileNumber: '01712345678',
        address: 'বিশ্বরোড মোড়, ভোলা সদর',
        complainDetails: 'হোসেন ও রাজিব বিশ্বরোড লাইন সমস্যা - অপটিক্যাল ফাইবার ড্রপ ক্যাবল কাটা পড়েছে, নেট সংযোগ বিচ্ছিন্ন।',
        status: 'in_progress',
        priority: 'urgent',
        assignedStaffName: 'মোঃ রাজিব',
        reportedBy: 'জাহিদুল ইসলাম (পরিচালক)'
      });
      await addComplaint({
        name: 'হারুন অর রশিদ',
        idNumber: 'DBN-102',
        mobileNumber: '01823456789',
        address: 'ভোলা সদর হারুন এর লাইন সংলগ্ন',
        complainDetails: 'ভোলা সদর হারুন এর লাইন সমস্যা - রাউটারে লাল বাতি জ্বলছে ও ইন্টারনেট কানেকশন পাওয়া যাচ্ছে না।',
        status: 'pending',
        priority: 'critical',
        assignedStaffName: 'মোঃ শাওন',
        reportedBy: 'জাহিদুল ইসলাম (পরিচালক)'
      });
      await addComplaint({
        name: 'মোঃ আকাস',
        idNumber: 'DBN-103',
        mobileNumber: '01934567890',
        address: 'বাপ্তা ইউনিয়ন পরিষদ সংলগ্ন',
        complainDetails: 'আকাস ও অন্তর লাইন সমস্যা বাপ্তা - মাঝে মাঝে কানেকশন ড্রপ করছে এবং স্পিড ধীরগতি।',
        status: 'pending',
        priority: 'normal',
        assignedStaffName: 'অন্তর',
        reportedBy: 'জাহিদুল ইসলাম (পরিচালক)'
      });
    } catch (err) {
      console.warn('Complaints seed notice:', err);
    }
  }, []);

  useEffect(() => {
    const cleanupOffline = initOfflineAutoSync();
    const unsubOfflineState = subscribeOfflineSyncState((st) => setOfflineSyncState(st));

    initData(false);

    const unsubTx = subscribeTransactions((list) => setTransactions(list));
    const unsubStaff = subscribeStaffs((list) => setStaffs(list));
    const unsubPartners = subscribePartners((list) => setPartners(list));
    const unsubCompany = subscribeCompany((comp) => setCompany(comp));
    const unsubDues = subscribeCustomerDues((dues) => setCustomerDues(dues));
    const unsubSettings = subscribeSettings((sett) => setAdminAuth(sett));
    const unsubNotice = subscribeDigitalNotice((notice) => setDigitalNotice(notice));
    const unsubOfficers = subscribeOfficers((offs) => setOfficers(offs));
    const unsubComplaints = subscribeComplaints((list) => {
      setComplaints(list);
      seedInitialComplaintsIfEmpty(list);
    });
    const unsubWaGroup = subscribeWhatsAppGroupConfig((cfg) => setWhatsappGroupConfig(cfg));
    const unsubJoinRequests = subscribeJoinRequests((reqs) => setJoinRequests(reqs));
    const unsubNotificationControl = subscribeNotificationControl((ctrl) => setNotificationControl(ctrl));

    // Defer audit history stream slightly so dashboard paints with full priority
    let unsubAudit: (() => void) | undefined;
    const auditTimer = setTimeout(() => {
      unsubAudit = subscribeAuditLogs((logs) => setAuditLogs(logs));
    }, 500);

    return () => {
      cleanupOffline();
      unsubOfflineState();
      clearTimeout(auditTimer);
      unsubTx();
      unsubStaff();
      unsubPartners();
      unsubCompany();
      unsubDues();
      unsubSettings();
      unsubNotice();
      unsubOfficers();
      if (unsubAudit) unsubAudit();
      unsubComplaints();
      unsubWaGroup();
      unsubJoinRequests();
      unsubNotificationControl();
    };
  }, [initData, seedInitialComplaintsIfEmpty]);

  // Handle URL Query Parameters safely (NO auto-login on shared links — Mobile + PIN is mandatory)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const portal = urlParams.get('portal') || urlParams.get('role');
      const roleParam = urlParams.get('role');
      const viewParam = urlParams.get('view') || urlParams.get('app');
      const actionParam = urlParams.get('action');

      if (portal === 'join' || actionParam === 'join') {
        setJoiningInitialRole(roleParam === 'partner' ? 'partner' : 'staff');
        if (!currentUser) {
          setActiveTab('join');
        } else {
          setIsJoiningModalOpen(true);
        }
        return;
      }

      if (
        !currentUser &&
        (portal === 'playstore' ||
          viewParam === 'playstore' ||
          urlParams.get('store') === '1' ||
          actionParam === 'install' ||
          actionParam === 'download')
      ) {
        setActiveTab('playstore');
      } else if (currentUser) {
        if (currentUser.role === 'staff') {
          setActiveTab('transactions');
        } else if (currentUser.role === 'partner') {
          setActiveTab('partners');
        } else if ((urlParams.get('partner') || portal === 'partner') && (currentUser.role === 'director' || currentUser.role === 'admin')) {
          setActiveTab('partners');
        }
      }
    } catch (e) {
      console.warn('URL parameter parsing error:', e);
    }
  }, [currentUser]);

  // Strict Role-Based Route Guard: Staff sees own Transactions/Complaints/PlayStore; Partner sees Partners/PlayStore
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'staff' && !['transactions', 'complaints', 'playstore'].includes(activeTab)) {
      setActiveTab('transactions');
    } else if (currentUser.role === 'partner' && !['partners', 'playstore'].includes(activeTab)) {
      setActiveTab('partners');
    } else if (currentUser.role === 'manager' && activeTab === 'partners') {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  // Handle transaction save (create or update) with Audit Log
  const handleSaveTransaction = async (txData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => {
    if (!currentUser) return;
    if (txData.id) {
      await updateTransaction(txData.id, txData);
      await addAuditLog({
        action: 'transaction_edit',
        actionBengali: 'লেনদেন আপডেট',
        performedBy: currentUser.name,
        performedById: currentUser.id,
        role: currentUser.role,
        details: `লেনদেন তথ্য সংশোধন: ৳${txData.amount} (${txData.title})`
      });
    } else {
      const saved = await addTransaction(txData);
      await addAuditLog({
        action: 'transaction_add',
        actionBengali: 'নতুন লেনদেন এন্ট্রি',
        performedBy: currentUser.name,
        performedById: currentUser.id,
        role: currentUser.role,
        details: `নতুন ${txData.type === 'income' ? 'জমা' : 'খরচ'} এন্ট্রি: ৳${txData.amount} (${txData.title})`
      });
    }
  };

  // Open transaction modal
  const handleOpenAddTxModal = (type: TransactionType) => {
    setEditingTx(null);
    setTxModalDefaultType(type);
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalDefaultType(tx.type);
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = async (id: string) => {
    if (!currentUser) return;
    const targetTx = transactions.find((t) => t.id === id);
    await deleteTransaction(id);
    await addAuditLog({
      action: 'transaction_delete',
      actionBengali: 'লেনদেন মুছে ফেলা হয়েছে',
      performedBy: currentUser.name,
      performedById: currentUser.id,
      role: currentUser.role,
      details: `মুছে ফেলা লেনদেন: ৳${targetTx?.amount || 0} (${targetTx?.title || id})`
    });
  };

  // Staff Salary Payment Quick Entry
  const handlePayStaffSalary = (staff: Staff) => {
    if (!currentUser) return;
    const user = currentUser;
    setEditingTx(null);
    setTxModalDefaultType('expense');
    setIsTxModalOpen(true);
    setTimeout(() => {
      setEditingTx({
        id: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        title: `${staff.name} (স্টাফ বেতন ও ভাতা)`,
        category: 'স্টাফ বেতন ও ভাতা',
        amount: staff.salary,
        paymentMethod: 'cash',
        addedBy: user.name,
        addedById: user.id,
        note: `মাসিক বেতন পরিশোধ - ${staff.designation}`,
        createdAt: new Date().toISOString()
      });
    }, 50);
  };

  // Customer Due Payment Collection
  const handleCollectCustomerDue = async (due: CustomerDue, amount: number, paymentMethod: string) => {
    if (!currentUser) return;
    const newPaid = (due.paidAmount || 0) + amount;
    const newCurrent = Math.max(0, (due.totalDue || 0) - newPaid);

    await updateCustomerDue(due.id, {
      paidAmount: newPaid,
      currentDue: newCurrent,
      notes: `${due.notes ? due.notes + ' | ' : ''}আদায়: ৳${amount} (${new Date().toISOString().split('T')[0]})`
    });

    await addTransaction({
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      title: `${due.customerName} - বকেয়া বিল আদায়`,
      category: 'গ্রাহক মাসিক বিল কালেকশন',
      amount,
      paymentMethod,
      addedBy: currentUser.name,
      addedById: currentUser.id,
      note: `গ্রাহক বিল কালেকশন - ${due.address || ''}`
    });
  };

  // Customer Complaints Handlers
  const handleSaveComplaint = async (
    cData: Omit<CustomerComplaint, 'id' | 'createdAt'> & { id?: string }
  ) => {
    if (!currentUser) return;
    if (cData.id) {
      await updateComplaint(cData.id, cData);
      await addAuditLog({
        action: 'complaint_edit',
        actionBengali: 'অভিযোগ আপডেট',
        performedBy: currentUser.name,
        performedById: currentUser.id,
        role: currentUser.role,
        details: `অভিযোগ তথ্য সংশোধন: #${cData.idNumber} (${cData.name} - ${cData.address})`
      });
    } else {
      const saved = await addComplaint(cData);
      await addAuditLog({
        action: 'complaint_add',
        actionBengali: 'নতুন অভিযোগ দাখিল',
        performedBy: currentUser.name,
        performedById: currentUser.id,
        role: currentUser.role,
        details: `নতুন অভিযোগ এন্ট্রি: #${saved.idNumber} (${saved.name} - ${saved.address})`
      });
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    if (!currentUser) return;
    const target = complaints.find((c) => c.id === id);
    await deleteComplaint(id);
    await addAuditLog({
      action: 'complaint_delete',
      actionBengali: 'অভিযোগ মুছে ফেলা হয়েছে',
      performedBy: currentUser.name,
      performedById: currentUser.id,
      role: currentUser.role,
      details: `মুছে ফেলা অভিযোগ: #${target?.idNumber || id} (${target?.name || ''})`
    });
  };

  const handleUpdateComplaintStatus = async (
    id: string,
    newStatus: ComplaintStatus,
    resolutionNote?: string
  ) => {
    if (!currentUser) return;
    const target = complaints.find((c) => c.id === id);
    const updates: Partial<CustomerComplaint> = {
      status: newStatus,
      ...(newStatus === 'resolved'
        ? {
            resolvedAt: new Date().toISOString(),
            resolutionNote: resolutionNote || 'সমস্যা সমাধান সম্পন্ন'
          }
        : {})
    };
    await updateComplaint(id, updates);
    await addAuditLog({
      action: 'complaint_status',
      actionBengali: 'অভিযোগ স্ট্যাটাস পরিবর্তন',
      performedBy: currentUser.name,
      performedById: currentUser.id,
      role: currentUser.role,
      details: `স্ট্যাটাস পরিবর্তন: #${target?.idNumber || id} -> ${
        newStatus === 'resolved' ? 'সমাধানকৃত' : newStatus === 'in_progress' ? 'কাজ চলছে' : 'পেন্ডিং'
      }`
    });
  };

  const handleRecordLineExpense = (cmp: CustomerComplaint) => {
    if (!currentUser) return;
    const user = currentUser;
    setEditingTx(null);
    setTxModalDefaultType('expense');
    setIsTxModalOpen(true);
    setTimeout(() => {
      setEditingTx({
        id: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        title: `[অভিযোগ ${cmp.idNumber}] ${cmp.name} - লাইন মেরামত ও যাতায়াত খরচ`,
        category: 'যাতায়াত ও ডেলিভারি খরচ',
        amount: 100,
        paymentMethod: 'cash',
        addedBy: user.name,
        addedById: user.id,
        note: `গ্রাহক অভিযোগ সমাধান বাবদ লাইন খরচ: ${cmp.complainDetails} (এলাকা: ${cmp.address})`,
        createdAt: new Date().toISOString()
      });
    }, 60);
  };

  // Quick Expense 1-click handler
  const handleQuickExpense = async (data: {
    title: string;
    category: string;
    amount: number;
    paymentMethod: string;
    note?: string;
  }) => {
    if (!currentUser) return;
    await handleSaveTransaction({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      title: data.title,
      category: data.category,
      amount: data.amount,
      paymentMethod: data.paymentMethod || 'cash',
      addedBy: currentUser.name,
      addedById: currentUser.id,
      note: data.note || 'দ্রুত খরচ এন্ট্রি'
    });
  };

  // Export CSV (Staff ONLY exports their own transactions)
  const handleExportCsv = (monthStr?: string) => {
    const baseList =
      currentUser?.role === 'staff'
        ? transactions.filter(
            (t) =>
              t.addedById === currentUser.id ||
              (t.addedBy || '').trim() === currentUser.name.trim()
          )
        : transactions;

    const listToExport = monthStr
      ? baseList.filter((t) => t.date && t.date.startsWith(monthStr))
      : baseList;

    const csvContent = generateCsvData(listToExport, company?.name || 'DIP BHOLA NETWORK', monthStr);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hisab_khata_${monthStr || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmitJoinRequest = async (
    reqData: Omit<JoinRequest, 'id' | 'status' | 'createdAt'>
  ): Promise<JoinRequest> => {
    const saved = await addJoinRequest(reqData);
    await addAuditLog({
      action: 'join_request_submit',
      actionBengali: reqData.role === 'partner' ? 'নতুন পার্টনার জয়েনিং আবেদন' : 'নতুন স্টাফ জয়েনিং আবেদন',
      performedBy: reqData.name,
      performedById: saved.id,
      role: reqData.role,
      details: `${reqData.role === 'partner' ? 'শেয়ার পার্টনার' : 'স্টাফ'} জয়েনিং আবেদন: ${reqData.name} (${reqData.phone})`
    });
    return saved;
  };

  const handleApproveJoinRequest = async (req: JoinRequest) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    if (req.role === 'staff') {
      const newStaff: Staff = {
        id: `staff-${Date.now()}`,
        name: req.name,
        phone: req.phone,
        pin: req.pin,
        designation: req.designationOrRole || 'সহকারী টেকনিশিয়ান',
        salary: 8000,
        joinedAt: today,
        address: req.address || '',
        nid: req.nid || '',
        status: 'active'
      };
      await addStaff(newStaff);
    } else {
      const inv = Number(req.initialInvestment) || 0;
      const newPartner: Partner = {
        id: `p-${Date.now()}`,
        name: req.name,
        phone: req.phone,
        pin: req.pin,
        role: req.designationOrRole || 'শেয়ার অংশীদার',
        address: req.address || '',
        nidNumber: req.nid || '',
        joinedDate: today,
        investment: inv,
        sharePercentage: 0,
        investmentHistory:
          inv > 0
            ? [{ id: `inv-${Date.now()}`, date: today, amount: inv, note: 'জয়েনিং প্রারম্ভিক মূলধন' }]
            : [],
        notes: req.notes || '',
        status: 'active'
      };
      await addPartner(newPartner);
    }

    await updateJoinRequest(req.id, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentUser.name
    });

    await addAuditLog({
      action: 'join_request_approve',
      actionBengali: 'জয়েনিং আবেদন অনুমোদিত',
      performedBy: currentUser.name,
      performedById: currentUser.id,
      role: currentUser.role,
      details: `${req.name} (${req.role === 'partner' ? 'শেয়ার পার্টনার' : 'স্টাফ'})-কে অনুমোদন দেওয়া হয়েছে।`
    });
  };

  const handleRejectJoinRequest = async (req: JoinRequest) => {
    if (!currentUser) return;
    await updateJoinRequest(req.id, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentUser.name
    });
  };

  const handleManualSync = async () => {
    await flushOfflineQueue();
  };

  // STRICT ADMIN ONLY: Delete All Notifications globally
  const handleDeleteAllNotifications = async (visibleKeys: string[]) => {
    if (!currentUser || !isDirector(currentUser)) {
      throw new Error('শুধুমাত্র অ্যাডমিন সকল নোটিফিকেশন ডিলিট করতে পারবেন।');
    }
    const allCurrentKeys = [
      ...visibleKeys,
      ...complaints.filter((c) => c.status !== 'resolved').map((c) => `cmp-${c.id}`),
      ...customerDues.filter((d) => (d.currentDue || 0) > 0).map((d) => `due-${d.id}`),
      ...joinRequests.filter((r) => r.status === 'pending').map((r) => `join-${r.id}`),
    ];
    const nextControl = await clearAllNotificationsInCloud(currentUser.name, allCurrentKeys);
    setNotificationControl(nextControl);
    await addAuditLog({
      action: 'notifications_clear_all',
      actionBengali: 'সকল নোটিফিকেশন ডিলিট (অ্যাডমিন)',
      performedBy: currentUser.name,
      performedById: currentUser.id,
      role: currentUser.role,
      details: `অ্যাডমিন ${currentUser.name} কর্তৃক সর্বমোট ${toBengaliNumber(visibleKeys.length)}টি প্রদর্শিত নোটিফিকেশন ডিলিট করা হয়েছে।`
    });
  };

  const handleRestoreNotifications = async () => {
    if (!currentUser || !isDirector(currentUser)) {
      throw new Error('শুধুমাত্র অ্যাডমিন নোটিফিকেশন পুনরুদ্ধার করতে পারবেন।');
    }
    const nextControl = await restoreNotificationsInCloud(currentUser.name);
    setNotificationControl(nextControl);
  };

  const handleLoginSuccess = (session: UserSession) => {
    saveSession(session);
    setCurrentUser(session);
    setAutoLogoutNotice(null);
    setIsLoginModalOpen(false);
    try {
      if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {
      // ignore history errors
    }
    // Automatically take the authenticated user straight to their own page
    if (session.role === 'staff') {
      setActiveTab('transactions');
    } else if (session.role === 'partner') {
      setActiveTab('partners');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsLoginModalOpen(false);
    if (activeTab === 'playstore' || activeTab === 'join') {
      setActiveTab('dashboard');
    }
  };

  // Action Bar Handlers
  const handleOpenAddStaff = () => {
    if (currentUser?.role === 'staff') return;
    setActiveTab('staff');
    setOpenAddStaffNonce((n) => n + 1);
  };

  const handleOpenMonthlyPdf = () => {
    if (currentUser?.role === 'staff' || currentUser?.role === 'partner') return;
    setActiveTab('reports');
    setTimeout(() => {
      setOpenPrintStudioNonce((n) => n + 1);
    }, 150);
  };

  // Calculate Net Balance for Sidebar Stats (zeroed out for staff & share partners)
  const isStaffRole = currentUser?.role === 'staff';
  const isPartnerRole = currentUser?.role === 'partner';
  const isRestrictedRole = isStaffRole || isPartnerRole;
  const pendingJoinRequestsCount = joinRequests.filter((r) => r.status === 'pending').length;

  const totalIncome = isRestrictedRole
    ? 0
    : transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = isRestrictedRole
    ? 0
    : transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // 1. Unauthenticated Visitors: Render ONLY Public PlayStore Install Page, Join Portal, OR Locked Mobile+PIN Gate
  // Zero Director data, zero Share Partners, zero Staff lists/PINs in DOM until authenticated!
  if (!currentUser) {
    return (
      <AppUpdateProvider currentUser={null}>
        <div className="min-h-screen bg-[#022017] text-slate-100 flex flex-col font-sans">
          {autoLogoutNotice && (
            <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 print:hidden">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{autoLogoutNotice}</span>
              </div>
              <button
                onClick={() => setAutoLogoutNotice(null)}
                className="p-1 rounded-lg hover:bg-amber-700 transition-colors"
                aria-label="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'join' ? (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-emerald-200">জয়েনিং পোর্টাল লোড হচ্ছে...</div>}>
              <JoiningModal
                isOpen={true}
                isPage={true}
                initialRole={joiningInitialRole}
                company={company}
                whatsappGroupConfig={whatsappGroupConfig}
                onClose={() => setActiveTab('dashboard')}
                onSubmitJoinRequest={handleSubmitJoinRequest}
                onOpenLogin={() => {
                  try {
                    if (window.location.search) {
                      window.history.replaceState({}, '', window.location.pathname);
                    }
                  } catch {
                    // ignore
                  }
                  setActiveTab('dashboard');
                }}
              />
            </Suspense>
          ) : activeTab === 'playstore' ? (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-emerald-200">লোড হচ্ছে...</div>}>
              <PlayStoreAppView
                company={company}
                staffs={[]}
                partners={[]}
                currentUser={null}
                onOpenDashboard={() => setActiveTab('dashboard')}
                onOpenLogin={() => {
                  try {
                    if (window.location.search) {
                      window.history.replaceState({}, '', window.location.pathname);
                    }
                  } catch {
                    // ignore
                  }
                  setActiveTab('dashboard');
                }}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-emerald-200">নিরাপদ লগইন পেজ লোড হচ্ছে...</div>}>
              <LoginModal
                isOpen={true}
                isLocked={true}
                onClose={() => {}}
                staffs={staffs}
                partners={partners}
                adminAuth={adminAuth}
                officers={officers}
                company={company}
                onOpenPlayStore={() => setActiveTab('playstore')}
                onOpenJoinPortal={() => {
                  setJoiningInitialRole('staff');
                  setActiveTab('join');
                }}
                onLoginSuccess={handleLoginSuccess}
              />
            </Suspense>
          )}
        </div>
      </AppUpdateProvider>
    );
  }

  return (
    <AppUpdateProvider currentUser={currentUser}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        {/* Auto-Update Notification Banner (Google Play Style) */}
        <AutoUpdateBanner />

      {/* 0. Mobile PWA WebAPK Install Notice */}
      <MobileInstallNotice />

      {/* Auto-logout security toast */}
      {autoLogoutNotice && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{autoLogoutNotice}</span>
          </div>
          <button
            onClick={() => setAutoLogoutNotice(null)}
            className="p-1 rounded-lg hover:bg-amber-700 transition-colors"
            aria-label="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offline Mode / Auto-Online Sync Live Toast Banners */}
      {(!offlineSyncState.isOnline || offlineSyncState.pendingCount > 0) && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              {!offlineSyncState.isOnline
                ? 'অফলাইন মোড চালু — নিশ্চিন্তে হিসাব ও অভিযোগ এন্ট্রি করুন, ইন্টারনেট আসলেই সব তথ্য অটো অনলাইন হয়ে যাবে।'
                : `ইন্টারনেট পাওয়া গেছে! অফলাইনের ${toBengaliNumber(offlineSyncState.pendingCount)}টি এন্ট্রি অনলাইন সিঙ্ক হচ্ছে...`}
            </span>
          </div>
          {offlineSyncState.isOnline && offlineSyncState.pendingCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={offlineSyncState.isSyncing}
              className="px-3 py-1 rounded-lg bg-slate-950 text-amber-300 text-[11px] font-bold flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${offlineSyncState.isSyncing ? 'animate-spin' : ''}`} />
              <span>এখনই সিঙ্ক করুন</span>
            </button>
          )}
        </div>
      )}

      {offlineSyncState.lastAutoSyncedCount > 0 && offlineSyncState.isOnline && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              ইন্টারনেট সংযোগ পুনরায় চালু! অফলাইনের {toBengaliNumber(offlineSyncState.lastAutoSyncedCount)}টি এন্ট্রি স্বয়ংক্রিয়ভাবে অনলাইন ক্লাউডে সিঙ্ক সম্পন্ন হয়েছে।
            </span>
          </div>
          <button
            type="button"
            onClick={() => clearLastAutoSyncedNotice()}
            className="p-1 rounded-lg hover:bg-emerald-700 transition-colors"
            aria-label="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP LETTERHEAD PAD HEADER (Shown unless full screen is toggled) */}
      {!isFullScreen ? (
        <Header
          company={company}
          currentUser={currentUser}
        />
      ) : (
        /* Floating mini-restore bar when topbar is hidden */
        <div className="bg-[#032d20] text-emerald-100 px-4 py-1.5 flex items-center justify-between text-xs border-b border-emerald-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">{company?.name || 'DIP BHOLA NETWORK'}</span>
            <span className="hidden sm:inline text-emerald-400">• ফুল স্ক্রিন মোড চালু</span>
          </div>
          <button
            onClick={() => setIsFullScreen(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors border border-emerald-600"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
            <span>প্যাড হেডার দেখান</span>
          </button>
        </div>
      )}

      {/* 2. Unified Sticky Container: Persistent Digital Display Bar + Fixed Notification Window + Fixed Quick Command Bar */}
      <div className="sticky top-0 z-40 print:hidden shadow-lg">
        <DigitalTickerBar
          notice={digitalNotice}
          company={company}
          partners={partners}
          transactions={transactions}
          complaints={complaints}
          customerDues={customerDues}
          joinRequests={joinRequests}
          offlineSyncState={offlineSyncState}
          notificationControl={notificationControl}
          currentUser={currentUser}
          onOpenDisplayTab={() => setActiveTab('display')}
          onToggleNotificationWindow={() => setToggleNotifWindowNonce((n) => n + 1)}
        />
        <FixedNotificationBar
          currentUser={currentUser}
          complaints={complaints}
          customerDues={customerDues}
          joinRequests={joinRequests}
          offlineSyncState={offlineSyncState}
          notificationControl={notificationControl}
          toggleWindowNonce={toggleNotifWindowNonce}
          onManualSync={handleManualSync}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenJoinRequests={() => {
            setAppLinksTab('whatsapp_groups');
            setIsAppLinksOpen(true);
          }}
          onDeleteAllNotifications={
            isDirector(currentUser) ? handleDeleteAllNotifications : undefined
          }
          onRestoreNotifications={
            isDirector(currentUser) ? handleRestoreNotifications : undefined
          }
        />
        <QuickCommandBar
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSidebarMenu={() => setIsSidebarOpenMobile((prev) => !prev)}
          isFullScreen={isFullScreen}
          onToggleFullScreen={() => setIsFullScreen((prev) => !prev)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((d) => !d)}
          onOpenAppLinks={() => {
            setAppLinksTab('admin');
            setIsAppLinksOpen(true);
          }}
          onOpenDownloadLinks={() => {
            setAppLinksTab('download');
            setIsAppLinksOpen(true);
          }}
          onOpenWhatsAppGroups={() => {
            setAppLinksTab('whatsapp_groups');
            setIsAppLinksOpen(true);
          }}
          pendingJoinRequestsCount={pendingJoinRequestsCount}
          whatsappGroupConfig={whatsappGroupConfig}
          offlineSyncState={offlineSyncState}
          onManualSync={handleManualSync}
          onOpenStaffQr={() => setIsStaffQrOpen(true)}
          onOpenMonthlyPdf={handleOpenMonthlyPdf}
          onOpenSecurityDashboard={() =>
            requireDirectorPin(
              'সিকিউরিটি ও অডিট ড্যাশবোর্ড',
              'নিরাপত্তা ড্যাশবোর্ড ও সেশন লগে প্রবেশ করতে পরিচালকের ৪-ডিজিট পিন দিন।',
              () => setIsSecurityDashboardOpen(true)
            )
          }
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onOpenCompanySetup={() =>
            requireDirectorPin(
              'কোম্পানি সেটআপ পরিবর্তন',
              'প্রতিষ্ঠানের নাম, লোগো ও ঠিকানা সম্পাদনার জন্য পরিচালকের ৪-ডিজিট পিন দিন।',
              () => setIsCompanySetupOpen(true)
            )
          }
          onLogout={handleLogout}
        />
      </div>

      {/* 3. MAIN LAYOUT: Left Sidebar (Separate Bars) + Right Content Area */}
      <div className="flex-1 flex min-h-0 pb-20">
        
        {/* Left Side Bars (বাম পাশে আলাদা আলাদা বার) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          isFullScreen={isFullScreen}
          onToggleFullScreen={() => setIsFullScreen((prev) => !prev)}
          onOpenStaffQr={() => setIsStaffQrOpen(true)}
          onOpenMonthlyPdf={handleOpenMonthlyPdf}
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onOpenCompanySetup={() =>
            requireDirectorPin(
              'কোম্পানি সেটআপ পরিবর্তন',
              'প্রতিষ্ঠানের তথ্য পরিবর্তনের জন্য পরিচালকের ৪-ডিজিট পিন দিন।',
              () => setIsCompanySetupOpen(true)
            )
          }
          onOpenAddStaff={handleOpenAddStaff}
          onOpenAppLinks={() => {
            setAppLinksTab('download');
            setIsAppLinksOpen(true);
          }}
          onOpenWhatsAppGroups={() => {
            setAppLinksTab('whatsapp_groups');
            setIsAppLinksOpen(true);
          }}
          pendingJoinRequestsCount={pendingJoinRequestsCount}
          onOpenAuditLog={() =>
            requireDirectorPin(
              'অডিট লগ ভেরিফিকেশন',
              'সিস্টেমের বিস্তারিত অডিট লগ দেখতে পরিচালকের ৪-ডিজিট পিন দিন।',
              () => setIsAuditModalOpen(true)
            )
          }
          onOpenSecurityDashboard={() =>
            requireDirectorPin(
              'সিকিউরিটি ড্যাশবোর্ড ভেরিফিকেশন',
              'সিকিউরিটি ড্যাশবোর্ড ও সেশন কন্ট্রোলে প্রবেশ করতে পরিচালকের পিন দিন।',
              () => setIsSecurityDashboardOpen(true)
            )
          }
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((d) => !d)}
          onLogout={handleLogout}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
          stats={{
            txCount: transactions.length,
            staffCount: staffs.length,
            duesCount: customerDues.filter((d) => (d.currentDue || 0) > 0).length,
            netBalance,
            complaintsCount: complaints.length,
            pendingComplaintsCount: complaints.filter((c) => c.status === 'pending').length
          }}
        />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          
          {/* Main Body Content View */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
            <Suspense fallback={<div className="py-12 text-center text-xs text-slate-400">লোড হচ্ছে...</div>}>
            {activeTab === 'dashboard' && (
              <Dashboard
                transactions={transactions}
                staffs={staffs}
                partners={partners}
                company={company}
                currentUser={currentUser}
                complaints={complaints}
                whatsappGroupConfig={whatsappGroupConfig}
                onOpenAddModal={handleOpenAddTxModal}
                onViewAllTransactions={() => setActiveTab('transactions')}
                onViewStaff={() => setActiveTab('staff')}
                onViewPartners={() => setActiveTab('partners')}
                onViewComplaints={() => setActiveTab('complaints')}
                onOpenAddComplaint={() => {
                  setEditingComplaint(null);
                  setIsComplaintModalOpen(true);
                }}
                onOpenAppLinks={() => setIsAppLinksOpen(true)}
                onQuickExpense={handleQuickExpense}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenWhatsAppGroups={() => {
                  setAppLinksTab('whatsapp_groups');
                  setIsAppLinksOpen(true);
                }}
                onOpenStaffQr={() => setIsStaffQrOpen(true)}
                onOpenMonthlyPdf={handleOpenMonthlyPdf}
                onOpenSecurityDashboard={() =>
                  requireDirectorPin(
                    'সিকিউরিটি ও অডিট ড্যাশবোর্ড',
                    'নিরাপত্তা ড্যাশবোর্ড ও সেশন লগে প্রবেশ করতে পরিচালকের ৪-ডিজিট পিন দিন।',
                    () => setIsSecurityDashboardOpen(true)
                  )
                }
                onOpenBackup={() => setIsBackupModalOpen(true)}
                onOpenCompanySetup={() =>
                  requireDirectorPin(
                    'কোম্পানি সেটআপ পরিবর্তন',
                    'প্রতিষ্ঠানের নাম, লোগো ও ঠিকানা সম্পাদনার জন্য পরিচালকের ৪-ডিজিট পিন দিন।',
                    () => setIsCompanySetupOpen(true)
                  )
                }
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsTable
                transactions={transactions}
                currentUser={currentUser}
                company={company}
                whatsappGroupConfig={whatsappGroupConfig}
                offlineSyncState={offlineSyncState}
                onManualSyncNow={handleManualSync}
                onOpenAddModal={handleOpenAddTxModal}
                onEditTransaction={handleEditTx}
                onDeleteTransaction={handleDeleteTx}
                onExportCsv={() => handleExportCsv()}
              />
            )}

            {/* Customer Complaints Tab (গ্রাহক অভিযোগ ও সার্ভিস ট্র্যাকিং) */}
            {activeTab === 'complaints' && (
              <CustomerComplaintsView
                complaints={complaints}
                staffs={staffs}
                currentUser={currentUser}
                company={company}
                whatsappGroupConfig={whatsappGroupConfig}
                onSaveWhatsAppGroupConfig={saveWhatsAppGroupConfig}
                onOpenAddModal={() => {
                  setEditingComplaint(null);
                  setIsComplaintModalOpen(true);
                }}
                onEditComplaint={(cmp) => {
                  setEditingComplaint(cmp);
                  setIsComplaintModalOpen(true);
                }}
                onDeleteComplaint={handleDeleteComplaint}
                onUpdateStatus={handleUpdateComplaintStatus}
                onRecordLineExpense={handleRecordLineExpense}
              />
            )}

            {activeTab === 'staff' && (
              <StaffManagement
                staffs={staffs}
                transactions={transactions}
                currentUser={currentUser}
                company={company}
                joinRequests={joinRequests}
                whatsappGroupConfig={whatsappGroupConfig}
                onApproveJoinRequest={handleApproveJoinRequest}
                onRejectJoinRequest={handleRejectJoinRequest}
                onOpenWhatsAppGroups={() => {
                  setAppLinksTab('whatsapp_groups');
                  setIsAppLinksOpen(true);
                }}
                onAddStaff={async (s) => { await addStaff(s); }}
                onUpdateStaff={updateStaff}
                onDeleteStaff={deleteStaff}
                onPaySalary={handlePayStaffSalary}
                openAddModalNonce={openAddStaffNonce}
              />
            )}

            {activeTab === 'partners' && (
              <PartnersView
                partners={partners}
                transactions={transactions}
                company={company}
                currentUser={currentUser}
                whatsappGroupConfig={whatsappGroupConfig}
                joinRequests={joinRequests}
                onApproveJoinRequest={handleApproveJoinRequest}
                onRejectJoinRequest={handleRejectJoinRequest}
                onOpenWhatsAppGroups={() => {
                  setAppLinksTab('whatsapp_groups');
                  setIsAppLinksOpen(true);
                }}
                onAddPartner={async (p) => { await addPartner(p); }}
                onUpdatePartner={updatePartner}
                onDeletePartner={deletePartner}
                onAddInvestment={addPartnerInvestment}
              />
            )}

            {activeTab === 'dues' && (
              <CustomerDuesView
                customerDues={customerDues}
                currentUser={currentUser}
                onAddCustomerDue={async (d) => { await addCustomerDue(d); }}
                onUpdateCustomerDue={updateCustomerDue}
                onDeleteCustomerDue={deleteCustomerDue}
                onCollectPayment={handleCollectCustomerDue}
              />
            )}

            {activeTab === 'display' && (
              <DigitalDisplayBoard
                notice={digitalNotice}
                currentUser={currentUser}
                company={company}
                partners={partners}
                transactions={transactions}
                onSaveNotice={saveDigitalNotice}
              />
            )}

            {activeTab === 'officers' && (
              <OfficersView
                officers={officers}
                staffs={staffs}
                company={company}
                currentUser={currentUser}
                onAppointOfficer={async (type, data) => {
                  await appointOfficer(type, data, officers);
                }}
                onSaveAllOfficers={saveOfficers}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                transactions={transactions}
                company={company}
                partners={partners}
                staffs={staffs}
                officers={officers}
                complaints={complaints}
                whatsappGroupConfig={whatsappGroupConfig}
                openPrintStudioNonce={openPrintStudioNonce}
                onExportCsv={handleExportCsv}
              />
            )}

            {activeTab === 'playstore' && (
              <PlayStoreAppView
                company={company}
                staffs={isRestrictedRole ? [] : staffs}
                partners={isRestrictedRole ? [] : partners}
                currentUser={currentUser}
                onOpenDashboard={() =>
                  setActiveTab(isStaffRole ? 'transactions' : isPartnerRole ? 'partners' : 'dashboard')
                }
                onOpenRoleTarget={(target) =>
                  setActiveTab(isStaffRole ? 'transactions' : isPartnerRole ? 'partners' : target)
                }
              />
            )}
            </Suspense>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500 print:hidden mt-auto">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                © 2026 <span className="font-bold text-slate-800">{company?.name || 'DIP BHOLA NETWORK'}</span>. সর্বস্বত্ব সংরক্ষিত।
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {company?.address || '৩নং পশ্চিম ইলিশা।ভোলা সদর ভোলা'}
              </div>
            </div>
          </footer>
        </div>

      </div>

      {/* 4. Permanent Bottom Navigation Bar (Always visible on Mobile, Tablet & Desktop with colorful logos) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-6px_24px_rgba(15,23,42,0.1)] px-2 py-1.5 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-around gap-1">
          {!isRestrictedRole && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold transition-all ${
                activeTab === 'dashboard'
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md scale-105'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
              }`}>
                <LayoutDashboard className="w-4 h-4" />
              </span>
              <span className="whitespace-nowrap">ড্যাশবোর্ড</span>
            </button>
          )}

          {isPartnerRole ? (
            <button
              onClick={() => setActiveTab('partners')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold transition-all ${
                activeTab === 'partners'
                  ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                activeTab === 'partners'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md scale-105'
                  : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
              }`}>
                <PieChart className="w-4 h-4" />
              </span>
              <span className="whitespace-nowrap">আমার শেয়ার</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2.5 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold transition-all ${
                  activeTab === 'transactions'
                    ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/70 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                  activeTab === 'transactions'
                    ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md scale-105'
                    : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400'
                }`}>
                  <Receipt className="w-4 h-4" />
                </span>
                <span className="whitespace-nowrap">{isStaffRole ? 'আমার হিসাব' : 'হিসাব খাতা'}</span>
              </button>

              {/* Complaints Tab with badge */}
              <button
                onClick={() => setActiveTab('complaints')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2.5 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold transition-all relative ${
                  activeTab === 'complaints'
                    ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/70 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                  activeTab === 'complaints'
                    ? 'bg-gradient-to-br from-rose-500 to-orange-600 text-white shadow-md scale-105'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                }`}>
                  <Wrench className="w-4 h-4" />
                </span>
                <span className="whitespace-nowrap">অভিযোগ</span>
                {complaints.filter((c) => c.status === 'pending' && (!isStaffRole || c.assignedStaffId === currentUser.id || (c.assignedStaffName || '').trim() === currentUser.name.trim())).length > 0 && (
                  <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            </>
          )}

          {!isRestrictedRole && (
            <button
              onClick={() => setActiveTab('display')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold transition-all ${
                activeTab === 'display'
                  ? 'text-lime-700 dark:text-lime-300 bg-lime-50 dark:bg-lime-950/70 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                activeTab === 'display'
                  ? 'bg-gradient-to-br from-lime-500 to-emerald-600 text-white shadow-md scale-105'
                  : 'bg-lime-100 dark:bg-lime-950 text-lime-700 dark:text-lime-400'
              }`}>
                <Monitor className="w-4 h-4" />
              </span>
              <span className="whitespace-nowrap">ডিজিটাল ডিসপ্লে</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('playstore')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold transition-all ${
              activeTab === 'playstore'
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`w-7 h-7 rounded-xl flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shadow-2xs transition-transform ${
              activeTab === 'playstore' ? 'scale-105 ring-2 ring-emerald-400' : ''
            }`}>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M4 3.5V20.5L16.5 12L4 3.5Z" fill="#00C1A4" />
                <path d="M4 3.5L13.5 12.8L16.5 12L4 3.5Z" fill="#00A0FF" />
                <path d="M16.5 12L13.5 11.2L4 20.5L16.5 12Z" fill="#FF3333" />
                <path d="M16.5 12L13.5 11.2L13.5 12.8L16.5 12Z" fill="#FFBA00" />
              </svg>
            </span>
            <span className="whitespace-nowrap">প্লে স্টোর</span>
          </button>
        </div>
      </nav>

      <Suspense fallback={null}>
      {/* Transaction Add / Edit Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        editingTx={editingTx}
        currentUser={currentUser}
        defaultType={txModalDefaultType}
      />

      {/* Customer Complaint Modal */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        onSave={handleSaveComplaint}
        editingComplaint={editingComplaint}
        staffs={staffs}
        currentUser={currentUser}
        company={company}
        whatsappGroupConfig={whatsappGroupConfig}
      />

      {/* Login / Switch Account Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        staffs={staffs}
        partners={partners}
        adminAuth={adminAuth}
        officers={officers}
        company={company}
        onOpenPlayStore={() => {
          setIsLoginModalOpen(false);
          setActiveTab('playstore');
        }}
        onOpenJoinPortal={() => {
          setIsLoginModalOpen(false);
          setJoiningInitialRole('staff');
          setIsJoiningModalOpen(true);
        }}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Staff & Share Partner Joining Modal */}
      <JoiningModal
        isOpen={isJoiningModalOpen}
        initialRole={joiningInitialRole}
        company={company}
        whatsappGroupConfig={whatsappGroupConfig}
        onClose={() => setIsJoiningModalOpen(false)}
        onSubmitJoinRequest={handleSubmitJoinRequest}
      />

      {/* Backup and Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        company={company}
        partners={partners}
        staffs={staffs}
        transactions={transactions}
        customerDues={customerDues}
        adminAuth={adminAuth}
        onRefreshData={() => initData(true)}
      />

      {/* Staff QR Code Modal */}
      <StaffQrModal
        isOpen={isStaffQrOpen}
        onClose={() => setIsStaffQrOpen(false)}
        staffs={staffs}
        company={company}
      />

      {/* Company Setup Modal */}
      <CompanySetupModal
        isOpen={isCompanySetupOpen}
        onClose={() => setIsCompanySetupOpen(false)}
        company={company}
        onSaveCompany={async (comp) => { await updateCompany(comp); }}
        currentUser={currentUser}
      />

      {/* App Links & QR Code Share Modal */}
      <AppLinksModal
        isOpen={isAppLinksOpen}
        onClose={() => setIsAppLinksOpen(false)}
        staffs={staffs}
        partners={partners}
        company={company}
        currentUser={currentUser}
        initialTab={appLinksTab}
        whatsappGroupConfig={whatsappGroupConfig}
        onSaveWhatsAppGroupConfig={saveWhatsAppGroupConfig}
        joinRequests={joinRequests}
        onApproveJoinRequest={handleApproveJoinRequest}
        onRejectJoinRequest={handleRejectJoinRequest}
        onOpenPlayStore={() => {
          setIsAppLinksOpen(false);
          setActiveTab('playstore');
        }}
      />

      {/* Security Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLogs={auditLogs}
        currentUser={currentUser}
      />

      {/* Admin Security Dashboard Modal */}
      <AdminSecurityDashboard
        isOpen={isSecurityDashboardOpen}
        onClose={() => setIsSecurityDashboardOpen(false)}
        auditLogs={auditLogs}
        adminAuth={adminAuth}
        company={company}
        currentUser={currentUser}
        onForceLogoutAll={handleLogout}
        onOpenForgotPin={() => setIsLoginModalOpen(true)}
      />

      {/* Admin PIN Prompt Modal */}
      <AdminPinPromptModal
        isOpen={pinPrompt.isOpen}
        onClose={() => setPinPrompt((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={pinPrompt.onVerified}
        adminAuth={adminAuth}
        currentUser={currentUser}
        title={pinPrompt.title}
        description={pinPrompt.description}
        onOpenForgotPin={() => {
          setPinPrompt((prev) => ({ ...prev, isOpen: false }));
          setIsLoginModalOpen(true);
        }}
      />
      {/* Global Google Play Install & Auto-Update System Modal */}
      <PlayStoreUpdateModal currentUser={currentUser} />
      </Suspense>
    </div>
    </AppUpdateProvider>
  );
}
