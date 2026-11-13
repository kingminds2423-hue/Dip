export type BillingPaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface IspClientBilling {
  id: string;
  customerName: string;
  clientCode: string; // Connection / Client ID, e.g., DBN-C101
  phone: string;
  address: string;
  packageSpeed: string; // e.g., '10 Mbps'
  monthlyBill: number;
  monthlyDue: number; // Current due amount in BDT
  paidAmount: number; // Amount paid in current cycle
  paymentStatus: BillingPaymentStatus;
  billingCycleDay: number; // 1-31 (Day of month)
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastPaymentMethod?: string; // 'cash' | 'bkash' | 'nagad' | 'bank'
  collectedBy?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientPaymentRecord {
  id: string;
  clientId: string;
  customerName: string;
  clientCode: string;
  amount: number;
  paymentMethod: string;
  date: string;
  collectedBy: string;
  receiptNumber?: string;
  note?: string;
}
