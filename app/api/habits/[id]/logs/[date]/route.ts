import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const logSchema = z.object({
  completed: z.boolean(),
  note: z.string().optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: { id: string; date: string } }) {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habit = await prisma.habit.findFirst({ where: { id: params.id, userId } });
  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
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
