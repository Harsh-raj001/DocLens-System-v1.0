import { createClient } from "@supabase/supabase-js";

// We require these environment variables to be set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase URL or Service Key is missing. Check your .env.local file.");
}

// Create a single supabase client for interacting with your database
// Note: We use the service role key to bypass RLS for backend operations (creating documents/chunks)
export const supabase = createClient(supabaseUrl || "https://dummy.supabase.co", supabaseServiceKey || "dummy", {
  auth: {
    persistSession: false,
  },
});
