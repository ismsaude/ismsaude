import React from 'react';
import { Link } from 'react-router-dom';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { usePermission } from '../contexts/PermissionContext';
import { Settings, User, Users, FileText, Palette, LayoutDashboard, UploadCloud, FileSpreadsheet, Activity, ChevronRight, ArrowLeft } from 'lucide-react';

const ConfiguracoesHub = () => {
    const { theme } = useWhiteLabel();
    const { hasPermission } = usePermission();

    const modules = [
        {
            path: '/configuracoes-painel?tab=especialidades',
            icon: User,
            title: 'Cadastros Gerais',
            description: 'Especialidades, convênios, cidades, etc.',
            show: hasPermission('Acessar Configurações')
        },
        {
            path: '/configuracoes-painel?tab=usuarios',
            icon: Users,
            title: 'Gestão de Acessos',
            description: 'Gerenciar usuários e permissões do sistema',
            show: hasPermission('Acesso Total (Admin)') || hasPermission('Acessar Usuarios')
        },
        {
            path: '/configuracoes-painel?tab=orientacoes',
            icon: FileText,
            title: 'Textos de Orientação',
            description: 'Documentos e textos de ajuda',
            show: hasPermission('Acessar Configurações')
        },
        {
            path: '/configuracoes-painel?tab=identidade',
            icon: Palette,
            title: 'Identidade Visual',
            description: 'Logotipos, cores e temas (White Label)',
            show: hasPermission('Acesso Total (Admin)')
        },
        {
            path: '/configuracoes-painel?tab=hub',
            icon: LayoutDashboard,
            title: 'Hub Inicial',
            description: 'Configurar a tela inicial (cards macro)',
            show: hasPermission('Acesso Total (Admin)')
        },
        {
            path: '/configuracoes-painel?tab=importacao',
            icon: UploadCloud,
            title: 'Importação CSV',
            description: 'Importar dados em massa para o sistema',
            show: hasPermission('Acessar Configurações')
        },
        {
            path: '/configuracoes-painel?tab=basesus',
            icon: FileSpreadsheet,
            title: 'Tabela SIGTAP',
            description: 'Atualizar base SUS',
            show: hasPermission('Acessar Configurações')
        },
        {
            path: '/configuracoes-painel?tab=logs',
            icon: Activity,
            title: 'Logs do Sistema',
            description: 'Auditoria de ações realizadas',
            show: hasPermission('Acesso Total (Admin)')
        }
    ].filter(m => m.show);

    return (
        <div className="flex-1 min-h-screen">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link to="/home" className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-white/70 hover:text-slate-800 transition-colors border border-transparent hover:border-white hover:bg-white/90">
                                <ArrowLeft size={18} />
                            </Link>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-normal flex items-center gap-3 drop-shadow-sm">
                                <span className="p-2.5 rounded-2xl bg-white/70 text-slate-800 shadow-sm border border-white/80 backdrop-blur-sm">
                                    <Settings size={24} strokeWidth={2.5} />
                                </span>
                                Hub de Configurações
                            </h1>
                        </div>
                        <p className="text-sm font-bold text-slate-600 max-w-2xl ml-14">Acesse as configurações do sistema, usuários e parametrizações.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {modules.map((mod, idx) => (
                        <Link 
                            key={idx} 
                            to={mod.path}
                            className="group relative bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl rounded-[2rem] p-6 hover:bg-white/70 hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-white hover:bg-white/90 transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[160px]"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110"></div>
                            
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-white/80 border border-white/80 flex items-center justify-center mb-4 group-hover:bg-white/80 group-hover:border-white/30 transition-colors shadow-sm">
                                    <mod.icon size={24} className="text-slate-600 group-hover:text-slate-800 transition-colors" strokeWidth={2} />
                                </div>
                                <h3 className="text-md font-black text-slate-800 tracking-normal drop-shadow-sm">{mod.title}</h3>
                                <p className="text-xs font-semibold text-slate-500 mt-1">{mod.description}</p>
                            </div>
                            
                            <div className="relative z-10 flex justify-end mt-4">
                                <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center group-hover:bg-white/80 group-hover:text-slate-800 text-slate-500 transition-all shadow-sm">
                                    <ChevronRight size={16} strokeWidth={2.5} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default ConfiguracoesHub;
