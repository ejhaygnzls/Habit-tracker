import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signJwt, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isRateLimited } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required.' }).trim().email('Enter a valid email address.'),
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.'),
});

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 });
  }

  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signJwt({ userId: user.id, email: user.email });
    const response = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });

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
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid login payload' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
