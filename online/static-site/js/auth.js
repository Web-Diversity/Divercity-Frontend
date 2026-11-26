import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL} from './supabase-config.js';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

let clientPromise;

export async function getSupabaseClient(){
 if(!supabaseConfigured)return null;
 clientPromise ||= import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY));
 return clientPromise;
}
