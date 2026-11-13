export interface InvestmentRecord {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export interface Partner {
  id: string;
  name: string;
  phone: string;
  role: string;
  occupation?: string; // কি করে / পেশা
  fatherName?: string; // বাবার নাম
  motherName?: string; // মায়ের নাম
  address?: string; // ঠিকানা
  permanentAddress?: string; // স্থায়ী ঠিকানা
  nidNumber?: string; // NID নাম্বার
  email?: string;
  photoUrl?: string; // অংশীদারের ছবি
  nidPhotoUrl?: string; // অংশীদারের NID কার্ডের ছবি
  fatherNidPhotoUrl?: string; // বাবার NID কার্ডের ছবি
  motherNidPhotoUrl?: string; // মায়ের NID কার্ডের ছবি
  joinedDate?: string; // অংশীদার হিসেবে যোগদানের তারিখ
  investment: number;
  sharePercentage: number;
  investmentHistory: InvestmentRecord[];
  notes?: string;
  pin?: string;
  status?: 'active' | 'inactive';
}

export interface Company {
  id?: string;
  name: string;
  subTitle: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
  currencySymbol: string;
  dailyExpenseThreshold?: number; // দৈনিক ব্যয়ের সর্বোচ্চ সতর্কতা সীমা (BDT)
  partners?: Partner[];
}

export interface Staff {
  id: string;
  name: string;
  fatherName?: string;
  motherName?: string;
  phone: string;
  email?: string;
  nid?: string;
  address?: string;
  permanentAddress?: string;
  bloodGroup?: string;
  education?: string;
  emergencyContact?: string;
  designation: string;
  salary: number;
  joinedAt: string;
  photoUrl?: string;
  pin: string;
  status?: 'active' | 'inactive';
}

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'bank' | 'rocket';

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  addedBy: string;
  addedById?: string;
  note?: string;
  createdAt: string;
  _pendingSync?: boolean;
}

export interface CustomerDue {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  totalDue: number;
  paidAmount: number;
  currentDue: number;
  notes?: string;
  updatedAt: string;
}

export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved';
export type ComplaintPriority = 'normal' | 'urgent' | 'critical';

export interface CustomerComplaint {
  id: string;
  name: string; // গ্রাহকের নাম
  idNumber: string; // আইডি নম্বর / গ্রাহক আইডি / লাইন কোড
  mobileNumber: string; // মোবাইল নম্বর
  address: string; // ঠিকানা / এলাকা
  complainDetails: string; // অভিযোগের বিবরণ
  status: ComplaintStatus; // পেন্ডিং | সমাধানাধীন | সমাধানকৃত
  priority: ComplaintPriority; // সাধারণ | জরুরি | অতি জরুরি
  assignedStaffId?: string; // দায়িত্বপ্রাপ্ত টেকনিশিয়ান আইডি
  assignedStaffName?: string; // দায়িত্বপ্রাপ্ত টেকনিশিয়ান নাম
  reportedBy?: string; // এন্ট্রিদাতা
  reportedById?: string; // এন্ট্রিদাতা আইডি
  resolutionNote?: string; // সমাধানের নোট
  resolvedAt?: string; // সমাধানের তারিখ ও সময়
  createdAt: string; // অভিযোগের তারিখ ও সময়
  updatedAt?: string;
  _pendingSync?: boolean;
}

export interface AdminAuth {
  pin: string;
  phone: string;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  company: Company;
  adminAuth: AdminAuth;
  staffs: Staff[];
  transactions: Transaction[];
  customerDues: CustomerDue[];
  complaints?: CustomerComplaint[];
}

export type UserRole = 'admin' | 'director' | 'manager' | 'staff' | 'partner';

