import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logAction } from '../utils/logger';
import imageCompression from 'browser-image-compression';

const compressImage = async (file) => {
    const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true
    };
    try {
        return await imageCompression(file, options);
    } catch (error) {
        console.error("Erro na compressão:", error);
        return file;
    }
};

import { Plus, Trash2, Edit2, Check, X, UploadCloud, FileText, Loader2, AlertTriangle, CheckCircle, FileSpreadsheet, ChevronRight, Search, Clock, User, Activity, Palette, Users, Building, Syringe, MapPin, Stethoscope, ShieldCheck, LayoutGrid, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProcedureManager from './ProcedureManager';
import UserManagement from './UserManagement';
import { usePermission } from '../contexts/PermissionContext';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { maskCPF } from '../utils/masks';

// --- BASE SUS TAB COMPONENT ---
const BaseSUSTab = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState('Aguardando arquivo do SIGTAP...');

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus('Lendo arquivo...');
        const reader = new FileReader();

        // ISO-8859-1 garante que os acentos do governo venham corretos
        reader.readAsText(file, 'ISO-8859-1');

        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const lines = text.split('\n');
                const parsedData = [];

                // Processa linha por linha do TXT
                lines.forEach(line => {
                    if (line.length > 20) {
                        const codigo = line.substring(0, 10).trim();
                        const nome = line.substring(10, 260).trim();

                        if (codigo && nome) {
                            parsedData.push({ codigo, nome });
                        }
                    }
                });

                if (parsedData.length === 0) {
                    return toast.error("Nenhum procedimento encontrado. Verifique se é o arquivo tb_procedimento.txt");
                }

                uploadDataInBatches(parsedData);

            } catch (error) {
                console.error(error);
                toast.error("Erro ao ler o arquivo TXT.");
            }
        };
    };

    const uploadDataInBatches = async (data) => {
        setLoading(true);
        setTotal(data.length);
        let currentBatchIndex = 0;
        const batchSize = 450;
        const totalBatches = Math.ceil(data.length / batchSize);

        try {
            for (let i = 0; i < data.length; i += batchSize) {
                const chunk = data.slice(i, i + batchSize);
                const sigtapRecords = chunk.map(item => {
                    if (item.codigo && item.nome) {
                        return {
                            id: String(item.codigo),
                            codigo: String(item.codigo),
                            nome: item.nome.toUpperCase()
                        };
                    }
                    return null;
                }).filter(Boolean);

                if (sigtapRecords.length > 0) {
                    const { error } = await supabase.from('sigtap').upsert(sigtapRecords, { onConflict: 'id' });
                    if (error) throw error;
                    await logAction('ATUALIZAÇÃO SIGTAP', `Atualizou ${sigtapRecords.length} procedimentos (Lote ${currentBatchIndex}).`);
                }

                currentBatchIndex++;
                setProgress(Math.min((i + batchSize), data.length));
                setStatus(`Processando lote ${currentBatchIndex} de ${totalBatches}...`);

                await new Promise(resolve => setTimeout(resolve, 50));
            }

            setStatus('Importação Concluída!');
            toast.success(`${data.length} procedimentos atualizados com sucesso!`);
        } catch (error) {
            console.error(error);
            setStatus('Erro na importação.');
            toast.error("Falha na conexão com o banco.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-12">
            <div className="bg-white/60 backdrop-blur-lg p-10 rounded-[2.5rem] shadow-sm border border-white/60 text-center space-y-8">

                <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-slate-800 shadow-lg shadow-blue-200">
                    <FileText size={36} />
                </div>

                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Importador SIGTAP</h2>
                    <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-wide">
                        Aceita o arquivo oficial <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">tb_procedimento.txt</span>
                    </p>
                </div>

                {!loading && progress === 0 && (
                    <label className="block w-full cursor-pointer group">
                        <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                        <div className="w-full py-8 border-2 border-dashed border-white/80 rounded-2xl bg-white/60 group-hover:bg-blue-50 group-hover:border-blue-300 transition-all flex flex-col items-center gap-2">
                            <UploadCloud size={28} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                            <span className="text-xs font-black text-slate-500 group-hover:text-blue-600 uppercase tracking-widest transition-colors">
                                Arraste o arquivo TXT ou clique aqui
                            </span>
                        </div>
                    </label>
                )}

                {loading && (
                    <div className="space-y-6">
                        <div className="w-full bg-white/70 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                                style={{ width: `${(progress / total) * 100}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            <span>{progress} processados</span>
                            <span>{total} total</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-blue-600 animate-pulse">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-xs font-black uppercase">{status}</span>
                        </div>
                    </div>
                )}

                {!loading && progress > 0 && progress === total && (
                    <div className="bg-emerald-50 text-emerald-600 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center gap-2 font-black">
                        <CheckCircle size={32} />
                        <span className="uppercase text-sm tracking-widest">Importação Finalizada!</span>
                        <span className="text-[11px] opacity-70 font-bold">Base SUS atualizada com sucesso.</span>
                    </div>
                )}

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3 text-left shadow-sm">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                        ATENÇÃO: Este processo pode levar alguns minutos pois o arquivo do governo é grande. Não saia desta aba até a barra completar.
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- PERMISSÕES ESCALA COMPONENT ---
const PermissoesEscalaTab = () => {
    const [permissions, setPermissions] = useState({
        Assistente: {
            verEscalaTodos: true, alternarVisualizacao: false, editarEscala: true, aplicarTemplate: false, excluirMes: false,
            verRelatorioFinanceiro: true, verFolhaPonto: true, verTemplate: true, gerenciarCirurgias: true, verMapaCirurgicoLeitura: false, gerenciarMapasCirurgicos: false
        },
        Coordenador: {
            verEscalaTodos: true, alternarVisualizacao: true, editarEscala: true, aplicarTemplate: true, excluirMes: true,
            verRelatorioFinanceiro: true, verFolhaPonto: true, verTemplate: true, gerenciarCirurgias: true, verMapaCirurgicoLeitura: true, gerenciarMapasCirurgicos: true
        },
        'Médico': {
            verEscalaTodos: false, alternarVisualizacao: false, editarEscala: false, aplicarTemplate: false, excluirMes: false,
            verRelatorioFinanceiro: false, verFolhaPonto: false, verTemplate: false, gerenciarCirurgias: false, verMapaCirurgicoLeitura: true, gerenciarMapasCirurgicos: false
        }
    });
    const [activeRole, setActiveRole] = useState('Assistente');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPermissions = async () => {
            const { data, error } = await supabase.from('settings').select('data').eq('id', 'permissions').maybeSingle();
            if (!error && data && data.data) {
                // Merge com default para garantir que novas chaves existam
                setPermissions(prev => ({
                    ...prev,
                    ...data.data,
                    Assistente: { ...prev.Assistente, ...(data.data.Assistente || {}) },
                    Coordenador: { ...prev.Coordenador, ...(data.data.Coordenador || {}) },
                    'Médico': { ...prev['Médico'], ...(data.data['Médico'] || {}) }
                }));
            }
            setLoading(false);
        };
        loadPermissions();
    }, []);

    const handleToggle = async (key) => {
        const updated = {
            ...permissions,
            [activeRole]: {
                ...permissions[activeRole],
                [key]: !permissions[activeRole][key]
            }
        };
        setPermissions(updated);
        
        try {
            await supabase.from('settings').upsert({ id: 'permissions', data: updated });
            await logAction('ALTERAÇÃO DE PERMISSÃO', `Permissão "${key}" alterada no perfil "${activeRole}".`);
            toast.success('Permissões atualizadas!');
        } catch (err) {
            toast.error('Erro ao salvar.');
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={32} /></div>;

    const sections = [
        {
            title: 'ESCALAS',
            items: [
                { key: 'verEscalaTodos', label: 'Ver Escala de Todos' },
                { key: 'alternarVisualizacao', label: 'Alternar Visualização (Todas/Minha)' },
                { key: 'editarEscala', label: 'Editar Escala' },
                { key: 'aplicarTemplate', label: 'Aplicar Template' },
                { key: 'excluirMes', label: 'Excluir Mês' }
            ]
        },
        {
            title: 'MÓDULOS',
            items: [
                { key: 'verRelatorioFinanceiro', label: 'Ver Relatório Financeiro' },
                { key: 'verFolhaPonto', label: 'Ver Folha de Ponto' },
                { key: 'verTemplate', label: 'Ver Template' },
                { key: 'gerenciarCirurgias', label: 'Gerenciar Cirurgias' },
                { key: 'verMapaCirurgicoLeitura', label: 'Ver Mapa Cirurgico (Somente Leitura)' },
                { key: 'gerenciarMapasCirurgicos', label: 'Gerenciar Mapas Cirurgicos' }
            ]
        }
    ];

    const activeCount = Object.values(permissions[activeRole]).filter(Boolean).length;
    const totalCount = Object.keys(permissions[activeRole]).length;

    return (
        <div className="bg-white/60 rounded-2xl border border-white/40 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in max-w-3xl">
            <div className="px-6 py-4 border-b border-white/40 bg-transparent flex flex-col gap-4">
                <div className="flex gap-4 border-b border-white/60">
                    {['Assistente', 'Coordenador', 'Médico'].map(role => (
                        <button
                            key={role}
                            onClick={() => setActiveRole(role)}
                            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${
                                activeRole === role 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
                
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100/50 flex items-start gap-3">
                    <p className="text-xs text-amber-800 font-medium">
                        <span className="font-bold">Nota:</span> Administradores (ADM) sempre têm acesso total a todas as funções.
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black text-slate-500 tracking-widest uppercase">{activeRole}</h3>
                    <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-md uppercase tracking-widest">{activeCount}/{totalCount} ativas</span>
                </div>

                {sections.map(section => (
                    <div key={section.title} className="space-y-4">
                        <div className="flex items-center gap-3">
                            {section.title === 'ESCALAS' ? <CalendarDays size={14} className="text-slate-500" /> : <LayoutGrid size={14} className="text-slate-500" />}
                            <span className="text-[11px] font-black text-slate-500 tracking-widest uppercase">{section.title}</span>
                            <div className="h-px bg-white/70 flex-1"></div>
                        </div>
                        <div className="space-y-2">
                            {section.items.map(item => (
                                <div key={item.key} className="flex justify-between items-center p-4 rounded-xl bg-transparent hover:bg-white/60 transition-colors border border-transparent hover:border-white/40 group">
                                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                                    <button 
                                        onClick={() => handleToggle(item.key)}
                                        className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${permissions[activeRole][item.key] ? 'bg-indigo-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 bg-white/60 w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${permissions[activeRole][item.key] ? 'translate-x-7' : 'translate-x-1'}`}></div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- IDENTIDADE VISUAL COMPONENT ---
const IdentidadeVisualTab = ({ data, setData }) => {
    const [nomeInstituicao, setNomeInstituicao] = useState(data.nomeInstituicao || 'Sistema de Saúde');
    const [corPrincipal, setCorPrincipal] = useState(data.corPrincipal || '#2563eb');
    const [logoUrl, setLogoUrl] = useState(data.logoUrl || '/logo.png');
    const [faviconUrl, setFaviconUrl] = useState(data.faviconUrl || '');
    const [executanteNome, setExecutanteNome] = useState(data.executanteNome || '');
    const [executanteCnes, setExecutanteCnes] = useState(data.executanteCnes || '');
    const [orgaoEmissor, setOrgaoEmissor] = useState(data.orgaoEmissor || '');
    const [marqueeText, setMarqueeText] = useState(data.marqueeText || 'A iSM Saúde atua em diversas unidades, com milhares de procedimentos realizados mensalmente. Parabéns, você também faz parte disso. É um privilégio para nós termos você conosco.');
    const [uploading, setUploading] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    const { reloadTheme } = useWhiteLabel();

    const handleSave = async () => {
        const updatedData = {
            ...data,
            nomeInstituicao,
            corPrincipal,
            logoUrl,
            faviconUrl,
            executanteNome,
            executanteCnes,
            orgaoEmissor,
            marqueeText
        };
        try {
            const { error } = await supabase.from('settings').upsert({ id: 'general', data: updatedData });
            if (error) throw error;
            await logAction('IDENTIDADE VISUAL', `Configurações de Identidade Visual alteradas.`);
            setData(updatedData);
            toast.success("Identidade Visual salva!");
            reloadTheme();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar Identidade Visual.");
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const compressedFile = await compressImage(file);
            const fileExt = compressedFile.name.split('.').pop() || 'png';
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, compressedFile);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
            setLogoUrl(publicUrlData.publicUrl);
            toast.success("Logo enviada! Salve para aplicar.");
        } catch (error) {
            console.error(error);
            toast.error("Erro no upload do logo.");
        } finally {
            setUploading(false);
        }
    };

    const handleFaviconUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingFavicon(true);
        try {
            const compressedFile = await compressImage(file);
            const fileExt = compressedFile.name.split('.').pop() || 'png';
            const fileName = `favicon-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, compressedFile);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
            setFaviconUrl(publicUrlData.publicUrl);
            toast.success("Favicon enviado! Salve para aplicar.");
        } catch (error) {
            console.error(error);
            toast.error("Erro no upload do favicon.");
        } finally {
            setUploadingFavicon(false);
        }
    };

    return (
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-8 animate-in fade-in max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Identidade Visual
            </h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Instituição/Prefeitura</label>
                    <input value={nomeInstituicao} onChange={e => setNomeInstituicao(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Estabelecimento Executante (AIH)</label>
                        <input value={executanteNome} onChange={e => setExecutanteNome(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700 uppercase" placeholder="Nome na AIH" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CNES do Estabelecimento Executante (AIH)</label>
                        <input value={executanteCnes} onChange={e => setExecutanteCnes(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" placeholder="0000000" maxLength="7" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cód. Órgão Emissor (AIH)</label>
                    <input value={orgaoEmissor} onChange={e => setOrgaoEmissor(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" placeholder="Ex: M354060001" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Texto Flutuante (Letreiro Hub)</label>
                    <textarea value={marqueeText} onChange={e => setMarqueeText(e.target.value)} className="w-full h-20 p-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700 resize-none" placeholder="Texto que desliza na tela inicial..." />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cor Principal (CSS Hex)</label>
                    <div className="flex gap-4 items-center">
                        <input type="color" value={corPrincipal} onChange={e => setCorPrincipal(e.target.value)} className="w-12 h-10 cursor-pointer rounded-lg border-none" />
                        <input value={corPrincipal} onChange={e => setCorPrincipal(e.target.value)} className="flex-1 h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 font-mono text-sm font-bold text-slate-700" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Logótipo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-white/60 border-2 border-dashed border-white/80 rounded-2xl flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                            {logoUrl ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" /> : <span className="text-[11px] uppercase font-bold text-slate-500">Sem Logo</span>}
                        </div>
                        <label className="px-5 py-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl hover:bg-white/60 hover:border-white hover:bg-white/90 text-slate-700 font-black uppercase tracking-wider text-xs rounded-xl cursor-pointer transition-all shadow-sm flex items-center gap-2 active:scale-95">
                            {uploading ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <UploadCloud size={16} className="text-blue-600" />}
                            {uploading ? 'A Enviar...' : 'Alterar Logótipo'}
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ícone da Aba do Navegador (Favicon)</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/60 border-2 border-dashed border-white/80 rounded-2xl flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                            {faviconUrl ? <img src={faviconUrl} alt="Favicon" className="max-w-full max-h-full object-contain" /> : <span className="text-[11px] uppercase font-bold text-slate-500">Padrão</span>}
                        </div>
                        <label className="px-5 py-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl hover:bg-white/60 hover:border-white hover:bg-white/90 text-slate-700 font-black uppercase tracking-wider text-xs rounded-xl cursor-pointer transition-all shadow-sm flex items-center gap-2 active:scale-95">
                            {uploadingFavicon ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <UploadCloud size={16} className="text-blue-600" />}
                            {uploadingFavicon ? 'A Enviar...' : 'Alterar Favicon'}
                            <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" disabled={uploadingFavicon} />
                        </label>
                    </div>
                </div>
                <div className="pt-6 border-t border-white/60 flex justify-end">
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-slate-800 font-black text-xs uppercase px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2">
                        <Check size={16} /> Gravar Identidade Visual
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- HUB PRINCIPAL CONFIG COMPONENT ---
const HubSettingsTab = ({ data, setData }) => {
    const [a1Name, setA1Name] = useState(data.hubAssistant1Name || 'Lucas');
    const [a1Whats, setA1Whats] = useState(data.hubAssistant1Whatsapp || '');
    const [a1Photo, setA1Photo] = useState(data.hubAssistant1Photo || '');
    const [a2Name, setA2Name] = useState(data.hubAssistant2Name || 'Will');
    const [a2Whats, setA2Whats] = useState(data.hubAssistant2Whatsapp || '');
    const [a2Photo, setA2Photo] = useState(data.hubAssistant2Photo || '');
    const [instagramLink, setInstagramLink] = useState(data.hubInstagramLink || '');
    const [carousel, setCarousel] = useState(data.hubCarouselImages || []);
    const [uploading, setUploading] = useState(false);
    const { reloadTheme } = useWhiteLabel();

    const handleSave = async () => {
        const updatedData = {
            ...data,
            hubAssistant1Name: a1Name, hubAssistant1Whatsapp: a1Whats, hubAssistant1Photo: a1Photo,
            hubAssistant2Name: a2Name, hubAssistant2Whatsapp: a2Whats, hubAssistant2Photo: a2Photo,
            hubInstagramLink: instagramLink,
            hubCarouselImages: carousel
        };
        try {
            const { error } = await supabase.from('settings').upsert({ id: 'general', data: updatedData });
            if (error) throw error;
            await logAction('HUB INICIAL', `Configurações do Hub Inicial alteradas.`);
            setData(updatedData);
            toast.success("Configurações do Hub salvas!");
            reloadTheme();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar.");
        }
    };

    const handlePhotoUpload = async (e, setter) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const compressedFile = await compressImage(file);
            const fileExt = compressedFile.name.split('.').pop() || 'png';
            const fileName = `assistant-${Date.now()}.${fileExt}`;
            const { error } = await supabase.storage.from('logos').upload(fileName, compressedFile);
            if (error) throw error;
            const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
            setter(publicUrlData.publicUrl);
            toast.success("Foto enviada!");
        } catch (error) {
            console.error(error);
            toast.error("Erro no upload.");
        } finally {
            setUploading(false);
        }
    };

    const handleCarouselUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploading(true);
        try {
            const newUrls = [];
            for (let file of files) {
                const compressedFile = await compressImage(file);
                const fileExt = compressedFile.name.split('.').pop() || 'png';
                const fileName = `carousel-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error } = await supabase.storage.from('logos').upload(fileName, compressedFile);
                if (error) throw error;
                const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
                newUrls.push(publicUrlData.publicUrl);
            }
            setCarousel([...carousel, ...newUrls]);
            toast.success("Imagens enviadas!");
        } catch (error) {
            console.error(error);
            toast.error("Erro no upload do carrossel.");
        } finally {
            setUploading(false);
        }
    };

    const removeCarouselImage = (index) => {
        const newCarousel = [...carousel];
        newCarousel.splice(index, 1);
        setCarousel(newCarousel);
    };

    return (
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-8 animate-in fade-in max-w-2xl mx-auto space-y-8">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Hub Inicial
            </h2>
            
            <div className="space-y-6">
                {/* Assistant 1 */}
                <div className="bg-white/60 p-4 rounded-xl border border-white/40 space-y-4">
                    <h3 className="font-bold text-slate-700 uppercase text-sm">Assistente 1</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome</label>
                            <input value={a1Name} onChange={e => setA1Name(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Link WhatsApp (https://wa.me/...)</label>
                            <input value={a1Whats} onChange={e => setA1Whats(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" placeholder="ex: https://wa.me/5511..." />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Foto do Assistente</label>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/80 flex items-center justify-center overflow-hidden bg-white/60">
                                {a1Photo ? <img src={a1Photo} alt="A1" className="w-full h-full object-cover"/> : <User size={20} className="text-slate-600"/>}
                            </div>
                            <label className="px-4 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl hover:bg-white/60 text-xs font-bold rounded-lg cursor-pointer">
                                {uploading ? 'Enviando...' : 'Alterar Foto'}
                                <input type="file" accept="image/*" onChange={e => handlePhotoUpload(e, setA1Photo)} className="hidden" disabled={uploading}/>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Assistant 2 */}
                <div className="bg-white/60 p-4 rounded-xl border border-white/40 space-y-4">
                    <h3 className="font-bold text-slate-700 uppercase text-sm">Assistente 2</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome</label>
                            <input value={a2Name} onChange={e => setA2Name(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Link WhatsApp</label>
                            <input value={a2Whats} onChange={e => setA2Whats(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" placeholder="ex: https://wa.me/5511..." />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Foto do Assistente</label>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/80 flex items-center justify-center overflow-hidden bg-white/60">
                                {a2Photo ? <img src={a2Photo} alt="A2" className="w-full h-full object-cover"/> : <User size={20} className="text-slate-600"/>}
                            </div>
                            <label className="px-4 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl hover:bg-white/60 text-xs font-bold rounded-lg cursor-pointer">
                                {uploading ? 'Enviando...' : 'Alterar Foto'}
                                <input type="file" accept="image/*" onChange={e => handlePhotoUpload(e, setA2Photo)} className="hidden" disabled={uploading}/>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Redes Sociais */}
                <div className="bg-white/60 p-4 rounded-xl border border-white/40 space-y-4">
                    <h3 className="font-bold text-slate-700 uppercase text-sm">Redes Sociais</h3>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Link do Instagram</label>
                        <input value={instagramLink} onChange={e => setInstagramLink(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" placeholder="ex: https://instagram.com/ismsaude" />
                    </div>
                </div>

                {/* Carousel */}
                <div className="bg-white/60 p-4 rounded-xl border border-white/40 space-y-4">
                    <h3 className="font-bold text-slate-700 uppercase text-sm">Galeria de Imagens (Carrossel)</h3>
                    <label className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-xs font-bold rounded-lg cursor-pointer inline-flex items-center gap-2">
                        {uploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} />}
                        Adicionar Imagens
                        <input type="file" accept="image/*" multiple onChange={handleCarouselUpload} className="hidden" disabled={uploading}/>
                    </label>
                    <div className="flex gap-2 flex-wrap mt-4">
                        {carousel.map((img, idx) => (
                            <div key={idx} className="relative group w-24 h-16 rounded-lg overflow-hidden border border-white/60 shadow-sm">
                                <img src={img} className="w-full h-full object-cover" />
                                <button onClick={() => removeCarouselImage(idx)} className="absolute inset-0 bg-black/50 text-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                    X
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-6 border-t border-white/60 flex justify-end">
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-slate-800 font-black text-xs uppercase px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2">
                        <Check size={16} /> Salvar Hub
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- UNIDADES MANAGER COMPONENT ---
const UnidadesManager = () => {
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUnidade, setNewUnidade] = useState('');
    const [newCnes, setNewCnes] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [editCnes, setEditCnes] = useState('');

    useEffect(() => {
        fetchUnidades();
    }, []);

    const fetchUnidades = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('unidades').select('*').order('nome');
        if (!error) setUnidades(data || []);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newUnidade.trim()) return;
        const { error } = await supabase.from('unidades').insert([{ nome: newUnidade, cnes: newCnes, tipo: 'Padrão' }]);
        if (!error) {
            await logAction('CRIAÇÃO DE UNIDADE', `Unidade adicionada: ${newUnidade} (CNES: ${newCnes})`);
            toast.success('Unidade adicionada!');
            setNewUnidade('');
            setNewCnes('');
            fetchUnidades();
        } else {
            toast.error('Erro ao adicionar unidade.');
        }
    };

    const handleEdit = async (id) => {
        if (!editValue.trim()) return;
        const { error } = await supabase.from('unidades').update({ nome: editValue, cnes: editCnes }).eq('id', id);
        if (!error) {
            await logAction('EDIÇÃO DE UNIDADE', `Unidade alterada para: ${editValue} (CNES: ${editCnes})`);
            toast.success('Unidade atualizada!');
            setEditingId(null);
            fetchUnidades();
        } else {
            toast.error('Erro ao atualizar unidade.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remover esta unidade?")) return;
        const unidade = unidades.find(u => u.id === id);
        const { error } = await supabase.from('unidades').delete().eq('id', id);
        if (!error) {
            if (unidade) {
                await logAction('EXCLUSÃO DE UNIDADE', `A unidade ${unidade.nome} foi removida das configurações.`);
            }
            toast.success('Unidade removida!');
            fetchUnidades();
        } else {
            toast.error('Erro ao remover unidade.');
        }
    };

    return (
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-8 animate-in fade-in max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Unidades de Atendimento
            </h2>
            <div className="flex gap-2">
                <input value={newUnidade} onChange={e => setNewUnidade(e.target.value)} placeholder="Nova Unidade..." className="flex-1 h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700 uppercase" />
                <input value={newCnes} onChange={e => setNewCnes(e.target.value)} placeholder="CNES..." maxLength="7" className="w-24 h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" />
                <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-slate-800 font-black text-xs uppercase px-4 rounded-xl shadow-lg transition-all active:scale-95">Adicionar</button>
            </div>
            {loading ? <div className="p-4 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" /></div> : (
                <ul className="space-y-2">
                    {unidades.map(u => (
                        <li key={u.id} className="flex justify-between items-center bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl p-2 rounded-xl">
                            {editingId === u.id ? (
                                <div className="flex gap-2 w-full">
                                    <input value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 px-2 py-2 rounded-lg border border-blue-400 outline-none text-sm font-bold text-slate-700 uppercase" />
                                    <input value={editCnes} onChange={e => setEditCnes(e.target.value)} placeholder="CNES" maxLength="7" className="w-24 px-2 py-2 rounded-lg border border-blue-400 outline-none text-sm font-bold text-slate-700" />
                                    <button onClick={() => handleEdit(u.id)} className="text-emerald-600 font-bold px-3"><Check size={16} /></button>
                                    <button onClick={() => setEditingId(null)} className="text-rose-600 font-bold px-3"><X size={16} /></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col ml-2">
                                        <span className="text-sm font-bold text-slate-700 uppercase leading-tight">{u.nome}</span>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">CNES: {u.cnes || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingId(u.id); setEditValue(u.nome); setEditCnes(u.cnes || ''); }} className="p-1.5 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(u.id)} className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"><Trash2 size={14} /></button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                    {unidades.length === 0 && <p className="text-xs text-slate-500 font-bold uppercase text-center py-4">Nenhuma unidade cadastrada.</p>}
                </ul>
            )}
        </div>
    );
};

// --- MOTIVOS SUSPENSAO MANAGER COMPONENT ---
const MotivosSuspensaoManager = () => {
    const [motivos, setMotivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [novoMotivo, setNovoMotivo] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        fetchMotivos();
    }, []);

    const fetchMotivos = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('motivos_suspensao').select('*').order('descricao');
        if (!error) setMotivos(data || []);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!novoMotivo.trim()) return;
        const { error } = await supabase.from('motivos_suspensao').insert([{ descricao: novoMotivo, ativo: true }]);
        if (!error) {
            await logAction('CRIAÇÃO DE MOTIVO DE SUSPENSÃO', `Novo motivo: ${novoMotivo}`);
            toast.success('Motivo adicionado!');
            setNovoMotivo('');
            fetchMotivos();
        } else {
            toast.error('Erro ao adicionar motivo.');
        }
    };

    const handleEdit = async (id) => {
        if (!editValue.trim()) return;
        const { error } = await supabase.from('motivos_suspensao').update({ descricao: editValue }).eq('id', id);
        if (!error) {
            await logAction('EDIÇÃO DE MOTIVO DE SUSPENSÃO', `Motivo alterado para: ${editValue}`);
            toast.success('Motivo atualizado!');
            setEditingId(null);
            fetchMotivos();
        } else {
            toast.error('Erro ao atualizar motivo.');
        }
    };

    const handleToggleAtivo = async (id, isAtivo) => {
        const { error } = await supabase.from('motivos_suspensao').update({ ativo: !isAtivo }).eq('id', id);
        if (!error) {
            await logAction('STATUS DE MOTIVO DE SUSPENSÃO', `Status do motivo alterado para: ${!isAtivo ? 'Ativo' : 'Inativo'}`);
            toast.success(isAtivo ? 'Desativado!' : 'Ativado!');
            fetchMotivos();
        } else {
            toast.error('Erro ao alterar status.');
        }
    };

    const handleDelete = async (id) => {
         if (!window.confirm("Remover este motivo permanentemente? Se ele já foi usado, o sistema pode impedir. Nesses casos, prefira apenas DESATIVAR.")) return;
         const motivo = motivos.find(m => m.id === id);
         const { error } = await supabase.from('motivos_suspensao').delete().eq('id', id);
         if (!error) {
             if (motivo) {
                 await logAction('EXCLUSÃO DE MOTIVO DE SUSPENSÃO', `O motivo "${motivo.motivo}" foi removido das configurações.`);
             }
             toast.success('Removido com sucesso!');
             fetchMotivos();
         } else {
             toast.error('Erro ao remover (pode estar em uso por alguma cirurgia).');
         }
    };

    return (
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-8 animate-in fade-in max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div> Motivos de Suspensão
            </h2>
            <div className="flex gap-2">
                <input value={novoMotivo} onChange={e => setNovoMotivo(e.target.value)} placeholder="Novo Motivo (Ex: Falta de Jejum)..." className="flex-1 h-10 px-3 rounded-xl border border-white/60 outline-none focus:border-orange-500 text-sm font-bold text-slate-700 uppercase" />
                <button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700 text-slate-800 font-black text-xs uppercase px-4 rounded-xl shadow-lg transition-all active:scale-95">Adicionar</button>
            </div>
            {loading ? <div className="p-4 text-center"><Loader2 className="animate-spin text-orange-500 mx-auto" /></div> : (
                <ul className="space-y-2">
                    {motivos.map(u => (
                        <li key={u.id} className={`flex justify-between items-center bg-white/60 border ${u.ativo ? 'border-white/60' : 'border-rose-200 bg-rose-50/20'} p-2 rounded-xl`}>
                            {editingId === u.id ? (
                                <div className="flex gap-2 w-full">
                                    <input value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 px-2 py-2 rounded-lg border border-orange-400 outline-none text-sm font-bold text-slate-700 uppercase" />
                                    <button onClick={() => handleEdit(u.id)} className="text-emerald-600 font-bold px-3"><Check size={16} /></button>
                                    <button onClick={() => setEditingId(null)} className="text-rose-600 font-bold px-3"><X size={16} /></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col ml-2">
                                        <span className={`text-sm font-bold uppercase leading-tight ${u.ativo ? 'text-slate-700' : 'text-slate-500 line-through'}`}>{u.descricao}</span>
                                        <span className={`text-[11px] font-bold uppercase mt-0.5 ${u.ativo ? 'text-emerald-500' : 'text-rose-500'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button onClick={() => handleToggleAtivo(u.id, u.ativo)} title={u.ativo ? 'Desativar este motivo' : 'Reativar este motivo'} className={`p-1 text-[11px] font-bold uppercase border rounded-md mr-1 ${u.ativo ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>{u.ativo ? 'Desativar' : 'Ativar'}</button>
                                        <button onClick={() => { setEditingId(u.id); setEditValue(u.descricao); }} className="p-1.5 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(u.id)} className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"><Trash2 size={14} /></button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                    {motivos.length === 0 && <p className="text-xs text-slate-500 font-bold uppercase text-center py-4">Nenhum motivo cadastrado.</p>}
                </ul>
            )}
        </div>
    );
};

// --- EDITABLE LIST COMPONENT ---
const RenderSection = ({ title, category, placeholder, inputValue, items, onInputChange, onAdd, onRemove, onEdit }) => {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');

    const startEdit = (index, currentValue) => {
        setEditingIndex(index);
        setEditValue(currentValue);
    };

    const saveEdit = async (index) => {
        if (editValue.trim() && editValue !== items[index]) {
            await onEdit(category, index, editValue);
        }
        setEditingIndex(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditValue('');
    };

    return (
        <div className="flex flex-col bg-white/60 backdrop-blur-md rounded-xl border border-white/60 shadow-sm overflow-hidden h-fit">
            {/* Header / Inserção Compacta */}
            <div className="p-4 border-b border-white/60 bg-white/60 flex flex-col gap-3 rounded-t-xl">
                <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> {title}
                </h3>
                <div className="flex gap-2">
                    <input
                        value={inputValue || ''}
                        onChange={(e) => onInputChange(category, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 h-9 px-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-[13px] font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
                        onKeyDown={(e) => e.key === 'Enter' && onAdd(category)}
                    />
                    <button
                        onClick={() => onAdd(category)}
                        disabled={!inputValue}
                        className="bg-blue-600 text-white px-2.5 h-9 rounded-lg hover:bg-blue-700 transition-all flex justify-center items-center shadow-md shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Adicionar"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Lista com Tags */}
            <div className="p-4 pb-5 min-h[100px]">
                {(!items || items.length === 0) ? (
                    <div className="flex flex-col items-center justify-center text-slate-500 gap-1 py-4 opacity-70">
                        <AlertTriangle size={18} />
                        <span className="text-xs uppercase font-bold tracking-widest mt-1">Lista Vazia</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {items.map((item, index) => (
                            editingIndex === index ? (
                                <div key={index} className="flex items-center gap-1 bg-white/60 border border-blue-400 text-blue-800 text-xs font-bold px-1.5 py-1 rounded-md shadow-sm animate-in zoom-in-95">
                                    <input
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="h-5 px-1 bg-transparent w-24 outline-none text-xs"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEdit(index);
                                            if (e.key === 'Escape') cancelEdit();
                                        }}
                                    />
                                    <button onClick={() => saveEdit(index)} className="p-0.5 text-emerald-600 hover:bg-emerald-100 rounded-sm"><Check size={12} /></button>
                                    <button onClick={cancelEdit} className="p-0.5 text-rose-600 hover:bg-rose-100 rounded-sm"><X size={12} /></button>
                                </div>
                            ) : (
                                <span
                                    key={index}
                                    className="bg-white/80 border-2 border-white shadow-sm text-slate-700 text-xs font-black uppercase px-2.5 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm group hover:border-blue-300 hover:bg-blue-50 transition-all"
                                >
                                    <span className="cursor-pointer" onClick={() => startEdit(index, item)}>{item}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemove(category, item); }}
                                        className="text-slate-500 hover:text-rose-500 hover:bg-rose-100 rounded p-0.5 transition-colors"
                                        title="Remover"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </span>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- DOCTOR EDITABLE LIST COMPONENT ---
const RenderDoctorSection = ({ items, especialidades = [], onAdd, onRemove, onEdit }) => {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState({ nome: '', crm: '', cpf: '', especialidade: '', sexo: '', rqe: '' });
    const [newValue, setNewValue] = useState({ nome: '', crm: '', cpf: '', especialidade: '', sexo: '', rqe: '' });

    const handleAdd = () => {
        if (!newValue.nome) {
            toast.error("Preencha ao menos o Nome da Equipe/Médico");
            return;
        }
        onAdd('cirurgioes', { id: Date.now().toString(), ...newValue });
        setNewValue({ nome: '', crm: '', cpf: '', especialidade: '', sexo: '', rqe: '' });
    };

    const startEdit = (index, item) => {
        setEditingIndex(index);
        if (typeof item === 'string') {
            setEditValue({ nome: item, crm: '', cpf: '', especialidade: '', sexo: '', rqe: '' });
        } else {
            setEditValue({ nome: item.nome || '', crm: item.crm || '', cpf: item.cpf || '', especialidade: item.especialidade || '', sexo: item.sexo || '', rqe: item.rqe || '' });
        }
    };

    const saveEdit = async (index) => {
        if (!editValue.nome) return;
        const original = items[index];
        const updated = typeof original === 'string'
            ? { id: Date.now().toString(), ...editValue }
            : { ...original, ...editValue };

        await onEdit('cirurgioes', index, updated);
        setEditingIndex(null);
        setEditValue({ nome: '', crm: '', cpf: '', especialidade: '', sexo: '', rqe: '' });
    };

    const cancelEdit = () => {
        setEditingIndex(null);
    };

    return (
        <div className="flex flex-col bg-white/60 backdrop-blur-md rounded-xl border border-white/60 shadow-sm overflow-hidden md:col-span-2 lg:col-span-3">
            <div className="p-4 border-b border-white/60 bg-white/60 flex flex-col md:flex-row gap-2 md:items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Nome da Equipe / Médico
                    </label>
                    <input
                        value={newValue.nome}
                        onChange={(e) => setNewValue({ ...newValue, nome: e.target.value })}
                        placeholder="Nome Completo..."
                        className="w-full h-8 px-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-xs font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase placeholder:normal-case placeholder:text-slate-500"
                    />
                </div>
                <div className="w-full md:w-[200px]">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CRM</label>
                    <input
                        value={newValue.crm}
                        onChange={(e) => setNewValue({ ...newValue, crm: e.target.value })}
                        placeholder="Ex: 12345-SP"
                        className="w-full h-8 px-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-xs font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase placeholder:normal-case placeholder:text-slate-500"
                    />
                </div>
                <div className="w-full md:w-[200px]">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CPF</label>
                    <input
                        value={newValue.cpf}
                        onChange={(e) => setNewValue({ ...newValue, cpf: maskCPF(e.target.value) })}
                        placeholder="Ex: 000.000.000-00"
                        maxLength="14"
                        className="w-full h-8 px-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-xs font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
                    />
                </div>
                <div className="w-full md:w-[150px]">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">RQE</label>
                    <input
                        value={newValue.rqe}
                        onChange={(e) => setNewValue({ ...newValue, rqe: e.target.value })}
                        placeholder="Ex: 144064"
                        className="w-full h-8 px-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-xs font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase placeholder:normal-case placeholder:text-slate-500"
                    />
                </div>
                <div className="w-full md:w-[200px]">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Especialidade Principal</label>
                    <select
                        value={newValue.especialidade}
                        onChange={(e) => setNewValue({ ...newValue, especialidade: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-xs font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                    >
                        <option value="">Nenhuma</option>
                        {especialidades?.map((esp, i) => (
                            <option key={i} value={esp}>{esp}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full md:w-[150px]">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sexo</label>
                    <select
                        value={newValue.sexo}
                        onChange={(e) => setNewValue({ ...newValue, sexo: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-xs font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                    >
                        <option value="">Nenhum</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                    </select>
                </div>
                <button
                    onClick={handleAdd}
                    disabled={!newValue.nome}
                    className="bg-blue-600 text-white h-8 px-4 rounded-lg font-black text-[10px] uppercase hover:bg-blue-700 transition-all flex justify-center items-center shadow-md shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={14} className="mr-1" />
                    Adicionar
                </button>
            </div>

            <div className="flex-1 overflow-x-auto min-h-[150px] max-h-[400px] overflow-y-auto">
                <table className="min-w-full text-left border-collapse">
                    <thead className="bg-transparent sticky top-0 z-10">
                        <tr className="border-b border-white/60 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="py-2 px-3">Nome / Equipe</th>
                            <th className="py-2 px-3">Especialidade</th>
                            <th className="py-2 px-3">CRM / RQE</th>
                            <th className="py-2 px-3">CPF</th>
                            <th className="py-2 px-3">Sexo</th>
                            <th className="py-2 px-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/50">
                        {items?.map((item, index) => {
                            const isString = typeof item === 'string';
                            const nome = isString ? item : item.nome;
                            const especialidade = isString ? '---' : (item.especialidade || '---');
                            const crm = isString ? '---' : (item.crm || '---');
                            const rqe = isString ? '' : (item.rqe || '');
                            const cpf = isString ? '---' : (item.cpf || '---');
                            const sexoC = isString ? '---' : (item.sexo || '---');

                            return (
                                <tr key={index} className="hover:bg-transparent transition-colors group">
                                    {editingIndex === index ? (
                                        <td colSpan={5} className="px-5 py-2 animate-in fade-in duration-200">
                                            <div className="flex gap-2 flex-wrap">
                                                <input
                                                    value={editValue.nome}
                                                    onChange={(e) => setEditValue({ ...editValue, nome: e.target.value })}
                                                    className="flex-1 h-8 px-2 bg-white/60 border border-blue-400 rounded text-sm font-bold text-slate-800 uppercase outline-none focus:border-blue-500 shadow-sm"
                                                />
                                                <select
                                                    value={editValue.especialidade}
                                                    onChange={(e) => setEditValue({ ...editValue, especialidade: e.target.value })}
                                                    className="w-32 h-8 px-2 bg-white/60 border border-blue-400 rounded text-xs font-bold text-slate-800 uppercase outline-none focus:border-blue-500 shadow-sm"
                                                >
                                                    <option value="">Nenhuma</option>
                                                    {especialidades?.map((esp, i) => (
                                                        <option key={i} value={esp}>{esp}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    value={editValue.crm}
                                                    onChange={(e) => setEditValue({ ...editValue, crm: e.target.value })}
                                                    className="w-20 h-8 px-2 bg-white/60 border border-blue-400 rounded text-xs font-bold text-slate-800 uppercase outline-none focus:border-blue-500 shadow-sm"
                                                    placeholder="CRM"
                                                />
                                                <input
                                                    value={editValue.rqe}
                                                    onChange={(e) => setEditValue({ ...editValue, rqe: e.target.value })}
                                                    className="w-20 h-8 px-2 bg-white/60 border border-blue-400 rounded text-xs font-bold text-slate-800 uppercase outline-none focus:border-blue-500 shadow-sm"
                                                    placeholder="RQE"
                                                />
                                                <input
                                                    value={editValue.cpf}
                                                    onChange={(e) => setEditValue({ ...editValue, cpf: maskCPF(e.target.value) })}
                                                    className="w-28 h-8 px-2 bg-white/60 border border-blue-400 rounded text-xs font-bold text-slate-100 outline-none focus:border-blue-500 shadow-sm"
                                                    placeholder="CPF"
                                                    maxLength="14"
                                                />
                                                <select
                                                    value={editValue.sexo}
                                                    onChange={(e) => setEditValue({ ...editValue, sexo: e.target.value })}
                                                    className="w-24 h-8 px-2 bg-white/60 border border-blue-400 rounded text-xs font-bold text-slate-800 uppercase outline-none focus:border-blue-500 shadow-sm"
                                                >
                                                    <option value="">Nenhum</option>
                                                    <option value="Masculino">Masculino</option>
                                                    <option value="Feminino">Feminino</option>
                                                </select>
                                                <button onClick={() => saveEdit(index)} className="px-2 text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-md font-bold text-[11px] uppercase shadow-sm"><Check size={14} /></button>
                                                <button onClick={cancelEdit} className="px-2 text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-md font-bold text-[11px] uppercase shadow-sm"><X size={14} /></button>
                                            </div>
                                        </td>
                                    ) : (
                                        <>
                                            <td className="px-3 py-1.5 text-xs font-bold text-slate-800 uppercase">{nome}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 uppercase bg-blue-50/50 rounded">{especialidade}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase">{crm} {rqe ? `| RQE ${rqe}` : ''}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">{cpf}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">{sexoC}</td>
                                            <td className="px-3 py-1.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => startEdit(index, item)} className="p-1.5 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-md transition-all shadow-sm">
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button onClick={() => onRemove('cirurgioes', item)} className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-md transition-all shadow-sm">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {(!items || items.length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-8 opacity-70">
                        <AlertTriangle size={24} />
                        <span className="text-xs uppercase font-bold tracking-widest mt-2">Nenhum médico cadastrado.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- ORIENTACOES E REGRAS DE INTERNAÇÃO MANAGER COMPONENT ---
const OrientacoesManager = () => {
    const [orientacoes, setOrientacoes] = useState({});
    const [regras, setRegras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [editingKey, setEditingKey] = useState(null);
    const [editTitleValue, setEditTitleValue] = useState('');

    // Estados da nova regra
    const [newRegraTipo, setNewRegraTipo] = useState('mesmo');
    const [newRegraHorario, setNewRegraHorario] = useState('07:00');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Busca os Textos e converte o formato antigo para o novo caso necessário
            const { data: oriData } = await supabase.from('settings').select('data').eq('id', 'orientacoes').maybeSingle();
            if (oriData && oriData.data) {
                const migrado = {};
                Object.keys(oriData.data).forEach(k => {
                    migrado[k] = typeof oriData.data[k] === 'string' 
                        ? { texto: oriData.data[k], regraInternacao: 'dia_anterior' } 
                        : oriData.data[k];
                });
                setOrientacoes(migrado);
            }

            // Busca as Regras de Horário (ou aplica o padrão se não existir)
            const { data: regData } = await supabase.from('settings').select('data').eq('id', 'regras_internacao').maybeSingle();
            if (regData && regData.data?.lista) {
                setRegras(regData.data.lista);
            } else {
                setRegras([
                    { id: 'dia_anterior', label: 'Internar no DIA ANTERIOR às 19:00', tipo: 'anterior', horario: '19:00' },
                    { id: 'mesmo_dia_07h', label: 'Internar no MESMO DIA às 07:00', tipo: 'mesmo', horario: '07:00' },
                    { id: 'mesmo_dia_11h', label: 'Internar no MESMO DIA às 11:00', tipo: 'mesmo', horario: '11:00' }
                ]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Ações de Regras de Horário ---
    const handleAddRegra = async () => {
        if (!newRegraHorario) return toast.error('Informe o horário!');
        const id = `${newRegraTipo}_${newRegraHorario.replace(':', '')}`;
        if (regras.some(r => r.id === id)) return toast.error('Esta regra já existe.');

        const label = newRegraTipo === 'anterior' 
            ? `Internar no DIA ANTERIOR às ${newRegraHorario}`
            : `Internar no MESMO DIA às ${newRegraHorario}`;

        const updated = [...regras, { id, label, tipo: newRegraTipo, horario: newRegraHorario }];
        setRegras(updated);
        try {
            await supabase.from('settings').upsert({ id: 'regras_internacao', data: { lista: updated } });
            await logAction('REGRA DE INTERNAÇÃO', `Horário de internação adicionado: ${newRegraHorario}`);
            toast.success('Horário adicionado!');
        } catch (error) { toast.error('Erro ao salvar regra.'); }
    };

    const handleRemoveRegra = async (idToRemove) => {
        if (!window.confirm("Remover este horário? As especialidades que o utilizam voltarão para o padrão.")) return;
        const updated = regras.filter(r => r.id !== idToRemove);
        setRegras(updated);
        try {
            await supabase.from('settings').upsert({ id: 'regras_internacao', data: { lista: updated } });
            await logAction('REGRA DE INTERNAÇÃO', `Horário de internação removido.`);
            toast.success('Horário removido!');
        } catch (error) { toast.error('Erro ao remover regra.'); }
    };

    // --- Ações de Especialidades ---
    const handleSave = async (silent = false) => {
        if (!silent) setSaving(true);
        try {
            await supabase.from('settings').upsert({ id: 'orientacoes', data: orientacoes });
            await logAction('ORIENTAÇÕES/REGRAS', 'Ajustes gerais nas orientações e regras salvos.');
            if (!silent) toast.success('Ajustes salvos com sucesso!');
        } catch (error) { if (!silent) toast.error('Erro ao salvar.'); } finally { if (!silent) setSaving(false); }
    };

    const handleAddType = async () => {
        const key = newKey.trim();
        if (!key) return;
        if (orientacoes[key]) return toast.error('Esse tipo já existe.');
        const updated = { ...orientacoes, [key]: { texto: 'Insira o texto...', regraInternacao: 'dia_anterior' } };
        setOrientacoes(updated); setNewKey('');
        try { await supabase.from('settings').upsert({ id: 'orientacoes', data: updated }); await logAction('ORIENTAÇÕES DE ESPECIALIDADE', `Especialidade "${key}" adicionada.`); toast.success('Especialidade adicionada!'); } catch (error) {}
    };

    const handleRemoveType = async (keyToRemove) => {
        if (!window.confirm(`Excluir as orientações de "${keyToRemove}"?`)) return;
        const updated = { ...orientacoes }; delete updated[keyToRemove]; setOrientacoes(updated);
        try { await supabase.from('settings').upsert({ id: 'orientacoes', data: updated }); await logAction('ORIENTAÇÕES DE ESPECIALIDADE', `Especialidade "${keyToRemove}" excluída.`); toast.success('Excluído!'); } catch (error) {}
    };

    const handleRenameType = async (oldKey) => {
        const newKey = editTitleValue.trim();
        if (!newKey || newKey === oldKey) return setEditingKey(null);
        if (orientacoes[newKey]) return toast.error('Nome já existe.');
        const updated = { ...orientacoes }; updated[newKey] = updated[oldKey]; delete updated[oldKey];
        setOrientacoes(updated); setEditingKey(null);
        try { await supabase.from('settings').upsert({ id: 'orientacoes', data: updated }); await logAction('ORIENTAÇÕES DE ESPECIALIDADE', `Especialidade "${oldKey}" renomeada para "${newKey}".`); toast.success('Renomeado!'); } catch (error) {}
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

    return (
        <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/60 shadow-sm p-6 animate-in fade-in duration-300 space-y-8">
            
            <div className="border-b border-white/60 pb-4">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" /> Fluxo de Internação e Orientações
                </h2>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Gerencie os horários e textos que sairão no PDF do paciente
                </p>
            </div>

            {/* BLOCO 1: REGRAS DE HORÁRIO */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase flex items-center gap-2 tracking-widest pl-1">
                    <Clock size={14} className="text-blue-500"/> 1. Horários de Internação
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-2 bg-slate-50/80 p-3 rounded-xl border border-white/60 shadow-sm items-center">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Nova Regra:</span>
                    <select value={newRegraTipo} onChange={e => setNewRegraTipo(e.target.value)} className="h-9 px-3 rounded-lg border border-white/60 outline-none focus:border-blue-500 text-xs font-bold text-slate-700 bg-white/60">
                        <option value="anterior">Internar no Dia Anterior</option>
                        <option value="mesmo">Internar no Mesmo Dia</option>
                    </select>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">às</span>
                    <input type="time" value={newRegraHorario} onChange={e => setNewRegraHorario(e.target.value)} className="h-9 px-3 rounded-lg border border-white/60 outline-none focus:border-blue-500 text-xs font-bold text-slate-700 bg-white/60" />
                    <button onClick={handleAddRegra} className="bg-blue-600 text-white px-4 h-9 rounded-lg font-black text-[11px] uppercase hover:bg-blue-700 transition-all flex items-center gap-1 shadow-sm sm:ml-auto w-full sm:w-auto justify-center">
                        <Plus size={14} /> Adicionar
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 px-1">
                    {regras.map(r => (
                        <div key={r.id} className="flex items-center gap-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 shadow-sm group">
                            {r.label}
                            <button onClick={() => handleRemoveRegra(r.id)} className="text-slate-600 hover:text-rose-500 transition-colors" title="Remover Regra"><X size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px w-full bg-slate-200/60"></div>

            {/* BLOCO 2: ESPECIALIDADES */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase flex items-center gap-2 tracking-widest pl-1">
                    <FileText size={14} className="text-emerald-500"/> 2. Textos por Especialidade
                </h3>

                <div className="flex gap-2 bg-white/60 p-3 rounded-xl border border-white/60 shadow-sm">
                    <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Nova Especialidade (Ex: Ortopedia)" className="flex-1 h-9 px-3 rounded-lg border border-white/60 outline-none focus:border-blue-500 text-sm font-bold text-slate-700" onKeyDown={e => e.key === 'Enter' && handleAddType()} />
                    <button onClick={handleAddType} disabled={!newKey.trim()} className="bg-slate-800 text-white px-4 h-9 rounded-lg font-black text-[11px] uppercase hover:bg-slate-900 transition-all flex items-center gap-1 shadow-sm disabled:opacity-50">
                        <Plus size={14} /> Criar
                    </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 pt-2">
                    {Object.entries(orientacoes).map(([key, config]) => {
                        const currentConfig = typeof config === 'string' ? { texto: config, regraInternacao: 'dia_anterior' } : config;
                        return (
                            <div key={key} className="bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl overflow-hidden shadow-sm group">
                                <div className="flex justify-between items-center px-4 py-2.5 bg-white/60 border-b border-white/60">
                                    {editingKey === key ? (
                                        <div className="flex items-center gap-2 animate-in fade-in">
                                            <input value={editTitleValue} onChange={(e) => setEditTitleValue(e.target.value)} className="h-7 px-2 border border-blue-400 rounded text-xs font-black text-slate-700 uppercase outline-none focus:border-blue-600 shadow-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleRenameType(key); if (e.key === 'Escape') setEditingKey(null); }} />
                                            <button onClick={() => handleRenameType(key)} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded transition-colors"><Check size={14}/></button>
                                            <button onClick={() => setEditingKey(null)} className="text-rose-600 hover:bg-rose-100 p-1 rounded transition-colors"><X size={14}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group/title">
                                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{key}</h3>
                                            <button onClick={() => { setEditingKey(key); setEditTitleValue(key); }} className="text-slate-600 hover:text-blue-600 opacity-0 group-hover/title:opacity-100 transition-all"><Edit2 size={12} /></button>
                                        </div>
                                    )}
                                    <button onClick={() => handleRemoveType(key)} className="text-slate-500 hover:text-rose-600 bg-white/60 hover:bg-rose-50 p-1.5 rounded-lg border border-white/60 hover:border-rose-200 transition-all shadow-sm"><Trash2 size={14} /></button>
                                </div>
                                <div className="p-4 flex flex-col gap-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Bloco 1: Regra de Internação */}
                                        <div className="flex flex-col gap-1.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100 shadow-sm">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-blue-500" />
                                                <span className="text-[11px] font-black uppercase tracking-widest text-blue-800">1. Horário da Internação:</span>
                                            </div>
                                            <select 
                                                value={currentConfig.regraInternacao || 'dia_anterior'}
                                                onChange={(e) => setOrientacoes({ ...orientacoes, [key]: { ...currentConfig, regraInternacao: e.target.value } })}
                                                className="w-full h-9 px-3 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-xs font-black text-slate-700 outline-none focus:border-blue-500 uppercase tracking-wide cursor-pointer"
                                            >
                                                {regras.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                            </select>
                                        </div>

                                        {/* Bloco 2: Horário Estático da Cirurgia no PDF */}
                                        <div className="flex flex-col gap-1.5 bg-purple-50/50 p-3 rounded-xl border border-purple-100 shadow-sm">
                                            <div className="flex items-center gap-1.5">
                                                <Activity size={14} className="text-purple-500" />
                                                <span className="text-[11px] font-black uppercase tracking-widest text-purple-800">2. Horário da Cirurgia (No PDF):</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="time"
                                                    value={currentConfig.horarioCirurgiaPdf || ''}
                                                    onChange={(e) => setOrientacoes({ ...orientacoes, [key]: { ...currentConfig, horarioCirurgiaPdf: e.target.value } })}
                                                    className="flex-1 h-9 px-3 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-xs font-black text-slate-700 outline-none focus:border-purple-500 transition-all cursor-pointer"
                                                />
                                                <button onClick={() => setOrientacoes({ ...orientacoes, [key]: { ...currentConfig, horarioCirurgiaPdf: '' } })} className="px-3 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-[10px] font-bold text-slate-500 hover:text-rose-500 hover:border-rose-200 uppercase transition-colors shadow-sm" title="Limpar e usar horário do Mapa">
                                                    Usar do Mapa
                                                </button>
                                            </div>
                                            <p className="text-[8.5px] font-bold text-purple-600/70 uppercase leading-tight mt-0.5 ml-1">Deixe em branco para usar o horário exato da agenda.</p>
                                        </div>
                                    </div>
                                    <textarea
                                        value={currentConfig.texto}
                                        onChange={(e) => setOrientacoes({ ...orientacoes, [key]: { ...currentConfig, texto: e.target.value } })}
                                        className="w-full min-h-[140px] p-4 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y leading-relaxed"
                                        placeholder={`Escreva as orientações para ${key}...`}
                                    />
                                    <div className="flex justify-end mt-1">
                                        <button onClick={() => handleSave(false)} disabled={saving} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-slate-800 px-5 py-2 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm disabled:opacity-50">
                                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar Ajustes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const Settings = () => {
    const { hasPermission } = usePermission();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');

    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState((tabFromUrl === 'medicos' ? 'especialidades' : tabFromUrl) || 'especialidades');
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logsSearchTerm, setLogsSearchTerm] = useState('');

    useEffect(() => {
        if (tabFromUrl) setActiveSection(tabFromUrl === 'medicos' ? 'especialidades' : tabFromUrl);
    }, [tabFromUrl]);

    const loadLogs = async (query = '') => {
        setLoadingLogs(true);
        let qb = supabase.from('logs').select('*').order('timestamp', { ascending: false });
        
        if (query) {
            qb = qb.or(`action.ilike.%${query}%,details.ilike.%${query}%,userName.ilike.%${query}%`);
            // Limite maior pra pesquisa
            qb = qb.limit(500);
        } else {
            // Limite bom pro dia a dia (o banco NÃO apaga os velhos)
            qb = qb.limit(200);
        }
        
        const { data: logsData, error } = await qb;
        if (!error) setLogs(logsData || []);
        setLoadingLogs(false);
    };

    useEffect(() => {
        if (activeSection === 'logs') {
            loadLogs(logsSearchTerm);
        }
    }, [activeSection]);

    const [data, setData] = useState({
        cirurgioes: [], convenios: [], status: [], locais: [], cidades: [], anestesias: [], especialidades: [],
        clinicas: ['Cirúrgica', 'Ambulatorial'],
        caraterInternacao: ['01 - ELETIVA', '02 - URGÊNCIA', '03 - EMERGÊNCIA'],
        nomeInstituicao: 'Porto Feliz Saúde', corPrincipal: '#2563eb', logoUrl: '/logo.png'
    });

    const [newItem, setNewItem] = useState({
        cirurgioes: '', convenios: '', status: '', locais: '', cidades: '', anestesias: '', especialidades: '', clinicas: '', caraterInternacao: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data: generalRow, error } = await supabase.from('settings').select('data').eq('id', 'general').maybeSingle();
                if (error && error.code !== 'PGRST116') throw error;
                if (generalRow && generalRow.data) setData(generalRow.data);
            } catch (error) {
                console.error("Erro config:", error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleInputChange = (category, value) => setNewItem(prev => ({ ...prev, [category]: value }));

    const handleAdd = async (category, customValue = null) => {
        const itemToAdd = customValue || newItem[category];
        if (!itemToAdd) return;
        const updatedData = { ...data, [category]: [...(data[category] || []), itemToAdd] };
        try {
            const { error } = await supabase.from('settings').upsert({ id: 'general', data: updatedData });
            if (error) throw error;
            setData(updatedData);
            
            // LOG NÍVEL FBI
            const nomeItem = typeof itemToAdd === 'object' ? itemToAdd.nome || JSON.stringify(itemToAdd) : itemToAdd;
            await logAction('Configurações do Sistema', `Adicionou em [${category.toUpperCase()}]: ${nomeItem}`);

            if (!customValue) setNewItem(prev => ({ ...prev, [category]: '' }));
            toast.success("Adicionado!");
        } catch (error) { toast.error("Erro ao salvar."); }
    };

    const handleEdit = async (category, index, newValue) => {
        const updatedItems = [...data[category]];
        const oldItem = updatedItems[index]; // Guarda o valor antigo para o Diff
        updatedItems[index] = newValue;
        const updatedData = { ...data, [category]: updatedItems };
        try {
            const { error } = await supabase.from('settings').upsert({ id: 'general', data: updatedData });
            if (error) throw error;
            setData(updatedData);
            
            // LOG NÍVEL FBI (Diff)
            const oldStr = typeof oldItem === 'object' ? oldItem.nome || JSON.stringify(oldItem) : oldItem;
            const newStr = typeof newValue === 'object' ? newValue.nome || JSON.stringify(newValue) : newValue;
            await logAction('Configurações do Sistema', `Editou [${category.toUpperCase()}]: de [${oldStr}] para [${newStr}]`);

            toast.success("Atualizado!");
        } catch (error) { toast.error("Erro ao atualizar."); }
    };

    const handleRemove = async (category, itemToRemove) => {
        if (!window.confirm("Remover este item?")) return;
        const updatedData = {
            ...data,
            [category]: data[category].filter(i => {
                if (typeof i === 'string' && typeof itemToRemove === 'string') return i !== itemToRemove;
                if (typeof i === 'object' && typeof itemToRemove === 'object') return i.id !== itemToRemove.id;
                return true;
            })
        };
        try {
            const { error } = await supabase.from('settings').upsert({ id: 'general', data: updatedData });
            if (error) throw error;
            setData(updatedData);
            
            // LOG NÍVEL FBI
            const itemStr = typeof itemToRemove === 'object' ? itemToRemove.nome || JSON.stringify(itemToRemove) : itemToRemove;
            await logAction('Configurações do Sistema', `Removeu de [${category.toUpperCase()}]: ${itemStr}`);

            toast.success("Removido!");
        } catch (error) { toast.error("Erro ao remover."); }
    };

    const tabGroups = {
        'cadastros_gerais': [
            { id: 'unidades', label: 'Unidades (Hospitais)', show: hasPermission('Acesso Total (Admin)') },
            { id: 'especialidades', label: 'Especialidades', show: hasPermission('Acessar Configurações') },
            { id: 'convenios', label: 'Convênios', show: hasPermission('Acessar Configurações') },
            { id: 'locais', label: 'Salas Cirúrgicas', show: hasPermission('Acessar Configurações') },
            { id: 'cidades', label: 'Cidades', show: hasPermission('Acessar Configurações') },
            { id: 'anestesias', label: 'Anestesias', show: hasPermission('Acessar Configurações') },
            { id: 'status', label: 'Status da Fila', show: hasPermission('Acessar Configurações') },
            { id: 'motivos_suspensao', label: 'Suspensões', show: hasPermission('Acessar Configurações') },
            { id: 'prioridades', label: 'Prioridades', show: hasPermission('Acessar Configurações') },
            { id: 'clinicas', label: 'Clínicas AIH', show: hasPermission('Acessar Configurações') },
            { id: 'caraterInternacao', label: 'Caráter AIH', show: hasPermission('Acessar Configurações') }
        ]
    };

    const getActiveGroup = (section) => {
        for (const [groupName, tabs] of Object.entries(tabGroups)) {
            if (tabs.some(t => t.id === section)) {
                return tabs.filter(t => t.show);
            }
        }
        return [];
    };

    const activeTabs = getActiveGroup(activeSection);

    if (loading) return <div className="flex items-center justify-center min-h-full"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className="min-h-full bg-transparent py-8 px-4 sm:px-8 font-sans">
            <div className="max-w-[1400px] mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-800 tracking-normal">Painel de Controle</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Gerencie todos os aspectos do seu sistema</p>
                </div>

                {activeTabs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar w-full">
                        {activeTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveSection(tab.id); navigate({ search: `?tab=${tab.id}` }, { replace: true }); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeSection === tab.id ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-white/60 text-slate-500 hover:bg-white hover:text-slate-800 border border-transparent hover:border-slate-200'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-8 items-center justify-center max-w-full mx-auto">
                    
                    {/* ÁREA DE CONTEÚDO (GLASS CARD) */}
                    <div className="w-full bg-white/60 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-xl shadow-slate-300/40 p-6 md:p-10 min-h-[700px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {activeSection === 'importacao' && (
                            <div className="bg-white/60 rounded-3xl border border-white/40 shadow-sm p-10 flex flex-col items-center justify-center min-h-[400px] group cursor-pointer hover:border-blue-400 hover:shadow-md transition-all text-center" onClick={() => navigate('/importar-dados')}>
                                <div className="p-5 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform mb-6"><FileSpreadsheet size={48} /></div>
                                <h3 className="font-black text-2xl text-slate-800 uppercase tracking-wider">Importação em Lote (CSV)</h3>
                                <p className="text-slate-500 font-medium mt-2 max-w-md">Importe sua lista de pacientes e cirurgias antigas de uma só vez utilizando nossa planilha padrão.</p>
                            </div>
                        )}


                        {activeSection === 'especialidades' && <RenderSection title="Especialidades" category="especialidades" placeholder="Nova especialidade..." inputValue={newItem.especialidades} items={data.especialidades} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        {activeSection === 'convenios' && <RenderSection title="Convênios" category="convenios" placeholder="Novo convênio..." inputValue={newItem.convenios} items={data.convenios} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        {activeSection === 'status' && <RenderSection title="Status da Fila" category="status" placeholder="Ex: Aguardando..." inputValue={newItem.status} items={data.status} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        {activeSection === 'locais' && <RenderSection title="Salas Cirúrgicas" category="locais" placeholder="Nova sala..." inputValue={newItem.locais} items={data.locais} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        {activeSection === 'cidades' && <RenderSection title="Cidades" category="cidades" placeholder="Nova cidade..." inputValue={newItem.cidades} items={data.cidades} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        {activeSection === 'anestesias' && <RenderSection title="Anestesias" category="anestesias" placeholder="Tipo de anestesia..." inputValue={newItem.anestesias} items={data.anestesias} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        {activeSection === 'prioridades' && <RenderSection title="Prioridades" category="prioridades" placeholder="Classificação..." inputValue={newItem.prioridades} items={data.prioridades} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        {activeSection === 'clinicas' && <RenderSection title="Clínicas AIH" category="clinicas" placeholder="Ex: Cirúrgica..." inputValue={newItem.clinicas} items={data.clinicas} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        {activeSection === 'caraterInternacao' && <RenderSection title="Caráter AIH" category="caraterInternacao" placeholder="Ex: 01 - ELETIVA..." inputValue={newItem.caraterInternacao} items={data.caraterInternacao} onInputChange={handleInputChange} onAdd={handleAdd} onRemove={handleRemove} onEdit={handleEdit} />}
                        
                        {activeSection === 'orientacoes' && <OrientacoesManager />}
                        {activeSection === 'tempos' && <ProcedureManager />}
                        {activeSection === 'basesus' && <BaseSUSTab />}
                        
                        {activeSection === 'usuarios' && (hasPermission('Acesso Total (Admin)') || hasPermission('Acessar Usuarios')) && <UserManagement isEmbedded={true} />}
                        {activeSection === 'identidade' && hasPermission('Acesso Total (Admin)') && <IdentidadeVisualTab data={data} setData={setData} />}
                        {activeSection === 'hub' && hasPermission('Acesso Total (Admin)') && <HubSettingsTab data={data} setData={setData} />}
                        {activeSection === 'unidades' && hasPermission('Acesso Total (Admin)') && <UnidadesManager />}
                        
                        {activeSection === 'motivos_suspensao' && <MotivosSuspensaoManager />}
                        
                        {activeSection === 'escala_permissoes' && <PermissoesEscalaTab />}
                        
                        {activeSection === 'logs' && hasPermission('Acesso Total (Admin)') && (
                            <div className="bg-white/60 rounded-2xl border border-white/40 shadow-sm overflow-hidden flex flex-col h-full max-h-[750px]">
                                <div className="px-6 py-4 border-b border-white/40 flex justify-between items-center bg-transparent flex-wrap gap-3">
                                    <div>
                                        <h3 className="text-base font-black uppercase text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-600"/> Registros do Sistema ({logs.length})</h3>
                                        <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">O sistema MANTÉM todos os logs. Use a busca para dados mais antigos.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            value={logsSearchTerm}
                                            onChange={(e) => setLogsSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && loadLogs(logsSearchTerm)}
                                            placeholder="Buscar usuário, ação ou detalhe..." 
                                            className="h-9 px-3 min-w-[200px] rounded-lg border border-white/60 text-[13px] font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm"
                                        />
                                        <button 
                                            onClick={() => loadLogs(logsSearchTerm)}
                                            className="bg-blue-600 text-white h-9 px-4 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Search size={14} /> Pesquisar
                                        </button>
                                        {(logsSearchTerm) && (
                                            <button 
                                                onClick={() => { setLogsSearchTerm(''); loadLogs(''); }}
                                                className="bg-slate-200 text-slate-700 h-9 px-3 rounded-lg text-[11px] font-black uppercase hover:bg-slate-300 transition flex items-center shadow-sm"
                                                title="Limpar Busca"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="overflow-x-auto flex-1 custom-scrollbar">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-white/60 sticky top-0 z-10 shadow-sm">
                                            <tr className="text-left text-xs font-black text-slate-500 uppercase tracking-widest">
                                                <th className="py-3 px-6 whitespace-nowrap">Data / Hora</th>
                                                <th className="py-3 px-6 whitespace-nowrap">Usuário</th>
                                                <th className="py-3 px-6 whitespace-nowrap">Ação</th>
                                                <th className="py-3 px-6">Detalhes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {loadingLogs ? (
                                                <tr><td colSpan="4" className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={24} /></td></tr>
                                            ) : logs.length > 0 ? (
                                                logs.map((log) => {
                                                    const bgColor = log.action?.toLowerCase().includes('delete') || log.action?.toLowerCase().includes('exclu') ? 'bg-rose-50/50' :
                                                        log.action?.toLowerCase().includes('edit') || log.action?.toLowerCase().includes('atualiz') ? 'bg-amber-50/50' :
                                                        log.action?.toLowerCase().includes('login') ? 'bg-emerald-50/50' : 'bg-transparent';
                                                    return (
                                                        <tr key={log.id} className={`hover:bg-white/60 transition-colors border-b border-slate-100/50 ${bgColor}`}>
                                                            <td className="px-6 py-4 align-top whitespace-nowrap text-xs font-bold text-slate-600">{log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : 'N/A'}</td>
                                                            <td className="px-6 py-4 align-top whitespace-nowrap text-xs font-black uppercase text-blue-600">{log.userObj?.name || log.userName || log.userEmail || 'Desconhecido'}</td>
                                                            <td className="px-6 py-4 align-top whitespace-nowrap text-xs font-bold uppercase text-slate-700">{log.action || 'Ação'}</td>
                                                            <td className="px-6 py-4 whitespace-normal break-words min-w-[350px] max-w-lg text-xs text-slate-600 font-medium uppercase tracking-wider leading-relaxed border-l border-white/40">
                                                                {log.details || JSON.stringify(log.data || {})}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr><td colSpan="4" className="py-12 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhum log encontrado.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Settings;