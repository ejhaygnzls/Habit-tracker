'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Flame,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { authFetch, clearToken } from '@/lib/auth-client';
import { useTheme } from '@/components/theme-provider';

type TabKey = 'dashboard' | 'habits' | 'calendar' | 'analytics' | 'settings';
type FrequencyType = 'daily' | 'weekdays' | 'x_per_week';
type HabitTimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';

type Category = {
  id: string;
  name: string;
  color: string;
};

type HabitLog = {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  note?: string | null;
};

type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  categoryId?: string | null;
  categoryName?: string;
  frequencyType: FrequencyType;
  frequencyConfig: string;
  reminderTime?: string | null;
  isArchived?: boolean;
  targetTimeOfDay: HabitTimeOfDay;
  logs: HabitLog[];
};

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'habits', label: 'Habits', icon: Target },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'settings', label: 'Settings', icon: Settings },
] as const;

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getTodayIso(date: Date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function calculateStreak(logs: HabitLog[]) {
  const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  let cursor = new Date();

  for (const log of sorted) {
    const logDate = new Date(`${log.date}T12:00:00`);
    if (log.completed && Math.abs(cursor.getTime() - logDate.getTime()) <= 86400000 * 1.5) {
      streak += 1;
      cursor = new Date(logDate.getTime() - 86400000);
    } else if (log.completed) {
      streak += 1;
      cursor = new Date(logDate.getTime() - 86400000);
    } else {
      break;
    }
  }

  return streak;
}

function computeHabitProgress(habit: Habit, date: string = getTodayIso()) {
  const log = habit.logs.find((item) => item.date === date);
  return log?.completed ?? false;
}

function isDateInFuture(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const parsed = new Date(`${dateString}T12:00:00`);
  const today = new Date(`${getTodayIso()}T12:00:00`);

  return Number.isNaN(parsed.getTime()) ? false : parsed.getTime() > today.getTime();
}

function getCompletionData(habits: Habit[], rangeDays: number) {
  const result: { day: string; percent: number }[] = [];
  for (let i = rangeDays - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayString = getTodayIso(date);
    const total = habits.length || 1;
    const done = habits.filter((habit) => computeHabitProgress(habit, dayString)).length;
    result.push({ day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), percent: Math.round((done / total) * 100) });
  }
  return result;
}

