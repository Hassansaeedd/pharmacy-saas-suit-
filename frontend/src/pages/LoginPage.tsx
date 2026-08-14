import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, ShieldCheck, Download, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      if (isAdminMode) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen ph-auth-bg flex flex-col lg:flex-row">
      {/* Left Panel — Branding & Pharmacy Showcase */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-green-700 via-green-600 to-emerald-800 relative overflow-hidden text-white">
        {/* Real Pharmacy Background Overlay */}
        <div
          className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url('/pharmacy_hero_banner.jpg')`
          }}
        />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full" />

        {/* Logo Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/curarx_logo.jpg" alt="CuraRx Logo" className="w-12 h-12 rounded-2xl border border-white/30 shadow-lg object-cover" />
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">CuraRx ERP</h1>
              <p className="text-green-200 text-xs font-medium">Industrial Pharmacy Suite & POS</p>
            </div>
          </div>

          <a
            href="/100_pakistan_essential_medicines.csv"
            download
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-bold text-white backdrop-blur-md transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 100 Medicines CSV</span>
          </a>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 space-y-6 my-auto py-12">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 text-xs font-semibold mb-4">
              ✨ DRAP & FEFO Compliant
            </span>
            <h2 className="text-4xl font-black text-white leading-tight">
              Modern SaaS for<br />
              <span className="text-green-200">Pakistani Pharmacies</span>
            </h2>
            <p className="text-green-100/90 mt-3 text-sm leading-relaxed max-w-md">
              Complete multi-tenant inventory control, FEFO batch expiry management, fast POS billing, and AI demand forecasting.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              '100+ Essential Medicines Auto-Seeded',
              'FEFO Tiered Expiry Alerts',
              'Printable Customer Receipts',
              'WhatsApp Stock Bot Integration',
              'AI Sales Velocity Forecasts',
              'Multi-Tenant Data Security',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-xs text-green-100">
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white font-bold text-[10px]">✓</span>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-green-200" />
            <span className="text-green-100 text-xs font-medium">DRAP Compliant · Secure SaaS</span>
          </div>
          <span className="text-xs text-green-200/80">v2.0 • 2026 Edition</span>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="max-w-md w-full mx-auto">

          {/* Top Switcher Button for Super Admin Portal */}
          <div className="mb-6 p-1.5 bg-gray-200/80 rounded-xl flex items-center gap-1 border border-gray-300">
            <button
              type="button"
              onClick={() => { setIsAdminMode(false); setError(''); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                !isAdminMode
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Pharmacy Staff Login</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsAdminMode(true); setError(''); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isAdminMode
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Super Admin Portal</span>
            </button>
          </div>

          {/* Title */}
          <div className="mb-6 text-left">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {isAdminMode ? 'Super Admin Portal' : 'Pharmacy Login'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isAdminMode
                ? 'Manage all registered pharmacy tenants across the platform.'
                : 'Sign in to access your pharmacy counter & inventory.'}
            </p>
          </div>

          {/* Card */}
          <div className="ph-auth-card p-8">
            {error && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  {isAdminMode ? 'Super Admin Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder={isAdminMode ? 'admin@pharmaflow.pk' : 'pharmacist@clinic.pk'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ph-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ph-input pl-10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition ${
                  isAdminMode
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-emerald-600/25'
                    : 'ph-btn-primary'
                }`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isAdminMode ? 'Access Admin Console' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {!isAdminMode && (
              <div className="mt-6 text-center border-t border-gray-100 pt-5">
                <p className="text-sm text-gray-500">
                  New pharmacy?{' '}
                  <Link to="/onboard" className="text-green-600 font-semibold hover:text-green-700 hover:underline">
                    Register here
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
