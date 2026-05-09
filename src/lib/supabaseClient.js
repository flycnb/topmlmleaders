import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || "https://qbhhgspznslxykmrkacx.supabase.co";
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY || "missing-anon-key-local-dev";

if (!process.env.REACT_APP_SUPABASE_ANON_KEY) {
  // Keep app booting in local/dev so UI fallback paths still work.
  // Auth/data calls will fail until REACT_APP_SUPABASE_ANON_KEY is configured.
  // eslint-disable-next-line no-console
  console.warn("Missing REACT_APP_SUPABASE_ANON_KEY. Configure it in your environment.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
