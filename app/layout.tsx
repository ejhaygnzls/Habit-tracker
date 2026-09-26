import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Habit Tracker',
  description: 'A modern habit tracking app built with Next.js and Prisma',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
