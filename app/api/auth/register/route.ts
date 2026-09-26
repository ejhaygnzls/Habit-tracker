import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, signJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: body.name || body.email.split('@')[0],
        email: body.email.toLowerCase(),
        passwordHash: await hashPassword(body.password),
      },
    });

    const token = signJwt({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    }, { status: 201 });

    response.cookies.set('habit_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
