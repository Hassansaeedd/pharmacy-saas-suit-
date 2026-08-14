import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Supplier, PurchaseOrder, Medicine } from '../types';
import {
  Truck,
  Plus,
  Building2,
  FileText,
  Sparkles,
  CheckCircle2,
  PackageCheck,
  X,
  Clock
} from 'lucide-react';

export const ProcurementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'po' | 'suppliers' | 'ai'>('po');
  
  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [draftPOs, setDraftPOs] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    address: ''
  });

  // Manual PO Form
  const [poForm, setPoForm] = useState({
    supplier_id: 0,
    items: [{ medicine_id: 0, quantity: 50, cost_price: 0 }]
  });

  // Receive Form
  const [receiveForm, setReceiveForm] = useState<{ item_id: number; batch_number: string; expiry_date: string; received_qty: number }[]>([]);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [supRes, poRes, medRes, aiRes] = await Promise.all([
        api.get('/inventory/suppliers'),
        api.get('/inventory/purchase-orders'),
        api.get('/inventory/medicines'),
        api.get('/forecasting/purchase-orders').catch(() => ({ data: { purchase_orders: [] } }))
      ]);
      setSuppliers(supRes.data);
      setPurchaseOrders(poRes.data);
      setMedicines(medRes.data);
      setDraftPOs(aiRes.data?.purchase_orders || []);
    } catch (err) {
      console.error('Failed to load procurement data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    try {
      await api.post('/inventory/suppliers', supplierForm);
      setFormSuccess('Supplier registered successfully!');
      setTimeout(() => {
        setShowAddSupplierModal(false);
        setFormSuccess('');
        setSupplierForm({ name: '', contact: '', address: '' });
        fetchData();
      }, 1200);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create supplier profile');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplier_id) {
      setFormError('Please select a supplier distributor');
      return;
    }
    setFormError(''); setFormSuccess('');
    try {
      await api.post('/inventory/purchase-orders', poForm);
      setFormSuccess('Purchase order submitted successfully!');
      setTimeout(() => {
        setShowCreatePOModal(false);
        setFormSuccess('');
        setPoForm({ supplier_id: 0, items: [{ medicine_id: 0, quantity: 50, cost_price: 0 }] });
        fetchData();
      }, 1200);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to submit purchase order');
    }
  };

  const handleCreateAIPO = async (draftPo: any) => {
    // Find matching supplier or pick first supplier
    let supId = suppliers.find((s) => s.name.toLowerCase() === draftPo.supplier_name.toLowerCase())?.id;
    if (!supId && suppliers.length > 0) supId = suppliers[0].id;
    if (!supId) {
      alert('Please register at least one Supplier Distributor first before generating PO.');
      return;
    }

    try {
      const itemsPayload = draftPo.items.map((it: any) => {
        const med = medicines.find((m) => m.id === it.medicine_id);
        return {
          medicine_id: it.medicine_id,
          quantity: it.suggested_order_qty,
          cost_price: med ? med.purchase_price || 0 : 0
        };
      });

      await api.post('/inventory/purchase-orders', {
        supplier_id: supId,
        items: itemsPayload
      });

      alert(`AI Purchase Order generated & submitted to ${draftPo.supplier_name}!`);
      fetchData();
    } catch (err) {
      console.error('Failed to generate AI PO', err);
    }
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initialReceiveState = po.items.map((it) => ({
      item_id: it.id,
      batch_number: `BATCH-${Date.now().toString().slice(-4)}`,
      expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      received_qty: it.quantity
    }));
    setReceiveForm(initialReceiveState);
    setShowReceiveModal(true);
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    setFormError(''); setFormSuccess('');
    try {
      await api.post(`/inventory/purchase-orders/${selectedPO.id}/receive`, {
        received_items: receiveForm
      });
      setFormSuccess('Stock received into inventory successfully! Batches created.');
      setTimeout(() => {
        setShowReceiveModal(false);
        setFormSuccess('');
        fetchData();
      }, 1200);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to receive stock');
    }
  };

  const inputClass = "ph-glass-input w-full px-3.5 py-2.5 rounded-xl text-gray-800 text-xs font-medium placeholder-gray-400";

  return (
    <div className="space-y-6">
      {/* Glassmorphic Header */}
      <div className="ph-glass-banner p-6 md:p-8 relative overflow-hidden text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <Truck className="w-6 h-6 text-green-200" />
            <span className="text-xs font-bold text-green-200 uppercase tracking-wider">Suppliers & Stock Inbound</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Supplier Procurement & PO Management</h2>
          <p className="text-xs text-green-100/90 mt-1 max-w-lg">
            Manage distributor profiles, auto-generate AI stock orders, and receive PO stock batches into inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-10 shrink-0">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md border border-white/30 transition flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
          <button
            onClick={() => setShowCreatePOModal(true)}
            className="px-5 py-2.5 rounded-xl bg-white text-green-800 font-extrabold text-xs shadow-lg hover:bg-green-50 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white/70 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('po')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'po' ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'ai' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Forecast Orders ({draftPOs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'suppliers' ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Distributors ({suppliers.length})</span>
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS LIST */}
      {activeTab === 'po' && (
        <div className="ph-glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" /> Active & Historical Purchase Orders
            </h3>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading purchase orders...</div>
          ) : purchaseOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <Truck className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-medium text-gray-500">No purchase orders created yet.</p>
              <p className="text-xs text-gray-400">Click "Create Purchase Order" or generate orders from the AI tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ph-table">
                <thead>
                  <tr>
                    <th>PO ID</th><th>Supplier / Distributor</th><th>Date Created</th>
                    <th>Status</th><th>Total Cost (PKR)</th><th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="font-mono font-bold text-gray-900">#PO-{po.id.toString().padStart(4, '0')}</td>
                      <td className="font-bold text-gray-800">{po.supplier_name}</td>
                      <td className="text-xs text-gray-500">{new Date(po.created_at).toLocaleDateString()}</td>
                      <td>
                        {po.status === 'received' ? (
                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-300 text-xs font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Stock Received
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300 text-xs font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3.5 h-3.5" /> Submitted
                          </span>
                        )}
                      </td>
                      <td className="font-black text-gray-900">Rs. {po.total_cost.toFixed(2)}</td>
                      <td className="text-right">
                        {po.status !== 'received' && (
                          <button
                            onClick={() => openReceiveModal(po)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 ml-auto shadow-sm"
                          >
                            <PackageCheck className="w-3.5 h-3.5" /> Receive Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI FORECAST ORDERS */}
      {activeTab === 'ai' && (
        <div className="ph-glass-card p-5 space-y-4">
          <div className="border-b border-gray-200/60 pb-3">
            <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" /> AI-Generated Draft Purchase Orders
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Calculated based on 30-day daily sales velocity and reorder limits. Click to auto-generate a live Purchase Order.
            </p>
          </div>

          {draftPOs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">All stock levels are healthy! No AI reorder orders needed.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draftPOs.map((dPo: any, idx: number) => (
                <div key={idx} className="p-5 rounded-2xl bg-white/90 border border-emerald-200/80 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                        AI Recommended Supplier
                      </span>
                      <h4 className="font-black text-gray-900 text-base mt-1">{dPo.supplier_name}</h4>
                    </div>
                    <span className="text-xs font-extrabold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-xl">
                      {dPo.item_count} Items
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {dPo.items.map((it: any, i: number) => (
                      <div key={i} className="p-2 rounded-lg bg-gray-50 text-xs flex items-center justify-between border border-gray-100">
                        <div>
                          <p className="font-bold text-gray-800">{it.brand_name}</p>
                          <p className="text-[10px] text-gray-500">{it.reason}</p>
                        </div>
                        <div className="text-right font-black text-emerald-700">
                          +{it.suggested_order_qty} units
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleCreateAIPO(dPo)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Generate & Submit PO to Supplier</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="ph-glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" /> Distributor & Supplier Directory ({suppliers.length})
            </h3>
          </div>

          {suppliers.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No suppliers registered. Click "Add Supplier" above.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((sup) => (
                <div key={sup.id} className="ph-glass-card p-5 space-y-2 border border-gray-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 text-green-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {sup.name[0]}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-sm">{sup.name}</h4>
                      <p className="text-xs text-gray-500">{sup.contact || 'No contact'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 truncate pt-2 border-t border-gray-100">{sup.address || 'Address N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="ph-glass-modal w-full max-w-md p-6 space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" /> Register Supplier Distributor
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{formError}</div>}
            {formSuccess && <div className="p-3 rounded-xl bg-green-50 text-green-700 text-xs font-semibold">{formSuccess}</div>}

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Company / Distributor Name *</label>
                <input type="text" required placeholder="e.g. GSK Pakistan Distributors" value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Contact Phone</label>
                <input type="text" placeholder="0300-1234567" value={supplierForm.contact}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Office / Depot Address</label>
                <input type="text" placeholder="Industrial Area, Lahore" value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} className={inputClass} />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200/60">
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" className="ph-btn-primary py-2.5 text-xs">Save Supplier Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {showCreatePOModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="ph-glass-modal w-full max-w-lg p-6 space-y-4 animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" /> Create Manual Purchase Order
              </h3>
              <button onClick={() => setShowCreatePOModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{formError}</div>}
            {formSuccess && <div className="p-3 rounded-xl bg-green-50 text-green-700 text-xs font-semibold">{formSuccess}</div>}

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Select Supplier Distributor *</label>
                <select
                  value={poForm.supplier_id}
                  onChange={(e) => setPoForm({ ...poForm, supplier_id: Number(e.target.value) })}
                  className={inputClass}
                  required
                >
                  <option value={0}>-- Select Distributor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Order Items</label>
                {poForm.items.map((it, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <select
                        value={it.medicine_id}
                        onChange={(e) => {
                          const newItems = [...poForm.items];
                          newItems[idx].medicine_id = Number(e.target.value);
                          const med = medicines.find((m) => m.id === Number(e.target.value));
                          if (med) newItems[idx].cost_price = med.purchase_price || 0;
                          setPoForm({ ...poForm, items: newItems });
                        }}
                        className={inputClass}
                        required
                      >
                        <option value={0}>-- Select Medicine --</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>{m.brand_name} ({m.generic_name})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Qty"
                        required
                        min="1"
                        value={it.quantity}
                        onChange={(e) => {
                          const newItems = [...poForm.items];
                          newItems[idx].quantity = Number(e.target.value);
                          setPoForm({ ...poForm, items: newItems });
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Cost"
                        required
                        step="0.1"
                        value={it.cost_price}
                        onChange={(e) => {
                          const newItems = [...poForm.items];
                          newItems[idx].cost_price = Number(e.target.value);
                          setPoForm({ ...poForm, items: newItems });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200/60">
                <button type="button" onClick={() => setShowCreatePOModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" className="ph-btn-primary py-2.5 text-xs">Submit Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive PO Stock Modal */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="ph-glass-modal w-full max-w-lg p-6 space-y-4 animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" /> Receive Inbound Stock: PO #{selectedPO.id}
              </h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Receiving stock from <b>{selectedPO.supplier_name}</b>. Enter batch numbers & expiry dates to add directly to live inventory.
            </p>

            {formError && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{formError}</div>}
            {formSuccess && <div className="p-3 rounded-xl bg-green-50 text-green-700 text-xs font-semibold">{formSuccess}</div>}

            <form onSubmit={handleReceiveStock} className="space-y-4">
              {receiveForm.map((rec, idx) => {
                const poItem = selectedPO.items.find((i) => i.id === rec.item_id);
                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                    <p className="font-extrabold text-gray-900 text-xs">{poItem?.medicine_name || 'Medicine'}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Batch Number</label>
                        <input
                          type="text"
                          required
                          value={rec.batch_number}
                          onChange={(e) => {
                            const newRec = [...receiveForm];
                            newRec[idx].batch_number = e.target.value;
                            setReceiveForm(newRec);
                          }}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Expiry Date</label>
                        <input
                          type="date"
                          required
                          value={rec.expiry_date}
                          onChange={(e) => {
                            const newRec = [...receiveForm];
                            newRec[idx].expiry_date = e.target.value;
                            setReceiveForm(newRec);
                          }}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Qty Received</label>
                        <input
                          type="number"
                          required
                          value={rec.received_qty}
                          onChange={(e) => {
                            const newRec = [...receiveForm];
                            newRec[idx].received_qty = Number(e.target.value);
                            setReceiveForm(newRec);
                          }}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200/60">
                <button type="button" onClick={() => setShowReceiveModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" className="ph-btn-primary py-2.5 text-xs">Confirm & Add Stock to Inventory</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
