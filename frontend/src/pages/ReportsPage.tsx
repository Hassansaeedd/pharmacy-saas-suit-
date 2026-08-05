import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Download,
  Layers,
  DollarSign
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expiry' | 'profit'>('expiry');
  const [expiryDays, setExpiryDays] = useState(90);
  const [expiryItems, setExpiryItems] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpiryReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reports/expiry', { params: { days: expiryDays } });
      setExpiryItems(res.data);
    } catch (err) {
      console.error('Failed to load expiry report', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfitReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reports/profit');
      setProfitData(res.data);
    } catch (err) {
      console.error('Failed to load profit report', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'expiry') fetchExpiryReport();
    else fetchProfitReport();
  }, [activeTab, expiryDays]);

  const downloadExpiryCsv = () => {
    window.open(`${api.defaults.baseURL}/reports/expiry/csv?days=${expiryDays}`, '_blank');
  };

  const tabs = [
    { id: 'expiry', label: 'Expiry Return Report', icon: AlertTriangle },
    { id: 'profit', label: 'Gross Profit Report', icon: TrendingUp },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-green-600" /> Reports & Analytics
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Supplier return decisions & profit margin analysis in <span className="text-green-600 font-bold">PKR</span>.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 border border-gray-200 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'expiry' ? (
        /* Expiry Report */
        <div className="ph-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500">Filter Window:</span>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              >
                <option value={30}>Next 30 Days (Urgent)</option>
                <option value={60}>Next 60 Days</option>
                <option value={90}>Next 90 Days</option>
                <option value={180}>Next 180 Days</option>
              </select>
            </div>

            <button
              onClick={downloadExpiryCsv}
              className="ph-btn-primary"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV for Supplier Return</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading expiry data...</span>
            </div>
          ) : expiryItems.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <BarChart3 className="w-10 h-10 text-green-300 mx-auto mb-2" />
              <p className="font-medium text-gray-500">No batches expiring in the next {expiryDays} days.</p>
              <p className="text-xs text-gray-400 mt-1">Great inventory health!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ph-table">
                <thead>
                  <tr>
                    <th>Batch #</th><th>Medicine Brand</th><th>Generic Name</th>
                    <th>Stock Qty</th><th>Expiry Date</th><th>Days Left</th>
                    <th>Supplier</th><th className="text-right">Est. Loss Value</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono text-xs font-bold text-gray-600">{item.batch_number}</td>
                      <td className="font-bold text-gray-800">{item.brand_name}</td>
                      <td className="text-xs text-green-600 font-medium">{item.generic_name}</td>
                      <td className="font-bold text-gray-700">{item.quantity_in_stock}</td>
                      <td className="text-xs text-gray-600">{item.expiry_date}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.days_until_expiry <= 30
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {item.days_until_expiry}d
                        </span>
                      </td>
                      <td className="text-xs text-gray-500">{item.supplier_name}</td>
                      <td className="font-bold text-red-600 text-right">Rs. {item.estimated_loss_value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Profit Report */
        <div className="space-y-6">
          {isLoading || !profitData ? (
            <div className="ph-card p-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Calculating profit analysis...</span>
            </div>
          ) : (
            <>
              {/* Profit KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="ph-card p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales Revenue</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">Rs. {profitData.total_revenue.toFixed(2)}</p>
                  <DollarSign className="w-5 h-5 text-blue-400 mt-2" />
                </div>

                <div className="ph-card p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Gross Profit</p>
                  <p className="text-2xl font-black text-green-600 mt-1">Rs. {profitData.total_gross_profit.toFixed(2)}</p>
                  <TrendingUp className="w-5 h-5 text-green-400 mt-2" />
                </div>

                <div className="ph-card p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Gross Margin</p>
                  <p className="text-2xl font-black text-teal-600 mt-1">{profitData.overall_margin_percentage.toFixed(1)}%</p>
                  <BarChart3 className="w-5 h-5 text-teal-400 mt-2" />
                </div>
              </div>

              {/* Profitability by Category */}
              <div className="ph-card p-5 space-y-4">
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Layers className="w-5 h-5 text-green-600" /> Profitability by Medicine Category
                </h3>
                <div className="overflow-x-auto">
                  <table className="ph-table">
                    <thead>
                      <tr>
                        <th>Category</th><th>Units Sold</th><th>Total Revenue (PKR)</th>
                        <th>Gross Profit (PKR)</th><th className="text-right">Profit Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitData.categories.map((c: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-bold text-gray-800 capitalize">{c.category}</td>
                          <td className="font-semibold text-gray-600">{c.items_sold}</td>
                          <td className="font-bold text-gray-700">Rs. {c.revenue.toFixed(2)}</td>
                          <td className="font-bold text-green-600">Rs. {c.profit.toFixed(2)}</td>
                          <td className="text-right">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold">
                              {c.margin_percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
