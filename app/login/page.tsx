'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { saveToken } from '@/lib/auth-client';
import { useTheme } from '@/components/theme-provider';

function extractTokenFromSetCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/habit_token=([^;]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));
      console.log('auth response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const token = data.token;
      if (!token || typeof token !== 'string') {
        throw new Error('Login succeeded but no session token was returned — check the API response shape');
      }

      saveToken(token);
      router.replace('/dashboard');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Login failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <button
          type="button"
          aria-label="Toggle color mode"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-slate-950/40">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-400 text-2xl text-white shadow-lg shadow-green-500/30">
            ✨
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-green-600 dark:text-green-400">Welcome back</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Log in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="••••••••"
              required
            />
          </label>

          {error && (
            <div className="auth-error rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/80 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-3 font-semibold text-white shadow-lg shadow-green-500/20 transition-all duration-200 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-green-600 transition hover:text-green-500 dark:text-green-400">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
