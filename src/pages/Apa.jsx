import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { usePermission } from '../contexts/PermissionContext';
import { useAuth } from '../contexts/AuthContext';
import { useUnit } from '../contexts/UnitContext';
import ApaPrintTemplate from '../components/ApaPrintTemplate';
import { supabase } from '../services/supabase';
import { logAction } from '../utils/logger';
import { Search, Printer, Save, Activity, Plus, ArrowLeft, Loader2, ZoomIn, ZoomOut, Eye, Trash2, ChevronRight, ChevronDown, User, Stethoscope, FileText, ActivitySquare, CheckSquare, AlertTriangle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { maskCPF, maskTelefone } from '../utils/masks';
import UnitPrompt from '../components/UnitPrompt';
import { SigtapAutocomplete } from '../components/SigtapAutocomplete';

const InlineCalendar = ({ value, onChange, disabled }) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            return new Date(y, m - 1, d);
        }
        return new Date();
    });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const allWeeks = [];
    while (days.length > 0) {
        allWeeks.push(days.splice(0, 7));
    }

    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));

    const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

    return (
        <div className={`border border-slate-200 rounded-lg p-2 bg-white flex flex-col ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center mb-2">
                <button type="button" onClick={prevMonth} className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded">&lt;</button>
                <span className="text-[10px] font-bold uppercase text-slate-700">{monthNames[month]} {year}</span>
                <button type="button" onClick={nextMonth} className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-400 mb-1">
                <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {allWeeks.map((week, wi) => (
                    <React.Fragment key={wi}>
                        {week.map((d, di) => {
                            if (!d) return <div key={`empty-${wi}-${di}`}></div>;
                            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const isSelected = value === dStr;
                            let isToday = false;
                            try { isToday = new Date().toISOString().split('T')[0] === dStr; } catch(e){}
                            return (
                                <div 
                                    key={d} 
                                    onClick={() => onChange(dStr)}
                                    className={`py-1 text-[11px] font-bold rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : isToday ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
                                >
                                    {d}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default function Apa({ paciente }) {
    const location = useLocation();
    const { hasPermission } = usePermission();
    const { currentUser: user } = useAuth();
    const { unidadeAtual } = useUnit();

    const getDraft = () => {
        if (location.state?.apaId) return null;
        try {
            const stored = sessionStorage.getItem('apa_draft_state');
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    };
    const draftState = getDraft();

    const [settings, setSettings] = useState({});

    const [apaIdParaCarregar, setApaIdParaCarregar] = useState(location.state?.apaId || null);
    const [isReadOnly, setIsReadOnly] = useState(Boolean(location.state?.apaId));
    
    const [modoVisao, setModoVisao] = useState(draftState?.modoVisao || 'lista');
    const [activeTab, setActiveTab] = useState(draftState?.activeTab || 'dados');
    const [searchTerm, setSearchTerm] = useState(draftState?.searchTerm || '');
    
    const [apaParaImprimir, setApaParaImprimir] = useState(null);
    const [listaApas, setListaApas] = useState([]);
    const [loadingApas, setLoadingApas] = useState(true);
    const [searchApa, setSearchApa] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [filterDataInicio, setFilterDataInicio] = useState('');
    const [filterDataFim, setFilterDataFim] = useState('');
    const [filterProcedimento, setFilterProcedimento] = useState('Todos');

    const [pacientes, setPacientes] = useState([]);
    const [showPacientes, setShowPacientes] = useState(false);

    const defaultFormData = {
        nome: '', cpf: '', dataNasc: '', sexo: '', peso: '', altura: '', telefone: '',
        procedimento: '', profissional: '', dataProcedimento: '', carater: 'Eletivo', porte: '', posicao: '',
        has: false, dm: false, cardio: false, arritmia: false, icc: false, iam: false, asma: false, dpoc: false,
        pneumo: false, renal: false, hepato: false, tireo: false, neuro: false, convulsao: false, avc: false,
        coag: false, apneia: false, refluxo: false, obesidade: false, marcapasso: false, gestante: false,
        hiv: false, neoplasia: false, psiq: false, detalhes_comorbidades: '',
        cirurgias: '', anestesias_previas: '', hist_fam: '', hm: '',
        tabagismo: 'Não', carga_tabagica: '', parou_fumo: '', etilismo: 'Não', drogas: 'Nega', mets: '',
        pa: '', fc: '', spo2: '', fr: '', temp: '', acv: '', ar: '', abdome: '', dorso: '', ef_outros: '',
        va_abertura: '', va_dtm: '', va_dem: '', va_cervical: '', va_protese: 'Não', va_cormack: '', va_dificil: '', va_obs: '',
        asa: '',
        ex_hb: '', ex_ht: '', ex_plaq: '', ex_leuco: '', ex_inr: '', ex_ttpa: '', ex_glic: '', ex_hba1c: '',
        ex_ureia: '', ex_creat: '', ex_na: '', ex_k: '', ex_coagulo: '', ex_eco: '', ex_hepato: '', ex_outros_esp: '', ex_ecg: '', ex_rx: '', ex_outros: '', ex_obs: '',
        jejum_orientacao: '', profilaxia_asp: 'Não indicada',
        plan_tecnica: '', plan_via_aerea: '', plan_monitor: 'Básica (ECG, SpO2, PANI, Capno)', plan_acesso: 'Periférico 1 via',
        plan_hemoderivados: 'Não', plan_destino: '', plan_obs: '',
        mpa_ansio: 'Não prescrito', mpa_nvpo: 'Não indicada', mpa_atb: 'Não indicada', mpa_outras: '',
        parecer_obs: ''
    };

    const [formData, setFormData] = useState(draftState?.formData ? { ...defaultFormData, ...draftState.formData } : defaultFormData);

    const [negaAlergia, setNegaAlergia] = useState(draftState?.negaAlergia ?? false);
    const [alergias, setAlergias] = useState(draftState?.alergias || [{ substancia: '', reacao: '' }]);
    const [negaMed, setNegaMed] = useState(draftState?.negaMed ?? false);
    const [medicamentos, setMedicamentos] = useState(draftState?.medicamentos || [{ nome: '', dose: '', frequencia: '', conduta: '' }]);
    const [mallampati, setMallampati] = useState(draftState?.mallampati || '');
    const [parecer, setParecer] = useState(draftState?.parecer || '');

    // 2. Salva o rascunho continuamente a cada alteração
    useEffect(() => {
        if (isReadOnly && apaIdParaCarregar) return; // Não salvar rascunho se for apenas leitura
        const stateToSave = {
            formData, activeTab, modoVisao, alergias, negaAlergia,
            medicamentos, negaMed, mallampati, parecer, searchTerm
        };
        sessionStorage.setItem('apa_draft_state', JSON.stringify(stateToSave));
    }, [formData, activeTab, modoVisao, alergias, negaAlergia, medicamentos, negaMed, mallampati, parecer, searchTerm, isReadOnly, apaIdParaCarregar]);

    useEffect(() => {
        const loadPacientes = async () => {
            try {
                const { data, error } = await supabase.from('pacientes').select('*');
                if (error) throw error;
                setPacientes(data || []);
            } catch (error) { console.error(error); }
        };
        const loadSettings = async () => {
             const { data } = await supabase.from('settings').select('data').eq('id', 'general').maybeSingle();
             if (data && data.data) {
                 setSettings(data.data);
             }
        };
        loadPacientes();
        loadSettings();
    }, []);

    useEffect(() => {
        const loadApa = async () => {
            if (apaIdParaCarregar) {
                try {
                    const { data, error } = await supabase.from('apas').select('*').eq('id', apaIdParaCarregar).maybeSingle();
                    if (data && !error) {
                        const fData = { ...formData, ...data, id: undefined, dataRegistro: undefined, dataAtualizacao: undefined };
                        
                        // Replace null with empty string to avoid React uncontrolled input warnings
                        Object.keys(fData).forEach(key => {
                            if (fData[key] === null) fData[key] = '';
                        });

                        delete fData.alergias; delete fData.medicamentos; delete fData.negaAlergia; delete fData.negaMed; delete fData.mallampati; delete fData.parecerFinal;

                        // Parse comorbidades backwards
                        if (data.comorbidadesList && Array.isArray(data.comorbidadesList)) {
                            data.comorbidadesList.forEach(k => { fData[k] = true; });
                        }

                        setFormData(prev => ({ ...prev, ...fData }));

                        let loadedAlergias = [];
                        try { loadedAlergias = typeof data.alergias === 'string' ? JSON.parse(data.alergias) : data.alergias; } catch(e) {}
                        
                        let loadedMedicamentos = [];
                        try { loadedMedicamentos = typeof data.medicamentos === 'string' ? JSON.parse(data.medicamentos) : data.medicamentos; } catch(e) {}

                        if (data.negaAlergia !== undefined) setNegaAlergia(data.negaAlergia);
                        if (loadedAlergias && loadedAlergias.length > 0) setAlergias(loadedAlergias);

                        if (data.negaMed !== undefined) setNegaMed(data.negaMed);
                        if (loadedMedicamentos && loadedMedicamentos.length > 0) setMedicamentos(loadedMedicamentos);

                        if (data.mallampati) setMallampati(data.mallampati);
                        if (data.parecerFinal) setParecer(data.parecerFinal);

                        setSearchTerm(data.nome || '');
                        setIsReadOnly(true);
                        setModoVisao('formulario');
                    }
                } catch (error) { toast.error("Erro ao carregar APA."); }
            }
        };
        loadApa();
    }, [apaIdParaCarregar]);

    // PREENCHIMENTO AUTOMÁTICO VIA PROP (Quando aberto do PEP)
    useEffect(() => {
        if (paciente) {
            setFormData(prev => ({
                ...prev,
                nome: paciente.paciente_nome || paciente.nome,
                cpf: paciente.paciente_cpf || paciente.cpf || '',
                dataNasc: paciente.dataNascimento || paciente.nascimento || '',
                sexo: paciente.sexo ? (paciente.sexo.toUpperCase().startsWith('M') ? 'Masculino' : paciente.sexo.toUpperCase().startsWith('F') ? 'Feminino' : '') : '',
                telefone: paciente.telefone || paciente.telefone1 || '',
                peso: paciente.peso || '',
                altura: paciente.altura || ''
            }));
            setSearchTerm(paciente.paciente_nome || paciente.nome);
            setModoVisao('formulario');
        }
    }, [paciente]);

    const loadApasList = async () => {
        if (!unidadeAtual) {
            setListaApas([]);
            setLoadingApas(false);
            return;
        }
        setLoadingApas(true);
        try {
            const { data, error } = await supabase
                .from('apas')
                .select('id, nome, cpf, dataRegistro, procedimento, parecerFinal, unidade')
                .or(`unidade.eq.${unidadeAtual},unidade.is.null`)
                .order('createdAt', { ascending: false })
                .limit(6000);

            if (error) {
                if (error.code === '42703' || error.message?.includes('does not exist')) {
                    toast.error("Por favor, crie a coluna 'unidade' na tabela apas!");
                    const fallback = await supabase.from('apas').select('id, nome, cpf, dataRegistro, procedimento, parecerFinal, unidade').order('createdAt', { ascending: false }).limit(6000);
                    setListaApas(fallback.data || []);
                } else {
                    throw error;
                }
            } else {
                setListaApas(data || []);
            }
        } catch (error) {
            console.warn('Aviso: Erro ao carregar apas. Retornando vazio.', error);
            setListaApas([]);
        } finally {
            setLoadingApas(false);
        }
    };

    useEffect(() => {
        if (modoVisao === 'lista') {
            loadApasList();
        }
    }, [modoVisao, unidadeAtual]);

    const handleNovaApa = () => {
        setFormData({
            nome: '', cpf: '', dataNasc: '', sexo: '', peso: '', altura: '', telefone: '',
            procedimento: '', profissional: '', dataProcedimento: '', carater: 'Eletivo', porte: '', posicao: '',
            has: false, dm: false, cardio: false, arritmia: false, icc: false, iam: false, asma: false, dpoc: false,
            pneumo: false, renal: false, hepato: false, tireo: false, neuro: false, convulsao: false, avc: false,
            coag: false, apneia: false, refluxo: false, obesidade: false, marcapasso: false, gestante: false,
            hiv: false, neoplasia: false, psiq: false, detalhes_comorbidades: '',
            cirurgias: '', anestesias_previas: '', hist_fam: '', hm: '',
            tabagismo: 'Não', carga_tabagica: '', parou_fumo: '', etilismo: 'Não', drogas: 'Nega', mets: '',
            pa: '', fc: '', spo2: '', fr: '', temp: '', acv: '', ar: '', abdome: '', dorso: '', ef_outros: '',
            va_abertura: '', va_dtm: '', va_dem: '', va_cervical: '', va_protese: 'Não', va_cormack: '', va_dificil: '', va_obs: '',
            asa: '', asa_e: false,
            ex_hb: '', ex_ht: '', ex_plaq: '', ex_leuco: '', ex_inr: '', ex_ttpa: '', ex_glic: '', ex_hba1c: '',
            ex_ureia: '', ex_creat: '', ex_na: '', ex_k: '', ex_coagulo: '', ex_eco: '', ex_hepato: '', ex_outros_esp: '', ex_ecg: '', ex_rx: '', ex_outros: '', ex_obs: '',
            jejum_orientacao: '', profilaxia_asp: 'Não indicada',
            plan_tecnica: '', plan_via_aerea: '', plan_monitor: 'Básica (ECG, SpO2, PANI, Capno)', plan_acesso: 'Periférico 1 via',
            plan_hemoderivados: 'Não', plan_destino: '', plan_obs: '',
            mpa_ansio: 'Não prescrito', mpa_nvpo: 'Não indicada', mpa_atb: 'Não indicada', mpa_outras: '',
            parecer_obs: ''
        });
        setNegaAlergia(false); setAlergias([{ substancia: '', reacao: '' }]);
        setNegaMed(false); setMedicamentos([{ nome: '', dose: '', frequencia: '', conduta: '' }]);
        setMallampati(''); setParecer(''); setSearchTerm(''); setApaIdParaCarregar(null); setIsReadOnly(false);
        setModoVisao('formulario'); setActiveTab('dados');
    };

    const handleVisualizarPdf = (apa) => {
        setApaParaImprimir(apa);

        setTimeout(() => {
            // 1. Guarda o título original do site
            const tituloOriginal = document.title;

            // 2. Monta o nome do arquivo limpo (substitui barras por traços na data para não dar erro no Windows)
            const nomePct = apa?.nome || 'Paciente';
            const dataDoc = (apa?.dataCriacao || new Date().toLocaleDateString('pt-BR')).replace(/\//g, '-');

            // 3. Altera o título da aba (o Chrome usará isso como nome do PDF)
            document.title = `APA - ${nomePct} - ${dataDoc}`;

            // 4. Abre a tela de impressão
            window.print();

            // 5. Restaura o título e limpa a tela SOMENTE APÓS a impressão
            // No iOS/Safari mobile, window.print() não trava a thread!
            // Se limparmos imediatamente, ele gera um PDF em branco.
            let limpou = false;
            const limpar = () => {
                if (limpou) return;
                limpou = true;
                document.title = tituloOriginal;
                setApaParaImprimir(null);
                window.removeEventListener('afterprint', limpar);
                window.removeEventListener('focus', limpar);
            };

            window.addEventListener('afterprint', limpar);
            window.addEventListener('focus', limpar); // fallback para iOS que as vezes usa focus
            
            // Fallback total se os eventos falharem
            setTimeout(limpar, 60000);

        }, 800); // Aumentei o delay para 800ms para garantir renderização do Portal no celular
    };

    const handleVerPreviewPdf = (apa) => {
        setApaParaImprimir(apa);
        setModoVisao('preview');
    };

    const handleDuplicarApa = (apa) => {
        const fData = { ...defaultFormData, ...apa, id: undefined, dataRegistro: undefined, dataAtualizacao: undefined };
        Object.keys(fData).forEach(key => { if (fData[key] === null) fData[key] = ''; });
        
        fData.dataProcedimento = new Date().toISOString().split('T')[0];
        delete fData.alergias; delete fData.medicamentos; delete fData.negaAlergia; delete fData.negaMed; delete fData.mallampati; delete fData.parecerFinal;
        if (apa.comorbidadesList && Array.isArray(apa.comorbidadesList)) { apa.comorbidadesList.forEach(k => { fData[k] = true; }); }
        setFormData(prev => ({ ...prev, ...fData }));
        let loadedAlergias = []; try { loadedAlergias = typeof apa.alergias === 'string' ? JSON.parse(apa.alergias) : apa.alergias; } catch(e) {}
        let loadedMedicamentos = []; try { loadedMedicamentos = typeof apa.medicamentos === 'string' ? JSON.parse(apa.medicamentos) : apa.medicamentos; } catch(e) {}
        setNegaAlergia(apa.negaAlergia !== undefined ? apa.negaAlergia : false);
        setAlergias((loadedAlergias && loadedAlergias.length > 0) ? loadedAlergias : [{ substancia: '', reacao: '' }]);
        setNegaMed(apa.negaMed !== undefined ? apa.negaMed : false);
        setMedicamentos((loadedMedicamentos && loadedMedicamentos.length > 0) ? loadedMedicamentos : [{ nome: '', dose: '', frequencia: '', conduta: '' }]);
        setMallampati(apa.mallampati || '');
        setParecer(apa.parecerFinal || '');
        setSearchTerm(apa.nome || '');
        setApaIdParaCarregar(null);
        setIsReadOnly(false);
        setModoVisao('formulario');
        setActiveTab('dados');
        toast.success("APA Duplicada! Ajuste o que for necessário e clique em Salvar.", { duration: 4500 });
    };

    const handleExcluirApa = async (id) => {
        if (window.confirm('Excluir esta avaliação?')) {
            try {
                const { error } = await supabase.from('apas').delete().eq('id', id);
                if (error) throw error;
                toast.success('Excluída!');
                loadApasList();
            }
            catch (error) { toast.error("Erro ao excluir."); }
        }
    };

    const handleSalvarApa = async () => {
        if (!unidadeAtual) return toast.error("Ação Bloqueada: Selecione o Local de Atendimento antes de salvar.");
        if (!formData.nome) return toast.error("Selecione um paciente antes de salvar.");
        if (!formData.dataNasc) return toast.error("A Data de Nascimento é obrigatória.");
        if (!formData.sexo) return toast.error("O Sexo é obrigatório.");
        if (!formData.peso) return toast.error("O Peso é obrigatório.");
        if (!formData.altura) return toast.error("A Altura é obrigatória.");
        if (!formData.procedimento) return toast.error("O Procedimento Cirúrgico é obrigatório.");
        if (!formData.carater) return toast.error("O Caráter é obrigatório.");

        // Validação de Alergias
        if (!negaAlergia && alergias.filter(a => a.substancia && a.substancia.trim() !== '').length === 0) {
            return toast.error("Obrigatório: Marque 'Nega alergias' ou descreva as substâncias.");
        }

        // Validação de Medicamentos (Conduta)
        const medsPreenchidos = medicamentos.filter(m => m.nome && m.nome.trim() !== '');
        if (medsPreenchidos.some(m => !m.conduta || m.conduta.trim() === '')) {
            return toast.error("Obrigatório: Defina a Conduta (Manter ou Suspender) para cada medicamento inserido em uso.");
        }

        // Validação de Novos Campos Obrigatórios
        if (!mallampati) return toast.error("Obrigatório: Preencha a Avaliação da Via Aérea (Mallampati).");
        if (!formData.va_dificil) return toast.error("Obrigatório: Informe se há previsão de Via Aérea Difícil.");
        if (!formData.plan_tecnica) return toast.error("Obrigatório: Selecione a Técnica Anestésica Prevista.");
        if (!formData.plan_destino) return toast.error("Obrigatório: Informe o Destino Pós-Op Previsto.");
        if (!parecer) return toast.error("Obrigatório: Assinale o Parecer Anestésico final (Apto/Restrição/Inapto).");

        // 1. DADOS DE SEGURANÇA BÁSICOS (Login Auth)
        let nomeMedico = user?.nome || user?.displayName || user?.name || '';
        let crmMedico = user?.crm || '';
        let rqeMedico = user?.rqe || '';
        let sexoMedico = user?.sexo || ''; // <-- NOVO: Preparando a variável
        let idMedico = user?.uid || user?.id || '';

        // 2. BUSCA FORÇADA NO BANCO DE DADOS
        if (idMedico) {
            try {
                const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', idMedico).maybeSingle();
                if (userData) {
                    nomeMedico = userData.nome || userData.name || nomeMedico;
                    crmMedico = userData.crm || crmMedico;
                    rqeMedico = userData.rqe || rqeMedico;
                    sexoMedico = userData.sexo || sexoMedico; // <-- NOVO: Puxando do banco
                }
            } catch (error) {
                console.error("Erro ao buscar dados reais do médico no banco:", error);
            }
        }

        // 3. MONTA A APA COM OS DADOS REAIS CARIMBADOS E EMPACOTADOS
        const keysComorb = ['has', 'dm', 'cardio', 'arritmia', 'icc', 'iam', 'asma', 'dpoc', 'pneumo', 'renal', 'hepato', 'tireo', 'neuro', 'convulsao', 'avc', 'coag', 'apneia', 'refluxo', 'obesidade', 'marcapasso', 'gestante', 'hiv', 'neoplasia', 'psiq'];
        const comorbidadesListPayload = keysComorb.filter(k => formData[k]);

        let apaCompleta = {
            ...formData,
            idadeInfo: calcularIdade(formData.dataNasc),
            imc: imcData?.valor || '',
            comorbidadesList: comorbidadesListPayload,
            mallampati, parecerFinal: parecer,
            negaAlergia, 
            alergias: negaAlergia ? JSON.stringify([]) : JSON.stringify(alergias),
            negaMed, 
            medicamentos: negaMed ? JSON.stringify([]) : JSON.stringify(medicamentos),
            anestesistaNome: nomeMedico,
            anestesistaCRM: crmMedico,
            anestesistaRQE: rqeMedico,
            anestesistaSexo: sexoMedico, // <-- NOVO: Salvando na APA
            anestesistaId: idMedico,
            unidade: unidadeAtual // <-- NOVO: Salva a unidade em que foi criada
        };

        // Removendo campos "fantasmas" que não têm input na interface atual
        delete apaCompleta.dorso;
        delete apaCompleta.ef_outros;
        delete apaCompleta.hist_fam;
        delete apaCompleta.anestesistaSexo;
        
        let anexarExamesExtras = [];
        if (apaCompleta.ex_coagulo) anexarExamesExtras.push(`Coagulograma: ${apaCompleta.ex_coagulo}`);
        if (apaCompleta.ex_eco) anexarExamesExtras.push(`Ecocardiograma: ${apaCompleta.ex_eco}`);
        if (apaCompleta.ex_hepato) anexarExamesExtras.push(`Func. Hepática: ${apaCompleta.ex_hepato}`);
        if (apaCompleta.ex_outros_esp) anexarExamesExtras.push(`Outros Específicos: ${apaCompleta.ex_outros_esp}`);
        
        if (anexarExamesExtras.length > 0) {
            apaCompleta.ex_outros = apaCompleta.ex_outros 
                ? apaCompleta.ex_outros + '\n[' + anexarExamesExtras.join(' | ') + ']'
                : '[' + anexarExamesExtras.join(' | ') + ']';
        }

        delete apaCompleta.ex_coagulo;
        delete apaCompleta.ex_eco;
        delete apaCompleta.ex_hepato;
        delete apaCompleta.ex_outros_esp;

        // Limpeza de chaves de sistema e controle para evitar Rest API Errors (not-null constraint id / missing schema info)
        delete apaCompleta.id;
        delete apaCompleta.dataRegistro;
        delete apaCompleta.dataAtualizacao;
        delete apaCompleta.idadeInfo;
        delete apaCompleta.imc;

        // Remove boolean flags individually because they are now encoded in comorbidadesList array
        keysComorb.forEach(k => delete apaCompleta[k]);

        console.log("Médico sendo salvo:", nomeMedico, "- CRM:", crmMedico);

        try {
            if (apaIdParaCarregar) {
                // Atualiza APA existente
                const { error } = await supabase.from('apas').update({ ...apaCompleta, dataAtualizacao: new Date().toISOString() }).eq('id', apaIdParaCarregar);
                if (error) throw error;
                sessionStorage.removeItem('apa_draft_state');
                toast.success("APA atualizada!");
                setModoVisao('lista');
                loadApasList();
                handleVisualizarPdf(apaCompleta);
            } else {
                // Salva nova APA
                const { error } = await supabase.from('apas').insert([{ ...apaCompleta, dataRegistro: new Date().toISOString() }]);
                if (error) throw error;
                await logAction('CRIAÇÃO DE APA', `APA criada para o paciente ${apaCompleta.nome || 'Desconhecido'}.`);
                sessionStorage.removeItem('apa_draft_state');
                toast.success("APA salva!");
                setModoVisao('lista');
                loadApasList();
                // Injeta a data atual provisória apenas para a tela de PDF não mostrar em branco enquanto salva no banco
                handleVisualizarPdf({ ...apaCompleta, dataRegistro: new Date() });
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro BD: " + (err?.message || err?.details || JSON.stringify(err)));
        }
    };

    const handleGeneratePDF = () => {
        const keysComorb = ['has', 'dm', 'cardio', 'arritmia', 'icc', 'iam', 'asma', 'dpoc', 'pneumo', 'renal', 'hepato', 'tireo', 'neuro', 'convulsao', 'avc', 'coag', 'apneia', 'refluxo', 'obesidade', 'marcapasso', 'gestante', 'hiv', 'neoplasia', 'psiq'];
        const comorbidadesListPayload = keysComorb.filter(k => formData[k]);

        handleVisualizarPdf({
            ...formData,
            idadeInfo: calcularIdade(formData.dataNasc),
            imc: imcData?.valor || '',
            comorbidadesList: comorbidadesListPayload,
            mallampati, parecerFinal: parecer,
            negaAlergia, alergias,
            negaMed, medicamentos
        });
    };

    const handleChange = (e) => {
        let { name, type, checked, value } = e.target;
        if (name === 'cpf') value = maskCPF(value);
        if (name === 'telefone') value = maskTelefone(value);
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return '--';
        const hoje = new Date(); const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade + " anos";
    };

    const imcData = useMemo(() => {
        const p = parseFloat(formData.peso), a = parseFloat(formData.altura) / 100;
        if (p > 0 && a > 0) {
            const imc = parseFloat((p / (a * a)).toFixed(1));
            let label = "";
            let color = "";
            if (imc < 18.5) { label = "Abaixo"; color = "text-amber-700 bg-amber-100 border-l border-amber-200"; }
            else if (imc < 25) { label = "Normal"; color = "text-emerald-700 bg-emerald-100 border-l border-emerald-200"; }
            else if (imc < 30) { label = "Sobrepeso"; color = "text-orange-700 bg-orange-100 border-l border-orange-200"; }
            else if (imc < 35) { label = "Obeso I"; color = "text-rose-600 bg-rose-50 border-l border-rose-100"; }
            else if (imc < 40) { label = "Obeso II"; color = "text-rose-700 bg-rose-100 border-l border-rose-200"; }
            else { label = "Obeso III"; color = "text-rose-800 bg-rose-200 border-l border-rose-300"; }
            return { value: imc, label, color };
        }
        return { value: '--', label: '', color: '' };
    }, [formData.peso, formData.altura]);

    const uniqueProcedimentos = useMemo(() => {
        const procs = new Set();
        listaApas.forEach(apa => {
            if (apa.procedimento) procs.add(apa.procedimento.trim().toUpperCase());
        });
        return Array.from(procs).sort();
    }, [listaApas]);

    const filteredApasList = listaApas.filter(apa => {
        const term = searchApa.toLowerCase();
        const matchesSearch = (apa.nome?.toLowerCase().includes(term) || apa.cpf?.includes(term) || apa.procedimento?.toLowerCase().includes(term));
        const matchesStatus = filterStatus === 'Todos' ||
            (filterStatus === 'Apto' && apa.parecerFinal === 'Apto') ||
            (filterStatus === 'Restricao' && (apa.parecerFinal === 'Restricao' || apa.parecerFinal === 'Apto com restrições')) ||
            (filterStatus === 'Inapto' && apa.parecerFinal === 'Inapto');

        const procUpper = apa.procedimento ? apa.procedimento.trim().toUpperCase() : '';
        const matchesProc = filterProcedimento === 'Todos' || procUpper === filterProcedimento;

        let matchesData = true;
        if (filterDataInicio || filterDataFim) {
            const apaDateStr = apa.dataRegistro ? apa.dataRegistro.split('T')[0] : '';
            if (apaDateStr) {
                if (filterDataInicio && apaDateStr < filterDataInicio) matchesData = false;
                if (filterDataFim && apaDateStr > filterDataFim) matchesData = false;
            } else {
                matchesData = false;
            }
        }

        return matchesSearch && matchesStatus && matchesProc && matchesData;
    });

    const filteredPacientes = pacientes.filter(p => p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || p.cpf?.includes(searchTerm)).slice(0, 10);

    const comorbidadesList = [
        { key: 'has', label: 'Hipertensão Arterial' }, { key: 'dm', label: 'Diabetes Mellitus' }, { key: 'cardio', label: 'Cardiopatia' },
        { key: 'arritmia', label: 'Arritmia' }, { key: 'icc', label: 'ICC' }, { key: 'iam', label: 'IAM prévio' },
        { key: 'asma', label: 'Asma' }, { key: 'dpoc', label: 'DPOC' }, { key: 'pneumo', label: 'Outra Pneumopatia' },
        { key: 'renal', label: 'Nefropatia' }, { key: 'hepato', label: 'Hepatopatia' }, { key: 'tireo', label: 'Tireopatia' },
        { key: 'neuro', label: 'Doença Neurológica' }, { key: 'convulsao', label: 'Epilepsia' }, { key: 'avc', label: 'AVC prévio' },
        { key: 'coag', label: 'Coagulopatia' }, { key: 'apneia', label: 'Apneia' }, { key: 'refluxo', label: 'DRGE / Refluxo' },
        { key: 'obesidade', label: 'Obesidade Mórbida' }, { key: 'marcapasso', label: 'Marca-passo / CDI' }, { key: 'gestante', label: 'Gestante' },
        { key: 'hiv', label: 'HIV / Imunossupressão' }, { key: 'neoplasia', label: 'Neoplasia' }, { key: 'psiq', label: 'Doença Psiquiátrica' }
    ];

    const updateArray = (arr, setter, idx, field, val) => {
        const newArr = [...arr]; newArr[idx][field] = val; setter(newArr);
    };
    const removeArray = (arr, setter, idx, emptyObj) => {
        if (arr.length > 1) setter(arr.filter((_, i) => i !== idx)); else setter([emptyObj]);
    };

    const tabs = [
        { id: 'dados', label: 'Dados e Procedimento', icon: <User size={18} /> },
        { id: 'historico', label: 'Histórico Clínico', icon: <Stethoscope size={18} /> },
        { id: 'exame', label: 'Exame Físico e VA', icon: <ActivitySquare size={18} /> },
        { id: 'exames', label: 'Exames e Jejum', icon: <FileText size={18} /> },
        { id: 'plano', label: 'Plano e Parecer', icon: <CheckSquare size={18} /> },
    ];

    const handleDownloadPDF = () => {
        const element = document.getElementById('apa-pdf-document');
        const opt = {
            margin: [5, 0, 5, 0],
            filename: `APA_${apaParaVisualizar?.nome || 'Paciente'}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                onclone: (document) => {
                    const el = document.getElementById('apa-pdf-document');
                    if (el) el.classList.add('pdf-export-mode');
                }
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: 'css', avoid: '.apa-section-block, .sig-grid' }
        };
        html2pdf().set(opt).from(element).save();
    };

    if (!unidadeAtual) {
        return <UnitPrompt />;
    }

    return (
        <div className="py-4 px-2 sm:px-4 font-sans animate-in fade-in duration-700 w-full min-h-full bg-slate-50/30">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/70 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Activity size={20} /></div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">
                                {modoVisao === 'lista' ? 'Avaliações Pré-Anestésicas' : modoVisao === 'preview' ? 'Documento APA' : (isReadOnly ? 'Visualizando APA' : 'Nova APA')}
                            </h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {modoVisao === 'lista' ? 'Gestão do histórico de avaliações' : modoVisao === 'preview' ? 'Pré-visualização para impressão' : 'Preencha os dados do paciente'}
                            </p>
                        </div>
                    </div>
                    {modoVisao === 'lista' ? (
                        hasPermission('Criar/Editar APA') && (
                            <button onClick={handleNovaApa} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all">
                                <Plus size={18} /> Nova Avaliação
                            </button>
                        )
                    ) : modoVisao === 'preview' ? (
                        null /* Actions are displayed inside the preview container */
                    ) : (
                        <div className="flex items-center gap-3">
                            <button onClick={() => setModoVisao('lista')} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 transition-colors">
                                Cancelar
                            </button>
                            {isReadOnly && (
                                <button type="button" onClick={handleGeneratePDF} className="text-sm flex items-center gap-1.5 border border-slate-300 bg-white text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors">
                                    <Printer size={16} /> Imprimir PDF
                                </button>
                            )}
                            {!isReadOnly && (
                                <button onClick={handleSalvarApa} className="text-sm flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 font-medium shadow-sm transition-colors">
                                    <Save size={16} /> Salvar e Imprimir
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {modoVisao === 'preview' && apaParaImprimir ? (
                    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-6 bg-white/70 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
                            <button onClick={() => { setModoVisao('lista'); setApaParaImprimir(null); }} className="text-sm font-bold text-slate-600 hover:text-blue-600 flex items-center gap-2 transition-colors">
                                <ArrowLeft size={16} /> Voltar à Lista
                            </button>
                            <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all">
                                <Printer size={16} /> Imprimir / Salvar
                            </button>
                        </div>
                        <div className="w-full overflow-x-auto pb-8 custom-scrollbar">
                            <div className="bg-white shadow-[0_20px_60px_rgb(0,0,0,0.1)] mb-8 mx-auto print:shadow-none print:m-0 border border-slate-200 shrink-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
                                <ApaPrintTemplate data={apaParaImprimir} />
                            </div>
                        </div>
                    </div>
                ) : modoVisao === 'lista' ? (
                    <div className="space-y-6 print:hidden animate-in fade-in duration-500 max-w-7xl mx-auto">
                        {/* iOS Spotlight Search & Filters */}
                        <div className="flex flex-col gap-3 w-full">
                            <div className="flex flex-col md:flex-row gap-3 w-full">
                                <div className="relative group flex-1">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                        <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar paciente por nome ou CPF..." 
                                        value={searchApa} 
                                        onChange={e => setSearchApa(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-3xl border border-white rounded-[1rem] text-sm font-black text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300"
                                    />
                                </div>
                                <div className="relative shrink-0 md:w-64">
                                    <select 
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                        className="w-full px-4 py-3 appearance-none bg-white/70 backdrop-blur-3xl border border-white rounded-[1rem] text-sm font-black text-slate-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 cursor-pointer"
                                    >
                                        <option value="Todos">Todos os Pareceres</option>
                                        <option value="Apto">Apto</option>
                                        <option value="Restricao">Apto c/ Restrição</option>
                                        <option value="Inapto">Inapto</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                        <ChevronDown className="text-slate-400" size={16} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full">
                                <div className="relative shrink-0 md:w-40">
                                    <input 
                                        type="date" 
                                        value={filterDataInicio}
                                        onChange={e => setFilterDataInicio(e.target.value)}
                                        className="w-full px-3 py-3 bg-white/70 backdrop-blur-3xl border border-white rounded-[1rem] text-xs font-black text-slate-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 cursor-pointer"
                                    />
                                    <span className="absolute -top-2 left-4 text-[9px] font-black text-blue-600 px-1 bg-white/90 backdrop-blur-sm rounded uppercase tracking-widest pointer-events-none">Data Início</span>
                                </div>
                                <div className="relative shrink-0 md:w-40">
                                    <input 
                                        type="date" 
                                        value={filterDataFim}
                                        onChange={e => setFilterDataFim(e.target.value)}
                                        className="w-full px-3 py-3 bg-white/70 backdrop-blur-3xl border border-white rounded-[1rem] text-xs font-black text-slate-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 cursor-pointer"
                                    />
                                    <span className="absolute -top-2 left-4 text-[9px] font-black text-blue-600 px-1 bg-white/90 backdrop-blur-sm rounded uppercase tracking-widest pointer-events-none">Data Fim</span>
                                </div>
                                <div className="relative col-span-2 md:col-auto flex-1">
                                    <select 
                                        value={filterProcedimento}
                                        onChange={e => setFilterProcedimento(e.target.value)}
                                        className="w-full px-4 py-3 appearance-none bg-white/70 backdrop-blur-3xl border border-white rounded-[1rem] text-xs font-black text-slate-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 cursor-pointer"
                                    >
                                        <option value="Todos">Todos os Procedimentos</option>
                                        {uniqueProcedimentos.map((proc, index) => (
                                            <option key={index} value={proc}>{proc}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                        <ChevronDown className="text-slate-400" size={16} />
                                    </div>
                                    <span className="absolute -top-2 left-4 text-[9px] font-black text-blue-600 px-1 bg-white/90 backdrop-blur-sm rounded uppercase tracking-widest pointer-events-none">Procedimento</span>
                                </div>
                                {(searchApa || filterStatus !== 'Todos' || filterDataInicio || filterDataFim || filterProcedimento !== 'Todos') && (
                                    <div className="col-span-2 md:col-auto flex items-center justify-end">
                                        <button 
                                            onClick={() => { setSearchApa(''); setFilterStatus('Todos'); setFilterDataInicio(''); setFilterDataFim(''); setFilterProcedimento('Todos'); }} 
                                            className="w-full md:w-auto px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs font-bold uppercase tracking-widest rounded-[1rem] border border-rose-100 transition-colors shadow-sm"
                                        >
                                            Limpar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Apple-style Data List */}
                        <div className="bg-white/80 backdrop-blur-3xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.05)] overflow-hidden">
                            {loadingApas ? (
                                <div className="py-24 flex flex-col items-center justify-center">
                                    <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando Avaliações...</span>
                                </div>
                            ) : filteredApasList.length === 0 ? (
                                <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <FileText size={24} className="opacity-40" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest">Nenhuma avaliação encontrada</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100/60">
                                    {/* Header Row */}
                                    <div className="px-6 py-3.5 bg-slate-50/50 flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <div className="w-24 pl-2">Data</div>
                                        <div className="flex-1">Paciente</div>
                                        <div className="flex-1 hidden md:block">Procedimento</div>
                                        <div className="w-28 text-center">Parecer</div>
                                        <div className="w-[160px] text-right pr-4">Ações</div>
                                    </div>
                                    
                                    {/* List Items */}
                                    {filteredApasList.map(apa => (
                                        <div key={apa.id} className="group relative flex items-center px-6 py-4 hover:bg-white/80 transition-all duration-200 cursor-default">
                                            {/* Accent Left Bar on Hover */}
                                            <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            
                                            {/* Data */}
                                            <div className="w-24 pl-2 text-xs font-bold text-slate-500 tracking-wide">
                                                {apa.dataRegistro ? new Date(apa.dataRegistro).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '--'}
                                            </div>
                                            
                                            {/* Paciente */}
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="text-sm font-black text-slate-800 truncate tracking-tight">{apa.nome}</div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-widest uppercase">{apa.cpf}</div>
                                            </div>

                                            {/* Procedimento */}
                                            <div className="flex-1 hidden md:flex items-center gap-2 pr-4">
                                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shadow-[inset_0_1px_2px_rgba(255,255,255,1)]">
                                                    <Stethoscope size={14} />
                                                </div>
                                                <div className="text-xs font-bold text-slate-600 truncate uppercase mt-0.5 max-w-[200px]" title={apa.procedimento}>
                                                    {apa.procedimento}
                                                </div>
                                            </div>

                                            {/* Parecer */}
                                            <div className="w-28 flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${apa.parecerFinal === 'Apto' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : apa.parecerFinal === 'Restricao' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                                    {apa.parecerFinal || 'N/A'}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="w-[160px] flex items-center justify-end gap-1.5 opacity-100 transition-opacity duration-200 pr-4">
                                                <button onClick={() => handleVerPreviewPdf(apa)} className="p-2 text-blue-600 hover:bg-blue-100 bg-blue-50 rounded-xl transition-all active:scale-95" title="Visualizar PDF na tela"><Eye size={16} strokeWidth={2.5}/></button>
                                                {hasPermission('Criar/Editar APA') && <button onClick={() => handleVisualizarPdf(apa)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 bg-slate-50 border border-slate-100 rounded-xl transition-all active:scale-95" title="Imprimir / Salvar PDF"><Printer size={16} strokeWidth={2.5}/></button>}
                                                {hasPermission('Criar/Editar APA') && <button onClick={() => handleDuplicarApa(apa)} className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all active:scale-95" title="Duplicar"><Copy size={16} strokeWidth={2.5}/></button>}
                                                {hasPermission('Excluir AIH/APA') && <button onClick={() => handleExcluirApa(apa.id)} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95" title="Excluir"><Trash2 size={16} strokeWidth={2.5}/></button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col xl:flex-row gap-6">
                        {/* Sidebar nav / Top Bar */}
                        <div className="w-full xl:w-72 flex-shrink-0 space-y-4">
                            <button onClick={() => setModoVisao('lista')} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-2 font-medium">
                                <ArrowLeft size={16} /> Voltar à Lista
                            </button>
                            <div className="flex flex-row xl:flex-col overflow-x-auto pb-2 xl:pb-0 gap-2 custom-scrollbar scroll-smooth">
                                {tabs.map(tab => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                        className={`flex-shrink-0 w-auto xl:w-full flex items-center gap-3 px-4 py-3 xl:py-3.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border-transparent' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
                                        <div className={`${activeTab === tab.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {tab.icon}
                                        </div>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Form Content */}
                        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 md:p-5 space-y-5">

                                {/* TAB 1: DADOS E PROCEDIMENTO */}
                                {activeTab === 'dados' && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">1. Identificação do Paciente</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-5">
                                                <div className="relative md:col-span-8">
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">NOME DO PACIENTE<span className="text-red-500 ml-0.5">*</span></label>
                                                    <input disabled={isReadOnly} type="text" name="nome" value={formData.nome} onChange={e => { handleChange(e); setSearchTerm(e.target.value); setShowPacientes(true); }} onFocus={() => setShowPacientes(true)} onBlur={() => setTimeout(() => setShowPacientes(false), 200)} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                                    {showPacientes && searchTerm && (
                                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-auto">
                                                            {filteredPacientes.map(p => (
                                                                <div key={p.id} onMouseDown={() => { setFormData(f => ({ ...f, nome: p.nome, cpf: p.cpf, dataNasc: p.dataNascimento || p.nascimento, sexo: p.sexo, peso: p.peso, altura: p.altura, telefone: p.telefone1 || p.telefone })); setSearchTerm(p.nome); setShowPacientes(false); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50">
                                                                    <div className="font-semibold text-sm">{p.nome}</div><div className="text-xs text-slate-500">{p.cpf}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="md:col-span-4"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CPF</label><input disabled={isReadOnly} type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                                                <div className="md:col-span-3"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">NASCIMENTO<span className="text-red-500 ml-0.5">*</span></label><input disabled={isReadOnly} type="date" name="dataNasc" value={formData.dataNasc} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                                                <div className="md:col-span-2"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">IDADE</label><div className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium">{calcularIdade(formData.dataNasc)}</div></div>
                                                <div className="md:col-span-3"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">SEXO<span className="text-red-500 ml-0.5">*</span></label><select disabled={isReadOnly} name="sexo" value={formData.sexo} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"><option value="">--</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></div>
                                                <div className="md:col-span-4 flex items-end gap-2">
                                                    <div className="flex-1 w-full"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-tight whitespace-nowrap mb-1">PESO (kg)<span className="text-red-500 ml-0.5">*</span></label><input disabled={isReadOnly} type="number" name="peso" value={formData.peso} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                                                    <div className="flex-1 w-full"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-tight whitespace-nowrap mb-1">ALTURA (cm)<span className="text-red-500 ml-0.5">*</span></label><input disabled={isReadOnly} type="number" name="altura" value={formData.altura} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                                                    <div className="flex-[1.2] min-w-[70px] w-full">
                                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-tight whitespace-nowrap mb-1">IMC</label>
                                                        <div className="w-full flex items-stretch border border-slate-200 rounded-lg overflow-hidden text-xs font-semibold bg-slate-100 h-[30px]">
                                                            <div className="px-2 py-1.5 text-slate-700 flex items-center justify-center w-8">{imcData.value}</div>
                                                            {imcData.label && (
                                                                <div className={`flex-1 px-1 py-1.5 flex items-center justify-center font-black uppercase text-[9px] tracking-tighter ${imcData.color}`}>
                                                                    {imcData.label}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">2. Procedimento Proposto</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="md:col-span-2 relative">
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">PROCEDIMENTO CIRÚRGICO<span className="text-red-500 ml-0.5">*</span></label>
                                                    <SigtapAutocomplete
                                                        value={formData.procedimento}
                                                        onSelect={(p) => setFormData(prev => ({ ...prev, procedimento: p.nome }))}
                                                        disabled={isReadOnly}
                                                        className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mt-2">
                                                        <div className="col-span-1 md:col-span-2 space-y-4">
                                                            <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CIRURGIÃO / EQUIPE</label><select disabled={isReadOnly} name="profissional" value={formData.profissional} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 uppercase"><option value="">SELECIONE...</option>{settings.cirurgioes?.map((m, idx) => { const label = typeof m === 'string' ? m : m.nome; const display = label ? label.toUpperCase() : ''; return <option key={idx} value={label}>{display}</option>; })}</select></div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CARÁTER<span className="text-red-500 ml-0.5">*</span></label><select disabled={isReadOnly} name="carater" value={formData.carater} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"><option value="Eletivo">Eletivo</option><option value="Urgência">Urgência</option><option value="Emergência">Emergência</option></select></div>
                                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">POSIÇÃO</label><select disabled={isReadOnly} name="posicao" value={formData.posicao} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"><option value="">--</option><option value="DD">DD</option><option value="DV">DV</option><option value="DLE">DLE</option><option value="DLD">DLD</option><option value="Sentado">Sentado</option><option value="Litotomia">Litotomia</option></select></div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">DATA PREVISTA</label>
                                                            <InlineCalendar disabled={isReadOnly} value={formData.dataProcedimento} onChange={(val) => setFormData(prev => ({ ...prev, dataProcedimento: val }))} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                        
                                        <section className="pt-4 border-t border-slate-100/50 mt-4">
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">Sinais Vitais Básicos</h3>
                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">PA (mmHg)</label><input disabled={isReadOnly} type="text" name="pa" value={formData.pa} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">FC (bpm)</label><input disabled={isReadOnly} type="number" name="fc" value={formData.fc} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">SpO2 (%)</label><input disabled={isReadOnly} type="number" name="spo2" value={formData.spo2} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">FR (irpm)</label><input disabled={isReadOnly} type="number" name="fr" value={formData.fr} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">TEMP (°C)</label><input disabled={isReadOnly} type="text" name="temp" value={formData.temp} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {/* TAB 2: HISTÓRICO CLÍNICO */}
                                {activeTab === 'historico' && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">3. Comorbidades (Antecedentes Patológicos)</h3>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {comorbidadesList.map(c => (
                                                    <div 
                                                        key={c.key} 
                                                        onClick={!isReadOnly ? () => setFormData(prev => ({ ...prev, [c.key]: !prev[c.key] })) : undefined}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all select-none ${formData[c.key] ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'} ${isReadOnly ? 'opacity-80 cursor-not-allowed' : ''}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full border ${formData[c.key] ? 'border-rose-600 bg-rose-500' : 'border-slate-300'}`} />
                                                        <span className="text-[10px] tracking-tight font-bold uppercase">{c.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">DETALHES / OBSERVAÇÕES DE COMORBIDADES</label>
                                                <textarea disabled={isReadOnly} name="detalhes_comorbidades" value={formData.detalhes_comorbidades} onChange={handleChange} rows="2" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"></textarea>
                                            </div>
                                        </section>
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5 flex items-center gap-1">4. Alergias <span className="text-rose-500">*</span></h3>
                                            <label className="flex items-center gap-2 mb-3">
                                                <input disabled={isReadOnly} type="checkbox" checked={negaAlergia} onChange={e => setNegaAlergia(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="font-semibold text-slate-800">Nega alergias</span>
                                            </label>
                                            {!negaAlergia && (
                                                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    {alergias.map((al, i) => (
                                                        <div key={i} className="flex gap-3 items-center">
                                                            <div className="flex-1"><input disabled={isReadOnly} type="text" placeholder="Substância" value={al.substancia} onChange={e => updateArray(alergias, setAlergias, i, 'substancia', e.target.value)} className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg" /></div>
                                                            <div className="flex-1"><input disabled={isReadOnly} type="text" placeholder="Reação" value={al.reacao} onChange={e => updateArray(alergias, setAlergias, i, 'reacao', e.target.value)} className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg" /></div>
                                                            {!isReadOnly && <button onClick={() => removeArray(alergias, setAlergias, i, { substancia: '', reacao: '' })} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={18} /></button>}
                                                        </div>
                                                    ))}
                                                    {!isReadOnly && <button onClick={() => setAlergias([...alergias, { substancia: '', reacao: '' }])} className="text-sm text-blue-600 font-medium">+ Adicionar Alergia</button>}
                                                </div>
                                            )}
                                        </section>
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">5. Medicamentos em Uso</h3>
                                            <label className="flex items-center gap-2 mb-3">
                                                <input disabled={isReadOnly} type="checkbox" checked={negaMed} onChange={e => setNegaMed(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="font-semibold text-slate-800">Nega uso de medicamentos contínuos</span>
                                            </label>
                                            {!negaMed && (
                                                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    {medicamentos.map((med, i) => (
                                                        <div key={i} className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                                                            <div className="w-full md:flex-1"><input disabled={isReadOnly} type="text" placeholder="Nome" value={med.nome} onChange={e => updateArray(medicamentos, setMedicamentos, i, 'nome', e.target.value)} className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg" /></div>
                                                            <div className="w-full md:w-24"><input disabled={isReadOnly} type="text" placeholder="Dose" value={med.dose} onChange={e => updateArray(medicamentos, setMedicamentos, i, 'dose', e.target.value)} className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg" /></div>
                                                            <div className="w-full md:w-32">
                                                                <input disabled={isReadOnly} type="text" list={`freqList_${i}`} placeholder="Freq." value={med.frequencia} onChange={e => updateArray(medicamentos, setMedicamentos, i, 'frequencia', e.target.value)} className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal" />
                                                                <datalist id={`freqList_${i}`}><option value="1x/dia" /><option value="2x/dia" /><option value="3x/dia" /><option value="8/8h" /><option value="12/12h" /><option value="SOS" /></datalist>
                                                            </div>
                                                            <div className="w-full md:w-[22rem] flex gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-lg shrink-0">
                                                                <button type="button" disabled={isReadOnly} onClick={() => updateArray(medicamentos, setMedicamentos, i, 'conduta', 'Manter')} className={`flex-[0.8] px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${med.conduta === 'Manter' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>Manter</button>
                                                                {(med.conduta !== 'Manter' && med.conduta !== '') ? (
                                                                    <div className="flex-[2] flex relative">
                                                                        <input autoFocus disabled={isReadOnly} type="text" placeholder="Suspender..." value={med.conduta} onChange={e => updateArray(medicamentos, setMedicamentos, i, 'conduta', e.target.value)} className="w-full min-w-[100px] pl-2 pr-7 py-1 text-[11px] tracking-tight font-bold bg-white text-rose-600 border border-rose-300 rounded-md outline-none focus:border-rose-500" />
                                                                        <button type="button" onClick={() => updateArray(medicamentos, setMedicamentos, i, 'conduta', '')} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 z-10 w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-50">✕</button>
                                                                    </div>
                                                                ) : (
                                                                    <button type="button" disabled={isReadOnly} onClick={() => updateArray(medicamentos, setMedicamentos, i, 'conduta', 'Suspender ')} className="flex-1 px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-200">Suspender</button>
                                                                )}
                                                            </div>
                                                            {!isReadOnly && <button type="button" onClick={() => removeArray(medicamentos, setMedicamentos, i, { nome: '', dose: '', frequencia: '', conduta: '' })} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={18} /></button>}
                                                        </div>
                                                    ))}
                                                    {!isReadOnly && <button onClick={() => setMedicamentos([...medicamentos, { nome: '', dose: '', frequencia: '', conduta: '' }])} className="text-sm text-blue-600 font-medium">+ Adicionar Medicamento</button>}
                                                </div>
                                            )}
                                        </section>
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">6. Antecedentes Cirúrgicos / 7. Hábitos</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CIRURGIAS PRÉVIAS</label><textarea disabled={isReadOnly} name="cirurgias" value={formData.cirurgias} onChange={handleChange} rows="2" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"></textarea></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">ANESTESIAS PRÉVIAS / COMPLICAÇÕES</label><textarea disabled={isReadOnly} name="anestesias_previas" value={formData.anestesias_previas} onChange={handleChange} rows="2" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"></textarea></div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">TABAGISMO</label><select disabled={isReadOnly} name="tabagismo" value={formData.tabagismo} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"><option value="Não">Não</option><option value="Sim, ativo">Sim, ativo</option><option value="Ex-tabagista">Ex-tabagista</option></select></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CARGA TABÁGICA</label><input disabled={isReadOnly} type="text" name="carga_tabagica" value={formData.carga_tabagica} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">PAROU HÁ</label><input disabled={isReadOnly} type="text" name="parou_fumo" value={formData.parou_fumo} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">ETILISMO</label><select disabled={isReadOnly} name="etilismo" value={formData.etilismo} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"><option value="Não">Não</option><option value="Social">Social</option><option value="Diário">Diário</option></select></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">DROGAS ILÍCITAS</label><select disabled={isReadOnly} name="drogas" value={formData.drogas} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"><option value="Nega">Nega</option><option value="Maconha">Maconha</option><option value="Cocaína/Crack">Cocaína/Crack</option><option value="Outras">Outras</option></select></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CAPACIDADE FUNCIONAL (METS)</label><select disabled={isReadOnly} name="mets" value={formData.mets} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"><option value="">--</option><option value=">10 METS">&gt;10 METS (Excelente)</option><option value="4-7 METS">4-7 METS</option><option value="<4 METS">&lt;4 METS (Ruim)</option></select></div>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {/* TAB 3: EXAME FÍSICO */}
                                {activeTab === 'exame' && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">8. Exame Físico (Especificidades)</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CARDIOVASCULAR (ACV)</label><input disabled={isReadOnly} type="text" name="acv" value={formData.acv} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">RESPIRATÓRIO (AR)</label><input disabled={isReadOnly} type="text" name="ar" value={formData.ar} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">ABDOME</label><input disabled={isReadOnly} type="text" name="abdome" value={formData.abdome} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                            </div>
                                        </section>
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">9. Avaliação da Via Aérea</h3>
                                            <div className="mb-6">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CLASSIFICAÇÃO DE MALLAMPATI <span className="text-rose-500 text-[10px]">*</span></label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {['I', 'II', 'III', 'IV'].map(m => (
                                                        <div key={m} onClick={!isReadOnly ? () => setMallampati(m) : undefined} className={`p-4 rounded-xl border-2 text-center cursor-pointer transition-all ${mallampati === m ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-100 hover:border-slate-300 bg-white'} ${isReadOnly ? 'opacity-80 cursor-not-allowed' : ''}`}>
                                                            <div className={`w-14 h-14 mx-auto mb-3 rounded-full overflow-hidden relative transition-all duration-300 ${mallampati === m ? 'shadow-[0_0_0_3px_#2563eb,inset_0_4px_10px_rgba(0,0,0,0.5)] bg-rose-950 scale-110' : 'shadow-[inset_0_4px_10px_rgba(0,0,0,0.4)] bg-rose-950 opacity-85'}`}>
                                                                {/* Palato Mole Superior */}
                                                                <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 w-16 h-8 rounded-full bg-rose-300 opacity-90" />
                                                                
                                                                {/* Pilares Amigdalianos (Visíveis mais no I e II) */}
                                                                {(m === 'I' || m === 'II') && (
                                                                    <>
                                                                        <div className="absolute top-2 left-1.5 w-3 h-8 rounded-full bg-rose-300 rotate-[15deg] opacity-80" />
                                                                        <div className="absolute top-2 right-1.5 w-3 h-8 rounded-full bg-rose-300 -rotate-[15deg] opacity-80" />
                                                                    </>
                                                                )}

                                                                {/* Úvula */}
                                                                {m === 'I' && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-6 rounded-b-full bg-rose-400 shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />}
                                                                {m === 'II' && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-4 rounded-b-full bg-rose-400 shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />}
                                                                {m === 'III' && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-2.5 rounded-b-[4px] bg-rose-400" />}
                                                                
                                                                {/* Língua Subindo */}
                                                                <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 rounded-full bg-rose-500 shadow-[0_-4px_12px_rgba(0,0,0,0.4)] transition-all duration-300" 
                                                                     style={{ width: m === 'IV' ? '120%' : m === 'III' ? '100%' : m === 'II' ? '85%' : '75%', 
                                                                              height: m === 'IV' ? '85%' : m === 'III' ? '65%' : m === 'II' ? '45%' : '30%' }} />
                                                            </div>
                                                            <div className={`text-xl font-black ${mallampati === m ? 'text-blue-700' : 'text-slate-500'}`}>{m}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">ABERTURA BUCAL</label><select disabled={isReadOnly} name="va_abertura" value={formData.va_abertura} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"><option value="">--</option><option value="Adequada (> 3cm)">Adequada (&gt; 3cm)</option><option value="Limitada (< 3cm)">Limitada (&lt; 3cm)</option></select></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">DIST. TIREOMENTUAL</label><select disabled={isReadOnly} name="va_dtm" value={formData.va_dtm} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"><option value="">--</option><option value="Adequada (> 6cm)">Adequada (&gt; 6cm)</option><option value="Limitada (< 6cm)">Limitada (&lt; 6cm)</option></select></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">DIST. ESTERNOMENTO</label><select disabled={isReadOnly} name="va_dem" value={formData.va_dem} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"><option value="">--</option><option value="Adequada (> 12.5cm)">Adequada (&gt; 12.5cm)</option><option value="Limitada (< 12.5cm)">Limitada (&lt; 12.5cm)</option></select></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">MOBILIDADE CERVICAL</label><select disabled={isReadOnly} name="va_cervical" value={formData.va_cervical} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"><option value="">--</option><option value="Normal">Normal</option><option value="Limitada">Limitada</option></select></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">PRÓTESE DENTÁRIA</label><select disabled={isReadOnly} name="va_protese" value={formData.va_protese} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"><option value="Não">Não</option><option value="Fixa">Fixa</option><option value="Móvel">Móvel</option></select></div>
                                                <div><label className={`block text-[9px] font-black uppercase tracking-wide mb-1 ${formData.va_dificil === 'Sim' ? 'text-rose-600' : formData.va_dificil === 'Possível' ? 'text-amber-600' : 'text-slate-500'}`}>VA DIFÍCIL PREVISTA <span className="text-rose-500 text-[10px]">*</span></label><select disabled={isReadOnly} name="va_dificil" value={formData.va_dificil} onChange={handleChange} className={`w-full px-3 py-1.5 text-xs font-semibold border rounded-lg outline-none transition-all ${formData.va_dificil === 'Sim' ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm focus:ring-1 focus:ring-rose-400' : formData.va_dificil === 'Possível' ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm focus:ring-1 focus:ring-amber-400' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}><option value="">--</option><option value="Não">Não</option><option value="Sim">Sim</option><option value="Possível">Possível</option></select></div>
                                            </div>
                                            <div className="mt-4">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">OBSERVAÇÕES VIA AÉREA</label>
                                                <textarea disabled={isReadOnly} name="va_obs" value={formData.va_obs} onChange={handleChange} rows="2" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"></textarea>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {/* TAB 4: EXAMES E JEJUM */}
                                {activeTab === 'exames' && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">10. Estado Físico (ASA)</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CLASSIFICAÇÃO ASA</label>
                                                    <select disabled={isReadOnly} name="asa" value={formData.asa} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg">
                                                        <option value="">--</option><option value="ASA I">ASA I - Saudável</option><option value="ASA II">ASA II - Doença sist. leve</option><option value="ASA III">ASA III - Doença sist. grave</option><option value="ASA IV">ASA IV - Risco à vida</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </section>
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">11. Exames Complementares</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">HB</label><input disabled={isReadOnly} type="text" name="ex_hb" value={formData.ex_hb} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">HT</label><input disabled={isReadOnly} type="text" name="ex_ht" value={formData.ex_ht} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">PLAQUETAS</label><input disabled={isReadOnly} type="text" name="ex_plaq" value={formData.ex_plaq} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">LEUCÓCITOS</label><input disabled={isReadOnly} type="text" name="ex_leuco" value={formData.ex_leuco} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">COAGULOGRAMA</label><input disabled={isReadOnly} type="text" name="ex_coagulo" value={formData.ex_coagulo} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" placeholder="Geral..." /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">TAP / INR</label><input disabled={isReadOnly} type="text" name="ex_inr" value={formData.ex_inr} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">TTPA</label><input disabled={isReadOnly} type="text" name="ex_ttpa" value={formData.ex_ttpa} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">GLICEMIA</label><input disabled={isReadOnly} type="text" name="ex_glic" value={formData.ex_glic} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">HBA1C</label><input disabled={isReadOnly} type="text" name="ex_hba1c" value={formData.ex_hba1c} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">UREIA</label><input disabled={isReadOnly} type="text" name="ex_ureia" value={formData.ex_ureia} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">CREATININA</label><input disabled={isReadOnly} type="text" name="ex_creat" value={formData.ex_creat} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">SÓDIO (NA+)</label><input disabled={isReadOnly} type="text" name="ex_na" value={formData.ex_na} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">POTÁSSIO (K+)</label><input disabled={isReadOnly} type="text" name="ex_k" value={formData.ex_k} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">ECOCARDIOGRAMA</label><input disabled={isReadOnly} type="text" name="ex_eco" value={formData.ex_eco} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">FUNÇÃO HEPÁTICA</label><input disabled={isReadOnly} type="text" name="ex_hepato" value={formData.ex_hepato} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" placeholder="TGO / TGP..." /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">OUTROS (TSH / URINA...)</label><input disabled={isReadOnly} type="text" name="ex_outros_esp" value={formData.ex_outros_esp} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div className="md:col-span-2"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">ECG</label><input disabled={isReadOnly} type="text" name="ex_ecg" value={formData.ex_ecg} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                                <div className="md:col-span-2"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">RX TÓRAX</label><input disabled={isReadOnly} type="text" name="ex_rx" value={formData.ex_rx} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" /></div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">OUTROS EXAMES</label>
                                                    <textarea disabled={isReadOnly} name="ex_outros" value={formData.ex_outros} onChange={handleChange} rows="2" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"></textarea>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">OBSERVAÇÕES DOS EXAMES</label>
                                                    <textarea disabled={isReadOnly} name="ex_obs" value={formData.ex_obs} onChange={handleChange} rows="2" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"></textarea>
                                                </div>
                                            </div>
                                        </section>
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                                                <span>12. Jejum Pré-Operatório</span>
                                            </h3>
                                            
                                            {/* Radios de Seleção de Jejum */}
                                            <div className="flex gap-4 mb-3">
                                                <label className="flex items-center cursor-pointer">
                                                    <input disabled={isReadOnly} type="radio" name="jejum_tipo" checked={formData.jejum_orientacao === '' || formData.jejum_orientacao === 'Padrão ASA'} onChange={() => handleChange({ target: { name: 'jejum_orientacao', value: 'Padrão ASA' }})} className="mr-2 accent-blue-600" />
                                                    <span className="text-xs font-bold text-slate-700">Protocolo Padrão (ASA)</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input disabled={isReadOnly} type="radio" name="jejum_tipo" checked={formData.jejum_orientacao !== '' && formData.jejum_orientacao !== 'Padrão ASA'} onChange={() => handleChange({ target: { name: 'jejum_orientacao', value: 'Jejum diferenciado:\n' }})} className="mr-2 accent-blue-600" />
                                                    <span className="text-xs font-bold text-slate-700">Personalizado</span>
                                                </label>
                                            </div>

                                            {/* Exibição Condicional (Tabela ou Texto Livre) */}
                                            {(formData.jejum_orientacao === '' || formData.jejum_orientacao === 'Padrão ASA') ? (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-3 animate-in fade-in duration-300">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-slate-100 text-slate-600 font-bold">
                                                            <tr><th className="px-4 py-2 border-b border-slate-200">Tipo de Alimento</th><th className="px-4 py-2 border-b border-slate-200">Tempo de Jejum Mínimo</th></tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200">
                                                            <tr><td className="px-4 py-2">Líquidos Claros (Água, Chá sem resíduos)</td><td className="px-4 py-2">2 horas</td></tr>
                                                            <tr><td className="px-4 py-2">Leite Materno</td><td className="px-4 py-2">4 horas</td></tr>
                                                            <tr><td className="px-4 py-2">Fórmula Láctea / Leite não humano</td><td className="px-4 py-2">6 horas</td></tr>
                                                            <tr><td className="px-4 py-2">Refeição leve (sem gordura)</td><td className="px-4 py-2">6 horas</td></tr>
                                                            <tr><td className="px-4 py-2">Refeição completa (com gordura/carne)</td><td className="px-4 py-2">8 horas</td></tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="mb-3 animate-in fade-in duration-300">
                                                    <textarea disabled={isReadOnly} name="jejum_orientacao" value={formData.jejum_orientacao} onChange={handleChange} rows="4" placeholder="Descreva a orientação de jejum personalizada..." className="w-full px-3 py-2 text-xs font-semibold bg-blue-50/30 border border-blue-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"></textarea>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                <div className="hidden">
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">ORIENTAÇÃO ESPECÍFICA DE JEJUM</label>
                                                    <input disabled={isReadOnly} type="text" name="jejum_orientacao_old" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">PROFILAXIA DE ASPIRAÇÃO</label>
                                                    <select disabled={isReadOnly} name="profilaxia_asp" value={formData.profilaxia_asp} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg">
                                                        <option value="Não indicada">Não indicada</option>
                                                        <option value="Indicada (Antiácido / Procinético)">Indicada (Antiácido / Procinético)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {/* TAB 5: PLANO E PARECER */}
                                {activeTab === 'plano' && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">13. Plano Anestésico</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">TÉCNICA PREVISTA <span className="text-rose-500 text-[10px]">*</span></label>
                                                    {(() => {
                                                        const tecnicasDisponiveis = settings?.anestesias && settings.anestesias.length > 0
                                                            ? settings.anestesias.map((a) => (a.nome || a))
                                                            : ["Geral", "Raquianestesia", "Bloqueio", "Sedação", "Local"];
                                                        
                                                        const selecionadas = formData.plan_tecnica ? formData.plan_tecnica.split(', ').filter(Boolean) : [];
                                                        
                                                        const handleToggle = (tecnica) => {
                                                            if (isReadOnly) return;
                                                            let novaLista = [...selecionadas];
                                                            if (novaLista.includes(tecnica)) {
                                                                novaLista = novaLista.filter(t => t !== tecnica);
                                                            } else {
                                                                novaLista.push(tecnica);
                                                            }
                                                            handleChange({ target: { name: 'plan_tecnica', value: novaLista.join(', ') } });
                                                        };

                                                        return (
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {tecnicasDisponiveis.map(tecnica => {
                                                                    const isSelected = selecionadas.includes(tecnica);
                                                                    return (
                                                                        <div 
                                                                            key={tecnica}
                                                                            onClick={() => handleToggle(tecnica)}
                                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'} ${isReadOnly ? 'opacity-80 cursor-not-allowed' : ''}`}
                                                                        >
                                                                            {tecnica}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">RESERVA DE HEMODERIVADOS</label><input disabled={isReadOnly} type="text" name="plan_hemoderivados" value={formData.plan_hemoderivados} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg" placeholder="Ex: Não, 1 CH, 2 CH..." /></div>
                                                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">DESTINO PÓS-OP PREVISTO <span className="text-rose-500 text-[10px]">*</span></label><select disabled={isReadOnly} name="plan_destino" value={formData.plan_destino} onChange={handleChange} className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"><option value="">--</option><option value="RPA / Enfermaria">RPA / Enfermaria</option><option value="UTI / Cuidados Críticos">UTI / Cuidados Críticos</option><option value="Alta">Alta</option></select></div>
                                            </div>
                                            <div className="mt-4">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">OBSERVAÇÕES DO PLANO</label>
                                                <textarea disabled={isReadOnly} name="plan_obs" value={formData.plan_obs} onChange={handleChange} rows="2" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"></textarea>
                                            </div>
                                        </section>
                                        <section>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-3 border-b border-slate-100 pb-1.5">14. Parecer Anestésico <span className="text-rose-500">*</span></h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                                <div onClick={!isReadOnly ? () => setParecer('Apto') : undefined} className={`p-4 rounded-xl border-2 text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${parecer === 'Apto' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 hover:border-slate-300 text-slate-600'} ${isReadOnly ? 'opacity-80 cursor-not-allowed' : ''}`}>
                                                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center">{parecer === 'Apto' && <div className="w-2 h-2 rounded-full bg-current" />}</div><span className="font-bold">APTO</span>
                                                </div>
                                                <div onClick={!isReadOnly ? () => setParecer('Restricao') : undefined} className={`p-4 rounded-xl border-2 text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${parecer === 'Restricao' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 hover:border-slate-300 text-slate-600'} ${isReadOnly ? 'opacity-80 cursor-not-allowed' : ''}`}>
                                                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center">{parecer === 'Restricao' && <div className="w-2 h-2 rounded-full bg-current" />}</div><span className="font-bold text-sm">APTO C/ RESTRIÇÕES</span>
                                                </div>
                                                <div onClick={!isReadOnly ? () => setParecer('Inapto') : undefined} className={`p-4 rounded-xl border-2 text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${parecer === 'Inapto' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 hover:border-slate-300 text-slate-600'} ${isReadOnly ? 'opacity-80 cursor-not-allowed' : ''}`}>
                                                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center">{parecer === 'Inapto' && <div className="w-2 h-2 rounded-full bg-current" />}</div><span className="font-bold">INAPTO</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">JUSTIFICATIVAS / RECOMENDAÇÕES FINAIS</label>
                                                <textarea disabled={isReadOnly} name="parecer_obs" value={formData.parecer_obs} onChange={handleChange} rows="3" className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"></textarea>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {/* FOOTER WIZARD */}
                                <div className="pt-6 border-t border-slate-100 flex justify-between items-center mt-6">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const currentIndex = tabs.findIndex(t => t.id === activeTab);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                            if(currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id);
                                        }}
                                        disabled={activeTab === tabs[0].id}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === tabs[0].id ? 'opacity-0 pointer-events-none' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        <ArrowLeft size={16} /> Etapa Anterior
                                    </button>

                                    {activeTab !== tabs[tabs.length - 1].id ? (
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const currentIndex = tabs.findIndex(t => t.id === activeTab);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                if(currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id);
                                            }}
                                            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all flex items-center gap-2"
                                        >
                                            Próxima Etapa <ChevronRight size={16} />
                                        </button>
                                    ) : (
                                        !isReadOnly && (
                                            <button type="button" onClick={handleSalvarApa} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center gap-2">
                                                <Save size={16} /> Salvar e Finalizar
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Componente Invisível que só aparece no Print Nativo */}
            {apaParaImprimir && createPortal(
                <div className="print-master-container">
                    <ApaPrintTemplate data={apaParaImprimir} />
                </div>,
                document.body
            )}
        </div>
    );
}
