import { createClient } from "@supabase/supabase-js";

// Supabase client voor de browser.
// De waarden komen uit .env.local (NEXT_PUBLIC_* is leesbaar in de browser).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
