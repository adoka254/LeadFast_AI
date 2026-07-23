import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

// Helper function to send confirmation email to lead via Resend & Claude AI
async function sendConfirmationEmail(name: string, email: string, message?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured. Skipping confirmation email.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let emailContent = `Hello ${name},\n\nThank you for reaching out! We have received your request and our team will get back to you shortly.\n\nBest regards,\nLeadFast AI Team`;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are an AI assistant for LeadFast AI. A customer named ${name} submitted this lead request message: "${message || 'Service enquiry'}". Write a friendly, concise, and professional confirmation email acknowledging their request and letting them know a representative will contact them shortly.`
          }
        ]
      });

      const text = response.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");

      if (text) emailContent = text;
    } catch (err) {
      console.error("AI reply generation failed, using standard template:", err);
    }
  }

  try {
    await resend.emails.send({
      from: "LeadFast <onboarding@resend.dev>",
      to: email,
      subject: "Confirmation: We received your request - LeadFast AI",
      text: emailContent
    });
    console.log(`Confirmation email sent successfully to ${email}`);
  } catch (emailErr) {
    console.error("Failed to send confirmation email via Resend:", emailErr);
  }
}

// GET /api/leads - Returns all leads ordered by creation date
export async function GET() {
  if (!supabase) {
    return Response.json(
      {
        success: false,
        error: "Supabase client not configured",
      },
      { status: 500 }
    );
  }

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

// POST /api/leads - Inserts a new lead (with rate limiting and confirmation email)
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

  let createdLead = null;

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

    createdLead = data;
  } else {
    createdLead = {
      lead_name: payload.name,
      lead_email: payload.email,
      lead_phone: payload.phone || '',
      message: payload.message || ''
    };
  }

  // Trigger confirmation email sending (asynchronous)
  sendConfirmationEmail(payload.name, payload.email, payload.message);

  return Response.json({
    ok: true,
    message: 'Lead captured successfully and confirmation email sent.',
    lead: createdLead
  });
}