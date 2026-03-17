import Dexie, { Table } from 'dexie';

export interface Bill {
  id?: number;
  customerName: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  prescription: {
    right: { sph: number; cyl: number; axis: number; add: number };
    left: { sph: number; cyl: number; axis: number; add: number };
  };
  frameModel: string;
  lensType: string;
  date: string;
  time: string;
  day: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  signature: string; // base64 dataURL
}

export interface FinancialEntry {
  id?: number;
  date: string;
  category: 'COGS' | 'Expense';
  description: string;
  amount: number;
}

class RadhakrishnaDB extends Dexie {
  bills!: Table<Bill>;
  financialEntries!: Table<FinancialEntry>;

  constructor() {
    super('RadhakrishnaOpticalDB');
    this.version(1).stores({
      bills: '++id, customerName, date, phone',
      financialEntries: '++id, date, category',
    });
  }
}

export const db = new RadhakrishnaDB();
