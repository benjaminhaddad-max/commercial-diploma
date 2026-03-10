import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://coyrplheyqmitbsvizek.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXJwbGhleXFtaXRic3ZpemVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTUzMjQsImV4cCI6MjA4ODQ5MTMyNH0.Tuh2_BUIK7nA67SQNKJeQZsf98aCocA2xHFqBgRMOXI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
