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
                <div className="bg-blue-600 p-5 sm:p-6 text-center relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <MapPin size={32} className="text-white/90 mx-auto mb-2" />
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">Bem-vindo(a), {currentUser?.name || currentUser?.displayName || 'Doutor(a)'}</h2>
                    <p className="text-blue-100 text-sm font-medium">Por favor, selecione seu local de atendimento para iniciar o plantão.</p>
                </div>

                <div className="p-4 sm:p-6 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {unidades.map(u => (
                            <button
                                key={u}
                                onClick={() => changeUnidade(u)}
                                className="group flex items-center justify-between p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-500 hover:shadow-sm transition-all text-left"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:text-blue-600 text-slate-400 transition-colors shrink-0">
                                        <Building2 size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Unidade</div>
                                        <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase leading-tight truncate">{u}</div>
                                    </div>
                                </div>
                                <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors transform group-hover:translate-x-1 shrink-0 ml-2" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
