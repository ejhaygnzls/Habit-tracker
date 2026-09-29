import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const habitSchema = z.object({
  name: z.string().trim().min(1, 'Habit name is required.').max(60, 'Habit name must be 60 characters or fewer.'),
  icon: z.string().min(1).max(4),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid 6-digit hex value.'),
  categoryId: z.string().optional().nullable(),
  frequencyType: z.enum(['daily', 'weekdays', 'x_per_week']),
  frequencyConfig: z.string().optional().default('{}'),
  reminderTime: z.string().optional().nullable(),
  targetTimeOfDay: z.enum(['Morning', 'Afternoon', 'Evening', 'Anytime']).optional(),
});

export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habits = await prisma.habit.findMany({
    where: { userId: user.userId },
    include: { category: true, logs: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(habits.map((habit) => ({
    ...habit,
    frequencyConfig: habit.frequencyConfig || '{}',
  })));
}

export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = habitSchema.parse(await request.json());
    const habit = await prisma.habit.create({
      data: {
        userId: user.userId,
        name: body.name,
        icon: body.icon,
        color: body.color,
        categoryId: body.categoryId || null,
        frequencyType: body.frequencyType,
        frequencyConfig: body.frequencyConfig,
        reminderTime: body.reminderTime || null,
        targetTimeOfDay: body.targetTimeOfDay || 'Anytime',
      },
      include: { category: true },
    });

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid habit payload' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to create habit' }, { status: 500 });
  }
}
