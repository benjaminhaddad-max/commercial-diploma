import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://adpifxobpzrduotwdqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcGlmeG9icHpyZHVvdHdkcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDc2NTksImV4cCI6MjA4ODcyMzY1OX0.PrGn4Bo-yauC9Vo90STZntZgrQ31MVlsNRr61M_V8rs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
