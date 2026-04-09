import fs from 'fs';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Conecta com o Supabase usando as chaves do seu .env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importarSigtap() {
    console.log('🚜 Ligando o trator... Lendo o arquivo sigtap.txt');

    // O 'latin1' ajuda a ler os acentos bagunçados do SUS
    const fileStream = fs.createReadStream('sigtap.txt', 'latin1');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lote = [];
    let count = 0;

    for await (const line of rl) {
        // A mágica do filtro: Só processa a linha se ela começar EXATAMENTE com 10 números
        if (/^\d{10}/.test(line)) {
            const codigo = line.substring(0, 10);

            // Pega o nome e corta os espaços em branco que sobram no final
            let nome = line.substring(10, 260).trim();

            // Arruma o bug clássico do SUS onde o Ó vira aspas
            nome = nome.replace(/”/g, 'Ó');

            lote.push({ codigo, nome });

            // Quando juntar 1000, envia pro Supabase (para não travar a internet)
            if (lote.length >= 1000) {
                const { error } = await supabase.from('sigtap').upsert(lote);
                if (error) console.error('Erro no lote:', error);

                count += lote.length;
                console.log(`✅ Já enviei ${count} procedimentos pro banco...`);
                lote = []; // Esvazia a caçamba do trator para o próximo lote
            }
        }
    }

    // Envia o restinho que sobrou (menos de 1000)
    if (lote.length > 0) {
        await supabase.from('sigtap').upsert(lote);
        count += lote.length;
    }

    console.log(`🏁 FIM! Um total de ${count} procedimentos foram importados com sucesso!`);
}

importarSigtap();