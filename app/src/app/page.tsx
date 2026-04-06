'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, signInWithGoogle } from '@/lib/supabase';

/**
 * Inner component that reads searchParams — must be wrapped in Suspense
 * per Next.js App Router requirements for useSearchParams() at page level.
 */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  // Detect auth callback error forwarded via query param
  const authError = searchParams.get('error') === 'auth_callback_failed';

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      router.push('/dashboard');
    } else {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setSigningIn(true);
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('Error signing in:', error);
      alert('Lỗi đăng nhập. Vui lòng thử lại.');
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="spinner-dark w-8 h-8 border-[3px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100/60 px-4">
      {/* Decorative background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-brand-100/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm fade-in">
        {/* Logo / Brand Mark */}
        <div className="flex justify-center mb-8">
          <img src="/logo.svg" alt="Nexme" className="w-16 h-16" />
        </div>

        {/* Card */}
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
              Công cụ tạo ảnh thi đấu Marathon của Nexme
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Tạo ảnh cho đội chơi của bạn để tuyên đường
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-surface border border-border rounded-[10px] font-medium text-[15px] text-text-primary hover:bg-surface-tertiary hover:border-text-tertiary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <>
                <div className="spinner-dark" />
                <span className="text-text-secondary">Đang đăng nhập...</span>
              </>
            ) : (
              <>
                {/* Google logo with brand colors */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Đăng nhập bằng Google
              </>
            )}
          </button>

          {/* Auth error banner — shown when callback fails */}
          {authError && (
            <p className="mt-3 text-sm text-center text-red-500">
              Đăng nhập thất bại. Vui lòng thử lại.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-tertiary mt-6">
          Công cụ tạo ảnh thi đấu Marathon của Nexme
        </p>
      </div>
    </div>
  );
}

/** Page shell — wraps LoginContent in Suspense for useSearchParams() compliance */
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
          <div className="spinner-dark w-8 h-8 border-[3px]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
