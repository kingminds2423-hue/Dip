import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDocFromServer,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  stripUndefined,
  commitDocOfflineSafe,
  deleteDocOfflineSafe,
  getOfflineQueuedDocsForCollection,
  getOfflineDeletedIdsForCollection,
  subscribeOfflineSyncState
} from './offlineSync';
import {
  Company,
  Partner,
  Staff,
  Transaction,
  CustomerDue,
  AdminAuth,
  BackupData,
  DigitalNotice,
  AppointedOfficer,
  OfficersState,
  AuditLog,
  CustomerComplaint,
  AppReleaseInfo,
  WhatsAppGroupConfig,
  JoinRequest,
  NotificationControl
} from '../types';

export const COMPANY_DOC_ID = 'dip-bhola-network';
export const SETTINGS_DOC_ID = 'auth';
export const NOTICE_DOC_ID = 'digital_notice';
export const OFFICERS_DOC_ID = 'appointed_officers';
export const APP_RELEASE_DOC_ID = 'app_release';
export const WHATSAPP_GROUP_DOC_ID = 'whatsapp_group';
export const NOTIFICATION_CONTROL_DOC_ID = 'notification_control';

export const DEFAULT_NOTIFICATION_CONTROL: NotificationControl = {
  clearedAt: '',
  clearedBy: '',
  clearedKeys: [],
  updatedAt: ''
};

export const DEFAULT_WHATSAPP_GROUP_CONFIG: WhatsAppGroupConfig = {
  groupName: 'DIP BHOLA NETWORK - Complain Group',
  groupInviteLink: '',
  staffGroupName: 'DIP BHOLA NETWORK - Staff Team',
  staffGroupInviteLink: '',
  partnerGroupName: 'DIP BHOLA NETWORK - Share Partners',
  partnerGroupInviteLink: '',
  smsAlertPhone: '',
  autoOpenWhatsAppOnSubmit: true,
  webhookUrl: ''
};

// Initial server connection check per Firebase Integration guideline (non-blocking for offline capability)
if (typeof window !== 'undefined' && navigator.onLine) {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore initial connection check: offline cache mode active.');
    }
  });
}

export const DEFAULT_DIGITAL_NOTICE: DigitalNotice = {
  text: 'স্বাগতম! DIP BHOLA NETWORK কেন্দ্রীয় সার্ভার ও হাই-স্পিড অপটিক্যাল ফাইবার সংযোগ',
  subText: 'লাইভ মনিটরিং সক্রিয় • যেকোনো জরুরি লাইন মেইনটেন্যান্স ও সহায়তায় যোগাযোগ করুন: ০১৭২১২০০০৪৯ (২৪ ঘণ্টা সেবা চালু)',
  showClock: true,
  fontSize: 'large',
  color: 'emerald',
  mode: 'scroll',
  speed: 'slow',
  customSpeedPxPerSec: 22,
  pauseOnHover: true,
  showRow3Notifications: true,
  row3FontSize: 'large',
  row3Mode: 'slow_scroll',
  row3SpeedPxPerSec: 16,
  row3SlideIntervalSec: 6,
  active: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'জাহিদুল ইসলাম (পরিচালক)'
};

// Auth check/init helper
export async function ensureAuth(): Promise<void> {
  return Promise.resolve();
}

// Subscribe to transactions (with live offline pending-sync merge & metadata detection)
export function subscribeTransactions(callback: (transactions: Transaction[]) => void) {
  ensureAuth();
  let lastSnapshotList: Transaction[] = [];

  const emitMerged = () => {
    const queuedDocs = getOfflineQueuedDocsForCollection<Transaction>('transactions');
    const deletedIds = getOfflineDeletedIdsForCollection('transactions');
    const byId = new Map<string, Transaction>();

    lastSnapshotList.forEach((tx) => {
      if (!deletedIds.has(tx.id)) {
        byId.set(tx.id, tx);
      }
    });
    queuedDocs.forEach((qTx) => {
      if (!deletedIds.has(qTx.id)) {
        const existing = byId.get(qTx.id);
        byId.set(qTx.id, { ...(existing || {}), ...qTx, _pendingSync: true });
      }
    });

    const merged = Array.from(byId.values()).sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    callback(merged);
  };

  const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
  const unsubSnap = onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) => {
        list.push({
          ...d.data(),
          id: d.id,
          _pendingSync: d.metadata.hasPendingWrites
        } as Transaction);
      });
      lastSnapshotList = list;
      emitMerged();
    },
    (err) => {
      handleFirestoreError(err, 'subscribeTransactions');
      emitMerged();
    }
  );

  const unsubOffline = subscribeOfflineSyncState(() => {
    emitMerged();
  });

  return () => {
    unsubSnap();
    unsubOffline();
  };
}