export interface UserSession {
  role: UserRole;
  id: string;
  name: string;
  designation: string;
  phone?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action:
    | 'transaction_add'
    | 'transaction_edit'
    | 'transaction_delete'
    | 'staff_add'
    | 'staff_edit'
    | 'staff_delete'
    | 'due_update'
    | 'notice_update'
    | 'company_update'
    | 'officer_appoint'
    | 'security_alert'
    | 'complaint_add'
    | 'complaint_edit'
    | 'complaint_status'
    | 'complaint_delete'
    | 'app_release_push'
    | 'join_request_submit'
    | 'join_request_approve'
    | 'notifications_clear_all'
    | 'login'
    | 'logout';
  actionBengali: string;
  performedBy: string;
  performedById: string;
  role: UserRole;
  details: string;
  metadata?: Record<string, any>;
}

export interface NotificationControl {
  clearedAt: string;
  clearedBy: string;
  clearedKeys: string[];
  updatedAt?: string;
}

export type DisplayColor = 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'gold' | 'neonblue';
export type DisplayMode = 'scroll' | 'glow' | 'steady';
export type DisplaySpeed = 'veryslow' | 'slow' | 'normal' | 'fast';
export type DisplayFontSize = 'medium' | 'large' | 'extralarge';
export type Row3NotificationMode = 'slow_scroll' | 'spotlight_slide' | 'steady';

export interface DigitalNotice {
  text: string; // ১ম লাইন: বড় ডিসপ্লে লেখা / প্রধান ঘোষণা
  subText?: string; // ২য় লাইন: সহযোগী বার্তা / লাইভ স্ট্যাটাস / হেল্পলাইন
  showClock?: boolean; // ডিজিটাল ঘড়ি ও সময় প্রদর্শন
  fontSize?: DisplayFontSize; // ফন্টের আকার
  color: DisplayColor;
  mode: DisplayMode;
  speed: DisplaySpeed;
  customSpeedPxPerSec?: number; // অ্যাডমিন কাস্টম পিক্সেল-পার-সেকেন্ড গতি (১০ থেকে ১০০)
  pauseOnHover?: boolean; // মাউস বা টাচে লেখা থেমে থাকবে কিনা
  showRow3Notifications?: boolean; // ৩য় সারিতে বড় নোটিফিকেশন দেখাবে কিনা
  row3FontSize?: DisplayFontSize; // ৩য় সারির ফন্ট সাইজ
  row3Mode?: Row3NotificationMode; // ৩য় সারির নোটিফিকেশন প্রদর্শনের ধরন
  row3SpeedPxPerSec?: number; // ৩য় সারির নোটিফিকেশন স্ক্রল গতি (৮ থেকে ৬০ px/s)
  row3SlideIntervalSec?: number; // স্পটলাইট মোডে প্রতিটি নোটিফিকেশন কত সেকেন্ড স্থির থাকবে
  active: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface AppointedOfficer {
  id: string;
  type: 'manager' | 'auditor';
  name: string;
  designation: string; // শাখা ম্যানেজার, জেনারেল ম্যানেজার, অভ্যন্তরীণ হিসাব নিরীক্ষক ইত্যাদি
  phone: string;
  email?: string;
  nid?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  permanentAddress?: string;
  education?: string;
  appointmentDate: string;
  salaryOrFee?: number;
  scopeOfWork?: string;
  photoUrl?: string;
  status: 'active' | 'previous';
  appointedBy?: string;
  terms?: string[];
  notes?: string;
  updatedAt?: string;
}

export interface OfficersState {
  manager: AppointedOfficer;
  auditor: AppointedOfficer;
  history?: AppointedOfficer[];
}

export interface AppReleaseInfo {
  version: string;
  buildId: string;
  buildTime: string;
  releaseNotes: string[];
  publishedBy?: string;
  forceAutoUpdate?: boolean;
  updatedAt?: string;
}

export interface WhatsAppGroupConfig {
  groupName: string;
  groupInviteLink: string;
  staffGroupName?: string;
  staffGroupInviteLink?: string;
  partnerGroupName?: string;
  partnerGroupInviteLink?: string;
  smsAlertPhone?: string;
  autoOpenWhatsAppOnSubmit: boolean;
  webhookUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface JoinRequest {
  id: string;
  role: 'staff' | 'partner';
  name: string;
  phone: string;
  pin: string;
  designationOrRole?: string;
  address?: string;
  nid?: string;
  initialInvestment?: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  _pendingSync?: boolean;
}

