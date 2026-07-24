import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  if (!supabase) {
    return Response.json(
      { message: 'Server configuration error: Supabase admin client unavailable.' },
      { status: 500 }
    );
  }

  // Extract the access token from the Authorization header
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return Response.json({ message: 'Unauthorized: no token provided.' }, { status: 401 });
  }

  // Verify the token and get the user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return Response.json({ message: 'Unauthorized: invalid token.' }, { status: 401 });
  }

  // Fetch only columns that exist in the businesses table
  const { data, error } = await supabase
    .from('businesses')
    .select('id, business_name, trade, contact_email, contact_phone, plan, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Fetch businesses error:', error);
    return Response.json({ message: error.message }, { status: 500 });
  }

  return Response.json(data ?? []);
}
