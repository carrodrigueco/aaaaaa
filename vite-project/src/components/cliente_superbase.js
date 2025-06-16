import { createClient } from '@supabase/supabase-js';

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcW1lcWFhbHJmemlmYXlucm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MTk4NDksImV4cCI6MjA2NDQ5NTg0OX0.iIo_N0lDyLbGGV1j_NS76bxTy297RFljPV8bY-dmskI";
const SUPABASE_URL = "https://zeqmeqaalrfzifaynrnx.supabase.co";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);