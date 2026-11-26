import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL} from './supabase-config.js';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export async function createSupabaseClient(){
 if(!supabaseConfigured)return null;
 const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
 return createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
}