// Subscribe to staff members
export function subscribeStaffs(callback: (staffs: Staff[]) => void) {
  ensureAuth();
  return onSnapshot(
    collection(db, 'staffs'),
    (snapshot) => {
      const list: Staff[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as Staff);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, 'subscribeStaffs');
    }
  );
}

// Subscribe to partners
export function subscribePartners(callback: (partners: Partner[]) => void) {
  ensureAuth();
  return onSnapshot(
    collection(db, 'partners'),
    (snapshot) => {
      const list: Partner[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as Partner);
      });
      // Sort by investment descending
      list.sort((a, b) => b.investment - a.investment);
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, 'subscribePartners');
    }
  );
}

// Subscribe to company info
export function subscribeCompany(callback: (company: Company | null) => void) {
  ensureAuth();
  return onSnapshot(
    doc(db, 'companies', COMPANY_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Company);
      } else {
        callback(null);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeCompany');
    }
  );
}

// Subscribe to customer dues
export function subscribeCustomerDues(callback: (dues: CustomerDue[]) => void) {
  ensureAuth();
  return onSnapshot(
    collection(db, 'customerDues'),
    (snapshot) => {
      const list: CustomerDue[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as CustomerDue);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, 'subscribeCustomerDues');
    }
  );
}

// Subscribe to settings
export function subscribeSettings(callback: (settings: AdminAuth | null) => void) {
  ensureAuth();
  return onSnapshot(
    doc(db, 'settings', SETTINGS_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AdminAuth);
      } else {
        callback(null);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeSettings');
    }
  );
}

// Subscribe to Digital Display Notice
export function subscribeDigitalNotice(callback: (notice: DigitalNotice) => void) {
  ensureAuth();
  return onSnapshot(
    doc(db, 'settings', NOTICE_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as DigitalNotice);
      } else {
        callback(DEFAULT_DIGITAL_NOTICE);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeDigitalNotice');
      callback(DEFAULT_DIGITAL_NOTICE);
    }
  );
}

