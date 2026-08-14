import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Customer, CustomerTransaction } from '../types';
import {
  BookOpen,
  Search,
  Plus,
  DollarSign,
  UserCheck,
  TrendingUp,
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  History,
  User
} from 'lucide-react';

export const CustomerKhataPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUdharModal, setShowUdharModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerLedger, setCustomerLedger] = useState<CustomerTransaction[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Customer Form
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    cnic: '',
    address: '',
    credit_limit: 25000
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: 'Cash Recovery Payment'
  });

  // Udhar Form
  const [udharForm, setUdharForm] = useState({
    amount: 0,
    notes: 'Manual Udhar / Credit Sale'
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to load customer Khata accounts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    try {
      await api.post('/customers', customerForm);
      setFormSuccess('Customer credit account created successfully!');
      setTimeout(() => {
        setShowAddCustomerModal(false);
        setFormSuccess('');
        setCustomerForm({ name: '', phone: '', cnic: '', address: '', credit_limit: 25000 });
        fetchCustomers();
      }, 1200);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create customer credit account');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setFormError(''); setFormSuccess('');
    try {
      await api.post(`/customers/${selectedCustomer.id}/payments`, paymentForm);
      setFormSuccess('Payment recorded & Khata balance updated!');
      setTimeout(() => {
        setShowPaymentModal(false);
        setFormSuccess('');
        setPaymentForm({ amount: 0, notes: 'Cash Recovery Payment' });
        fetchCustomers();
      }, 1200);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleRecordUdhar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setFormError(''); setFormSuccess('');
    try {
      await api.post(`/customers/${selectedCustomer.id}/udhar`, udharForm);
      setFormSuccess('Udhar entry added & customer balance updated!');
      setTimeout(() => {
        setShowUdharModal(false);
        setFormSuccess('');
        setUdharForm({ amount: 0, notes: 'Manual Udhar / Credit Sale' });
        fetchCustomers();
      }, 1200);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to record Udhar entry');
    }
  };

  const openCustomerLedger = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setShowLedgerModal(true);
    setLedgerLoading(true);
    try {
      const res = await api.get(`/customers/${cust.id}/ledger`);
      setCustomerLedger(res.data.transactions || []);
    } catch (err) {
      console.error('Failed to load customer ledger', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const sendWhatsAppReminder = (cust: Customer) => {
    const msg = `Respected ${cust.name}, this is a gentle reminder from pharmacy regarding your outstanding Khata balance of Rs. ${cust.current_balance.toFixed(2)}. Please settle at your earliest convenience. Thank you!`;
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const totalReceivables = customers.reduce((sum, c) => sum + c.current_balance, 0);
  const totalCreditLimits = customers.reduce((sum, c) => sum + c.credit_limit, 0);
  const activeAccountsCount = customers.filter((c) => c.current_balance > 0).length;

  const inputClass = "ph-glass-input w-full px-3.5 py-2.5 rounded-xl text-gray-800 text-xs font-medium placeholder-gray-400";

  return (
    <div className="space-y-6">
      {/* Glassmorphic Header */}
      <div className="ph-glass-banner p-6 md:p-8 relative overflow-hidden text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen className="w-6 h-6 text-green-200" />
            <span className="text-xs font-bold text-green-200 uppercase tracking-wider">Pharmacy Accounts Ledger</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Customer Credit ("Khata") Management</h2>
          <p className="text-xs text-green-100/90 mt-1 max-w-lg">
            Track customer monthly credit sales, manage credit limits, collect cash recoveries, and send WhatsApp balance alerts.
          </p>
        </div>

        <button
          onClick={() => setShowAddCustomerModal(true)}
          className="relative z-10 px-5 py-3 rounded-xl bg-white text-green-800 font-extrabold text-xs shadow-lg hover:bg-green-50 transition flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Credit Account</span>
        </button>
      </div>

      {/* Glass KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ph-glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Khata Receivables</p>
            <p className="text-2xl font-black text-gray-900 mt-1">Rs. {totalReceivables.toFixed(2)}</p>
            <p className="text-xs text-green-600 font-semibold mt-1">Outstanding customer debt</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-green-500/20 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="ph-glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Khata Accounts</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{activeAccountsCount} Customers</p>
            <p className="text-xs text-amber-600 font-semibold mt-1">Accounts with non-zero balance</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="ph-glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Credit Limit Allowed</p>
            <p className="text-2xl font-black text-teal-700 mt-1">Rs. {totalCreditLimits.toFixed(2)}</p>
            <p className="text-xs text-teal-600 font-semibold mt-1">Approved credit capacity</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Customer Search & Table */}
      <div className="ph-glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/60 pb-3">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-600" /> Customer Khata Ledger Accounts ({filteredCustomers.length})
          </h3>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ph-glass-input pl-9 py-2 text-xs rounded-xl w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading customer accounts...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-medium text-gray-500">No customer credit accounts found.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Credit Account" above to register your first Khata customer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ph-table">
              <thead>
                <tr>
                  <th>Customer Name</th><th>Phone Number</th><th>CNIC / Address</th>
                  <th>Credit Limit (PKR)</th><th>Current Debt Balance</th>
                  <th>Limit Usage</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => {
                  const usagePercent = Math.min(100, (cust.current_balance / (cust.credit_limit || 1)) * 100);
                  const isHighRisk = usagePercent >= 85;

                  return (
                    <tr key={cust.id}>
                      <td>
                        <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                          {cust.name}
                        </div>
                      </td>
                      <td className="font-mono text-xs text-gray-600 font-semibold">{cust.phone}</td>
                      <td>
                        <div className="text-xs text-gray-600">{cust.cnic || 'N/A'}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">{cust.address || '—'}</div>
                      </td>
                      <td className="font-bold text-gray-700">Rs. {cust.credit_limit.toFixed(2)}</td>
                      <td>
                        <span className={`font-black text-sm ${cust.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Rs. {cust.current_balance.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <div className="w-28 space-y-1">
                          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isHighRisk ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold text-right">{usagePercent.toFixed(0)}% used</p>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cust.current_balance > 0 && (
                            <button
                              onClick={() => sendWhatsAppReminder(cust)}
                              title="Send WhatsApp Balance Reminder"
                              className="px-2.5 py-1 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 text-xs font-bold transition flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setShowUdharModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                            title="Add Udhar / Manual Credit Charge"
                          >
                            <Plus className="w-3.5 h-3.5" /> Udhar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setShowPaymentModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Receive Cash
                          </button>
                          <button
                            onClick={() => openCustomerLedger(cust)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs font-bold transition flex items-center gap-1"
                          >
                            <History className="w-3.5 h-3.5" /> Ledger
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="ph-glass-modal w-full max-w-md p-6 space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-600" /> Register Khata Account
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Customer Full Name *</label>
                <input type="text" required placeholder="e.g. Haji Muhammad Rashid" value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone Number *</label>
                  <input type="text" required placeholder="0300-1234567" value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Credit Limit (PKR) *</label>
                  <input type="number" required step="500" value={customerForm.credit_limit}
                    onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">CNIC (Optional)</label>
                <input type="text" placeholder="35202-xxxxxxx-x" value={customerForm.cnic}
                  onChange={(e) => setCustomerForm({ ...customerForm, cnic: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Residential Address (Optional)</label>
                <input type="text" placeholder="House #, Street, City" value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} className={inputClass} />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200/60">
                <button type="button" onClick={() => setShowAddCustomerModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" className="ph-btn-primary py-2.5 text-xs">Save Customer Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Udhar / Manual Charge Modal */}
      {showUdharModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="ph-glass-modal w-full max-w-md p-6 space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" /> Record Udhar / Manual Credit Charge
              </h3>
              <button onClick={() => setShowUdharModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1">
              <p className="font-extrabold text-red-900">{selectedCustomer.name}</p>
              <p className="text-gray-700 font-mono">📱 Phone: <b>{selectedCustomer.phone}</b> | 🪪 CNIC: <b>{selectedCustomer.cnic || 'N/A'}</b></p>
              <div className="flex justify-between pt-1 border-t border-red-200/60 text-[11px]">
                <span className="text-gray-600">Current Debt: <b className="text-red-700">Rs. {selectedCustomer.current_balance.toFixed(2)}</b></span>
                <span className="text-gray-600">Max Limit: <b className="text-green-700">Rs. {selectedCustomer.credit_limit.toFixed(2)}</b></span>
              </div>
            </div>

            {formError && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{formError}</div>}
            {formSuccess && <div className="p-3 rounded-xl bg-green-50 text-green-700 text-xs font-semibold">{formSuccess}</div>}

            <form onSubmit={handleRecordUdhar} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Udhar Amount (PKR) *</label>
                <input type="number" step="1" required min="1" max={selectedCustomer.credit_limit - selectedCustomer.current_balance} value={udharForm.amount || ''}
                  onChange={(e) => setUdharForm({ ...udharForm, amount: Number(e.target.value) })} className={inputClass} placeholder="Enter Udhar amount to add" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Reason / Item Details</label>
                <input type="text" value={udharForm.notes}
                  onChange={(e) => setUdharForm({ ...udharForm, notes: e.target.value })} className={inputClass} placeholder="e.g. Monthly Medicine Credit Purchase" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200/60">
                <button type="button" onClick={() => setShowUdharModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md">Add Udhar Debt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Recovery Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="ph-glass-modal w-full max-w-md p-6 space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" /> Record Khata Cash Payment
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs space-y-1">
              <p className="font-bold text-green-800">{selectedCustomer.name} ({selectedCustomer.phone})</p>
              <p className="text-gray-600">Current Balance Debt: <b className="text-red-600">Rs. {selectedCustomer.current_balance.toFixed(2)}</b></p>
            </div>

            {formError && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{formError}</div>}
            {formSuccess && <div className="p-3 rounded-xl bg-green-50 text-green-700 text-xs font-semibold">{formSuccess}</div>}

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Cash Received Amount (PKR) *</label>
                <input type="number" step="1" required max={selectedCustomer.current_balance} value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} className={inputClass} placeholder="Enter cash amount" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Payment Notes</label>
                <input type="text" value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className={inputClass} />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200/60">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" className="ph-btn-primary py-2.5 text-xs">Record Cash Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger History Modal */}
      {showLedgerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="ph-glass-modal w-full max-w-2xl p-6 space-y-4 animate-fade-in relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-green-600" /> Ledger History: {selectedCustomer.name}
              </h3>
              <button onClick={() => setShowLedgerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {ledgerLoading ? (
              <div className="p-12 text-center text-gray-400">Loading ledger transaction log...</div>
            ) : customerLedger.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No credit sales or payments recorded yet.</div>
            ) : (
              <div className="overflow-y-auto flex-1 pr-1">
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th><th>Type</th><th>Notes / Invoice</th>
                      <th>Amount (PKR)</th><th className="text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerLedger.map((t) => (
                      <tr key={t.id}>
                        <td className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                        <td>
                          {t.transaction_type === 'credit_sale' ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                              Credit Sale
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                              Payment Received
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-gray-700">{t.notes || '—'}</td>
                        <td className={`font-extrabold text-xs ${t.transaction_type === 'credit_sale' ? 'text-red-600' : 'text-green-600'}`}>
                          {t.transaction_type === 'credit_sale' ? '+' : '-'} Rs. {t.amount.toFixed(2)}
                        </td>
                        <td className="text-right font-black text-xs text-gray-900">
                          Rs. {t.balance_after.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
