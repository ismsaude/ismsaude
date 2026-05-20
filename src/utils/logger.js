import { supabase } from '../services/supabase';

export const logAction = async (action, details) => {
    try {
        let ipAddress = 'Desconhecido';
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            ipAddress = ipData.ip;
        } catch (e) {
            console.warn("Falha ao obter IP", e);
        }

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        const metadata = user?.user_metadata || {};
        await supabase.from('logs').insert([{
            action,
            details,
            userName: metadata.name || user?.email || 'Sistema',
            userEmail: user ? user.email : 'Sistema',
            ip_address: ipAddress,
            timestamp: new Date().toISOString()
        }]);

        // Apagar logs mais antigos que 6 meses
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        await supabase.from('logs').delete().lt('timestamp', sixMonthsAgo.toISOString());
    } catch (error) {
        console.error('Erro ao gravar log:', error);
    }
};
