import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://carmreiznexvbhctilcl.supabase.co';
const supabaseAnonKey = 'sb_publishable_KucIWE7IF-dPTSipts8dkw__08CS6sr';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
