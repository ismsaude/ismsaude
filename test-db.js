import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://flernmlmhehrobzzhvxc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZXJubWxtaGVocm9ienpodnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDM0MjAsImV4cCI6MjA5MTI3OTQyMH0.Hj11qR2lHYmQa37eBb5z5FrSgqA83fjtOx7WL0XSJQU'
);

async function run() {
    const { data: d25 } = await supabase.from('consultas').select('*').eq('data_agendamento', '2026-05-25');
    const { data: d26 } = await supabase.from('consultas').select('*').eq('data_agendamento', '2026-05-26');
    const { data: d27 } = await supabase.from('consultas').select('*').eq('data_agendamento', '2026-05-27');
    
    console.log('25/05:', d25?.map(c => ({ id: c.id, nome: c.paciente_nome, med: c.medico, status: c.status })));
    console.log('26/05:', d26?.map(c => ({ id: c.id, nome: c.paciente_nome, med: c.medico, status: c.status })));
    console.log('27/05:', d27?.map(c => ({ id: c.id, nome: c.paciente_nome, med: c.medico, status: c.status })));
}

run();
