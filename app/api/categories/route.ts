import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const categorySchema = z.object({
  name: z.string().min(1).max(30),
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
    const trimmedName = body.name.trim();

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
      return NextResponse.json({ error: 'Category name is required and must be valid.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to create category' }, { status: 500 });
  }
}
