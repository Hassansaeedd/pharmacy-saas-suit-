import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  TrendingUp,
  BrainCircuit,
  ShoppingBag,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export const ForecastingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reorder' | 'po'>('reorder');
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [poData, setPoData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchForecasts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/forecasting/reorder');
      setForecasts(res.data);
    } catch (err) {
      console.error('Failed to load ML forecasts', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/forecasting/purchase-orders');
      setPoData(res.data);
    } catch (err) {
      console.error('Failed to load draft purchase orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reorder') fetchForecasts();
    else fetchPurchaseOrders();
  }, [activeTab]);

  const tabs = [
    { id: 'reorder', label: 'Sales Velocity & Stockout Risk', icon: TrendingUp },
    { id: 'po', label: 'Draft Purchase Orders', icon: ShoppingBag },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-green-600" /> AI/ML Reorder Forecasting
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Scikit-Learn Ridge Regression predicting sales velocity, stockout dates & automated PO drafting.
          </p>
        </div>

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

      {activeTab === 'reorder' ? (
        <div className="ph-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-green-600" /> ML Stockout Predictions
            </h3>
            <span className="text-xs text-green-700 font-bold bg-green-100 px-3 py-1 rounded-full border border-green-200">
              Scikit-Learn Powered
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Analyzing sales velocity...</span>
            </div>
          ) : forecasts.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No inventory items found to analyze.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ph-table">
                <thead>
                  <tr>
                    <th>Brand / Generic</th><th>Current Stock</th><th>ML Daily Velocity</th>
                    <th>Est. Stockout Date</th><th>Proj. Expiry Loss</th>
                    <th>Reorder Status</th><th className="text-right">Suggested Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f) => (
                    <tr key={f.medicine_id}>
                      <td>
                        <div className="font-bold text-gray-800 text-sm">{f.brand_name}</div>
                        <div className="text-xs text-green-600 font-medium">{f.generic_name}</div>
                      </td>
                      <td>
                        <span className={`font-extrabold ${f.total_stock <= f.reorder_threshold ? 'text-amber-600' : 'text-gray-700'}`}>
                          {f.total_stock}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">(limit: {f.reorder_threshold})</span>
                      </td>
                      <td className="font-mono text-xs font-bold text-green-600">
                        {f.daily_sales_velocity} units/day
                      </td>
                      <td>
                        {f.days_until_stockout <= 14 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> {f.days_until_stockout}d ({f.estimated_stockout_date})
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {f.estimated_stockout_date}
                          </span>
                        )}
                      </td>
                      <td>
                        {f.projected_expiry_loss_pkr > 0 ? (
                          <span className="text-xs font-bold text-red-600">
                            Rs. {f.projected_expiry_loss_pkr.toFixed(2)} ({f.projected_expiry_loss_units} units)
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 font-semibold">Zero Loss</span>
                        )}
                      </td>
                      <td>
                        {f.needs_reorder ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">
                            Reorder Required
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold uppercase">
                            Stock Healthy
                          </span>
                        )}
                      </td>
                      <td className="text-right font-black text-gray-800 text-sm">
                        {f.suggested_reorder_qty > 0 ? `+${f.suggested_reorder_qty} units` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Purchase Orders View */
        <div className="space-y-4">
          {isLoading || !poData ? (
            <div className="ph-card p-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Generating purchase orders...</span>
            </div>
          ) : poData.purchase_orders.length === 0 ? (
            <div className="ph-card p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-gray-700">All Stock Levels Healthy!</h4>
              <p className="text-sm text-gray-400 mt-1">No purchase orders needed at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-center justify-between">
                <span>
                  Generated <b>{poData.total_purchase_orders}</b> Draft Purchase Orders covering{' '}
                  <b>{poData.total_items_to_reorder}</b> medicines needing reorder.
                </span>
              </div>

              {poData.purchase_orders.map((po: any, idx: number) => (
                <div key={idx} className="ph-card p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                      <Truck className="w-4 h-4 text-green-600" /> Supplier: {po.supplier_name}
                    </h4>
                    <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-2.5 py-1 rounded-full">
                      {po.item_count} items
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="ph-table">
                      <thead>
                        <tr>
                          <th>Medicine Brand</th><th>Generic Name</th><th>Current Stock</th>
                          <th>Reorder Reason</th><th className="text-right">Suggested Order Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {po.items.map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="font-bold text-gray-800">{item.brand_name}</td>
                            <td className="text-xs text-green-600 font-medium">{item.generic_name}</td>
                            <td className="font-semibold text-gray-600">{item.current_stock}</td>
                            <td className="text-xs text-amber-600 font-medium">{item.reason}</td>
                            <td className="text-right font-black text-green-600">+{item.suggested_order_qty} units</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
