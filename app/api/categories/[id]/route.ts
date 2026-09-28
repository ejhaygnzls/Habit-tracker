import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const categorySchema = z
  .object({
    name: z.string().trim().min(1).max(30).optional(),
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
      return NextResponse.json({ error: 'Category name is required and must be valid.' }, { status: 400 });
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
