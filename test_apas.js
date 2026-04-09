import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('apas').select('*').limit(1);
  console.log('Error:', error);
  if (data && data.length) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Last APA:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data');
  }
}
check();
