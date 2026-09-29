import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const settingsSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(128).optional(),
});

export async function GET() {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = settingsSchema.parse(await request.json());
    const update: { name?: string; email?: string; passwordHash?: string } = {};

    if (body.name) update.name = body.name;
    if (body.email) update.email = body.email.toLowerCase();
    if (body.password) {
      const bcrypt = await import('bcryptjs');
      update.passwordHash = await bcrypt.default.hash(body.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: update,
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid settings payload' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update settings' }, { status: 500 });
  }
}
