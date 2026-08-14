import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Medicine, Batch, Sale, Customer, PaymentMethod } from '../types';
import { BarcodeLabelPrinterModal } from '../components/BarcodeLabelPrinterModal';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  History,
  Pill,
  X,
  User,
  Phone,
  Cross,
  Download,
  Percent,
  Barcode,
  ScanLine
} from 'lucide-react';

interface CartItem {
  medicine: Medicine;
  selectedBatch?: Batch;
  quantity: number;
  unit_price: number;
}

export const POSPage: React.FC = () => {
  const { user, business } = useAuth();
  const isOwner = user?.role === 'owner_pharmacist';

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Barcode Scanner Input & Status
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Customer & Khata Accounts
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment & Checkout State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [prescriptionVerified, setPrescriptionVerified] = useState(false);

  // Label Printing Modal
  const [printingMed, setPrintingMed] = useState<Medicine | null>(null);

  // Completed Sale & Modal state
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [posError, setPosError] = useState('');

  // Sales History state
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [prescriptionOnlyFilter, setPrescriptionOnlyFilter] = useState(false);

  const fetchMedicines = async (query = '') => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/medicines', { params: { q: query } });
      setMedicines(res.data);
    } catch (err) {
      console.error('Failed to load medicines for POS', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to load customers for POS', err);
    }
  };

  const fetchSalesHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/pos/sales', { params: { prescription_only: prescriptionOnlyFilter } });
      setSalesHistory(res.data);
    } catch (err) {
      console.error('Failed to load sales history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pos') {
      fetchMedicines(searchQuery);
      fetchCustomers();
    } else {
      fetchSalesHistory();
    }
  }, [activeTab, searchQuery, prescriptionOnlyFilter]);

  // Hardware Barcode Scan Logic (looks up exact barcode match and auto-adds to cart)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    setBarcodeInput('');

    // Search medicine by exact barcode or batch barcode
    const matched = medicines.find(
      (m) =>
        m.barcode === code ||
        m.batches.some((b) => b.barcode === code)
    );

    if (matched) {
      addToCart(matched);
      setPosError('');
    } else {
      setPosError(`Barcode "${code}" not found in inventory catalog.`);
    }
  };

  const addToCart = (med: Medicine) => {
    setPosError('');
    if (med.total_stock <= 0) {
      setPosError(`${med.brand_name} is out of stock!`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.medicine.id === med.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      if (updated[existingIndex].quantity + 1 > med.total_stock) {
        setPosError(`Cannot add more than available stock (${med.total_stock})`);
        return;
      }
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          medicine: med,
          selectedBatch: med.batches.length > 0 ? med.batches[0] : undefined,
          quantity: 1,
          unit_price: med.sale_price,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else if (newQty > updated[index].medicine.total_stock) {
      setPosError(`Maximum stock reached for ${updated[index].medicine.brand_name}`);
      return;
    } else {
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handleBatchOverride = (cartIndex: number, batchId: number) => {
    const updated = [...cart];
    const foundBatch = updated[cartIndex].medicine.batches.find((b) => b.id === batchId);
    if (foundBatch) {
      updated[cartIndex].selectedBatch = foundBatch;
      setCart(updated);
    }
  };

  const subtotalCartAmount = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount = (subtotalCartAmount * discountPercent) / 100;
  const netCartAmount = subtotalCartAmount - discountAmount;

  const cartRequiresRx = cart.some((item) => item.medicine.requires_prescription);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleCheckout = async () => {
    setPosError('');
    if (cart.length === 0) return;

    if (cartRequiresRx && !prescriptionVerified) {
      setPosError('Prescription verification is required for prescription-only items in cart!');
      return;
    }

    if (cartRequiresRx && !isOwner) {
      setPosError('Prescription approval required! Only an Owner/Pharmacist can verify and dispense prescription medicines.');
      return;
    }

    if (paymentMethod === 'customer_credit' && !selectedCustomerId) {
      setPosError('Please select a registered Customer Khata Account for Credit billing.');
      return;
    }

    if (paymentMethod === 'customer_credit' && selectedCustomer) {
      if ((selectedCustomer.current_balance + netCartAmount) > selectedCustomer.credit_limit) {
        setPosError(
          `Khata Credit limit exceeded! Balance is Rs. ${selectedCustomer.current_balance.toFixed(2)}, purchase is Rs. ${netCartAmount.toFixed(2)}, max allowed is Rs. ${selectedCustomer.credit_limit.toFixed(2)}.`
        );
        return;
      }
    }

    try {
      const payload = {
        items: cart.map((item) => ({
          medicine_id: item.medicine.id,
          batch_id: item.selectedBatch?.id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        customer_id: selectedCustomerId || undefined,
        customer_name: (selectedCustomer ? selectedCustomer.name : customerName.trim()) || undefined,
        customer_phone: (selectedCustomer ? selectedCustomer.phone : customerPhone.trim()) || undefined,
        payment_method: paymentMethod,
        prescription_verified: cartRequiresRx ? prescriptionVerified : false,
      };

      const res = await api.post('/pos/sales', payload);
      setCompletedSale(res.data);
      setShowReceiptModal(true);

      // Clear cart
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedCustomerId(null);
      setDiscountPercent(0);
      setPrescriptionVerified(false);
      fetchMedicines(searchQuery);
      fetchCustomers();
    } catch (err: any) {
      setPosError(err.response?.data?.detail || 'Checkout failed. Please check stock or permissions.');
    }
  };

  const downloadReceiptPdf = async (saleId: number) => {
    try {
      const response = await api.get(`/pos/sales/${saleId}/receipt`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PharmaFlow_Receipt_${saleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF receipt', err);
      alert('Failed to download PDF receipt. Please try again.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Thermal Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-green-600" /> POS Counter & Barcode Billing
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            FEFO Automated First-Expiry Batch Selection with Barcode Scanner & Customer Khata Integration.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white/70 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'pos' ? 'bg-green-600 text-white shadow-md shadow-green-500/20' : 'text-gray-500 hover:text-gray-700 hover:bg-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> POS Counter
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-green-600 text-white shadow-md shadow-green-500/20' : 'text-gray-500 hover:text-gray-700 hover:bg-white'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Sales History
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Barcode Scanner, Search & Catalog Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* USB/Bluetooth Barcode Scanner Bar */}
            <form onSubmit={handleBarcodeSubmit} className="ph-glass-card p-3 flex items-center gap-2 border border-green-300/50">
              <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                <ScanLine className="w-4 h-4 animate-pulse" />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan USB/Bluetooth Barcode or type EAN code..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs font-mono font-bold text-gray-800 focus:outline-none placeholder-gray-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <Barcode className="w-3.5 h-3.5" /> Scan Barcode
              </button>
            </form>

            {/* Product Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Medicine by Brand (Panadol) or Generic (Paracetamol)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ph-glass-input pl-10 py-3 rounded-2xl shadow-sm text-sm"
              />
            </div>

            {isLoading ? (
              <div className="ph-glass-card p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Searching medicine catalog...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {medicines.map((med) => {
                  const outOfStock = med.total_stock <= 0;
                  const firstBatch = med.batches[0];

                  return (
                    <div
                      key={med.id}
                      onClick={() => !outOfStock && addToCart(med)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        outOfStock
                          ? 'bg-gray-50/50 border-gray-200 opacity-50 cursor-not-allowed'
                          : 'ph-glass-card hover:border-green-400 hover:shadow-lg'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{med.brand_name}</h4>
                          <div className="flex items-center gap-1 shrink-0">
                            {med.requires_prescription && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold">
                                Rx
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintingMed(med);
                              }}
                              title="Print Thermal Barcode Label"
                              className="p-1 rounded-md bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 transition"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 font-medium line-clamp-1">{med.generic_name}</p>
                        {med.barcode && (
                          <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 inline-block mt-1">
                            {med.barcode}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-extrabold text-gray-900">Rs. {med.sale_price.toFixed(2)}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{med.unit_type}</p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              outOfStock
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-green-100 text-green-700 border border-green-200'
                            }`}
                          >
                            {outOfStock ? 'Out of Stock' : `${med.total_stock} in stock`}
                          </span>
                          {firstBatch && !outOfStock && (
                            <p className="text-[9px] text-gray-400 mt-0.5">FEFO Exp: {firstBatch.expiry_date}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Checkout Cart & Khata Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="ph-glass-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-green-600" /> Counter Cart ({cart.length})
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {posError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{posError}</span>
                </div>
              )}

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                  <Pill className="w-10 h-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">Cart is empty</p>
                  <p className="text-xs text-gray-400">Scan barcode or click medicines to add items.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1 divide-y divide-gray-100">
                  {cart.map((item, idx) => (
                    <div key={idx} className="pt-2 first:pt-0 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-gray-800">{item.medicine.brand_name}</p>
                          <p className="text-[11px] text-green-600 font-medium">{item.medicine.generic_name}</p>
                        </div>
                        <p className="text-xs font-extrabold text-gray-900">
                          Rs. {(item.quantity * item.unit_price).toFixed(2)}
                        </p>
                      </div>

                      {/* FEFO Batch Selector */}
                      {item.medicine.batches.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Batch:</span>
                          <select
                            value={item.selectedBatch?.id || ''}
                            onChange={(e) => handleBatchOverride(idx, Number(e.target.value))}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-[11px] rounded px-2 py-0.5 focus:outline-none"
                          >
                            {item.medicine.batches.map((b) => (
                              <option key={b.id} value={b.id}>
                                #{b.batch_number} (Exp: {b.expiry_date} · Qty: {b.quantity_in_stock})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quantity buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(idx, -1)}
                            className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-gray-800 px-2">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(idx, 1)}
                            className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Checkout Form */}
              {cart.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-200/60">
                  
                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: 'cash', label: 'Cash', icon: Banknote },
                        { id: 'card', label: 'Card', icon: CreditCard },
                        { id: 'mobile_wallet', label: 'EasyPaisa/Jazz', icon: Smartphone },
                        { id: 'customer_credit', label: 'Khata Credit', icon: BookOpen },
                      ].map((pm) => {
                        const Icon = pm.icon;
                        const isSelected = paymentMethod === pm.id;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id as any)}
                            className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition ${
                              isSelected
                                ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-[11px]">{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Khata Account Selection if payment_method === 'customer_credit' */}
                  {paymentMethod === 'customer_credit' ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                      <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
                        Select Khata Account *
                      </label>
                      <select
                        value={selectedCustomerId || ''}
                        onChange={(e) => setSelectedCustomerId(Number(e.target.value) || null)}
                        className="ph-glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        <option value="">-- Choose Registered Khata Customer --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone}) — Debt: Rs.{c.current_balance.toFixed(0)} / Limit: Rs.{c.credit_limit.toFixed(0)}
                          </option>
                        ))}
                      </select>

                      {selectedCustomer && (
                        <div className="text-[11px] space-y-0.5 pt-1 font-semibold text-amber-800">
                          <div className="flex justify-between">
                            <span>Current Balance Debt:</span>
                            <span className="font-bold text-red-600">Rs. {selectedCustomer.current_balance.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Approved Limit:</span>
                            <span>Rs. {selectedCustomer.credit_limit.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Customer Name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="ph-glass-input pl-8 py-1.5 text-xs rounded-xl"
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="ph-glass-input pl-8 py-1.5 text-xs rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {/* Discount percentage input */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-600 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-green-600" /> Discount %:
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-16 px-2 py-1 bg-white border border-gray-300 rounded-lg text-right font-bold text-xs"
                    />
                  </div>

                  {/* Prescription Checkbox if required */}
                  {cartRequiresRx && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1">
                      <label className="flex items-start gap-2 text-xs text-red-700 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prescriptionVerified}
                          onChange={(e) => setPrescriptionVerified(e.target.checked)}
                          className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                        />
                        <span>Prescription verified & approved by Pharmacist</span>
                      </label>
                    </div>
                  )}

                  {/* Pricing Breakdown */}
                  <div className="space-y-1 pt-2 border-t border-gray-200/60 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal:</span>
                      <span>Rs. {subtotalCartAmount.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Discount ({discountPercent}%):</span>
                        <span>- Rs. {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                      <span>Total Payable:</span>
                      <span className="text-green-700">Rs. {netCartAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    className="ph-btn-primary w-full py-3 text-sm shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Checkout & Print Receipt</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Sales History Tab */
        <div className="ph-glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <History className="w-5 h-5 text-green-600" /> Transaction History
            </h3>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={prescriptionOnlyFilter}
                onChange={(e) => setPrescriptionOnlyFilter(e.target.checked)}
                className="rounded text-green-600 focus:ring-green-500"
              />
              <span>Filter Rx Only</span>
            </label>
          </div>

          {historyLoading ? (
            <div className="p-12 text-center text-gray-400">Loading sales log...</div>
          ) : salesHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No transactions recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ph-table">
                <thead>
                  <tr>
                    <th>Invoice #</th><th>Date/Time</th><th>Customer</th>
                    <th>Items</th><th>Total Amount</th><th>Payment Method</th>
                    <th>Rx Status</th><th className="text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs font-bold text-gray-800">#{s.invoice_number || s.id}</td>
                      <td className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="text-xs font-semibold text-gray-700">
                        {s.customer_name || 'Walk-in Customer'}
                        {s.customer_phone && <div className="text-[10px] text-gray-400">{s.customer_phone}</div>}
                      </td>
                      <td className="text-xs font-semibold text-gray-600">{s.items.length} items</td>
                      <td className="font-extrabold text-green-700">Rs. {s.total_amount.toFixed(2)}</td>
                      <td className="capitalize text-xs font-semibold text-gray-600">
                        {s.payment_method === 'customer_credit' ? 'Khata Credit' : s.payment_method}
                      </td>
                      <td>
                        {s.prescription_verified ? (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => downloadReceiptPdf(s.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 border border-emerald-200 transition shadow-sm"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                          <button
                            onClick={() => {
                              setCompletedSale(s);
                              setShowReceiptModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold flex items-center gap-1 border border-green-200 transition"
                          >
                            <Printer className="w-3.5 h-3.5" /> Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Label Printing Modal */}
      {printingMed && (
        <BarcodeLabelPrinterModal
          medicine={printingMed}
          batch={printingMed.batches[0]}
          onClose={() => setPrintingMed(null)}
        />
      )}

      {/* Enhanced Printable Receipt Modal */}
      {showReceiptModal && completedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="ph-glass-modal w-full max-w-md p-6 space-y-4 animate-fade-in relative my-8">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Preview Area */}
            <div id="printable-receipt" className="space-y-4 text-gray-800">
              <div className="text-center border-b border-gray-200 pb-4">
                <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center mx-auto mb-2 font-bold shadow-md">
                  <Cross className="w-5 h-5 fill-white" />
                </div>
                <h3 className="font-extrabold text-gray-900 text-lg uppercase tracking-tight">
                  {business?.name || 'PharmaFlow Pharmacy'}
                </h3>
                <p className="text-xs text-gray-500">{business?.address || 'Pakistan'}</p>
                <p className="text-xs text-gray-500">License #: {business?.license_number}</p>
                <p className="text-xs text-green-700 font-semibold mt-1">OFFICIAL PURCHASE RECEIPT</p>
              </div>

              <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Invoice No:</span>
                  <span className="font-mono font-bold text-gray-900">#{completedSale.invoice_number || completedSale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Date & Time:</span>
                  <span className="font-medium">{new Date(completedSale.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Customer:</span>
                  <span className="font-bold">{completedSale.customer_name || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Payment Method:</span>
                  <span className="capitalize font-semibold">
                    {completedSale.payment_method === 'customer_credit' ? 'Khata Credit' : completedSale.payment_method}
                  </span>
                </div>
              </div>

              <div className="border-t border-b border-gray-200 py-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                      <th className="pb-1">Item</th>
                      <th className="pb-1 text-center">Qty</th>
                      <th className="pb-1 text-right">Price</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {completedSale.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2">
                          <div className="font-bold text-gray-800">{item.medicine_name || item.medicine?.brand_name || 'Medicine'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            Batch: #{item.batch_number || item.batch?.batch_number || 'FEFO'}
                          </div>
                        </td>
                        <td className="py-2 text-center font-bold">{item.quantity}</td>
                        <td className="py-2 text-right">Rs. {item.unit_price.toFixed(2)}</td>
                        <td className="py-2 text-right font-bold text-gray-900">
                          Rs. {item.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-xs text-right pt-1">
                <div className="flex justify-between text-gray-600">
                  <span>Items Total:</span>
                  <span className="font-bold">Rs. {completedSale.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-green-700 pt-2 border-t border-gray-200">
                  <span>Grand Total Paid:</span>
                  <span>Rs. {completedSale.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-gray-200 text-[11px] text-gray-400 space-y-1">
                <p className="font-medium text-gray-600">Thank you for visiting {business?.name}!</p>
                <p>Non-returnable if seal broken · Powered by CuraRx ERP Suite</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button onClick={handlePrintReceipt} className="ph-btn-primary flex-1 py-2.5 text-xs">
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>
              <button onClick={() => downloadReceiptPdf(completedSale.id)} className="ph-btn-secondary flex-1 py-2.5 text-xs">
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