export async function saveDigitalNotice(notice: Partial<DigitalNotice>) {
  await ensureAuth();
  await setDoc(
    doc(db, 'settings', NOTICE_DOC_ID),
    stripUndefined({
      ...notice,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );
}

// Subscribe to Cloud App Release (Real-time Auto-Update Sync from AI Studio)
export function subscribeAppRelease(callback: (release: AppReleaseInfo | null) => void) {
  ensureAuth();
  return onSnapshot(
    doc(db, 'settings', APP_RELEASE_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AppReleaseInfo);
      } else {
        callback(null);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeAppRelease');
      callback(null);
    }
  );
}

export async function publishAppRelease(release: AppReleaseInfo) {
  await ensureAuth();
  await setDoc(
    doc(db, 'settings', APP_RELEASE_DOC_ID),
    stripUndefined({
      ...release,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );
}

// Subscribe & Save WhatsApp SMS Group Settings for Complain, Staff & Share Partner Joining
export function subscribeWhatsAppGroupConfig(callback: (config: WhatsAppGroupConfig) => void) {
  ensureAuth();
  return onSnapshot(
    doc(db, 'settings', WHATSAPP_GROUP_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...DEFAULT_WHATSAPP_GROUP_CONFIG, ...(snapshot.data() as Partial<WhatsAppGroupConfig>) });
      } else {
        callback(DEFAULT_WHATSAPP_GROUP_CONFIG);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeWhatsAppGroupConfig');
      callback(DEFAULT_WHATSAPP_GROUP_CONFIG);
    }
  );
}

export async function saveWhatsAppGroupConfig(config: Partial<WhatsAppGroupConfig>) {
  await ensureAuth();
  await commitDocOfflineSafe(
    'settings',
    WHATSAPP_GROUP_DOC_ID,
    stripUndefined({
      ...config,
      updatedAt: new Date().toISOString()
    }),
    true
  );
}

// Helper: Check if a notification item was cleared/deleted globally by Admin
export function isNotificationCleared(
  key: string,
  itemTimestamp?: string | null,
  control?: NotificationControl | null
): boolean {
  if (!control || !control.clearedAt) return false;
  if (Array.isArray(control.clearedKeys) && control.clearedKeys.includes(key)) {
    if (!itemTimestamp) return true;
    return itemTimestamp <= control.clearedAt;
  }
  if (itemTimestamp && itemTimestamp <= control.clearedAt) {
    return true;
  }
  return false;
}

// Subscribe to Cloud Notification Control (Admin Delete All Notifications sync)
export function subscribeNotificationControl(callback: (control: NotificationControl) => void) {
  ensureAuth();
  const path = `settings/${NOTIFICATION_CONTROL_DOC_ID}`;
  return onSnapshot(
    doc(db, 'settings', NOTIFICATION_CONTROL_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<NotificationControl>;
        callback({
          clearedAt: data.clearedAt || '',
          clearedBy: data.clearedBy || '',
          clearedKeys: Array.isArray(data.clearedKeys) ? data.clearedKeys : [],
          updatedAt: data.updatedAt || ''
        });
      } else {
        callback(DEFAULT_NOTIFICATION_CONTROL);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeNotificationControl', OperationType.GET, path);
      callback(DEFAULT_NOTIFICATION_CONTROL);
    }
  );
}

// Admin-only: Clear/Delete ALL current notifications globally across all sessions & Digital Display Row 3
export async function clearAllNotificationsInCloud(
  clearedBy: string,
  keysToClear: string[]
): Promise<NotificationControl> {
  await ensureAuth();
  const path = `settings/${NOTIFICATION_CONTROL_DOC_ID}`;
  const nowIso = new Date().toISOString();
  const boundedKeys = Array.from(
    new Set(keysToClear.filter((k) => typeof k === 'string' && k.length > 0))
  ).slice(0, 500);

  const payload: NotificationControl = {
    clearedAt: nowIso,
    clearedBy,
    clearedKeys: boundedKeys,
    updatedAt: nowIso
  };

  try {
    await commitDocOfflineSafe('settings', NOTIFICATION_CONTROL_DOC_ID, payload, false);
    return payload;
  } catch (err) {
    handleFirestoreError(err, 'clearAllNotificationsInCloud', OperationType.WRITE, path);
    throw err;
  }
}

// Admin-only: Restore previously cleared notifications
export async function restoreNotificationsInCloud(restoredBy: string): Promise<NotificationControl> {
  await ensureAuth();
  const path = `settings/${NOTIFICATION_CONTROL_DOC_ID}`;
  const payload: NotificationControl = {
    clearedAt: '',
    clearedBy: restoredBy,
    clearedKeys: [],
    updatedAt: new Date().toISOString()
  };
  try {
    await commitDocOfflineSafe('settings', NOTIFICATION_CONTROL_DOC_ID, payload, false);
    return payload;
  } catch (err) {
    handleFirestoreError(err, 'restoreNotificationsInCloud', OperationType.WRITE, path);
    throw err;
  }
}

export const DEFAULT_OFFICERS: OfficersState = {
  manager: {
    id: 'off-mgr-1',
    type: 'manager',
    name: 'মোঃ সাইফুল ইসলাম',
    designation: 'শাখা ও জেনারেল ম্যানেজার',
    phone: '01712345678',
    email: 'manager.dipbhola@gmail.com',
    nid: '19920911855000123',
    fatherName: 'মোঃ আব্দুল মান্নান',
    motherName: 'মোসাঃ রাশিদা বেগম',
    address: 'জাংগালিয়া মিঝি বাড়ি, ৩নং পশ্চিম ইলিশা, ভোলা সদর, ভোলা',
    permanentAddress: 'জাংগালিয়া মিঝি বাড়ি, ৩নং পশ্চিম ইলিশা, ভোলা সদর, ভোলা',
    education: 'স্নাতকোত্তর (মাস্টার্স)',
    appointmentDate: '2026-01-01',
    salaryOrFee: 15000,
    scopeOfWork: 'শাখার সকল ক্লায়েন্ট সংযোগ, দৈনিক ক্যাশ কালেকশন তদারকি, লাইনম্যান ও টেকনিশিয়ানদের কর্মবণ্টন এবং কেন্দ্রীয় বিলিং ব্যবস্থাপনা।',
    status: 'active',
    appointedBy: 'জাহিদুল ইসলাম (প্রধান পরিচালক)',
    terms: [
      'শাখার সার্বিক পরিচালনা, কর্মী মনিটরিং ও দৈনিক কালেকশন তত্ত্বাবধান করবেন।',
      'প্রতিদিনের আয়-ব্যয় কেন্দ্রীয় ক্যাশ খাতায় নির্ভুলভাবে এন্ট্রি নিশ্চিত করবেন।',
      'গ্রাহক সেবা, অভিযোগ নিস্পত্তি ও জরুরি লাইন মেরামতে সার্বক্ষণিক সক্রিয় থাকবেন।'
    ],
    updatedAt: new Date().toISOString()
  },
  auditor: {
    id: 'off-aud-1',
    type: 'auditor',
    name: 'মোঃ কাওসার আহমেদ',
    designation: 'অভ্যন্তরীণ হিসাব নিরীক্ষক (অডিট কর্মকর্তা)',
    phone: '01812345678',
    email: 'auditor.dipbhola@gmail.com',
    nid: '19890911855000456',
    fatherName: 'মরহুম মোঃ সামসুল হক',
    motherName: 'মোসাঃ সালেহা বেগম',
    address: 'ভোলা সদর, ভোলা',
    permanentAddress: 'ভোলা সদর, ভোলা',
    education: 'এম.কম (অ্যাকাউন্টিং) / সিএ সিসি',
    appointmentDate: '2026-01-01',
    salaryOrFee: 6000,
    scopeOfWork: 'মাসিক সকল খরচের ভাউচার নিরীক্ষণ, ক্যাশ ও ব্যাংক হিসাব প্রতিপাদন, অডিট রিপোর্ট প্রণয়ন ও আর্থিক স্বচ্ছতা নিশ্চিতকরণ।',
    status: 'active',
    appointedBy: 'জাহিদুল ইসলাম (প্রধান পরিচালক)',
    terms: [
      'প্রতি মাসের হিসাব ও ব্যয় ভাউচার স্বাধীন ও নিরপেক্ষভাবে নিরীক্ষা করবেন।',
      'আর্থিক কোনো অসঙ্গতি বা ঘাটতি পরিলক্ষিত হলে তাৎক্ষণিক লিখিতভাবে পরিচালককে অবহিত করবেন।',
      'মাসিক আর্থিক বিবরণীতে নিরীক্ষা প্রত্যয়ন ও বৈধ স্বাক্ষর প্রদান করবেন।'
    ],
    updatedAt: new Date().toISOString()
  },
  history: []
};

// Subscribe to Appointed Officers (Manager & Auditor)
export function subscribeOfficers(callback: (officers: OfficersState) => void) {
  ensureAuth();
  return onSnapshot(
    doc(db, 'settings', OFFICERS_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as OfficersState;
        callback({
          manager: data.manager || DEFAULT_OFFICERS.manager,
          auditor: data.auditor || DEFAULT_OFFICERS.auditor,
          history: data.history || []
        });
      } else {
        // Seed default officers
        setDoc(doc(db, 'settings', OFFICERS_DOC_ID), DEFAULT_OFFICERS, { merge: true }).catch(() => {});
        callback(DEFAULT_OFFICERS);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeOfficers');
      callback(DEFAULT_OFFICERS);
    }
  );
}

// Save complete officers state
export async function saveOfficers(officers: OfficersState) {
  await ensureAuth();
  await setDoc(
    doc(db, 'settings', OFFICERS_DOC_ID),
    officers,
    { merge: true }
  );
}

// Appoint or Change Officer (Manager or Auditor) with automatic history tracking
export async function appointOfficer(
  type: 'manager' | 'auditor',
  newOfficerData: Omit<AppointedOfficer, 'id' | 'status' | 'updatedAt'>,
  currentOfficers: OfficersState
) {
  await ensureAuth();
  const currentActive = type === 'manager' ? currentOfficers.manager : currentOfficers.auditor;

  const previousOfficerRecord: AppointedOfficer = {
    ...currentActive,
    status: 'previous',
    updatedAt: new Date().toISOString()
  };

  const newOfficer: AppointedOfficer = {
    ...newOfficerData,
    id: `off-${type}-${Date.now()}`,
    type,
    status: 'active',
    updatedAt: new Date().toISOString()
  };

  const updatedHistory = [
    previousOfficerRecord,
    ...(currentOfficers.history || [])
  ];

  const updatedState: OfficersState = {
    ...currentOfficers,
    [type]: newOfficer,
    history: updatedHistory
  };

  await setDoc(
    doc(db, 'settings', OFFICERS_DOC_ID),
    updatedState,
    { merge: true }
  );
  return newOfficer;
}


// Transaction operations (Offline-safe with instant local save & auto-online sync)
export async function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) {
  await ensureAuth();
  const txId = tx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullTx = stripUndefined({
    ...tx,
    id: txId,
    createdAt: new Date().toISOString()
  }) as Transaction;
  const res = await commitDocOfflineSafe('transactions', txId, fullTx, false);
  return { ...fullTx, _pendingSync: !res.syncedOnline };
}

