'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import { db, Bill, FinancialEntry } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Home, Plus, BarChart3, Trash2, Download, 
  Eye, Calendar, User 
} from 'lucide-react';
import { format } from 'date-fns';

type Tab = 'dashboard' | 'new-bill' | 'finance';

export default function RadhakrishnaOptical() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Form states for New Bill
  const [form, setForm] = useState({
    customerName: '', phone: '', gender: 'Male' as const,
    frameModel: '', lensType: 'Single Vision',
    totalAmount: 0, advancePaid: 0,
    prescription: {
      right: { sph: 0, cyl: 0, axis: 0, add: 0 },
      left: { sph: 0, cyl: 0, axis: 0, add: 0 },
    }
  });
  const signatureRef = useState<any>(null);

  // Finance states
  const [financeStart, setFinanceStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [financeEnd, setFinanceEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Live data from IndexedDB (never lost)
  const bills = useLiveQuery(() => db.bills.orderBy('date').reverse().toArray(), []) || [];
  const financialEntries = useLiveQuery(() => 
    db.financialEntries.orderBy('date').reverse().toArray(), []
  ) || [];

  // Filtered bills for dashboard & search
  const filteredBills = useMemo(() => 
    bills.filter(b => 
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.date.includes(searchTerm)
    ), [bills, searchTerm]
  );

  // Finance calculations (automatic)
  const filteredBillsForFinance = bills.filter(b => 
    b.date >= financeStart && b.date <= financeEnd
  );
  const filteredEntriesForFinance = financialEntries.filter(e => 
    e.date >= financeStart && e.date <= financeEnd
  );

  const totalRevenue = filteredBillsForFinance.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCOGS = filteredEntriesForFinance
    .filter(e => e.category === 'COGS')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = filteredEntriesForFinance
    .filter(e => e.category === 'Expense')
    .reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalCOGS - totalExpenses;

  // Auto-fill date/time
  const now = new Date();
  const autoDate = format(now, 'yyyy-MM-dd');
  const autoTime = format(now, 'HH:mm');
  const autoDay = format(now, 'EEEE');

  const handleSubmitBill = async () => {
    const sigCanvas = signatureRef.current;
    if (!sigCanvas || sigCanvas.isEmpty()) {
      alert('Please add digital signature');
      return;
    }

    const signatureData = sigCanvas.getTrimmedCanvas().toDataURL('image/png');

    const newBill: Bill = {
      ...form,
      date: autoDate,
      time: autoTime,
      day: autoDay,
      balanceDue: form.totalAmount - form.advancePaid,
      signature: signatureData,
    };

    await db.bills.add(newBill);
    setForm({ 
      customerName: '', phone: '', gender: 'Male',
      frameModel: '', lensType: 'Single Vision',
      totalAmount: 0, advancePaid: 0,
      prescription: { right: { sph: 0, cyl: 0, axis: 0, add: 0 }, left: { sph: 0, cyl: 0, axis: 0, add: 0 } }
    });
    sigCanvas.clear();
    setActiveTab('dashboard');
  };

  const generatePDF = (bill: Bill) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // OLED Luxury Header
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(0, 255, 200);
    doc.setFontSize(28);
    doc.text('RADHAKRISHNA OPTICAL', 105, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Kathmandu, Bagmati Province, Nepal • +977-1-4242424', 105, 30, { align: 'center' });

    // Bill Info
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(`Bill Date: ${bill.date} ${bill.day} ${bill.time}`, 15, 55);
    doc.text(`Customer: ${bill.customerName}`, 15, 65);
    doc.text(`Phone: ${bill.phone} • Gender: ${bill.gender}`, 15, 72);

    // Prescription Table
    doc.setFontSize(12);
    doc.text('PRESCRIPTION MATRIX', 15, 85);
    
    const tableY = 92;
    doc.setLineWidth(0.5);
    doc.line(15, tableY, 195, tableY);

    doc.text('OD (Right)', 25, tableY + 10);
    doc.text(`SPH: ${bill.prescription.right.sph.toFixed(2)}`, 25, tableY + 18);
    doc.text(`CYL: ${bill.prescription.right.cyl.toFixed(2)}`, 25, tableY + 26);
    doc.text(`AXIS: ${bill.prescription.right.axis}`, 25, tableY + 34);
    doc.text(`ADD: ${bill.prescription.right.add.toFixed(2)}`, 25, tableY + 42);

    doc.text('OS (Left)', 110, tableY + 10);
    doc.text(`SPH: ${bill.prescription.left.sph.toFixed(2)}`, 110, tableY + 18);
    doc.text(`CYL: ${bill.prescription.left.cyl.toFixed(2)}`, 110, tableY + 26);
    doc.text(`AXIS: ${bill.prescription.left.axis}`, 110, tableY + 34);
    doc.text(`ADD: ${bill.prescription.left.add.toFixed(2)}`, 110, tableY + 42);

    // Frame & Lens
    doc.text(`Frame: ${bill.frameModel}`, 15, tableY + 60);
    doc.text(`Lens: ${bill.lensType}`, 15, tableY + 68);

    // Totals
    doc.setFontSize(16);
    doc.text(`Total: NPR ${bill.totalAmount}`, 15, tableY + 85);
    doc.text(`Advance: NPR ${bill.advancePaid}`, 15, tableY + 95);
    doc.setTextColor(0, 255, 200);
    doc.text(`Balance Due: NPR ${bill.balanceDue}`, 15, tableY + 105);

    // Signature
    doc.setTextColor(255, 255, 255);
    doc.text('Customer Signature:', 15, tableY + 125);
    doc.addImage(bill.signature, 'PNG', 15, tableY + 130, 80, 30);

    doc.save(`RKO-Bill-${bill.customerName}.pdf`);
  };

  const deleteBill = async (id?: number) => {
    if (!id || !confirm('Delete this bill permanently?')) return;
    await db.bills.delete(id);
    setSelectedBill(null);
  };

  // Add financial entry
  const addFinancialEntry = async (category: 'COGS' | 'Expense') => {
    const desc = prompt(`Description for ${category}`);
    const amt = parseFloat(prompt('Amount (NPR)') || '0');
    if (!desc || !amt) return;
    
    await db.financialEntries.add({
      date: format(new Date(), 'yyyy-MM-dd'),
      category,
      description: desc,
      amount: amt
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Luxury Sidebar */}
      <div className="w-72 bg-black border-r border-white/10 flex flex-col">
        <div className="p-8 flex items-center gap-4 border-b border-white/10">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-2xl flex items-center justify-center text-4xl">
            👁️
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter neon-text">RADHAKRISHNA</h1>
            <p className="text-cyan-400 text-sm -mt-1">OPTICAL</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'new-bill', label: 'New Bill', icon: Plus },
            { id: 'finance', label: 'Profit Intelligence', icon: BarChart3 },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-left text-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-cyan-400 shadow-xl' 
                  : 'hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-6 h-6" />
              {tab.label}
            </motion.button>
          ))}
        </nav>

        <div className="p-6 text-xs text-white/40 border-t border-white/10">
          Offline • Data stored permanently in IndexedDB<br />
          Install as PWA for mobile use
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-10">
        <AnimatePresence mode="wait">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-6xl font-bold tracking-tighter">Bills</h2>
                  <p className="text-white/50 text-xl">All transactions • Live search</p>
                </div>
                <input
                  type="text"
                  placeholder="Search name or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass px-8 py-4 rounded-3xl text-xl w-96 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBills.length === 0 && (
                  <div className="col-span-full text-center py-20 text-white/40 text-2xl">
                    No bills yet. Create your first one →
                  </div>
                )}
                {filteredBills.map((bill) => (
                  <motion.div
                    key={bill.id}
                    whileHover={{ y: -10 }}
                    className="glass bill-card rounded-3xl p-8 cursor-pointer"
                    onClick={() => setSelectedBill(bill)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="text-3xl font-bold">{bill.customerName}</p>
                        <p className="text-cyan-400 mt-1">{bill.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-4xl font-bold">NPR {bill.totalAmount}</p>
                        <p className="text-xs text-white/50 mt-1">{bill.date}</p>
                      </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-end">
                      <div>
                        <span className="text-xs uppercase tracking-widest">Balance</span>
                        <p className="text-3xl font-mono text-rose-400">NPR {bill.balanceDue}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); generatePDF(bill); }}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl text-sm"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* NEW BILL FORM */}
          {activeTab === 'new-bill' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-6xl font-bold tracking-tighter mb-10">New Prescription Bill</h2>
              
              <div className="glass max-w-5xl mx-auto rounded-3xl p-12">
                <div className="grid grid-cols-2 gap-10">
                  {/* Left Column */}
                  <div className="space-y-8">
                    <div>
                      <label className="text-xs uppercase tracking-widest mb-2 block">Customer Name</label>
                      <input 
                        value={form.customerName} 
                        onChange={(e) => setForm({...form, customerName: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-2xl focus:outline-none focus:border-cyan-400"
                        placeholder="Ram Shrestha"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs uppercase tracking-widest mb-2 block">Phone</label>
                        <input 
                          value={form.phone} 
                          onChange={(e) => setForm({...form, phone: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-2xl"
                          placeholder="+977-98XXXXXXXX"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest mb-2 block">Gender</label>
                        <select 
                          value={form.gender} 
                          onChange={(e) => setForm({...form, gender: e.target.value as any})}
                          className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-2xl"
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-widest mb-2 block">Frame Model</label>
                      <input 
                        value={form.frameModel} 
                        onChange={(e) => setForm({...form, frameModel: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-2xl"
                        placeholder="Ray-Ban RB3025"
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-widest mb-2 block">Lens Type</label>
                      <select 
                        value={form.lensType} 
                        onChange={(e) => setForm({...form, lensType: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-2xl"
                      >
                        <option>Single Vision</option>
                        <option>Bifocal</option>
                        <option>Progressive</option>
                        <option>Photochromic</option>
                        <option>Polarized</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Column - Prescription Matrix */}
                  <div>
                    <h3 className="text-3xl font-bold mb-6 flex items-center gap-3">
                      <span>PRESCRIPTION MATRIX</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                    </h3>

                    <div className="grid grid-cols-2 gap-8">
                      {/* Right Eye */}
                      <div className="glass p-8 rounded-3xl">
                        <p className="text-cyan-400 text-xl mb-6">OD — RIGHT EYE</p>
                        <div className="space-y-6">
                          {['sph', 'cyl', 'axis', 'add'].map((field) => (
                            <div key={field} className="flex justify-between items-center">
                              <span className="uppercase text-sm tracking-widest">{field}</span>
                              <input 
                                type="number" 
                                step="0.25"
                                value={form.prescription.right[field as keyof typeof form.prescription.right]}
                                onChange={(e) => {
                                  const newPres = {...form.prescription};
                                  newPres.right[field as keyof typeof newPres.right] = parseFloat(e.target.value) || 0;
                                  setForm({...form, prescription: newPres});
                                }}
                                className="bg-black text-4xl font-mono w-24 text-center rounded-xl py-2 border border-white/10"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Left Eye */}
                      <div className="glass p-8 rounded-3xl">
                        <p className="text-cyan-400 text-xl mb-6">OS — LEFT EYE</p>
                        <div className="space-y-6">
                          {['sph', 'cyl', 'axis', 'add'].map((field) => (
                            <div key={field} className="flex justify-between items-center">
                              <span className="uppercase text-sm tracking-widest">{field}</span>
                              <input 
                                type="number" 
                                step="0.25"
                                value={form.prescription.left[field as keyof typeof form.prescription.left]}
                                onChange={(e) => {
                                  const newPres = {...form.prescription};
                                  newPres.left[field as keyof typeof newPres.left] = parseFloat(e.target.value) || 0;
                                  setForm({...form, prescription: newPres});
                                }}
                                className="bg-black text-4xl font-mono w-24 text-center rounded-xl py-2 border border-white/10"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Totals & Signature */}
                <div className="mt-12 grid grid-cols-3 gap-8">
                  <div>
                    <label className="text-xs uppercase mb-2 block">Total Amount (NPR)</label>
                    <input 
                      type="number"
                      value={form.totalAmount}
                      onChange={(e) => setForm({...form, totalAmount: parseFloat(e.target.value) || 0})}
                      className="w-full text-5xl font-mono bg-transparent border-b-2 border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase mb-2 block">Advance Paid (NPR)</label>
                    <input 
                      type="number"
                      value={form.advancePaid}
                      onChange={(e) => setForm({...form, advancePaid: parseFloat(e.target.value) || 0})}
                      className="w-full text-5xl font-mono bg-transparent border-b-2 border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-5xl font-mono text-emerald-400">
                      Balance: NPR {form.totalAmount - form.advancePaid}
                    </div>
                  </div>
                </div>

                {/* Digital Signature Pad */}
                <div className="mt-12">
                  <div className="flex justify-between mb-4">
                    <p className="uppercase tracking-widest text-sm">Digital Signature</p>
                    <button 
                      onClick={() => signatureRef.current?.clear()}
                      className="text-xs px-6 py-2 bg-white/10 rounded-full hover:bg-rose-500/20"
                    >
                      Clear Pad
                    </button>
                  </div>
    
