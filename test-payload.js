const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qcwbjdxfngddyneipttc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd2JqZHhmbmdkZHluZWlwdHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjM2MzAsImV4cCI6MjA4ODMzOTYzMH0.2-jmqYd68x2mJJ0wmpwgz29xBCatkw-rs-bc7GPvpX0'
);

async function testInsert() {
  const payload = {
      paciente: '[BLOQUEIO DE AGENDA]',
      cns: '',
      nascimento: '',
      telefone: '',
      telefone2: '',
      municipio: 'Porto Feliz',
      cirurgiao: '',
      especialidade: '',
      procedimento: 'Teste',
      anestesia: '',
      convenio: 'SUS',
      prioridade: 'ELETIVA',
      sala: "01",
      dataAtendimento: '',
      dataAutorizacao: '',
      dataAgendado: "2025-03-18",
      horario: "10:00",
      aih: false,
      autorizada: false,
      apa: false,
      opme: false,
      status: 'BLOQUEIO',
      obs: `[DURACAO:120]`,
      createdAt: new Date().toISOString()
  };

  const { data, error } = await supabase.from('surgeries').insert([payload]);
  if (error) {
    console.error('SUPABASE ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
}

testInsert();
