/* Supabase connection. The publishable key is safe to keep in frontend code
   because Row Level Security controls who can read and write.
   NEVER put a key starting with sb_secret_ or service_role in any file. */
const SUPABASE_URL = "https://yafzbrkudquitxqwprpb.supabase.co";
const SUPABASE_KEY = "sb_publishable_u6iDr_YV0zNB3NrVKDzm2g_vXqtiBbp";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);