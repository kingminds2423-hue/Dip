import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { IspClientBilling, BillingPaymentStatus, ClientPaymentRecord } from '../types/clientBilling';

export interface IClientBillingDao {
  getAllClients(): Promise<IspClientBilling[]>;
  getClientById(id: string): Promise<IspClientBilling | null>;
  getClientsByPaymentStatus(status: BillingPaymentStatus): Promise<IspClientBilling[]>;
  searchClients(searchQuery: string): Promise<IspClientBilling[]>;
  insertClient(client: Omit<IspClientBilling, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<IspClientBilling>;
  updateClient(id: string, updates: Partial<IspClientBilling>): Promise<void>;
  deleteClient(id: string): Promise<void>;
  recordPayment(clientId: string, amount: number, paymentMethod: string, collectedBy: string, note?: string): Promise<ClientPaymentRecord>;
  subscribeClients(callback: (clients: IspClientBilling[]) => void): () => void;
}

class ClientBillingDaoImpl implements IClientBillingDao {
  private collectionName = 'customerDues';

  async getAllClients(): Promise<IspClientBilling[]> {
    const snap = await getDocs(collection(db, this.collectionName));
    const list: IspClientBilling[] = [];
    snap.forEach((d) => {
      list.push(this.mapDocToEntity(d.id, d.data()));
    });
    return list;
  }

  async getClientById(id: string): Promise<IspClientBilling | null> {
    const d = await getDoc(doc(db, this.collectionName, id));
    if (!d.exists()) return null;
    return this.mapDocToEntity(d.id, d.data());
  }

  async getClientsByPaymentStatus(status: BillingPaymentStatus): Promise<IspClientBilling[]> {
    const all = await this.getAllClients();
    return all.filter((c) => c.paymentStatus === status);
  }

  async searchClients(searchQuery: string): Promise<IspClientBilling[]> {
    const all = await this.getAllClients();
    const q = searchQuery.toLowerCase().trim();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }

  async insertClient(
    clientData: Omit<IspClientBilling, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<IspClientBilling> {
    const id = clientData.id || `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const due = clientData.monthlyDue ?? clientData.monthlyBill;
    const paid = clientData.paidAmount ?? 0;
    const paymentStatus: BillingPaymentStatus =
      due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    const entity: IspClientBilling = {
      ...clientData,
      id,
      monthlyDue: due,
      paidAmount: paid,
      paymentStatus,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(doc(db, this.collectionName, id), entity);
    return entity;
  }

  async updateClient(id: string, updates: Partial<IspClientBilling>): Promise<void> {
    const now = new Date().toISOString();
    let computedStatus = updates.paymentStatus;
    if (updates.monthlyDue !== undefined) {
      if (updates.monthlyDue <= 0) computedStatus = 'paid';
      else if ((updates.paidAmount || 0) > 0) computedStatus = 'partial';
      else computedStatus = 'unpaid';
    }

    await setDoc(
      doc(db, this.collectionName, id),
      {
        ...updates,
        ...(computedStatus ? { paymentStatus: computedStatus } : {}),
        updatedAt: now
      },
      { merge: true }
    );
  }

  async deleteClient(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  async recordPayment(
    clientId: string,
    amount: number,
    paymentMethod: string,
    collectedBy: string,
    note?: string
  ): Promise<ClientPaymentRecord> {
    const client = await this.getClientById(clientId);
    if (!client) throw new Error('Client not found');

    const newDue = Math.max(0, client.monthlyDue - amount);
    const newPaid = (client.paidAmount || 0) + amount;
    const newStatus: BillingPaymentStatus = newDue <= 0 ? 'paid' : 'partial';
    const now = new Date().toISOString();
    const dateStr = now.split('T')[0];

    await this.updateClient(clientId, {
      monthlyDue: newDue,
      paidAmount: newPaid,
      paymentStatus: newStatus,
      lastPaymentDate: dateStr,
      lastPaymentAmount: amount,
      lastPaymentMethod: paymentMethod,
      collectedBy
    });

    const paymentRecord: ClientPaymentRecord = {
      id: `pay-${Date.now()}`,
      clientId,
      customerName: client.customerName,
      clientCode: client.clientCode,
      amount,
      paymentMethod,
      date: dateStr,
      collectedBy,
      note
    };

    return paymentRecord;
  }

  subscribeClients(callback: (clients: IspClientBilling[]) => void): () => void {
    return onSnapshot(
      collection(db, this.collectionName),
      (snapshot) => {
        const list: IspClientBilling[] = [];
        snapshot.forEach((d) => {
          list.push(this.mapDocToEntity(d.id, d.data()));
        });
        callback(list);
      },
      (err) => {
        console.warn('subscribeClients error:', err);
      }
    );
  }

  private mapDocToEntity(id: string, data: any): IspClientBilling {
    const monthlyDue = data.monthlyDue !== undefined ? data.monthlyDue : (data.currentDue || data.totalDue || 0);
    const monthlyBill = data.monthlyBill !== undefined ? data.monthlyBill : (data.totalDue || 500);
    const paidAmount = data.paidAmount || 0;
    const paymentStatus: BillingPaymentStatus =
      data.paymentStatus || (monthlyDue <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid');

    return {
      id,
      customerName: data.customerName || 'গ্রাহক',
      clientCode: data.clientCode || data.idNumber || `DBN-${id.substring(0, 6)}`,
      phone: data.phone || data.mobileNumber || '',
      address: data.address || '',
      packageSpeed: data.packageSpeed || '10 Mbps',
      monthlyBill,
      monthlyDue,
      paidAmount,
      paymentStatus,
      billingCycleDay: data.billingCycleDay || 1,
      lastPaymentDate: data.lastPaymentDate || data.updatedAt?.split('T')[0],
      lastPaymentAmount: data.lastPaymentAmount,
      lastPaymentMethod: data.lastPaymentMethod,
      collectedBy: data.collectedBy,
      notes: data.notes || '',
      isActive: data.isActive !== false,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  }
}

export const clientBillingDao: IClientBillingDao = new ClientBillingDaoImpl();
