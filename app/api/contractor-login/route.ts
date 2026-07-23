import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, { windowMs: 60_000, maxRequests: 5 });

  if (!rateLimit.allowed) {
    return Response.json(
      { message: 'Too many login attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const { email, password } = body;

  const demoEmail = 'contractor@hvap.dev';
  const demoPassword = 'SecurePass123!';

  const isValid = email?.toLowerCase() === demoEmail && password === demoPassword;

  if (!isValid) {
    return Response.json({ message: 'Invalid contractor credentials.' }, { status: 401 });
  }

  return Response.json({
    ok: true,
    user: { email, role: 'contractor' },
    session: { access_token: 'demo-access-token', expires_at: Date.now() + 60 * 60 * 1000 }
  });
}
