import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('escala_history').select('*').limit(1);
  console.log('escala_history:', error ? error.message : 'exists');
  const { data: d2, error: e2 } = await supabase.from('logs').select('*').limit(1);
  console.log('logs:', e2 ? e2.message : 'exists');
}
test();
