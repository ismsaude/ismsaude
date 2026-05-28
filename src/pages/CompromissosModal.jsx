import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X, CalendarDays, User, Plus, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';

export const CompromissosModal = ({ onClose }) => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        user_id: '',
        texto: '',
        data_agendada: new Date().toISOString().split('T')[0]
    });

    const [recentTasks, setRecentTasks] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Users
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('id, name, email, role')
                    .order('name');
                if (usersError) throw usersError;
                setUsers(usersData || []);

                // Fetch Recent Tasks
                loadRecentTasks();
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const loadRecentTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('agenda_pessoal')
                .select('*, users!agenda_pessoal_user_id_fkey(name)')
                .order('created_at', { ascending: false })
                .limit(20);
            if (!error && data) {
                setRecentTasks(data);
            }
        } catch (e) {
            console.error("Erro recents", e);
        }
    };

    const handleSave = async () => {
        if (!formData.user_id || !formData.texto || !formData.data_agendada) {
            return toast.error("Preencha todos os campos!");
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('agenda_pessoal')
                .insert([{
                    user_id: formData.user_id,
                    texto: formData.texto,
                    data_agendada: formData.data_agendada,
                    autor_id: currentUser?.id
                }]);

            if (error) throw error;
            
            toast.success("Compromisso agendado!");
            setFormData({ ...formData, texto: '' });
            loadRecentTasks();
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
            setRecentTasks(prev => prev.filter(t => t.id !== id));
            toast.success("Removido!");
        } catch (err) {
            toast.error("Erro ao remover.");
        }
    }

    return createPortal(
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm z-[10000] overflow-y-auto p-4 flex">
            <div className="m-auto bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-600 hover:bg-white/70 rounded-lg transition-all">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <CalendarDays size={20} className="text-indigo-600" /> Delegação de Compromissos
                </h2>
                <p className="text-xs text-slate-500 mb-6">Agende tarefas para que apareçam no quadro da tela inicial do usuário.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 shrink-0">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Destinatário</label>
                        <select 
                            value={formData.user_id}
                            onChange={e => setFormData({...formData, user_id: e.target.value})}
                            className="w-full px-3 py-2.5 bg-white/70 border border-white/60 shadow-sm rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
                        >
                            <option value="">Selecione um usuário...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Data Agendada</label>
                        <input 
                            type="date"
                            value={formData.data_agendada}
                            onChange={e => setFormData({...formData, data_agendada: e.target.value})}
                            className="w-full px-3 py-2.5 bg-white/70 border border-white/60 shadow-sm rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
                        />
                    </div>
                </div>

                <div className="mb-6 shrink-0 flex gap-2">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Descrição do Compromisso</label>
                        <input 
                            type="text"
                            value={formData.texto}
                            onChange={e => setFormData({...formData, texto: e.target.value})}
                            placeholder="Ex: Entregar relatório de cirurgias"
                            className="w-full px-3 py-2.5 bg-white/70 border border-white/60 shadow-sm rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
                            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="h-[42px] px-4 bg-indigo-600 text-white rounded-lg font-black text-sm uppercase hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Agendar</>}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50/50 rounded-xl p-4 border border-white/60">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Últimos Lembretes Agendados</h3>
                    {loading ? (
                        <div className="text-center py-4"><Loader2 size={24} className="animate-spin text-indigo-400 mx-auto" /></div>
                    ) : recentTasks.length === 0 ? (
                        <p className="text-xs text-center text-slate-400 font-semibold py-4">Nenhum compromisso recente.</p>
                    ) : (
                        <div className="space-y-2">
                            {recentTasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-white/80 border border-white rounded-lg shadow-sm group">
                                    <div>
                                        <p className={`text-sm font-bold ${task.concluido ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.texto}</p>
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                                            Para: <span className="text-indigo-600">{task.users?.name || 'Desconhecido'}</span> &bull; Data: {task.data_agendada ? task.data_agendada.split('-').reverse().join('/') : 'S/D'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {task.concluido && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">Concluído</span>}
                                        <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:bg-rose-50 rounded transition-all">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
