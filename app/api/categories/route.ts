import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(30, 'Category name must be 30 characters or fewer.'),
  color: z.string().min(3).max(12),
});

export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { userId: user.userId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = categorySchema.parse(await request.json());
    const trimmedName = body.name;

    const existingCategories = await prisma.category.findMany({
      where: { userId: user.userId },
      select: { name: true },
    });

    const duplicate = existingCategories.some((category) => category.name.toLowerCase() === trimmedName.toLowerCase());

    if (duplicate) {
      return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        userId: user.userId,
        name: trimmedName,
        color: body.color,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid category payload' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to create category' }, { status: 500 });
  }
}
