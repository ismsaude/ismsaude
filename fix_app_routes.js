const fs = require('fs');
const path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  { path: '"/dashboard"', mod: 'dashboard' },
  { path: '"/fila"', mod: 'agendamento' },
  { path: '"/pacientes"', mod: 'atendimento' },
  { path: '"/semana"', mod: 'agendamento' },
  { path: '"/aih"', mod: 'atendimento' },
  { path: '"/apa"', mod: 'atendimento' },
  { path: '"/configuracoes"', mod: 'configuracoes' },
  { path: '"/configuracoes-painel"', mod: 'configuracoes' },
  { path: '"/importar-dados"', mod: 'configuracoes' },
  { path: '"/atendimento"', mod: 'atendimento' },
  { path: '"/autorizacoes"', mod: 'autorizacao' },
  { path: '"/recepcao"', mod: 'atendimento' },
  { path: '"/agenda"', mod: 'agendamento' },
  { path: '"/internacao"', mod: 'atendimento' },
  { path: '"/escala"', mod: 'escala' },
  { path: '"/pep"', mod: 'atendimento' },
  { path: '"/pep-hub"', mod: 'atendimento' },
  { path: '"/finance/dashboard"', mod: 'financeiro' },
  { path: '"/finance/transacoes"', mod: 'financeiro' },
  { path: '"/finance/conciliacao"', mod: 'financeiro' },
  { path: '"/finance/repasse"', mod: 'financeiro' },
  { path: '"/finance/glosas"', mod: 'financeiro' },
  { path: '"/finance/configuracoes"', mod: 'financeiro' }
];

let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<Route path=')) {
        for (const rep of replacements) {
            if (lines[i].includes(`path=${rep.path}`)) {
                // The next line should be <PermissionRoute ...>
                let j = i + 1;
                if (lines[j] && lines[j].includes('<PermissionRoute')) {
                    if (!lines[j].includes('requiredModule')) {
                        lines[j] = lines[j].replace('<PermissionRoute', `<PermissionRoute requiredModule="${rep.mod}"`);
                    }
                }
            }
        }
    }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log("App.jsx updated!");
