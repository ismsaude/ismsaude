const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envCode = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envCode.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envCode.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: cols, error: colsErr } = await supabase.rpc('get_columns_missing_rpc'); // fallback, or we can just try selecting the first row or select * limit 1
    const { data, error } = await supabase.from('surgeries').select('*').limit(1);
    console.log(Object.keys(data[0] || {}));
}
check();
