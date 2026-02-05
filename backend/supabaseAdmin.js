import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://cdxeqrhdascyezirccrm.supabase.co";
// This MUST be the "service_role" secret from your Supabase dashboard
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeGVxcmhkYXNjeWV6aXJjY3JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzIyNDE2NSwiZXhwIjoyMDcyODAwMTY1fQ.84ansJdDCZ92V61HwEavy6cWUZt_URmYS4AoCp3dSN0";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
