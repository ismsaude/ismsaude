import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { X, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Inbox, Check, Video, MapPin, AlignLeft, Users, Trash2, Paperclip, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const diasSemanaCurtos = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const CompromissosModal = ({ onClose }) => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [tasks, setTasks] = useState([]);
    
    // Calendar view state
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Popover / Form State
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    // Form fields
    const [formTitle, setFormTitle] = useState('');
    const [formCategoryId, setFormCategoryId] = useState(null);
    const [formTime, setFormTime] = useState('');
    const [formAlert, setFormAlert] = useState(''); // in minutes
    const [formFile, setFormFile] = useState(null);
    const [formFileUrl, setFormFileUrl] = useState('');
    const fileInputRef = useRef(null);

    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchCategorias();
        loadTasksForRange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1), new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0));
    }, [currentDate]);

    const fetchUsers = async () => {
        try {
            const { data } = await supabase.from('users').select('id, name, email, role');
            if (data) setUsers(data);
        } catch (err) { console.error(err); }
    };

    const fetchCategorias = async () => {
        try {
            const { data, error } = await supabase.from('agenda_categorias').select('*').order('created_at', { ascending: true });
            if (!error && data) {
                setCategorias(data);
            }
        } catch (err) { console.error("Erro ao carregar categorias", err); }
    };

    const loadTasksForRange = async (start, end) => {
        try {
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            let query = supabase
                .from('agenda_pessoal')
                .select('*, users!agenda_pessoal_user_id_fkey(name), agenda_categorias(nome, cor)')
                .gte('data_agendada', startStr)
                .lte('data_agendada', endStr);

            const isAdminOrDev = currentUser?.role === 'Desenvolvedor' || currentUser?.role === 'Administrador';
            const isDoctorOrIuri = currentUser?.role === 'Médico' || (currentUser?.name && currentUser.name.toLowerCase().includes('iuri'));

            if (!isAdminOrDev) {
                if (currentUser?.categoria_agenda_id) {
                    // Vê tudo da sua categoria + eventos vinculados a ele diretamente
                    query = query.or(`categoria_id.eq.${currentUser.categoria_agenda_id},user_id.eq.${currentUser?.id},autor_id.eq.${currentUser?.id}`);
                } else if (isDoctorOrIuri) {
                    // Preserva a regra anterior se não tiver categoria
                    query = query.or(`user_id.eq.${currentUser?.id},autor_id.eq.${currentUser?.id}`);
                } else {
                    // Outros usuários sem categoria veem eventos gerais (sem categoria) e eventos deles
                    query = query.or(`categoria_id.is.null,user_id.eq.${currentUser?.id},autor_id.eq.${currentUser?.id}`);
                }
            }

            const { data, error } = await query
                .order('data_agendada', { ascending: true })
                .order('hora_agendada', { ascending: true })
                .order('created_at', { ascending: true });

            if (error) throw error;
            setTasks(data || []);
        } catch (e) {
            console.error("Erro ao carregar agenda", e);
        }
    };

    const handleFileUpload = async () => {
        if (!formFile) return formFileUrl; // Se não tem arquivo novo, mantém a url existente
        
        try {
            const fileExt = formFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${currentUser?.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('anexos_agenda')
                .upload(filePath, formFile);

            if (uploadError) {
                toast.error("Erro ao enviar anexo.");
                console.error(uploadError);
                return null;
            }

            const { data } = supabase.storage.from('anexos_agenda').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleSaveTask = async () => {
        if (!formTitle.trim()) return toast.error("Preencha a descrição do evento!");
        
        setIsSaving(true);
        try {
            const yyyy = selectedDate.getFullYear();
            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const dd = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            // Handle file upload
            let uploadedUrl = await handleFileUpload();

            // Determine user_id based on category (if category is "Iuri", assign to him. Otherwise, general)
            // Lógica antiga mantida adaptada: se a categoria tem "iuri" no nome, tenta achar o usuário.
            let targetUserId = currentUser?.id;
            const selectedCat = categorias.find(c => c.id === formCategoryId);
            if (selectedCat && selectedCat.nome.toLowerCase().includes('iuri')) {
                const iuriUser = users.find(u => u.name && u.name.toLowerCase().includes('iuri'));
                if (iuriUser) targetUserId = iuriUser.id;
            }

            const eventData = {
                texto: formTitle,
                user_id: targetUserId,
                categoria_id: formCategoryId,
                hora_agendada: formTime || null,
                alerta_minutos: formAlert ? parseInt(formAlert) : null,
                anexo_url: uploadedUrl || formFileUrl,
                data_agendada: dateStr
            };

            if (selectedEvent) {
                // UPDATE
                const { error } = await supabase.from('agenda_pessoal').update(eventData).eq('id', selectedEvent.id);
                if (error) throw error;
                toast.success("Evento atualizado!");
            } else {
                // INSERT
                eventData.autor_id = currentUser?.id;
                const { error } = await supabase.from('agenda_pessoal').insert([eventData]);
                if (error) throw error;
                toast.success("Evento salvo!");
            }
            
            closePopover();
            loadTasksForRange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1), new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0));
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTask = async () => {
        if (!selectedEvent) return;
        if (!window.confirm("Deseja realmente apagar este evento?")) return;
        
        setIsSaving(true);
        try {
            const { error } = await supabase.from('agenda_pessoal').delete().eq('id', selectedEvent.id);
            if (error) throw error;
            setTasks(prev => prev.filter(t => t.id !== selectedEvent.id));
            toast.success("Removido com sucesso!");
            closePopover();
        } catch (err) {
            toast.error("Erro ao remover.");
        } finally {
            setIsSaving(false);
        }
    }

    const toggleTask = async (id, currentStatus) => {
        try {
            const { error } = await supabase.from('agenda_pessoal').update({ concluido: !currentStatus }).eq('id', id);
            if (error) throw error;
            setTasks(tasks.map(t => t.id === id ? { ...t, concluido: !currentStatus } : t));
        } catch (error) {
            toast.error("Erro ao atualizar tarefa.");
        }
    };

    const myEventsList = useMemo(() => {
        return tasks.map(task => {
            let start = new Date(task.data_agendada + 'T00:00:00');
            let end = new Date(task.data_agendada + 'T23:59:59');
            let allDay = true;

            if (task.hora_agendada) {
                const [hours, minutes] = task.hora_agendada.split(':');
                start = new Date(task.data_agendada + 'T00:00:00');
                start.setHours(parseInt(hours), parseInt(minutes), 0);
                
                end = new Date(task.data_agendada + 'T00:00:00');
                end.setHours(parseInt(hours) + 1, parseInt(minutes), 0);
                allDay = false;
            }

            return {
                id: task.id,
                title: task.texto,
                start,
                end,
                allDay,
                resource: task,
                isMine: task.user_id === currentUser?.id,
                catColor: task.agenda_categorias?.cor || 'bg-slate-400'
            };
        });
    }, [tasks, currentUser]);

    const upcomingEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return myEventsList
            .filter(e => e.start >= today && !e.resource.concluido)
            .sort((a, b) => a.start - b.start)
            .slice(0, 5);
    }, [myEventsList]);

    const openPopoverForNew = useCallback(({ start }) => {
        setSelectedEvent(null);
        setSelectedDate(start);
        setFormTitle('');
        setFormTime('');
        setFormAlert('');
        setFormFile(null);
        setFormFileUrl('');
        // Selecionar a primeira categoria por padrão
        if (categorias.length > 0) setFormCategoryId(categorias[0].id);
        
        setPopoverOpen(true);
        setShowCategoryDropdown(false);
    }, [categorias]);

    const openPopoverForEdit = useCallback((event) => {
        setSelectedEvent(event);
        setSelectedDate(event.start);
        setFormTitle(event.resource.texto);
        setFormTime(event.resource.hora_agendada?.substring(0, 5) || '');
        setFormCategoryId(event.resource.categoria_id);
        setFormAlert(event.resource.alerta_minutos ? event.resource.alerta_minutos.toString() : '');
        setFormFile(null);
        setFormFileUrl(event.resource.anexo_url || '');
        
        setPopoverOpen(true);
        setShowCategoryDropdown(false);
    }, []);

    const closePopover = () => {
        setPopoverOpen(false);
    };

    const components = useMemo(() => ({
        toolbar: (toolbar) => {
            const goToBack = () => toolbar.onNavigate('PREV');
            const goToNext = () => toolbar.onNavigate('NEXT');
            const goToToday = () => toolbar.onNavigate('TODAY');
        
            const label = () => {
                const date = toolbar.date;
                if (toolbar.view === 'day') return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
                return `${meses[date.getMonth()]} de ${date.getFullYear()}`;
            };
        
            return (
                <div className="h-16 flex items-center justify-between px-6 shrink-0 relative bg-white border-b border-slate-200">
                    <div className="w-1/3 flex items-center gap-4">
                        <button onClick={() => openPopoverForNew({ start: new Date() })} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                            <Plus size={22} strokeWidth={2}/>
                        </button>
                        <h2 className="text-[22px] font-bold text-slate-800 tracking-tight hidden sm:block">
                            {label()}
                        </h2>
                    </div>
        
                    <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                        {['day', 'week', 'month'].map((viewName) => (
                            <button 
                                key={viewName}
                                onClick={() => toolbar.onView(viewName)}
                                className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-all capitalize ${toolbar.view === viewName ? 'text-slate-800 bg-white shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {viewName === 'month' ? 'Mês' : viewName === 'week' ? 'Semana' : 'Dia'}
                            </button>
                        ))}
                    </div>
        
                    <div className="w-1/3 flex items-center justify-end gap-3">
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/60">
                            <button onClick={goToBack} className="px-2.5 py-1.5 text-slate-600 hover:bg-white rounded-md transition-all shadow-sm"><ChevronLeft size={16} strokeWidth={2}/></button>
                            <button onClick={goToToday} className="px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-white rounded-md transition-all">Hoje</button>
                            <button onClick={goToNext} className="px-2.5 py-1.5 text-slate-600 hover:bg-white rounded-md transition-all shadow-sm"><ChevronRight size={16} strokeWidth={2}/></button>
                        </div>
                    </div>
                </div>
            );
        },
        event: (props) => {
            const { event } = props;
            const isMonth = props.view === 'month';
            return (
                <div className={`flex items-center px-1 overflow-hidden w-full h-full bg-transparent ${event.resource.concluido ? 'opacity-40 line-through' : ''}`}>
                    <div className={`w-1.5 h-4 rounded-full mr-1.5 shrink-0 ${event.catColor}`}></div>
                    <span className="text-[12px] font-medium text-slate-700 truncate flex-1 leading-none pt-[2px]">{event.title}</span>
                    {event.resource.hora_agendada && isMonth && (
                        <span className="text-[11px] font-medium text-slate-500 shrink-0 ml-1 leading-none">{event.resource.hora_agendada.substring(0,5)}</span>
                    )}
                </div>
            );
        }
    }), [currentDate]);

    const renderMiniCalendar = () => {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); 
        firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

        const todayStr = new Date().toDateString();

        return (
            <div className="bg-white rounded-xl border border-slate-200/60 p-3 mt-auto">
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-semibold text-slate-700 capitalize">{meses[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="text-slate-400 hover:text-slate-600"><ChevronLeft size={14}/></button>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="text-slate-400 hover:text-slate-600"><ChevronRight size={14}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                        <div key={i} className="text-[9px] font-bold text-slate-400">{d}</div>
                    ))}
                    {days.map((d, i) => {
                        if (!d) return <div key={i} className="h-6"></div>;
                        const isToday = d.toDateString() === todayStr;
                        return (
                            <div key={i} className={`h-6 flex items-center justify-center text-[11px] font-medium rounded-full cursor-pointer hover:bg-slate-100 ${isToday ? 'bg-red-500 text-white hover:bg-red-600' : 'text-slate-600'}`}>
                                {d.getDate()}
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    const currentCat = categorias.find(c => c.id === formCategoryId);

    return createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] p-4 flex items-center justify-center animate-in fade-in">
            {/* Botão flutuante de fechar para telas menores onde a sidebar some */}
            <button onClick={onClose} className="md:hidden absolute top-4 right-4 z-[10001] bg-white p-2 rounded-full shadow-lg text-slate-500 hover:text-red-500">
                <X size={24} />
            </button>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[1400px] h-[95vh] flex overflow-hidden relative border border-slate-200/50 apple-calendar">
                
                {/* Lado Esquerdo: Sidebar */}
                <div className="w-[260px] bg-[#f9f9fa] border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
                    <div className="h-16 flex items-center justify-between px-5 border-b border-transparent shrink-0">
                        <div className="flex gap-1.5">
                            <button onClick={onClose} className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center transition-colors shadow-sm group">
                                <X size={8} className="text-red-900 opacity-0 group-hover:opacity-100" strokeWidth={3}/>
                            </button>
                            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm"></div>
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm"></div>
                        </div>
                        <div className="flex items-center gap-4 text-slate-500">
                            <button className="hover:text-slate-800"><CalendarIcon size={20} strokeWidth={1.5}/></button>
                            <button className="hover:text-slate-800"><Inbox size={20} strokeWidth={1.5}/></button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col p-5 overflow-y-auto custom-scrollbar">
                        <div className="mb-6 flex-1">
                            <h4 className="text-xs font-bold tracking-wide text-slate-400 uppercase mb-3">Próximos Eventos</h4>
                            <div className="space-y-3">
                                {upcomingEvents.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-medium">Nenhum evento futuro.</p>
                                ) : (
                                    upcomingEvents.map(ev => (
                                        <div key={ev.id} className="flex gap-3 group cursor-pointer" onClick={() => openPopoverForEdit(ev)}>
                                            <div className="flex flex-col items-center min-w-[24px]">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">{diasSemanaCurtos[ev.start.getDay()]}</span>
                                                <span className={`text-[15px] font-bold leading-none ${ev.start.toDateString() === new Date().toDateString() ? 'text-red-500' : 'text-slate-700'}`}>{ev.start.getDate()}</span>
                                            </div>
                                            <div className="flex flex-col flex-1 truncate pt-0.5">
                                                <span className="text-[12px] font-semibold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">{ev.title}</span>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${ev.catColor}`}></div>
                                                    <span className="text-[10px] font-medium text-slate-500">{ev.resource.agenda_categorias?.nome || 'Geral'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {renderMiniCalendar()}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-white min-w-0">
                    <Calendar
                        localizer={localizer}
                        events={myEventsList}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%', width: '100%' }}
                        culture="pt-BR"
                        components={components}
                        defaultView={Views.MONTH}
                        views={['month', 'week', 'day']}
                        date={currentDate}
                        onNavigate={setCurrentDate}
                        selectable
                        onSelectSlot={openPopoverForNew}
                        onSelectEvent={openPopoverForEdit}
                        popup
                        messages={{
                            next: "Próximo",
                            previous: "Anterior",
                            today: "Hoje",
                            month: "Mês",
                            week: "Semana",
                            day: "Dia"
                        }}
                    />
                </div>

                {/* Apple Calendar Style Popover/Modal */}
                {popoverOpen && (
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-50 flex items-center justify-center" onClick={closePopover}>
                        <div className="bg-white/95 backdrop-blur-3xl p-0 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-200/80 w-[400px] flex flex-col overflow-visible animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            
                            {/* Header apenas com botão fechar e "Novo Evento" opcional */}
                            <div className="h-10 bg-slate-100/50 flex items-center justify-center relative border-b border-slate-200 rounded-t-[20px]">
                                <div className="absolute left-4 w-12 flex gap-1.5">
                                    <button onClick={closePopover} className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center transition-colors shadow-sm">
                                        <X size={8} className="text-red-900 opacity-0 hover:opacity-100" strokeWidth={3}/>
                                    </button>
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</span>
                            </div>

                            <div className="p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto custom-scrollbar relative">
                                
                                {/* Título e Categoria - Área expandida */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-visible relative z-50">
                                    <div className="flex items-start px-4 py-3 relative">
                                        <textarea 
                                            placeholder="Título do Evento..."
                                            className="flex-1 text-base font-semibold text-slate-800 placeholder:text-slate-400 border-none outline-none focus:ring-0 px-0 bg-transparent resize-none min-h-[60px]"
                                            value={formTitle}
                                            onChange={e => setFormTitle(e.target.value)}
                                            autoFocus
                                        />
                                        <button 
                                            className="w-6 h-6 shrink-0 rounded-md hover:bg-slate-200 flex items-center justify-center transition-colors relative mt-1 ml-2"
                                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                            title="Categoria / Equipe"
                                        >
                                            <div className={`w-3.5 h-3.5 rounded-full ${currentCat?.cor || 'bg-slate-300'} shadow-sm`}></div>
                                        </button>

                                        {/* Dropdown de Categoria ABSOLUTO QUE SOBREPÕE TUDO */}
                                        {showCategoryDropdown && (
                                            <div className="absolute right-0 top-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-xl p-1.5 w-[240px] z-[9999] animate-in fade-in slide-in-from-top-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2 mb-2 mt-1 block">Escolha a Categoria</span>
                                                <div className="max-h-48 overflow-y-auto space-y-1">
                                                    {categorias.map(cat => (
                                                        <button 
                                                            key={cat.id}
                                                            onClick={() => { setFormCategoryId(cat.id); setShowCategoryDropdown(false); }}
                                                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium hover:bg-slate-100 transition-colors ${formCategoryId === cat.id ? 'bg-slate-50 text-slate-800' : 'text-slate-600'}`}
                                                        >
                                                            {formCategoryId === cat.id ? <Check size={14} className="text-slate-400"/> : <div className="w-[14px]"></div>}
                                                            <div className={`w-3 h-3 rounded-full ${cat.cor} shadow-sm`}></div>
                                                            <span className="truncate">{cat.nome}</span>
                                                        </button>
                                                    ))}
                                                    {categorias.length === 0 && <span className="text-xs text-slate-500 px-2">Nenhuma cadastrada.</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Data e Hora */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-3 relative z-40">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-medium text-slate-600">Data e Hora</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="date"
                                                value={selectedDate.toISOString().split('T')[0]}
                                                onChange={(e) => {
                                                    if(e.target.value) {
                                                        const [y, m, d] = e.target.value.split('-');
                                                        setSelectedDate(new Date(y, m - 1, d));
                                                    }
                                                }}
                                                className="text-[13px] font-medium text-slate-800 bg-slate-200/50 px-2 py-1 rounded-md border-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <input 
                                                type="time" 
                                                value={formTime}
                                                onChange={e => setFormTime(e.target.value)}
                                                className="text-[13px] font-medium text-slate-800 bg-slate-200/50 px-2 py-1 rounded-md border-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-200 w-full"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-medium text-slate-600 flex items-center gap-2"><Bell size={14}/> Lembrete</span>
                                        <select 
                                            value={formAlert}
                                            onChange={e => setFormAlert(e.target.value)}
                                            className="text-[13px] font-medium text-slate-800 bg-transparent border-none outline-none focus:ring-0 text-right cursor-pointer p-0"
                                        >
                                            <option value="">Nenhum</option>
                                            <option value="0">Na hora do evento</option>
                                            <option value="5">5 minutos antes</option>
                                            <option value="15">15 minutos antes</option>
                                            <option value="30">30 minutos antes</option>
                                            <option value="60">1 hora antes</option>
                                            <option value="1440">1 dia antes</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Placeholder Convidados */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-slate-400">
                                    <div className="flex items-center gap-3">
                                        <Users size={16} />
                                        <span className="text-[13px] font-medium">Adicionar Convidados</span>
                                    </div>
                                    <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase font-bold">Em Breve</span>
                                </div>

                                {/* Anexos Reais */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <Paperclip size={16} />
                                            <span className="text-[13px] font-medium">Anexos</span>
                                        </div>
                                        <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded">Adicionar</button>
                                        <input type="file" className="hidden" ref={fileInputRef} onChange={e => setFormFile(e.target.files[0])}/>
                                    </div>
                                    {(formFile || formFileUrl) && (
                                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                                            <a href={formFileUrl || '#'} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-slate-700 hover:text-blue-600 truncate flex-1">
                                                {formFile ? formFile.name : 'Ver Anexo Atual'}
                                            </a>
                                            <button onClick={() => { setFormFile(null); setFormFileUrl(''); }} className="text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50">
                                                <X size={14}/>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Botões Inferiores */}
                                {selectedEvent && (
                                    <div className="mt-1 flex items-center justify-between pt-1">
                                        <button 
                                            onClick={() => toggleTask(selectedEvent.id, selectedEvent.resource.concluido)}
                                            className={`flex items-center gap-2 text-[13px] font-medium px-3 py-2 rounded-lg transition-colors ${selectedEvent.resource.concluido ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            <Check size={16}/> {selectedEvent.resource.concluido ? 'Reabrir Evento' : 'Marcar Concluído'}
                                        </button>
                                        <button 
                                            onClick={handleDeleteTask}
                                            className="flex items-center gap-2 text-[13px] font-medium px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={16}/> Apagar
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="px-4 pb-4 mt-auto border-t border-transparent pt-2">
                                <button 
                                    onClick={handleSaveTask}
                                    disabled={isSaving || !formTitle.trim()}
                                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium py-2.5 rounded-xl text-[14px] transition-colors flex justify-center items-center h-10 shadow-sm"
                                >
                                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (selectedEvent ? 'Salvar Alterações' : 'Adicionar Evento')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
