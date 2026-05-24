import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, Loader2, Building2, ShieldCheck, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';
import api from '../lib/api';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    organization_id: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setOrgLoading(true);
    try {
      const response = await api.get('/organizations/list');
      setOrganizations(response.data.data);
    } catch (err) {
      console.error('Failed to fetch organizations', err);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/register', formData);
      if (response.status === 201) {
        navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="w-full max-w-[480px] z-10">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl shadow-black/50">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Onboarding v2.0</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">Create Account</h1>
            <p className="text-slate-400 text-sm font-medium">Join thousands of teams managing projects at scale.</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs py-3.5 px-4 rounded-2xl mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-indigo-500 transition-all duration-300" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all duration-300 text-sm font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-indigo-500 transition-all duration-300" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="name@company.com"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all duration-300 text-sm font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">Organization</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-indigo-500 transition-all duration-300" />
                <select
                  value={formData.organization_id}
                  onChange={(e) => setFormData({...formData, organization_id: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-10 py-4 text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all duration-300 text-sm font-medium appearance-none"
                >
                  <option value="" className="bg-slate-900 text-indigo-400 font-bold">✨ Register as Platform Admin</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id} className="bg-slate-900 text-white">{org.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                {orgLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
              </div>
              <div className="flex items-center gap-2 px-2 mt-2">
                {formData.organization_id ? (
                    <Building2 className="w-3 h-3 text-indigo-400" />
                ) : (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                )}
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {formData.organization_id ? 'Joining selected organization' : 'Registering as platform administrator'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-indigo-500 transition-all duration-300" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all duration-300 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">Confirm</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-indigo-500 transition-all duration-300" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password_confirmation}
                    onChange={(e) => setFormData({...formData, password_confirmation: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all duration-300 text-xs font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all duration-300 active:scale-[0.98] mt-4"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-10 font-medium">
            Already have an account? <Link to="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-all underline underline-offset-4 decoration-indigo-400/30 hover:decoration-indigo-400">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
