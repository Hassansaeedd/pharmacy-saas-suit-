import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Boxes,
  Calendar,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react';

export const ExpiryPage: React.FC = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner_pharmacist';

  const [alerts, setAlerts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchExpiryAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/expiry/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to load expiry alerts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchExpiryAlerts(); }, []);

  const handleWriteOff = async (batchId: number, batchNumber: string) => {
    if (!window.confirm(`Write-off batch #${batchNumber}? This will set its stock to 0 and record an audit log.`)) return;
    setActionMessage(''); setActionError('');
    try {
      const res = await api.post(`/expiry/batches/${batchId}/write-off`);
      setActionMessage(res.data.message);
      fetchExpiryAlerts();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Write-off failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-red-500" /> Expiry Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Tiered alerts (Critical ≤30d, Warning ≤60d, Monitor ≤90d) with batch write-off in <span className="text-green-600 font-bold">PKR</span>.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      {/* KPI Cards */}
      {alerts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="ph-card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Critical (≤30 Days)</p>
              <p className="text-2xl font-black text-red-600 mt-1">{alerts.summary.critical_count} Batches</p>
              <p className="text-xs text-red-500 font-semibold mt-1">Return required</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="ph-card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Warning (31–60 Days)</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{alerts.summary.warning_count} Batches</p>
              <p className="text-xs text-amber-500 font-semibold mt-1">Discount sale window</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="ph-card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monitor (61–90 Days)</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{alerts.summary.monitor_count} Batches</p>
              <p className="text-xs text-blue-500 font-semibold mt-1">Track inventory flow</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          <div className="ph-card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Risk Value</p>
              <p className="text-xl font-black text-gray-800 mt-1">Rs. {alerts.summary.total_estimated_loss_pkr.toFixed(2)}</p>
              <p className="text-xs text-green-600 font-semibold mt-1">PKR exposure</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 text-green-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Critical Tier Table */}
      <div className="ph-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600">Critical Tier (≤ 30 Days)</span>
          </h3>
          <span className="text-xs text-gray-400 font-medium">Immediate Return or Write-Off</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading critical alerts...</div>
        ) : !alerts || alerts.critical.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No critical batches expiring within 30 days.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ph-table">
              <thead>
                <tr>
                  <th>Batch #</th><th>Brand Name</th><th>Generic Name</th><th>Stock</th>
                  <th>Expiry Date</th><th>Days Left</th><th>Est. Loss (PKR)</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.critical.map((b: any) => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs font-bold text-gray-700">{b.batch_number}</td>
                    <td className="font-bold text-gray-800">{b.brand_name}</td>
                    <td className="text-xs text-green-600 font-medium">{b.generic_name}</td>
                    <td className="font-black text-red-600">{b.quantity_in_stock}</td>
                    <td className="text-xs text-gray-600">{b.expiry_date}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold">
                        {b.days_until_expiry}d
                      </span>
                    </td>
                    <td className="font-bold text-gray-800">Rs. {b.estimated_loss_pkr.toFixed(2)}</td>
                    <td className="text-right">
                      {isOwner ? (
                        <button
                          onClick={() => handleWriteOff(b.id, b.batch_number)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Write-Off
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Owner Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warning & Monitor Tiers */}
      {alerts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ph-card p-5 space-y-4">
            <h3 className="font-bold text-amber-600 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
              <Clock className="w-4 h-4" /> Warning Tier (31–60 Days)
            </h3>
            {alerts.warning.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No batches in warning tier.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alerts.warning.map((b: any) => (
                  <div key={b.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between hover:bg-amber-100 transition">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{b.brand_name} <span className="font-mono text-[10px] text-gray-400">({b.batch_number})</span></p>
                      <p className="text-[11px] text-gray-500">Exp: {b.expiry_date} · {b.quantity_in_stock} in stock</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold">
                      {b.days_until_expiry}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ph-card p-5 space-y-4">
            <h3 className="font-bold text-blue-600 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
              <Calendar className="w-4 h-4" /> Monitor Tier (61–90 Days)
            </h3>
            {alerts.monitor.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No batches in monitor tier.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alerts.monitor.map((b: any) => (
                  <div key={b.id} className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between hover:bg-blue-100 transition">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{b.brand_name} <span className="font-mono text-[10px] text-gray-400">({b.batch_number})</span></p>
                      <p className="text-[11px] text-gray-500">Exp: {b.expiry_date} · {b.quantity_in_stock} in stock</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold">
                      {b.days_until_expiry}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
