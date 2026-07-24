import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: Request) {
  try {
    // Check environment variables
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY in .env.local");
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY in .env.local");
    }

    // Read request body
    const body = await request.json();

    const { businessId, name, email,phone, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email and message are required.",
        },
        { status: 400 }
      );
    }
    // 👇 Task 2: Save lead into Supabase if configured
    let leadData = null;
    if (supabase) {
      const { data, error: leadError } = await supabase
        .from("leads")
        .insert([
          {
            business_id: businessId,
            lead_name: name,
            lead_email: email,
            lead_phone: phone,
            message: message,
            status: "received",
          },
        ])
        .select();

      if (leadError) {
        console.error("Failed to insert lead:", leadError);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to save lead.",
            error: leadError.message,
          },
          { status: 500 }
        );
      }
      leadData = data;
    }

console.log("Lead inserted:", leadData);
// 👇 Task 1: Test Supabase connection
/*const {data: supabaseData, error: supabaseError  } = await supabase
  .from("leads")
  .select("*")
  .limit(1);

if (supabaseError) {
  console.error("Supabase connection failed:", supabaseError);

  return NextResponse.json(
    {
      success: false,
      message: "Could not connect to Supabase.",
    },
    { status: 500 }
  );
}

console.log("Supabase connection successful:", supabaseData);*/

    console.log("========== NEW LEAD ==========");
    console.log(body);

    let aiReply = "";

    // Try Claude first
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `
You are an AI assistant for LeadFast AI.

A customer named ${name} submitted this message:

"${message}"

Write a friendly and professional email thanking them,
acknowledging their request,
and letting them know someone will contact them shortly.
            `,
          },
        ],
      });

      aiReply = response.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");

      console.log("Claude generated a reply successfully.");

    } catch (claudeError) {
      console.error("Claude failed.");
      console.error(claudeError);

      // Fallback reply (Sprint Task 3)
      aiReply = `Hello ${name},

Thank you for contacting LeadFast AI.

We have received your message:

"${message}"

Our team will review your request and get back to you shortly.

Kind regards,

LeadFast AI Team`;
    }

    // Send email using Resend (graceful check so email test limits don't crash lead submission)
    try {
      const { data, error } = await resend.emails.send({
        from: "LeadFast <onboarding@resend.dev>",
        to: email,
        subject: "Thank you for contacting LeadFast AI",
        text: aiReply,
      });

      if (error) {
        console.error("Resend Email Warning (Sandbox restriction):", error.message || error);
      } else {
        console.log("Email sent successfully.");
      }
    } catch (resendErr) {
      console.error("Resend sending error caught gracefully:", resendErr);
    }

    return NextResponse.json({
      success: true,
      message: "Lead processed successfully.",
      aiReply,
    });

  } catch (error) {
    console.error("========== SERVER ERROR ==========");
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error occurred.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}