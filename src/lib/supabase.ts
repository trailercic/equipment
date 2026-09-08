import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Nedostaju VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY environment promenljive. Vidi .env.example."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
