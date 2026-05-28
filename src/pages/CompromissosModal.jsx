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
            if (!error && data) setUsers(data);
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
    
    // Função utilitária para pegar tarefas de um dia específico
    const getTasksForDay = (dateObj) => {
        if (!dateObj) return [];
        // Local iso string
        const offset = dateObj.getTimezoneOffset();
        const localDate = new Date(dateObj.getTime() - (offset*60*1000));
        const dateStr = localDate.toISOString().split('T')[0];
        return tasks.filter(t => t.data_agendada === dateStr);
    };

    const parseTaskText = (texto) => {
        const match = texto.match(/^\[(\d{2}:\d{2})\]\s(.*)/);
        if (match) {
            return { time: match[1], text: match[2] };
        }
        return { time: null, text: texto };
    };

    const selectedTasks = getTasksForDay(selectedDate);
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000] overflow-y-auto p-4 md:p-8 flex items-center justify-center">
            <div className="m-auto bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 border-2 border-white max-w-5xl w-full relative flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
                
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

                    <div className="grid grid-cols-7 gap-2 flex-1 min-h-[300px] auto-rows-fr">
                        {days.map((d, i) => {
                            if (!d) return <div key={`empty-${i}`} className="p-2"></div>;

                            const isSelected = selectedDate.toDateString() === d.toDateString();
                            const isToday = d.toDateString() === todayStr;
                            const dayTasks = getTasksForDay(d);
                            const hasTasks = dayTasks.length > 0;

                            return (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedDate(d)}
                                    className={`relative rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all min-h-[50px]
                                        ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400 ring-offset-2 ring-offset-white/50' : 
                                          isToday ? 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200' : 
                                          'bg-white/60 text-slate-700 hover:bg-white/90 border border-white'}
                                    `}
                                >
                                    <span className={`text-base font-semibold ${isSelected ? 'text-white' : ''}`}>
                                        {d.getDate()}
                                    </span>
                                    
                                    {/* Indicadores de Evento */}
                                    {hasTasks && (
                                        <div className="absolute bottom-1.5 flex gap-0.5">
                                            {dayTasks.slice(0, 3).map((_, idx) => (
                                                <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`}></div>
                                            ))}
                                            {dayTasks.length > 3 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`}></div>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- LADO DIREITO: DETALHES DO DIA SELECIONADO --- */}
                <div className="w-full md:w-[380px] bg-white/80 border-l border-white shadow-[-10px_0_30px_rgba(0,0,0,0.03)] flex flex-col shrink-0">
                    
                    {/* Botao de fechar (Desktop) */}
                    <button onClick={onClose} className="hidden md:flex absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10">
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
                            <div className="text-center py-8 opacity-50">
                                <CalendarDays size={32} className="mx-auto mb-2 text-slate-400" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhum evento</p>
                            </div>
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
                    <div className="p-6 bg-white/90 border-t border-indigo-50 mt-auto">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Plus size={12}/> Adicionar Evento
                        </h4>
                        
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <div className="w-[90px]">
                                    <input 
                                        type="time" 
                                        value={formData.hora}
                                        onChange={e => setFormData({...formData, hora: e.target.value})}
                                        className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2 py-2.5 outline-none focus:border-indigo-400 transition-all text-center"
                                    />
                                </div>
                                <div className="flex-1">
                                    <select 
                                        value={formData.user_id}
                                        onChange={e => setFormData({...formData, user_id: e.target.value})}
                                        className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 transition-all appearance-none"
                                    >
                                        <option value="">Destinatário...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name?.split(' ')[0] || u.email}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={formData.texto}
                                    onChange={e => setFormData({...formData, texto: e.target.value})}
                                    placeholder="Nome do evento..."
                                    className="flex-1 min-w-0 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 transition-all"
                                    onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                                />
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-10 h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-all shrink-0 shadow-md shadow-indigo-600/30"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
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
