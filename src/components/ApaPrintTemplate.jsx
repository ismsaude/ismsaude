import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';

export default function ApaPrintTemplate({ data }) {
    const { currentUser } = useAuth();
    const { theme } = useWhiteLabel();
    if (!data) return null;

    const formatarDataRegistro = (campoData) => {
        if (!campoData) return new Date().toLocaleDateString('pt-BR');

        // Se for uma string ISO (ex: "2026-03-01T12:00:00Z") ou objeto Date
        if (campoData instanceof Date || !isNaN(new Date(campoData).getTime())) {
            // Evita formatar strings que já vêm como "01/03/2026"
            if (typeof campoData === 'string' && campoData.includes('/')) return campoData;
            return new Date(campoData).toLocaleDateString('pt-BR');
        }

        return campoData;
    };

    const parseJsonFallback = (val) => {
        if (Array.isArray(val)) return val;
        try { return JSON.parse(val); } catch { return []; }
    };
    
    const listaAlergias = parseJsonFallback(data?.alergias);
    const listaMedicamentos = parseJsonFallback(data?.medicamentos);

    const calcularIdadeLocal = (dataNasc) => {
        if (!dataNasc) return '--';
        try {
            let dateStr = dataNasc;
            if (dateStr.includes('/')) {
                const [d, m, y] = dateStr.split('/');
                if (d && m && y) dateStr = `${y}-${m}-${d}`;
            }
            const hoje = new Date(); const nasc = new Date(dateStr);
            if (isNaN(nasc.getTime())) return data?.idadeInfo || '--';
            let idade = hoje.getFullYear() - nasc.getFullYear();
            const m = hoje.getMonth() - nasc.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
            if (idade === 0) return `${m < 0 ? m + 12 : m} meses`;
            return `${idade} anos`;
        } catch { return '--'; }
    };

    const getImcStatus = (imc) => {
        if (!imc) return '';
        const v = parseFloat(imc);
        if (v < 18.5) return ' (Abaixo do peso)';
        if (v < 25) return ' (Normal)';
        if (v < 30) return ' (Sobrepeso)';
        if (v < 35) return ' (Obesidade I)';
        if (v < 40) return ' (Obesidade II)';
        return ' (Obesidade III)';
    };

    const imcLocal = data?.imc || (data?.peso && data?.altura ? (parseFloat(data?.peso.toString().replace(',', '.')) / Math.pow(parseFloat(data?.altura.toString().replace(',', '.')) / 100, 2)).toFixed(1) : null);
    const imcDisplay = imcLocal ? `${imcLocal}${getImcStatus(imcLocal)}` : '';

    const dataDocumento = formatarDataRegistro(data?.createdAt || data?.dataCriacao || data?.dataRegistro || data?.data);



    const Checkbox = ({ label, checked }) => (
        <label className="flex items-center gap-1 text-[8.5px] text-gray-800 font-medium">
            <div className={`w-3 h-3 border border-gray-400 flex flex-shrink-0 items-center justify-center rounded-[2px] ${checked ? 'bg-[#002776] border-[#002776]' : 'bg-white'}`}>
                {checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
            </div>
            <span>{label}</span>
        </label>
    );

    const sectionClass = "mb-1.5 border border-gray-400 rounded-[2px] p-1 print:break-inside-avoid w-full";
    const titleClass = "font-bold text-gray-800 bg-gray-200 px-1 py-0.5 mb-1 text-[9px] uppercase";
    const labelClass = "text-[7.5px] text-gray-500 uppercase font-semibold leading-none";
    const valueClass = "text-[9.5px] font-bold text-[#002776] uppercase leading-snug";

    const Field = ({ label, value, className = "" }) => (
        <div className={`flex flex-col ${className}`}>
            <span className={`${labelClass} mb-0.5`}>{label}</span>
            <div className={`border-b border-gray-300 pb-0.5 min-h-[14px] break-words whitespace-pre-wrap ${valueClass}`}>
                {value || '--'}
            </div>
        </div>
    );

    const SectionBlock = ({ title, children }) => (
        <div className={sectionClass}>
            <div className={titleClass}>
                {title}
            </div>
            {children}
        </div>
    );

    const comorbidadesList = [
        { k: 'has', l: 'Hipertensão Arterial' }, { k: 'dm', l: 'Diabetes Mellitus' },
        { k: 'cardio', l: 'Cardiopatia' }, { k: 'arritmia', l: 'Arritmia' },
        { k: 'icc', l: 'ICC' }, { k: 'iam', l: 'IAM prévio' },
        { k: 'asma', l: 'Asma' }, { k: 'dpoc', l: 'DPOC' },
        { k: 'pneumo', l: 'Outra Pneumopatia' }, { k: 'renal', l: 'Nefropatia' },
        { k: 'hepato', l: 'Hepatopatia' }, { k: 'tireo', l: 'Tireopatia' },
        { k: 'neuro', l: 'Doença Neurológica' }, { k: 'convulsao', l: 'Epilepsia/Convulsão' },
        { k: 'avc', l: 'AVC prévio' }, { k: 'coag', l: 'Coagulopatia' },
        { k: 'apneia', l: 'Apneia do Sono / SAOS' }, { k: 'refluxo', l: 'DRGE / Refluxo' },
        { k: 'obesidade', l: 'Obesidade Mórbida' }, { k: 'marcapasso', l: 'Marca-passo / CDI' },
        { k: 'gestante', l: 'Gestante' }, { k: 'hiv', l: 'HIV / Imunossupressão' },
        { k: 'neoplasia', l: 'Neoplasia' }, { k: 'psiq', l: 'Doença Psiquiátrica' }
    ];

    const formatDate = (dateStr) => {
        if (!dateStr) return '--';
        try {
            return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('pt-BR');
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="w-full bg-white text-black p-0 mx-auto font-sans leading-tight" id="apaContent">

            {/* HEADER */}
            <div className="flex justify-between items-end border-b-2 border-gray-800 pb-1.5 mb-2 print:break-inside-avoid">
                <div className="flex flex-col justify-end w-1/3">
                    {theme.logoUrl && <img src={theme.logoUrl} alt="Logo" className="h-[32px] w-[auto] object-contain object-left mb-1" onError={(e) => e.target.style.display = 'none'} />}
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mt-1">
                        {/* Linha 1: Título Inteligente + Nome */}
                        <div>
                            {data?.anestesistaNome ? (
                                (data?.anestesistaSexo === 'Masculino' || data?.anestesistaSexo === 'M') ? `DR. ${data.anestesistaNome}` :
                                    (data?.anestesistaSexo === 'Feminino' || data?.anestesistaSexo === 'F') ? `DRA. ${data.anestesistaNome}` :
                                        `DR(A). ${data.anestesistaNome}`
                            ) : ''}
                        </div>
                        {/* Linha 2: CRM quebrado para a linha de baixo */}
                        <div>
                            {data?.anestesistaCRM ? `CRM ${data.anestesistaCRM}` : ''}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center w-1/3 text-center">
                    <h1 className="text-[11px] font-black tracking-widest text-gray-900 m-0 leading-tight">AVALIAÇÃO PRÉ-ANESTÉSICA</h1>
                    <div className="text-[7.5px] text-gray-500 font-medium mt-0.5">Conforme Resolução CFM 2.174/2017</div>
                </div>
                <div className="flex flex-col items-end w-1/3 text-[8.5px] text-gray-700 font-medium mb-1">
                    <div className="text-[9.5px] font-bold text-gray-900">
                        {data?.id ? `APA-${String(data.id).substring(0, 6).toUpperCase()}` : ''}
                    </div>
                    <div>Data: <span className="font-bold">{dataDocumento}</span></div>
                </div>
            </div>

            {/* 1. IDENTIFICAÇÃO DO PACIENTE */}
            <SectionBlock title="1. Identificação do Paciente">
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                    <Field label="Nome Completo" value={data?.nome} className="col-span-2" />
                    <Field label="CPF" value={data?.cpf} />
                </div>
                <div className="grid grid-cols-6 gap-x-2 gap-y-1.5">
                    <Field label="Data de Nascimento" value={formatDate(data?.dataNasc)} />
                    <Field label="Idade" value={data?.idadeInfo || calcularIdadeLocal(data?.dataNasc)} />
                    <Field label="Sexo" value={data?.sexo} />
                    <Field label="Peso (kg)" value={data?.peso} />
                    <Field label="Altura (cm)" value={data?.altura} />
                    <Field label="IMC" value={imcDisplay} />
                </div>
            </SectionBlock>

            {/* 2. PROCEDIMENTO PROPOSTO */}
            <SectionBlock title="2. Procedimento Proposto">
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                    <Field label="Procedimento Cirúrgico" value={data?.procedimento} className="col-span-2" />
                    <Field label="Cirurgião / Dentista" value={data?.profissional} />
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                    <Field label="Data Prevista" value={formatDate(data?.dataProcedimento)} />
                    <Field label="Caráter" value={data?.carater} />
                    <Field label="Posição" value={data?.posicao} />
                </div>
            </SectionBlock>

            {/* 3. ANTECEDENTES PATOLÓGICOS / COMORBIDADES */}
            <SectionBlock title="3. Antecedentes Patológicos / Comorbidades">
                <div className="grid grid-cols-4 gap-x-1.5 gap-y-1.5 mb-1.5">
                    {comorbidadesList.map(item => {
                        const isMarcado = !!data?.[item.k] || (Array.isArray(data?.comorbidadesList) && data.comorbidadesList.includes(item.k));
                        return <Checkbox key={item.k} label={item.l} checked={isMarcado} />;
                    })}
                </div>
                <div className="w-full">
                    <Field label="Detalhes das Comorbidades" value={data?.detalhes_comorbidades} />
                </div>
            </SectionBlock>

            {/* 4. ALERGIAS */}
            <SectionBlock title="4. Alergias">
                <div className="mb-1">
                    <Checkbox label="Nega alergias declaradas" checked={!!data?.negaAlergia} />
                </div>
                {(!data?.negaAlergia && listaAlergias && listaAlergias.length > 0) && (
                    <table className="w-full text-left border-collapse mt-1">
                        <thead>
                            <tr className="border-b border-gray-300">
                                <th className="py-0.5 text-[7px] font-bold text-gray-500 uppercase">Substância</th>
                                <th className="py-0.5 text-[7px] font-bold text-gray-500 uppercase">Tipo de Reação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaAlergias.map((a, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                    <td className="py-0.5 text-[8.5px] text-[#002776] font-bold uppercase">{a?.substancia || '--'}</td>
                                    <td className="py-0.5 text-[8.5px] text-[#002776] font-bold uppercase">{a?.reacao || '--'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </SectionBlock>

            {/* 5. MEDICAMENTOS EM USO */}
            <SectionBlock title="5. Medicamentos em Uso">
                <div className="mb-1">
                    <Checkbox label="Nega uso de medicamentos contínuos" checked={!!data?.negaMed} />
                </div>
                {(!data?.negaMed && listaMedicamentos && listaMedicamentos.length > 0) && (
                    <table className="w-full text-left border-collapse mt-1">
                        <thead>
                            <tr className="border-b border-gray-300 bg-gray-50">
                                <th className="p-0.5 text-[7px] font-bold text-gray-500 uppercase">Medicamento</th>
                                <th className="p-0.5 text-[7px] font-bold text-gray-500 uppercase">Dose</th>
                                <th className="p-0.5 text-[7px] font-bold text-gray-500 uppercase">Frequência</th>
                                <th className="p-0.5 text-[7px] font-bold text-gray-500 uppercase">Conduta Periop.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaMedicamentos.map((m, i) => (
                                <tr key={i} className="border-b border-gray-200">
                                    <td className="p-0.5 text-[8.5px] text-[#002776] font-bold uppercase">{m?.nome || '--'}</td>
                                    <td className="p-0.5 text-[8.5px] text-[#002776] font-bold uppercase">{m?.dose || '--'}</td>
                                    <td className="p-0.5 text-[8.5px] text-[#002776] font-bold uppercase">{m?.frequencia || '--'}</td>
                                    <td className="p-0.5 text-[8.5px] text-[#002776] font-bold uppercase">{m?.conduta || '--'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </SectionBlock>

            {/* 6. ANTECEDENTES CIRÚRGICOS / ANESTÉSICOS */}
            <SectionBlock title="6. Antecedentes Cirúrgicos / Anestésicos">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <Field label="Cirurgias Prévias" value={data?.cirurgias} />
                    <Field label="Anestesias Prévias / Complicações" value={data?.anestesias_previas} />
                </div>
            </SectionBlock>

            {/* 7. HÁBITOS */}
            <SectionBlock title="7. Hábitos">
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                    <Field label="Tabagismo" value={data?.tabagismo} />
                    <Field label="Carga Tabágica" value={data?.carga_tabagica} />
                    <Field label="Parou há" value={data?.parou_fumo} />
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                    <Field label="Etilismo" value={data?.etilismo} />
                    <Field label="Drogas Ilícitas" value={data?.drogas} />
                    <Field label="Capacidade Funcional (METS)" value={data?.mets} />
                </div>
            </SectionBlock>

            {/* 8. EXAME FÍSICO */}
            <SectionBlock title="8. Exame Físico">
                <div className="grid grid-cols-5 gap-x-2 gap-y-1.5 mb-1.5">
                    <Field label="PA (mmHg)" value={data?.pa} />
                    <Field label="FC (bpm)" value={data?.fc} />
                    <Field label="SpO2 (%)" value={data?.spo2} />
                    <Field label="FR (irpm)" value={data?.fr} />
                    <Field label="Temp (C)" value={data?.temp} />
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                    <Field label="ACV" value={data?.acv} />
                    <Field label="AR" value={data?.ar} />
                    <Field label="Abdome" value={data?.abdome} />
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <Field label="Dorso / Coluna" value={data?.dorso} />
                    <Field label="Outros Achados" value={data?.ef_outros} />
                </div>
            </SectionBlock>

            {/* 9. AVALIAÇÃO DE VIA AÉREA */}
            <SectionBlock title="9. Avaliação de Via Aérea">
                <div className="mb-1.5">
                    <span className={`${labelClass} block mb-1`}>Classificação de Mallampati</span>
                    <div className="grid grid-cols-4 gap-1">
                        {['I', 'II', 'III', 'IV'].map((grade) => {
                            const desc = grade === 'I' ? 'Palato mole, fauces, úvula, pilares' :
                                grade === 'II' ? 'Palato mole, fauces e úvula' :
                                    grade === 'III' ? 'Palato mole e base da úvula' : 'Apenas palato duro visível';
                            const isSelected = data?.mallampati === grade;
                            return (
                                <div key={grade} className={`border rounded-[2px] p-1 flex flex-col items-center justify-center text-center ${isSelected ? 'border-[#002776] bg-blue-50' : 'border-gray-200 opacity-50'}`}>
                                    <div className={`text-[10px] font-black ${isSelected ? 'text-[#002776]' : 'text-gray-400'}`}>{grade}</div>
                                    <div className={`text-[6px] leading-tight mt-0.5 ${isSelected ? 'text-[#002776] font-bold' : 'text-gray-400'}`}>{desc}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-x-1.5 gap-y-1.5 mb-1.5">
                    <Field label="Abertura Bucal" value={data?.va_abertura} />
                    <Field label="Dist. Tireomentual" value={data?.va_dtm} />
                    <Field label="Dist. Esternomento" value={data?.va_dem} />
                    <Field label="Prótese Dentária" value={data?.va_protese} />
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                    <Field label="Mobilidade Cervical" value={data?.va_cervical} />
                    <Field label="Via Aérea Difícil" value={data?.va_dificil} />
                    <Field label="Obs. Via Aérea" value={data?.va_obs} />
                </div>
            </SectionBlock>

            {/* 10. ESTADO FÍSICO */}
            <SectionBlock title="10. Estado Físico - Classificação ASA">
                <div className="grid grid-cols-1 gap-x-2 gap-y-1.5">
                    <Field label="ASA" value={data?.asa} />
                </div>
            </SectionBlock>

            {/* 11. EXAMES COMPLEMENTARES */}
            <SectionBlock title="11. Exames Complementares">
                <div className="grid grid-cols-4 gap-x-2 gap-y-1 mb-1">
                    <Field label="Hb" value={data?.ex_hb} />
                    <Field label="Ht" value={data?.ex_ht} />
                    <Field label="Plaquetas" value={data?.ex_plaq} />
                    <Field label="Leucócitos" value={data?.ex_leuco} />
                </div>
                <div className="grid grid-cols-4 gap-x-2 gap-y-1 mb-1">
                    <Field label="TAP/INR" value={data?.ex_inr} />
                    <Field label="TTPa" value={data?.ex_ttpa} />
                    <Field label="Glicemia" value={data?.ex_glic} />
                    <Field label="HbA1c" value={data?.ex_hba1c} />
                </div>
                <div className="grid grid-cols-4 gap-x-2 gap-y-1 mb-1.5">
                    <Field label="Ureia" value={data?.ex_ureia} />
                    <Field label="Creatinina" value={data?.ex_creat} />
                    <Field label="Na+" value={data?.ex_na} />
                    <Field label="K+" value={data?.ex_k} />
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                    <Field label="ECG" value={data?.ex_ecg} />
                    <Field label="RX Tórax" value={data?.ex_rx} />
                    <Field label="Outros Exames" value={data?.ex_outros} />
                </div>
                <Field label="Observações sobre Exames" value={data?.ex_obs} />
            </SectionBlock>

            {/* 12. JEJUM */}
            <SectionBlock title="12. Jejum Pré-Operatório">
                <table className="w-full text-left border border-gray-300 mb-1.5 text-[8px]">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-1 border border-gray-300 font-bold text-gray-700 uppercase">Tipo de Ingesta</th>
                            <th className="p-1 border border-gray-300 font-bold text-gray-700 uppercase">Tempo de Jejum Mínimo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td className="p-1 border border-gray-300">Líquidos Claros (Água, Chá)</td><td className="p-1 border border-gray-300 text-center font-bold">2 horas</td></tr>
                        <tr><td className="p-1 border border-gray-300">Leite Materno</td><td className="p-1 border border-gray-300 text-center font-bold">4 horas</td></tr>
                        <tr><td className="p-1 border border-gray-300">Fórmula Láctea / Leite não humano / Refeição leve</td><td className="p-1 border border-gray-300 text-center font-bold">6 horas</td></tr>
                        <tr><td className="p-1 border border-gray-300">Refeição completa (com gordura/carne)</td><td className="p-1 border border-gray-300 text-center font-bold">8 horas</td></tr>
                    </tbody>
                </table>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <Field label="Orientação Específica de Jejum" value={data?.jejum_orientacao} />
                    <Field label="Profilaxia de Aspiração" value={data?.profilaxia_asp} />
                </div>
            </SectionBlock>

            {/* 13. PLANO ANESTÉSICO */}
            <SectionBlock title="13. Plano Anestésico">
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mb-1.5">
                    <Field label="Técnica" value={data?.plan_tecnica} />
                    <Field label="Hemoderivados" value={data?.plan_hemoderivados} />
                    <Field label="Destino Pós-Op" value={data?.plan_destino} />
                </div>
                <Field label="Observações do Plano" value={data?.plan_obs} />
            </SectionBlock>

            {/* 15. PARECER */}
            <SectionBlock title="15. Parecer Anestésico">
                <div className="flex gap-2 mb-1.5">
                    {[
                        { val: 'Apto', label: 'APTO', colors: 'border-green-500 bg-green-50 text-green-800' },
                        { val: 'Restricao', altVal: 'Apto com restrições', label: 'APTO C/ RESTRIÇÕES', colors: 'border-amber-500 bg-amber-50 text-amber-800' },
                        { val: 'Inapto', label: 'INAPTO', colors: 'border-red-500 bg-red-50 text-red-800' }
                    ].map((opt) => {
                        const isSelected = data?.parecerFinal === opt.val || data?.parecerFinal === opt.altVal;
                        return (
                            <div key={opt.label} className={`flex items-center gap-1 px-2 py-1 border rounded-[2px] text-[8px] font-bold ${isSelected ? opt.colors : 'border-gray-200 text-gray-400 opacity-50'}`}>
                                <div className={`w-2 h-2 rounded-full border flex items-center justify-center ${isSelected ? 'border-current' : 'border-gray-300'}`}>
                                    {isSelected && <div className="w-1 h-1 rounded-full bg-current"></div>}
                                </div>
                                {opt.label}
                            </div>
                        );
                    })}
                </div>
                <Field label="Justificativa / Recomendações" value={data?.parecer_obs} />
            </SectionBlock>

            {/* 16. ASSINATURAS */}
            <div className={sectionClass}>
                <div className={titleClass}>16. Assinaturas</div>
                <div className="grid grid-cols-2 gap-12 px-8 mt-2 pb-2">

                    {/* Médico (Esquerda) */}
                    <div className="text-center">
                        <div className="h-10 flex items-end justify-center pb-1">
                            <span className="text-[#002776] text-[16px] leading-none tracking-wide" style={{ fontFamily: "'Lucida Handwriting', 'Brush Script MT', 'Segoe Script', cursive", fontStyle: 'italic' }}>
                                {data?.anestesistaNome || ''}
                            </span>
                        </div>
                        <div className="border-t border-black w-full mb-1"></div>
                        <p className="font-bold text-[9px] uppercase text-[#002776]">
                            {/* Título Inteligente + Nome também na assinatura */}
                            {data?.anestesistaNome ? (
                                (data?.anestesistaSexo === 'Masculino' || data?.anestesistaSexo === 'M') ? `DR. ${data.anestesistaNome}` :
                                    (data?.anestesistaSexo === 'Feminino' || data?.anestesistaSexo === 'F') ? `DRA. ${data.anestesistaNome}` :
                                        `DR(A). ${data.anestesistaNome}`
                            ) : 'MÉDICO ANESTESIOLOGISTA'}
                        </p>
                        <p className="text-[7.5px] text-gray-500 uppercase">
                            {data?.anestesistaCRM ? `CRM ${data.anestesistaCRM}` : 'CRM --'}
                            {data?.anestesistaRQE ? ` | RQE ${data.anestesistaRQE}` : ' | RQE ANESTESIOLOGIA'}
                        </p>
                        <p className="text-[7.5px] text-gray-500 uppercase">MÉDICO ANESTESIOLOGISTA</p>
                        <p className="text-[7.5px] text-green-600 font-bold mt-1">✓ ASSINADO ELETRONICAMENTE</p>
                    </div>

                    {/* Paciente (Direita) */}
                    <div className="text-center">
                        {/* Bloco invisível da mesma altura para nivelar as linhas pretas */}
                        <div className="h-10"></div>
                        <div className="border-t border-black w-full mb-1"></div>
                        <p className="font-bold text-[9px] uppercase text-[#002776]">{data?.nome || 'Paciente'}</p>
                        <p className="text-[7.5px] text-gray-500 uppercase">ASSINATURA DO PACIENTE OU RESPONSÁVEL LEGAL</p>
                        <p className="text-[7.5px] text-gray-500 uppercase mt-1">DATA: {dataDocumento}</p>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-2 pt-1 border-t border-gray-300 text-[6px] text-gray-500 text-center leading-relaxed print:break-inside-avoid">
                Documento gerado eletronicamente em conformidade com a Resolução CFM 2.174/2017 e CFM 2.314/2022<br />
                Este documento é confidencial e protegido pela LGPD (Lei 13.709/2018). Uso exclusivo para fins médicos.
            </div>

        </div>
    );
}