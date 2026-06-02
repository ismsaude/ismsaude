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
            <div className="relative z-10 flex-1 flex items-center justify-center mb-4 px-2 lg:px-8 w-full max-w-[1200px] mx-auto pb-20">
                
                <div className="w-full max-w-[800px] mx-auto grid grid-cols-2 sm:grid-cols-2 gap-4 xl:gap-12">
                    {modules.map((mod, idx) => (
                        <div 
                            key={idx}
                            onClick={() => mod.path && navigate(mod.path)}
                            className={`group relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all duration-500 cursor-pointer aspect-square lg:aspect-auto lg:h-72 xl:h-80 max-w-[340px] mx-auto w-full
                                ${!mod.path 
                                    ? 'bg-transparent border-2 border-dashed border-white/80 opacity-50 cursor-default hover:opacity-70 hover:border-slate-400' 
                                    : (isLowEndDevice ? 'bg-white/95 border border-white/60 shadow-sm hover:shadow-md hover:-translate-y-1' : 'bg-white/60 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl hover:-translate-y-2 hover:bg-white/80')
                                }`}
                        >
                            {/* Brilho de Hover */}
                            {mod.path && <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>}

                            <div className={`w-14 h-14 sm:w-20 sm:h-20 mb-3 sm:mb-6 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center ${mod.iconBg} shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                                <mod.icon size={36} className={`${mod.iconColor} w-8 h-8 sm:w-10 sm:h-10`} strokeWidth={2.5} />
                            </div>

                            <h3 className="text-sm sm:text-xl xl:text-2xl font-black text-slate-900 drop-shadow-none mb-1 sm:mb-2 leading-tight tracking-normal z-10">{mod.title}</h3>
                            <p className="text-[9px] sm:text-xs xl:text-sm font-bold text-slate-500 px-2 sm:px-8 leading-snug z-10 uppercase tracking-widest flex items-start justify-center h-10">{mod.desc}</p>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default PEPHub;
