import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Key, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import bgImage from '../assets/capa-login.jpg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, resetPassword, currentUser } = useAuth();
    const { theme } = useWhiteLabel();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (currentUser) {
            navigate('/dashboard');
        }
    }, [currentUser, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            toast.success("Bem-vindo ao SISGESP!");
            navigate('/dashboard');
        } catch (error) {
            console.error("Erro de Login:", error);
            if (error.message?.includes('Invalid login credentials')) {
                toast.error("E-mail ou senha incorretos!");
            } else if (error.message?.includes('Email not confirmed')) {
                toast.error("Este e-mail ainda não foi confirmado no sistema.");
            } else {
                toast.error("Acesso negado. Ocorreu um erro ao conectar.");
            }
        }
    };

    const handleForgotPassword = async () => {
        if (!email) return toast.error("Digite seu e-mail primeiro!");
        try {
            await resetPassword(email);
            toast.success("Link de recuperação enviado para seu e-mail!");
        } catch (error) {
            toast.error("Erro ao processar solicitação.");
        }
    };

    return (
        <div
            className="min-h-full w-full flex justify-end font-sans"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            <div className="w-full md:w-1/2 lg:w-1/3 min-h-full bg-white/10 backdrop-blur-md border-l border-white/20 shadow-2xl p-10 flex flex-col justify-center animate-in fade-in slide-in-from-right duration-700 relative z-10">
                <div className="text-center mb-10">
                    {theme.logoUrl && (
                        <div className="flex justify-center mb-4">
                            <img src={theme.logoUrl} alt="Logo" className="h-16 w-auto object-contain drop-shadow-sm" />
                        </div>
                    )}
                    <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tighter leading-tight drop-shadow-sm mt-2">
                        Bem vindo
                    </h1>
                    <p className="text-[10px] font-semibold text-slate-800 uppercase tracking-widest mt-2 leading-relaxed px-4">
                        Sistema de Gestão de Agendamento da <br /> {theme.nomeInstituicao}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-800 uppercase ml-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email" required
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200 text-slate-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 font-bold placeholder:text-slate-500 transition-all shadow-sm"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-800 uppercase ml-1">Senha de Acesso</label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password" required
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200 text-slate-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 font-bold placeholder:text-slate-500 transition-all shadow-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-[10px] font-bold text-blue-700 uppercase hover:text-blue-800 transition-colors"
                        >
                            Esqueci minha senha
                        </button>
                    </div>

                    <button className="w-full py-4 bg-blue-600/95 hover:bg-blue-600 backdrop-blur-md text-white border border-blue-500/20 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all active:scale-95">
                        Entrar no Sistema
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-300/40 text-center">
                    <p className="text-[10px] font-bold text-slate-800">
                        Não tem acesso? <span className="text-blue-700 font-bold cursor-pointer hover:text-blue-800 transition-colors" onClick={() => navigate('/signup')}>Solicite seu cadastro</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;