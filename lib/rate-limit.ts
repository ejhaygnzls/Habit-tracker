const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attemptsByIp = new Map<string, number[]>();

export function isRateLimited(request: Request): boolean {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';
  const cutoff = Date.now() - WINDOW_MS;

  for (const [storedIp, timestamps] of attemptsByIp) {
    const recentAttempts = timestamps.filter((timestamp) => timestamp > cutoff);
    if (recentAttempts.length) {
      attemptsByIp.set(storedIp, recentAttempts);
    } else {
      attemptsByIp.delete(storedIp);
    }
  }

  const attempts = attemptsByIp.get(ip) ?? [];
  if (attempts.length >= MAX_ATTEMPTS) {
    return true;
  }

  attempts.push(Date.now());
  attemptsByIp.set(ip, attempts);
  return false;
}
