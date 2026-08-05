import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Building2,
  Users,
  TrendingUp,
  X,
  CheckCircle2,
  AlertCircle,
  Hash,
  Mail,
  User
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [newPharmacy, setNewPharmacy] = useState({
    name: '',
    license_number: '',
    address: '',
    contact: '',
    owner_full_name: '',
    owner_email: '',
    owner_password: 'Password123!'
  });

  const fetchPharmacies = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/pharmacies');
      setPharmacies(res.data);
    } catch (err) {
      console.error('Failed to fetch admin pharmacy list', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPharmacies(); }, []);

  const handleAddPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    try {
      const res = await api.post('/admin/pharmacies', newPharmacy);
      setFormSuccess(res.data.message);
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
        setNewPharmacy({ name: '', license_number: '', address: '', contact: '', owner_full_name: '', owner_email: '', owner_password: 'Password123!' });
        fetchPharmacies();
      }, 1500);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create pharmacy tenant');
    }
  };

  const handleDeletePharmacy = async (bizId: number, name: string) => {
    if (!window.confirm(`Delete pharmacy '${name}'? This will delete ALL users, catalog, and sales data permanently.`)) return;
    try {
      await api.delete(`/admin/pharmacies/${bizId}`);
      fetchPharmacies();
    } catch (err) {
      console.error('Failed to delete pharmacy tenant', err);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 placeholder-gray-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden relative bg-gradient-to-r from-green-700 to-emerald-600 shadow-lg shadow-green-500/20 p-6 md:p-8">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute right-16 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-6 h-6 text-green-200" />
              <span className="text-green-200 text-xs font-bold uppercase tracking-wider">Super Admin Console</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Pharmacy Tenant Management</h2>
            <p className="text-green-100/80 text-sm mt-1">
              Register, monitor & delete pharmacy tenants. Catalogs of 100 medicines are auto-seeded on creation.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-green-700 font-bold text-sm shadow-md hover:bg-green-50 transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Register New Pharmacy
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ph-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Tenants</p>
            <p className="text-2xl font-black text-gray-800">{pharmacies.length}</p>
          </div>
        </div>
        <div className="ph-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-black text-gray-800">{pharmacies.reduce((sum, p) => sum + (p.total_users || 0), 0)}</p>
          </div>
        </div>
        <div className="ph-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Platform Revenue</p>
            <p className="text-2xl font-black text-gray-800">
              Rs. {pharmacies.reduce((sum, p) => sum + (p.total_revenue_pkr || 0), 0).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Pharmacies Table */}
      <div className="ph-card p-5 space-y-4">
        <h3 className="font-bold text-gray-800 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
          <Building2 className="w-5 h-5 text-green-600" /> Registered Pharmacies ({pharmacies.length})
        </h3>

        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center gap-2 text-gray-400">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading pharmacy tenants...</span>
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No pharmacy tenants registered yet.</p>
            <p className="text-xs text-gray-400 mt-1">Click the button above to register your first pharmacy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ph-table">
              <thead>
                <tr>
                  <th>Pharmacy Name</th><th>License #</th><th>Owner & Email</th>
                  <th>Users</th><th>Catalog</th><th>Revenue (PKR)</th>
                  <th>Status</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pharmacies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-bold text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.address}</div>
                    </td>
                    <td className="font-mono text-xs text-gray-500">{p.license_number}</td>
                    <td>
                      <div className="text-xs font-semibold text-gray-700">{p.owner_full_name}</div>
                      <div className="text-[11px] text-green-600">{p.owner_email}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-gray-600 font-semibold">
                        <Users className="w-3.5 h-3.5 text-gray-400" /> {p.total_users}
                      </div>
                    </td>
                    <td>
                      <span className="font-bold text-green-600">{p.total_medicines}</span>
                      <span className="text-xs text-gray-400 ml-1">medicines</span>
                    </td>
                    <td className="font-bold text-gray-700">Rs. {p.total_revenue_pkr.toFixed(2)}</td>
                    <td>
                      <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold uppercase">
                        {p.subscription_status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDeletePharmacy(p.id, p.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Pharmacy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-gray-200 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" /> Register Pharmacy Tenant
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {formSuccess}
              </div>
            )}

            <form onSubmit={handleAddPharmacy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Pharmacy Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" required placeholder="e.g. Shifa Medicare"
                      value={newPharmacy.name}
                      onChange={(e) => setNewPharmacy({ ...newPharmacy, name: e.target.value })}
                      className={inputClass + " pl-10"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Drug License # *</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" required placeholder="e.g. LIC-PK-881"
                      value={newPharmacy.license_number}
                      onChange={(e) => setNewPharmacy({ ...newPharmacy, license_number: e.target.value })}
                      className={inputClass + " pl-10"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Owner Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" required placeholder="Dr. Ahmed Khan"
                      value={newPharmacy.owner_full_name}
                      onChange={(e) => setNewPharmacy({ ...newPharmacy, owner_full_name: e.target.value })}
                      className={inputClass + " pl-10"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Owner Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" required placeholder="ahmed@shifa.pk"
                      value={newPharmacy.owner_email}
                      onChange={(e) => setNewPharmacy({ ...newPharmacy, owner_email: e.target.value })}
                      className={inputClass + " pl-10"} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ph-btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Register Pharmacy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
