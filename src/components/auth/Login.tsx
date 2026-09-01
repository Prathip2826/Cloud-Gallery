import React, { useState } from 'react';
import {
  Cloud,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<any>;
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
  onLoginAsDemo: () => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export const Login: React.FC<LoginProps> = ({
  onLogin,
  onSwitchToSignup,
  onSwitchToForgotPassword,
  onLoginAsDemo,
  isLoading,
  error,
}) => {
  const [email, setEmail] = useState('alex.cloud@example.com');
  const [password, setPassword] = useState('CloudPass2026!');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setLocalError(err.message || 'Login failed');
    }
  };

  const handleDemo = async () => {
    setLocalError(null);
    try {
      await onLoginAsDemo();
    } catch (err: any) {
      setLocalError(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Icon & Heading */}
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 shadow-md shadow-blue-500/20 mb-4 items-center justify-center text-white">
            <Cloud className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            CloudGallery
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Your Memories. Securely in the Cloud.
          </p>
        </div>

        {/* Auth Card */}
        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
          {/* Quick Demo Access Bar */}
          <div className="mb-6 p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-center">
            <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-blue-700 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Instant Evaluator Access</span>
            </div>
            <p className="text-[11px] text-slate-600 mb-3">
              Log in directly with preloaded test data, S3 photos, and DynamoDB records.
            </p>
            <button
              type="button"
              onClick={handleDemo}
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              1-Click Demo Login (Preloaded S3 Photos)
            </button>
          </div>

          {(error || localError) && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.cloud@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onSwitchToForgotPassword}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Sign Up */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
