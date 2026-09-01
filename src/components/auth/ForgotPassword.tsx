import React, { useState } from 'react';
import { Cloud, Mail, ArrowRight, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

interface ForgotPasswordProps {
  onResetPassword: (email: string) => Promise<any>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onResetPassword,
  onSwitchToLogin,
  isLoading = false,
}) => {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!email) {
      setLocalError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onResetPassword(email);
      setSuccessMessage(
        res?.message || `Password reset instructions have been sent to ${email}. Check your inbox!`
      );
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send reset email.');
    } finally {
      setIsSubmitting(false);
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

        {/* Reset Password Card */}
        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Reset your password</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter the email associated with your CloudGallery account to receive password reset instructions.
            </p>
          </div>

          {localError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-800">Check your inbox</p>
                <p className="mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {!successMessage ? (
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
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting || isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer text-center"
            >
              Return to Sign In
            </button>
          )}

          {/* Back to Login link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Remember your password?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
