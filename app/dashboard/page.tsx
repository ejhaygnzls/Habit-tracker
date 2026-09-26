'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HabitApp from '@/components/habit-app';
import { getToken } from '@/lib/auth-client';

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-green-500/40 border-t-green-500" />
          Loading dashboard...
        </div>
      </main>
    );
  }

  return <HabitApp />;
}
