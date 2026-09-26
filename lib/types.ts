export type HabitTimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';

export type FrequencyType = 'daily' | 'weekdays' | 'x_per_week';

export type HabitRecord = {
  id: string;
  name: string;
  icon: string;
  color: string;
  categoryId?: string | null;
  categoryName?: string;
  frequencyType: FrequencyType;
  frequencyConfig: string;
  reminderTime?: string | null;
  isArchived: boolean;
  targetTimeOfDay: HabitTimeOfDay;
  createdAt: string;
};

export type HabitLogRecord = {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  note?: string | null;
  loggedAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  name?: string | null;
};
