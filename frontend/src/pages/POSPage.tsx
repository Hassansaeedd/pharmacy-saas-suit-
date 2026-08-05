import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Medicine, Batch, Sale } from '../types';
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
  History,
  Pill,
  X,
  User,
  Phone,
  Cross,
  Download,
  Percent
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

  // Customer & Payment State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_wallet'>('cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [prescriptionVerified, setPrescriptionVerified] = useState(false);

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
    } else {
      fetchSalesHistory();
    }
  }, [activeTab, searchQuery, prescriptionOnlyFilter]);

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

    try {
      const payload = {
        items: cart.map((item) => ({
          medicine_id: item.medicine.id,
          batch_id: item.selectedBatch?.id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
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
      setDiscountPercent(0);
      setPrescriptionVerified(false);
      fetchMedicines(searchQuery);
    } catch (err: any) {
      setPosError(err.response?.data?.detail || 'Checkout failed. Please check stock or permissions.');
    }
  };

  const downloadReceiptPdf = (saleId: number) => {
    window.open(`${api.defaults.baseURL}/pos/sales/${saleId}/receipt`, '_blank');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Receipt CSS block for clean thermal paper print */}
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
            <ShoppingCart className="w-7 h-7 text-green-600" /> POS Counter & Billing
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            FEFO Automated First-Expiry-First-Out Batch Selection. All transactions in <span className="text-green-600 font-bold">PKR</span>.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 border border-gray-200 rounded-xl">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'pos' ? 'bg-green-600 text-white shadow-md shadow-green-500/20' : 'text-gray-500 hover:text-gray-700 hover:bg-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> POS Counter
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-green-600 text-white shadow-md shadow-green-500/20' : 'text-gray-500 hover:text-gray-700 hover:bg-white'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Sales History
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Medicine Catalog Search & Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search Medicine by Brand (Panadol) or Generic (Paracetamol)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ph-input pl-10 py-3 rounded-xl shadow-sm text-sm"
              />
            </div>

            {isLoading ? (
              <div className="ph-card p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Searching medicine catalog...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                {medicines.map((med) => {
                  const outOfStock = med.total_stock <= 0;
                  const firstBatch = med.batches[0];

                  return (
                    <div
                      key={med.id}
                      onClick={() => !outOfStock && addToCart(med)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        outOfStock
                          ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                          : 'ph-card hover:border-green-400 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{med.brand_name}</h4>
                          {med.requires_prescription && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold shrink-0">
                              Rx
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-green-600 font-medium line-clamp-1">{med.generic_name}</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
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

          {/* Right Column: Checkout Cart & Receipt Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="ph-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
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
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{posError}</span>
                </div>
              )}

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                  <Pill className="w-10 h-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">Cart is empty</p>
                  <p className="text-xs text-gray-400">Click medicines on the left to add items to bill.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-gray-100">
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

                      {/* FEFO Batch selector if multiple batches */}
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
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  {/* Customer Details (Optional) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="ph-input pl-8 py-1.5 text-xs"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="ph-input pl-8 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  {/* Payment Method selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'cash', label: 'Cash', icon: Banknote },
                        { id: 'card', label: 'Card', icon: CreditCard },
                        { id: 'mobile_wallet', label: 'EasyPaisa/Jazz', icon: Smartphone },
                      ].map((pm) => {
                        const Icon = pm.icon;
                        const isSelected = paymentMethod === pm.id;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id as any)}
                            className={`p-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
                              isSelected
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

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
                      className="w-16 px-2 py-1 bg-white border border-gray-300 rounded text-right font-bold text-xs"
                    />
                  </div>

                  {/* Prescription Checkbox if required */}
                  {cartRequiresRx && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-1">
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
                  <div className="space-y-1 pt-2 border-t border-gray-100 text-xs">
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
        <div className="ph-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
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
                    <th>Items</th><th>Total Amount</th><th>Payment</th>
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
                      <td className="capitalize text-xs font-semibold text-gray-600">{s.payment_method}</td>
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
                        <button
                          onClick={() => {
                            setCompletedSale(s);
                            setShowReceiptModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold flex items-center gap-1 ml-auto border border-green-200 transition"
                        >
                          <Printer className="w-3.5 h-3.5" /> Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Printable Receipt Modal */}
      {showReceiptModal && completedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 border border-gray-200 animate-fade-in relative my-8">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Preview Area */}
            <div id="printable-receipt" className="space-y-4 text-gray-800">
              {/* Receipt Header */}
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

              {/* Transaction Metadata */}
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
                  <span className="capitalize font-semibold">{completedSale.payment_method}</span>
                </div>
              </div>

              {/* Itemized Table */}
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

              {/* Receipt Summary */}
              <div className="space-y-1 text-xs text-right pt-1">
                <div className="flex justify-between text-gray-600">
                  <span>Items Total:</span>
                  <span className="font-bold">Rs. {completedSale.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Sales Tax (0%):</span>
                  <span>Rs. 0.00</span>
                </div>
                <div className="flex justify-between text-base font-black text-green-700 pt-2 border-t border-gray-200">
                  <span>Grand Total Paid:</span>
                  <span>Rs. {completedSale.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-3 border-t border-gray-200 text-[11px] text-gray-400 space-y-1">
                <p className="font-medium text-gray-600">Thank you for visiting {business?.name}!</p>
                <p>Non-returnable if seal broken · Powered by PharmaFlow SaaS</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handlePrintReceipt}
                className="ph-btn-primary flex-1 py-2.5 text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                onClick={() => downloadReceiptPdf(completedSale.id)}
                className="ph-btn-secondary flex-1 py-2.5 text-xs"
              >
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