export async function updateTransaction(id: string, updates: Partial<Transaction>) {
  await ensureAuth();
  await commitDocOfflineSafe('transactions', id, stripUndefined(updates), true);
}

export async function deleteTransaction(id: string) {
  await ensureAuth();
  await deleteDocOfflineSafe('transactions', id);
}

// Staff operations
export async function addStaff(staff: Staff) {
  await ensureAuth();
  const id = staff.id || `staff-${Date.now()}`;
  const fullStaff = stripUndefined({ ...staff, id }) as Staff;
  await commitDocOfflineSafe('staffs', id, fullStaff, false);
  return fullStaff;
}

export async function updateStaff(id: string, updates: Partial<Staff>) {
  await ensureAuth();
  await commitDocOfflineSafe('staffs', id, stripUndefined(updates), true);
}

export async function deleteStaff(id: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'staffs', id));
}

// Partner operations
export async function addPartner(partner: Partner) {
  await ensureAuth();
  const id = partner.id || `partner-${Date.now()}`;
  const fullPartner = stripUndefined({ ...partner, id }) as Partner;
  await commitDocOfflineSafe('partners', id, fullPartner, false);
  return fullPartner;
}

export async function updatePartner(id: string, updates: Partial<Partner>) {
  await ensureAuth();
  await commitDocOfflineSafe('partners', id, stripUndefined(updates), true);
}

