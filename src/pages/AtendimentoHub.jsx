import React from 'react';
import { Link } from 'react-router-dom';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { usePermission } from '../contexts/PermissionContext';
import { Activity, Users, CalendarDays, Bed, ChevronRight, ArrowLeft } from 'lucide-react';

const AtendimentoHub = () => {
    const { theme } = useWhiteLabel();
    const { hasPermission } = usePermission();

    const modules = [
        {
            path: '/recepcao',
            icon: Activity,
            title: 'Recepção',
            description: 'Painel de atendimentos e triagem de pacientes',
            show: hasPermission('Acessar Recepção')
        },
        {
            path: '/pacientes',
            icon: Users,
            title: 'Gestão de Pacientes',
            description: 'Cadastro geral, prontuários e histórico',
            show: hasPermission('Visualizar Pacientes')
        },
        {
            path: '/agenda',
            icon: CalendarDays,
            title: 'Agenda de Consultas',
            description: 'Consultas e agendamentos cirúrgicos',
            show: true
        },
        {
            path: '/internacao',
            icon: Bed,
            title: 'Mapa de Internação',
            description: 'Gestão de leitos, admissões e altas',
            show: true
        }
    ].filter(m => m.show);

    return (
        <div className="flex-1 bg-white/60 min-h-screen">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link to="/home" className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-white/60 hover:text-blue-600 transition-colors shadow-sm border border-transparent hover:border-white/60">
                                <ArrowLeft size={18} />
                            </Link>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 drop-shadow-none tracking-normal flex items-center gap-3">
                                <span className={`p-2.5 rounded-2xl ${theme.bgLight} ${theme.iconText} shadow-sm border ${theme.borderLight}`}>
                                    <Activity size={24} strokeWidth={2.5} />
                                </span>
                                Módulo Atendimento
                            </h1>
                        </div>
                        <p className="text-sm font-medium text-slate-500 max-w-2xl ml-14">Selecione uma das áreas operacionais abaixo para iniciar ou gerenciar atendimentos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-6">
                    {modules.map((mod, idx) => (
                        <Link 
                            key={idx} 
                            to={mod.path}
                            className="group relative bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[140px] sm:min-h-[160px]"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-50 to-indigo-50/20 rounded-bl-[80px] sm:rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110"></div>
                            
                            <div className="relative z-10">
                                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/60 border border-white/40 flex items-center justify-center mb-3 sm:mb-5 group-hover:bg-blue-500/20 group-hover:border-blue-100 transition-colors shadow-sm`}>
                                    <mod.icon className="w-5 h-5 sm:w-7 sm:h-7 text-slate-500 group-hover:text-blue-600 transition-colors" strokeWidth={2} />
                                </div>
                                <h3 className="text-sm sm:text-lg font-black text-slate-900 drop-shadow-none tracking-normal group-hover:text-blue-700 transition-colors leading-tight">{mod.title}</h3>
                                <p className="text-[10px] sm:text-sm font-semibold text-slate-500 mt-1 leading-tight">{mod.description}</p>
                            </div>
                            
                            <div className="relative z-10 flex justify-end mt-3 sm:mt-4">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/60 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-slate-800 text-slate-600 transition-all shadow-sm">
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default AtendimentoHub;
