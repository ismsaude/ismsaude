import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../contexts/PermissionContext';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PermissionRoute = ({ children, requiredPermission }) => {
    const { currentUser, loading: authLoading } = useAuth();
    const { hasPermission, loading: permLoading } = usePermission();

    // 1. Mostrar Loading enquanto Auth ou Permissões carregam
    if (authLoading || permLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // 2. Se não estiver logado -> Login
    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    // 3. Verifica permissão (se exigida)
    if (requiredPermission && !hasPermission(requiredPermission)) {
        // Evita loop infinito se a rota proibida for dashboard
        // Mas como dashboard é público (autenticado), redireciona pra ele.
        // Se dashboard fosse protegido, teríamos que ter uma rota "Sem Acesso".

        // Só exibe o toast uma vez (pode ser melhorado com useEffect, mas renderização aqui ok)
        // toast.error("Acesso Negado: Você não tem permissão para esta área."); 
        // Side-effect no render é ruim, mas funcional para redirecionamento rápido.
        // Melhor abordagem: useEffect para toast.

        return <PermissionDeniedRedirect />;
    }

    // 4. Se passou, renderiza
    return children;
};

// Componente auxiliar para disparar o toast apenas uma vez e redirecionar
const PermissionDeniedRedirect = () => {
    React.useEffect(() => {
        toast.error("Acesso Negado: Área restrita.", { id: 'acesso-negado' }); // ID evita duplicidade
    }, []);
    return <Navigate to="/dashboard" />;
}

export default PermissionRoute;
