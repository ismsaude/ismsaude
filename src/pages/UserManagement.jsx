import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import {
    Edit2, Trash2, Loader2, X, KeyRound, UserPlus,
    Shield, Check, Shuffle, AlertTriangle, Lock, Edit, LayoutGrid, CheckSquare, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { maskCPF } from '../utils/masks';
import { logAction } from '../utils/logger';

// 1. Instância Secundária do Supabase Declarativa (Evita Multi-Instances Warnings)
const secondarySupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { storageKey: 'auth-manager-secondary', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const ROLES = ['Desenvolvedor', 'Administrador', 'Operador', 'Visualizador', 'Médico', 'Médico Autorizador', 'Enfermagem', 'Assistente', 'Centro Cirúrgico', 'Teste'];
const PROTECTED_EMAILS = ['coo@ismsaude.com'];

const PERMISSIONS_LIST = [
    { id: 'Acesso Total (Admin)', label: 'Admin: Acesso Total (Admin)' },

    // ABA ATENDIMENTO / RECEPÇÃO
    { id: 'Acessar Recepção', label: 'Recepção: Acessar Painel' },
    { id: 'Visualizar Pacientes', label: 'Pacientes: Visualizar Lista' },
    { id: 'Criar Pacientes', label: 'Pacientes: Criar/Cadastrar' },
    { id: 'Editar Pacientes', label: 'Pacientes: Editar Cadastro' },
    { id: 'Excluir Pacientes', label: 'Pacientes: Excluir' },

    // ABA AGENDAMENTO / MAPA CIRÚRGICO
    { id: 'Visualizar Fila', label: 'Cirurgias: Acessar Fila Cirúrgica' },
    { id: 'Visualizar Mapa/Agenda', label: 'Cirurgias: Acessar Mapa Semanal' },
    { id: 'Criar Agendamentos', label: 'Cirurgias: Inserir/Agendar Paciente' },
    { id: 'Editar Agendamentos', label: 'Cirurgias: Editar/Desmarcar/Reagendar' },
    { id: 'Excluir Agendamentos', label: 'Cirurgias: Excluir Registro' },

    // MAPA CIRÚRGICO: AÇÕES RÁPIDAS (POP-UP)
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

    // ABA MÉDICO / PEP
    { id: 'Visualizar Atendimentos', label: 'Médico: Acessar Aba Médico (AIH/APA/PEP)' },
    { id: 'Criar/Editar AIH', label: 'Médico: Criar/Editar AIH' },
    { id: 'Criar/Editar APA', label: 'Médico: Criar/Editar APA' },
    { id: 'Excluir AIH/APA', label: 'Médico: Excluir AIH/APA' },
    { id: 'Imprimir Documentos', label: 'Médico: Imprimir Prontuários' },

    // ABA AUTORIZAÇÕES / REGULAÇÃO
    { id: 'Acessar Autorizações', label: 'Regulação: Acessar Painel de Guias' },

    // GESTÃO
    { id: 'Acessar Relatórios', label: 'Gestão: Acessar Dashboard/Relatórios' },
    { id: 'Acessar Configurações', label: 'Gestão: Acessar Configurações' },
    { id: 'Acessar Usuarios', label: 'Gestão: Acessar Usuários/Permissões' }
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
            toast.success("Permissões salvas!");
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed top-16 inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/60 max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/60 flex justify-between items-center bg-white/40 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Matriz de Permissões</h2>
                            <p className="text-xs text-slate-500 font-medium">Defina o que cada perfil pode fazer no sistema</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-purple-600" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableRoles.map(role => (
                                <div key={role} className="bg-white/50 backdrop-blur-md border border-white/60 rounded-xl overflow-hidden hover:shadow-md transition-shadow shadow-sm">
                                    <div className="bg-white/40 px-4 py-3 border-b border-white/60 backdrop-blur-md">
                                        <h3 className="font-bold text-sm text-slate-700 uppercase">{role}</h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {PERMISSIONS_LIST.map(perm => (
                                            <label key={perm.id} className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${permissions[role]?.[perm.id] ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                                                    {permissions[role]?.[perm.id] && <Check size={12} className="text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={!!permissions[role]?.[perm.id]}
                                                    onChange={() => togglePermission(role, perm.id)}
                                                />
                                                <span className={`text-xs font-medium ${permissions[role]?.[perm.id] ? 'text-slate-800' : 'text-slate-500'}`}>
                                                    {perm.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/60 bg-white/40 flex justify-end gap-3 backdrop-blur-md">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-purple-600 text-white font-bold text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
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
        <div className="mt-4 p-4 border border-white/60 bg-white/30 rounded-xl space-y-3">
            <h4 className="text-[10px] font-black text-slate-500 uppercase">Acesso de Unidades</h4>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAll} onChange={e => handleToggleAll(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500"/>
                <span className="text-xs font-bold text-slate-800">Acesso Total (Ver todas as unidades)</span>
            </label>
            {!isAll && availableUnits.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/50">
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
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Visualizador', crm: '', rqe: '', sexo: '', cpf: '', unidades_permitidas: ['*'] });
    const [loading, setLoading] = useState(false);

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
                throw new Error(errData.msg || "Erro ao criar credenciais.");
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
            }
            userData.unidades_permitidas = formData.unidades_permitidas;

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

    return (
        <div className="fixed top-16 inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 max-w-md w-full p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><X size={20} /></button>

                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-1">Novo Usuário</h2>
                <p className="text-xs text-slate-500 mb-6">Preencha os dados para criar um novo acesso.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                        <input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white/50 border border-white/60 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500"
                            placeholder="Ex: Dr. João Silva"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Corporativo</label>
                        <input
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white/50 border border-white/60 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500"
                            placeholder="usuario@santacasa.com.br"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Senha Provisória</label>
                        <div className="flex gap-2">
                            <input
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                type="text"
                                className="w-full px-3 py-2.5 bg-white/50 border border-white/60 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500 font-mono"
                                placeholder="******"
                            />
                            <button onClick={() => setFormData({ ...formData, password: Math.random().toString(36).slice(-8) })} className="p-2 bg-white/50 border border-white/60 rounded-lg hover:bg-white/80 text-slate-500 backdrop-blur-md" title="Gerar Senha"><Shuffle size={18} /></button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Perfil de Acesso</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white/50 border border-white/60 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500"
                        >
                            {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gênero</label>
                        <select
                            value={formData.sexo}
                            onChange={e => setFormData({ ...formData, sexo: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white/50 border border-white/60 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500"
                        >
                            <option value="">Selecione...</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                        </select>
                    </div>

                    {['Médico', 'Médico Autorizador', 'Desenvolvedor', 'Administrador'].includes(formData.role) && (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CRM *</label>
                                    <input
                                        value={formData.crm}
                                        onChange={e => setFormData({ ...formData, crm: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-white/50 border border-white/60 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500"
                                        placeholder="Ex: 12345/SP"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RQE (Opcional)</label>
                                    <input
                                        value={formData.rqe}
                                        onChange={e => setFormData({ ...formData, rqe: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-white/50 border border-white/60 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500"
                                        placeholder="Ex: 67890"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CPF *</label>
                                <input
                                    value={formData.cpf}
                                    onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                                    className="w-full px-3 py-2.5 bg-white/50 border border-white/60 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500"
                                    placeholder="Ex: 000.000.000-00"
                                    maxLength="14"
                                />
                            </div>
                        </div>
                    )}
                    
                    <UnidadesSelection selected={formData.unidades_permitidas} onChange={(v) => setFormData({ ...formData, unidades_permitidas: v })} />
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancelar</button>
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><UserPlus size={18} /> Criar Usuário</>}
                    </button>
                </div>
            </div>
        </div>
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
        unidades_permitidas: user.unidades_permitidas || ['*']
    });
    const [saving, setSaving] = useState(false);

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
            }
            const { error } = await supabase.from('users').update(dataToSave).eq('id', user.id);
            if (error) throw error;
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

    return (
        <div className="fixed top-16 inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/60 max-w-md w-full p-8 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                    Editar Usuário
                </h2>
                <p className="text-xs text-slate-400 font-bold mb-6">{user.email}</p>

                {/* Form */}
                <div className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">
                            Nome
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl text-sm text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                            placeholder="Nome completo"
                        />
                    </div>

                    {/* Role Dropdown */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">
                            Perfil de Acesso
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl text-sm text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                        >
                            {availableRoles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sexo Dropdown */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">
                            Gênero
                        </label>
                        <select
                            value={formData.sexo}
                            onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl text-sm text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                        >
                            <option value="">Selecione...</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                        </select>
                    </div>

                    {['Médico', 'Médico Autorizador', 'Desenvolvedor', 'Administrador'].includes(formData.role) && (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">CRM *</label>
                                    <input
                                        type="text"
                                        value={formData.crm}
                                        onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl text-sm text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        placeholder="Ex: 12345/SP"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">RQE (Opcional)</label>
                                    <input
                                        type="text"
                                        value={formData.rqe}
                                        onChange={(e) => setFormData({ ...formData, rqe: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl text-sm text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        placeholder="Ex: 67890"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">CPF *</label>
                                <input
                                    value={formData.cpf}
                                    onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl text-sm text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                    placeholder="Ex: 000.000.000-00"
                                    maxLength="14"
                                />
                            </div>
                        </div>
                    )}

                    <UnidadesSelection selected={formData.unidades_permitidas} onChange={(v) => setFormData({ ...formData, unidades_permitidas: v })} />

                    {/* Status Toggle */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">
                            Status
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFormData({ ...formData, status: 'Ativo' })}
                                className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${formData.status === 'Ativo'
                                    ? 'bg-emerald-500 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    }`}
                            >
                                Ativo
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, status: 'Inativo' })}
                                className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${formData.status === 'Inativo'
                                    ? 'bg-rose-500 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    }`}
                            >
                                Inativo
                            </button>
                        </div>
                    </div>

                    {/* Reset Password Button */}
                    <button
                        onClick={handleResetPassword}
                        className="w-full px-4 py-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-xs font-black uppercase hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                    >
                        <KeyRound size={16} />
                        Resetar Senha
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-all"
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
        </div>
    );
};

// --- MAIN COMPONENT ---
const UserManagement = ({ isEmbedded = false }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
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

    if (loading) return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
    );

    const getRoleBadgeColor = (role) => {
        const colors = {
            'Desenvolvedor': 'bg-slate-900 text-amber-400 border-amber-500/50 shadow-sm shadow-amber-900/20',
            'Administrador': 'bg-blue-50 text-blue-600 border-blue-100',
            'Operador': 'bg-blue-50 text-blue-600 border-blue-100',
            'Visualizador': 'bg-slate-50 text-slate-600 border-slate-100',
            'Médico': 'bg-emerald-50 text-emerald-600 border-emerald-100'
        };
        return colors[role] || colors['Visualizador'];
    };

    const content = (
        <div className="flex flex-col h-full bg-white/60 backdrop-blur-lg rounded-lg border border-white/50 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="p-4 border-b border-white/60 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/40 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                        Todos os Usuários <span className="text-slate-400 font-medium ml-1">({users.length})</span>
                    </h3>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setShowPermissionsModal(true)}
                        className="flex-1 md:flex-none px-4 py-2 border border-white/60 bg-white/50 text-slate-600 rounded-lg text-xs font-bold uppercase hover:bg-white/80 hover:border-purple-300 hover:text-purple-600 transition-all flex items-center justify-center gap-2 backdrop-blur-md"
                    >
                        <Shield size={14} /> Permissões
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center justify-center gap-2"
                    >
                        <UserPlus size={14} /> Novo Usuário
                    </button>
                </div>
            </div>

            {/* Table Container with Scroll */}
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/40 backdrop-blur-md sticky top-0 z-10 shadow-sm border-b border-white/50">
                        <tr>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Nome</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Email</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Perfil</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/50">
                        {users.map((user) => {
                            const isDeveloper = user.role === 'Desenvolvedor';
                            // Blindagem: Apenas o PRÓPRIO desenvolvedor pode editar sua conta
                            const isProtectedRole = isDeveloper && currentUser?.id !== user.id;

                            return (
                                <tr key={user.id} className="hover:bg-white/40 transition-colors group">
                                    <td className="px-4 py-2.5">
                                        <div className="text-xs font-bold text-slate-700 uppercase">{user.name || '---'}</div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="text-xs font-medium text-slate-500">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${user.status === 'Ativo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                            {user.status || 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-100 transition-opacity">
                                            {/* Edit Button Logic */}
                                            {PROTECTED_EMAILS.includes(user.email) || isProtectedRole ? (
                                                <div className="p-1.5 text-slate-300 cursor-not-allowed" title={isProtectedRole ? "Perfil Protegido (God Mode)" : "Usuário Sistema (Protegido)"}>
                                                    <Lock size={14} />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
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
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
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
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="5" className="py-12 text-center text-slate-400 text-xs italic">
                                    Nenhum usuário encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Compacto com Legenda */}
            <div className="border-t border-white/60 bg-white/40 backdrop-blur-md p-2 flex gap-3 overflow-x-auto">
                {ROLES.filter(r => r !== 'Desenvolvedor' || currentUser?.role === 'Desenvolvedor').map(role => (
                    <span key={role} className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
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
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
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