import { createClient } from '@supabase/supabase-js';

const SUPABASE_KEY = "";
const SUPABASE_URL = "https://zeqmeqaalrfzifaynrnx.supabase.co";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
