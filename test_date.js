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
    
    // Find Iuri's assignments
    const iuriAssignments = Object.entries(assignments).filter(([key, a]) => {
        return a.doctorName && a.doctorName.toUpperCase().includes('IURI');
    });
    
    const today = new Date('2026-05-27T00:00:00');
    
    iuriAssignments.forEach(([key, a]) => {
        let shiftDate = null;
        if (a.date && a.date.includes('/')) {
            const [dayStr, monthStr] = a.date.split('/');
            const year = today.getFullYear();
            shiftDate = new Date(year, parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
        } else if (key && key.match(/^\d{4}-\d{2}-w\d/)) {
            const parts = key.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const weekIdx = parseInt(parts[2].replace('w', ''), 10) - 1;
            const dayIdx = parseInt(parts[5], 10);
            
            const firstDay = new Date(year, month - 1, 1);
            const startDayOffset = firstDay.getDay(); 
            
            shiftDate = new Date(firstDay);
            shiftDate.setDate(shiftDate.getDate() - startDayOffset + (weekIdx * 7) + dayIdx);
        }
        
        if (shiftDate && shiftDate >= today) {
            console.log(`FUTURE -> Key: ${key} | Computed Date: ${shiftDate.toLocaleDateString()} | Hosp: ${a.hospitalName}`);
        }
    });
}

check();
