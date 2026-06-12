import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import {
    Edit2, Trash2, Loader2, X, KeyRound, UserPlus,
    Shield, Check, Shuffle, AlertTriangle, Lock, Edit, LayoutGrid, CheckSquare, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { maskCPF, maskTelefone } from '../utils/masks';
import { logAction } from '../utils/logger';

// --- MODULES SELECTION COMPONENT ---
const AVAILABLE_MODULES = [
    { id: 'atendimento', label: 'Atendimento (Recepção, Internação, Pacientes)' },
    { id: 'agendamento', label: 'Agendamento Cirúrgico (Fila, Mapa Semanal)' },
    { id: 'autorizacao', label: 'Autorizações (Guias e Solicitações)' },
    { id: 'financeiro', label: 'Financeiro (Cockpit, Extratos, Repasses)' },
    { id: 'escala', label: 'Escala Médica (Plantões)' },
    { id: 'dashboard', label: 'Relatórios Gerenciais' },
    { id: 'configuracoes', label: 'Configurações do Sistema' },
    { id: 'adm_escala', label: 'Adm da Escala' }
];

const ModulesSelection = ({ selected = [], onChange }) => {
    const handleToggle = (modId) => {
        if (selected.includes(modId)) {
            onChange(selected.filter(id => id !== modId));
        } else {
            onChange([...selected, modId]);
        }
    };

    const selectAll = () => onChange(AVAILABLE_MODULES.map(m => m.id));
    const clearAll = () => onChange([]);

    return (
        <div className="mt-4 p-4 border border-white/60 rounded-xl bg-white/60">
            <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <LayoutGrid size={14} /> Módulos Permitidos
                </label>
                <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase">Selecionar Todos</button>
                    <span className="text-slate-600">|</span>
                    <button type="button" onClick={clearAll} className="text-[10px] font-bold text-rose-600 hover:text-rose-800 uppercase">Limpar</button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_MODULES.map(mod => {
                    const isChecked = selected.includes(mod.id);
                    return (
                        <div 
                            key={mod.id} 
                            onClick={() => handleToggle(mod.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-blue-500/20 border-blue-200' : 'bg-white/60 border-white/60 hover:bg-white/70'}`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-white/80'}`}>
                                {isChecked && <Check size={12} className="text-slate-800" strokeWidth={3} />}
                            </div>
                            <span className={`text-xs font-semibold ${isChecked ? 'text-blue-900' : 'text-slate-600'}`}>{mod.label}</span>
                        </div>
                    );
                })}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Estes são os módulos que aparecerão no menu para este usuário. As permissões detalhadas dentro de cada módulo continuam seguindo as regras do Cargo/Perfil.</p>
        </div>
    );
};

// 1. Instância Secundária do Supabase Declarativa (Evita Multi-Instances Warnings)
const secondarySupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { storageKey: 'auth-manager-secondary', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const ROLES = ['Desenvolvedor', 'Administrador', 'Operador', 'Visualizador', 'Médico', 'Médico Autorizador', 'Enfermagem', 'Assistente', 'Centro Cirúrgico', 'Teste'];
const PROTECTED_EMAILS = ['coo@ismsaude.com'];

const PERMISSIONS_MODULES = [
    {
        id: 'Modulo: Admin',
        label: 'Módulo: Administração Geral',
        permissions: [
            { id: 'Acesso Total (Admin)', label: 'Admin: Acesso Total (Admin)' }
        ]
    },
    {
        id: 'Modulo: Atendimento',
        label: 'Módulo: Atendimento / Recepção',
        permissions: [
            { id: 'Acessar Recepção', label: 'Recepção: Acessar Painel' },
            { id: 'Visualizar Pacientes', label: 'Pacientes: Visualizar Lista' },
            { id: 'Criar Pacientes', label: 'Pacientes: Criar/Cadastrar' },
            { id: 'Editar Pacientes', label: 'Pacientes: Editar Cadastro' },
            { id: 'Excluir Pacientes', label: 'Pacientes: Excluir' },
        ]
    },
    {
        id: 'Modulo: Mapa Cirurgico',
        label: 'Módulo: Mapa Cirúrgico',
        permissions: [
            { id: 'Visualizar Fila', label: 'Cirurgias: Acessar Fila Cirúrgica' },
            { id: 'Visualizar Mapa/Agenda', label: 'Cirurgias: Acessar Mapa Semanal' },
            { id: 'Criar Agendamentos', label: 'Cirurgias: Inserir/Agendar Paciente' },
            { id: 'Editar Agendamentos', label: 'Cirurgias: Editar/Desmarcar/Reagendar' },
            { id: 'Excluir Agendamentos', label: 'Cirurgias: Excluir Registro' },
            { id: 'Acao: Confirmar', label: 'Ações Mapa: Confirmar Paciente' },
            { id: 'Acao: Realizada', label: 'Ações Mapa: Marcar Realizada' },
            { id: 'Acao: Suspensa', label: 'Ações Mapa: Marcar Suspensa' },
            { id: 'Acao: Nao Internou', label: 'Ações Mapa: Marcar Não Internou' },
            { id: 'Acao: Retrabalho', label: 'Ações Mapa: Reagendar / Resetar / Desmarcar' },
            { id: 'Acao: Anotar', label: 'Ações Mapa: Anotar (Observações)' },
            { id: 'Acao: Editar Tudo', label: 'Ações Mapa: Botão Editar Tudo' },
            { id: 'Acao: Imprimir', label: 'Ações Mapa: Imprimir Documentos' },
            { id: 'Acao: Anexos', label: 'Ações Mapa: Visualizar/Inserir Anexos' },
            { id: 'Acao: Bloquear Agenda', label: 'Ações Mapa: Bloquear/Liberar Agenda' },
        ]
    },
    {
        id: 'Modulo: PEP',
        label: 'Módulo: Médico / PEP',
        permissions: [
            { id: 'Visualizar Atendimentos', label: 'Médico: Acessar Aba Médico (AIH/APA/PEP)' },
            { id: 'Criar/Editar AIH', label: 'Médico: Criar/Editar AIH' },
            { id: 'Criar/Editar APA', label: 'Médico: Criar/Editar APA' },
            { id: 'Excluir AIH/APA', label: 'Médico: Excluir AIH/APA' },
            { id: 'Imprimir Documentos', label: 'Médico: Imprimir Prontuários' },
        ]
    },
    {
        id: 'Modulo: Regulacao',
        label: 'Módulo: Regulação (Guias)',
        permissions: [
            { id: 'Acessar Autorizações', label: 'Regulação: Acessar Painel de Guias' },
        ]
    },
    {
        id: 'Modulo: Financeiro',
        label: 'Módulo: Financeiro',
        permissions: [
            { id: 'Acessar Financeiro', label: 'Financeiro: Acessar Cockpit/Painel' },
            { id: 'Extratos', label: 'Financeiro: Visualizar Extratos' },
            { id: 'Repasses', label: 'Financeiro: Gerenciar Repasses' }
        ]
    },
    {
        id: 'Modulo: Escala',
        label: 'Módulo: Escala Médica',
        permissions: [
            { id: 'Acessar Escala', label: 'Escala: Acessar Plantões Mensais' },
            { id: 'Visualizar Toda Escala', label: 'Escala: Visualizar Toda a Escala' },
            { id: 'Operacional Escala', label: 'Escala: Acessar Financeiro/Ponto' },
            { id: 'Admin Escala', label: 'Escala: Adm da Escala (Gerenciar Meses/Regras)' }
        ]
    },
    {
        id: 'Modulo: Gestao',
        label: 'Módulo: Gestão e Configurações',
        permissions: [
            { id: 'Acessar Relatórios', label: 'Gestão: Acessar Dashboard/Relatórios' },
            { id: 'Acessar Configurações', label: 'Gestão: Acessar Configurações' },
            { id: 'Acessar Usuarios', label: 'Gestão: Acessar Usuários/Permissões' }
        ]
    }
];

// --- PERMISSIONS MODAL ---
const PermissionsModal = ({ onClose }) => {
    const { currentUser } = useAuth();
    const availableRoles = ROLES.filter(p => p.toLowerCase() !== 'desenvolvedor' && p.toLowerCase() !== 'developer');
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadPermissions = async () => {
            try {
                const { data: permData, error } = await supabase.from('settings').select('data').eq('id', 'permissions').maybeSingle();
                if (permData && permData.data) {
                    setPermissions(permData.data);
                }
            } catch (error) {
                console.error(error);
                toast.error("Erro ao carregar permissões");
            } finally {
                setLoading(false);
            }
        };
        loadPermissions();
    }, []);

    const togglePermission = (role, permId) => {
        setPermissions(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [permId]: !prev[role]?.[permId]
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('settings').upsert({ id: 'permissions', data: permissions });
            if (error) throw error;
            await logAction('ALTERAÇÃO DE PERMISSÕES', `Permissões gerais de papéis foram atualizadas no gerenciamento.`);
            toast.success("Permissões salvas!");
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm backdrop-blur-sm z-[10000] overflow-y-auto p-4 flex">
            <div className="m-auto bg-white/95 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/60 max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/60 flex justify-between items-center bg-white/60 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 drop-shadow-none">Matriz de Permissões</h2>
                            <p className="text-xs text-slate-500 font-medium">Defina o que cada perfil pode fazer no sistema</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-purple-600" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableRoles.map(role => (
                                <div key={role} className="bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl overflow-hidden hover:shadow-md transition-shadow shadow-sm">
                                    <div className="bg-white/60 px-4 py-3 border-b border-white/60 backdrop-blur-md">
                                        <h3 className="font-bold text-sm text-slate-700 uppercase">{role}</h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {PERMISSIONS_MODULES.map(module => (
                                            <div key={module.id} className="mb-4 bg-white/60 rounded-lg border border-white/60 overflow-hidden">
                                                <div className="bg-slate-100/50 px-3 py-2 border-b border-white/60">
                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${permissions[role]?.[module.id] ? 'bg-purple-600 border-purple-600' : 'border-white/80 bg-white/5'}`}>
                                                            {permissions[role]?.[module.id] && <Check size={12} className="text-slate-800" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={!!permissions[role]?.[module.id]}
                                                            onChange={() => togglePermission(role, module.id)}
                                                        />
                                                        <span className={`text-xs font-bold uppercase tracking-wider ${permissions[role]?.[module.id] ? 'text-slate-900 drop-shadow-none' : 'text-slate-500'}`}>
                                                            {module.label}
                                                        </span>
                                                    </label>
                                                </div>
                                                
                                                {/* Detalhamento das Permissões do Módulo - Exibidas apenas se o módulo estiver ativo */}
                                                {permissions[role]?.[module.id] && (
                                                    <div className="p-3 space-y-3 bg-white/60 pl-4 border-l-[3px] border-purple-300 ml-3 my-2 rounded-r-lg">
                                                        {module.permissions.map(perm => (
                                                            <label key={perm.id} className="flex items-center gap-3 cursor-pointer group">
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shadow-sm ${permissions[role]?.[perm.id] ? 'bg-blue-600 border-blue-600' : 'border-white/80 bg-white/5'}`}>
                                                                    {permissions[role]?.[perm.id] && <Check size={10} className="text-slate-800" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={!!permissions[role]?.[perm.id]}
                                                                    onChange={() => togglePermission(role, perm.id)}
                                                                />
                                                                <span className={`text-[11px] font-bold ${permissions[role]?.[perm.id] ? 'text-slate-700' : 'text-slate-500'}`}>
                                                                    {perm.label}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/60 bg-white/60 flex justify-end gap-3 backdrop-blur-md">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-white/80 rounded-lg transition-colors">Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-purple-600 text-slate-800 font-bold text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- UNIDADES SELECTION HELPER ---
const UnidadesSelection = ({ selected, onChange }) => {
    const [availableUnits, setAvailableUnits] = useState([]);
    useEffect(() => {
        supabase.from('unidades').select('nome').then(({data}) => setAvailableUnits(data?.map(u=>u.nome) || []));
    }, []);

    const isAll = selected.includes('*');

    const handleToggleAll = (checked) => {
        onChange(checked ? ['*'] : []);
    };

    const handleToggleUnit = (unit, checked) => {
        if (checked) {
            onChange([...selected.filter(u => u !== '*'), unit]);
        } else {
            onChange(selected.filter(u => u !== unit && u !== '*'));
        }
    };

    return (
        <div className="mt-4 p-4 border border-white/60 bg-white/60 rounded-xl space-y-3">
            <h4 className="text-[11px] font-black text-slate-500 uppercase">Acesso de Unidades</h4>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAll} onChange={e => handleToggleAll(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500"/>
                <span className="text-xs font-bold text-slate-900 drop-shadow-none">Acesso Total (Ver todas as unidades)</span>
            </label>
            {!isAll && availableUnits.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/400">
                    {availableUnits.map(unit => (
                        <label key={unit} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selected.includes(unit)} onChange={e => handleToggleUnit(unit, e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500"/>
                            <span className="text-xs font-semibold text-slate-700">{unit}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- USER CREATION MODAL ---
const UserCreationModal = ({ onClose, onSave }) => {
    const { currentUser } = useAuth();
    const availableRoles = ROLES.filter(r => r !== 'Desenvolvedor' || currentUser?.role === 'Desenvolvedor');
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'Visualizador',
        crm: '', rqe: '', sexo: '', cpf: '', telefone: '', categoria_medica: 'Normal', especialidade: '',
        unidades_permitidas: ['*'], modules_access: AVAILABLE_MODULES.map(m => m.id),
        exibir_agenda_home: false, categoria_agenda_id: ''
    });
    const [categoriasAgenda, setCategoriasAgenda] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        supabase.from('agenda_categorias').select('*').order('nome').then(({data}) => setCategoriasAgenda(data || []));
        supabase.from('settings').select('data').eq('id', 'general').maybeSingle().then(({data}) => {
            if (data?.data?.especialidades) setEspecialidades(data.data.especialidades);
        });
    }, []);

    const handleCreate = async () => {
        if (!formData.name || !formData.email || !formData.password) return toast.error("Preencha todos os campos");
        if ((formData.role === 'Médico' || formData.role === 'Médico Autorizador') && !formData.crm) return toast.error("CRM é obrigatório para médicos");

        setLoading(true);

        try {
            // 2. Create User in Auth via REST Fetch API for a specific isolation bypass
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: formData.email, password: formData.password })
            });

            if (!response.ok) {
                const errData = await response.json();
                if (errData.msg === 'User already registered' || errData.message === 'User already registered') {
                    throw new Error("Este email já está cadastrado no sistema (Supabase Auth). Se você deletou este usuário recentemente, você precisa ir no painel do Supabase > Authentication > Users e deletá-lo lá também antes de recriar com o mesmo email.");
                }
                throw new Error(errData.msg || errData.message || "Erro ao criar credenciais.");
            }

            const data = await response.json();
            const uid = data?.id || data?.user?.id;

            if (!uid) throw new Error("Não foi possível gerar um ID de usuário na nuvem.");

            // 3. Create User in Table
            const userData = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                sexo: formData.sexo || '',
                status: 'Ativo',
                createdAt: new Date().toISOString()
            };
            if (['Médico', 'Médico Autorizador', 'Desenvolvedor', 'Administrador'].includes(formData.role)) {
                userData.crm = formData.crm || '';
                userData.rqe = formData.rqe || '';
                userData.cpf = formData.cpf || '';
                userData.telefone = formData.telefone || '';
                if (['Médico', 'Médico Autorizador'].includes(formData.role)) {
                    userData.categoria_medica = formData.categoria_medica || 'Normal';
                    userData.especialidade = formData.especialidade || '';
                }
            }
            userData.unidades_permitidas = formData.unidades_permitidas;
            userData.modules_access = formData.modules_access;
            userData.exibir_agenda_home = formData.exibir_agenda_home;
            userData.categoria_agenda_id = formData.categoria_agenda_id || null;

            await supabase.from('users').insert([{ id: uid, ...userData }]);

            // Auditoria
            await logAction('CRIAÇÃO DE USUÁRIO', `USUÁRIO ${formData.email} CRIADO COM PERFIL ${formData.role}.`);

            // 4. Cleanup
            toast.success("Usuário criado com sucesso!");
            onSave();
            onClose();

        } catch (error) {
            console.error(error);
            toast.error("Erro ao criar usuário: " + (error.message || error));
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm z-[10000] overflow-y-auto p-4 flex">
            <div className="m-auto bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 max-w-2xl w-full p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-600 hover:bg-white/70 rounded-lg transition-all"><X size={20} /></button>

                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-1">Novo Usuário</h2>
                <p className="text-xs text-slate-500 mb-6">Preencha os dados para criar um novo acesso.</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 font-semibold outline-none focus:border-blue-500"
                                placeholder="Ex: Dr. João Silva"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email Corporativo</label>
                            <input
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 font-semibold outline-none focus:border-blue-500"
                                placeholder="usuario@santacasa.com.br"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Senha Provisória</label>
                            <div className="flex gap-2">
                                <input
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    type="text"
                                    className="w-full px-3 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 font-semibold outline-none focus:border-blue-500 font-mono"
                                    placeholder="******"
                                />
                                <button onClick={() => setFormData({ ...formData, password: Math.random().toString(36).slice(-8) })} className="p-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg hover:bg-white/80 text-slate-500" title="Gerar Senha"><Shuffle size={18} /></button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Perfil de Acesso</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-3 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 font-semibold outline-none focus:border-blue-500"
                            >
                                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Equipe/Categoria (Agenda)</label>
                            <select
                                value={formData.categoria_agenda_id || ''}
                                onChange={e => setFormData({ ...formData, categoria_agenda_id: e.target.value || null })}
                                className="w-full px-3 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 font-semibold outline-none focus:border-blue-500"
                            >
                                <option value="">-- Nenhuma Equipe (Geral) --</option>
                                {categoriasAgenda.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Gênero</label>
                            <select
                                value={formData.sexo}
                                onChange={e => setFormData({ ...formData, sexo: e.target.value })}
                                className="w-full px-3 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 font-semibold outline-none focus:border-blue-500"
                            >
                                <option value="">Selecione...</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                            </select>
                        </div>
                    </div>

                    {['Médico', 'Médico Autorizador'].includes(formData.role) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Especialidade Principal</label>
                                <select
                                    value={formData.especialidade}
                                    onChange={e => setFormData({ ...formData, especialidade: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 drop-shadow-none font-semibold outline-none focus:border-blue-500 transition-colors uppercase"
                                >
                                    <option value="">Selecione...</option>
                                    {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Categoria Médica</label>
                                <select
                                    value={formData.categoria_medica}
                                    onChange={e => setFormData({ ...formData, categoria_medica: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-indigo-500/200/10 border border-indigo-100 rounded-lg text-sm text-indigo-800 font-bold outline-none focus:border-indigo-500 transition-colors"
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="Top">Top</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {['Médico', 'Médico Autorizador', 'Desenvolvedor', 'Administrador'].includes(formData.role) && (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">CRM *</label>
                                    <input
                                        value={formData.crm}
                                        onChange={e => setFormData({ ...formData, crm: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 drop-shadow-none font-semibold outline-none focus:border-blue-500"
                                        placeholder="Ex: 12345/SP"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">RQE (Opcional)</label>
                                    <input
                                        value={formData.rqe}
                                        onChange={e => setFormData({ ...formData, rqe: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 drop-shadow-none font-semibold outline-none focus:border-blue-500"
                                        placeholder="Ex: 67890"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">CPF *</label>
                                <input
                                    value={formData.cpf}
                                    onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                                    className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 drop-shadow-none font-semibold outline-none focus:border-blue-500"
                                    placeholder="Ex: 000.000.000-00"
                                    maxLength="14"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Telefone (Celular)</label>
                                <input
                                    value={formData.telefone}
                                    onChange={e => setFormData({ ...formData, telefone: maskTelefone(e.target.value) })}
                                    className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-lg text-sm text-slate-900 drop-shadow-none font-semibold outline-none focus:border-blue-500"
                                    placeholder="Ex: (11) 99999-9999"
                                    maxLength="15"
                                />
                            </div>
                        </div>
                    )}
                    
                    <UnidadesSelection selected={formData.unidades_permitidas} onChange={(v) => setFormData({ ...formData, unidades_permitidas: v })} />
                    
                    <ModulesSelection selected={formData.modules_access} onChange={(v) => setFormData({ ...formData, modules_access: v })} />

                    <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50/50 rounded-xl space-y-2">
                        <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-wide">Preferências de Tela Inicial</h4>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.exibir_agenda_home}
                                onChange={(e) => setFormData({ ...formData, exibir_agenda_home: e.target.checked })}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800">
                                Exibir Agenda de Compromissos (Substitui a frase motivacional)
                            </span>
                        </label>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-white/60 rounded-lg">Cancelar</button>
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><UserPlus size={18} /> Criar Usuário</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- USER EDIT MODAL ---
const UserEditModal = ({ user, onClose, onSave }) => {
    const { currentUser } = useAuth();
    const availableRoles = ROLES.filter(r => r !== 'Desenvolvedor' || currentUser?.role === 'Desenvolvedor');
    const [formData, setFormData] = useState({
        name: user.name || '',
        role: user.role || 'Visualizador',
        status: user.status || 'Ativo',
        crm: user.crm || '',
        rqe: user.rqe || '',
        sexo: user.sexo || '',
        cpf: user.cpf || '',
        telefone: user.telefone || '',
        especialidade: user.especialidade || '',
        categoria_medica: user.categoria_medica || 'Normal',
        unidades_permitidas: user.unidades_permitidas || ['*'],
        modules_access: user.modules_access || AVAILABLE_MODULES.map(m => m.id),
        exibir_agenda_home: user.exibir_agenda_home || false,
        categoria_agenda_id: user.categoria_agenda_id || ''
    });
    const [categoriasAgenda, setCategoriasAgenda] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase.from('agenda_categorias').select('*').order('nome').then(({data}) => setCategoriasAgenda(data || []));
        supabase.from('settings').select('data').eq('id', 'general').maybeSingle().then(({data}) => {
            if (data?.data?.especialidades) setEspecialidades(data.data.especialidades);
        });
    }, []);

    const handleSave = async () => {
        if (['Médico', 'Médico Autorizador'].includes(formData.role) && !formData.crm) {
            return toast.error("CRM é obrigatório para médicos");
        }

        setSaving(true);
        try {
            const dataToSave = { ...formData };
            if (!['Médico', 'Médico Autorizador', 'Desenvolvedor', 'Administrador'].includes(dataToSave.role)) {
                dataToSave.crm = '';
                dataToSave.rqe = '';
                dataToSave.cpf = '';
                dataToSave.telefone = '';
            }
            if (!['Médico', 'Médico Autorizador'].includes(dataToSave.role)) {
                dataToSave.categoria_medica = 'Normal';
                dataToSave.especialidade = '';
            }
            const { error } = await supabase.from('users').update(dataToSave).eq('id', user.id);
            if (error) throw error;
            await logAction('EDIÇÃO DE USUÁRIO', `Usuário ${dataToSave.name || dataToSave.email} atualizado.`);
            toast.success("Usuário atualizado!");
            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) throw error;
            toast.success(`Email de redefinição enviado para ${user.email}`);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao enviar email de redefinição.");
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm z-[10000] overflow-y-auto p-4 flex">
            <div className="m-auto bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/60 max-w-2xl w-full p-8 relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-600 hover:bg-white/70 rounded-lg transition-all"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-2">
                    Editar Usuário
                </h2>
                <p className="text-xs text-slate-500 font-bold mb-6">{user.email}</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">Nome</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                placeholder="Nome completo"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">Perfil de Acesso</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                            >
                                {availableRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">Equipe/Categoria (Agenda)</label>
                            <select
                                value={formData.categoria_agenda_id || ''}
                                onChange={(e) => setFormData({ ...formData, categoria_agenda_id: e.target.value || null })}
                                className="w-full px-4 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                            >
                                <option value="">-- Nenhuma Equipe (Geral) --</option>
                                {categoriasAgenda.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">Gênero</label>
                            <select
                                value={formData.sexo}
                                onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                className="w-full px-4 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                            >
                                <option value="">Selecione...</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                            </select>
                        </div>
                    </div>

                    {['Médico', 'Médico Autorizador'].includes(formData.role) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">
                                    Especialidade Principal
                                </label>
                                <select
                                    value={formData.especialidade}
                                    onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 drop-shadow-none font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer uppercase"
                                >
                                    <option value="">Selecione...</option>
                                    {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">
                                    Categoria Médica
                                </label>
                                <select
                                    value={formData.categoria_medica}
                                    onChange={(e) => setFormData({ ...formData, categoria_medica: e.target.value })}
                                    className="w-full px-4 py-3 bg-indigo-500/200/10 border border-indigo-100 rounded-xl text-sm text-indigo-800 font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer"
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="Top">Top</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {['Médico', 'Médico Autorizador', 'Desenvolvedor', 'Administrador'].includes(formData.role) && (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">CRM *</label>
                                    <input
                                        type="text"
                                        value={formData.crm}
                                        onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 drop-shadow-none font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        placeholder="Ex: 12345/SP"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">RQE (Opcional)</label>
                                    <input
                                        type="text"
                                        value={formData.rqe}
                                        onChange={(e) => setFormData({ ...formData, rqe: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 drop-shadow-none font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        placeholder="Ex: 67890"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">CPF *</label>
                                    <input
                                        value={formData.cpf}
                                        onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                                        className="w-full px-4 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        placeholder="Ex: 000.000.000-00"
                                        maxLength="14"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">Telefone (Celular)</label>
                                    <input
                                        value={formData.telefone}
                                        onChange={e => setFormData({ ...formData, telefone: maskTelefone(e.target.value) })}
                                        className="w-full px-4 py-2 bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-xl text-sm text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        placeholder="Ex: (11) 99999-9999"
                                        maxLength="15"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <UnidadesSelection selected={formData.unidades_permitidas} onChange={(v) => setFormData({ ...formData, unidades_permitidas: v })} />
                    
                    <ModulesSelection selected={formData.modules_access} onChange={(v) => setFormData({ ...formData, modules_access: v })} />

                    <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50/50 rounded-xl space-y-2">
                        <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-wide">Preferências de Tela Inicial</h4>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.exibir_agenda_home}
                                onChange={(e) => setFormData({ ...formData, exibir_agenda_home: e.target.checked })}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800">
                                Exibir Agenda de Compromissos (Substitui a frase motivacional)
                            </span>
                        </label>
                    </div>

                    {/* Status Toggle */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">
                            Status
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFormData({ ...formData, status: 'Ativo' })}
                                className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${formData.status === 'Ativo'
                                    ? 'bg-emerald-500/200 text-slate-800 shadow-lg'
                                    : 'bg-white/70 text-slate-500 hover:bg-white/80'
                                    }`}
                            >
                                Ativo
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, status: 'Inativo' })}
                                className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${formData.status === 'Inativo'
                                    ? 'bg-rose-500/200 text-slate-800 shadow-lg'
                                    : 'bg-white/70 text-slate-500 hover:bg-white/80'
                                    }`}
                            >
                                Inativo
                            </button>
                        </div>
                    </div>

                    {/* Reset Password Button */}
                    <button
                        onClick={handleResetPassword}
                        className="w-full px-4 py-3 bg-amber-500/20 text-amber-600 border border-amber-100 rounded-xl text-xs font-black uppercase hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                    >
                        <KeyRound size={16} />
                        Resetar Senha
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-white/70 text-slate-600 rounded-xl font-black text-sm uppercase hover:bg-white/80 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- MAIN COMPONENT ---
const UserManagement = ({ isEmbedded = false }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState('todos'); // 'todos', 'medicos', 'administrativo'
    const { currentUser } = useAuth();

    const loadUsers = async () => {
        try {
            const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error("Erro buscar usuários", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleDelete = async (id, userName, userEmail) => {
        if (window.confirm(`Remover acesso de ${userName}?`)) {
            try {
                const { error } = await supabase.from('users').delete().eq('id', id);
                if (error) throw error;
                setUsers(prev => prev.filter(u => u.id !== id));
                await logAction('EXCLUSÃO DE USUÁRIO', `USUÁRIO ${userEmail || userName} REMOVIDO DO SISTEMA.`);
                toast.success("Acesso removido");
            } catch (error) {
                toast.error("Erro ao remover.");
            }
        }
    };

    const toggleTopCategoria = async (user) => {
        try {
            const newCategoria = user.categoria_medica === 'Top' ? 'Normal' : 'Top';
            const { error } = await supabase.from('users').update({ categoria_medica: newCategoria }).eq('id', user.id);
            if (error) throw error;
            await logAction('ALTERAÇÃO DE CATEGORIA MÉDICA', `Médico ${user.name || user.email} classificado como ${newCategoria}.`);
            setUsers(users.map(u => u.id === user.id ? { ...u, categoria_medica: newCategoria } : u));
            toast.success(`Médico marcado como ${newCategoria}`);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao alterar categoria.");
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
    );

    const getRoleBadgeColor = (role) => {
        const colors = {
            'Desenvolvedor': 'bg-white/40 text-amber-400 border-amber-500/50 shadow-sm shadow-amber-900/20',
            'Administrador': 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(59,130,246,0.4)] border-none border-blue-100',
            'Operador': 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(59,130,246,0.4)] border-none border-blue-100',
            'Visualizador': 'bg-white/60 text-slate-600 border-white/40',
            'Médico': 'bg-emerald-500/20 text-emerald-600 border-emerald-100',
            'Médico Autorizador': 'bg-emerald-500/20 text-emerald-600 border-emerald-100'
        };
        return colors[role] || colors['Visualizador'];
    };

    const medicosRoles = ['Médico', 'Médico Autorizador'];
    
    const filteredUsers = users.filter(user => {
        if (activeFilter === 'todos') return true;
        if (activeFilter === 'medicos') return medicosRoles.includes(user.role);
        if (activeFilter === 'administrativo') return !medicosRoles.includes(user.role);
        return true;
    });

    const content = (
        <div className="flex flex-col h-full bg-white/60 backdrop-blur-lg rounded-lg border border-white/400 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="p-4 md:p-6 border-b border-white/60 flex flex-col gap-5 bg-white/60 backdrop-blur-md">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900 drop-shadow-none uppercase tracking-widest">
                            Gestão de Acessos
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => setShowPermissionsModal(true)}
                            className="flex-1 md:flex-none px-4 py-2 border border-white/60 bg-white/60 text-slate-600 rounded-lg text-xs font-bold uppercase hover:bg-white/80 hover:border-purple-300 hover:text-purple-600 transition-all flex items-center justify-center gap-2 backdrop-blur-md shadow-sm"
                        >
                            <Shield size={14} /> Permissões
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <UserPlus size={14} strokeWidth={3} /> Novo Usuário
                        </button>
                    </div>
                </div>

                {/* TABS PREMIUM */}
                <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-white/60 self-start">
                    <button 
                        onClick={() => setActiveFilter('todos')} 
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeFilter === 'todos' ? 'bg-white/60 text-slate-900 drop-shadow-none shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Todos <span className={`px-1.5 py-0.5 rounded-md ${activeFilter === 'todos' ? 'bg-white/70 text-slate-500' : 'bg-slate-200/50'}`}>{users.length}</span>
                    </button>
                    <button 
                        onClick={() => setActiveFilter('medicos')} 
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeFilter === 'medicos' ? 'bg-emerald-500/200 text-slate-800 shadow-sm shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Corpo Clínico <span className={`px-1.5 py-0.5 rounded-md ${activeFilter === 'medicos' ? 'bg-white/80 text-slate-800' : 'bg-slate-200/50'}`}>{users.filter(u => medicosRoles.includes(u.role)).length}</span>
                    </button>
                    <button 
                        onClick={() => setActiveFilter('administrativo')} 
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeFilter === 'administrativo' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Administrativo <span className={`px-1.5 py-0.5 rounded-md ${activeFilter === 'administrativo' ? 'bg-white/80 text-slate-800' : 'bg-slate-200/50'}`}>{users.filter(u => !medicosRoles.includes(u.role)).length}</span>
                    </button>
                </div>
            </div>

            {/* Table Container with Scroll */}
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/60 backdrop-blur-md sticky top-0 z-10 shadow-sm border-b border-white/400">
                        <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/60">Nome</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/60">Email</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/60">Perfil</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/60">Status</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/60 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/50">
                        {filteredUsers.map((user) => {
                            const isDeveloper = user.role === 'Desenvolvedor';
                            // Blindagem: Apenas o PRÓPRIO desenvolvedor pode editar sua conta
                            const isProtectedRole = isDeveloper && currentUser?.id !== user.id;

                            return (
                                <tr key={user.id} className="hover:bg-white/60 transition-colors group">
                                    <td className="px-4 py-2.5">
                                        <div className="text-sm font-bold text-slate-700 uppercase">{user.name || '---'}</div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="text-sm font-medium text-slate-500">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase ${user.status === 'Ativo' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500/200' : 'bg-slate-300'}`}></div>
                                            {user.status || 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-100 transition-opacity">
                                            {/* Toggle Top Button for Médicos */}
                                            {['Médico', 'Médico Autorizador'].includes(user.role) && (
                                                <button
                                                    onClick={() => toggleTopCategoria(user)}
                                                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-colors mr-1 ${user.categoria_medica === 'Top' ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-white/70 text-slate-500 hover:bg-white/80'}`}
                                                    title={user.categoria_medica === 'Top' ? 'Remover Top' : 'Marcar como Top'}
                                                >
                                                    TOP
                                                </button>
                                            )}
                                            {/* Edit Button Logic */}
                                            {PROTECTED_EMAILS.includes(user.email) || isProtectedRole ? (
                                                <div className="p-1.5 text-slate-600 cursor-not-allowed" title={isProtectedRole ? "Perfil Protegido (God Mode)" : "Usuário Sistema (Protegido)"}>
                                                    <Lock size={14} />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-500/20 rounded transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            )}

                                            {/* Delete Button Logic */}
                                            {PROTECTED_EMAILS.includes(user.email) || user.email === currentUser?.email || isProtectedRole ? (
                                                <div className="p-1.5 w-[26px]"></div> // Espaço vazio para alinhar
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(user.id, user.name, user.email)}
                                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-500/20 rounded transition-all"
                                                    title="Excluir/Desativar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan="5" className="py-12 text-center text-slate-500 text-[11px] uppercase font-bold tracking-widest">
                                    Nenhum usuário encontrado nesta aba.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Compacto com Legenda */}
            <div className="border-t border-white/60 bg-white/60 backdrop-blur-md p-2 flex gap-3 overflow-x-auto">
                {ROLES.filter(r => r !== 'Desenvolvedor' || currentUser?.role === 'Desenvolvedor').map(role => (
                    <span key={role} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">
                        <div className={`w-1.5 h-1.5 rounded-full ${getRoleBadgeColor(role).split(' ')[0].replace('bg-', 'bg-').replace('-50', '-400')}`}></div>
                        {role}
                    </span>
                ))}
            </div>
        </div>
    );

    // If embedded (inside Settings), return only content
    if (isEmbedded) {
        return (
            <>
                {content}
                {editingUser && (
                    <UserEditModal
                        user={editingUser}
                        onClose={() => setEditingUser(null)}
                        onSave={() => {
                            setEditingUser(null);
                        }}
                    />
                )}
                {showCreateModal && <UserCreationModal onClose={() => setShowCreateModal(false)} onSave={() => { }} />}
                {showPermissionsModal && <PermissionsModal onClose={() => setShowPermissionsModal(false)} />}
            </>
        );
    }

    // If standalone, return with wrapper
    return (
        <div className="px-4 lg:px-4 pr-4 py-8 space-y-6 bg-slate-50/20 min-h-full font-sans">
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest">
                Equipe e Permissões
            </h1>
            {content}
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={() => {
                        setEditingUser(null);
                    }}
                />
            )}
        </div>
    );
};

export default UserManagement;