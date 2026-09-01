import React from 'react';
import { Cloud, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { GoogleIcon } from './Login';

interface SignupProps {
  onLoginWithGoogle: () => Promise<any>;
  onSwitchToLogin: () => void;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
}

export const Signup: React.FC<SignupProps> = ({
  onLoginWithGoogle,
  onSwitchToLogin,
  isLoading,
  isSigningIn,
  error,
}) => {
  const handleGoogleClick = async () => {
    if (isSigningIn || isLoading) return;
    try {
      await onLoginWithGoogle();
    } catch {
      // Error handled by useAuth state
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Icon & Heading */}
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20 mb-4 items-center justify-center text-white">
            <Cloud className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            New to CloudGallery?
          </h1>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Securely store and manage your memories in the cloud.
          </p>
        </div>

        {/* Auth Card */}
        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              Google Sign-In automatically provisions your secure CloudGallery identity with isolated AWS S3 storage and DynamoDB partitioning.
            </p>
          </div>

          {/* Primary "Continue with Google" Action */}
          <div className="space-y-4 pt-1">
            <button
              id="google-signup-btn"
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoading || isSigningIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-base shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-slate-700">Signing in...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5 flex-shrink-0" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-500 font-medium leading-relaxed">
              Your photos are securely stored using cloud infrastructure.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Firebase Authentication
            </span>
            <span className="font-mono text-slate-400">AWS S3 • DynamoDB</span>
          </div>

          <div className="text-center text-xs text-slate-500 pt-1">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
