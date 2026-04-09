import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Garante que as fontes virtuais sejam carregadas
if (pdfFonts && pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

const getHeader = (titulo) => {
    return {
        columns: [
            {
                text: 'HOSPITAL MUNICIPAL / SANTA CASA',
                style: 'headerTitle'
            },
            {
                text: titulo,
                style: 'headerDocument',
                alignment: 'right'
            }
        ],
        margin: [0, 0, 0, 20]
    };
};

const getFooter = (medico) => {
    return {
        columns: [
            {
                text: '___________________________________________________\nAssinatura e Carimbo do Médico',
                alignment: 'center',
                margin: [0, 50, 0, 0]
            }
        ],
        margin: [0, 20, 0, 0]
    };
};

export const imprimirReceitaPdf = (paciente, texto, medico) => {
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        content: [
            getHeader('RECEITUÁRIO MÉDICO'),
            {
                text: [
                    { text: 'Paciente: ', bold: true },
                    paciente.paciente_nome,
                    '\n',
                    { text: 'Data de Emissão: ', bold: true },
                    new Date().toLocaleDateString('pt-BR')
                ],
                margin: [0, 0, 0, 30]
            },
            {
                text: 'USO INTERNO / EXTERNO',
                style: 'subheader',
                alignment: 'center',
                margin: [0, 0, 0, 20]
            },
            {
                text: texto,
                fontSize: 12,
                lineHeight: 1.5,
                margin: [0, 0, 0, 40]
            },
            getFooter(medico)
        ],
        styles: {
            headerTitle: { fontSize: 16, bold: true, color: '#1e3a8a' },
            headerDocument: { fontSize: 14, bold: true, color: '#64748b' },
            subheader: { fontSize: 12, bold: true }
        }
    };
    pdfMake.createPdf(docDefinition).open();
};

export const imprimirExamePdf = (paciente, texto, medico) => {
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        content: [
            getHeader('SOLICITAÇÃO DE EXAMES'),
            {
                text: [
                    { text: 'Paciente: ', bold: true },
                    paciente.paciente_nome,
                    '\n',
                    { text: 'Data da Solicitação: ', bold: true },
                    new Date().toLocaleDateString('pt-BR')
                ],
                margin: [0, 0, 0, 30]
            },
            {
                text: 'Solicito o(s) seguinte(s) exame(s):',
                bold: true,
                margin: [0, 0, 0, 20]
            },
            {
                text: texto,
                fontSize: 12,
                lineHeight: 1.5,
                margin: [0, 0, 0, 40]
            },
            getFooter(medico)
        ],
        styles: {
            headerTitle: { fontSize: 16, bold: true, color: '#1e3a8a' },
            headerDocument: { fontSize: 14, bold: true, color: '#64748b' }
        }
    };
    pdfMake.createPdf(docDefinition).open();
};
