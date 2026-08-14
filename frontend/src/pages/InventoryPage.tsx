import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Medicine } from '../types';
import {
  Pill,
  Search,
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Boxes,
  Calendar,
  X,
  Download,
  Trash2
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMedId, setExpandedMedId] = useState<number | null>(null);

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedMedForBatch, setSelectedMedForBatch] = useState<Medicine | null>(null);

  // Medicine Form State
  const [medForm, setMedForm] = useState({
    brand_name: '',
    generic_name: '',
    manufacturer: '',
    category: 'tablet',
    requires_prescription: false,
    unit_type: 'strip',
    purchase_price: 0,
    sale_price: 0,
    reorder_threshold: 10,
  });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    batch_number: '',
    expiry_date: '',
    quantity_in_stock: 50,
    purchase_price: 0,
  });

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchMedicines = async (query = '') => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/medicines', { params: { q: query } });
      setMedicines(res.data);
    } catch (err) {
      console.error('Failed to load medicines', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedicines(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/inventory/medicines', medForm);
      setShowAddMedModal(false);
      setMedForm({
        brand_name: '',
        generic_name: '',
        manufacturer: '',
        category: 'tablet',
        requires_prescription: false,
        unit_type: 'strip',
        purchase_price: 0,
        sale_price: 0,
        reorder_threshold: 10,
      });
      fetchMedicines(searchQuery);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create medicine');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedMedForBatch) return;

    const todayStr = new Date().toISOString().split('T')[0];
    if (batchForm.expiry_date < todayStr) {
      setFormError('Expiry date cannot be in the past!');
      return;
    }

    try {
      await api.post('/inventory/batches', {
        medicine_id: selectedMedForBatch.id,
        ...batchForm,
        purchase_price: batchForm.purchase_price || selectedMedForBatch.purchase_price,
      });
      setShowAddBatchModal(false);
      setBatchForm({ batch_number: '', expiry_date: '', quantity_in_stock: 50, purchase_price: 0 });
      fetchMedicines(searchQuery);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to add stock batch');
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setFormError('');
    setFormSuccess('');

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await api.post('/inventory/medicines/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormSuccess(`Successfully imported ${res.data.created_count} medicines!`);
      setTimeout(() => {
        setShowCsvModal(false);
        setCsvFile(null);
        setFormSuccess('');
        fetchMedicines();
      }, 1500);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'CSV import failed');
    }
  };

  const handleClearAllMedicines = async () => {
    if (!window.confirm("⚠️ WARNING: Are you sure you want to delete ALL medicines from your catalog? This action will clear your catalog and inventory so you can start fresh.")) {
      return;
    }
    try {
      const res = await api.delete('/inventory/medicines/clear-all');
      alert(res.data.message || 'All medicines cleared successfully.');
      fetchMedicines();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to clear medicines.');
    }
  };

  const getExpiryBadge = (dateStr?: string) => {
    if (!dateStr) return null;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Expiring in {diffDays}d
        </span>
      );
    } else if (diffDays <= 60) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold">
          Expiring in {diffDays}d
        </span>
      );
    }
    return (
      <span className="text-gray-500 text-xs flex items-center gap-1">
        <Calendar className="w-3 h-3 text-gray-400" /> {dateStr}
      </span>
    );
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 text-xs focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20";

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Pill className="w-7 h-7 text-green-600" /> Medicine & Batch Inventory
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Search by <span className="text-green-600 font-semibold">Brand OR Generic Name</span>. Multi-batch tracking with real-time expiry alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/100_pakistan_essential_medicines.csv"
            download
            className="px-3.5 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Sample CSV</span>
          </a>

          <button
            onClick={() => setShowCsvModal(true)}
            className="ph-btn-secondary py-2 text-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleClearAllMedicines}
            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Delete all medicines from database"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Medicines</span>
          </button>

          <button
            onClick={() => setShowAddMedModal(true)}
            className="ph-btn-primary py-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Medicine</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search by Brand Name (e.g. Panadol) or Generic (e.g. Paracetamol)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ph-input pl-10 py-3 shadow-sm rounded-xl text-sm"
        />
      </div>

      {/* Medicines Table List */}
      <div className="ph-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <Boxes className="w-5 h-5 text-green-600" /> Catalog ({medicines.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading catalog...</span>
          </div>
        ) : medicines.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Pill className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-medium text-gray-500">No medicines found matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ph-table">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Brand Name</th><th>Generic Name</th><th>Category</th>
                  <th>Sale Price</th><th>Total Stock</th><th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med) => {
                  const isExpanded = expandedMedId === med.id;
                  const isLowStock = med.total_stock <= med.reorder_threshold;

                  return (
                    <React.Fragment key={med.id}>
                      <tr
                        onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                        className="cursor-pointer"
                      >
                        <td className="text-gray-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-green-600" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td>
                          <div className="font-bold text-gray-800 flex items-center gap-2">
                            {med.brand_name}
                            {med.requires_prescription && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold">
                                Rx
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400">{med.manufacturer || 'General'}</div>
                        </td>
                        <td className="text-xs text-green-600 font-semibold">{med.generic_name}</td>
                        <td className="capitalize text-xs text-gray-600 font-medium">{med.category} ({med.unit_type})</td>
                        <td className="font-bold text-gray-800">Rs. {med.sale_price.toFixed(2)}</td>
                        <td>
                          <span className={`font-black ${isLowStock ? 'text-amber-600' : 'text-gray-800'}`}>
                            {med.total_stock}
                          </span>
                        </td>
                        <td>
                          {isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              Low Stock (&lt;{med.reorder_threshold})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMedForBatch(med);
                              setShowAddBatchModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold transition flex items-center gap-1 ml-auto"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Batch
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Batches View */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-green-50/50 p-4 border-b border-green-100">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-green-800 uppercase tracking-wider">
                                  Batches for {med.brand_name} ({med.batches.length} active batches)
                                </h5>
                              </div>

                              {med.batches.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No active batches. Add a batch to enable sales.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {med.batches.map((b) => (
                                    <div key={b.id} className="p-3 rounded-lg bg-white border border-green-200 shadow-sm flex items-center justify-between">
                                      <div>
                                        <p className="text-xs font-mono font-bold text-gray-800">Batch #{b.batch_number}</p>
                                        <p className="text-[11px] text-gray-500">Qty: <b className="text-gray-800">{b.quantity_in_stock}</b></p>
                                      </div>
                                      <div>
                                        {getExpiryBadge(b.expiry_date)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Medicine Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-gray-200 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <Pill className="w-5 h-5 text-green-600" /> Add New Medicine
              </h3>
              <button onClick={() => setShowAddMedModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">{formError}</div>}

            <form onSubmit={handleCreateMedicine} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Brand Name *</label>
                  <input type="text" required placeholder="e.g. Panadol" value={medForm.brand_name}
                    onChange={(e) => setMedForm({ ...medForm, brand_name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Generic Name *</label>
                  <input type="text" required placeholder="e.g. Paracetamol" value={medForm.generic_name}
                    onChange={(e) => setMedForm({ ...medForm, generic_name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select value={medForm.category} onChange={(e) => setMedForm({ ...medForm, category: e.target.value })} className={inputClass}>
                    <option value="tablet">Tablet</option><option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option><option value="injection">Injection</option>
                    <option value="topical">Topical</option><option value="drops">Drops</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sale Price (PKR) *</label>
                  <input type="number" step="0.01" required value={medForm.sale_price}
                    onChange={(e) => setMedForm({ ...medForm, sale_price: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="rxCheck" checked={medForm.requires_prescription}
                  onChange={(e) => setMedForm({ ...medForm, requires_prescription: e.target.checked })}
                  className="rounded text-green-600 focus:ring-green-500" />
                <label htmlFor="rxCheck" className="text-xs font-semibold text-gray-700">Requires Prescription (Rx)</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddMedModal(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">Cancel</button>
                <button type="submit" className="ph-btn-primary py-2 text-xs">Save Medicine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddBatchModal && selectedMedForBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-gray-200 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <Boxes className="w-5 h-5 text-green-600" /> Add Stock Batch
              </h3>
              <button onClick={() => setShowAddBatchModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">Adding stock for <b>{selectedMedForBatch.brand_name}</b></p>
            {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">{formError}</div>}

            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Batch Number *</label>
                <input type="text" required placeholder="e.g. BATCH-2026-09" value={batchForm.batch_number}
                  onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date *</label>
                  <input type="date" required value={batchForm.expiry_date}
                    onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
                  <input type="number" required value={batchForm.quantity_in_stock}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity_in_stock: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddBatchModal(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">Cancel</button>
                <button type="submit" className="ph-btn-primary py-2 text-xs">Add Batch Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-gray-200 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" /> Import Medicines CSV
              </h3>
              <button onClick={() => setShowCsvModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Upload a CSV file containing columns: <code className="text-green-700 bg-green-50 px-1 py-0.5 rounded font-mono">brand_name, generic_name, category, sale_price</code>.
            </p>

            {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">{formError}</div>}
            {formSuccess && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-xs font-medium">{formSuccess}</div>}

            <form onSubmit={handleCsvImport} className="space-y-3">
              <input
                type="file"
                accept=".csv"
                required
                onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowCsvModal(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">Cancel</button>
                <button type="submit" className="ph-btn-primary py-2 text-xs">Upload & Import</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
