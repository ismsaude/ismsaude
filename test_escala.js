import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('settings').select('data').eq('id', 'escala').single();
    if (error) {
        console.error("Error:", error);
        return;
    }
    const assignments = data.data.assignments;
    console.log("Total assignments:", Object.keys(assignments).length);
    
    // Find Iuri's assignments
    const iuriAssignments = Object.entries(assignments).filter(([key, a]) => {
        return a.doctorName && a.doctorName.toUpperCase().includes('IURI');
    });
    
    console.log(`Found ${iuriAssignments.length} assignments for Iuri.`);
    
    iuriAssignments.forEach(([key, a]) => {
        console.log(`Key: ${key} | Date: ${a.date} | Doctor: ${a.doctorName} | Hosp: ${a.hospitalName} | Time: ${a.time} | Period: ${a.period}`);
    });
}

check();
