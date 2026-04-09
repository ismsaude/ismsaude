import React from 'react';
import { Building2, MapPin, Activity, ArrowRight } from 'lucide-react';
import { useUnit } from '../contexts/UnitContext';
import { useAuth } from '../contexts/AuthContext';

export const UnitGatekeeper = ({ children }) => {
    const { unidadeAtual, unidades, changeUnidade, isLoadingUnits } = useUnit();
    const { currentUser } = useAuth();

    // 1. Se não estiver logado, não intercepta (deixa o router lidar com o login)
    if (!currentUser) return children;

    // 2. REGRA DE OURO: Se NÃO for o perfil "Médico" puro, pula a tela de seleção!
    // (Nota: Ajuste 'perfil' para a propriedade exata que define o cargo no objeto do usuário)
    const perfilUsuario = currentUser.perfil || currentUser.role || currentUser.tipo || '';
    if (perfilUsuario !== 'Médico') return children;

    // 3. Enquanto carrega as unidades do banco, mostra loading
    if (isLoadingUnits) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Activity className="animate-spin text-blue-600" size={32} /></div>;

    // 4. Se já escolheu a unidade, libera o sistema
    if (unidadeAtual) return children;

    // TELA DE BLOQUEIO MESTRA
    return (
        <div className="fixed top-16 inset-x-0 bottom-0 z-[100] bg-slate-900 flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 animate-in slide-in-from-bottom-8 duration-700 delay-150">
                <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <MapPin size={48} className="text-white/90 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2">Bem-vindo(a), {currentUser?.name || currentUser?.displayName || 'Doutor(a)'}</h2>
                    <p className="text-blue-100 font-medium">Por favor, selecione seu local de atendimento para iniciar o plantão.</p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {unidades.map(u => (
                            <button
                                key={u}
                                onClick={() => changeUnidade(u)}
                                className="group flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md transition-all text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:text-blue-600 text-slate-400 transition-colors">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Unidade</div>
                                        <div className="text-sm font-bold text-slate-800 uppercase">{u}</div>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors transform group-hover:translate-x-1" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
