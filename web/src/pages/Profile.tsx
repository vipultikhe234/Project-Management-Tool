import React, { useState } from 'react';
import { Shield, User as UserIcon, CheckCircle2, Loader2, KeyRound, AlertCircle, Send, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export const Profile: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debugToken, setDebugToken] = useState('');

  // Get user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Guest', email: '' };

  const handleSendResetLink = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/forgot-password', { email: user.email });
      setSuccess('A password reset link has been sent to your email address.');
      if (response.data.debug_token) {
        setDebugToken(response.data.debug_token);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Manage your personal information and security preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-50 border-4 border-white shadow-md flex items-center justify-center text-indigo-600 mb-4">
                <UserIcon className="w-10 h-10" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
              <p className="text-sm text-slate-500 font-medium">{user.email}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Shield className="w-3 h-3" />
                {user.role?.name || 'User'}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-slate-900/20">
            <h3 className="font-bold mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                Security First
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              We use a secure token-based system for password changes to protect your account from unauthorized access.
            </p>
          </div>
        </div>

        {/* Password Reset Section */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-800">Password & Security</h3>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-start gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                  <Send className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Want to change your password?</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Click the button below to receive a secure password reset link via email. This is the safest way to update your credentials.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm py-3 px-4 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {success && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm py-3 px-4 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {success}
                    </div>

                    {debugToken && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debug Mode</span>
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Token Generated</span>
                            </div>
                            <p className="text-xs text-slate-600">Since you are in development mode, you can use this link to bypass the email and reset your password now:</p>
                            <Link 
                                to={`/reset-password?email=${user.email}&token=${debugToken}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all shadow-sm"
                            >
                                Reset Password Now
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSendResetLink}
                  disabled={loading || !!success}
                  className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {success ? 'Link Sent Successfully' : 'Send Password Reset Link'}
                      {!success && <Send className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-6 border border-slate-200 rounded-2xl flex items-center justify-between bg-white shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-500">Add an extra layer of security to your account.</p>
                </div>
            </div>
            <button className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Coming Soon</button>
          </div>
        </div>
      </div>
    </div>
  );
};