export async function deletePartner(id: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'partners', id));
}

export async function addPartnerInvestment(partnerId: string, partner: Partner, amount: number, note: string, date: string) {
  await ensureAuth();
  const invRecord = {
    id: `inv-${Date.now()}`,
    date,
    amount,
    note
  };
  const newHistory = [...(partner.investmentHistory || []), invRecord];
  const newTotalInvestment = partner.investment + amount;
  await setDoc(doc(db, 'partners', partnerId), stripUndefined({
    investment: newTotalInvestment,
    investmentHistory: newHistory
  }), { merge: true });
}

// Customer Dues operations
export async function addCustomerDue(due: Omit<CustomerDue, 'id' | 'updatedAt'> & { id?: string }) {
  await ensureAuth();
  const id = due.id || `due-${Date.now()}`;
  const fullDue = stripUndefined({
    ...due,
    id,
    updatedAt: new Date().toISOString()
  }) as CustomerDue;
  await commitDocOfflineSafe('customerDues', id, fullDue, false);
  return fullDue;
}

export async function updateCustomerDue(id: string, updates: Partial<CustomerDue>) {
  await ensureAuth();
  await commitDocOfflineSafe('customerDues', id, stripUndefined({
    ...updates,
    updatedAt: new Date().toISOString()
  }), true);
}

