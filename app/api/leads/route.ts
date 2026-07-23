import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/leads - Returns all leads ordered by creation date
export async function GET() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return Response.json(
    {
      success: true,
      data,
    },
    { status: 200 }
  );
}

// POST /api/leads - Inserts a new lead (with rate limiting)
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, { windowMs: 60_000, maxRequests: 10 });

  if (!rateLimit.allowed) {
    return Response.json(
      { message: 'Too many lead submissions. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!payload?.name || !payload?.email) {
    return Response.json({ message: 'Name and email are required.' }, { status: 400 });
  }

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          lead_name: payload.name,
          lead_email: payload.email,
          lead_phone: payload.phone || '',
          message: payload.message || '',
          status: 'New'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting lead:', error);
      return Response.json({ message: 'Database submission failed: ' + error.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      message: 'Lead captured successfully in database.',
      lead: data
    });
  }

  // Fallback to mock behavior if Supabase is not configured
  return Response.json({
    ok: true,
    message: 'Lead captured successfully (mock sandbox mode).',
    lead: {
      lead_name: payload.name,
      lead_email: payload.email,
      lead_phone: payload.phone || '',
      message: payload.message || ''
    }
  });
}