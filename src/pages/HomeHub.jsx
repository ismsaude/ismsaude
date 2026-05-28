import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Building2, CalendarRange, Activity, DollarSign, CalendarClock, LayoutDashboard, Settings as SettingsIcon, LogOut, Instagram, MessageCircle, MapPin, CalendarDays, Check, X, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import bgImage from '../assets/capa-login.jpg';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import toast from 'react-hot-toast';
import { usePerformance } from '../hooks/usePerformance';
import { CompromissosModal } from './CompromissosModal';

export const AgendaPessoalWidget = ({ currentUser, refreshTrigger }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const generateDays = () => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            days.push(date);
        }
        return days;
    };
    
    const weekDays = generateDays();

    const loadTasks = async () => {
        if (!currentUser?.id) return;
        try {
            const { data, error } = await supabase
                .from('agenda_pessoal')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setTasks(data || []);
        } catch (error) {
            console.error("Erro ao carregar agenda", error);
        } finally {
            setLoading(false);
        }
    };

    const parseTaskText = (texto) => {
        const match = texto.match(/^\[(\d{2}:\d{2})\]\s(.*)/);
        if (match) {
            return { time: match[1], text: match[2] };
        }
        return { time: null, text: texto };
    };

    useEffect(() => {
        loadTasks();
    }, [currentUser?.id, refreshTrigger]);

    const toggleTask = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('agenda_pessoal')
                .update({ concluido: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            setTasks(tasks.map(t => t.id === id ? { ...t, concluido: !currentStatus } : t));
        } catch (error) {
            toast.error("Erro ao atualizar tarefa.");
        }
    };

    const formatDayName = (date) => {
        const nomes = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        return nomes[date.getDay()];
    };

    const formatDateString = (date) => {
        return date.toISOString().split('T')[0];
    };

    return (
        <div className="flex-1 rounded-[2rem] p-4 flex flex-col bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all min-h-[140px] relative overflow-hidden">
            <div className="flex flex-row gap-2 overflow-x-auto custom-scrollbar w-full pt-1 pb-2 px-1 h-full">
                {weekDays.map((date, idx) => {
                    const dateStr = formatDateString(date);
                    const todayStr = formatDateString(new Date());
                    const isToday = dateStr === todayStr;
                    const dayTasks = tasks.filter(t => t.data_agendada === dateStr || (!t.data_agendada && idx === 0));
                    const parsedTasks = dayTasks.map(t => ({ ...t, parsed: parseTaskText(t.texto) }));
                    const sortedTasks = parsedTasks.sort((a, b) => {
                        const timeA = a.parsed.time || "24:00";
                        const timeB = b.parsed.time || "24:00";
                        return timeA.localeCompare(timeB);
                    });

                    return (
                        <div key={idx} className={`flex flex-col min-w-[105px] flex-1 rounded-[1rem] p-2 border shrink-0 ${isToday ? 'bg-indigo-50/70 border-indigo-200/60 shadow-sm' : 'bg-white/30 border-white/40'}`}>
                            <div className="flex items-center justify-between mb-2 border-b border-indigo-100/50 pb-1">
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                                    {isToday ? 'HOJE' : formatDayName(date)}
                                </span>
                                <span className="text-base font-black text-slate-700 leading-none">{date.getDate()}</span>
                            </div>
                            
                            <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">
                                {loading ? (
                                    <span className="text-[9px] text-slate-400 font-bold uppercase text-center mt-1 opacity-60">...</span>
                                ) : sortedTasks.length === 0 ? (
                                    <span className="text-[9px] text-slate-400 font-bold uppercase text-center mt-1 opacity-60">Livre</span>
                                ) : (
                                    sortedTasks.map(task => {
                                        const { time, text } = task.parsed;
                                        return (
                                            <div key={task.id} className="flex items-start gap-1.5 group">
                                                <button 
                                                    onClick={() => toggleTask(task.id, task.concluido)}
                                                    className={`w-3.5 h-3.5 mt-0.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${task.concluido ? 'bg-indigo-500 border-indigo-500' : 'border-indigo-300 hover:border-indigo-400 bg-white'}`}
                                                >
                                                    {task.concluido && <Check size={8} className="text-white" strokeWidth={4} />}
                                                </button>
                                                <div className="flex flex-col flex-1 leading-[1.15]">
                                                    {time && <span className="text-[10px] font-black text-indigo-600 mb-[1px]">{time}</span>}
                                                    <span className={`text-[9.5px] font-bold ${task.concluido ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                                                        {text}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const HomeHub = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const { theme } = useWhiteLabel();
    const { isLowEndDevice } = usePerformance();

    const textoPadrao = "A iSM Saúde atua em diversas unidades, com milhares de procedimentos realizados mensalmente. Parabéns, você também faz parte disso. É um privilégio para nós termos você conosco.";
    const [marqueeText, setMarqueeText] = useState(theme.marqueeText || textoPadrao);
    const [currentCarouselIdx, setCurrentCarouselIdx] = useState(0);
    const [upcomingShifts, setUpcomingShifts] = useState([]);
    const [loadingShifts, setLoadingShifts] = useState(true);
    const [showCompromissosModal, setShowCompromissosModal] = useState(false);
    const [agendaRefreshTrigger, setAgendaRefreshTrigger] = useState(0);

    const formatShiftDate = (parsedDate) => {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return `${parsedDate.getDate()} ${meses[parsedDate.getMonth()]} - ${diasSemana[parsedDate.getDay()]}`;
    };

    const getDaysUntil = (parsedDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = parsedDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Amanhã';
        return `Em ${diffDays} dias`;
    };

    useEffect(() => {
        const fetchShifts = async () => {
            try {
                setLoadingShifts(true);
                const { data, error } = await supabase.from('settings').select('data').eq('id', 'escala').maybeSingle();
                if (error || !data?.data?.assignments) {
                    setLoadingShifts(false);
                    return;
                }

                const assignments = data.data.assignments;
                const userName = currentUser?.name || currentUser?.nome || currentUser?.displayName;
                if (!userName) {
                    setLoadingShifts(false);
                    return;
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const normalizeName = (name) => {
                    if (!name) return '';
                    let n = name.toUpperCase()
                        .replace(/^DR[A]?\.?\s+/, '')
                        .trim();
                    return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                };
                
                const userNorm = normalizeName(userName);

                const myShifts = Object.entries(assignments)
                    .map(([key, a]) => { return { ...a, _key: key }; })
                    .filter(a => {
                        const docNorm = normalizeName(a.doctorName);
                        if (!docNorm || !userNorm) return false;
                        if (docNorm === userNorm || docNorm.includes(userNorm) || userNorm.includes(docNorm)) return true;

                        const docWords = docNorm.split(' ').filter(w => w.length > 2);
                        const userWords = userNorm.split(' ').filter(w => w.length > 2);
                        
                        if (docWords.length > 0 && userWords.length > 0 && docWords[0] === userWords[0]) {
                            const matchCount = docWords.filter(w => userWords.includes(w)).length;
                            if (matchCount > 1 || docWords.length === 1 || userWords.length === 1) return true;
                        }
                        return false;
                    })
                    .map(a => {
                        let shiftDate = null;
                        if (a.date && a.date.includes('/')) {
                            const [dayStr, monthStr] = a.date.split('/');
                            const year = today.getFullYear();
                            shiftDate = new Date(year, parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
                            
                            if (shiftDate.getMonth() < today.getMonth() - 2) {
                                shiftDate.setFullYear(year + 1);
                            } else if (shiftDate.getMonth() > today.getMonth() + 2 && today.getMonth() < 2) {
                                shiftDate.setFullYear(year - 1);
                            }
                        } else if (a._key && a._key.match(/^\d{4}-\d{2}-w\d/)) {
                            const parts = a._key.split('-');
                            if (parts.length >= 6) {
                                const year = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10);
                                const weekIdx = parseInt(parts[2].replace('w', ''), 10) - 1;
                                const dayIdx = parseInt(parts[5], 10);
                                
                                const firstDay = new Date(year, month - 1, 1);
                                const startDayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                                
                                shiftDate = new Date(firstDay);
                                shiftDate.setDate(shiftDate.getDate() - startDayOffset + (weekIdx * 7) + dayIdx);
                            }
                        }
                        
                        if (shiftDate) {
                            a.parsedDate = shiftDate;
                        }
                        return a;
                    })
                    .filter(a => {
                        return a.parsedDate && a.parsedDate >= today;
                    })
                    .sort((a, b) => a.parsedDate - b.parsedDate)
                    .slice(0, 6);

                setUpcomingShifts(myShifts);
            } catch (error) {
                console.error("Erro ao buscar plantões", error);
            } finally {
                setLoadingShifts(false);
            }
        };

        if (currentUser) {
            fetchShifts();
        }
    }, [currentUser]);

    useEffect(() => {
        if (theme.marqueeText) setMarqueeText(theme.marqueeText);
    }, [theme.marqueeText]);

    useEffect(() => {
        if (!theme.hubCarouselImages || theme.hubCarouselImages.length === 0) return;
        const interval = setInterval(() => {
            setCurrentCarouselIdx(prev => (prev + 1) % theme.hubCarouselImages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [theme.hubCarouselImages]);

    const handleWhatsappClick = (link) => {
        if (!link) return toast.error("WhatsApp não configurado!");
        const finalLink = link.startsWith('http') ? link : `https://${link}`;
        window.open(finalLink, '_blank');
    };

    const handleInstagramClick = (link) => {
        if (!link) {
            window.open('https://instagram.com/ismsaude', '_blank');
            return;
        }
        const finalLink = link.startsWith('http') ? link : `https://${link}`;
        window.open(finalLink, '_blank');
    };

    let titulo = '';
    const name = currentUser?.name || currentUser?.nome || currentUser?.displayName || 'Usuário';
    
    const formatName = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };
    
    const primeiroNome = formatName(name.split(' ')[0]);

    const sexo = (currentUser?.sexo || '').toUpperCase();
    let bemVindoText = 'bem-vindo';

    if (sexo === 'F' || sexo === 'FEMININO') {
        bemVindoText = 'bem-vinda';
    } else if (sexo === 'M' || sexo === 'MASCULINO') {
        bemVindoText = 'bem-vindo';
    }

    if (currentUser?.role === 'Médico') {
        if (sexo === 'M' || sexo === 'MASCULINO') titulo = 'Dr. ';
        else if (sexo === 'F' || sexo === 'FEMININO') titulo = 'Dra. ';
    }

    const saudacao = `Olá, ${titulo}${primeiroNome}`;

    const modules = [
        {
            id: 'atendimento',
            title: 'Atendimento',
            desc: 'Pacientes e Agenda',
            icon: Building2,
            path: '/atendimento',
            iconColor: 'text-emerald-600',
            iconBg: 'bg-emerald-50'
        },
        {
            id: 'mapa',
            title: 'Mapa Cirúrgico',
            desc: 'Mapa das Unidades',
            icon: CalendarRange,
            path: '/semana',
            iconColor: 'text-blue-600',
            iconBg: 'bg-blue-50'
        },
        {
            id: 'pep',
            title: 'PEP',
            desc: 'Prontuário e Atendimento',
            icon: Activity,
            path: '/pep-hub', 
            iconColor: 'text-indigo-600',
            iconBg: 'bg-indigo-50'
        },
        {
            id: 'financeiro',
            title: 'Financeiro',
            desc: 'Repasses e relatórios',
            icon: DollarSign,
            path: '/finance/dashboard',
            iconColor: 'text-violet-600',
            iconBg: 'bg-violet-50'
        },
        {
            id: 'escala',
            title: 'Escala Médica',
            desc: 'Escala de plantões',
            icon: CalendarClock,
            path: '/escala',
            iconColor: 'text-amber-600',
            iconBg: 'bg-amber-50'
        },
        {
            id: 'relatorios',
            title: 'Relatórios',
            desc: 'Relatórios diversos',
            icon: LayoutDashboard,
            path: '/dashboard',
            iconColor: 'text-rose-600',
            iconBg: 'bg-rose-50'
        },
        {
            id: 'configuracoes',
            title: 'Configurações',
            desc: 'Ajustes diversos',
            icon: SettingsIcon,
            path: '/configuracoes',
            iconColor: 'text-slate-600',
            iconBg: 'bg-slate-100'
        },
        {
            id: 'compromissos',
            title: 'Compromissos',
            desc: 'Agendar tarefas',
            icon: ClipboardList,
            path: null,
            iconColor: 'text-fuchsia-600',
            iconBg: 'bg-fuchsia-50'
        }
    ].filter(mod => {
        if (mod.id === 'compromissos') return true;
        if (currentUser?.modules_access) {
            const idMap = {
                'atendimento': 'atendimento',
                'mapa': 'agendamento',
                'pep': 'atendimento',
                'financeiro': 'financeiro',
                'escala': 'escala',
                'relatorios': 'dashboard',
                'configuracoes': 'configuracoes'
            };
            return currentUser.modules_access.includes(idMap[mod.id]);
        }
        return true;
    });

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error(error);
        }
    };

    const formatContactName = (name) => {
        if (!name) return { name: 'Suporte', desc: '' };
        let n = name.replace(/falar com/i, '').trim();
        let parts = n.split('-');
        if(parts.length > 1) {
            return { name: parts[0].trim(), desc: parts.slice(1).join('-').trim() };
        }
        return { name: n, desc: '' };
    };

    const ast1 = formatContactName(theme.hubAssistant1Name);
    const ast2 = formatContactName(theme.hubAssistant2Name);

    return (
        <div className="h-full w-full flex flex-col font-sans p-4 md:p-8 pt-[80px] md:pt-[96px] relative overflow-hidden">
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-6 mb-4 px-2 lg:px-4 min-h-0 w-full max-w-[1500px] mx-auto overflow-y-auto lg:overflow-hidden custom-scrollbar">
                {/* Esquerda: Boas-vindas, Módulos e Agenda */}
                <div className="lg:w-[70%] flex flex-col gap-6 min-h-0 lg:overflow-hidden lg:pr-2">
                    <div className="flex flex-col text-slate-800 drop-shadow-md shrink-0">
                        <h1 className="text-4xl font-black tracking-normal mb-1">{saudacao}</h1>
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Seja {bemVindoText} ao sistema da iSM Saúde</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-4 lg:gap-6 flex-1">
                    {modules.map((mod, idx) => {
                        let darkIconColor = 'text-slate-800';
                        let darkIconBg = 'bg-white/70';
                        if (mod.id === 'atendimento') { darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/30'; }
                        if (mod.id === 'mapa') { darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md shadow-blue-500/30'; }
                        if (mod.id === 'pep') { darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-indigo-400 to-purple-500 shadow-md shadow-indigo-500/30'; }
                        if (mod.id === 'financeiro') { darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-md shadow-violet-500/30'; }
                        if (mod.id === 'escala') { darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30'; }
                        if (mod.id === 'relatorios') { darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-md shadow-rose-500/30'; }
                        if (mod.id === 'configuracoes') { darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-md shadow-slate-500/30'; }
                        if (mod.id === 'compromissos') { darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-fuchsia-400 to-pink-500 shadow-md shadow-fuchsia-500/30'; }

                        return (
                            <div 
                                key={mod.id}
                                onClick={() => {
                                    if (mod.id === 'compromissos') setShowCompromissosModal(true);
                                    else if (mod.path) navigate(mod.path);
                                }}
                                className={`group relative overflow-hidden rounded-[2rem] flex flex-col items-center justify-center text-center transition-all duration-500 cursor-pointer h-full w-full py-4 lg:py-6
                                    ${!mod.path && mod.id !== 'compromissos'
                                        ? 'bg-transparent border-2 border-dashed border-white/80 opacity-50 cursor-default hover:opacity-70' 
                                        : 'bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-white/50 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.15)]'
                                    }`}
                            >
                                {mod.icon ? (
                                    <div className={`w-14 h-14 mb-3 rounded-[1rem] flex items-center justify-center ${darkIconBg} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
                                        <mod.icon size={24} className={darkIconColor} strokeWidth={2} />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 mb-4 rounded-[1.25rem] border-2 border-dashed border-white/30 flex items-center justify-center">
                                        <span className="text-3xl text-slate-400 font-light">+</span>
                                    </div>
                                )}

                                {mod.title && <h3 className="text-[15px] md:text-base font-black text-slate-800 mb-0 leading-snug tracking-wide z-10 px-2 drop-shadow-sm">{mod.title}</h3>}
                            </div>
                        )
                    })}
                    </div>

                    {/* Quadro de Avisos ou Agenda */}
                    <div className="flex-1 w-full flex min-h-[220px]">
                        {currentUser?.exibir_agenda_home ? (
                            <AgendaPessoalWidget currentUser={currentUser} refreshTrigger={agendaRefreshTrigger} />
                        ) : (
                            <div className="flex-1 rounded-[2rem] p-6 md:p-8 flex items-center justify-center bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-white/50 transition-all min-h-[100px]">
                                {marqueeText ? (
                                    <p className="text-[15px] font-medium text-slate-700 leading-relaxed tracking-wide text-center drop-shadow-sm px-4">
                                        "{marqueeText}"
                                    </p>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center opacity-80">
                                        <Activity size={24} className="text-slate-500 mb-2"/>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nenhum aviso importante</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Direita: Plantões e Suporte */}
                <div className="w-full lg:w-[30%] flex flex-col gap-6 min-h-0">
                    <div className="rounded-[2rem] p-6 flex flex-col h-full bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-white/50 transition-all overflow-hidden">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                <CalendarClock size={16}/>
                                Próximos Plantões
                            </h3>
                            <button onClick={() => navigate('/escala')} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors border border-indigo-100">
                                Ver tudo
                            </button>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto no-scrollbar pr-1 pb-2">
                            {loadingShifts ? (
                                <div className="flex flex-col gap-3 items-center justify-center h-full opacity-80">
                                    <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs font-semibold text-slate-600">Carregando seus plantões...</span>
                                </div>
                            ) : upcomingShifts.length > 0 ? (
                                upcomingShifts.map((shift, idx) => {
                                    const isNext = idx === 0;
                                    let derivedPeriod = shift.period;
                                    if (shift.time) {
                                        if (shift.time.includes('07-19') || shift.time.includes('07:00') || shift.time.includes('07h') || shift.time.includes('08-20')) derivedPeriod = 'Diurno';
                                        else if (shift.time.includes('19-07') || shift.time.includes('19:00') || shift.time.includes('19h') || shift.time.includes('20-08')) derivedPeriod = 'Noturno';
                                        else if (shift.time.includes('13-19') || shift.time.includes('13:00')) derivedPeriod = 'Tarde';
                                        else if (shift.time.includes('07-13') || shift.time.includes('07:00')) derivedPeriod = 'Manhã';
                                    }
                                    return (
                                        <div key={idx} className={`rounded-[1rem] p-2 border flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 shrink-0 ${isNext ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-white/60 border-white/60 hover:border-white/80 hover:bg-white/70'}`}>
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isNext ? 'text-indigo-700 bg-indigo-500/20' : 'text-slate-600 bg-white/70 border border-white/60'}`}>
                                                    {formatShiftDate(shift.parsedDate)}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase ${isNext ? 'text-indigo-600' : 'text-slate-500'}`}>{getDaysUntil(shift.parsedDate)}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-800 leading-none mt-1">{shift.hospitalName} {derivedPeriod ? `- ${derivedPeriod}` : ''}</span>
                                            <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1 mt-1">
                                                <CalendarClock size={11}/> {shift.time}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center opacity-80 h-full p-6 rounded-2xl">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-50 rounded-full border border-white flex items-center justify-center mb-3 shadow-inner">
                                        <CalendarRange size={32} className="text-indigo-400 drop-shadow-sm"/>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 mb-1">Agenda Livre</p>
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Nenhum plantão escalado</p>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Suporte Rápido */}
                    <div className="shrink-0 h-[140px] rounded-[2rem] p-4 flex flex-col justify-center bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-white/50 transition-all">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 text-center">
                            Suporte Rápido
                        </h3>
                        <div className="flex flex-row items-center justify-center gap-4">
                            {/* Assistente 1 */}
                            <div className="flex flex-col items-center group cursor-pointer flex-1" onClick={() => handleWhatsappClick(theme.hubAssistant1Whatsapp)}>
                                <div className="w-10 h-10 rounded-full overflow-hidden mb-1.5 bg-white/70 border-2 border-transparent group-hover:border-white/400 flex items-center justify-center transition-all shadow-lg hover:shadow-xl">
                                    {theme.hubAssistant1Photo ? (
                                        <img src={theme.hubAssistant1Photo} className="w-full h-full object-cover" alt="Assistente 1" />
                                    ) : (
                                        <span className="text-sm font-black text-slate-600">A1</span>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold text-slate-700 text-center uppercase tracking-wider group-hover:text-slate-800 transition-colors">{ast1.name}</span>
                                {ast1.desc && <span className="text-[8px] font-semibold text-slate-500 text-center uppercase tracking-widest leading-none mt-0.5">{ast1.desc}</span>}
                            </div>

                            {/* Assistente 2 */}
                            <div className="flex flex-col items-center group cursor-pointer flex-1" onClick={() => handleWhatsappClick(theme.hubAssistant2Whatsapp)}>
                                <div className="w-10 h-10 rounded-full overflow-hidden mb-1.5 bg-white/70 border-2 border-transparent group-hover:border-white/400 flex items-center justify-center transition-all shadow-lg hover:shadow-xl">
                                    {theme.hubAssistant2Photo ? (
                                        <img src={theme.hubAssistant2Photo} className="w-full h-full object-cover" alt="Assistente 2" />
                                    ) : (
                                        <span className="text-sm font-black text-slate-600">A2</span>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold text-slate-700 text-center uppercase tracking-wider group-hover:text-slate-800 transition-colors">{ast2.name}</span>
                                {ast2.desc && <span className="text-[8px] font-semibold text-slate-500 text-center uppercase tracking-widest leading-none mt-0.5">{ast2.desc}</span>}
                            </div>

                            {/* Instagram */}
                            <div className="flex flex-col items-center group cursor-pointer flex-1" onClick={() => handleInstagramClick(theme.hubInstagramLink)}>
                                <div className="w-10 h-10 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-full flex items-center justify-center mb-1.5 shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all">
                                    <Instagram size={16} className="text-slate-800" />
                                </div>
                                <span className="text-[9px] font-bold text-slate-600 text-center uppercase tracking-wider group-hover:text-slate-800 transition-colors">Insta</span>
                            </div>
                        </div>
                    </div>
                </div>



            </div>
            
            {showCompromissosModal && (
                <CompromissosModal 
                    onClose={() => {
                        setShowCompromissosModal(false);
                        setAgendaRefreshTrigger(prev => prev + 1);
                    }} 
                    currentUser={currentUser} 
                />
            )}
            
            <style jsx="true">{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
};

export default HomeHub;
