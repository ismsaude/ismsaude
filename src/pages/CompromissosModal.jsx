import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X, CalendarDays, User, Plus, Loader2, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';

export const CompromissosModal = ({ onClose }) => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);

    const [formData, setFormData] = useState({
        user_id: '',
        texto: '',
        hora: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        loadTasksForMonth(currentDate);
    }, [currentDate]);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase.from('users').select('id, name, email, role').order('name');
            if (!error && data) {
                setUsers(data);
                const iuri = data.find(u => u.name && u.name.toLowerCase().includes('iuri'));
                if (iuri) {
                    setFormData(prev => ({ ...prev, user_id: iuri.id }));
                } else if (data.length > 0) {
                    setFormData(prev => ({ ...prev, user_id: data[0].id }));
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadTasksForMonth = async (date) => {
        setLoading(true);
        try {
            const start = new Date(date.getFullYear(), date.getMonth(), 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            // Pega um range um pouco maior pra cobrir os dias que aparecem do mes anterior/proximo no grid
            start.setDate(start.getDate() - 7);
            end.setDate(end.getDate() + 7);

            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('agenda_pessoal')
                .select('*, users!agenda_pessoal_user_id_fkey(name)')
                .gte('data_agendada', startStr)
                .lte('data_agendada', endStr)
                .order('data_agendada', { ascending: true })
                .order('created_at', { ascending: true });

            if (error) throw error;
            setTasks(data || []);
        } catch (e) {
            console.error("Erro ao carregar agenda", e);
            toast.error("Erro ao carregar calendário.");
        } finally {
            setLoading(false);
        }
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const handleSave = async () => {
        if (!formData.user_id || !formData.texto) {
            return toast.error("Preencha destinatário e descrição!");
        }

        setSaving(true);
        try {
            let textoFinal = formData.texto;
            if (formData.hora) {
                textoFinal = `[${formData.hora}] ${formData.texto}`;
            }

            // Converter a selectedDate (local time) para a string YYYY-MM-DD
            const offset = selectedDate.getTimezoneOffset();
            const localDate = new Date(selectedDate.getTime() - (offset*60*1000));
            const dateStr = localDate.toISOString().split('T')[0];

            const { error } = await supabase
                .from('agenda_pessoal')
                .insert([{
                    user_id: formData.user_id,
                    texto: textoFinal,
                    data_agendada: dateStr,
                    autor_id: currentUser?.id
                }]);

            if (error) throw error;
            
            toast.success("Compromisso agendado!");
            setFormData({ ...formData, texto: '', hora: '' });
            loadTasksForMonth(currentDate);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar compromisso.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remover este compromisso?")) return;
        try {
            const { error } = await supabase.from('agenda_pessoal').delete().eq('id', id);
            if (error) throw error;
            setTasks(prev => prev.filter(t => t.id !== id));
            toast.success("Removido!");
        } catch (err) {
            toast.error("Erro ao remover.");
        }
    }

    // Helper functions for calendar
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    const days = [];
    // Previous month empty days
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    // Identificar a data de hoje (sem tempo) para estilo especial
    const todayStr = (new Date()).toDateString();
    
    const getTasksForDay = (dateObj) => {
        if (!dateObj) return [];
        const offset = dateObj.getTimezoneOffset();
        const localDate = new Date(dateObj.getTime() - (offset*60*1000));
        const dateStr = localDate.toISOString().split('T')[0];
        return tasks.filter(t => t.data_agendada === dateStr);
    };

    const getUpcomingTasks = (dateObj) => {
        if (!dateObj) return [];
        const offset = dateObj.getTimezoneOffset();
        const localDate = new Date(dateObj.getTime() - (offset*60*1000));
        const dateStr = localDate.toISOString().split('T')[0];
        return tasks.filter(t => t.data_agendada > dateStr);
    };

    const parseTaskText = (texto) => {
        const match = texto.match(/^\[(\d{2}:\d{2})\]\s(.*)/);
        if (match) {
            return { time: match[1], text: match[2] };
        }
        return { time: null, text: texto };
    };

    const selectedTasks = getTasksForDay(selectedDate);
    const upcomingTasks = getUpcomingTasks(selectedDate);
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000] overflow-y-auto p-2 md:p-6 flex items-center justify-center">
            <div className="m-auto bg-white/70 backdrop-blur-3xl rounded-[2rem] shadow-2xl shadow-indigo-900/20 border-2 border-white max-w-[1400px] w-full relative flex flex-col xl:flex-row overflow-hidden max-h-[95vh] h-full">
                
                {/* Fechar Mobile */}
                <button onClick={onClose} className="md:hidden absolute top-4 right-4 p-2 z-50 text-slate-500 hover:text-slate-800 bg-white/50 rounded-full">
                    <X size={20} />
                </button>

                {/* --- LADO ESQUERDO: CALENDÁRIO --- */}
                <div className="flex-1 p-6 md:p-8 flex flex-col min-h-0 bg-white/30">
                    {/* Header do Calendario */}
                    <div className="flex items-center justify-between mb-6 shrink-0 px-2">
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                                {meses[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </h2>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mt-1">Agenda Mensal</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-2 rounded-full bg-white/60 hover:bg-white text-slate-600 transition-all shadow-sm border border-white">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={nextMonth} className="p-2 rounded-full bg-white/60 hover:bg-white text-slate-600 transition-all shadow-sm border border-white">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Grid de Dias */}
                    <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
                        {diasSemana.map(d => (
                            <div key={d} className="text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 flex-1 min-h-[500px] auto-rows-fr">
                        {days.map((d, i) => {
                            if (!d) return <div key={`empty-${i}`} className="p-2 border border-transparent"></div>;

                            const isSelected = selectedDate.toDateString() === d.toDateString();
                            const isToday = d.toDateString() === todayStr;
                            const dayTasks = getTasksForDay(d);

                            return (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedDate(d)}
                                    className={`relative rounded-xl flex flex-col p-1.5 cursor-pointer transition-all min-h-[80px] overflow-hidden border
                                        ${isSelected ? 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-300' : 
                                          isToday ? 'bg-white/90 border-indigo-200 shadow-sm' : 
                                          'bg-white/40 hover:bg-white/70 border-white/60'}
                                    `}
                                >
                                    <span className={`text-[11px] font-bold mb-1 ml-1 ${isSelected ? 'text-indigo-700' : isToday ? 'text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-md self-start leading-none' : 'text-slate-500'}`}>
                                        {d.getDate()}
                                    </span>
                                    
                                    <div className="flex flex-col gap-[3px] w-full overflow-y-auto custom-scrollbar flex-1">
                                        {dayTasks.map((task, idx) => {
                                            const { time, text } = parseTaskText(task.texto);
                                            return (
                                                <div key={task.id} className={`w-full rounded px-1.5 py-[3px] text-[9px] xl:text-[10px] leading-none truncate font-semibold flex items-center gap-1 shrink-0 ${task.concluido ? 'bg-slate-100 text-slate-400 line-through' : 'bg-indigo-100/80 text-indigo-700'}`}>
                                                    {time && <span className="opacity-70 font-black shrink-0">{time}</span>}
                                                    <span className="truncate">{text}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- LADO DIREITO: DETALHES DO DIA SELECIONADO --- */}
                <div className="w-full xl:w-[400px] bg-white/80 border-t xl:border-t-0 xl:border-l border-white shadow-[-10px_0_30px_rgba(0,0,0,0.03)] flex flex-col shrink-0 min-h-[300px]">
                    
                    {/* Botao de fechar (Desktop) */}
                    <button onClick={onClose} className="hidden xl:flex absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10">
                        <X size={20} />
                    </button>

                    {/* Header do Dia */}
                    <div className="p-6 md:p-8 pb-4 border-b border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 to-transparent">
                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">
                            {selectedDate.toDateString() === todayStr ? 'Hoje' : diasSemana[selectedDate.getDay()]}
                        </h3>
                        <h2 className="text-3xl font-black text-slate-800 leading-none">
                            {selectedDate.getDate()} {meses[selectedDate.getMonth()]}
                        </h2>
                    </div>

                    {/* Lista de Compromissos do Dia */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                        {loading && tasks.length === 0 ? (
                            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-400" /></div>
                        ) : selectedTasks.length === 0 ? (
                            upcomingTasks.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-4 px-2">
                                        <CalendarDays size={16} className="text-slate-400" />
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Próximos Eventos</h4>
                                    </div>
                                    {upcomingTasks.map(task => {
                                        const { time, text } = parseTaskText(task.texto);
                                        const [y, m, d] = task.data_agendada.split('-');
                                        return (
                                            <div key={task.id} className="group relative bg-white/60 border border-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                                <button 
                                                    onClick={() => handleDelete(task.id)}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm scale-90 hover:scale-100"
                                                >
                                                    <X size={12} strokeWidth={3}/>
                                                </button>
                                                
                                                <div className="flex items-start gap-3">
                                                    <div className="flex flex-col items-center shrink-0 w-10">
                                                        <span className="text-[11px] font-black text-indigo-500">{d}/{m}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">{time || '--:--'}</span>
                                                    </div>
                                                    <div className="w-px min-h-[30px] bg-indigo-100 self-stretch"></div>
                                                    <div className="flex-1 min-w-0 py-0.5">
                                                        <p className={`text-sm font-bold leading-tight ${task.concluido ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                            {text}
                                                        </p>
                                                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                                                            Para: {task.users?.name?.split(' ')[0] || 'Desconhecido'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 opacity-50">
                                    <CalendarDays size={32} className="mx-auto mb-2 text-slate-400" />
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhum evento</p>
                                </div>
                            )
                        ) : (
                            selectedTasks.map(task => {
                                const { time, text } = parseTaskText(task.texto);
                                return (
                                    <div key={task.id} className="group relative bg-white/90 border border-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                        <button 
                                            onClick={() => handleDelete(task.id)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm scale-90 hover:scale-100"
                                        >
                                            <X size={12} strokeWidth={3}/>
                                        </button>
                                        
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col items-center shrink-0 w-10">
                                                <span className="text-[10px] font-black text-indigo-500">{time || '--:--'}</span>
                                            </div>
                                            <div className="w-px min-h-[30px] bg-indigo-100 self-stretch"></div>
                                            <div className="flex-1 min-w-0 py-0.5">
                                                <p className={`text-sm font-bold leading-tight ${task.concluido ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                    {text}
                                                </p>
                                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                                                    Para: {task.users?.name?.split(' ')[0] || 'Desconhecido'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Formulario de Novo Compromisso */}
                    <div className="p-5 md:p-6 bg-white/90 border-t border-indigo-50 mt-auto">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Plus size={12}/> Novo Evento
                        </h4>
                        
                        <div className="flex flex-col gap-2">
                            <select 
                                value={formData.user_id}
                                onChange={e => setFormData({...formData, user_id: e.target.value})}
                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
                            >
                                <option value="" disabled>Destinatário...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>

                            <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all shadow-sm">
                                <div className="border-r border-slate-200 bg-slate-50 flex items-center shrink-0">
                                    <input 
                                        type="time" 
                                        value={formData.hora}
                                        onChange={e => setFormData({...formData, hora: e.target.value})}
                                        className="w-[105px] bg-transparent text-slate-700 text-xs font-bold px-3 py-3 outline-none text-center cursor-pointer"
                                        title="Horário do compromisso"
                                    />
                                </div>
                                <input 
                                    type="text"
                                    value={formData.texto}
                                    onChange={e => setFormData({...formData, texto: e.target.value})}
                                    placeholder="Título do compromisso..."
                                    className="flex-1 min-w-0 bg-transparent text-slate-700 text-sm font-semibold px-4 py-3 outline-none placeholder:text-slate-400 placeholder:font-medium"
                                    onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                                />
                                <button 
                                    onClick={handleSave}
                                    disabled={saving || !formData.texto.trim() || !formData.user_id}
                                    className="w-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shrink-0"
                                    title="Salvar Evento"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
