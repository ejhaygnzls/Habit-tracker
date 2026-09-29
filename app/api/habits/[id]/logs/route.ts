import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const logSchema = z.object({
  date: z.string(),
  completed: z.boolean(),
  note: z.string().optional().nullable(),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habit = await prisma.habit.findFirst({ where: { id: params.id, userId: user.userId } });
  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  const logs = await prisma.habitLog.findMany({ where: { habitId: params.id }, orderBy: { date: 'asc' } });
  return NextResponse.json(logs);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habit = await prisma.habit.findFirst({ where: { id: params.id, userId: user.userId } });
  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  try {
    const body = logSchema.parse(await request.json());
    const log = await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: params.id, date: body.date } },
      update: { completed: body.completed, note: body.note ?? null },
      create: {
        habitId: params.id,
        date: body.date,
        completed: body.completed,
        note: body.note ?? null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid log payload' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to save log' }, { status: 500 });
  }
}
