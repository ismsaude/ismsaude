const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envCode = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envCode.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envCode.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    console.log(error || Object.keys(data[0] || {}));
}
check();
