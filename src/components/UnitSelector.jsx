import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Building2 } from 'lucide-react';
import { useUnit } from '../contexts/UnitContext';

export const UnitSelector = () => {
    const { unidadeAtual, unidades, changeUnidade } = useUnit();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative z-[999]" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white/60 hover:bg-white/80 border border-white/50 px-3 py-1.5 rounded-xl transition-all duration-300 shadow-sm"
                title="Alterar Local de Atendimento"
            >
                <MapPin size={16} className={unidadeAtual ? "text-blue-600" : "text-rose-500"} />
                <div className="flex flex-col items-start">
                    <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${unidadeAtual ? 'text-slate-400' : 'text-rose-400'}`}>Local Atual</span>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter leading-tight truncate max-w-[150px] ${unidadeAtual ? 'text-slate-700' : 'text-rose-600'}`}>
                        {unidadeAtual || 'SELECIONE O LOCAL'}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 sm:left-0 mt-2 w-56 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1.5 z-[999]">
                    <div className="p-2 border-b border-slate-100/50 mb-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Selecione a Unidade</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {unidades.map(u => (
                            <button
                                key={u}
                                onClick={() => { changeUnidade(u); setIsOpen(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all duration-300 ${unidadeAtual === u ? 'bg-white/80 text-blue-600 font-bold shadow-sm border border-white/50' : 'text-slate-500 hover:bg-white/60 hover:text-blue-600'}`}
                            >
                                <Building2 size={14} className={unidadeAtual === u ? 'text-blue-600' : 'text-slate-400'} />
                                <span className="text-[9px] font-bold uppercase tracking-tighter truncate">{u}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
