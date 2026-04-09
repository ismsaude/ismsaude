import React from 'react';
import { Activity } from 'lucide-react';

export default function UnitPrompt() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center w-full shadow-inner bg-slate-50/50">
            <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm max-w-md w-full flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500 hover:shadow-md transition-shadow">
                <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shadow-inner">
                    <Activity size={40} strokeWidth={2} className="animate-pulse" />
                </div>
                <div className="space-y-4">
                    <h2 className="text-2xl font-black text-slate-700 tracking-tight">Qual sua Unidade?</h2>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
                        Para acessar este módulo, por favor selecione em qual <strong>Posto ou Unidade de Atendimento</strong> você está operando agora no menu superior.
                    </p>
                </div>
            </div>
        </div>
    );
}
