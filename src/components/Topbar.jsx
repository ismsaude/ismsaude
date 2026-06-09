import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { usePermission } from '../contexts/PermissionContext';
import { UnitSelector } from './UnitSelector';
import {
    LayoutDashboard, ClipboardList, Users, Settings, LogOut,
    Activity, CalendarDays, CalendarRange, FileText, Stethoscope,
    Bed, FileSignature, ShieldCheck, CheckSquare, Building2, User,
    Lock, X, Save, Syringe, ChevronDown, Clock, UploadCloud, FileSpreadsheet, Palette, Menu,
    DollarSign, ArrowRightLeft, Bell
} from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { formatNameStandard } from '../utils/nameFormatter';
import { CompromissosModal } from '../pages/CompromissosModal';

export const Topbar = () => {
    const { currentUser, logout } = useAuth();
    const { theme } = useWhiteLabel();
    const { hasPermission } = usePermission();
    const location = useLocation();
    const navigate = useNavigate();

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [hideDropdown, setHideDropdown] = useState(null);
    const dropdownRef = useRef(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    // Notificações de Agenda
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [openAgenda, setOpenAgenda] = useState(false);
    const notifRef = useRef(null);

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setActiveDropdown(null);
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Lógica de buscar notificações
    const fetchNotifications = async () => {
        if (!currentUser) return;
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            let query = supabase
                .from('agenda_pessoal')
                .select('*, agenda_categorias(nome, cor)')
                .gte('data_agendada', todayStr)
                .eq('concluido', false)
                .not('alerta_minutos', 'is', null)
                .not('hora_agendada', 'is', null);

            const isDoctorOrIuri = currentUser?.role === 'Médico' || (currentUser?.name && currentUser.name.toLowerCase().includes('iuri'));
            if (isDoctorOrIuri) {
                query = query.or(`user_id.eq.${currentUser?.id},autor_id.eq.${currentUser?.id}`);
            }

            const { data, error } = await query;
            if (error || !data) return;

            const activeNotifs = [];
            const now = new Date();
            data.forEach(task => {
                const [hours, minutes] = task.hora_agendada.split(':');
                const eventTime = new Date(task.data_agendada);
                eventTime.setHours(parseInt(hours), parseInt(minutes), 0);
                
                const alertTime = new Date(eventTime.getTime() - task.alerta_minutos * 60000);
                const limitTime = new Date(eventTime.getTime() + 2 * 60 * 60000); // Fica ativo até 2h depois
                
                if (now >= alertTime && now <= limitTime) {
                    activeNotifs.push({ ...task, eventTime });
                }
            });
            
            activeNotifs.sort((a, b) => a.eventTime - b.eventTime);
            setNotifications(activeNotifs);
        } catch (e) {
            console.error("Erro buscar notificações", e);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [currentUser]);

    const handleLogout = async () => {
        try { await logout(); navigate('/login'); }
        catch (error) { console.error("Erro ao sair", error); }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return toast.error("As senhas não coincidem!");
        if (newPassword.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres.");

        setLoadingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.success("Senha atualizada com sucesso!");
            setNewPassword(''); setConfirmPassword(''); setIsProfileOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar senha. Faça login novamente para trocar a senha se necessário.");
        } finally {
            setLoadingPassword(false);
        }
    };

    const menuItems = [
        {
            id: 'recepcao', icon: Building2, label: 'Atendimento', show: hasPermission('Acessar Recepção') || hasPermission('Visualizar Pacientes'),
            subItems: [
                { path: '/recepcao', icon: Activity, label: 'Painel', show: hasPermission('Acessar Recepção') },
                { path: '/pacientes', icon: Users, label: 'Pacientes', show: hasPermission('Visualizar Pacientes') },
                { path: '/agenda', icon: CalendarDays, label: 'Agenda', show: true },
                { path: '/internacao', icon: Bed, label: 'Internação', show: true }
            ]
        },
        {
            id: 'cirurgias', icon: Syringe, label: 'Agendamento', show: hasPermission('Visualizar Fila') || hasPermission('Visualizar Mapa/Agenda'),
            subItems: [
                { path: '/fila', icon: ClipboardList, label: 'Fila Cirúrgica', show: hasPermission('Visualizar Fila') },
                { path: '/semana', icon: CalendarRange, label: 'Mapa Semanal', show: hasPermission('Visualizar Mapa/Agenda') }
            ]
        },

        {
            id: 'regulacao', icon: ShieldCheck, label: 'Autorização', show: hasPermission('Acessar Autorizações'),
            subItems: [
                { path: '/autorizacoes', icon: CheckSquare, label: 'Guias/Autorizações', show: hasPermission('Acessar Autorizações') }
            ]
        },
        {
            id: 'financeiro', icon: DollarSign, label: 'Financeiro', show: hasPermission('Acessar Relatórios'),
            subItems: [
                { path: '/finance/dashboard', icon: LayoutDashboard, label: 'Cockpit', show: hasPermission('Acessar Relatórios') },
                { path: '/finance/transacoes', icon: Activity, label: 'Extratos', show: hasPermission('Acessar Relatórios') },
                { path: '/finance/conciliacao', icon: ArrowRightLeft, label: 'Conciliação', show: hasPermission('Acessar Relatórios') },
                { path: '/finance/repasse', icon: Users, label: 'Rateio/Repasse', show: hasPermission('Acessar Relatórios') },
                { path: '/finance/glosas', icon: ShieldCheck, label: 'Glosas', show: hasPermission('Acessar Relatórios') },
                { path: '/finance/configuracoes', icon: Settings, label: 'Ajustes', show: hasPermission('Acessar Configurações') }
            ]
        },
        {
            id: 'escala', path: '/escala', icon: CalendarDays, label: 'Escala', show: true
        },
        { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'Relatório', show: true },
        {
            id: 'configuracoes', icon: Settings, label: 'Configurações', show: hasPermission('Acessar Configurações') || hasPermission('Acessar Usuarios') || hasPermission('Acesso Total (Admin)'),
            subItems: [
                { 
                    label: 'Cadastros Gerais', 
                    icon: User, 
                    show: hasPermission('Acessar Configurações'),
                    dropdown: [
                        { path: '/configuracoes?tab=especialidades', label: 'Especialidades' },
                        { path: '/configuracoes?tab=convenios', label: 'Convênios' },
                        { path: '/configuracoes?tab=locais', label: 'Salas Cirúrgicas' },
                        { path: '/configuracoes?tab=cidades', label: 'Cidades' },
                        { path: '/configuracoes?tab=anestesias', label: 'Anestesias' },
                        { path: '/configuracoes?tab=status', label: 'Status da Fila' },
                        { path: '/configuracoes?tab=motivos_suspensao', label: 'Motivos de Suspensão' },
                        { path: '/configuracoes?tab=prioridades', label: 'Prioridades' },
                        { path: '/configuracoes?tab=clinicas', label: 'Clínicas AIH' },
                        { path: '/configuracoes?tab=caraterInternacao', label: 'Caráter AIH' },
                        { path: '/configuracoes?tab=categorias_agenda', label: 'Equipes/Categorias' }
                    ]
                },
                { path: '/configuracoes?tab=usuarios', icon: Users, label: 'Gestão de Acessos', show: hasPermission('Acesso Total (Admin)') || hasPermission('Acessar Usuarios') },
                { path: '/configuracoes?tab=orientacoes', icon: FileText, label: 'Textos de Orientação', show: hasPermission('Acessar Configurações') },
                { path: '/configuracoes?tab=identidade', icon: Palette, label: 'Identidade Visual', show: hasPermission('Acesso Total (Admin)') },
                { path: '/configuracoes?tab=hub', icon: LayoutDashboard, label: 'Hub Inicial', show: hasPermission('Acesso Total (Admin)') },
                { path: '/configuracoes?tab=importacao', icon: UploadCloud, label: 'Importação CSV', show: hasPermission('Acessar Configurações') },
                { path: '/configuracoes?tab=basesus', icon: FileSpreadsheet, label: 'Tabela SIGTAP', show: hasPermission('Acessar Configurações') },
                { path: '/configuracoes?tab=logs', icon: Activity, label: 'Logs do Sistema', show: hasPermission('Acesso Total (Admin)') }
            ]
        }
    ].filter(item => item.show);

    const activeModule = menuItems.find(item => {
        if (item.subItems) {
            return item.subItems.some(sub => {
                if (sub.dropdown) return sub.dropdown.some(d => location.pathname === d.path.split('?')[0]);
                if (sub.path) return location.pathname === sub.path.split('?')[0];
                return false;
            });
        }
        return location.pathname === item.path;
    });

    const isHome = location.pathname === '/home';

    return (
        <>
            <header className="h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-[999] shrink-0 print:hidden transition-colors duration-300 bg-white/60 backdrop-blur-md border-b border-white/60 shadow-none">

                {/* LOGO */}
                <div className="flex items-center justify-center shrink-0">
                    <Link to="/home" className="cursor-pointer transition-transform hover:scale-105 active:scale-95 flex items-center">
                        <img src={theme.logoUrl} alt="Logo do Sistema" className="h-8 w-auto object-contain drop-shadow-sm transition-all duration-300 opacity-90" />
                    </Link>
                </div>

                {/* NAV CONDICIONAL E CONTEXTUAL - REMOVIDO A PEDIDO DO USUÁRIO */}
                <div className="hidden lg:flex flex-1 items-center h-full mx-4 sm:mx-8 min-w-0"></div>
                {/* DIREITA */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <UnitSelector />
                    <div className="h-5 w-px hidden sm:block mx-1 bg-white/80"></div>
                    
                    {/* BELL ICON NOTIFICATIONS */}
                    <div className="relative" ref={notifRef}>
                        <button 
                            title="Notificações" 
                            onClick={() => setShowNotifications(!showNotifications)} 
                            className="p-2 rounded-xl transition-all duration-300 shadow-sm border border-transparent text-slate-800 hover:bg-white/70 hover:border-white/30 relative"
                        >
                            <Bell size={18} className={notifications.length > 0 ? "text-red-500 animate-pulse" : "text-slate-600"}/>
                            {notifications.length > 0 && (
                                <span className="absolute top-1 right-1 flex items-center justify-center w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full border border-white">
                                    {notifications.length > 9 ? '9+' : notifications.length}
                                </span>
                            )}
                        </button>

                        {/* DROPDOWN DE NOTIFICAÇÕES */}
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-800">Lembretes ({notifications.length})</span>
                                    <button onClick={() => { setShowNotifications(false); setOpenAgenda(true); }} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Abrir Agenda</button>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-sm text-slate-500">Nenhum lembrete no momento.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {notifications.map(n => (
                                                <div key={n.id} className="p-3 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => { setShowNotifications(false); setOpenAgenda(true); }}>
                                                    <div className="flex gap-2">
                                                        <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.agenda_categorias?.cor || 'bg-blue-500'}`}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] font-semibold text-slate-800 leading-tight">{n.texto}</p>
                                                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                                Hoje às {n.hora_agendada.substring(0,5)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button title="Meu Perfil" onClick={() => setIsProfileOpen(true)} className="p-2 rounded-xl transition-all duration-300 shadow-sm border border-transparent text-slate-800 hover:bg-white/70 hover:border-white/30">
                        <User size={16} />
                    </button>
                    <button title="Sair" onClick={handleLogout} className="p-2 rounded-xl transition-all duration-300 text-slate-800 hover:bg-rose-500/80 hover:text-slate-800">
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            {/* MODAL DE PERFIL ORIGINAL INTACTO */}
            {isProfileOpen && (
                <div className="fixed top-16 inset-x-0 bottom-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
                    <div className="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><User size={20} /></div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest leading-none">Meu Perfil</h2>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Gerencie sua conta</p>
                                </div>
                            </div>
                            <button onClick={() => setIsProfileOpen(false)} className="text-slate-500 hover:text-rose-500 bg-white p-2 rounded-full shadow-sm hover:shadow transition-all"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nome Completo</label>
                                    <div className="text-sm font-bold text-slate-800 uppercase">{formatNameStandard(currentUser?.name || currentUser?.displayName) || '---'}</div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">E-mail</label>
                                    <div className="text-xs font-semibold text-slate-600">{currentUser?.email}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Perfil</label>
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-[11px] font-black uppercase rounded">{currentUser?.role || '---'}</span>
                                </div>
                                {(currentUser?.crm || currentUser?.cpf) && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Documento</label>
                                        <div className="text-xs font-bold text-slate-700">{currentUser?.crm || currentUser?.cpf}</div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <Lock size={12} /> Alterar Senha
                                </h3>
                                <div><input type="password" placeholder="Nova Senha (min. 6 caracteres)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500 placeholder:text-slate-500 placeholder:font-normal" /></div>
                                <div><input type="password" placeholder="Confirmar Nova Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500 placeholder:text-slate-500 placeholder:font-normal" /></div>
                                <button type="submit" disabled={loadingPassword || !newPassword || !confirmPassword} className="w-full py-3 bg-slate-800 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-800/20">
                                    {loadingPassword ? 'Salvando...' : <><Save size={16} /> Atualizar Senha</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE AGENDA CASO ABERTO VIA NOTIFICAÇÃO */}
            {openAgenda && <CompromissosModal onClose={() => setOpenAgenda(false)} />}
        </>
    );
};
