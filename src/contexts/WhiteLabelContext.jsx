import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const WhiteLabelContext = createContext();

export const WhiteLabelProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [theme, setTheme] = useState({
        nomeInstituicao: 'Sistema de Gestão', // Fallback genérico em vez de Porto Feliz
        corPrincipal: '#2563eb', 
        logoUrl: null, // Sem logo por padrão até carregar
        faviconUrl: ''
    });
    const [isThemeLoading, setIsThemeLoading] = useState(true);

    const fetchTheme = async () => {
        try {
            setIsThemeLoading(true);
            const { data, error } = await supabase.from('settings').select('data').eq('id', 'general').maybeSingle();
            if (data && data.data) {
                const fetchedTheme = {
                    nomeInstituicao: data.data.nomeInstituicao || 'Sistema de Gestão',
                    corPrincipal: data.data.corPrincipal || '#2563eb',
                    logoUrl: data.data.logoUrl || null,
                    faviconUrl: data.data.faviconUrl || '',
                    executanteNome: data.data.executanteNome || '',
                    executanteCnes: data.data.executanteCnes || ''
                };
                setTheme(fetchedTheme);
                document.title = fetchedTheme.nomeInstituicao;
                document.documentElement.style.setProperty('--primary-color', fetchedTheme.corPrincipal);
                const favicon = document.querySelector("link[rel*='icon']");
                if (favicon && fetchedTheme.faviconUrl) {
                    favicon.href = fetchedTheme.faviconUrl;
                }
            }
        } catch (error) {
            console.error("Erro ao carregar tema:", error);
        } finally {
            setIsThemeLoading(false);
        }
    };

    useEffect(() => {
        fetchTheme();
    }, [currentUser]);

    return (
        <WhiteLabelContext.Provider value={{ theme, reloadTheme: fetchTheme, isThemeLoading }}>
            {children}
        </WhiteLabelContext.Provider>
    );
};

export const useWhiteLabel = () => useContext(WhiteLabelContext);
