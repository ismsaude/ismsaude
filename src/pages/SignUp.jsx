import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const SignUp = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Cria usuário na Auth
            const data = await signup(formData.email, formData.password, formData.name);
            const user = data.user;

            if (user) {
                // 2. Salva dados na tabela de Usuários
                await supabase.from('users').insert([{
                    id: user.id,
                    name: formData.name,
                    email: formData.email,
                    role: 'Visualizador',
                    status: 'Inativo',
                    createdAt: new Date().toISOString()
                }]);
            }

            toast.success("Solicitação enviada! Aguarde liberação.", {
                duration: 4000,
                style: { background: '#1e293b', color: '#fff', fontWeight: 'bold' }
            });

            navigate('/login');
        } catch (error) {
            console.error(error);
            toast.error("Erro ao solicitar acesso. Verifique se o e-mail já está em uso.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-full bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
                <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-slate-400 mb-6 font-black text-[10px] uppercase">
                    <ArrowLeft size={16} /> Voltar
                </button>
                <h2 className="text-2xl font-black text-slate-900 uppercase text-center mb-8">Solicitar Acesso</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input required placeholder="Nome Completo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none" />
                    <input type="email" required placeholder="E-mail" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none" />
                    <input type="password" required placeholder="Sua Senha" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none" />
                    <button disabled={loading} className={`w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                        {loading ? 'Enviando...' : 'Enviar Solicitação'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SignUp;