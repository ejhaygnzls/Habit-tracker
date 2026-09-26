import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Habit Tracker',
  description: 'A modern habit tracking app built with Next.js and Prisma',
};

function applyThemeScript() {
  return `
    (function() {
      try {
        const savedTheme = localStorage.getItem('theme');
        const theme = savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'system';
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      } catch (e) {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    })();
  `;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyThemeScript() }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
