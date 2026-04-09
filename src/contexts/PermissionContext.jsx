import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [permissionsMatrix, setPermissionsMatrix] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const { data, error } = await supabase
                    .from('settings')
                    .select('data')
                    .eq('id', 'permissions')
                    .maybeSingle();

                if (data && data.data) {
                    setPermissionsMatrix(data.data);
                } else {
                    setPermissionsMatrix({});
                }
            } catch (error) {
                console.error("Erro ao carregar permissões:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, []);

    const hasPermission = (requiredPermission) => {
        if (!currentUser) return false;

        const role = String(currentUser.role || 'Visualizador').toLowerCase();

        // O Desenvolvedor SEMPRE tem acesso a tudo (Bypass/Root)
        if (role === 'desenvolvedor' || role === 'developer') return true;

        // Para os demais, verifica se a permissão está na matriz de permissões do perfil do usuário
        const rolePermissions = permissionsMatrix[currentUser.role || 'Visualizador'] || {};

        // Se o perfil tiver check em 'Acesso Total (Admin)', libera tudo
        if (rolePermissions['Acesso Total (Admin)']) return true;

        // Caso contrário, valida a permissão estrita
        return !!rolePermissions[requiredPermission];
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <PermissionContext.Provider value={{ hasPermission, permissionsMatrix, loading }}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermission = () => useContext(PermissionContext);
