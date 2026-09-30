'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCheck, Moon, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

const features = [
  {
    icon: CheckCheck,
    title: 'Track Daily Habits',
    description: 'Build a repeatable rhythm with small actions that keep your momentum strong.',
  },
  {
    icon: Sparkles,
    title: 'Build Streaks',
    description: 'Celebrate consistency and keep your best routines visible every day.',
  },
  {
    icon: BarChart3,
    title: 'See Your Progress',
    description: 'Review momentum, wins, and completion trends at a glance across your week.',
  },
];

export default function HomePage() {
  const { theme, setTheme } = useTheme();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-400 text-lg text-white shadow-lg shadow-green-500/20">✨</div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wellness</p>
              <h1 className="whitespace-nowrap text-lg font-bold tracking-tight">Habit Tracker</h1>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Toggle color mode"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl bg-green-500 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-600 sm:px-4"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.18),_transparent_24%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-28">
          <div className="landing-fade-in max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700 dark:border-green-900/60 dark:bg-green-500/10 dark:text-green-300">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Build better routines
            </div>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              Turn small actions into lasting momentum.
            </h2>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-300">
              Habit Tracker helps you stay consistent, build streaks, and celebrate the tiny wins that shape your day.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-500 px-5 py-3 font-semibold text-white shadow-lg shadow-green-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-600"
              >
                Log In
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Get Started
              </Link>
            </div>
          </div>

          <div className="landing-fade-in-delay rounded-[30px] border border-slate-200 bg-white/80 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Today&apos;s progress</p>
                  <h3 className="mt-2 text-3xl font-bold tracking-tight">78%</h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl dark:bg-green-500/10">✅</div>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Drink water', done: true },
                  { name: 'Read 20 min', done: true },
                  { name: 'Morning walk', done: false },
                  { name: 'Journal', done: true },
                ].map((habit) => (
                  <div key={habit.name} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${habit.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-200'}`}>
                        {habit.done ? '✓' : '•'}
                      </span>
                      <span className="text-sm font-medium">{habit.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{habit.done ? 'Done' : 'Pending'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft shadow-slate-200/50 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/30"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                <Icon size={22} />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
