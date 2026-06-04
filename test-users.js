import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://flernmlmhehrobzzhvxc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZXJubWxtaGVocm9ienpodnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDM0MjAsImV4cCI6MjA5MTI3OTQyMH0.Hj11qR2lHYmQa37eBb5z5FrSgqA83fjtOx7WL0XSJQU'
);

async function run() {
    const { data: users } = await supabase.from('users').select('name, role');
    console.log(users);
}
run();