export async function deleteCustomerDue(id: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'customerDues', id));
}

// ==========================================
// Customer Complaints Ticketing Operations
// (গ্রাহক অভিযোগ ব্যবস্থাপনা ও অফলাইন-অনলাইন অটো সিঙ্ক)
// ==========================================
export function subscribeComplaints(callback: (complaints: CustomerComplaint[]) => void) {
  ensureAuth();
  let lastSnapshotList: CustomerComplaint[] = [];

  const emitMerged = () => {
    const queuedDocs = getOfflineQueuedDocsForCollection<CustomerComplaint>('complaints');
    const deletedIds = getOfflineDeletedIdsForCollection('complaints');
    const byId = new Map<string, CustomerComplaint>();

    lastSnapshotList.forEach((c) => {
      if (!deletedIds.has(c.id)) {
        byId.set(c.id, c);
      }
    });
    queuedDocs.forEach((qCmp) => {
      if (!deletedIds.has(qCmp.id)) {
        const existing = byId.get(qCmp.id);
        byId.set(qCmp.id, { ...(existing || {}), ...qCmp, _pendingSync: true });
      }
    });

    const merged = Array.from(byId.values()).sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
    callback(merged);
  };

  const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
  const unsubSnap = onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const list: CustomerComplaint[] = [];
      snapshot.forEach((d) => {
        list.push({
          ...d.data(),
          id: d.id,
          _pendingSync: d.metadata.hasPendingWrites
        } as CustomerComplaint);
      });
      lastSnapshotList = list;
      emitMerged();
    },
    (err) => {
      handleFirestoreError(err, 'subscribeComplaints');
      emitMerged();
    }
  );

  const unsubOffline = subscribeOfflineSyncState(() => {
    emitMerged();
  });

  return () => {
    unsubSnap();
    unsubOffline();
  };
}

export async function addComplaint(
  complaint: Omit<CustomerComplaint, 'id' | 'createdAt'> & { id?: string }
): Promise<CustomerComplaint> {
  await ensureAuth();
  const id = complaint.id || `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const fullComplaint = stripUndefined({
    ...complaint,
    id,
    createdAt: now,
    updatedAt: now
  }) as CustomerComplaint;
  const res = await commitDocOfflineSafe('complaints', id, fullComplaint, false);
  return { ...fullComplaint, _pendingSync: !res.syncedOnline };
}

export async function updateComplaint(id: string, updates: Partial<CustomerComplaint>): Promise<void> {
  await ensureAuth();
  await commitDocOfflineSafe(
    'complaints',
    id,
    stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }),
    true
  );
}

export async function deleteComplaint(id: string): Promise<void> {
  await ensureAuth();
  await deleteDocOfflineSafe('complaints', id);
}

// ==========================================
// Staff & Share Partner Joining Requests Operations
// ==========================================
export function subscribeJoinRequests(callback: (requests: JoinRequest[]) => void) {
  ensureAuth();
  let lastSnapshotList: JoinRequest[] = [];

  const emitMerged = () => {
    const queuedDocs = getOfflineQueuedDocsForCollection<JoinRequest>('joinRequests');
    const deletedIds = getOfflineDeletedIdsForCollection('joinRequests');
    const byId = new Map<string, JoinRequest>();

    lastSnapshotList.forEach((r) => {
      if (!deletedIds.has(r.id)) {
        byId.set(r.id, r);
      }
    });
    queuedDocs.forEach((qReq) => {
      if (!deletedIds.has(qReq.id)) {
        const existing = byId.get(qReq.id);
        byId.set(qReq.id, { ...(existing || {}), ...qReq, _pendingSync: true });
      }
    });

    const merged = Array.from(byId.values()).sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
    callback(merged);
  };

  const q = query(collection(db, 'joinRequests'), orderBy('createdAt', 'desc'));
  const unsubSnap = onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const list: JoinRequest[] = [];
      snapshot.forEach((d) => {
        list.push({
          ...d.data(),
          id: d.id,
          _pendingSync: d.metadata.hasPendingWrites
        } as JoinRequest);
      });
      lastSnapshotList = list;
      emitMerged();
    },
    (err) => {
      handleFirestoreError(err, 'subscribeJoinRequests');
      emitMerged();
    }
  );

  const unsubOffline = subscribeOfflineSyncState(() => {
    emitMerged();
  });

  return () => {
    unsubSnap();
    unsubOffline();
  };
}

export async function addJoinRequest(
  reqData: Omit<JoinRequest, 'id' | 'status' | 'createdAt'> & { id?: string }
): Promise<JoinRequest> {
  await ensureAuth();
  const id = reqData.id || `join-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullReq = stripUndefined({
    ...reqData,
    id,
    status: 'pending' as const,
    createdAt: new Date().toISOString()
  }) as JoinRequest;
  const res = await commitDocOfflineSafe('joinRequests', id, fullReq, false);
  return { ...fullReq, _pendingSync: !res.syncedOnline };
}

