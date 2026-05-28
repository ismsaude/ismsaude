import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { UnitProvider } from './contexts/UnitContext';
import { WhiteLabelProvider, useWhiteLabel } from './contexts/WhiteLabelContext';
import { UnitGatekeeper } from './components/UnitGatekeeper';
import PermissionRoute from './components/PermissionRoute';
import { Topbar } from './components/Topbar';
import { Loader2 } from 'lucide-react';
import defaultBgImage from './assets/capa-login.jpg';

// Páginas
import HomeHub from './pages/HomeHub';
import Dashboard from './pages/Dashboard';
import SurgeryQueue from './pages/SurgeryQueue';
import Settings from './pages/Settings';
import ConfiguracoesHub from './pages/ConfiguracoesHub';
import AtendimentoHub from './pages/AtendimentoHub';
import ImportData from './pages/ImportData';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import WeeklyView from './pages/WeeklyView';
import Aih from './pages/Aih';
import Apa from './pages/Apa';
import Pacientes from './pages/Pacientes';
import Autorizacoes from './pages/Autorizacoes';
import Recepcao from './pages/Recepcao';
import Agenda from './pages/Agenda';
import Internacao from './pages/Internacao';
import PEP from './pages/PEP';
import PEPHub from './pages/PEPHub';
import Escala from './pages/Escala';

// Páginas Financeiras
import FinanceDashboard from './pages/finance/FinanceDashboard';
import FinanceTransactions from './pages/finance/FinanceTransactions';
import FinanceConciliation from './pages/finance/FinanceConciliation';
import FinanceRepasse from './pages/finance/FinanceRepasse';
import FinanceGlosas from './pages/finance/FinanceGlosas';
import FinanceSettings from './pages/finance/FinanceSettings';

