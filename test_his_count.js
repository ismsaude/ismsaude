import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHisCount() {
    const { data: data50, error } = await supabase
        .from('sigtap')
        .select('codigo, nome')
        .ilike('nome', `%HIS%`)
        .limit(50);
        
    console.log("Matches within 50 limit for HIS:", data50?.length);
    console.log("First 3 matches:", data50?.slice(0,3).map(d => d.nome));
}
checkHisCount();
