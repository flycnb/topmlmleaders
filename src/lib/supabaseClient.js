import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || "https://qbhhgspznslxykmrkacx.supabase.co";

const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGhnc3B6bnNseHlrbXJrYWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjkwNDYsImV4cCI6MjA5MzQwNTA0Nn0.NtSkt6GJBtO3BYIQB38uTITG5B6nY4k5IwEOPD0UdpA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
