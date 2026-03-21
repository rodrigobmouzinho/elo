import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && serviceRole);
export const hasSupabaseAuthClient = Boolean(url && anonKey);

export const supabaseAdmin = hasSupabase
  ? createClient(url as string, serviceRole as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

export const supabaseAuthClient = hasSupabaseAuthClient
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;
