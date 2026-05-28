import { createClient } from '@supabase/supabase-js';

export const MILLER_PROJECT_ID =
  import.meta.env.VITE_MM_PROJECT_ID ||
  import.meta.env.VITE_MILLER_PROJECT_ID ||
  '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: { headers: { 'x-miller-project-id': MILLER_PROJECT_ID } },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase nao configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.');
  }
  return supabase;
}
