import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldCheck, ArrowRight, Phone, MapPin, Hash, User, Mail, Lock } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { onboard } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    address: '',
    contact: '',
    owner_full_name: '',
    owner_email: '',
    owner_password: '',
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onboard(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = "w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition placeholder-gray-400";

  return (
    <div className="min-h-screen ph-auth-bg flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative z-10">

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl mb-8 text-center">
        <div className="flex justify-center mb-5">
          <div className="flex items-center gap-3">
            <img src="/pharmapulse_logo.jpg" alt="PharmaPulse Logo" className="w-12 h-12 rounded-2xl border border-green-300 shadow-lg object-cover" />
            <div className="text-left">
              <h1 className="font-extrabold text-green-900 text-xl">PharmaPulse</h1>
              <p className="text-green-600 text-xs font-semibold">Pharmacy Suite & POS</p>
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Register Your Pharmacy
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Get started in minutes. 100+ essential medicines will be auto-loaded on your first login.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {['✓ FEFO Expiry Alerts', '✓ 100 Medicines Pre-Loaded', '✓ AI Forecasting', '✓ DRAP Compliant'].map(f => (
            <span key={f} className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="ph-auth-card py-8 px-6 sm:px-10">

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Section 1: Pharmacy Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-green-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Pharmacy Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Pharmacy Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Al-Shafa Pharmacy"
                      value={formData.name}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">License Number *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="license_number"
                      required
                      placeholder="DRAP/LIC/2026/091"
                      value={formData.license_number}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Phone / WhatsApp</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="contact"
                      placeholder="+92 300 1234567"
                      value={formData.contact}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Address / City</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="address"
                      placeholder="Blue Area, Islamabad"
                      value={formData.address}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Owner Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Owner / Pharmacist Credentials</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="owner_full_name"
                    required
                    placeholder="Dr. Ahmed Khan"
                    value={formData.owner_full_name}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Email Address *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      name="owner_email"
                      required
                      placeholder="owner@pharmacy.pk"
                      value={formData.owner_email}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      name="owner_password"
                      required
                      placeholder="••••••••"
                      value={formData.owner_password}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="ph-btn-primary w-full"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account & Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 font-semibold hover:text-green-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
