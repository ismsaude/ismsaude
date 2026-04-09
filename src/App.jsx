import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { UnitProvider } from './contexts/UnitContext';
import { WhiteLabelProvider, useWhiteLabel } from './contexts/WhiteLabelContext';
import { UnitGatekeeper } from './components/UnitGatekeeper';
import PermissionRoute from './components/PermissionRoute';
import { Topbar } from './components/Topbar';
import { Loader2 } from 'lucide-react';

// Páginas
import Dashboard from './pages/Dashboard';
import SurgeryQueue from './pages/SurgeryQueue';
import Settings from './pages/Settings';
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

const AppLayout = ({ children }) => {
  const { currentUser } = useAuth();
  const { isThemeLoading, theme } = useWhiteLabel();

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
    <div className="flex flex-col h-screen bg-slate-50">
      {currentUser && <Topbar />}
      <main className="flex-1 overflow-y-auto">
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
                    <Route path="/" element={<Navigate to="/dashboard" />} />

                    {/* --- ROTAS PROTEGIDAS (Só logado acessa) --- */}
                    {/* Agora envolvemos cada página sensível com <PrivateRoute> */}

                    <Route path="/dashboard" element={
                      <PermissionRoute>
                        <Dashboard />
                      </PermissionRoute>
                    } />

                    <Route path="/fila" element={
                      <PermissionRoute requiredPermission="Visualizar Fila">
                        <SurgeryQueue />
                      </PermissionRoute>
                    } />

                    <Route path="/pacientes" element={
                      <PermissionRoute requiredPermission="Visualizar Pacientes">
                        <Pacientes />
                      </PermissionRoute>
                    } />

                    <Route path="/semana" element={
                      <PermissionRoute requiredPermission="Visualizar Mapa/Agenda">
                        <WeeklyView />
                      </PermissionRoute>
                    } />

                    <Route path="/aih" element={
                      <PermissionRoute requiredPermission="Visualizar Atendimentos">
                        <Aih />
                      </PermissionRoute>
                    } />

                    <Route path="/apa" element={
                      <PermissionRoute requiredPermission="Visualizar Atendimentos">
                        <Apa />
                      </PermissionRoute>
                    } />

                    <Route path="/configuracoes" element={
                      <PermissionRoute requiredPermission="Acessar Configurações">
                        <Settings />
                      </PermissionRoute>
                    } />

                    <Route path="/importar-dados" element={
                      <PermissionRoute requiredPermission="Acesso Total (Admin)">
                        <ImportData />
                      </PermissionRoute>
                    } />

                    <Route path="/autorizacoes" element={
                      <PermissionRoute requiredPermission="Acessar Autorizações">
                        <Autorizacoes />
                      </PermissionRoute>
                    } />

                    <Route path="/recepcao" element={
                      <PermissionRoute requiredPermission="Visualizar Atendimentos">
                        <Recepcao />
                      </PermissionRoute>
                    } />

                    <Route path="/agenda" element={
                      <PermissionRoute>
                        <Agenda />
                      </PermissionRoute>
                    } />

                    <Route path="/internacao" element={
                      <PermissionRoute>
                        <Internacao />
                      </PermissionRoute>
                    } />

                    <Route path="/pep" element={
                      <PermissionRoute>
                        <PEP />
                      </PermissionRoute>
                    } />

                    {/* Proteção contra rota inexistente (404 vira Login) */}
                    <Route path="*" element={<Navigate to="/login" />} />

                  </Routes>
                </AppLayout>
                <Toaster position="top-right" />
              </UnitGatekeeper>
            </BrowserRouter>
          </WhiteLabelProvider>
        </UnitProvider>
      </PermissionProvider>
    </AuthProvider>
  );
};

export default App;