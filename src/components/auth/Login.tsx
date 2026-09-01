import React from 'react';
import { Cloud, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLoginWithGoogle: () => Promise<any>;
  onSwitchToSignup: () => void;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
}

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const Login: React.FC<LoginProps> = ({
  onLoginWithGoogle,
  onSwitchToSignup,
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
            Welcome to CloudGallery
          </h1>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Securely store and manage your memories in the cloud.
          </p>
        </div>

        {/* Authentication Card */}
        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary "Continue with Google" Action */}
          <div className="space-y-4 pt-2">
            <button
              id="google-signin-btn"
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

            {/* Cloud Storage Assurance Notice */}
            <p className="text-center text-xs text-slate-500 font-medium leading-relaxed">
              Your photos are securely stored using cloud infrastructure.
            </p>
          </div>

          {/* Architecture Badge */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Firebase Authentication
            </span>
            <span className="font-mono text-slate-400">AWS S3 • DynamoDB</span>
          </div>

          {/* Switch to Signup / New User info */}
          <div className="text-center text-xs text-slate-500 pt-1">
            New to CloudGallery?{' '}
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
