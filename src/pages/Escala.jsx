import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { logAction } from '../utils/logger';
import { 
    ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
    SlidersHorizontal, X, Grid, Building2, Settings, Copy, 
    DollarSign, Heart, ClipboardList, FileText, CalendarDays,
    Search, UserPlus, FileSpreadsheet, LayoutGrid, Users, 
    ShieldCheck, Bell, Clock, Moon, CircleDollarSign, Building,
    Check, Palette, User, Trash2, ChevronUp, ChevronDown, Edit2, Download, Eye, Activity
} from 'lucide-react';

// MOCK FALLBACK ONLY (Caso o DB esteja vazio)
const MOCK_HOSPITALS = [
    { id: 1, name: 'Porto Feliz', color: 'emerald', sectors: ['Diurno', 'Anestesista Extra 1', 'Anestesista Extra 2', 'Noturno'] },
    { id: 2, name: 'Boituva', color: 'indigo', sectors: ['Diurno', 'Extra', 'Noturno'] },
    { id: 3, name: 'Votorantim', color: 'rose', sectors: ['Diurno', '2 Anestesista', 'Noturno'] },
    { id: 4, name: 'Santa Lucinda', color: 'blue', sectors: ['Manhã', 'Tarde', 'Ambulatório'] },
    { id: 5, name: 'Salto', color: 'amber', sectors: ['Manhã', 'Tarde'] }
];



const MOCK_FIXED_WEEKS = Array.from({ length: 5 }).map((_, i) => ({
    id: `fw${i + 1}`,
    title: `Semana ${i + 1}`,
    badge: `Fixa S${i + 1}`,
    days: [
        { date: 'Padrão', dayName: 'Segunda', isWeekend: false }, 
        { date: 'Padrão', dayName: 'Terça', isWeekend: false }, 
        { date: 'Padrão', dayName: 'Quarta', isWeekend: false },
        { date: 'Padrão', dayName: 'Quinta', isWeekend: false }, 
        { date: 'Padrão', dayName: 'Sexta', isWeekend: false }, 
        { date: 'Padrão', dayName: 'Sábado', isWeekend: true }, 
        { date: 'Padrão', dayName: 'Domingo', isWeekend: true }
    ]
}));

// Helper para gerar iniciais do médico (ex: Marcos Andre = MA)
const getInitials = (name) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'M';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Formata o nome para ficar menor e legível
const formatDoctorName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().toLowerCase().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const firstName = parts[0];
    
    // Heurística básica para sexo feminino no Brasil (termina em 'a' ou nomes comuns sem 'a' no final)
    const femaleNames = new Set(['aline', 'gisele', 'simone', 'kelly', 'evelyn', 'carmen', 'iris', 'lais', 'ester', 'ruth', 'raquel', 'mirian', 'sueli', 'marli', 'roseli', 'cleide']);
    const isFemale = firstName.endsWith('a') || femaleNames.has(firstName);
    const title = isFemale ? 'Dra.' : 'Dr.';
    
    if (parts.length === 1) return `${title} ${capitalize(parts[0])}`;
    
    // Pega primeiro e último nome
    return `${title} ${capitalize(parts[0])} ${capitalize(parts[parts.length - 1])}`;
};