export async function updateJoinRequest(id: string, updates: Partial<JoinRequest>): Promise<void> {
  await ensureAuth();
  await commitDocOfflineSafe('joinRequests', id, stripUndefined(updates), true);
}

export async function deleteJoinRequest(id: string): Promise<void> {
  await ensureAuth();
  await deleteDocOfflineSafe('joinRequests', id);
}

// Company info & Settings
export async function updateCompany(company: Company) {
  await ensureAuth();
  await setDoc(doc(db, 'companies', COMPANY_DOC_ID), stripUndefined(company), { merge: true });
}

export async function updateSettings(settings: AdminAuth) {
  await ensureAuth();
  await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), stripUndefined(settings), { merge: true });
}

// Seed or Sync backup data from JSON file into Firestore
export async function seedInitialDataIfEmpty(force = false): Promise<boolean> {
  await ensureAuth();
  try {
    if (!force && typeof window !== 'undefined' && window.localStorage.getItem('dip_bhola_seeded_v1') === '1') {
      return false;
    }
    const existingSnap = await getDocs(collection(db, 'transactions'));
    if (!existingSnap.empty && !force) {
      try {
        window.localStorage.setItem('dip_bhola_seeded_v1', '1');
      } catch {
        // ignore storage errors
      }
      return false; // Already seeded
    }

    // Load backup JSON
    let backup: BackupData | null = null;
    try {
      const res = await fetch('/default_backup.json');
      if (res.ok) {
        backup = await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch default backup file:', e);
    }

    if (!backup) {
      return false;
    }

    const batch = writeBatch(db);

    // Seed Company
    if (backup.company) {
      const compRef = doc(db, 'companies', COMPANY_DOC_ID);
      const { partners, ...compData } = backup.company;
      compData.logoUrl = '/assets/aistudio/FB_IMG_1793200670972_1fb968d5.jpg';
      batch.set(compRef, compData);

      // Seed Partners
      if (partners && Array.isArray(partners)) {
        for (const p of partners) {
          const pRef = doc(db, 'partners', p.id);
          batch.set(pRef, p);
        }
      }
    }

    // Seed Admin Auth
    if (backup.adminAuth) {
      const setRef = doc(db, 'settings', SETTINGS_DOC_ID);
      batch.set(setRef, backup.adminAuth);
    }

    // Seed Staff
    if (backup.staffs && Array.isArray(backup.staffs)) {
      for (const s of backup.staffs) {
        const sRef = doc(db, 'staffs', s.id);
        batch.set(sRef, s);
      }
    }

    // Seed Transactions
    if (backup.transactions && Array.isArray(backup.transactions)) {
      for (const t of backup.transactions) {
        const tRef = doc(db, 'transactions', t.id);
        batch.set(tRef, t);
      }
    }

    // Seed Customer Dues
    if (backup.customerDues && Array.isArray(backup.customerDues)) {
      for (const cd of backup.customerDues) {
        const cdRef = doc(db, 'customerDues', cd.id);
        batch.set(cdRef, cd);
      }
    }

    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, 'seedInitialData');
    return false;
  }
}

