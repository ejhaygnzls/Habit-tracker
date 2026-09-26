import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const habitSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  icon: z.string().min(1).max(4).optional(),
  color: z.string().min(3).max(20).optional(),
  categoryId: z.string().nullable().optional(),
  frequencyType: z.enum(['daily', 'weekdays', 'x_per_week']).optional(),
  frequencyConfig: z.string().optional(),
  reminderTime: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habit = await prisma.habit.findFirst({
    where: { id: params.id, userId: user.userId },
    include: { category: true, logs: true },
  });

  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  return NextResponse.json(habit);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habit = await prisma.habit.findFirst({ where: { id: params.id, userId: user.userId } });
  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  try {
    const body = habitSchema.parse(await request.json());
    const updated = await prisma.habit.update({
      where: { id: params.id },
      data: body,
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid habit payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update habit' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habit = await prisma.habit.findFirst({ where: { id: params.id, userId: user.userId } });
  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  await prisma.habit.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