const Escala = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [hospitais, setHospitais] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [activeSlot, setActiveSlot] = useState(null);
    const [searchDoc, setSearchDoc] = useState('');
    
    const [viewMode, setViewMode] = useState('all'); // 'all' ou 'my_scale'
    const [visualizationMode, setVisualizationMode] = useState('mensal'); // 'mensal' ou 'fixa'
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isHospitalExpanded, setIsHospitalExpanded] = useState(false);

    // Estado para o rascunho do modal do plantão
    const [draftAssignment, setDraftAssignment] = useState({
        doctorName: '',
        subtitle: '',
        period: 'Diurno',
        time: '',
        appearance: { bold: false, color: 'default', flagged: false, verified: false },
        financial: { baseValue: '1900', extraValue: '0', observations: '' }
    });

    // Estados para o Modal de Gerenciamento de Meses
    const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
    const [newMonthVal, setNewMonthVal] = useState('');

    // Estados para o Modal de Hospitais
    const [isHospitalsModalOpen, setIsHospitalsModalOpen] = useState(false);
    const [editingHospitalId, setEditingHospitalId] = useState(null);
    const [tempHospital, setTempHospital] = useState(null);

    // Estado para o Modal de Histórico
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Estado para o Modal Financeiro
    const [isFinanceiroModalOpen, setIsFinanceiroModalOpen] = useState(false);
    const [isFolhaPontoModalOpen, setIsFolhaPontoModalOpen] = useState(false);
    const [folhaPontoFilter, setFolhaPontoFilter] = useState('all');
    

    useEffect(() => {
        if (isHistoryModalOpen) {
            fetchHistory();
        }
    }, [isHistoryModalOpen]);

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .ilike('action', 'escala_%')
            .order('timestamp', { ascending: false });
        if (!error && data) {
            setHistoryLogs(data);
        }
        setIsLoadingHistory(false);
    };

    // Estados para Regras Financeiras
    const [isFinancialRulesModalOpen, setIsFinancialRulesModalOpen] = useState(false);
    const [financialRules, setFinancialRules] = useState([]);
    const [financialRulesFilter, setFinancialRulesFilter] = useState('all');
    const [newRule, setNewRule] = useState({ name: '', hospital: '', value: '' });
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [tempRule, setTempRule] = useState(null);
    
    // Mock inicial de meses baseado no mês corrente
    const [existingMonths, setExistingMonths] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return [{ id: `${year}-${month}`, label: `${monthNames[d.getMonth()]} de ${year}` }];
    });
    const [activeMonth, setActiveMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Variáveis Computadas do Financeiro
    const currentMonthVerifiedAssignments = Object.entries(assignments)
        .filter(([slotId, data]) => slotId.startsWith(activeMonth + '-') && data.appearance?.verified)
        .map(([slotId, data]) => ({ slotId, ...data }));
        
    let totalMonthValue = 0;
    const hospitalTotals = {};
    const doctorTotals = {};

    currentMonthVerifiedAssignments.forEach(a => {
        let displayHospital = a.hospitalName;
        if (!displayHospital) {
            const parts = a.slotId.split('-');
            if (parts.length >= 6) {
                const h = MOCK_HOSPITALS.find(h => h.id.toString() === parts[3]);
                if (h) displayHospital = h.name;
            }
        }
        
        const val = parseFloat(a.financial?.baseValue || 0) + parseFloat(a.financial?.extraValue || 0);
        totalMonthValue += val;
        
        const hName = displayHospital || '-';
        hospitalTotals[hName] = (hospitalTotals[hName] || 0) + val;
        
        const dName = a.doctorName || '-';
        doctorTotals[dName] = (doctorTotals[dName] || 0) + val;
    });

    const hospitalTotalsArray = Object.entries(hospitalTotals).sort((a,b) => b[1] - a[1]);
    const doctorTotalsArray = Object.entries(doctorTotals).sort((a,b) => b[1] - a[1]);
    const maxHospitalTotal = hospitalTotalsArray.length > 0 ? hospitalTotalsArray[0][1] : 1;
    const maxDoctorTotal = doctorTotalsArray.length > 0 ? doctorTotalsArray[0][1] : 1;

    const exportToCSV = () => {
        if (currentMonthVerifiedAssignments.length === 0) return;
        const headers = ['Data', 'Hospital', 'Entrada', 'Saida', 'Plantao', 'Valor', 'Medico', 'OBS'];
        const rows = currentMonthVerifiedAssignments.map(a => {
            const timeParts = a.time ? a.time.split('-').map(t => t.trim()) : [];
            const entrada = timeParts[0] || '';
            const saida = timeParts[1] || '';
            const val = parseFloat(a.financial?.baseValue || 0) + parseFloat(a.financial?.extraValue || 0);
            
            let displayDate = a.date || '';
            let displayHospital = a.hospitalName || '';
            if (!displayDate || !displayHospital) {
                const parts = a.slotId.split('-');
                if (parts.length >= 6) {
                    if (!displayHospital) {
                        const h = MOCK_HOSPITALS.find(h => h.id.toString() === parts[3]);
                        if (h) displayHospital = h.name;
                    }
                    if (!displayDate) {
                        const w = activeWeeks.find(w => w.id === parts[2]);
                        if (w && w.days[parseInt(parts[5])]) {
                            displayDate = w.days[parseInt(parts[5])].date;
                        }
                    }
                }
            }

            return [
                displayDate,
                `"${displayHospital}"`,
                entrada,
                saida,
                `"${a.subtitle || 'Plantão'}"`,
                `"${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}"`,
                `"${a.doctorName || ''}"`,
                `"${a.financial?.observations || ''}"`
            ].join(',');
        });
        
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_financeiro_${activeMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (currentMonthVerifiedAssignments.length === 0) return;
        const monthLabel = existingMonths.find(m => m.id === activeMonth)?.label || activeMonth;
        
        let rowsHtml = '';
        currentMonthVerifiedAssignments.forEach(a => {
            const timeParts = a.time ? a.time.split('-').map(t => t.trim()) : [];
            const entrada = timeParts[0] || '-';
            const saida = timeParts[1] || '-';
            const val = parseFloat(a.financial?.baseValue || 0) + parseFloat(a.financial?.extraValue || 0);
            
            let displayDate = a.date || '';
            let displayHospital = a.hospitalName || '';
            if (!displayDate || !displayHospital) {
                const parts = a.slotId.split('-');
                if (parts.length >= 6) {
                    if (!displayHospital) {
                        const h = MOCK_HOSPITALS.find(h => h.id.toString() === parts[3]);
                        if (h) displayHospital = h.name;
                    }
                    if (!displayDate) {
                        const w = activeWeeks.find(w => w.id === parts[2]);
                        if (w && w.days[parseInt(parts[5])]) {
                            displayDate = w.days[parseInt(parts[5])].date;
                        }
                    }
                }
            }
            
            rowsHtml += `
                <tr>
                    <td>${displayDate || '-'}</td>
                    <td><b>${displayHospital || '-'}</b></td>
                    <td style="text-align:center">${entrada}</td>
                    <td style="text-align:center">${saida}</td>
                    <td><span class="badge">${a.subtitle || 'Plantão'}</span></td>
                    <td style="color:#059669; text-align:right"><b>R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</b></td>
                    <td>${a.doctorName || '-'}</td>
                    <td style="color:#64748b; font-size: 10px">${a.financial?.observations || '-'}</td>
                </tr>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório Financeiro - ${monthLabel}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #334155; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
                    h1 { margin: 0; color: #0f172a; font-size: 24px; }
                    .subtitle { color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-top: 4px; }
                    .total-box { text-align: right; }
                    .total-label { font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
                    .total-val { font-size: 28px; font-weight: 900; color: #059669; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background-color: #f8fafc; color: #64748b; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
                    .badge { background-color: #eef2ff; color: #4f46e5; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>Módulo Financeiro</h1>
                        <div class="subtitle">${monthLabel}</div>
                    </div>
                    <div class="total-box">
                        <div class="total-label">Total do Mês</div>
                        <div class="total-val">R$ ${totalMonthValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Hospital</th>
                            <th style="text-align:center">Entrada</th>
                            <th style="text-align:center">Saída</th>
                            <th>Plantão</th>
                            <th style="text-align:right">Valor</th>
                            <th>Médico (Plantonista)</th>
                            <th>OBS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <script>
                    window.onload = () => { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '', 'width=900,height=800');
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // Gera dinamicamente as semanas baseadas no activeMonth
    const activeWeeks = useMemo(() => {
        if (visualizationMode === 'fixa') return MOCK_FIXED_WEEKS;
        if (!activeMonth) return [];
        
        const [yearStr, monthStr] = activeMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        
        const weeks = [];
        let currentDate = new Date(year, month - 1, 1);
        
        // Volta para a segunda-feira da primeira semana do mês
        const firstDayOfWeek = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
        currentDate.setDate(currentDate.getDate() - firstDayOfWeek);
        
        // 6 semanas para garantir que cobre todos os dias (ex: mês começando no sábado)
        for (let i = 0; i < 6; i++) {
            const weekDays = [];
            let hasValidDays = false;
            
            for (let j = 0; j < 7; j++) {
                const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const isValid = currentDate.getMonth() === month - 1;
                
                if (isValid) hasValidDays = true;
                
                weekDays.push({
                    date: `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
                    dayName: dayNames[currentDate.getDay()],
                    isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
                    isOutOfMonth: !isValid,
                    originalIndex: j
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Só adiciona a semana se houver dias válidos
            if (hasValidDays) {
                const validDays = weekDays.filter(d => !d.isOutOfMonth);
                const startStr = validDays[0].date;
                const endStr = validDays[validDays.length - 1].date;
                weeks.push({
                    id: `w${i + 1}`,
                    title: `${startStr} a ${endStr}`,
                    badge: `Semana ${weeks.length + 1}`,
                    days: weekDays
                });
            }
        }
        return weeks;
    }, [activeMonth, visualizationMode]);

    const createOrGoToMonth = (monthVal) => {
        if (!monthVal) return;
        const [year, month] = monthVal.split('-');
        const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const label = `${monthNames[parseInt(month, 10) - 1]} de ${year}`;
        
        if (!existingMonths.find(m => m.id === monthVal)) {
            setExistingMonths(prev => [...prev, { id: monthVal, label }]);
            logAction('escala_mes_criado', `Novo mês gerado na escala: ${label}`);
            
            // Replicar Escala Fixa para o Novo Mês
            const newAssignments = { ...assignments };
            Object.entries(assignments).forEach(([key, value]) => {
                if (key.startsWith('FIXED-')) {
                    const newKey = key.replace('FIXED-', `${monthVal}-`).replace('-fw', '-w');
                    newAssignments[newKey] = { ...value };
                }
            });
            setAssignments(newAssignments);
        }
        setActiveMonth(monthVal);
    };

    const handleCreateOrGoMonth = () => {
        createOrGoToMonth(newMonthVal);
        setIsMonthModalOpen(false);
        setNewMonthVal('');
    };

    const goToCurrentMonth = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const targetMonth = `${year}-${month}`;
        
        if (activeMonth !== targetMonth) {
            createOrGoToMonth(targetMonth);
        } else {
            // Se já estiver no mês atual, faz o scroll manualmente
            const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}`;
            const currentWeek = activeWeeks.find(w => w.days.some(d => d.date === todayStr));
            if (currentWeek) {
                const element = document.getElementById(`week-${currentWeek.id}`);
                if (element && element.parentNode) {
                    element.parentNode.scrollTo({ top: element.offsetTop - 20, behavior: 'smooth' });
                }
            }
        }
    };

    const handleDeleteMonth = (id, e) => {
        e.stopPropagation();
        const updated = existingMonths.filter(m => m.id !== id);
        setExistingMonths(updated);
        logAction('escala_mes_removido', `Mês removido da escala: ${id}`);
        if (activeMonth === id && updated.length > 0) {
            setActiveMonth(updated[0].id);
        } else if (updated.length === 0) {
            setActiveMonth('');
        }
    };

    const handleNavigateMonth = (direction) => {
        if (!activeMonth || existingMonths.length === 0) return;
        
        // Ordena os meses para garantir a navegação cronológica correta
        const sortedMonths = [...existingMonths].sort((a, b) => a.id.localeCompare(b.id));
        const currentIndex = sortedMonths.findIndex(m => m.id === activeMonth);
        
        if (direction === 'prev' && currentIndex > 0) {
            setActiveMonth(sortedMonths[currentIndex - 1].id);
        } else if (direction === 'next' && currentIndex < sortedMonths.length - 1) {
            setActiveMonth(sortedMonths[currentIndex + 1].id);
        }
    };
    
    const mockUser = {
        name: 'Paulo Nogueira',
        role: 'Administrador'
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            // Buscando médicos (Usuários da base)
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, name, email, role, status')
                .in('role', ['Médico', 'Médico Autorizador'])
                .eq('status', 'Ativo')
                .order('name', { ascending: true });
                
            if (!usersError && usersData) {
                setDoctors(usersData);
            }
            // Buscando configurações da escala (hospitais e regras)
            const { data: escData } = await supabase.from('settings').select('data').eq('id', 'escala').maybeSingle();
            if (escData?.data?.hospitais && escData.data.hospitais.length > 0) {
                setHospitais(escData.data.hospitais);
            } else {
                setHospitais(MOCK_HOSPITALS);
            }
            if (escData?.data?.financialRules) {
                setFinancialRules(escData.data.financialRules);
            }
        } catch (error) {
            console.error("Erro ao buscar configs:", error);
        }
    };

    const folhaPontoData = useMemo(() => {
        const hospMap = {};
        let totalDocs = new Set();
        let totalShifts = 0;
        
        currentMonthVerifiedAssignments.forEach(a => {
            let displayDate = a.date || '';
            let displayHospital = a.hospitalName || '';
            if (!displayDate || !displayHospital) {
                const parts = a.slotId.split('-');
                if (parts.length >= 6) {
                    if (!displayHospital) {
                        const h = MOCK_HOSPITALS.find(h => h.id.toString() === parts[3]);
                        if (h) displayHospital = h.name;
                    }
                    if (!displayDate) {
                        const w = activeWeeks.find(w => w.id === parts[2]);
                        if (w && w.days[parseInt(parts[5])]) {
                            displayDate = w.days[parseInt(parts[5])].date;
                        }
                    }
                }
            }
            
            const hName = displayHospital || 'Desconhecido';
            if (!hospMap[hName]) {
                hospMap[hName] = { name: hName, totalVal: 0, doctors: {} };
            }
            
            const val = parseFloat(a.financial?.baseValue || 0) + parseFloat(a.financial?.extraValue || 0);
            hospMap[hName].totalVal += val;
            
            const dName = a.doctorName || 'Desconhecido';
            if (!hospMap[hName].doctors[dName]) {
                hospMap[hName].doctors[dName] = { name: dName, totalVal: 0, shifts: [] };
            }
            hospMap[hName].doctors[dName].totalVal += val;
            hospMap[hName].doctors[dName].shifts.push({ ...a, displayDate, val });
            
            totalDocs.add(`${hName}-${dName}`);
            totalShifts++;
        });

        const hospArray = Object.values(hospMap).map(h => ({
            ...h,
            doctors: Object.values(h.doctors).sort((a,b) => a.name.localeCompare(b.name))
        })).sort((a,b) => a.name.localeCompare(b.name));
        
        return { hospArray, totalDocs: totalDocs.size, totalShifts };
    }, [currentMonthVerifiedAssignments, MOCK_HOSPITALS, activeWeeks]);

    const printFolhaPdf = (doctorName, hospitalName, shifts, withValue, openWindow = true) => {
        let rowsHtml = '';
        let totalVal = 0;
        shifts.forEach(a => {
            const timeParts = a.time ? a.time.split('-').map(t => t.trim()) : [];
            const entrada = timeParts[0] || '-';
            const saida = timeParts[1] || '-';
            totalVal += a.val;
            rowsHtml += `
                <tr>
                    <td style="text-align:center">${a.displayDate || '-'}</td>
                    <td style="text-align:center">${entrada}</td>
                    <td style="text-align:center">${saida}</td>
                    <td style="text-align:center"></td>
                    <td style="text-align:center"></td>
                    <td style="text-align:center">${a.subtitle || '12 horas'}</td>
                    ${withValue ? `<td style="text-align:right">R$ ${a.val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>` : ''}
                </tr>
            `;
        });

        const htmlContent = `
            <div class="folha-page">
                <div class="header">
                    <div style="flex-1">
                        <h2>FOLHA DE PONTO - SERVIÇO DE ANESTESIA</h2>
                        <div class="details">
                            <p>EMPRESA: <span>ISM HEALTH SOLUTIONS</span></p>
                            <p>CNPJ: <span>29.732.524/0001-59</span></p>
                            <p>LOCAL: <span>${hospitalName}</span></p>
                            <p>MÉDICO: <span>${doctorName}</span></p>
                            <p>ESPECIALIDADE: <span>Anestesiologista</span></p>
                            <p>CRM: <span></span></p>
                        </div>
                    </div>
                    <div>
                        <svg class="logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M50 10 C30 10 10 30 10 50 C10 70 30 90 50 90 C70 90 90 70 90 50 C90 30 70 10 50 10 Z" stroke="#0284c7" stroke-width="8" stroke-linecap="round"/>
                            <path d="M35 70 C35 55 65 55 65 70" stroke="#0284c7" stroke-width="8" stroke-linecap="round"/>
                            <circle cx="50" cy="40" r="8" fill="#0284c7"/>
                        </svg>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>DATA</th>
                            <th>ENTRADA</th>
                            <th>SAÍDA</th>
                            <th>ENTRADA</th>
                            <th>SAÍDA</th>
                            <th>HORAS</th>
                            ${withValue ? '<th>VALOR</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        ${withValue ? `
                        <tr class="total-row">
                            <td colspan="6"></td>
                            <td>R$ ${totalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        </tr>` : ''}
                    </tbody>
                </table>
                <div class="signature-box">
                    <p>RECONHEÇO AS INFORMAÇÕES CONSTANTES NESTA FOLHA DE PONTO.</p>
                    <div class="signature-line"></div>
                    <p>ASSINATURA E CARIMBO</p>
                </div>
                <div class="footer">ISM HEALTH SOLUTIONS — CNPJ 29.732.524/0001-59</div>
            </div>
        `;
        
        if (openWindow) {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Folha de Ponto - ${doctorName}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #000; font-size: 12px; }
                        .folha-page { page-break-after: always; padding-bottom: 20px; }
                        .folha-page:last-child { page-break-after: auto; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                        .header h2 { text-align: center; font-size: 16px; margin: 0 0 20px 0; }
                        .details p { margin: 4px 0; font-size: 11px; font-weight: bold; }
                        .details span { font-weight: normal; }
                        .logo { width: 80px; height: 80px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #000; padding: 8px; font-size: 11px; }
                        th { font-weight: bold; text-align: center; background-color: #fafafa; }
                        .total-row td { border: none; padding-top: 10px; font-weight: bold; font-size: 12px; text-align: right; }
                        .signature-box { margin-top: 100px; text-align: center; font-size: 11px; }
                        .signature-line { border-top: 1px solid #000; width: 300px; margin: 40px auto 10px auto; }
                        .footer { text-align: center; margin-top: 50px; font-size: 9px; color: #666; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
                </html>
            `;
            const printWindow = window.open('', '', 'width=900,height=900');
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
        }
        
        return htmlContent;
    };

    const printHospitalFolhasPdf = (hospital, withValue) => {
        let allHtml = '';
        hospital.doctors.forEach(doc => {
            allHtml += printFolhaPdf(doc.name, hospital.name, doc.shifts, withValue, false);
        });
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Folhas de Ponto - ${hospital.name}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #000; font-size: 12px; }
                    .folha-page { page-break-after: always; padding-bottom: 20px; }
                    .folha-page:last-child { page-break-after: auto; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                    .header h2 { text-align: center; font-size: 16px; margin: 0 0 20px 0; }
                    .details p { margin: 4px 0; font-size: 11px; font-weight: bold; }
                    .details span { font-weight: normal; }
                    .logo { width: 80px; height: 80px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 8px; font-size: 11px; }
                    th { font-weight: bold; text-align: center; background-color: #fafafa; }
                    .total-row td { border: none; padding-top: 10px; font-weight: bold; font-size: 12px; text-align: right; }
                    .signature-box { margin-top: 100px; text-align: center; font-size: 11px; }
                    .signature-line { border-top: 1px solid #000; width: 300px; margin: 40px auto 10px auto; }
                    .footer { text-align: center; margin-top: 50px; font-size: 9px; color: #666; }
                </style>
            </head>
            <body>
                ${allHtml}
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const printWindow = window.open('', '', 'width=900,height=900');
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const printAllFolhasPdf = (withValue) => {
        let allHtml = '';
        folhaPontoData.hospArray.forEach(hospital => {
            hospital.doctors.forEach(doc => {
                allHtml += printFolhaPdf(doc.name, hospital.name, doc.shifts, withValue, false);
            });
        });
        
        if (!allHtml) return;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Todas Folhas de Ponto</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #000; font-size: 12px; }
                    .folha-page { page-break-after: always; padding-bottom: 20px; }
                    .folha-page:last-child { page-break-after: auto; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                    .header h2 { text-align: center; font-size: 16px; margin: 0 0 20px 0; }
                    .details p { margin: 4px 0; font-size: 11px; font-weight: bold; }
                    .details span { font-weight: normal; }
                    .logo { width: 80px; height: 80px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 8px; font-size: 11px; }
                    th { font-weight: bold; text-align: center; background-color: #fafafa; }
                    .total-row td { border: none; padding-top: 10px; font-weight: bold; font-size: 12px; text-align: right; }
                    .signature-box { margin-top: 100px; text-align: center; font-size: 11px; }
                    .signature-line { border-top: 1px solid #000; width: 300px; margin: 40px auto 10px auto; }
                    .footer { text-align: center; margin-top: 50px; font-size: 9px; color: #666; }
                </style>
            </head>
            <body>
                ${allHtml}
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const printWindow = window.open('', '', 'width=900,height=900');
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // Auto-scroll para a semana atual
    useEffect(() => {
        if (visualizationMode !== 'mensal' || !activeWeeks || activeWeeks.length === 0) return;
        
        const today = new Date();
        const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const timer = setTimeout(() => {
            const currentWeek = activeWeeks.find(w => w.days.some(d => d.date === todayStr));
            if (currentWeek) {
                const element = document.getElementById(`week-${currentWeek.id}`);
                if (element) {
                    // Compensa o header do site (ajustado para ~100px)
                    const yOffset = -20; 
                    const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                    element.parentNode.scrollTo({ top: element.offsetTop - 20, behavior: 'smooth' });
                }
            }
        }, 300); // 300ms garante que as semanas já foram desenhadas no DOM
        return () => clearTimeout(timer);
    }, [activeWeeks, visualizationMode]);

    // Funções do Modal de Regras Financeiras
    const saveFinancialRulesToDB = async (updatedRules) => {
        try {
            const { data: existingData } = await supabase.from('settings').select('data').eq('id', 'escala').maybeSingle();
            const currentData = existingData?.data || {};
            
            const { error } = await supabase.from('settings').upsert({
                id: 'escala',
                data: { ...currentData, financialRules: updatedRules }
            });
            if (error) throw error;
            logAction('escala_regras_financeiras_atualizadas', `Regras financeiras da escala foram atualizadas.`);
        } catch (error) {
            console.error("Erro ao salvar regras financeiras:", error);
            alert("Erro ao salvar as regras financeiras.");
        }
    };

    const handleAddFinancialRule = () => {
        if (!newRule.name || !newRule.value) return;
        const newRuleItem = { id: Date.now().toString(), name: newRule.name, hospital: newRule.hospital, value: newRule.value };
        const updatedRules = [...financialRules, newRuleItem];
        setFinancialRules(updatedRules);
        saveFinancialRulesToDB(updatedRules);
        setNewRule({ name: '', hospital: '', value: '' });
    };

    const handleDeleteFinancialRule = (id) => {
        const updatedRules = financialRules.filter(r => r.id !== id);
        setFinancialRules(updatedRules);
        saveFinancialRulesToDB(updatedRules);
    };

    const handleEditRule = (rule) => {
        setEditingRuleId(rule.id);
        setTempRule({ ...rule });
    };

    const handleSaveEditRule = () => {
        if (!tempRule || !tempRule.name || !tempRule.value) return;
        const updatedRules = financialRules.map(r => r.id === tempRule.id ? tempRule : r);
        setFinancialRules(updatedRules);
        saveFinancialRulesToDB(updatedRules);
        setEditingRuleId(null);
        setTempRule(null);
    };

    const handleCancelEditRule = () => {
        setEditingRuleId(null);
        setTempRule(null);
    };

    // Funções do Modal de Hospitais
    const saveHospitaisToDB = async (updatedHospitais) => {
        try {
            const { data: existingData } = await supabase.from('settings').select('data').eq('id', 'escala').maybeSingle();
            const currentData = existingData?.data || {};
            
            const { error } = await supabase.from('settings').upsert({
                id: 'escala',
                data: {
                    ...currentData,
                    hospitais: updatedHospitais
                }
            });
            if (error) throw error;
            setHospitais(updatedHospitais);
            logAction('escala_hospitais_atualizados', `Configuração de hospitais da escala foi atualizada.`);
        } catch (error) {
            console.error("Erro ao salvar hospitais:", error);
            alert("Erro ao salvar os hospitais.");
        }
    };

    const handleEditHospital = (hospital) => {
        setEditingHospitalId(hospital.id);
        setTempHospital({ ...hospital, sectors: [...hospital.sectors] });
    };

    const handleSaveTempHospital = async () => {
        if (!tempHospital || !tempHospital.name.trim()) return;
        
        let updated;
        if (hospitais.some(h => h.id === tempHospital.id)) {
            updated = hospitais.map(h => h.id === tempHospital.id ? tempHospital : h);
        } else {
            updated = [...hospitais, tempHospital];
        }
        
        await saveHospitaisToDB(updated);
        setEditingHospitalId(null);
        setTempHospital(null);
    };

    const handleAddHospital = () => {
        const newHospital = {
            id: Date.now(),
            name: '',
            color: 'indigo',
            sectors: ['Geral']
        };
        handleEditHospital(newHospital);
    };

    const handleDeleteHospital = (id, e) => {
        e.stopPropagation();
        if (window.confirm('Certeza que deseja apagar este hospital? Plantões vinculados a ele podem sumir da visualização.')) {
            const updated = hospitais.filter(h => h.id !== id);
            saveHospitaisToDB(updated);
        }
    };

    const handleAddSectorToTemp = () => {
        setTempHospital({ ...tempHospital, sectors: [...tempHospital.sectors, 'Novo Setor'] });
    };

    const handleRemoveSectorFromTemp = (index) => {
        const newSectors = [...tempHospital.sectors];
        newSectors.splice(index, 1);
        setTempHospital({ ...tempHospital, sectors: newSectors });
    };

    const handleUpdateSectorInTemp = (index, val) => {
        const newSectors = [...tempHospital.sectors];
        newSectors[index] = val;
        setTempHospital({ ...tempHospital, sectors: newSectors });
    };

    const handleMoveSectorTemp = (index, direction) => {
        const newSectors = [...tempHospital.sectors];
        if (direction === 'up' && index > 0) {
            [newSectors[index - 1], newSectors[index]] = [newSectors[index], newSectors[index - 1]];
        } else if (direction === 'down' && index < newSectors.length - 1) {
            [newSectors[index + 1], newSectors[index]] = [newSectors[index], newSectors[index + 1]];
        }
        setTempHospital({ ...tempHospital, sectors: newSectors });
    };

    const handleCancelEditHospital = () => {
        setEditingHospitalId(null);
        setTempHospital(null);
    };

    const hospitalColors = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

    const getHospitalColorClass = (c) => {
        const map = {
            slate: 'bg-slate-500 ring-slate-100',
            gray: 'bg-gray-500 ring-gray-100',
            zinc: 'bg-zinc-500 ring-zinc-100',
            neutral: 'bg-neutral-500 ring-neutral-100',
            stone: 'bg-stone-500 ring-stone-100',
            red: 'bg-red-500 ring-red-100',
            orange: 'bg-orange-500 ring-orange-100',
            amber: 'bg-amber-500 ring-amber-100',
            yellow: 'bg-yellow-500 ring-yellow-100',
            lime: 'bg-lime-500 ring-lime-100',
            green: 'bg-green-500 ring-green-100',
            emerald: 'bg-emerald-500 ring-emerald-100',
            teal: 'bg-teal-500 ring-teal-100',
            cyan: 'bg-cyan-500 ring-cyan-100',
            sky: 'bg-sky-500 ring-sky-100',
            blue: 'bg-blue-500 ring-blue-100',
            indigo: 'bg-indigo-500 ring-indigo-100',
            violet: 'bg-violet-500 ring-violet-100',
            purple: 'bg-purple-500 ring-purple-100',
            fuchsia: 'bg-fuchsia-500 ring-fuchsia-100',
            pink: 'bg-pink-500 ring-pink-100',
            rose: 'bg-rose-500 ring-rose-100',
        };
        return map[c] || map.slate;
    };

    const getHospitalColorBgClass = (c) => {
        const map = {
            slate: 'bg-slate-500',
            gray: 'bg-gray-500',
            zinc: 'bg-zinc-500',
            neutral: 'bg-neutral-500',
            stone: 'bg-stone-500',
            red: 'bg-red-500',
            orange: 'bg-orange-500',
            amber: 'bg-amber-500',
            yellow: 'bg-yellow-500',
            lime: 'bg-lime-500',
            green: 'bg-green-500',
            emerald: 'bg-emerald-500',
            teal: 'bg-teal-500',
            cyan: 'bg-cyan-500',
            sky: 'bg-sky-500',
            blue: 'bg-blue-500',
            indigo: 'bg-indigo-500',
            violet: 'bg-violet-500',
            purple: 'bg-purple-500',
            fuchsia: 'bg-fuchsia-500',
            pink: 'bg-pink-500',
            rose: 'bg-rose-500',
        };
        return map[c] || map.slate;
    };

    const getHospitalColorRingClass = (c) => {
        const map = {
            slate: 'ring-slate-500/30',
            gray: 'ring-gray-500/30',
            zinc: 'ring-zinc-500/30',
            neutral: 'ring-neutral-500/30',
            stone: 'ring-stone-500/30',
            red: 'ring-red-500/30',
            orange: 'ring-orange-500/30',
            amber: 'ring-amber-500/30',
            yellow: 'ring-yellow-500/30',
            lime: 'ring-lime-500/30',
            green: 'ring-green-500/30',
            emerald: 'ring-emerald-500/30',
            teal: 'ring-teal-500/30',
            cyan: 'ring-cyan-500/30',
            sky: 'ring-sky-500/30',
            blue: 'ring-blue-500/30',
            indigo: 'ring-indigo-500/30',
            violet: 'ring-violet-500/30',
            purple: 'ring-purple-500/30',
            fuchsia: 'ring-fuchsia-500/30',
            pink: 'ring-pink-500/30',
            rose: 'ring-rose-500/30',
        };
        return map[c] || map.slate;
    };

    const handleRemoveAssignment = (slotId, e) => {
        e.stopPropagation();
        const newAssignments = { ...assignments };
        const removed = newAssignments[slotId];
        delete newAssignments[slotId];
        setAssignments(newAssignments);
        logAction('escala_plantao_removido', `Plantão removido: ${slotId} - Médico: ${removed?.doctorName}`);
    };

    const sortedMonthsForNav = [...existingMonths].sort((a, b) => a.id.localeCompare(b.id));
    const currentMonthIndex = sortedMonthsForNav.findIndex(m => m.id === activeMonth);
    const hasPrevMonth = currentMonthIndex > 0;
    const hasNextMonth = currentMonthIndex >= 0 && currentMonthIndex < sortedMonthsForNav.length - 1;

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] p-3 md:p-5 overflow-hidden font-sans relative">
            {/* Header Sofisticado (Estreito) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Escala Médica</h1>
                    <p className="text-xs font-medium text-slate-500">Gestão e alocação de plantões nas unidades.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {visualizationMode === 'mensal' ? (
                        <>
                            <button 
                                onClick={goToCurrentMonth}
                                className="flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm border border-slate-200/80 transition-all focus:outline-none"
                            >
                                Hoje
                            </button>
                            <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200/80 p-0.5 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => handleNavigateMonth('prev')} 
                                disabled={!hasPrevMonth}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-md transition-colors"
                            >
                                <ChevronLeft size={14} strokeWidth={2.5} />
                            </button>
                            <div className="px-3 py-1 flex items-center gap-1.5">
                                <CalendarIcon size={14} className="text-indigo-600" />
                                <span className="text-xs font-bold text-slate-800 tracking-tight capitalize">
                                    {existingMonths.find(m => m.id === activeMonth)?.label || 'Sem mês ativo'}
                                </span>
                            </div>
                            <button 
                                onClick={() => handleNavigateMonth('next')} 
                                disabled={!hasNextMonth}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-md transition-colors"
                            >
                                <ChevronRight size={14} strokeWidth={2.5} />
                            </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setVisualizationMode('mensal')} 
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm border border-slate-200/80 transition-all focus:outline-none"
                            >
                                <ChevronLeft size={14} /> Voltar
                            </button>
                            <button 
                                onClick={() => setIsMonthModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all animate-in fade-in slide-in-from-right-4 duration-300"
                            >
                                <Copy size={14} />
                                Replicar para Novo Mês
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={() => setIsDrawerOpen(true)} 
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/50 rounded-lg shadow-sm border border-slate-200/80 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <SlidersHorizontal size={14} />
                        <span>Ajustes</span>
                    </button>
                </div>
            </div>
            
            {/* Scrollable Container para as Semanas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-12 space-y-8 relative">
                
                {/* Indicador de Modo Fixo */}
                {visualizationMode === 'fixa' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h3 className="text-amber-900 font-bold text-sm">Modo de Escala Fixa</h3>
                            <p className="text-amber-700 text-xs mt-0.5">Esta é a configuração padrão. Use este modelo para replicar para os próximos meses e evitar retrabalho.</p>
                        </div>
                    </div>
                )}

                {activeWeeks.map((week) => (
                    <div id={`week-${week.id}`} key={week.id} className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60 overflow-hidden flex flex-col">
                        
                        {/* Header da Semana */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <h2 className="text-base font-bold text-slate-800 tracking-tight">{week.title}</h2>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
                                    {week.badge}
                                </span>
                            </div>
                        </div>

                        {/* Tabela Clean / Enterprise */}
                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead className="bg-white">
                                    <tr>
                                        {/* Z-Index 30 para os cabeçalhos ficarem acima de tudo */}
                                        <th className="px-4 py-3 border-b border-slate-200 w-40 min-w-[160px] max-w-[160px] sticky left-0 z-30 bg-white shadow-[1px_0_0_0_rgba(226,232,240,1)] text-center">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hospital</span>
                                        </th>
                                        <th className="px-4 py-3 border-b border-slate-200 w-36 min-w-[144px] max-w-[144px] sticky left-40 z-30 bg-white shadow-[1px_0_0_0_rgba(226,232,240,1),_4px_0_12px_-5px_rgba(0,0,0,0.1)] border-r border-slate-200 text-center">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tipo</span>
                                        </th>
                                        {week.days.map((day, idx) => (
                                            <th key={idx} className={`px-2 py-3 border-b border-slate-200 min-w-[160px] ${day.isWeekend ? 'bg-slate-50/50' : 'bg-white'}`}>
                                                {/* Cabeçalho centralizado */}
                                                {!day.isOutOfMonth ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className={`text-xs font-bold uppercase tracking-tight ${day.isWeekend ? 'text-slate-500' : 'text-slate-800'}`}>{day.dayName}</span>
                                                        <span className="text-[11px] font-bold text-slate-400 mt-0.5">{day.date}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center opacity-30">
                                                        <span className="text-xs font-bold uppercase tracking-tight text-slate-400">{day.dayName}</span>
                                                    </div>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {hospitais
                                        .filter(h => selectedHospital === null || h.id === selectedHospital)
                                        .map((hospital, hIdx) => {
                                        const c = hospital.color || 'slate';
                                        
                                        // Mapeamento explícito para o Tailwind não remover as classes (PurgeCSS)
                                        const colorMap = {
                                            slate: { bg: 'bg-slate-50/60', hover: 'group-hover:bg-slate-100/60', border: 'border-slate-200/60', textDark: 'text-slate-900', indicator: 'bg-slate-500', pillText: 'text-slate-700', iconBg: 'bg-slate-100', iconText: 'text-slate-600', pillHover: 'hover:border-slate-400', pillBorder: 'border-slate-200/50' },
                                            gray: { bg: 'bg-gray-50/60', hover: 'group-hover:bg-gray-100/60', border: 'border-gray-200/60', textDark: 'text-gray-900', indicator: 'bg-gray-500', pillText: 'text-gray-700', iconBg: 'bg-gray-100', iconText: 'text-gray-600', pillHover: 'hover:border-gray-400', pillBorder: 'border-gray-200/50' },
                                            zinc: { bg: 'bg-zinc-50/60', hover: 'group-hover:bg-zinc-100/60', border: 'border-zinc-200/60', textDark: 'text-zinc-900', indicator: 'bg-zinc-500', pillText: 'text-zinc-700', iconBg: 'bg-zinc-100', iconText: 'text-zinc-600', pillHover: 'hover:border-zinc-400', pillBorder: 'border-zinc-200/50' },
                                            neutral: { bg: 'bg-neutral-50/60', hover: 'group-hover:bg-neutral-100/60', border: 'border-neutral-200/60', textDark: 'text-neutral-900', indicator: 'bg-neutral-500', pillText: 'text-neutral-700', iconBg: 'bg-neutral-100', iconText: 'text-neutral-600', pillHover: 'hover:border-neutral-400', pillBorder: 'border-neutral-200/50' },
                                            stone: { bg: 'bg-stone-50/60', hover: 'group-hover:bg-stone-100/60', border: 'border-stone-200/60', textDark: 'text-stone-900', indicator: 'bg-stone-500', pillText: 'text-stone-700', iconBg: 'bg-stone-100', iconText: 'text-stone-600', pillHover: 'hover:border-stone-400', pillBorder: 'border-stone-200/50' },
                                            red: { bg: 'bg-red-50/60', hover: 'group-hover:bg-red-100/60', border: 'border-red-200/60', textDark: 'text-red-900', indicator: 'bg-red-500', pillText: 'text-red-700', iconBg: 'bg-red-100', iconText: 'text-red-600', pillHover: 'hover:border-red-400', pillBorder: 'border-red-200/50' },
                                            orange: { bg: 'bg-orange-50/60', hover: 'group-hover:bg-orange-100/60', border: 'border-orange-200/60', textDark: 'text-orange-900', indicator: 'bg-orange-500', pillText: 'text-orange-700', iconBg: 'bg-orange-100', iconText: 'text-orange-600', pillHover: 'hover:border-orange-400', pillBorder: 'border-orange-200/50' },
                                            amber: { bg: 'bg-amber-50/60', hover: 'group-hover:bg-amber-100/60', border: 'border-amber-200/60', textDark: 'text-amber-900', indicator: 'bg-amber-500', pillText: 'text-amber-700', iconBg: 'bg-amber-100', iconText: 'text-amber-600', pillHover: 'hover:border-amber-400', pillBorder: 'border-amber-200/50' },
                                            yellow: { bg: 'bg-yellow-50/60', hover: 'group-hover:bg-yellow-100/60', border: 'border-yellow-200/60', textDark: 'text-yellow-900', indicator: 'bg-yellow-500', pillText: 'text-yellow-700', iconBg: 'bg-yellow-100', iconText: 'text-yellow-600', pillHover: 'hover:border-yellow-400', pillBorder: 'border-yellow-200/50' },
                                            lime: { bg: 'bg-lime-50/60', hover: 'group-hover:bg-lime-100/60', border: 'border-lime-200/60', textDark: 'text-lime-900', indicator: 'bg-lime-500', pillText: 'text-lime-700', iconBg: 'bg-lime-100', iconText: 'text-lime-600', pillHover: 'hover:border-lime-400', pillBorder: 'border-lime-200/50' },
                                            green: { bg: 'bg-green-50/60', hover: 'group-hover:bg-green-100/60', border: 'border-green-200/60', textDark: 'text-green-900', indicator: 'bg-green-500', pillText: 'text-green-700', iconBg: 'bg-green-100', iconText: 'text-green-600', pillHover: 'hover:border-green-400', pillBorder: 'border-green-200/50' },
                                            emerald: { bg: 'bg-emerald-50/60', hover: 'group-hover:bg-emerald-100/60', border: 'border-emerald-200/60', textDark: 'text-emerald-900', indicator: 'bg-emerald-500', pillText: 'text-emerald-700', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', pillHover: 'hover:border-emerald-400', pillBorder: 'border-emerald-200/50' },
                                            teal: { bg: 'bg-teal-50/60', hover: 'group-hover:bg-teal-100/60', border: 'border-teal-200/60', textDark: 'text-teal-900', indicator: 'bg-teal-500', pillText: 'text-teal-700', iconBg: 'bg-teal-100', iconText: 'text-teal-600', pillHover: 'hover:border-teal-400', pillBorder: 'border-teal-200/50' },
                                            cyan: { bg: 'bg-cyan-50/60', hover: 'group-hover:bg-cyan-100/60', border: 'border-cyan-200/60', textDark: 'text-cyan-900', indicator: 'bg-cyan-500', pillText: 'text-cyan-700', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600', pillHover: 'hover:border-cyan-400', pillBorder: 'border-cyan-200/50' },
                                            sky: { bg: 'bg-sky-50/60', hover: 'group-hover:bg-sky-100/60', border: 'border-sky-200/60', textDark: 'text-sky-900', indicator: 'bg-sky-500', pillText: 'text-sky-700', iconBg: 'bg-sky-100', iconText: 'text-sky-600', pillHover: 'hover:border-sky-400', pillBorder: 'border-sky-200/50' },
                                            blue: { bg: 'bg-blue-50/60', hover: 'group-hover:bg-blue-100/60', border: 'border-blue-200/60', textDark: 'text-blue-900', indicator: 'bg-blue-500', pillText: 'text-blue-700', iconBg: 'bg-blue-100', iconText: 'text-blue-600', pillHover: 'hover:border-blue-400', pillBorder: 'border-blue-200/50' },
                                            indigo: { bg: 'bg-indigo-50/60', hover: 'group-hover:bg-indigo-100/60', border: 'border-indigo-200/60', textDark: 'text-indigo-900', indicator: 'bg-indigo-500', pillText: 'text-indigo-700', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', pillHover: 'hover:border-indigo-400', pillBorder: 'border-indigo-200/50' },
                                            violet: { bg: 'bg-violet-50/60', hover: 'group-hover:bg-violet-100/60', border: 'border-violet-200/60', textDark: 'text-violet-900', indicator: 'bg-violet-500', pillText: 'text-violet-700', iconBg: 'bg-violet-100', iconText: 'text-violet-600', pillHover: 'hover:border-violet-400', pillBorder: 'border-violet-200/50' },
                                            purple: { bg: 'bg-purple-50/60', hover: 'group-hover:bg-purple-100/60', border: 'border-purple-200/60', textDark: 'text-purple-900', indicator: 'bg-purple-500', pillText: 'text-purple-700', iconBg: 'bg-purple-100', iconText: 'text-purple-600', pillHover: 'hover:border-purple-400', pillBorder: 'border-purple-200/50' },
                                            fuchsia: { bg: 'bg-fuchsia-50/60', hover: 'group-hover:bg-fuchsia-100/60', border: 'border-fuchsia-200/60', textDark: 'text-fuchsia-900', indicator: 'bg-fuchsia-500', pillText: 'text-fuchsia-700', iconBg: 'bg-fuchsia-100', iconText: 'text-fuchsia-600', pillHover: 'hover:border-fuchsia-400', pillBorder: 'border-fuchsia-200/50' },
                                            pink: { bg: 'bg-pink-50/60', hover: 'group-hover:bg-pink-100/60', border: 'border-pink-200/60', textDark: 'text-pink-900', indicator: 'bg-pink-500', pillText: 'text-pink-700', iconBg: 'bg-pink-100', iconText: 'text-pink-600', pillHover: 'hover:border-pink-400', pillBorder: 'border-pink-200/50' },
                                            rose: { bg: 'bg-rose-50/60', hover: 'group-hover:bg-rose-100/60', border: 'border-rose-200/60', textDark: 'text-rose-900', indicator: 'bg-rose-500', pillText: 'text-rose-700', iconBg: 'bg-rose-100', iconText: 'text-rose-600', pillHover: 'hover:border-rose-400', pillBorder: 'border-rose-200/50' },
                                        };
                                        const theme = colorMap[c] || colorMap['slate'];

                                        return (
                                            <React.Fragment key={hospital.id}>
                                                {hospital.sectors.map((sector, sIdx) => {
                                                    const isFirstRow = sIdx === 0;
                                                    const isLastRow = sIdx === hospital.sectors.length - 1;
                                                    const hospitalTopBorder = isFirstRow && hIdx !== 0 ? `border-t-2 ${theme.border}` : '';
                                                    const sectorBottomBorder = isLastRow ? `border-b ${theme.border}` : '';
                                                    
                                                    return (
                                                        <tr key={`${hospital.id}-${sIdx}`} className={`group transition-colors ${theme.bg} ${theme.hover}`}>
                                                            
                                                            {/* Coluna Unidade */}
                                                            <td className={`px-4 py-3 sticky left-0 z-20 ${theme.bg} ${theme.hover} transition-colors ${hospitalTopBorder} ${sectorBottomBorder} shadow-[1px_0_0_0_rgba(226,232,240,1)] relative`}>
                                                                {/* Indicador de cor do hospital na borda esquerda */}
                                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.indicator}`} />
                                                                
                                                                {isFirstRow && (
                                                                    <div className="flex items-center justify-center h-full absolute inset-0 left-2">
                                                                        <span className={`text-sm font-black ${theme.textDark} tracking-tight text-center uppercase`}>{hospital.name}</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            
                                                            {/* Coluna Setor */}
                                                            <td className={`px-4 py-3 sticky left-40 z-20 ${theme.bg} ${theme.hover} transition-colors border-r ${theme.border} shadow-[1px_0_0_0_rgba(226,232,240,1),_4px_0_12px_-5px_rgba(0,0,0,0.1)] ${hospitalTopBorder} ${sectorBottomBorder}`}>
                                                                <div className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white border ${theme.border} shadow-sm ${theme.pillText}`}>
                                                                    {sector}
                                                                </div>
                                                            </td>

                                                                {week.days.map((day, dIdx) => {
                                                                const slotIdPrefix = visualizationMode === 'fixa' ? 'FIXED' : activeMonth;
                                                                const dayIndex = day.originalIndex !== undefined ? day.originalIndex : dIdx;
                                                                const slotId = `${slotIdPrefix}-${week.id}-${hospital.id}-${sIdx}-${dayIndex}`;
                                                                const assignedData = assignments[slotId];
                                                                const assignedDoctor = typeof assignedData === 'string' ? assignedData : assignedData?.doctorName;
                                                                const appearance = assignedData?.appearance || { bold: false, color: 'default', flagged: false, verified: false };
                                                                
                                                                // Zebra vertical suave para fins de semana e dias fora do mês
                                                                const dayBgClass = day.isOutOfMonth ? 'bg-slate-100/50' : (day.isWeekend ? 'bg-slate-900/5' : '');

                                                                return (
                                                                    <td key={dIdx} className={`px-2 py-2 ${hospitalTopBorder} ${sectorBottomBorder} ${dayBgClass}`}>
                                                                        {day.isOutOfMonth ? (
                                                                            <div className="w-full h-[38px]"></div>
                                                                        ) : assignedDoctor ? (
                                                                            (viewMode === 'all' || assignedDoctor === selectedDoctor) ? (
                                                                                // Design Premium: Pill branca neutra minimalista
                                                                                <div 
                                                                                    onClick={() => {
                                                                                        setSearchDoc('');
                                                                                        setActiveSlot({ id: slotId, hospitalName: hospital.name, sectorName: sector, date: day.date });
                                                                                        setDraftAssignment({
                                                                                            doctorName: assignedDoctor,
                                                                                            subtitle: assignedData?.subtitle || '',
                                                                                            period: assignedData?.period || sector,
                                                                                            time: assignedData?.time || '',
                                                                                            appearance: assignedData?.appearance || { bold: false, color: 'default', flagged: false, verified: false },
                                                                                            financial: assignedData?.financial || { baseValue: '1900', extraValue: '0', observations: '' }
                                                                                        });
                                                                                    }}
                                                                                    className={`group/assigned w-full h-auto min-h-[38px] py-1.5 rounded-lg border shadow-sm flex flex-col items-center justify-center px-1 cursor-pointer hover:shadow-md transition-all relative overflow-hidden text-center ${appearance.color === 'red' ? 'bg-rose-50 border-rose-200' : 'bg-white ' + theme.pillBorder}`}
                                                                                >
                                                                                    
                                                                                    <div className="flex items-center justify-center gap-1 w-full relative z-10 pr-6 pl-1">
                                                                                        <span className={`text-xs truncate ${appearance.bold ? 'font-black' : 'font-bold'} ${appearance.color === 'red' ? 'text-rose-700' : theme.pillText}`} title={assignedDoctor}>
                                                                                            {formatDoctorName(assignedDoctor)}
                                                                                        </span>
                                                                                        {appearance.verified && <Check size={10} className="text-emerald-500 shrink-0" strokeWidth={3}/>}
                                                                                        {appearance.flagged && <span className="text-amber-500 shrink-0"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2v20h2v-8h14l-2.5-4.5L20 5H6V2H4z"/></svg></span>}
                                                                                    </div>
                                                                                    
                                                                                    {assignedData?.subtitle && (
                                                                                        <span className="text-[10px] font-medium text-slate-500 truncate block mt-0.5 relative z-10 w-full text-center px-1">{assignedData.subtitle}</span>
                                                                                    )}
                                                                                    {assignedData?.time && (
                                                                                        <span className={`text-[10px] font-bold ${appearance.color === 'red' ? 'text-rose-500' : theme.iconText} mt-0.5 relative z-10 w-full text-center`}>{assignedData.time}</span>
                                                                                    )}
                                                                                    
                                                                                    <div className={`absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l ${appearance.color === 'red' ? 'from-rose-50 via-rose-50/80' : 'from-white via-white/80'} to-transparent opacity-0 group-hover/assigned:opacity-100 transition-opacity flex items-center justify-end pr-1 z-20`}>
                                                                                        <button 
                                                                                            onClick={(e) => handleRemoveAssignment(slotId, e)}
                                                                                            className="p-1 rounded-md bg-white text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-100 transition-colors"
                                                                                            title="Remover Plantonista"
                                                                                        >
                                                                                            <X size={12} strokeWidth={3} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                // Se estiver em Minha Escala e não for o médico selecionado, deixa um espaço vazio
                                                                                <div className="w-full h-[38px]"></div>
                                                                            )
                                                                        ) : (
                                                                            // Design Premium: Buraco super sutil, só aparece no hover ou se a escala estiver vazia
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setSearchDoc('');
                                                                                    setActiveSlot({ id: slotId, hospitalName: hospital.name, sectorName: sector, date: day.date });
                                                                                    setDraftAssignment({
                                                                                        doctorName: '',
                                                                                        subtitle: '',
                                                                                        period: sector,
                                                                                        time: '',
                                                                                        appearance: { bold: false, color: 'default', flagged: false, verified: false },
                                                                                        financial: { baseValue: '1900', extraValue: '0', observations: '' }
                                                                                    });
                                                                                }}
                                                                                className="group/btn w-full h-[38px] rounded-lg border border-dashed border-slate-200/60 bg-white/30 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-center transition-all"
                                                                            >
                                                                                <Plus size={14} className="text-slate-300 group-hover/btn:text-indigo-500 transition-colors opacity-0 group-hover/btn:opacity-100" />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Novo Plantão Avançado */}
            {activeSlot && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setActiveSlot(null)}></div>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] sm:max-h-[85vh] relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Novo Plantão</h3>
                            <button onClick={() => setActiveSlot(null)} className="p-2 text-slate-400 hover:text-rose-500 bg-white hover:bg-rose-50 rounded-lg transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            
                            {/* Preview na Escala */}
                            <div className="space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 ml-1">Preview na Escala</span>
                                <div className={`border ${draftAssignment.appearance.color === 'red' ? 'border-rose-200 bg-rose-50' : 'border-indigo-100 bg-white shadow-[0_2px_10px_-3px_rgba(99,102,241,0.1)]'} rounded-xl p-4 flex flex-col relative overflow-hidden transition-colors`}>
                                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${draftAssignment.appearance.color === 'red' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm ${draftAssignment.appearance.bold ? 'font-black' : 'font-bold'} truncate ${draftAssignment.appearance.color === 'red' ? 'text-rose-600' : 'text-slate-800'}`}>
                                            {draftAssignment.doctorName || 'Nome do Médico'}
                                        </span>
                                        {draftAssignment.appearance.verified && <Check size={14} className="text-emerald-500 shrink-0" strokeWidth={3}/>}
                                    </div>
                                    {draftAssignment.subtitle && (
                                        <span className="text-xs font-medium text-slate-500 mt-0.5">{draftAssignment.subtitle}</span>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        {draftAssignment.time && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${draftAssignment.appearance.color === 'red' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>{draftAssignment.time}</span>}
                                        {draftAssignment.appearance.flagged && <span className="text-amber-500"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2v20h2v-8h14l-2.5-4.5L20 5H6V2H4z"/></svg></span>}
                                    </div>
                                </div>
                            </div>

                            {/* Seletor de Médico */}
                            <div className="space-y-2 relative z-50">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1"><User size={12}/> Médico *</span>
                                {!draftAssignment.doctorName ? (
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar médico..." 
                                            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                                            onChange={(e) => setSearchDoc(e.target.value)}
                                            autoFocus
                                        />
                                        {/* Dropdown de médicos aqui */}
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto py-1">
                                            {doctors.filter(d => {
                                                const name = typeof d === 'string' ? d : (d.name || d.nome || '');
                                                return name.toLowerCase().includes(searchDoc.toLowerCase());
                                            }).map((doc, idx) => {
                                                const docName = typeof doc === 'string' ? doc : (doc.name || doc.nome || '');
                                                return (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => setDraftAssignment({...draftAssignment, doctorName: docName})}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors"
                                                    >
                                                        {docName}
                                                    </button>
                                                )
                                            })}
                                            {doctors.filter(d => {
                                                const name = typeof d === 'string' ? d : (d.name || d.nome || '');
                                                return name.toLowerCase().includes(searchDoc.toLowerCase());
                                            }).length === 0 && (
                                                <div className="px-4 py-3 text-sm text-slate-500 text-center">Nenhum médico encontrado.</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Search size={16} className="text-slate-400" />
                                            <span className="text-sm font-bold text-slate-700">{draftAssignment.doctorName}</span>
                                        </div>
                                        <button onClick={() => setDraftAssignment({...draftAssignment, doctorName: ''})} className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-md hover:bg-slate-200/50">
                                            <X size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Detalhes do Plantão */}
                            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-4">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Clock size={12}/> Detalhes do Plantão</span>
                                
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Subtítulo / Especialidade</label>
                                    <input 
                                        type="text" 
                                        value={draftAssignment.subtitle}
                                        onChange={(e) => setDraftAssignment({...draftAssignment, subtitle: e.target.value})}
                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1.5 block">Período (Regra)</label>
                                        <select 
                                            value={draftAssignment.period}
                                            onChange={(e) => setDraftAssignment({...draftAssignment, period: e.target.value})}
                                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="Diurno">Diurno</option>
                                            <option value="Noturno">Noturno</option>
                                            <option value="Manhã">Manhã</option>
                                            <option value="Tarde">Tarde</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1.5 block">Horário</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: 07-19h"
                                            value={draftAssignment.time}
                                            onChange={(e) => setDraftAssignment({...draftAssignment, time: e.target.value})}
                                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Aparência */}
                            <div className="space-y-3">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5"><Palette size={12}/> Aparência</span>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => setDraftAssignment({...draftAssignment, appearance: {...draftAssignment.appearance, bold: !draftAssignment.appearance.bold}})}
                                        className={`w-10 h-10 rounded-lg border font-black flex items-center justify-center transition-all ${draftAssignment.appearance.bold ? 'border-slate-800 bg-slate-800 text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        B
                                    </button>
                                    <button 
                                        onClick={() => setDraftAssignment({...draftAssignment, appearance: {...draftAssignment.appearance, color: draftAssignment.appearance.color === 'red' ? 'default' : 'red'}})}
                                        className={`px-4 h-10 rounded-lg border font-bold text-sm transition-all ${draftAssignment.appearance.color === 'red' ? 'border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'border-slate-200 bg-white text-rose-500 hover:bg-rose-50'}`}
                                    >
                                        Vermelho
                                    </button>
                                    <button 
                                        onClick={() => setDraftAssignment({...draftAssignment, appearance: {...draftAssignment.appearance, flagged: !draftAssignment.appearance.flagged}})}
                                        className={`px-4 h-10 rounded-lg border font-bold text-sm flex items-center gap-2 transition-all ${draftAssignment.appearance.flagged ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'border-slate-200 bg-white text-amber-500 hover:bg-amber-50'}`}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2v20h2v-8h14l-2.5-4.5L20 5H6V2H4z"/></svg>
                                        Sinalizar
                                    </button>
                                    <button 
                                        onClick={() => setDraftAssignment({...draftAssignment, appearance: {...draftAssignment.appearance, verified: !draftAssignment.appearance.verified}})}
                                        className={`px-4 h-10 rounded-lg border font-bold text-sm flex items-center gap-2 transition-all ${draftAssignment.appearance.verified ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50'}`}
                                    >
                                        <Check size={16} strokeWidth={3}/> Verificado
                                    </button>
                                </div>
                            </div>

                            {/* Financeiro */}
                            <div className="bg-emerald-50/30 rounded-xl p-5 border border-emerald-100 space-y-4">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5"><CircleDollarSign size={12}/> Financeiro</span>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1.5 block">Valor Base</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                                            <input 
                                                type="number" 
                                                value={draftAssignment.financial.baseValue}
                                                onChange={(e) => setDraftAssignment({...draftAssignment, financial: {...draftAssignment.financial, baseValue: e.target.value}})}
                                                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1.5 block">Valor Extra</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                                            <input 
                                                type="number" 
                                                value={draftAssignment.financial.extraValue}
                                                onChange={(e) => setDraftAssignment({...draftAssignment, financial: {...draftAssignment.financial, extraValue: e.target.value}})}
                                                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 block">Negativo para descontos</span>
                                    </div>
                                </div>

                                <div className="bg-emerald-100/50 rounded-lg p-3 flex items-center justify-between border border-emerald-200/50">
                                    <span className="text-xs font-bold text-emerald-800">Total</span>
                                    <span className="text-sm font-black text-emerald-700">
                                        R$ {(parseFloat(draftAssignment.financial.baseValue || 0) + parseFloat(draftAssignment.financial.extraValue || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                    </span>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Observações / Motivo Extra</label>
                                    <input 
                                        type="text" 
                                        value={draftAssignment.financial.observations}
                                        onChange={(e) => setDraftAssignment({...draftAssignment, financial: {...draftAssignment.financial, observations: e.target.value}})}
                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    />
                                </div>
                            </div>

                        </div>
                        
                        {/* Footer / Actions */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
                            <button onClick={() => setActiveSlot(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200/50 transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    if (draftAssignment.doctorName) {
                                        const finalAssignment = {
                                            ...draftAssignment,
                                            hospitalName: activeSlot.hospitalName,
                                            sectorName: activeSlot.sectorName,
                                            date: activeSlot.date
                                        };
                                        setAssignments({ ...assignments, [activeSlot.id]: finalAssignment });
                                        logAction('escala_plantao_salvo', `Plantão salvo: ${activeSlot.id} - Médico: ${draftAssignment.doctorName}`);
                                        setActiveSlot(null);
                                    }
                                }}
                                disabled={!draftAssignment.doctorName}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Salvar Plantão
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Navegar/Criar Mês */}
            {isMonthModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setIsMonthModalOpen(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 flex items-center justify-center text-indigo-600 border border-indigo-100/50 shadow-inner">
                                    <CalendarDays size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Gerenciar Meses</h3>
                                    <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Navegação e Criação</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMonthModalOpen(false)} className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors relative z-10">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-8 bg-slate-50/30">
                            
                            {/* Bloco de Novo Mês */}
                            <div className="bg-white border-2 border-indigo-50 rounded-2xl p-5 shadow-sm shadow-indigo-500/5 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-4">
                                    <Plus size={16} className="text-indigo-500" strokeWidth={3} />
                                    Novo Mês / Acessar
                                </label>
                                
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <input 
                                            type="month" 
                                            value={newMonthVal}
                                            onChange={(e) => setNewMonthVal(e.target.value)}
                                            className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase cursor-pointer hover:border-slate-300"
                                        />
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" size={20} strokeWidth={2.5} />
                                    </div>
                                    <button 
                                        onClick={handleCreateOrGoMonth}
                                        disabled={!newMonthVal}
                                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition-all shadow-[0_4px_12px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.35)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} strokeWidth={3} />
                                        Confirmar Seleção
                                    </button>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 mt-4 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    💡 Se o mês não existir, ele será criado automaticamente copiando o padrão da <span className="text-indigo-500">Escala Fixa</span>.
                                </p>
                            </div>

                            {/* Lista de Meses */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                                    <Clock size={12} strokeWidth={3} />
                                    Histórico de Meses
                                </h4>
                                <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                                    {existingMonths.map(month => {
                                        const isActive = month.id === activeMonth;
                                        return (
                                            <div 
                                                key={month.id}
                                                onClick={() => {
                                                    setActiveMonth(month.id);
                                                    setIsMonthModalOpen(false);
                                                }}
                                                className={`flex items-center justify-between border-2 rounded-2xl p-3 cursor-pointer transition-all group ${isActive ? 'bg-indigo-50 border-indigo-500 shadow-sm shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm'}`}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 border border-slate-100 group-hover:border-indigo-200'}`}>
                                                        <CalendarIcon size={18} strokeWidth={2.5} />
                                                    </div>
                                                    <span className={`font-black text-sm capitalize ${isActive ? 'text-indigo-900' : 'text-slate-600 group-hover:text-indigo-800 transition-colors'}`}>
                                                        {month.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isActive && <span className="text-[10px] font-black text-indigo-700 bg-white border border-indigo-200/60 px-2.5 py-1 rounded-lg tracking-widest shadow-sm">ATIVO</span>}
                                                    <button 
                                                        onClick={(e) => handleDeleteMonth(month.id, e)}
                                                        className={`p-2.5 rounded-xl transition-all border ${isActive ? 'text-rose-500 hover:text-white hover:bg-rose-500 border-rose-200 bg-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-rose-500 opacity-0 group-hover:opacity-100 border-transparent hover:border-rose-500 bg-white'}`}
                                                    >
                                                        <Trash2 size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {existingMonths.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
                                            <CalendarIcon size={24} className="text-slate-300 mb-2" />
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum mês criado</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Gerenciamento de Hospitais */}
            {isHospitalsModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => !editingHospitalId && setIsHospitalsModalOpen(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        {/* Header Premium */}
                        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 flex items-center justify-center text-indigo-600 border border-indigo-100/50 shadow-inner">
                                    <Building size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Hospitais</h3>
                                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Unidades e Setores</p>
                                </div>
                            </div>
                            <button onClick={() => setIsHospitalsModalOpen(false)} className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors relative z-10">
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Conteúdo scrollable */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-6 sm:p-8">
                            {!editingHospitalId ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <LayoutGrid size={12} strokeWidth={3} />
                                            Lista de Unidades ({hospitais.length})
                                        </h4>
                                        <button 
                                            onClick={handleAddHospital}
                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                                        >
                                            <Plus size={14} strokeWidth={3} />
                                            Adicionar Unidade
                                        </button>
                                    </div>

                                    <div className="space-y-1.5">
                                        {hospitais.map(hospital => (
                                            <div 
                                                key={hospital.id} 
                                                onClick={() => handleEditHospital(hospital)}
                                                className="group flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-indigo-200 rounded-xl cursor-pointer transition-all hover:shadow-sm"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-3 h-3 rounded-full ring-2 ring-offset-1 ${getHospitalColorClass(hospital.color)}`}></div>
                                                    <span className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{hospital.name}</span>
                                                    
                                                    <div className="hidden sm:flex items-center gap-2 ml-4">
                                                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 uppercase tracking-widest">
                                                            {hospital.sectors.length} {hospital.sectors.length === 1 ? 'Turno' : 'Turnos'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                                                            {hospital.sectors.slice(0, 3).join(', ')}{hospital.sectors.length > 3 ? '...' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[11px] font-bold text-indigo-500 mr-2 uppercase tracking-widest hidden sm:block">Configurar</span>
                                                    <button 
                                                        onClick={(e) => handleDeleteHospital(hospital.id, e)}
                                                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-3 mb-6">
                                        <button onClick={handleCancelEditHospital} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                                            <ChevronLeft size={24} strokeWidth={3} />
                                        </button>
                                        <h4 className="text-xl font-black text-slate-800 tracking-tight">Editar Unidade</h4>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
                                        {/* Nome */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-800 uppercase tracking-widest">Nome da Unidade</label>
                                            <input 
                                                type="text" 
                                                value={tempHospital.name}
                                                onChange={e => setTempHospital({...tempHospital, name: e.target.value})}
                                                placeholder="Ex: Santa Lucinda"
                                                className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                                            />
                                        </div>

                                        {/* Cor */}
                                        <div className="space-y-2.5">
                                            <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                                <Palette size={14} /> Cor de Identificação
                                            </label>
                                            <div className="flex flex-wrap gap-3">
                                                {hospitalColors.map(c => (
                                                    <button 
                                                        key={c}
                                                        onClick={() => setTempHospital({...tempHospital, color: c})}
                                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${tempHospital.color === c ? `ring-2 ring-offset-2 ${getHospitalColorRingClass(c)} scale-110 shadow-md` : 'hover:scale-105 border border-slate-200'}`}
                                                    >
                                                        <div className={`w-full h-full rounded-full shadow-inner ${getHospitalColorBgClass(c)}`}></div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Setores */}
                                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <label className="text-xs font-black text-slate-800 uppercase tracking-widest block">Setores / Turnos</label>
                                                <span className="text-[11px] text-slate-400 font-medium">Configure as linhas que aparecerão na grade.</span>
                                            </div>
                                            <button 
                                                onClick={handleAddSectorToTemp}
                                                className="text-[11px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 border border-indigo-100/50"
                                            >
                                                <Plus size={14} strokeWidth={3} /> Adicionar
                                            </button>
                                        </div>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {tempHospital.sectors.map((sec, idx) => (
                                                <div key={idx} className="flex gap-2 items-center group">
                                                    <div className="flex-1">
                                                        <input 
                                                            type="text" 
                                                            value={sec}
                                                            onChange={e => handleUpdateSectorInTemp(idx, e.target.value)}
                                                            className="w-full h-10 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-colors shadow-sm"
                                                            placeholder="Nome do Setor/Turno"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="flex flex-col gap-0.5">
                                                            <button 
                                                                onClick={() => handleMoveSectorTemp(idx, 'up')}
                                                                disabled={idx === 0}
                                                                className="w-6 h-4.5 bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center rounded-t-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                title="Mover para cima"
                                                            >
                                                                <ChevronUp size={12} strokeWidth={3} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleMoveSectorTemp(idx, 'down')}
                                                                disabled={idx === tempHospital.sectors.length - 1}
                                                                className="w-6 h-4.5 bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center rounded-b-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                title="Mover para baixo"
                                                            >
                                                                <ChevronDown size={12} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveSectorFromTemp(idx)}
                                                            disabled={tempHospital.sectors.length === 1}
                                                            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-rose-50 text-slate-300 hover:text-rose-500 border border-slate-200 hover:border-rose-200 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ml-1"
                                                            title="Remover setor"
                                                        >
                                                            <Trash2 size={16} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button 
                                            onClick={handleCancelEditHospital}
                                            className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition-colors text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleSaveTempHospital}
                                            disabled={!tempHospital.name.trim()}
                                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-[0_4px_12px_rgba(79,70,229,0.25)] flex items-center gap-2 text-sm disabled:opacity-50"
                                        >
                                            <Check size={18} strokeWidth={3} />
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Modal de Regras Financeiras */}
            {isFinancialRulesModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setIsFinancialRulesModalOpen(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        {/* Header Premium */}
                        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 flex items-center justify-center text-indigo-600 border border-indigo-100/50 shadow-inner">
                                    <DollarSign size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Configuração de Valores</h3>
                                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Regras Financeiras Base</p>
                                </div>
                            </div>
                            <button onClick={() => setIsFinancialRulesModalOpen(false)} className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors relative z-10">
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-6 sm:p-8 flex flex-col gap-6">
                            {/* Filtro */}
                            <div>
                                <select 
                                    value={financialRulesFilter}
                                    onChange={(e) => setFinancialRulesFilter(e.target.value)}
                                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm cursor-pointer"
                                >
                                    <option value="all">Todas as Regras</option>
                                    <option value="geral">Regras Gerais (Sem Vínculo)</option>
                                    {hospitais.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                                </select>
                            </div>

                            {/* Lista de Regras */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-1 flex flex-col min-h-[300px]">
                                <div className="grid grid-cols-[1fr_150px_100px_60px] gap-4 p-4 border-b border-slate-100 bg-slate-50 shrink-0 items-center">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nome da Regra</span>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Vínculo</span>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Valor Base</span>
                                    <span></span>
                                </div>
                                <div className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar flex-1">
                                    {financialRules.filter(r => financialRulesFilter === 'all' || r.hospital === financialRulesFilter || (financialRulesFilter === 'geral' && !r.hospital)).map((rule) => (
                                        <div key={rule.id} className="p-4 items-center hover:bg-slate-50/50 transition-colors group">
                                            {editingRuleId === rule.id ? (
                                                <div className="flex flex-wrap gap-3 w-full">
                                                    <input 
                                                        type="text" 
                                                        value={tempRule.name} 
                                                        onChange={e => setTempRule({...tempRule, name: e.target.value})}
                                                        placeholder="Ex: Plantão 12h"
                                                        className="flex-1 min-w-[150px] h-10 px-3 bg-white border border-indigo-300 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    <select 
                                                        value={tempRule.hospital} 
                                                        onChange={e => setTempRule({...tempRule, hospital: e.target.value})}
                                                        className="w-[180px] h-10 px-3 bg-white border border-indigo-300 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                                    >
                                                        <option value="">Geral (Todos Hospitais)</option>
                                                        {hospitais.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                                                    </select>
                                                    <input 
                                                        type="number" 
                                                        value={tempRule.value} 
                                                        onChange={e => setTempRule({...tempRule, value: e.target.value})}
                                                        placeholder="Valor R$"
                                                        className="w-[100px] h-10 px-3 bg-white border border-indigo-300 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    <div className="flex items-center gap-1.5 ml-auto">
                                                        <button onClick={handleSaveEditRule} className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-sm"><Check size={16} strokeWidth={3}/></button>
                                                        <button onClick={handleCancelEditRule} className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-colors"><X size={16} strokeWidth={3}/></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-[1fr_150px_100px_60px] gap-4 w-full items-center">
                                                    <div className="flex items-center">
                                                        <div className="font-bold text-slate-700 text-sm">{rule.name}</div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${!rule.hospital ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                                                            {rule.hospital || 'Geral'}
                                                        </span>
                                                    </div>
                                                    <div className="text-center flex items-center justify-center">
                                                        <div className="h-9 w-full flex items-center justify-center bg-white border border-slate-200 rounded-lg text-sm font-black text-slate-700 shadow-sm">
                                                            {rule.value}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleEditRule(rule)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Editar regra"
                                                        >
                                                            <Edit2 size={16} strokeWidth={2.5} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteFinancialRule(rule.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Remover regra"
                                                        >
                                                            <Trash2 size={16} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {financialRules.filter(r => financialRulesFilter === 'all' || r.hospital === financialRulesFilter).length === 0 && (
                                        <div className="p-10 flex flex-col items-center justify-center text-center">
                                            <DollarSign size={24} className="text-slate-200 mb-2" />
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma regra cadastrada</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Nova Regra Form */}
                            <div className="pt-6 border-t border-slate-200/60 shrink-0">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Adicionar Nova Regra</span>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 min-w-[200px]">
                                        <input 
                                            type="text"
                                            placeholder="Nome da Regra (ex: Plantão Feriado)"
                                            value={newRule.name}
                                            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                                            className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="w-[200px]">
                                        <select 
                                            value={newRule.hospital}
                                            onChange={(e) => setNewRule({ ...newRule, hospital: e.target.value })}
                                            className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                                        >
                                            <option value="">Geral (Todos Hospitais)</option>
                                            {hospitais.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-[120px]">
                                        <input 
                                            type="number"
                                            placeholder="Valor (R$)"
                                            value={newRule.value}
                                            onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                                            className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAddFinancialRule}
                                        disabled={!newRule.name || !newRule.value}
                                        className="h-11 px-6 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl text-sm transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay and Drawer corrigido com Z-Index altíssimo */}
            {isDrawerOpen && (
                <>
                    <div 
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[9990] transition-opacity animate-in fade-in duration-300" 
                        onClick={() => setIsDrawerOpen(false)} 
                    />
                    <div className="fixed top-0 right-0 bottom-0 w-80 bg-white z-[9999] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header do Drawer */}
                        <div className="bg-indigo-600 p-6 pb-8 flex flex-col relative text-white">
                            <button 
                                onClick={() => setIsDrawerOpen(false)} 
                                className="absolute top-5 right-5 text-indigo-200 hover:text-white p-1.5 rounded-lg transition-colors"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-200 mb-1">Perfil do Usuário</span>
                            <h2 className="text-xl font-bold tracking-tight text-white">{mockUser.name}</h2>
                            <div className="mt-2 flex">
                                <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-500/50 text-white text-[11px] font-bold uppercase tracking-widest rounded-full">
                                    {mockUser.role === 'Administrador' ? 'ADM' : 'MED'}
                                </span>
                            </div>
                        </div>

                        {/* Conteúdo do Drawer */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 pb-12 space-y-8 custom-scrollbar bg-white">
                            
                            <div className="space-y-3">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Filtro de Escala</span>
                                <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-100">
                                    <button 
                                        onClick={() => setViewMode('all')}
                                        className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewMode === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Ver Todas
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (mockUser.role === 'Médico') {
                                                setViewMode('my_scale');
                                                setSelectedDoctor(mockUser.name);
                                            }
                                        }}
                                        disabled={mockUser.role !== 'Médico'}
                                        className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                                            mockUser.role !== 'Médico' 
                                                ? 'bg-slate-200/50 text-slate-400 opacity-60 cursor-not-allowed' 
                                                : viewMode === 'my_scale' 
                                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                                    : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        Minha Escala
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Visualizações</span>
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => setVisualizationMode('mensal')}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${visualizationMode === 'mensal' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <Grid size={18} className={visualizationMode === 'mensal' ? 'text-indigo-500' : 'text-slate-500'} /> Calendário Mensal
                                    </button>
                                    
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <Building2 size={18} className="text-slate-500 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                        <select 
                                            className="w-full appearance-none bg-transparent hover:bg-slate-50 text-slate-600 font-bold text-sm rounded-xl py-2.5 pl-10 pr-8 focus:outline-none focus:bg-slate-50 focus:text-indigo-600 cursor-pointer transition-all"
                                            value={selectedHospital || ''}
                                            onChange={(e) => setSelectedHospital(e.target.value ? parseInt(e.target.value) : null)}
                                        >
                                            <option value="">Visualização por Hospital (Todos)</option>
                                            {hospitais.map(h => (
                                                <option key={h.id} value={h.id}>{h.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 group-hover:text-indigo-500 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setVisualizationMode('fixa')}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${visualizationMode === 'fixa' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <Settings size={18} className={visualizationMode === 'fixa' ? 'text-indigo-500' : 'text-slate-500'} /> Escala Fixa
                                    </button>
                                </div>
                            </div>
                            
                            <div className="w-full h-px bg-slate-100"></div>

                            <div className="space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Ações Operacionais</span>
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => { setIsFinanceiroModalOpen(true); setIsDrawerOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100/50 transition-all border border-emerald-100/50"
                                    >
                                        <CircleDollarSign size={18} /> Financeiro
                                    </button>
                                    <button 
                                        onClick={() => { setIsFolhaPontoModalOpen(true); setIsDrawerOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/50 transition-all border border-blue-100/50"
                                    >
                                        <FileText size={18} /> Folhas de Ponto
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Administração</span>
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => { setIsMonthModalOpen(true); setIsDrawerOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-blue-700 bg-slate-50 border-2 border-blue-600 transition-all shadow-sm"
                                    >
                                        <CalendarDays size={18} className="text-slate-400" /> Gerenciar Meses
                                    </button>
                                    <button 
                                        onClick={() => { setIsHospitalsModalOpen(true); setIsDrawerOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                                    >
                                        <Building size={18} className="text-slate-400" /> Hospitais
                                    </button>
                                    <button 
                                        onClick={() => { setIsFinancialRulesModalOpen(true); setIsDrawerOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                                    >
                                        <DollarSign size={18} className="text-slate-400" /> Regras Financeiras
                                    </button>
                                    <button 
                                        onClick={() => { setIsHistoryModalOpen(true); setIsDrawerOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                                    >
                                        <Clock size={18} className="text-slate-400" /> Histórico de Mudanças
                                    </button>
                                </div>
                            </div>
                            
                            <div className="w-full h-px bg-slate-100"></div>

                            <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 border border-slate-100 transition-all shadow-sm">
                                <Moon size={18} className="text-indigo-600" /> Modo Escuro
                            </button>

                        </div>
                    </div>
                </>
            )}

            {/* Modal de Histórico */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setIsHistoryModalOpen(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Histórico de Mudanças</h2>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-50 transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        {/* Filters */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Usuário</label>
                                    <input type="text" placeholder="Filtrar por usuário..." className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Ação</label>
                                    <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm cursor-pointer">
                                        <option>Todas as ações</option>
                                        <option>Criou</option>
                                        <option>Editou</option>
                                        <option>Excluiu</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Hospital</label>
                                    <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm cursor-pointer">
                                        <option>Todos os hospitais</option>
                                        {hospitais.map(h => <option key={h.id}>{h.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Médico</label>
                                    <input type="text" placeholder="Buscar médico..." className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Data Início</label>
                                    <input type="date" className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-500 outline-none focus:border-indigo-500 shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Data Fim</label>
                                    <input type="date" className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-500 outline-none focus:border-indigo-500 shadow-sm" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-medium text-slate-500">Mostrando 4 registros</span>
                                <button className="font-bold text-indigo-600 hover:text-indigo-700">Limpar Filtros</button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                            {isLoadingHistory ? (
                                <div className="text-center py-10 text-slate-400 font-bold text-sm uppercase">Carregando histórico...</div>
                            ) : historyLogs.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-bold text-sm uppercase">Nenhum registro encontrado.</div>
                            ) : (
                                historyLogs.map((log) => {
                                    const date = new Date(log.timestamp);
                                    const timeStr = date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                                    
                                    let typeIcon = <Activity size={12} strokeWidth={2.5} />;
                                    let typeLabel = "Ação";
                                    let typeColor = "slate";
                                    
                                    if (log.action.includes('criado') || log.action.includes('salvo')) {
                                        typeIcon = <Plus size={12} strokeWidth={3} />;
                                        typeLabel = "Criou/Salvou";
                                        typeColor = "emerald";
                                    } else if (log.action.includes('removido') || log.action.includes('excluiu')) {
                                        typeIcon = <Trash2 size={12} strokeWidth={2.5} />;
                                        typeLabel = "Removeu";
                                        typeColor = "rose";
                                    } else if (log.action.includes('atualizado')) {
                                        typeIcon = <Edit2 size={12} strokeWidth={2.5} />;
                                        typeLabel = "Editou";
                                        typeColor = "blue";
                                    }

                                    return (
                                        <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-200 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-widest bg-${typeColor}-50 text-${typeColor}-600 px-2 py-1 rounded-md border border-${typeColor}-100`}>
                                                        {typeIcon} {typeLabel}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-700">{log.userName} <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">({log.userEmail})</span></span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-xs font-medium text-slate-400">{timeStr}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2">
                                                IP: <span className="font-normal text-slate-400">{log.ip_address}</span>
                                            </div>
                                            <div>
                                                <span className={`text-xs font-bold text-${typeColor}-600 mb-1 block`}>Detalhes:</span>
                                                <div className={`bg-${typeColor}-50/50 border border-${typeColor}-100/50 rounded-lg p-3 text-xs text-slate-600 font-medium space-y-1`}>
                                                    {log.details}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal do Módulo Financeiro */}
            {isFinanceiroModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setIsFinanceiroModalOpen(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsFinanceiroModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                </button>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                        Módulo Financeiro
                                    </h2>
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 mt-1">
                                        <button className="hover:text-indigo-600 transition-colors"><ChevronLeft size={14} /></button>
                                        {existingMonths.find(m => m.id === activeMonth)?.label || 'Mês Atual'}
                                        <button className="hover:text-indigo-600 transition-colors"><ChevronRight size={14} /></button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Total do Mês</span>
                                    <span className="text-2xl font-black text-emerald-600 tracking-tight">R$ {totalMonthValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="h-10 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-2">
                                    <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                                        CSV
                                    </button>
                                    <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20">
                                        <FileText size={14} strokeWidth={2.5} />
                                        PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 flex flex-col space-y-6">
                            
                            {/* Filters / Resumo Totais */}
                            <div className="flex gap-4">
                                {/* POR HOSPITAL */}
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        <Building2 size={16} className="text-slate-400" />
                                        POR HOSPITAL
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {hospitalTotalsArray.length === 0 ? (
                                            <span className="text-sm text-slate-400 font-medium">Nenhum dado</span>
                                        ) : (
                                            hospitalTotalsArray.map(([hName, val], idx) => (
                                                <div key={idx} className="flex items-center justify-between text-xs font-bold gap-4">
                                                    <span className="text-slate-600 truncate flex-1 min-w-0">{hName}</span>
                                                    <div className="flex items-center gap-3 w-[180px] justify-end shrink-0">
                                                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden flex justify-end">
                                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(val / maxHospitalTotal) * 100}%` }}></div>
                                                        </div>
                                                        <span className="text-slate-800 w-20 text-right">R$ {val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                {/* POR MÉDICO */}
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        <User size={16} className="text-slate-400" />
                                        POR MÉDICO
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {doctorTotalsArray.length === 0 ? (
                                            <span className="text-sm text-slate-400 font-medium">Nenhum dado</span>
                                        ) : (
                                            doctorTotalsArray.map(([dName, val], idx) => (
                                                <div key={idx} className="flex items-center justify-between text-xs font-bold gap-4">
                                                    <span className="text-slate-600 truncate flex-1 min-w-0">{dName}</span>
                                                    <div className="flex items-center gap-3 w-[180px] justify-end shrink-0">
                                                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden flex justify-end">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(val / maxDoctorTotal) * 100}%` }}></div>
                                                        </div>
                                                        <span className="text-slate-800 w-20 text-right">R$ {val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50/80 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                    <div className="col-span-1">Data</div>
                                    <div className="col-span-2">Hospital</div>
                                    <div className="col-span-1 text-center">Entrada</div>
                                    <div className="col-span-1 text-center">Saída</div>
                                    <div className="col-span-1 text-center">Entrada</div>
                                    <div className="col-span-1 text-center">Saída</div>
                                    <div className="col-span-2">Plantão</div>
                                    <div className="col-span-1 text-right">Valor</div>
                                    <div className="col-span-2">Médico (Plantonista)</div>
                                    <div className="col-span-1">OBS</div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {currentMonthVerifiedAssignments.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-10 mt-10">
                                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                                                <Check size={24} className="text-emerald-500" strokeWidth={3} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-500 mb-1">Nenhum plantão verificado encontrado para este mês.</p>
                                            <p className="text-xs font-medium text-slate-400">Marque os plantões como <span className="font-bold text-emerald-600">✓ Verificado</span> na escala para que apareçam aqui.</p>
                                        </div>
                                    ) : (
                                        currentMonthVerifiedAssignments.map((a, i) => {
                                            const val = parseFloat(a.financial?.baseValue || 0) + parseFloat(a.financial?.extraValue || 0);
                                            
                                            let displayDate = a.date;
                                            let displayHospital = a.hospitalName;
                                            
                                            // Fallback para plantões salvos antes da adição de metadados
                                            if (!displayDate || !displayHospital) {
                                                const parts = a.slotId.split('-');
                                                if (parts.length >= 6) {
                                                    const weekId = parts[2];
                                                    const hospitalId = parts[3];
                                                    const dayIndex = parts[5];
                                                    
                                                    if (!displayHospital) {
                                                        const h = hospitais.find(h => h.id.toString() === hospitalId);
                                                        if (h) displayHospital = h.name;
                                                    }
                                                    if (!displayDate) {
                                                        const w = activeWeeks.find(w => w.id === weekId);
                                                        if (w && w.days[parseInt(dayIndex)]) {
                                                            displayDate = w.days[parseInt(dayIndex)].date;
                                                        }
                                                    }
                                                }
                                            }
                                            
                                            const timeParts = a.time ? a.time.split('-').map(t => t.trim()) : [];
                                            const entrada = timeParts[0] || '-';
                                            const saida = timeParts[1] || '-';
                                            
                                            return (
                                                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center text-xs font-bold text-slate-700">
                                                    <div className="col-span-1 text-slate-500">{displayDate || '-'}</div>
                                                    <div className="col-span-2 text-slate-800">{displayHospital || '-'}</div>
                                                    <div className="col-span-1 text-center text-slate-500 font-medium">{entrada}</div>
                                                    <div className="col-span-1 text-center text-slate-500 font-medium">{saida}</div>
                                                    <div className="col-span-1 text-center text-slate-400">-</div>
                                                    <div className="col-span-1 text-center text-slate-400">-</div>
                                                    <div className="col-span-2">
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-[11px] font-bold truncate max-w-full border border-indigo-100/50" title={a.subtitle}>
                                                            {a.subtitle || 'Plantão'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1 text-right text-emerald-600">R$ {val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                                    <div className="col-span-2 flex items-center gap-2">
                                                        <span className="truncate text-slate-600" title={a.doctorName}>{a.doctorName}</span>
                                                    </div>
                                                    <div className="col-span-1 text-slate-400 font-medium truncate" title={a.financial?.observations || ''}>
                                                        {a.financial?.observations || '-'}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Folhas de Ponto */}
            {isFolhaPontoModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setIsFolhaPontoModalOpen(false)}></div>
                    <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsFolhaPontoModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                </button>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                        Folhas de Ponto
                                    </h2>
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 mt-1">
                                        <button className="hover:text-indigo-600 transition-colors"><ChevronLeft size={14} /></button>
                                        {existingMonths.find(m => m.id === activeMonth)?.label || 'Mês Atual'}
                                        <button className="hover:text-indigo-600 transition-colors"><ChevronRight size={14} /></button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Total do Mês</span>
                                    <span className="text-2xl font-black text-indigo-600 tracking-tight">R$ {totalMonthValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="h-10 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => printAllFolhasPdf(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20">
                                        <FileText size={14} strokeWidth={2.5} /> PDF c/ Valor
                                    </button>
                                    <button onClick={() => printAllFolhasPdf(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                                        <FileText size={14} strokeWidth={2.5} /> PDF s/ Valor
                                    </button>
                                    <button onClick={() => {}} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20">
                                        <Download size={14} strokeWidth={2.5} /> ZIP
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-6">
                            
                            {/* Cards */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Hospitais</span>
                                    <span className="text-2xl font-black text-slate-800">{folhaPontoData.hospArray.length}</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-1">Folhas Geradas</span>
                                    <span className="text-2xl font-black text-indigo-600">{folhaPontoData.totalDocs}</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Plantões</span>
                                    <span className="text-2xl font-black text-emerald-600">{folhaPontoData.totalShifts}</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                                    <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1">Valor Total</span>
                                    <span className="text-2xl font-black text-slate-800">R$ {totalMonthValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex items-center gap-4">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filtrar Hospital</span>
                                <select 
                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none"
                                    value={folhaPontoFilter}
                                    onChange={(e) => setFolhaPontoFilter(e.target.value)}
                                >
                                    <option value="all">Todos os Hospitais</option>
                                    {folhaPontoData.hospArray.map((h, i) => (
                                        <option key={i} value={h.name}>{h.name}</option>
                                    ))}
                                </select>
                                <span className="text-xs font-bold text-slate-400 ml-2">{folhaPontoData.totalDocs} folhas • {folhaPontoData.hospArray.length} hospitais</span>
                            </div>

                            {/* List */}
                            <div className="space-y-4 pb-10">
                                {folhaPontoData.hospArray
                                    .filter(h => folhaPontoFilter === 'all' || h.name === folhaPontoFilter)
                                    .map((h, i) => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                                                    <Building size={20} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{h.name}</h3>
                                                    <p className="text-xs font-bold text-slate-500">{h.doctors.length} médico(s) - R$ {h.totalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => printHospitalFolhasPdf(h, true)} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">PDF C/ VALOR</button>
                                                <button onClick={() => printHospitalFolhasPdf(h, false)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">PDF S/ VALOR</button>
                                                <button className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors">EXCEL</button>
                                                <button className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-[11px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors">ZIP</button>
                                            </div>
                                        </div>
                                        
                                        <div className="divide-y divide-slate-100">
                                            {h.doctors.map((doc, idx) => (
                                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                                    <div className="flex items-center gap-4 pl-2">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200">
                                                            {doc.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-slate-700">{doc.name}</h4>
                                                            <p className="text-[11px] font-medium text-slate-400">{doc.shifts.length} plantão(ões) - 12h - R$ {doc.totalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => printFolhaPdf(doc.name, h.name, doc.shifts, true)} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-100 transition-colors" title="Visualizar / Imprimir C/ Valor">
                                                            <Eye size={14} />
                                                        </button>
                                                        <button onClick={() => printFolhaPdf(doc.name, h.name, doc.shifts, false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors" title="Imprimir S/ Valor">
                                                            <FileText size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FAB Notificações */}
            <button className="fixed bottom-6 right-6 z-[8000] w-14 h-14 bg-indigo-600 rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center text-white hover:bg-indigo-700 hover:scale-105 transition-all">
                <Bell size={24} />
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">3</span>
            </button>
        </div>
    );
};

export default Escala;
