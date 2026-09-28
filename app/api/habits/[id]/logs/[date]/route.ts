import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const logSchema = z.object({
  completed: z.boolean(),
  note: z.string().optional().nullable(),
});

function parseLocalDate(dateString: string) {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(dateString);
  if (!match) return null;

  const year = Number(match[0].slice(0, 4));
  const month = Number(match[0].slice(5, 7));
  const day = Number(match[0].slice(8, 10));
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export async function PATCH(request: Request, { params }: { params: { id: string; date: string } }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habit = await prisma.habit.findFirst({ where: { id: params.id, userId: user.userId } });
  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  const parsedDate = parseLocalDate(params.date);
  if (!parsedDate) {
    return NextResponse.json({ error: 'Date must be a valid YYYY-MM-DD value.' }, { status: 400 });
  }

  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (parsedDate > todayLocal) {
    return NextResponse.json({ error: 'You cannot update a habit for a future date.' }, { status: 400 });
  }

  try {
    const body = logSchema.parse(await request.json());
    const log = await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: params.id, date: params.date } },
      update: { completed: body.completed, note: body.note ?? null },
      create: {
        habitId: params.id,
        date: params.date,
        completed: body.completed,
        note: body.note ?? null,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid log payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to save log' }, { status: 500 });
  }
}
