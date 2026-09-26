import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const habitSchema = z.object({
  name: z.string().min(1).max(80),
  icon: z.string().min(1).max(4),
  color: z.string().min(3).max(20),
  categoryId: z.string().optional().nullable(),
  frequencyType: z.enum(['daily', 'weekdays', 'x_per_week']),
  frequencyConfig: z.string().optional().default('{}'),
  reminderTime: z.string().optional().nullable(),
  targetTimeOfDay: z.enum(['Morning', 'Afternoon', 'Evening', 'Anytime']).optional(),
});

export async function GET() {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habits = await prisma.habit.findMany({
    where: { userId },
    include: { category: true, logs: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(habits.map((habit) => ({
    ...habit,
    targetTimeOfDay: 'Anytime',
    frequencyConfig: habit.frequencyConfig || '{}',
  })));
}

export async function POST(request: Request) {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = habitSchema.parse(await request.json());
    const habit = await prisma.habit.create({
      data: {
        userId,
        name: body.name,
        icon: body.icon,
        color: body.color,
        categoryId: body.categoryId || null,
        frequencyType: body.frequencyType,
        frequencyConfig: body.frequencyConfig,
        reminderTime: body.reminderTime || null,
      },
      include: { category: true },
    });

    return NextResponse.json({ ...habit, targetTimeOfDay: 'Anytime' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid habit payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to create habit' }, { status: 500 });
  }
}
