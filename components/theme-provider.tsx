'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getResolvedTheme(theme: Theme): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';

  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return theme;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isDark = getResolvedTheme(theme) === 'dark';
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const nextTheme = savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'system';
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('theme', theme);
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: getResolvedTheme(theme),
      setTheme: (nextTheme: Theme) => {
        setThemeState(nextTheme);
        localStorage.setItem('theme', nextTheme);
        applyTheme(nextTheme);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