const AppLayout = ({ children }) => {
  const { currentUser } = useAuth();
  const { isThemeLoading, theme } = useWhiteLabel();
  const location = useLocation();
  const isHome = location.pathname === '/home';

  if (isThemeLoading) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Preparando Ambiente...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-screen relative overflow-hidden text-slate-800"
      style={{
          backgroundImage: `url(${theme.bgImage || defaultBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 pointer-events-none bg-white/50 backdrop-blur-[3px]"></div>
      
      {currentUser && (
        <div className="fixed top-0 left-0 w-full z-[999]">
          <Topbar />
        </div>
      )}
      <main className={`flex-1 overflow-y-auto z-10 ${currentUser && !isHome ? 'pt-[64px]' : ''}`}>
        {children}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <PermissionProvider>
        <UnitProvider>
          <WhiteLabelProvider>
            <BrowserRouter>
              <UnitGatekeeper>
                <AppLayout>
                  <Routes>
                    {/* --- ROTAS PÚBLICAS (Qualquer um acessa) --- */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />

                    {/* Redirecionamento da Raiz */}
                    <Route path="/" element={<Navigate to="/home" />} />

                    {/* --- ROTAS PROTEGIDAS (Só logado acessa) --- */}
                    {/* Agora envolvemos cada página sensível com <PrivateRoute> */}

                    <Route path="/home" element={
                      <PermissionRoute>
                        <HomeHub />
                      </PermissionRoute>
                    } />

                    <Route path="/dashboard" element={
                      <PermissionRoute requiredModule="dashboard">
                        <Dashboard />
                      </PermissionRoute>
                    } />

                    <Route path="/fila" element={
                      <PermissionRoute requiredModule="agendamento" requiredPermission="Visualizar Fila">
                        <SurgeryQueue />
                      </PermissionRoute>
                    } />

                    <Route path="/pacientes" element={
                      <PermissionRoute requiredModule="atendimento" requiredPermission="Visualizar Pacientes">
                        <Pacientes />
                      </PermissionRoute>
                    } />

                    <Route path="/semana" element={
                      <PermissionRoute requiredModule="agendamento" requiredPermission="Visualizar Mapa/Agenda">
                        <WeeklyView />
                      </PermissionRoute>
                    } />

                    <Route path="/aih" element={
                      <PermissionRoute requiredModule="atendimento" requiredPermission="Visualizar Atendimentos">
                        <Aih />
                      </PermissionRoute>
                    } />

                    <Route path="/apa" element={
                      <PermissionRoute requiredModule="atendimento" requiredPermission="Visualizar Atendimentos">
                        <Apa />
                      </PermissionRoute>
                    } />

                    <Route path="/configuracoes" element={
                      <PermissionRoute requiredModule="configuracoes" requiredPermission="Acessar Configurações">
                        <ConfiguracoesHub />
                      </PermissionRoute>
                    } />

                    <Route path="/configuracoes-painel" element={
                      <PermissionRoute requiredModule="configuracoes" requiredPermission="Acessar Configurações">
                        <Settings />
                      </PermissionRoute>
                    } />

                    <Route path="/importar-dados" element={
                      <PermissionRoute requiredModule="configuracoes" requiredPermission="Acesso Total (Admin)">
                        <ImportData />
                      </PermissionRoute>
                    } />

                    <Route path="/atendimento" element={
                      <PermissionRoute requiredModule="atendimento">
                        <AtendimentoHub />
                      </PermissionRoute>
                    } />

                    <Route path="/autorizacoes" element={
                      <PermissionRoute requiredModule="autorizacao" requiredPermission="Acessar Autorizações">
                        <Autorizacoes />
                      </PermissionRoute>
                    } />

                    <Route path="/recepcao" element={
                      <PermissionRoute requiredModule="atendimento" requiredPermission="Visualizar Atendimentos">
                        <Recepcao />
                      </PermissionRoute>
                    } />

                    <Route path="/agenda" element={
                      <PermissionRoute requiredModule="agendamento">
                        <Agenda />
                      </PermissionRoute>
                    } />

                    <Route path="/internacao" element={
                      <PermissionRoute requiredModule="atendimento">
                        <Internacao />
                      </PermissionRoute>
                    } />

                    <Route path="/escala" element={
                      <PermissionRoute requiredModule="escala">
                        <Escala />
                      </PermissionRoute>
                    } />

                    <Route path="/pep" element={
                      <PermissionRoute requiredModule="atendimento">
                        <PEP />
                      </PermissionRoute>
                    } />

                    <Route path="/pep-hub" element={
                      <PermissionRoute requiredModule="atendimento">
                        <PEPHub />
                      </PermissionRoute>
                    } />

                    {/* --- ROTAS FINANCEIRAS --- */}
                    <Route path="/finance/dashboard" element={
                      <PermissionRoute requiredModule="financeiro" requiredPermission="Acessar Relatórios">
                        <FinanceDashboard />
                      </PermissionRoute>
                    } />

                    <Route path="/finance/transacoes" element={
                      <PermissionRoute requiredModule="financeiro" requiredPermission="Acessar Relatórios">
                        <FinanceTransactions />
                      </PermissionRoute>
                    } />

                    <Route path="/finance/conciliacao" element={
                      <PermissionRoute requiredModule="financeiro" requiredPermission="Acessar Relatórios">
                        <FinanceConciliation />
                      </PermissionRoute>
                    } />

                    <Route path="/finance/repasse" element={
                      <PermissionRoute requiredModule="financeiro" requiredPermission="Acessar Relatórios">
                        <FinanceRepasse />
                      </PermissionRoute>
                    } />

                    <Route path="/finance/glosas" element={
                      <PermissionRoute requiredModule="financeiro" requiredPermission="Acessar Relatórios">
                        <FinanceGlosas />
                      </PermissionRoute>
                    } />

                    <Route path="/finance/configuracoes" element={
                      <PermissionRoute requiredModule="financeiro" requiredPermission="Acessar Configurações">
                        <FinanceSettings />
                      </PermissionRoute>
                    } />

                    {/* Proteção contra rota inexistente (404 vira Login) */}
                    <Route path="*" element={<Navigate to="/login" />} />

                  </Routes>
                </AppLayout>
                <Toaster position="top-right" containerStyle={{ zIndex: 999999 }} />
              </UnitGatekeeper>
            </BrowserRouter>
          </WhiteLabelProvider>
        </UnitProvider>
      </PermissionProvider>
    </AuthProvider>
  );
};

export default App;