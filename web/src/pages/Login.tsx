import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Eye, EyeOff, Loader2, Building2, Globe } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api from '../lib/api';

export const Login: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgData, setOrgData] = useState<{ name: string } | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchOrgDetails(slug);
    }
  }, [slug]);

  const fetchOrgDetails = async (orgSlug: string) => {
    setOrgLoading(true);
    try {
      const response = await api.get(`/organizations/by-slug/${orgSlug}`);
      if (response.data.data) {
        setOrgData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch org details', err);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/login', formData);
      if (response.data.data.access_token) {
        localStorage.setItem('auth_token', response.data.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const response = await api.post('/google-login', {
        token: idToken,
        org_slug: slug
      });

      if (response.data.data.access_token) {
        localStorage.setItem('auth_token', response.data.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        navigate('/');
      }
    } catch (err: any) {
      console.error('Google login error detail:', err);
      const detailedError = err.response?.data?.message || err.message || 'Google login failed. Please try again.';
      setError(detailedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background Light Effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-[440px] z-10">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl">
          <div className="text-center mb-10">
            <div className="relative inline-block mb-6">
                <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg transform -rotate-3">
                    <Lock className="text-white w-10 h-10 transform rotate-3" />
                </div>
            </div>
            
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Welcome Back</h1>
            
            {slug ? (
              <div className="mt-6 flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    {orgLoading ? (
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : (
                        <Building2 className="w-4 h-4 text-indigo-600" />
                    )}
                    <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                        {orgLoading ? 'Verifying...' : 'Organization Login'}
                    </span>
                </div>
                <h2 className="mt-3 text-sm font-bold text-slate-700 tracking-wider max-w-[320px] line-clamp-2 uppercase">
                    {orgData ? orgData.name : slug.replace(/-/g, ' ')}
                </h2>
              </div>
            ) : (
                <p className="text-slate-500 text-sm font-medium">Elevate your project management experience.</p>
            )}
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs py-3.5 px-4 rounded-2xl mb-8 flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-600 transition-all duration-300" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-300 text-sm font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Password</label>
                <Link to="/forgot-password" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest">Forgot?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-600 transition-all duration-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-300 text-sm font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-4 rounded-2xl shadow transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center px-2">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black">
                <span className="bg-white px-4 text-slate-400">Secure SSO</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/02-2x.png" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-10 font-medium">
            New to the platform? <Link to="/register" className="text-indigo-600 font-bold hover:text-indigo-700 transition-all underline underline-offset-4 decoration-indigo-600/30">Create Account</Link>
          </p>
        </div>
        
        <div className="mt-10 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-indigo-600" /> SprintNIX Enterprise</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>&copy; 2024</span>
        </div>
      </div>
    </div>
  );
};

