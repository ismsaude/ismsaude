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
    Lock, X, Save, Syringe, ChevronDown, Clock, UploadCloud, FileSpreadsheet, Palette, Menu
} from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export const Topbar = () => {
    const { currentUser, logout } = useAuth();
    const { theme } = useWhiteLabel();
    const { hasPermission } = usePermission();
    const location = useLocation();
    const navigate = useNavigate();

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [forceHideDropdown, setForceHideDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setActiveDropdown(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            id: 'clinico', icon: Stethoscope, label: 'Médico', show: hasPermission('Visualizar Atendimentos'),
            subItems: [
                { path: '/pep', icon: FileSignature, label: 'PEP', show: true },
                { path: '/apa', icon: Activity, label: 'APA', show: hasPermission('Visualizar Atendimentos') },
                { path: '/aih', icon: FileText, label: 'AIH', show: hasPermission('Visualizar Atendimentos') }
            ]
        },
        {
            id: 'regulacao', icon: ShieldCheck, label: 'Autorização', show: hasPermission('Acessar Autorizações'),
            subItems: [
                { path: '/autorizacoes', icon: CheckSquare, label: 'Guias/Autorizações', show: hasPermission('Acessar Autorizações') }
            ]
        },
        { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'Relatório', show: true }
    ].filter(item => item.show);

    return (
        <>
            <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 sm:px-6 sticky top-0 z-[999] shrink-0 print:hidden">

                {/* LOGO */}
                <div className="flex items-center justify-center">
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
                        <Menu size={24} />
                    </button>
                    <Link to="/dashboard" className="cursor-pointer transition-transform hover:scale-105 active:scale-95 flex items-center">
                        <img src={theme.logoUrl} alt="Logo do Sistema" className="h-8 w-auto object-contain drop-shadow-sm" />
                    </Link>
                </div>

                {/* NAV */}
                {/* NAV UNIFICADA COM HOVER (CSS PURE) */}
                <nav className="hidden lg:flex items-center gap-1 h-full">
                    {menuItems.map(item => {
                        const isParentActive = item.subItems ? item.subItems.some(sub => location.pathname === sub.path) : isActive(item.path);

                        const btnStyle = isParentActive
                            ? 'bg-white/80 text-blue-600 font-bold shadow-sm border border-slate-200/60'
                            : 'bg-transparent text-slate-500 hover:bg-white/50 hover:text-blue-600 border border-transparent';

                        return (
                            <div 
                                key={item.id || item.path} 
                                className="relative group flex h-full items-center"
                                onMouseLeave={() => setForceHideDropdown(false)}
                            >
                                {item.subItems ? (
                                    <div 
                                        onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-tighter transition-all duration-300 cursor-pointer ${btnStyle}`}
                                    >
                                        <item.icon size={16} strokeWidth={isParentActive ? 2.5 : 2} />
                                        {item.label}
                                        <ChevronDown size={14} className={`ml-0.5 transition-transform ${activeDropdown === item.id ? 'rotate-180' : (!forceHideDropdown ? 'group-hover:rotate-180' : '')}`} />
                                    </div>
                                ) : (
                                    <Link
                                        to={item.path}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-tighter transition-all duration-300 ${btnStyle}`}
                                    >
                                        <item.icon size={16} strokeWidth={isParentActive ? 2.5 : 2} />
                                        {item.label}
                                    </Link>
                                )}

                                {/* DROPDOWN MENU COM HOVER E CLICK TOUCH */}
                                {item.subItems && (
                                    <div className={`absolute top-[100%] left-0 pt-2 min-w-[180px] z-50 transition-all duration-200 ${activeDropdown === item.id ? 'opacity-100 visible' : (!forceHideDropdown ? 'lg:group-hover:opacity-100 lg:group-hover:visible opacity-0 invisible' : 'opacity-0 invisible')}`}>
                                        <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 flex flex-col gap-1">
                                            {item.subItems.filter(sub => sub.show).map(sub => (
                                                sub.isSoon ? (
                                                    <div key={sub.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase text-slate-400 bg-slate-50/50 cursor-not-allowed">
                                                        <div className="flex items-center gap-2"><sub.icon size={14} /> {sub.label}</div>
                                                        <span className="text-[7px] text-amber-500 font-black tracking-widest">BREVE</span>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        key={sub.path} to={sub.path}
                                                        onClick={(e) => { 
                                                            setActiveDropdown(null); 
                                                            setForceHideDropdown(true); 
                                                        }}
                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter transition-all duration-300 ${isActive(sub.path) ? 'bg-white/90 text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}
                                                    >
                                                        <sub.icon size={14} strokeWidth={isActive(sub.path) ? 2.5 : 2} /> {sub.label}
                                                    </Link>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* MENU CONFIGURAÇÕES COM HOVER NATIVO E ROTAS CORRETAS */}
                    {(hasPermission('Acessar Configurações') || hasPermission('Acessar Usuarios')) && (
                        <div 
                            className="relative group flex h-full items-center ml-2"
                            onMouseLeave={() => setForceHideDropdown(false)}
                        >
                            <div 
                                onClick={() => setActiveDropdown(activeDropdown === 'config' ? null : 'config')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-tighter transition-all duration-300 cursor-pointer border ${location.pathname.includes('/configuracoes') ? 'bg-white/80 text-blue-600 font-bold shadow-sm border-slate-200/60' : 'bg-transparent text-slate-500 hover:bg-white/50 hover:text-blue-600 border-transparent'}`}
                            >
                                <Settings size={16} strokeWidth={2} /> Configurações
                            </div>
                            
                            <div className={`absolute top-[100%] right-0 pt-2 min-w-[220px] z-50 transition-all duration-200 ${activeDropdown === 'config' ? 'opacity-100 visible' : 'opacity-0 invisible lg:group-hover:opacity-100 lg:group-hover:visible'}`}>
                                <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 flex flex-col gap-1">
                                    {hasPermission('Acessar Configurações') && (
                                        <>
                                            <Link onClick={() => { setActiveDropdown(null); setForceHideDropdown(true); }} to="/configuracoes?tab=medicos" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all duration-300"><User size={14}/> Cadastros Gerais</Link>
                                            <Link onClick={() => { setActiveDropdown(null); setForceHideDropdown(true); }} to="/configuracoes?tab=orientacoes" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all duration-300"><FileText size={14}/> Textos de Orientação</Link>
                                            <Link onClick={() => { setActiveDropdown(null); setForceHideDropdown(true); }} to="/configuracoes?tab=horarios" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all duration-300"><Clock size={14}/> Horários Operacionais</Link>
                                            <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                            <Link onClick={() => { setActiveDropdown(null); setForceHideDropdown(true); }} to="/configuracoes?tab=importacao" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all duration-300"><UploadCloud size={14}/> Importação CSV</Link>
                                            <Link onClick={() => { setActiveDropdown(null); setForceHideDropdown(true); }} to="/configuracoes?tab=basesus" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all duration-300"><FileSpreadsheet size={14}/> Tabela SIGTAP</Link>
                                        </>
                                    )}

                                    {(hasPermission('Acesso Total (Admin)') || hasPermission('Acessar Usuarios')) && (
                                        <>
                                            <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                            <Link onClick={() => { setActiveDropdown(null); setForceHideDropdown(true); }} to="/configuracoes?tab=usuarios" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300"><Users size={14}/> Gestão de Acessos</Link>
                                        </>
                                    )}
                                    
                                    {hasPermission('Acesso Total (Admin)') && (
                                        <>
                                            <Link onClick={() => { setActiveDropdown(null); setForceHideDropdown(true); }} to="/configuracoes?tab=identidade" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300"><Palette size={14}/> Identidade Visual</Link>
                                            <Link onClick={() => { setActiveDropdown(null); setForceHideDropdown(true); }} to="/configuracoes?tab=logs" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tighter text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300"><Activity size={14}/> Logs do Sistema</Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </nav>

                {/* DIREITA */}
                <div className="flex items-center gap-2">
                    <UnitSelector />
                    <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1"></div>
                    <button title="Meu Perfil" onClick={() => setIsProfileOpen(true)} className="p-2 rounded-xl text-slate-500 hover:bg-white/60 hover:text-blue-600 transition-all duration-300 shadow-sm border border-transparent hover:border-white/50">
                        <User size={16} />
                    </button>
                    <button title="Sair" onClick={handleLogout} className="p-2 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all duration-300">
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
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">Meu Perfil</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gerencie sua conta</p>
                                </div>
                            </div>
                            <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-rose-500 bg-white p-2 rounded-full shadow-sm hover:shadow transition-all"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                                    <div className="text-sm font-bold text-slate-800 uppercase">{currentUser?.name || currentUser?.displayName || '---'}</div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
                                    <div className="text-xs font-semibold text-slate-600">{currentUser?.email}</div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Perfil</label>
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded">{currentUser?.role || '---'}</span>
                                </div>
                                {(currentUser?.crm || currentUser?.cpf) && (
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Documento</label>
                                        <div className="text-xs font-bold text-slate-700">{currentUser?.crm || currentUser?.cpf}</div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <Lock size={12} /> Alterar Senha
                                </h3>
                                <div><input type="password" placeholder="Nova Senha (min. 6 caracteres)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500 placeholder:text-slate-400 placeholder:font-normal" /></div>
                                <div><input type="password" placeholder="Confirmar Nova Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold outline-none focus:border-blue-500 placeholder:text-slate-400 placeholder:font-normal" /></div>
                                <button type="submit" disabled={loadingPassword || !newPassword || !confirmPassword} className="w-full py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-800/20">
                                    {loadingPassword ? 'Salvando...' : <><Save size={16} /> Atualizar Senha</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* OVERLAY DO MENU MOBILE */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-sm lg:hidden print:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-[320px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <img src={theme.logoUrl} alt="Logo" className="h-8 object-contain" />
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg bg-slate-50"><X size={18} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 py-4 px-3 space-y-3 custom-scrollbar">
                            {menuItems.map(item => (
                                <div key={item.id || item.path} className="flex flex-col">
                                    {item.subItems ? (
                                        <>
                                            <div className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                                <item.icon size={14} /> {item.label}
                                            </div>
                                            <div className="flex flex-col ml-3 pl-3 border-l border-slate-100 space-y-1">
                                                {item.subItems.filter(s => s.show).map(sub => sub.isSoon ? (
                                                    <div key={sub.label} className="px-3 py-2.5 text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-tight">
                                                        <sub.icon size={14} /> {sub.label} <span className="text-[8px] text-amber-500 font-black ml-auto border border-amber-200 px-1 rounded bg-amber-50">Breve</span>
                                                    </div>
                                                ) : (
                                                    <Link key={sub.path} to={sub.path} onClick={() => setIsMobileMenuOpen(false)} className={`px-3 py-2.5 text-xs font-bold uppercase tracking-tight rounded-xl flex items-center gap-2 transition-all ${isActive(sub.path) ? 'bg-blue-50 text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                                                        <sub.icon size={14} strokeWidth={isActive(sub.path) ? 2.5 : 2} /> {sub.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <Link to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={`px-3 py-3 text-xs font-bold uppercase tracking-tight rounded-xl flex items-center gap-2 transition-all ${isActive(item.path) ? 'bg-blue-50 text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                                            <item.icon size={16} strokeWidth={isActive(item.path) ? 2.5 : 2} /> {item.label}
                                        </Link>
                                    )}
                                </div>
                            ))}

                            {(hasPermission('Acessar Configurações') || hasPermission('Acessar Usuarios')) && (
                                <div className="flex flex-col mt-4 pt-4 border-t border-slate-100">
                                    <div className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                        <Settings size={14} /> Configurações
                                    </div>
                                    <div className="flex flex-col ml-3 pl-3 border-l border-slate-100 space-y-1">
                                        {hasPermission('Acessar Configurações') && (
                                            <>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} to="/configuracoes?tab=medicos" className="px-3 py-2.5 text-xs font-bold uppercase tracking-tight text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-2"><User size={14}/> Cadastros Gerais</Link>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} to="/configuracoes?tab=orientacoes" className="px-3 py-2.5 text-xs font-bold uppercase tracking-tight text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-2"><FileText size={14}/> Textos de Orientação</Link>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} to="/configuracoes?tab=horarios" className="px-3 py-2.5 text-xs font-bold uppercase tracking-tight text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-2"><Clock size={14}/> Horários</Link>
                                                <div className="h-px bg-slate-100 mx-2 my-1"></div>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} to="/configuracoes?tab=importacao" className="px-3 py-2.5 text-xs font-bold uppercase tracking-tight text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-2"><UploadCloud size={14}/> Importação CSV</Link>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} to="/configuracoes?tab=basesus" className="px-3 py-2.5 text-xs font-bold uppercase tracking-tight text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-2"><FileSpreadsheet size={14}/> Tabela SIGTAP</Link>
                                                <div className="h-px bg-slate-100 mx-2 my-1"></div>
                                            </>
                                        )}
                                        
                                        {(hasPermission('Acesso Total (Admin)') || hasPermission('Acessar Usuarios')) && (
                                            <Link onClick={() => setIsMobileMenuOpen(false)} to="/configuracoes?tab=usuarios" className="px-3 py-2.5 text-xs font-bold uppercase tracking-tight text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2"><Users size={14}/> Gestão de Acessos</Link>
                                        )}
                                        
                                        {hasPermission('Acesso Total (Admin)') && (
                                            <>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} to="/configuracoes?tab=identidade" className="px-3 py-2.5 text-xs font-bold uppercase tracking-tight text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2"><Palette size={14}/> Identidade Visual</Link>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} to="/configuracoes?tab=logs" className="px-3 py-2.5 text-xs font-bold uppercase tracking-tight text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2"><Activity size={14}/> Logs do Sistema</Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
