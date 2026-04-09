import React, { useState, useEffect, useRef } from 'react';

import { supabase } from '../services/supabase';


import {
    User, Stethoscope, ShieldCheck, Activity, Search, Save,
    CheckCircle2, Paperclip, Loader2, Calendar, MapPin, Clock, Phone, Syringe, FileText, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SigtapAutocomplete } from '../components/SigtapAutocomplete';

const NewSurgery = () => {
    const [loading, setLoading] = useState(false);

    // Estados para dados externos (listas)
    const [settings, setSettings] = useState({
        cirurgioes: [],
        convenios: [],
        status: [],
        locais: [],
        cidades: [],
        anestesias: []
    });

    // --- ESTADO PARA MÚLTIPLOS ARQUIVOS (NOVO) ---
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);

    // Estado do Formulário Completo com VALORES PADRÃO
    const [formData, setFormData] = useState({
        paciente: '',
        cns: '',
        nascimento: '',
        telefone: '',
        telefone2: '',
        municipio: 'Porto Feliz', // Padrão

        cirurgiao: '',
        especialidade: '',
        procedimento: '',
        anestesia: '',
        convenio: 'SUS',       // Padrão
        prioridade: 'ELETIVA', // Padrão
        sala: '',

        dataAtendimento: '',
        dataAutorizacao: '',
        dataAgendado: '',
        horario: '',

        aih: false,
        autorizada: false,
        apa: false,
        opme: false,

        status: 'Aguardando',
        obs: ''
    });

    // --- CARREGAMENTO INICIAL ---
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Carrega Configurações Gerais
                const { data: settingsData } = await supabase.from('settings').select('data').eq('id', 'general').maybeSingle();
                if (settingsData && settingsData.data) {
                    setSettings(settingsData.data);
                }
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                toast.error("Erro de conexão ao banco de dados.");
            }
        };
        loadInitialData();
    }, []);

    // Cálculo de idade
    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return "--";
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
            idade--;
        }
        return idade >= 0 ? `${idade} anos` : "--";
    };

    // --- LÓGICA DE MÚLTIPLOS ARQUIVOS (NOVA) ---
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newFiles]);
            toast.success(`${newFiles.length} arquivo(s) adicionado(s)!`);
        }
    };

    const removeFile = (indexToRemove) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // --- ENVIO DO FORMULÁRIO ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.paciente || !formData.procedimento) {
            return toast.error("Por favor, preencha o Nome e o Procedimento!");
        }

        setLoading(true);
        try {
            // Upload Múltiplo em Paralelo
            const uploadPromises = selectedFiles.map(async (file) => {
                const fileRef = ref(storage, `documentos/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(fileRef, file);
                const url = await getDownloadURL(uploadResult.ref);
                return { name: file.name, url: url }; // Salva nome e url
            });

            const uploadedFilesData = await Promise.all(uploadPromises);

            // Salva no Supabase
            const payload = {
                ...formData,
                arquivos: uploadedFilesData, // Lista de arquivos novos
                // Mantém compatibilidade com sistema antigo (salva o primeiro link se houver)
                arquivoUrl: uploadedFilesData.length > 0 ? uploadedFilesData[0].url : '',
                createdAt: new Date().toISOString()
            };

            const { error } = await supabase.from('surgeries').insert([payload]);
            if (error) throw error;

            toast.success("Cirurgia cadastrada com sucesso!");

            // Limpa o formulário respeitando os padrões
            setFormData({
                ...formData,
                paciente: '',
                cns: '',
                nascimento: '',
                telefone: '',
                cirurgiao: '',
                especialidade: '',
                procedimento: '',
                anestesia: '',
                obs: '',
                dataAgendado: '',
                status: 'Aguardando',
                municipio: 'Porto Feliz',
                convenio: 'SUS',
                prioridade: 'ELETIVA'
            });
            setSearchTerm('');
            setSelectedFiles([]);

        } catch (error) {
            console.error(error);
            toast.error("Ocorreu um erro ao salvar.");
        } finally {
            setLoading(false);
        }
    };

    const baseInputStyle = "w-full h-9 px-3 py-2 bg-white/50 border border-white/60 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-slate-800 placeholder:text-slate-500";

    return (
        <div className="px-4 sm:px-6 pr-8 py-6 min-h-full bg-slate-50/50 font-sans">

            <div className="mb-6 border-b border-slate-200/60 pb-4">
                <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                    Novo Cadastro Cirúrgico
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="max-w-7xl space-y-4 pb-16">

                {/* --- BLOCO 1: DADOS PESSOAIS --- */}
                <div className="bg-white/60 backdrop-blur-lg p-5 rounded-lg shadow-sm border border-white/50">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-5 flex items-center gap-2">
                        <User size={14} /> Dados Pessoais e Contato
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Nome Completo</label>
                            <input value={formData.paciente} onChange={e => setFormData({ ...formData, paciente: e.target.value })} className={baseInputStyle} placeholder="Nome do paciente..." />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">CNS</label>
                            <input value={formData.cns} onChange={e => setFormData({ ...formData, cns: e.target.value })} className={baseInputStyle} placeholder="000.0000.0000.0000" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Nascimento</label>
                            <input type="date" value={formData.nascimento} onChange={e => setFormData({ ...formData, nascimento: e.target.value })} className={baseInputStyle} />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Telefone</label>
                            <input value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} className={baseInputStyle} placeholder="(00) 00000-0000" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Tel. 2</label>
                            <input value={formData.telefone2} onChange={e => setFormData({ ...formData, telefone2: e.target.value })} className={baseInputStyle} placeholder="(00) 00000-0000" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Cidade</label>
                            <select value={formData.municipio} onChange={e => setFormData({ ...formData, municipio: e.target.value })} className={`${baseInputStyle} uppercase`}>
                                <option value="">Selecione...</option>
                                {settings.cidades?.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Idade</label>
                            <div className="bg-slate-100 text-slate-400 border border-slate-200 rounded-lg h-9 flex items-center justify-center font-semibold text-sm italic">
                                {calcularIdade(formData.nascimento)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- BLOCO 2: PROCEDIMENTO E EQUIPE --- */}
                <div className="bg-white/60 backdrop-blur-lg p-5 rounded-lg shadow-sm border border-white/50">
                    <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-5 flex items-center gap-2">
                        <Stethoscope size={14} /> Procedimento e Equipe
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2 relative">
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Procedimento - SIGTAP</label>
                            <SigtapAutocomplete
                                value={formData.procedimento}
                                onSelect={(selecionado) => setFormData({ ...formData, procedimento: selecionado.nome })}
                                className={`${baseInputStyle} pl-10`}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Cirurgião</label>
                            <select value={formData.cirurgiao} onChange={e => setFormData({ ...formData, cirurgiao: e.target.value })} className={`${baseInputStyle} uppercase`}>
                                <option value="">Selecione...</option>
                                {settings.cirurgioes?.map((m, idx) => {
                                    const label = typeof m === 'string' ? m : m.nome;
                                    return <option key={idx} value={label}>{label}</option>;
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Especialidade</label>
                            <select value={formData.especialidade} onChange={e => setFormData({ ...formData, especialidade: e.target.value })} className={`${baseInputStyle} uppercase`}>
                                <option value="">Selecione...</option>
                                {settings.especialidades?.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Anestesia</label>
                            <select value={formData.anestesia} onChange={e => setFormData({ ...formData, anestesia: e.target.value })} className={`${baseInputStyle} uppercase`}>
                                <option value="">Selecione...</option>
                                {settings.anestesias?.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Convênio</label>
                            <select value={formData.convenio} onChange={e => setFormData({ ...formData, convenio: e.target.value })} className={`${baseInputStyle} uppercase`}>
                                <option value="">Selecione...</option>
                                {settings.convenios?.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Prioridade</label>
                            <select value={formData.prioridade} onChange={e => setFormData({ ...formData, prioridade: e.target.value })} className={`${baseInputStyle} uppercase`}>
                                <option value="PRIORIDADE">PRIORIDADE</option>
                                <option value="ELETIVA">ELETIVA</option>
                                <option value="URGÊNCIA">URGÊNCIA</option>
                                <option value="EMERGÊNCIA">EMERGÊNCIA</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Sala</label>
                            <select value={formData.sala} onChange={e => setFormData({ ...formData, sala: e.target.value })} className={`${baseInputStyle} uppercase`}>
                                <option value="">Selecione...</option>
                                {settings.locais?.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- BLOCO 3: DATAS E AUTORIZAÇÕES --- */}
                <div className="bg-white/60 backdrop-blur-lg p-5 rounded-lg shadow-sm border border-white/50">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-5 flex items-center gap-2">
                        <ShieldCheck size={14} /> Datas/Autorizações
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Atendimento</label>
                            <input type="date" value={formData.dataAtendimento} onChange={e => setFormData({ ...formData, dataAtendimento: e.target.value })} className={baseInputStyle} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Autorização</label>
                            <input type="date" value={formData.dataAutorizacao} onChange={e => setFormData({ ...formData, dataAutorizacao: e.target.value })} className={baseInputStyle} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Agendamento</label>
                            <input
                                type="date"
                                value={formData.dataAgendado}
                                onChange={e => setFormData({
                                    ...formData,
                                    dataAgendado: e.target.value,
                                    status: e.target.value ? 'Agendado' : 'Aguardando'
                                })}
                                className={baseInputStyle}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1 mb-1.5 block">Horário</label>
                            <input type="time" value={formData.horario} onChange={e => setFormData({ ...formData, horario: e.target.value })} className={baseInputStyle} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[{ id: 'aih', label: 'AIH' }, { id: 'autorizada', label: 'Autorizada' }, { id: 'apa', label: 'APA' }, { id: 'opme', label: 'OPME' }].map(check => (
                            <button key={check.id} type="button" onClick={() => setFormData({ ...formData, [check.id]: !formData[check.id] })} className={`h-9 px-4 rounded-lg border flex items-center justify-between transition-all group ${formData[check.id] ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                                <span className="text-[10px] font-bold uppercase tracking-wide">{check.label}</span>
                                <CheckCircle2 size={16} className={`transition-all ${formData[check.id] ? 'opacity-100 scale-110' : 'opacity-30 group-hover:opacity-50'}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- BLOCO 4: STATUS E ANEXOS MULTIPLOS (ATUALIZADO) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/60 backdrop-blur-lg p-8 rounded-[3rem] shadow-sm border border-white/50 flex flex-col justify-between">
                        <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Activity size={16} /> Status e Observação
                        </h3>

                        <div className="space-y-6">
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className={`${baseInputStyle} uppercase`}>
                                <option value="Aguardando">Aguardando</option>
                                {settings.status?.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>

                            <textarea value={formData.obs} onChange={e => setFormData({ ...formData, obs: e.target.value })} rows="4" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300" placeholder="Observações clínicas ou administrativas..."></textarea>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-lg border border-white/50 p-8 rounded-[3rem] shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest mb-2 text-slate-600 flex items-center gap-2">
                                <Paperclip size={16} /> Documentação
                            </h3>
                            <p className="text-xs font-bold text-slate-400">Anexe pedidos, laudos e exames.</p>
                        </div>

                        {/* INPUT FILE ESCONDIDO ACIONADO PELO REF */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple // Permite múltiplos arquivos
                            onChange={handleFileSelect}
                        />

                        <div className="space-y-3 mt-4">
                            {/* Botão de Adicionar */}
                            <div
                                onClick={() => fileInputRef.current.click()}
                                className="p-8 border-2 border-dashed border-white/60 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/40 transition-all group"
                            >
                                <div className="p-3 bg-white/50 backdrop-blur-md rounded-full shadow-sm ring-1 ring-white/50 group-hover:ring-blue-100">
                                    <Paperclip size={20} className="text-slate-500 group-hover:text-blue-600" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-blue-600">
                                    Adicionar Arquivos
                                </span>
                            </div>

                            {/* Lista de Arquivos Selecionados */}
                            {selectedFiles.length > 0 && (
                                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText size={16} className="text-blue-500 shrink-0" />
                                                <span className="text-[10px] font-bold text-blue-700 truncate">{file.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="p-1 hover:bg-rose-100 rounded-full text-blue-300 hover:text-rose-500 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-5">
                    <button disabled={loading} type="submit" className="bg-blue-600 text-white h-10 px-8 rounded-lg font-bold text-xs uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Salvar Cadastro
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewSurgery;