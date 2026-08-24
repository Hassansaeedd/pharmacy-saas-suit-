import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Building2, Menu, ChevronDown, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, business, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50 transition"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo + Brand */}
        <div className="flex items-center gap-2.5">
          <img src="/pharmapulse_logo.jpg" alt="PharmaPulse Logo" className="w-9 h-9 rounded-xl object-cover shadow-md shadow-green-500/20 border border-green-300/40" />
          <div>
            <h1 className="font-extrabold text-green-900 tracking-tight leading-none flex items-center gap-2 text-base">
              PharmaPulse
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 uppercase">
                {isSuperAdmin ? 'ADMIN' : 'SUITE'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium truncate max-w-[150px] sm:max-w-xs leading-none mt-0.5">
              {isSuperAdmin ? 'Super Admin Console' : (business?.name || 'Pharmacy Management')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* License Badge */}
        {isSuperAdmin ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Platform Admin</span>
          </div>
        ) : (
          business && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              <Building2 className="w-3.5 h-3.5" />
              <span>{business.license_number}</span>
            </div>
          )
        )}

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-200"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm ${
              isSuperAdmin ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-green-400 to-emerald-500'
            }`}>
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-gray-700 leading-tight">{user?.full_name}</div>
              <div className="text-[10px] font-medium text-green-600 capitalize leading-tight">
                {isSuperAdmin ? 'Super Admin' : (user?.role === 'owner_pharmacist' ? 'Owner / Pharmacist' : 'Counter Staff')}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{user?.email}</p>
                  <p className="text-xs text-green-600 font-semibold capitalize mt-0.5">
                    {isSuperAdmin ? 'Platform Super Admin' : (user?.role === 'owner_pharmacist' ? 'Owner / Pharmacist' : 'Counter Staff')}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