// Export Full Backup JSON matching user schema
export function generateBackupJson(
  company: Company,
  partners: Partner[],
  adminAuth: AdminAuth,
  staffs: Staff[],
  transactions: Transaction[],
  customerDues: CustomerDue[]
): BackupData {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    company: {
      ...company,
      partners: partners || []
    },
    adminAuth: adminAuth || { pin: '1234', phone: '01700000000' },
    staffs: staffs || [],
    transactions: transactions || [],
    customerDues: customerDues || []
  };
}

// Export CSV in the exact format from user instructions
export function generateCsvData(transactions: Transaction[], companyName = 'DIP BHOLA NETWORK', monthStr?: string): string {
  const header = 'ক্রমিক (SL),তারিখ (Date),ধরন (Type),বিবরণ (Title),ক্যাটাগরি (Category),টাকার পরিমাণ (Amount BDT),পেমেন্ট মাধ্যম (Payment Method),এন্ট্রিদাতা (Added By),মন্তব্য / নোট (Note),লেনদেন আইডি (ID)\n';

  let totalIncome = 0;
  let totalExpense = 0;

  const rows = transactions.map((t, idx) => {
    const isIncome = t.type === 'income';
    if (isIncome) totalIncome += t.amount;
    else totalExpense += t.amount;

    const typeLabel = isIncome ? 'আয় (Income)' : 'ব্যয় (Expense)';
    const cleanTitle = `"${(t.title || '').replace(/"/g, '""')}"`;
    const cleanCat = `"${(t.category || '').replace(/"/g, '""')}"`;
    const cleanPayment = `"${t.paymentMethod === 'bkash' ? 'বিকাশ (bKash)' : t.paymentMethod === 'nagad' ? 'নগদ (Nagad)' : t.paymentMethod === 'bank' ? 'ব্যাংক (Bank)' : 'নগদ (Cash)'}"`;
    const cleanAdded = `"${(t.addedBy || '').replace(/"/g, '""')}"`;
    const cleanNote = `"${(t.note || '').replace(/"/g, '""')}"`;
    const cleanId = `"${t.id}"`;

    return `${idx + 1},${t.date},${typeLabel},${cleanTitle},${cleanCat},${t.amount},${cleanPayment},${cleanAdded},${cleanNote},${cleanId}`;
  }).join('\n');

  const netBalance = totalIncome - totalExpense;
  const todayStr = new Date().toISOString().split('T')[0];
  const targetMonth = monthStr || todayStr.substring(0, 7);

  const summary = `\n---,---,---,---,---,---,---,---,---,---\n` +
    `হিসাবের সারসংক্ষেপ (Financial Summary),,,,,,,,,\n` +
    `মোট লেনদেন সংখ্যা (Total Records):,${transactions.length},,,,,,,,\n` +
    `মোট আয় / জমা (Total Income):,৳ ${totalIncome},,,,,,,,\n` +
    `মোট ব্যয় / খরচ (Total Expense):,৳ ${totalExpense},,,,,,,,\n` +
    `নিট ব্যালেন্স / ক্যাশ ইন হ্যান্ড (Net Balance):,৳ ${netBalance},,,,,,,,\n` +
    `প্রতিষ্ঠান:,"${companyName}",হিসাবের মাস:,${targetMonth},ডাউনলোড তারিখ:,${todayStr},,,,\n`;

  return header + rows + summary;
}

// Audit Log operations (stores recent security and operational changes)
export function subscribeAuditLogs(callback: (logs: AuditLog[]) => void) {
  ensureAuth();
  const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as AuditLog);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, 'subscribeAuditLogs');
    }
  );
}

export async function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  try {
    await ensureAuth();
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullLog = stripUndefined({
      ...log,
      id,
      timestamp: new Date().toISOString()
    }) as AuditLog;
    // Non-blocking audit log write so offline transactions/complaints never stall
    commitDocOfflineSafe('auditLogs', id, fullLog, false).catch(() => {});
    return fullLog;
  } catch (e) {
    console.warn('Audit log write error:', e);
    return null;
  }
}
