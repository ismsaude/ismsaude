import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Activity, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import bgImage from '../assets/capa-login.jpg';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { usePerformance } from '../hooks/usePerformance';

const PEPHub = () => {
    const navigate = useNavigate();
    const { theme } = useWhiteLabel();
    const { isLowEndDevice } = usePerformance();

    // Definição dos Módulos do Hub PEP
    const modules = [
        {
            id: 'pep',
            title: 'PEP',
            desc: 'Prontuário Eletrônico',
            icon: Activity,
            path: '/pep',
            iconColor: 'text-indigo-600',
            iconBg: 'bg-indigo-500/20'
        },
        {
            id: 'apa',
            title: 'APA',
            desc: 'Avaliação Pré-Anestésica',
            icon: FileText,
            path: '/apa',
            iconColor: 'text-blue-600',
            iconBg: 'bg-blue-500/20'
        }
    ];

    return (
        <div 
            className="h-full w-full flex flex-col font-sans p-4 md:p-8 relative overflow-hidden"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }}
        >
            {/* Overlay transparente sobre a imagem */}
            <div className={`absolute inset-0 pointer-events-none ${isLowEndDevice ? 'bg-white/85' : 'bg-white/60 backdrop-blur-sm'}`}></div>

            {/* Top Bar Area */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-10 px-2 lg:px-4">
                <div className="flex flex-col text-slate-900 drop-shadow-none">
                    <button 
                        onClick={() => navigate('/home')}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-4 uppercase tracking-widest w-fit"
                    >
                        <ArrowLeft size={16} /> Voltar para o Início
                    </button>
                    <h1 className="text-3xl font-bold tracking-normal mb-1">Central de Prontuários</h1>
                    <p className="text-lg font-medium text-slate-700">Selecione a área do prontuário que deseja acessar.</p>
                </div>
            </div>

            {/* Main Content Area - Centralized Grid */}
            <div className="relative z-10 flex-1 flex items-center justify-center mb-4 px-2 w-full pb-8">

                <div className="w-full max-w-[600px] grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    {modules.map((mod, idx) => (
                        <div
                            key={idx}
                            onClick={() => mod.path && navigate(mod.path)}
                            className={`group relative overflow-hidden rounded-[1.75rem] flex flex-col items-center justify-center text-center transition-all duration-500 cursor-pointer p-8 min-h-[210px]
                                ${isLowEndDevice
                                    ? 'bg-white/95 border border-white/60 shadow-sm hover:shadow-md hover:-translate-y-1'
                                    : 'bg-white/60 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 hover:bg-white/80'
                                }`}
                        >
                            {/* Brilho de Hover */}
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                            <div className={`w-16 h-16 mb-4 rounded-[1.4rem] flex items-center justify-center ${mod.iconBg} shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                                <mod.icon size={30} className={mod.iconColor} strokeWidth={2.5} />
                            </div>

                            <h3 className="text-xl xl:text-2xl font-black text-slate-900 drop-shadow-none mb-1.5 leading-tight tracking-normal z-10">{mod.title}</h3>
                            <p className="text-[10px] xl:text-xs font-bold text-slate-500 leading-snug z-10 uppercase tracking-widest">{mod.desc}</p>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default PEPHub;
