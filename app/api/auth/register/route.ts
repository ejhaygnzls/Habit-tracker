import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, signJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isRateLimited } from '@/lib/rate-limit';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty.').max(80).optional(),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').regex(/[0-9]/, 'Password must contain a number').max(128),
});

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 });
  }

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
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
