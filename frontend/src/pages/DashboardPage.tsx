import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ShoppingCart,
  Pill,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Boxes,
  ArrowRight,
  Activity,
  Package
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { business, user } = useAuth();
  const isOwner = user?.role === 'owner_pharmacist';

  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!isOwner) return;
      try {
        const res = await api.get('/dashboard/summary');
        setSummary(res.data);
      } catch (err) {
        console.error('Failed to load owner dashboard summary', err);
      }
    };
    fetchDashboard();
  }, [isOwner]);

  return (
    <div className="space-y-6">

      {/* Welcome Header */}
      <div className="rounded-2xl overflow-hidden relative bg-gradient-to-r from-green-600 to-emerald-500 shadow-lg shadow-green-500/20">
        {/* Decorative circles */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -right-4 top-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute left-1/2 bottom-0 w-64 h-32 bg-black/5 rounded-t-full" />

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white/90 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome to PharmaFlow
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {business?.name}
            </h2>
            <p className="text-sm text-green-100/80 mt-1 max-w-xl">
              FEFO Batch Expiry • Multi-tenant SaaS • All prices in{' '}
              <span className="text-white font-bold">PKR</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/pos"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-green-700 font-bold text-sm shadow-md hover:bg-green-50 transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Open POS Counter</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Today's Sales */}
        <div className="ph-card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Sales</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                Rs. {summary ? Number(summary.today_sales_total).toFixed(0) : '0'}
              </p>
              <p className="text-xs text-green-600 font-semibold mt-1">
                {summary ? `${summary.today_sales_count} Transactions` : '0 Transactions'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 text-green-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="ph-card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock Alert</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {summary ? summary.low_stock_summary.total_low_stock_count : 0} Items
              </p>
              <p className="text-xs text-amber-500 font-semibold mt-1">Below reorder limit</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="ph-card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-400 to-rose-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiring &lt;30 Days</p>
              <p className="text-2xl font-black text-red-600 mt-1">
                {summary ? summary.expiring_summary.expiring_30_days : 0} Batches
              </p>
              <p className="text-xs text-red-500 font-semibold mt-1">Urgent return action</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Upcoming Expiry */}
        <div className="ph-card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiring 60–90 Days</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {summary
                  ? summary.expiring_summary.expiring_60_days + summary.expiring_summary.expiring_90_days
                  : 0}{' '}
                Batches
              </p>
              <p className="text-xs text-blue-500 font-semibold mt-1">Upcoming expiry</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>

      {/* Non-owner prompt */}
      {!isOwner && (
        <div className="ph-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Counter Staff Dashboard</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              You have access to POS Counter, Medicine Catalog, and Expiry Alerts. Contact your owner for advanced analytics.
            </p>
          </div>
          <Link
            to="/pos"
            className="ph-btn-primary ml-auto whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Go to POS</span>
          </Link>
        </div>
      )}

      {/* 30-Day Revenue Chart */}
      {summary && summary.revenue_chart && (
        <div className="ph-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              30-Day Revenue Trend (PKR)
            </h3>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.revenue_chart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#d1d5db" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#d1d5db" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e7eb',
                    borderRadius: '12px',
                    color: '#374151',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`Rs. ${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Selling */}
          <div className="ph-card p-5 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
              <Pill className="w-4 h-4 text-green-600" />
              Top-Selling Medicines
            </h3>
            {summary.top_selling_medicines.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No sales logged yet.</p>
            ) : (
              <div className="space-y-2">
                {summary.top_selling_medicines.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between hover:bg-green-50 hover:border-green-100 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{item.brand_name}</p>
                        <p className="text-[11px] text-green-600 font-medium">{item.generic_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-800">{item.quantity_sold} sold</p>
                      <p className="text-[11px] text-gray-500">Rs. {item.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiring Soon */}
          <div className="ph-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Batches Expiring Soon
              </h3>
              <Link to="/expiry" className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 hover:underline">
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {summary.expiring_summary.batches.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No batches expiring within 90 days.</p>
            ) : (
              <div className="space-y-2">
                {summary.expiring_summary.batches.slice(0, 5).map((b: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between hover:bg-red-50 hover:border-red-100 transition">
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        {b.medicine_name}{' '}
                        <span className="font-mono text-[10px] text-gray-400">({b.batch_number})</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Exp: {b.expiry_date} • {b.quantity} in stock
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      b.days_until_expiry <= 30
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {b.days_until_expiry}d left
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
