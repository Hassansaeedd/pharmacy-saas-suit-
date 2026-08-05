import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  BarChart3,
  BrainCircuit,
  AlertTriangle,
  MessageSquare,
  Building2,
  ShieldCheck,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isOwner = user?.role === 'owner_pharmacist';

  interface NavItem {
    label: string;
    path: string;
    icon: any;
    ownerOnly?: boolean;
  }

  // Super Admin Navigation (Only platform tenant administration)
  const adminNavItems: NavItem[] = [
    { label: 'Pharmacy Tenants', path: '/admin', icon: Building2 },
  ];

  // Pharmacy Operational Navigation (Sales, Inventory, Billing)
  const pharmacyNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'POS Counter', path: '/pos', icon: ShoppingCart },
    { label: 'Medicines & Catalog', path: '/inventory', icon: Pill },
    { label: 'Expiry Alerts', path: '/expiry', icon: AlertTriangle },
    { label: 'Reports & Profit', path: '/reports', icon: BarChart3, ownerOnly: true },
    { label: 'AI Forecasting', path: '/forecasting', icon: BrainCircuit, ownerOnly: true },
    { label: 'WhatsApp Bot', path: '/whatsapp', icon: MessageSquare, ownerOnly: true },
  ];

  const currentNavItems = isSuperAdmin ? adminNavItems : pharmacyNavItems;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg md:shadow-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="font-bold text-green-800 text-sm">PharmaFlow</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-4 py-3 border-b border-gray-100 hidden md:block">
          {isSuperAdmin ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Super Admin
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-green-50 border border-green-200">
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                {isOwner ? 'Owner Console' : 'Counter POS'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isOwner ? 'bg-green-500 animate-pulse' : 'bg-teal-400'}`} />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {currentNavItems.map((item) => {
            if (item.ownerOnly && !isOwner) return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? isSuperAdmin
                        ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                        : 'bg-green-600 text-white shadow-md shadow-green-500/20'
                      : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-100">
          {isSuperAdmin ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Platform Admin
              </div>
              <p className="text-[11px] text-emerald-700/80 mt-1 leading-snug">
                Managing multi-tenant pharmacy accounts across Pakistan.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 text-xs font-bold text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                FEFO Stock Management
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Stock deducted from earliest-expiring batches first.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
