import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    };

    const signup = async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });
        if (error) throw error;
        return data;
    };

    useEffect(() => {
        const fetchProfile = async (sessionUser, retries = 2) => {
            if (sessionUser) {
                try {
                    let publicProfile = null;
                    let fetchError = null;

                    // Tenta buscar o perfil (pode falhar na primeira se o token PostgREST ainda não propagou no client auth)
                    for (let i = 0; i < retries; i++) {
                        const { data, error } = await supabase
                            .from('users')
                            .select('name, crm, rqe, cpf, role, status, unidades_permitidas')
                            .eq('email', sessionUser.email)
                            .maybeSingle(); // maybeSingle não joga erro se não achar, útil pra verificar dados nulos

                        if (data && !error) {
                            publicProfile = data;
                            fetchError = null;
                            break; // Sucesso, sai do loop
                        }
                        
                        fetchError = error || new Error("Perfil não encontrado");
                        // Espera meio segundo antes de tentar de novo
                        await new Promise(res => setTimeout(res, 500));
                    }

                    if (publicProfile) {
                        if (publicProfile.status === 'Inativo') {
                            await supabase.auth.signOut();
                            setCurrentUser(null);
                        } else {
                            setCurrentUser({ ...sessionUser, ...publicProfile });
                        }
                    } else {
                        throw fetchError || new Error("Perfil não encontrado após tentativas");
                    }
                } catch (error) {
                    console.warn('Erro ao buscar perfil do usuário:', error);
                    setCurrentUser(sessionUser);
                } finally {
                    setLoading(false);
                }
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchProfile(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                sessionStorage.setItem('login_timestamp', Date.now().toString());
            } else if (event === 'SIGNED_OUT') {
                sessionStorage.removeItem('login_timestamp');
            }
            fetchProfile(session?.user ?? null);
        });

        // Hard Timeout Check: a cada 5 minutos
        const intervalId = setInterval(() => {
            const loginTime = sessionStorage.getItem('login_timestamp');
            if (loginTime) {
                const elapsedHours = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
                if (elapsedHours >= 12) {
                    supabase.auth.signOut();
                    sessionStorage.removeItem('login_timestamp');
                }
            }
        }, 300000);

        return () => {
            subscription.unsubscribe();
            clearInterval(intervalId);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, resetPassword, signup }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);