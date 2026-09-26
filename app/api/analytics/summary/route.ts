import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function getRangeDays(range: string) {
  const map: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 };
  return map[range] ?? 30;
}

export async function GET(request: Request) {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '30d';
  const days = getRangeDays(range);

  const habits = await prisma.habit.findMany({
    where: { userId, isArchived: false },
    include: { logs: true },
  });

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const valueMap: Record<string, number> = {};
  for (const habit of habits) {
    const completions = habit.logs.filter((log) => {
      const date = new Date(`${log.date}T00:00:00`);
      return log.completed && date >= start && date <= end;
    }).length;
    const possible = habit.logs.filter((log) => {
      const date = new Date(`${log.date}T00:00:00`);
      return date >= start && date <= end;
    }).length || 1;
    valueMap[habit.id] = (completions / possible) * 100;
  }

  const overall = Object.values(valueMap).reduce((sum, value) => sum + value, 0) / (Object.keys(valueMap).length || 1);

  return NextResponse.json({
    range,
    overallPercent: Number(overall.toFixed(1)),
    habitPerformance: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      percent: Number(((valueMap[habit.id] || 0)).toFixed(1)),
    })),
  });
}