function exportCsv(filename: string, rows: Array<Record<string, string | number | boolean>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => `"${String(row[header]).replace(/"/g, '""')}"`).join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function HabitApp() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [accent, setAccent] = useState('#22c55e');
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [categories, setCategories] = useState<Category[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitForm, setHabitForm] = useState({
    name: '',
    icon: '✨',
    color: '#22c55e',
    categoryId: '',
    frequencyType: 'daily' as FrequencyType,
    reminderTime: '08:00',
    targetTimeOfDay: 'Morning' as HabitTimeOfDay,
  });
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#22c55e');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState({ name: '', color: '#22c55e' });
  const [isCategorySaving, setIsCategorySaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [habitListFilter, setHabitListFilter] = useState<'active' | 'archived'>('active');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const normalizeHabit = (habit: any): Habit => ({
    ...habit,
    categoryName: habit.category?.name || habit.categoryName || undefined,
    targetTimeOfDay: habit.targetTimeOfDay || 'Anytime',
    logs: Array.isArray(habit.logs) ? habit.logs : [],
    reminderTime: habit.reminderTime ?? null,
    frequencyConfig: habit.frequencyConfig || '{}',
    isArchived: Boolean(habit.isArchived),
  });

  const loadData = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);

      const [habitsRes, categoriesRes] = await Promise.all([
        authFetch('/api/habits'),
        authFetch('/api/categories'),
      ]);

      if (!habitsRes.ok || !categoriesRes.ok) {
        throw new Error('Unable to load your habits');
      }

      const habitsData = await habitsRes.json();
      const categoriesData = await categoriesRes.json();

      setHabits(Array.isArray(habitsData) ? habitsData.map(normalizeHabit) : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const todayIso = getTodayIso();

  const todayHabits = useMemo(() => habits.filter((habit) => !habit.isArchived), [habits]);
  const completedToday = useMemo(() => todayHabits.filter((habit) => computeHabitProgress(habit, todayIso)).length, [todayHabits, todayIso]);
  const percentToday = Math.round((completedToday / Math.max(todayHabits.length, 1)) * 100);
  const bestCurrentStreak = useMemo(() => Math.max(...todayHabits.map((habit) => calculateStreak(habit.logs)), 0), [todayHabits]);

  const groupedHabits = useMemo(() => {
    const groups: Record<HabitTimeOfDay, Habit[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
      Anytime: [],
    };

    todayHabits.forEach((habit) => {
      const key = habit.targetTimeOfDay || 'Anytime';
      groups[key].push(habit);
    });

    return groups;
  }, [todayHabits]);

  const analyticsData = useMemo(() => getCompletionData(todayHabits, range === '7d' ? 7 : range === '30d' ? 30 : 90), [todayHabits, range]);

  const visibleHabits = useMemo(
    () =>
      habits.filter((habit) => {
        const matchesStatus = habitListFilter === 'archived' ? Boolean(habit.isArchived) : !habit.isArchived;
        const matchesCategory = selectedCategoryFilter === 'all' || habit.categoryId === selectedCategoryFilter;
        return matchesStatus && matchesCategory;
      }),
    [habits, habitListFilter, selectedCategoryFilter],
  );

  const habitPerformanceData = useMemo(
    () =>
      [...todayHabits]
        .map((habit) => {
          const total = habit.logs.length || 1;
          const done = habit.logs.filter((log) => log.completed).length;
          return { name: habit.name, value: Math.round((done / total) * 100) };
        })
        .sort((a, b) => b.value - a.value),
    [todayHabits],
  );

  const monthDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - firstDay.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    return days;
  }, [calendarMonth]);

  const handleToggleHabit = async (habitId: string, date: string = todayIso, completed = true) => {
    if (isDateInFuture(date)) {
      setError('You can only update habits for today or past dates.');
      return;
    }

    const previousHabits = habits;
    setHabits((currentHabits) =>
      currentHabits.map((habit) => {
        if (habit.id !== habitId) return habit;
        const existing = habit.logs.find((log) => log.date === date);
        const nextLogs = existing
          ? habit.logs.map((log) => (log.date === date ? { ...log, completed } : log))
          : [...habit.logs, { id: `log-${habitId}-${date}`, habitId, date, completed, note: completed ? 'Done' : null }];
        return { ...habit, logs: nextLogs };
      }),
    );

    try {
      const response = await authFetch(`/api/habits/${habitId}/logs/${date}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Unable to save habit completion');
      }
    } catch (toggleError) {
      setHabits(previousHabits);
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to save habit completion');
    }
  };

  const resetHabitForm = () => {
    setHabitForm({
      name: '',
      icon: '✨',
      color: '#22c55e',
      categoryId: '',
      frequencyType: 'daily',
      reminderTime: '08:00',
      targetTimeOfDay: 'Morning',
    });
    setEditingHabitId(null);
  };

  const openEditHabit = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setHabitForm({
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      categoryId: habit.categoryId ?? '',
      frequencyType: habit.frequencyType,
      reminderTime: habit.reminderTime ?? '08:00',
      targetTimeOfDay: habit.targetTimeOfDay || 'Anytime',
    });
    setShowHabitForm(true);
  };

  const handleAddHabit = async () => {
    if (!habitForm.name.trim()) return;

    try {
      const payload = {
        name: habitForm.name,
        icon: habitForm.icon || '✨',
        color: habitForm.color,
        categoryId: habitForm.categoryId || null,
        frequencyType: habitForm.frequencyType,
        frequencyConfig: JSON.stringify({}),
        reminderTime: habitForm.reminderTime,
        targetTimeOfDay: habitForm.targetTimeOfDay,
      };

      const response = editingHabitId
        ? await authFetch(`/api/habits/${editingHabitId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              ...payload,
              targetTimeOfDay: habitForm.targetTimeOfDay,
            }),
          })
        : await authFetch('/api/habits', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        throw new Error(editingHabitId ? 'Unable to update habit' : 'Unable to create habit');
      }

      const savedHabit = normalizeHabit(await response.json());

      if (editingHabitId) {
        setHabits((current) => current.map((habit) => (habit.id === editingHabitId ? { ...savedHabit, logs: habit.logs } : habit)));
      } else {
        setHabits((current) => [savedHabit, ...current]);
      }

      resetHabitForm();
      setShowHabitForm(false);
      setError('');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : editingHabitId ? 'Unable to update habit' : 'Unable to create habit');
    }
  };

  const handleArchiveHabit = async (habit: Habit) => {
    const previousHabits = habits;
    setHabits((current) => current.map((item) => (item.id === habit.id ? { ...item, isArchived: !item.isArchived } : item)));

    try {
      const response = await authFetch(`/api/habits/${habit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: !habit.isArchived }),
      });

      if (!response.ok) {
        throw new Error('Unable to archive habit');
      }
    } catch (archiveError) {
      setHabits(previousHabits);
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive habit');
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    const targetHabit = habits.find((habit) => habit.id === habitId);
    if (!targetHabit) return;

    const confirmed = window.confirm(
      'This permanently deletes the habit and its history. Archive is safer if you might want to restore it later. Delete anyway?',
    );

    if (!confirmed) return;

    const previousHabits = habits;
    setHabits((current) => current.filter((habit) => habit.id !== habitId));

    try {
      const response = await authFetch(`/api/habits/${habitId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Unable to delete habit');
      }

      resetHabitForm();
      setShowHabitForm(false);
      setError('');
    } catch (deleteError) {
      setHabits(previousHabits);
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete habit');
    }
  };

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setError('Category name is required.');
      return;
    }

    setIsCategorySaving(true);
    setError('');

    try {
      const response = await authFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          color: newCategoryColor,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create category');
      }

      const category = payload as Category;
      setCategories((current) => [category, ...current]);
      setShowCategoryForm(false);
      setNewCategoryName('');
      setNewCategoryColor('#22c55e');
      setError('');
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : 'Unable to create category');
    } finally {
      setIsCategorySaving(false);
    }
  };

  const handleSaveCategory = async (categoryId: string) => {
    const trimmedName = categoryDraft.name.trim();
    if (!trimmedName) {
      setError('Category name is required.');
      return;
    }

    setIsCategorySaving(true);
    setError('');

    try {
      const response = await authFetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmedName,
          color: categoryDraft.color,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to update category');
      }

      const updatedCategory = payload as Category;
      setCategories((current) => current.map((category) => (category.id === categoryId ? updatedCategory : category)));
      setHabits((current) =>
        current.map((habit) => (habit.categoryId === categoryId ? { ...habit, categoryName: updatedCategory.name } : habit)),
      );
      setEditingCategoryId(null);
      setCategoryDraft({ name: '', color: '#22c55e' });
      setError('');
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : 'Unable to update category');
    } finally {
      setIsCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;

    const confirmed = window.confirm('This keeps the habits in this category and sets them back to General. Delete this category?');
    if (!confirmed) return;

    setIsCategorySaving(true);
    setError('');

    try {
      const response = await authFetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to delete category');
      }

      setCategories((current) => current.filter((item) => item.id !== categoryId));
      setHabits((current) =>
        current.map((habit) => (habit.categoryId === categoryId ? { ...habit, categoryId: null, categoryName: undefined } : habit)),
      );

      if (selectedCategoryFilter === categoryId) {
        setSelectedCategoryFilter('all');
      }

      setEditingCategoryId(null);
      setCategoryDraft({ name: '', color: '#22c55e' });
      setError('');
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : 'Unable to delete category');
    } finally {
      setIsCategorySaving(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push('/');
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      exportCsv('habits.csv', habits.map((habit) => ({ name: habit.name, completed: habit.logs.filter((log) => log.completed).length, total: habit.logs.length })));
      return;
    }

    const blob = new Blob([JSON.stringify({ categories, habits }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'habits.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const selectedDayHabits = habits.filter((habit) => !habit.isArchived);
  const selectedDayCompletion = selectedDayHabits.filter((habit) => computeHabitProgress(habit, selectedDate)).length;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-green-500/40 border-t-green-500" />
          Loading your habits...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-5 rounded-xl bg-green-500 px-4 py-2 font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-7xl">
        <aside className="mb-6 flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white/80 p-3 shadow-soft shadow-slate-200/60 backdrop-blur-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-400 text-xl text-white shadow-lg shadow-green-500/20">✨</div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wellness</p>
              <h1 className="text-xl font-bold tracking-tight">Habit Tracker</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${activeTab === key ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </aside>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
          <section className="space-y-6">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft shadow-slate-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">Today&apos;s progress</p>
                      <div className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-300">{percentToday}%</div>
                    </div>
                    <div className="mt-5 flex items-center justify-center">
                      <div className="relative flex h-32 w-32 items-center justify-center">
                        <svg width="128" height="128" className="progress-ring" viewBox="0 0 128 128" aria-label="Daily completion progress">
                          <circle cx="64" cy="64" r="46" stroke="rgba(148,163,184,0.2)" strokeWidth="10" fill="none" />
                          <circle
                            cx="64"
                            cy="64"
                            r="46"
                            stroke={accent}
                            strokeWidth="10"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 46}
                            strokeDashoffset={2 * Math.PI * 46 * (1 - percentToday / 100)}
                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center text-center">
                          <span className="text-2xl font-bold">{percentToday}%</span>
                          <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400">done</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Flame size={16} className="text-orange-500" />
                      Best streak
                    </div>
                    <div className="mt-6 text-4xl font-bold">{bestCurrentStreak}d</div>
                    <p className="mt-2 text-sm text-slate-500">Current best streak across all habits</p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <CheckCircle2 size={16} className="text-green-500" />
                      Daily summary
                    </div>
                    <div className="mt-6 text-3xl font-bold">
                      {completedToday} of {todayHabits.length}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{Math.max(todayHabits.length - completedToday, 0)} remaining today</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft shadow-slate-200/60 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Today&apos;s focus</h2>
                    <span className="text-sm text-slate-500">{formatDateLabel(todayIso)}</span>
                  </div>

                  {todayHabits.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/60">
                      <div className="mb-4 text-5xl">🌱</div>
                      <p className="text-lg font-semibold">No habits yet</p>
                      <p className="mt-2 text-sm text-slate-500">Create your first habit to start building momentum.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Object.keys(groupedHabits) as HabitTimeOfDay[]).map((groupName) => {
                        const group = groupedHabits[groupName];
                        if (!group.length) return null;

                        return (
                          <div key={groupName}>
                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{groupName}</h3>
                            <div className="space-y-3">
                              {group.map((habit) => (
                                <div key={habit.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleHabit(habit.id, todayIso, !computeHabitProgress(habit, todayIso))}
                                      className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200 ${computeHabitProgress(habit, todayIso) ? 'scale-110 border-green-500 bg-green-500 text-white' : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-700'}`}
                                    >
                                      {computeHabitProgress(habit, todayIso) ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                    </button>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${habit.color}22`, color: habit.color }}>
                                      {habit.icon}
                                    </div>
                                    <div>
                                      <p className="font-medium">{habit.name}</p>
                                      <p className="text-xs text-slate-500">{habit.categoryName || 'General'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">{calculateStreak(habit.logs)}d</span>
                                    <button type="button" className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                      Skip
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'habits' && (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">All habits</p>
                    <h2 className="text-2xl font-bold">Your routines</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHabitForm((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    <Plus size={16} />
                    Add habit
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['active', 'archived'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setHabitListFilter(filter)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${habitListFilter === filter ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      {filter === 'active' ? 'Active' : 'Archived'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${selectedCategoryFilter === 'all' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                  >
                    All categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(category.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${selectedCategoryFilter === category.id ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                      {category.name}
                    </button>
                  ))}
                </div>

                {showHabitForm && (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 md:grid-cols-2 xl:grid-cols-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Name
                      <input
                        value={habitForm.name}
                        onChange={(event) => setHabitForm((current) => ({ ...current, name: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                        placeholder="Walk 30 minutes"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Icon
                      <input
                        value={habitForm.icon}
                        onChange={(event) => setHabitForm((current) => ({ ...current, icon: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                        placeholder="✨"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Color
                      <input
                        type="color"
                        value={habitForm.color}
                        onChange={(event) => setHabitForm((current) => ({ ...current, color: event.target.value }))}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-900"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Category
                      <select
                        value={habitForm.categoryId}
                        onChange={(event) => setHabitForm((current) => ({ ...current, categoryId: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                      >
                        <option value="">General</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Frequency
                      <select
                        value={habitForm.frequencyType}
                        onChange={(event) => setHabitForm((current) => ({ ...current, frequencyType: event.target.value as FrequencyType }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekdays">Weekdays</option>
                        <option value="x_per_week">X per week</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Time of day
                      <select
                        value={habitForm.targetTimeOfDay}
                        onChange={(event) => setHabitForm((current) => ({ ...current, targetTimeOfDay: event.target.value as HabitTimeOfDay }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                        <option value="Anytime">Anytime</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2 xl:col-span-3">
                      Reminder time
                      <input
                        type="time"
                        value={habitForm.reminderTime}
                        onChange={(event) => setHabitForm((current) => ({ ...current, reminderTime: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                      />
                    </label>
                    <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-2">
                      {editingHabitId && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteHabit(editingHabitId)}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 dark:border-red-700/70 dark:bg-red-500/10 dark:text-red-200"
                        >
                          Delete habit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowHabitForm(false);
                          resetHabitForm();
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button type="button" onClick={handleAddHabit} className="rounded-xl bg-green-500 px-4 py-2 font-semibold text-white">
                        {editingHabitId ? 'Save changes' : 'Save habit'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleHabits.length === 0 ? (
                    <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                      {habitListFilter === 'archived' ? 'No archived habits yet.' : 'No active habits yet.'}
                    </div>
                  ) : (
                    visibleHabits.map((habit) => (
                      <div key={habit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${habit.color}22`, color: habit.color }}>
                            {habit.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold">{habit.name}</h3>
                            <p className="text-xs text-slate-500">{habit.categoryName || 'General'}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          {habit.frequencyType}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                        <span>{habit.targetTimeOfDay}</span>
                        <span>{habit.reminderTime || 'No reminder'}</span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button type="button" onClick={() => handleToggleHabit(habit.id, todayIso, !computeHabitProgress(habit, todayIso))} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                          {computeHabitProgress(habit, todayIso) ? 'Completed' : 'Mark done'}
                        </button>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => openEditHabit(habit)} className="text-xs font-medium text-slate-600 underline dark:text-slate-300">
                            Edit
                          </button>
                          <button type="button" onClick={() => void handleArchiveHabit(habit)} className="text-xs text-slate-500 underline">
                            {habit.isArchived ? 'Restore' : 'Archive'}
                          </button>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Habit calendar</p>
                    <h2 className="text-2xl font-bold">{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><ChevronLeft size={16} /></button>
                    <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><ChevronRight size={16} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  {dayNames.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((date) => {
                    const iso = getTodayIso(date);
                    const dayCount = habits.filter((habit) => !habit.isArchived && computeHabitProgress(habit, iso)).length;
                    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                    const isSelected = selectedDate === iso;
                    const isFuture = isDateInFuture(iso);
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => !isFuture && setSelectedDate(iso)}
                        disabled={isFuture}
                        className={`flex min-h-[88px] flex-col rounded-2xl border p-2 text-left transition-opacity ${isSelected ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'} ${!isCurrentMonth ? 'opacity-45' : ''} ${isFuture ? 'cursor-not-allowed opacity-35 grayscale' : ''}`}
                      >
                        <span className="text-sm font-semibold">{date.getDate()}</span>
                        <div className="mt-auto flex flex-wrap gap-1">
                          {Array.from({ length: Math.min(dayCount, 3) }).map((_, index) => (
                            <span key={`${iso}-${index}`} className="h-2.5 w-2.5 rounded-full bg-green-500" />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{formatDateLabel(selectedDate)}</h3>
                    <span className="text-sm text-slate-500">{selectedDayCompletion} of {habits.filter((habit) => !habit.isArchived).length} done</span>
                  </div>

                  <div className="space-y-2">
                    {habits.filter((habit) => !habit.isArchived).map((habit) => {
                      const isFuture = isDateInFuture(selectedDate);
                      return (
                        <div key={habit.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${habit.color}22`, color: habit.color }}>{habit.icon}</div>
                            <span className="font-medium">{habit.name}</span>
                          </div>
                          <button
                            type="button"
                            disabled={isFuture}
                            onClick={() => handleToggleHabit(habit.id, selectedDate, !computeHabitProgress(habit, selectedDate))}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${isFuture ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500' : computeHabitProgress(habit, selectedDate) ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
                          >
                            {isFuture ? 'Locked' : computeHabitProgress(habit, selectedDate) ? 'Done' : 'Mark done'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Performance</p>
                    <h2 className="text-2xl font-bold">Analytics overview</h2>
                  </div>
                  <div className="flex gap-2">
                    {(['7d', '30d', '90d'] as const).map((filter) => (
                      <button key={filter} type="button" onClick={() => setRange(filter)} className={`rounded-xl px-3 py-2 text-sm font-medium ${range === filter ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-sm text-slate-500">Overall completion</p>
                    <p className="mt-2 text-3xl font-bold">{Math.round(analyticsData.reduce((sum, item) => sum + item.percent, 0) / Math.max(analyticsData.length, 1))}%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-sm text-slate-500">Most consistent</p>
                    <p className="mt-2 text-3xl font-bold">{habitPerformanceData[0]?.name || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-sm text-slate-500">Needs attention</p>
                    <p className="mt-2 text-3xl font-bold">{habitPerformanceData.at(-1)?.name || 'None'}</p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <h3 className="mb-4 font-semibold">Completion trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                          <XAxis dataKey="day" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="percent" stroke={accent} strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <h3 className="mb-4 font-semibold">Habit comparison</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={habitPerformanceData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                          <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                          <YAxis type="category" dataKey="name" width={90} stroke="#94a3b8" />
                          <Tooltip />
                          <Bar dataKey="value" fill={accent} radius={6} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm text-slate-500">Preferences</p>
                  <h2 className="text-2xl font-bold">Account settings</h2>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <h3 className="mb-4 font-semibold">Profile</h3>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Name
                        <input defaultValue="Demo User" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Email
                        <input defaultValue="demo@example.com" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Password
                        <input type="password" placeholder="New password" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <h3 className="mb-4 font-semibold">Appearance</h3>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        {(['light', 'dark', 'system'] as const).map((option) => (
                          <button key={option} type="button" onClick={() => setTheme(option)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${theme === option ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>
                            {option === 'light' ? <Sun size={15} /> : option === 'dark' ? <Moon size={15} /> : <Sparkles size={15} />}
                            {option}
                          </button>
                        ))}
                      </div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Accent color
                        <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-900" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <h3 className="mb-4 font-semibold">Data & backup</h3>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => handleExport('csv')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"><Download size={15} /> Export CSV</button>
                    <button type="button" onClick={() => handleExport('json')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Download size={15} /> Export JSON</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Quick stats</h2>
                <Zap className="text-green-500" size={18} />
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-sm text-slate-500">Current streak</div>
                  <div className="mt-1 text-2xl font-bold">{bestCurrentStreak} days</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-sm text-slate-500">Completion today</div>
                  <div className="mt-1 text-2xl font-bold">{completedToday}/{todayHabits.length}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-sm text-slate-500">Best habit</div>
                  <div className="mt-1 text-2xl font-bold">{habitPerformanceData[0]?.name || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Categories</h2>
                <button type="button" onClick={() => setShowCategoryForm((current) => !current)} className="rounded-xl border border-slate-200 px-2 py-1 text-xs font-medium dark:border-slate-700">+ New</button>
              </div>

              {showCategoryForm && (
                <div className="mb-3 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <input
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Category name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(event) => setNewCategoryColor(event.target.value)}
                      className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-900"
                    />
                    <button type="button" onClick={() => void handleCreateCategory()} disabled={isCategorySaving} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                      {isCategorySaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-700/60 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {categories.map((category) => {
                  const isEditing = editingCategoryId === category.id;
                  return (
                    <div key={category.id} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={categoryDraft.name}
                            onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Category name"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="color"
                              value={categoryDraft.color}
                              onChange={(event) => setCategoryDraft((current) => ({ ...current, color: event.target.value }))}
                              className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-900"
                            />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryDraft({ name: '', color: '#22c55e' }); }} className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-600">
                                Cancel
                              </button>
                              <button type="button" onClick={() => void handleSaveCategory(category.id)} disabled={isCategorySaving} className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {isCategorySaving ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryDraft({ name: category.name, color: category.color }); }} className="flex flex-1 items-center justify-between gap-2 rounded-xl text-left">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                              <span>{category.name}</span>
                            </div>
                            <span className="text-xs text-slate-500">{habits.filter((habit) => habit.categoryId === category.id).length}</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryDraft({ name: category.name, color: category.color }); }} className="text-xs text-slate-600 underline dark:text-slate-300">
                              Rename
                            </button>
                            <button type="button" onClick={() => void handleDeleteCategory(category.id)} disabled={isCategorySaving} className="text-xs text-red-600 underline dark:text-red-300 disabled:cursor-not-allowed disabled:opacity-60">
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
