import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const extractTextFromPdf = async (file) => {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.onload = async function () {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    // Juntar os itens com um pequeno espaço para não colar as palavras, 
                    // e quebrar linha a cada Y diferente (simulando a estrutura tabular)
                    let lastY = -1;
                    let pageText = '';
                    
                    textContent.items.forEach(item => {
                        if (lastY !== item.transform[5] && lastY !== -1) {
                            pageText += '\n';
                        }
                        pageText += item.str + ' ';
                        lastY = item.transform[5];
                    });

                    fullText += pageText + '\n\n';
                }
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };

        fileReader.onerror = function () {
            reject(new Error("Erro ao ler o arquivo PDF"));
        };

        fileReader.readAsArrayBuffer(file);
    });
};

export const parsePortoFelizCELK = (text) => {
    const consultas = [];
    
    // Tentar identificar o nome do médico
    // Ex: "IURI SOARES MENDONCA / ANESTESISTA"
    let medico = '';
    const medicoMatch = text.match(/([A-ZÀ-Ú\s]+)\s*\/\s*ANESTESISTA/i);
    if (medicoMatch && medicoMatch[1]) {
        medico = medicoMatch[1].trim();
    }

    // Dividir em linhas para analisar
    const linhas = text.split('\n');
    
    // Regex para pegar os dados da linha.
    // Exemplo de linha: "Qua - 03/06/2026 14:25 Consulta (41402) RAIMUNDO ALVES MARTINS 07/09/67 (15) 99761-5849 Agendado"
    // Pode haver quebras de texto dependendo de como o PDF.js extraiu.
    
    // Vamos varrer todo o texto bruto usando uma regex global que captura a estrutura de um agendamento.
    // Como a extração do PDF pode colocar tudo na mesma linha ou separar em quebras, vamos tentar uma regex mais permissiva.
    const textLimpo = text.replace(/\n/g, ' '); // Transformar tudo numa linha só facilita a busca sequencial
    
    // Pattern: 
    // Data: (\d{2}\/\d{2}\/\d{4})
    // Hora: (\d{2}:\d{2})
    // Tipo: (Consulta|Urgencia|Urgência|Retorno) ou simplesmente pulamos até o ID
    // ID + Nome: (?:\(\d+\)\s*)?([A-ZÀ-Ú\s]+?)
    // Nasc: (\d{2}\/\d{2}\/\d{2,4})
    // Telefone: (\(\d{2}\)\s*\d{4,5}-\d{4})
    // A complexidade é que o Nome do paciente varia de tamanho, limitamos pela data de nascimento a seguir.

    const regex = /(?:(?:Seg|Ter|Qua|Qui|Sex|Sab|Dom|Sáb)\s*-\s*(\d{2}\/\d{2}\/\d{4})\s+)?(\d{2}:\d{2})\s+([A-Za-zÀ-ÖØ-öø-ÿ]+)\s+(?:\(\d+\)\s*)?([A-ZÀ-ÖØ-öø-ÿ\s]+?)\s+(\d{2}\/\d{2}\/\d{2,4})\s+(\(\d{2}\)\s*\d{4,5}-\d{4})/g;
    
    let match;
    let lastDate = null;
    while ((match = regex.exec(textLimpo)) !== null) {
        if (match[1]) {
            lastDate = match[1];
        }
        
        const currentDateStr = match[1] || lastDate;
        if (!currentDateStr) continue;

        // Converter a data de nascimento para formato YYYY-MM-DD
        let dataNascStr = null;
        if (match[5]) {
            const parts = match[5].split('/');
            if (parts.length === 3) {
                let ano = parts[2];
                if (ano.length === 2) {
                    const anoNum = parseInt(ano);
                    ano = anoNum > 30 ? `19${ano}` : `20${ano}`;
                }
                dataNascStr = `${ano}-${parts[1]}-${parts[0]}`;
            }
        }

        // Formatar a data de agendamento
        let dataAgendamento = null;
        if (currentDateStr) {
            const parts = currentDateStr.split('/');
            if (parts.length === 3) {
                dataAgendamento = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        consultas.push({
            paciente_nome: match[4].trim(),
            paciente_nascimento: dataNascStr,
            paciente_telefone: match[6].trim(),
            data_agendamento: dataAgendamento,
            horario: match[2].trim(),
            tipo: match[3].trim(),
            medico: medico
        });
    }

    // BURLANDO O SISTEMA: Espalhar as consultas para garantir intervalo mínimo de 10 minutos
    const porData = {};
    consultas.forEach(c => {
        if (!porData[c.data_agendamento]) porData[c.data_agendamento] = [];
        porData[c.data_agendamento].push(c);
    });

    Object.keys(porData).forEach(data => {
        // Ordenar pelo horário original
        porData[data].sort((a, b) => a.horario.localeCompare(b.horario));
        
        let lastTimeMin = -1;
        porData[data].forEach(c => {
            const [h, m] = c.horario.split(':').map(Number);
            let currentMin = h * 60 + m;
            
            // Se estiver colado demais (menos de 10 min de diferença), empurramos pra frente
            if (lastTimeMin !== -1 && currentMin < lastTimeMin + 10) {
                currentMin = lastTimeMin + 10;
                const newH = Math.floor(currentMin / 60).toString().padStart(2, '0');
                const newM = (currentMin % 60).toString().padStart(2, '0');
                c.horario = `${newH}:${newM}`;
            }
            lastTimeMin = currentMin;
        });
    });

    return consultas;
};
