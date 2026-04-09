import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { 
    FileSignature, User, Clock, Stethoscope, 
    CheckCircle2, Pill, Activity, FileText, ClipboardList, 
    ChevronRight, Loader2, Play, ArrowLeft, Save, Printer, FilePlus2, Syringe, X
} from 'lucide-react';
import Aih from './Aih';
import Apa from './Apa';
import { imprimirReceitaPdf, imprimirExamePdf } from '../utils/geradorPdfConsultorio';

const CORES_RISCO = {
    'Emergência': 'bg-red-500 text-white border-red-600',
    'Muito Urgente': 'bg-orange-500 text-white border-orange-600',
    'Urgente': 'bg-yellow-400 text-yellow-900 border-yellow-500',
    'Pouco Urgente': 'bg-green-500 text-white border-green-600',
    'Não Urgente': 'bg-blue-500 text-white border-blue-600',
    'Não Classificado': 'bg-slate-200 text-slate-600 border-slate-300'
};

const PEP = () => {
    const [fila, setFila] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pacienteAtivo, setPacienteAtivo] = useState(null);
    const [activeTab, setActiveTab] = useState('painel'); 

    // Estados
    const [textoEvolucao, setTextoEvolucao] = useState('');
    const [historicoEvo, setHistoricoEvo] = useState([]);
    const [salvandoEvolucao, setSalvandoEvolucao] = useState(false);
    
    const [textoReceita, setTextoReceita] = useState('');
    const [historicoRec, setHistoricoRec] = useState([]);
    const [salvandoReceita, setSalvandoReceita] = useState(false);

    const [textoExame, setTextoExame] = useState('');
    const [historicoExa, setHistoricoExa] = useState([]);
    const [salvandoExame, setSalvandoExame] = useState(false);

    const [isAihModalOpen, setIsAihModalOpen] = useState(false);
    const [isApaModalOpen, setIsApaModalOpen] = useState(false);

    const [loadingHistorico, setLoadingHistorico] = useState(false);
    const medicoLogado = 'DR. CARLOS'; 

    const fetchFila = async () => {
        setLoading(true);
        try {
            const hoje = new Date().toISOString().split('T')[0];
            
            // 1. Busca Consultas (Agenda)
            const { data: dataConsultas } = await supabase
                .from('consultas')
                .select('*')
                .eq('data_agendamento', hoje)
                .eq('medico', medicoLogado)
                .in('status', ['Aguardando', 'Em Atendimento']);
            
            // 2. Busca Atendimentos (P.A. / Triagem)
            const { data: dataAtendimentos } = await supabase
                .from('atendimentos')
                .select('*')
                .eq('medico', medicoLogado)
                .in('status', ['Aguardando', 'Em Atendimento']);

            // 3. Normaliza e Carimba a Agenda
            const consultasNormalizadas = (dataConsultas || []).map(c => ({
                ...c,
                tipo_atendimento: 'Agendado'
            }));

            // 4. Normaliza e Carimba o P.A. (usando chaves reais: nomePaciente, createdAt)
            const atendimentosNormalizados = (dataAtendimentos || []).map(a => {
                let hora = '--:--';
                const dataReferencia = a.createdAt || a.dataChegada; 
                if (dataReferencia) {
                    try { hora = new Date(dataReferencia).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch(e){}
                }
                return {
                    ...a,
                    paciente_nome: a.nomePaciente || 'Paciente (P.A.)', // Chave exata do banco
                    horario: hora,
                    convenio: a.unidade || 'SUS',
                    tipo_atendimento: 'Demanda Espontânea',
                    classificacao_risco: a.classificacao_risco || a.classificacaoRisco || 'Não Classificado'
                };
            });

            // 5. Junta e Ordena (Tolerando snake_case das consultas e camelCase dos atendimentos)
            const filaUnificada = [...consultasNormalizadas, ...atendimentosNormalizados].sort((a, b) => {
                if (a.status === 'Em Atendimento') return -1;
                if (b.status === 'Em Atendimento') return 1;
                
                const dataA = a.created_at || a.createdAt || 0;
                const dataB = b.created_at || b.createdAt || 0;
                return new Date(dataA) - new Date(dataB);
            });

            setFila(filaUnificada);

            const emAtendimento = filaUnificada.find(c => c.status === 'Em Atendimento');
            if (emAtendimento && !pacienteAtivo) setPacienteAtivo(emAtendimento);

        } catch (error) {
            console.error("Erro ao buscar fila:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFila(); }, []);

    // Buscar Históricos
    useEffect(() => {
        if (!pacienteAtivo) return;
        if (activeTab === 'evo') buscarHistorico('prontuario_evolucao', setHistoricoEvo);
        if (activeTab === 'rec') buscarHistorico('prontuario_receitas', setHistoricoRec);
        if (activeTab === 'exa') buscarHistorico('prontuario_exames', setHistoricoExa);
    }, [activeTab, pacienteAtivo]);

    const buscarHistorico = async (tabela, setEstado) => {
        setLoadingHistorico(true);
        try {
            let query = supabase.from(tabela).select('*').order('created_at', { ascending: false });
            if (pacienteAtivo.paciente_id) query = query.eq('paciente_id', pacienteAtivo.paciente_id);
            else query = query.eq('paciente_nome', pacienteAtivo.paciente_nome);
            const { data, error } = await query;
            if (error) throw error;
            setEstado(data || []);
        } catch (error) {
            console.error(`Erro histórico ${tabela}:`, error);
        } finally {
            setLoadingHistorico(false);
        }
    };

    const handleChamarPaciente = async (consulta) => {
        try {
            if (pacienteAtivo && pacienteAtivo.id !== consulta.id && pacienteAtivo.status === 'Em Atendimento') {
                if (!window.confirm("Deseja finalizar o atendimento atual e chamar o próximo?")) return;
                await supabase.from('consultas').update({ status: 'Atendido' }).eq('id', pacienteAtivo.id);
            }
            await supabase.from('consultas').update({ status: 'Em Atendimento' }).eq('id', consulta.id);
            toast.success(`${consulta.paciente_nome} chamado ao consultório!`);
            setPacienteAtivo({ ...consulta, status: 'Em Atendimento' });
            setActiveTab('painel'); 
            fetchFila();
        } catch (error) { toast.error("Erro ao chamar o paciente."); }
    };

    const handleFinalizar = async () => {
        if (!pacienteAtivo) return;
        try {
            await supabase.from('consultas').update({ status: 'Atendido' }).eq('id', pacienteAtivo.id);
            toast.success("Atendimento finalizado!");
            setPacienteAtivo(null);
            setActiveTab('painel');
            fetchFila();
        } catch (error) { toast.error("Erro ao finalizar."); }
    };

    // Funções de Salvar (Guarda no Supabase)
    const salvarRegistro = async (tabela, texto, setTexto, setSalvando, funcaoBusca) => {
        if (!texto.trim()) return toast.error("Preencha o campo para guardar.");
        setSalvando(true);
        try {
            const payload = { paciente_id: pacienteAtivo.paciente_id || null, paciente_nome: pacienteAtivo.paciente_nome, consulta_id: pacienteAtivo.id, medico: medicoLogado, texto };
            await supabase.from(tabela).insert([payload]);
            toast.success("Registo guardado com sucesso!");
            setTexto('');
            funcaoBusca();
        } catch (error) { toast.error("Erro ao guardar registo."); } 
        finally { setSalvando(false); }
    };

    return (
        <div className="px-4 sm:px-6 pr-4 lg:pr-8 py-6 min-h-full bg-slate-50/50 font-sans flex flex-col h-full">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30"><FileSignature size={24} /></div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Prontuário Eletrónico</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Painel Clínico - {medicoLogado}</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* FILA DE ESPERA */}
                <div className="w-80 bg-white/60 backdrop-blur-lg rounded-2xl shadow-sm border border-white/50 flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-white/60 bg-white/40"><h3 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={16} /> Fila de Espera</h3></div>
                    <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={24}/></div> 
                        : fila.length === 0 ? <div className="text-center py-10 text-slate-400"><User size={32} className="mx-auto mb-2 opacity-30"/><p className="text-[10px] font-bold uppercase tracking-widest">Nenhum doente a aguardar.</p></div> 
                        : fila.map(consulta => (
                            <div key={consulta.id} className={`p-3 rounded-xl border-2 transition-all cursor-pointer group ${pacienteAtivo?.id === consulta.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`} onClick={() => setPacienteAtivo(consulta)}>
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <div className="text-xs font-black text-slate-800 uppercase line-clamp-1" title={consulta.paciente_nome}>
                                        {consulta.paciente_nome}
                                    </div>
                                    
                                    {consulta.tipo_atendimento === 'Demanda Espontânea' ? (
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0 border ${CORES_RISCO[consulta.classificacao_risco] || CORES_RISCO['Não Classificado']}`} title={`Triagem: ${consulta.classificacao_risco}`}>
                                            {consulta.classificacao_risco}
                                        </span>
                                    ) : (
                                        <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0" title="Consultório / Agendado">
                                            AGENDA
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase mt-2">
                                    <span className="flex items-center gap-1"><Clock size={12} className={consulta.status === 'Aguardando' ? 'text-amber-500' : 'text-purple-500'} /> {consulta.horario?.substring(0,5) || '--:--'}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span><span className="text-blue-500">{consulta.convenio}</span>
                                </div>
                                {consulta.status === 'Aguardando' && pacienteAtivo?.id !== consulta.id && (
                                    <button onClick={(e) => { e.stopPropagation(); handleChamarPaciente(consulta); }} className="w-full mt-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"><Play size={10} /> Chamar</button>
                                )}
                                {consulta.status === 'Em Atendimento' && <div className="mt-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[9px] font-black uppercase tracking-widest text-center border border-purple-200">Em Atendimento</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ÁREA CENTRAL */}
                <div className="flex-1 bg-white/60 backdrop-blur-lg rounded-2xl shadow-sm border border-white/50 overflow-hidden flex flex-col">
                    {!pacienteAtivo ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><Stethoscope size={64} className="mb-4 opacity-20" /><h2 className="text-lg font-black uppercase tracking-tight text-slate-600 mb-1">Consultório Livre</h2><p className="text-xs font-bold uppercase tracking-widest">Selecione um paciente da fila.</p></div>
                    ) : (
                        <div className="flex flex-col h-full relative">
                            {/* Header Paciente */}
                            <div className="p-6 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-indigo-900 uppercase tracking-tight flex items-center gap-2">{pacienteAtivo.paciente_nome}</h2>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase mt-2">
                                        <span>CPF: {pacienteAtivo.paciente_cpf || 'Não inf.'}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-200"></span>
                                        {pacienteAtivo.tipo_atendimento === 'Demanda Espontânea' ? (
                                            <span className="px-2 py-1 bg-rose-100 text-rose-700 border border-rose-200 text-[10px] rounded-md font-black uppercase tracking-widest flex items-center gap-1">
                                                🚨 Pronto Atendimento
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] rounded-md font-black uppercase tracking-widest flex items-center gap-1">
                                                🗓️ Agendado
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right"><button onClick={handleFinalizar} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"><CheckCircle2 size={16} /> Finalizar</button></div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                                
                                {/* PAINEL PRINCIPAL */}
                                {activeTab === 'painel' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Ações Clínicas Rápidas</h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                            {[
                                                { id: 'evo', icon: FileText, label: 'Evolução', desc: 'Anotações clínicas', color: 'text-blue-500', bg: 'bg-blue-50', border: 'hover:border-blue-300' },
                                                { id: 'rec', icon: Pill, label: 'Receita', desc: 'Prescrição digital', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'hover:border-emerald-300' },
                                                { id: 'exa', icon: Activity, label: 'Exames', desc: 'Solicitar Exames', color: 'text-violet-500', bg: 'bg-violet-50', border: 'hover:border-violet-300' },
                                                { id: 'gui', icon: FileSignature, label: 'Documentos', desc: 'AIH, APA, Atestados', color: 'text-rose-500', bg: 'bg-rose-50', border: 'hover:border-rose-300' },
                                            ].map(btn => (
                                                <button key={btn.id} onClick={() => setActiveTab(btn.id)} className={`p-5 rounded-2xl border-2 border-transparent bg-white shadow-sm transition-all group text-left ${btn.border}`}>
                                                    <div className={`w-10 h-10 rounded-xl ${btn.bg} ${btn.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}><btn.icon size={20} /></div>
                                                    <h4 className="text-sm font-black uppercase text-slate-800">{btn.label}</h4><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{btn.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* EVOLUÇÃO */}
                                {activeTab === 'evo' && (
                                    <div className="animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-4"><button onClick={() => setActiveTab('painel')} className="p-2 hover:bg-slate-200/50 rounded-lg text-slate-500"><ArrowLeft size={18} /></button><h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2"><FileText className="text-blue-500" size={18}/> Evolução Clínica</h3></div>
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 shrink-0">
                                            <textarea value={textoEvolucao} onChange={e => setTextoEvolucao(e.target.value)} className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none placeholder:text-slate-400" placeholder="S.O.A.P. (Sintomas, Exame Físico, Conduta...)" />
                                            <div className="flex justify-end mt-3"><button onClick={() => salvarRegistro('prontuario_evolucao', textoEvolucao, setTextoEvolucao, setSalvandoEvolucao, () => buscarHistorico('prontuario_evolucao', setHistoricoEvo))} disabled={salvandoEvolucao} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wide shadow-md transition-all flex items-center gap-2 disabled:opacity-50">{salvandoEvolucao ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar</button></div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            {loadingHistorico ? <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : historicoEvo.map((evo) => (
                                                <div key={evo.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-3"><div className="flex justify-between mb-2"><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{evo.medico}</span><span className="text-[10px] font-bold text-slate-400">{new Date(evo.created_at).toLocaleString()}</span></div><p className="text-sm text-slate-600 whitespace-pre-wrap">{evo.texto}</p></div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* RECEITUÁRIO */}
                                {activeTab === 'rec' && (
                                    <div className="animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-4"><button onClick={() => setActiveTab('painel')} className="p-2 hover:bg-slate-200/50 rounded-lg text-slate-500"><ArrowLeft size={18} /></button><h3 className="text-sm font-black text-emerald-700 uppercase flex items-center gap-2"><Pill className="text-emerald-500" size={18}/> Prescrição Médica</h3></div>
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 mb-6 shrink-0">
                                            <textarea value={textoReceita} onChange={e => setTextoReceita(e.target.value)} className="w-full h-32 bg-emerald-50/30 border border-emerald-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none placeholder:text-slate-400" placeholder="Insira os medicamentos, posologia..." />
                                            <div className="flex justify-end mt-3"><button onClick={() => { salvarRegistro('prontuario_receitas', textoReceita, setTextoReceita, setSalvandoReceita, () => buscarHistorico('prontuario_receitas', setHistoricoRec)); imprimirReceitaPdf(pacienteAtivo, textoReceita, medicoLogado); }} disabled={salvandoReceita} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wide shadow-md transition-all flex items-center gap-2"><Printer size={16} /> Guardar e Imprimir</button></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            {historicoRec.map((rec) => (<div key={rec.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><div className="flex justify-between mb-2"><span className="text-[10px] font-bold text-slate-400">{new Date(rec.created_at).toLocaleDateString()}</span><button onClick={() => imprimirReceitaPdf(pacienteAtivo, rec.texto, rec.medico)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Reimprimir Receita"><Printer size={14}/></button></div><p className="text-xs text-slate-600">{rec.texto}</p></div>))}
                                        </div>
                                    </div>
                                )}

                                {/* EXAMES */}
                                {activeTab === 'exa' && (
                                    <div className="animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-4"><button onClick={() => setActiveTab('painel')} className="p-2 hover:bg-slate-200/50 rounded-lg text-slate-500"><ArrowLeft size={18} /></button><h3 className="text-sm font-black text-violet-700 uppercase flex items-center gap-2"><Activity className="text-violet-500" size={18}/> Solicitação de Exames</h3></div>
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-violet-100 mb-6 shrink-0">
                                            <textarea value={textoExame} onChange={e => setTextoExame(e.target.value)} className="w-full h-32 bg-violet-50/30 border border-violet-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20 resize-none placeholder:text-slate-400" placeholder="Ex: Hemograma completo, Raio-X Torax..." />
                                            <div className="flex justify-end mt-3"><button onClick={() => { salvarRegistro('prontuario_exames', textoExame, setTextoExame, setSalvandoExame, () => buscarHistorico('prontuario_exames', setHistoricoExa)); imprimirExamePdf(pacienteAtivo, textoExame, medicoLogado); }} disabled={salvandoExame} className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-black uppercase tracking-wide shadow-md transition-all flex items-center gap-2"><Printer size={16} /> Imprimir Pedido</button></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            {historicoExa.map((exa) => (<div key={exa.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><div className="flex justify-between mb-2"><span className="text-[10px] font-bold text-slate-400">{new Date(exa.created_at).toLocaleDateString()}</span><Printer size={14} className="text-slate-400 cursor-pointer" onClick={() => imprimirExamePdf(pacienteAtivo, exa.texto, exa.medico)} /></div><p className="text-xs text-slate-600">{exa.texto}</p></div>))}
                                        </div>
                                    </div>
                                )}

                                {/* GUIAS E DOCUMENTOS */}
                                {activeTab === 'gui' && (
                                    <div className="animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-6"><button onClick={() => setActiveTab('painel')} className="p-2 hover:bg-slate-200/50 rounded-lg text-slate-500"><ArrowLeft size={18} /></button><h3 className="text-sm font-black text-rose-700 uppercase flex items-center gap-2"><FileSignature className="text-rose-500" size={18}/> Guias e Documentos</h3></div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <button onClick={() => setIsAihModalOpen(true)} className="p-6 bg-white border border-rose-100 hover:border-rose-300 hover:shadow-md rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                                                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><FilePlus2 size={24}/></div>
                                                <span className="font-black text-slate-800 uppercase">Gerar AIH (Internação)</span>
                                            </button>
                                            <button onClick={() => setIsApaModalOpen(true)} className="p-6 bg-white border border-rose-100 hover:border-rose-300 hover:shadow-md rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                                                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><FilePlus2 size={24}/></div>
                                                <span className="font-black text-slate-800 uppercase">Gerar APA (Ambulatório)</span>
                                            </button>
                                            <button onClick={() => toast('Gerando Atestado Médico...', {icon: '🖨️'})} className="p-6 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><FileText size={24}/></div>
                                                <span className="font-black text-slate-800 uppercase">Atestado Médico</span>
                                            </button>
                                            <button onClick={() => toast('Gerando Declaração...', {icon: '🖨️'})} className="p-6 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Clock size={24}/></div>
                                                <span className="font-black text-slate-800 uppercase">Declaração Comparecimento</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAIS DE DOCUMENTOS */}
            {isAihModalOpen && (
                <div className="fixed top-16 inset-x-0 bottom-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-7xl max-h-[95vh] overflow-y-auto relative shadow-2xl">
                        <button onClick={() => setIsAihModalOpen(false)} className="absolute top-4 right-4 z-50 p-2 bg-slate-100 hover:bg-slate-200 hover:text-rose-600 rounded-full text-slate-500 transition-colors">
                            <X size={20} />
                        </button>
                        <Aih paciente={pacienteAtivo} />
                    </div>
                </div>
            )}

            {isApaModalOpen && (
                <div className="fixed top-16 inset-x-0 bottom-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-7xl max-h-[95vh] overflow-y-auto relative shadow-2xl">
                        <button onClick={() => setIsApaModalOpen(false)} className="absolute top-4 right-4 z-50 p-2 bg-slate-100 hover:bg-slate-200 hover:text-rose-600 rounded-full text-slate-500 transition-colors">
                            <X size={20} />
                        </button>
                        <Apa paciente={pacienteAtivo} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PEP;
