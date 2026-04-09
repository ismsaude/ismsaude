import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
    const { data, error } = await supabase
        .from('sigtap')
        .select('codigo, nome')
        .or(`nome.ilike.%HIS%,codigo.ilike.%HIS%`)
        .limit(300);

    console.log("Error:", error);
    console.log("Found rows:", data?.length);
    if (data?.length > 0) {
        console.log("First 3:", data.slice(0, 3));
    } else {
        const { data: all } = await supabase.from('sigtap').select('codigo, nome').limit(5);
        console.log("Fallback 5 rows overall:", all);
    }
}
testSearch();
