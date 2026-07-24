import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!supabase) {
    return Response.json(
      { message: 'Server configuration error: Supabase admin client unavailable.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const { userId, business_name, trade, contact_email, contact_phone, plan } = body;

  // Validate required fields (mirrors the businesses table constraints)
  if (!userId) {
    return Response.json({ message: 'userId is required.' }, { status: 400 });
  }
  if (!business_name || !business_name.trim()) {
    return Response.json({ message: 'business_name is required.' }, { status: 400 });
  }
  if (!contact_email || !contact_email.trim()) {
    return Response.json({ message: 'contact_email is required.' }, { status: 400 });
  }

  // Insert only the columns that exist in the businesses table
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      owner_id: userId,
      business_name: business_name.trim(),
      trade: trade?.trim() || null,
      contact_email: contact_email.trim(),
      contact_phone: contact_phone?.trim() || null,
      plan: plan || null,
    })
    .select('id, business_name')
    .single();

  if (error) {
    console.error('Business insert error:', error);
    return Response.json({ message: error.message }, { status: 500 });
  }

  return Response.json({ id: data.id, business_name: data.business_name }, { status: 201 });
}
