import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qbhhgspznslxykmrkacx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGhnc3B6bnNseHlrbXJrYWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjkwNDYsImV4cCI6MjA5MzQwNTA0Nn0.NtSkt6GJBtO3BYIQB38uTITG5B6nY4k5IwEOPD0UdpA';

export const supabase = createClient(supabaseUrl, supabaseKey);
