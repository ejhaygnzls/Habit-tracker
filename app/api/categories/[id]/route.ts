import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const categorySchema = z
  .object({
    name: z.string().trim().min(1, 'Category name is required.').max(30, 'Category name must be 30 characters or fewer.').optional(),
    color: z.string().min(3).max(12).optional(),
  })
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: 'At least one category field is required.',
  });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const category = await prisma.category.findUnique({
    where: { id: params.id },
  });

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  if (category.userId !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = categorySchema.parse(await request.json());
    const trimmedName = body.name?.trim();

    if (body.name !== undefined && trimmedName === '') {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
    }

    if (trimmedName) {
      const existingCategories = await prisma.category.findMany({
        where: { userId: user.userId, id: { not: params.id } },
        select: { name: true },
      });

      const duplicate = existingCategories.some((category) => category.name.toLowerCase() === trimmedName.toLowerCase());

      if (duplicate) {
        return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 });
      }
    }

    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(trimmedName ? { name: trimmedName } : {}),
        ...(body.color ? { color: body.color } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid category payload' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to update category' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const category = await prisma.category.findUnique({
    where: { id: params.id },
  });

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  if (category.userId !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.habit.updateMany({
      where: { categoryId: params.id },
      data: { categoryId: null },
    }),
    prisma.category.delete({
      where: { id: params.id },
    }),
  ]);

  return NextResponse.json({ success: true });
}
