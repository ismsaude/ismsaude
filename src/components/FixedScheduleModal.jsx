import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X, Save, Loader2, Calendar, Plus, Trash2, Clock, User, Stethoscope, Printer, Copy, Layers, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { format, parse, addMonths, subMonths, startOfMonth, startOfWeek, endOfMonth, differenceInCalendarWeeks, addDays, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const FixedScheduleModal = ({ isOpen, onClose, rooms = [] }) => {
    const { theme } = useWhiteLabel();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    
    // Monthly states
    const [globalData, setGlobalData] = useState({});
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [scheduleData, setScheduleData] = useState({});
    const [settingsData, setSettingsData] = useState({ especialidades: [], cirurgioes: [] });

    // UI states
    const [editingBlock, setEditingBlock] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // DYNAMIC WEEKS BASED ON SELECTED MONTH
    const monthDateObj = parse(selectedMonth, 'yyyy-MM', new Date());
    const monthStart = startOfMonth(monthDateObj);
    const monthEnd = endOfMonth(monthDateObj);
    const numWeeks = differenceInCalendarWeeks(monthEnd, monthStart, { weekStartsOn: 1 }) + 1;
    const WEEKS = Array.from({ length: numWeeks }, (_, i) => i + 1);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });

    const getDateForCell = (weekNum, dayId) => {
        const weekIndex = weekNum - 1;
        const dayOffset = dayId === 0 ? 6 : dayId - 1; 
        return addDays(gridStart, weekIndex * 7 + dayOffset);
    };
    const DAYS = [
        { id: 1, label: 'Segunda', short: 'Seg' },
        { id: 2, label: 'Terça', short: 'Ter' },
        { id: 3, label: 'Quarta', short: 'Qua' },
        { id: 4, label: 'Quinta', short: 'Qui' },
        { id: 5, label: 'Sexta', short: 'Sex' },
        { id: 6, label: 'Sábado', short: 'Sab' },
        { id: 0, label: 'Domingo', short: 'Dom' }
    ];

    const COLORS = [
        { id: 'blue',  class: 'bg-blue-100 text-blue-800 border-blue-300' },
        { id: 'emerald', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
        { id: 'purple', class: 'bg-purple-100 text-purple-800 border-purple-300' },
        { id: 'amber', class: 'bg-amber-100 text-amber-800 border-amber-300' },
        { id: 'rose', class: 'bg-rose-100 text-rose-800 border-rose-300' },
        { id: 'indigo', class: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
        { id: 'slate', class: 'bg-slate-200 text-slate-800 border-slate-400' }
    ];

    useEffect(() => {
        if (!isOpen) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [fixedRes, genRes] = await Promise.all([
                    supabase.from('settings').select('data').eq('id', 'programacao_fixa').maybeSingle(),
                    supabase.from('settings').select('data').eq('id', 'general').maybeSingle()
                ]);

                if (fixedRes.data && fixedRes.data.data) {
                    const data = fixedRes.data.data;
                    // Auto-migrate legacy format (no year-month wrapper)
                    if (data[1] && (Array.isArray(data[1]["SALA 01"]) || Array.isArray(data[1]["SALA 02"]))) {
                        const dDate = new Date();
                        const curMonth = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
                        setGlobalData({ [curMonth]: data });
                        setScheduleData(data);
                        setSelectedMonth(curMonth);
                    } else {
                        setGlobalData(data);
                        setScheduleData(data[selectedMonth] || {});
                    }
                } else {
                    setGlobalData({});
                    setScheduleData({});
                }

                if (genRes.data && genRes.data.data) {
                    setSettingsData({
                        especialidades: genRes.data.data.especialidades || [],
                        cirurgioes: genRes.data.data.cirurgioes || []
                    });
                }
            } catch (err) {
                toast.error("Erro ao carregar programação fixa.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isOpen]);

    const persistToDatabase = async (dataToSave) => {
        setSaving(true);
        try {
            const { error } = await supabase.from('settings').upsert({ id: 'programacao_fixa', data: dataToSave });
            if (error) throw error;
            // toast.success("Salvo com sucesso!", { icon: "✅" }); -> não piscar toast o tempo todo pra n encher o saco
        } catch (error) {
            toast.error("Erro no auto-save da grade.");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleMonthChange = (e) => {
        const newMonth = e.target.value;
        setSelectedMonth(newMonth);
        setScheduleData(globalData[newMonth] || {});
    };

    const handlePrevMonth = () => {
        const d = parse(selectedMonth, 'yyyy-MM', new Date());
        const pd = subMonths(d, 1);
        const newM = format(pd, 'yyyy-MM');
        setSelectedMonth(newM);
        setScheduleData(globalData[newM] || {});
    };

    const handleNextMonth = () => {
        const d = parse(selectedMonth, 'yyyy-MM', new Date());
        const nd = addMonths(d, 1);
        const newM = format(nd, 'yyyy-MM');
        setSelectedMonth(newM);
        setScheduleData(globalData[newM] || {});
    };

    const handleReplicateToNextMonth = () => {
        if (!scheduleData || Object.keys(scheduleData).length === 0) {
            return toast.error("A grade deste mês está vazia! Crie blocos antes de replicar.");
        }
        const [yearStr, monthStr] = selectedMonth.split('-');
        let nextYear = parseInt(yearStr);
        let nextMonth = parseInt(monthStr) + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }
        const nextMonthKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
        
        const newMonthData = {};
        Object.keys(scheduleData).forEach(week => {
            newMonthData[week] = {};
            Object.keys(scheduleData[week]).forEach(room => {
                newMonthData[week][room] = scheduleData[week][room].map(b => ({
                    ...b,
                    id: Date.now() + Math.random().toString(36).substring(2, 9)
                }));
            });
        });

        setGlobalData(prev => {
            const updated = { ...prev, [nextMonthKey]: newMonthData };
            persistToDatabase(updated);
            return updated;
        });
        
        toast.success(`Copiado para ${format(parse(nextMonthKey, 'yyyy-MM', new Date()), 'MMM yyyy', {locale: ptBR}).toUpperCase()}!`, { icon: '✨' });
    };

    const handleClearMonth = () => {
        if (!scheduleData || Object.keys(scheduleData).length === 0) {
            return toast.error("A grade deste mês já está vazia.");
        }
        
        if (window.confirm(`ATENÇÃO: Você está prestes a apagar TODOS os blocos cirúrgicos de ${format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM/yyyy', {locale: ptBR}).toUpperCase()}. Tem certeza que deseja esvaziar a grade deste mês?`)) {
            setScheduleData({});
            setGlobalData(prevGlobal => {
                const updated = { ...prevGlobal };
                delete updated[selectedMonth];
                persistToDatabase(updated);
                return updated;
            });
            toast.success("Mês limpo com sucesso!");
        }
    };

    const handleAddBlockClick = (week, dayId, room) => {
        setEditingBlock({
            id: crypto.randomUUID(),
            week: week,
            room: room,
            dayOfWeek: dayId,
            startHour: '07:00',
            endHour: '12:00',
            medico: '',
            especialidade: '',
            color: 'blue',
            observacoes: ''
        });
        setShowEditModal(true);
    };

    const handleBlockEditClick = (block, week, room) => {
        setEditingBlock({ ...block, week, room });
        setShowEditModal(true);
    };

    const saveBlock = (e) => {
        e.preventDefault();
        if (!editingBlock.startHour || !editingBlock.endHour) return toast.error("Preencha horários de inicio e fim!");
        if (!editingBlock.especialidade) return toast.error("A especialidade é obrigatória.");

        const { week, room, ...blockData } = editingBlock;

        setScheduleData(prev => {
            const newData = { ...prev };
            if (!newData[week]) newData[week] = {};
            if (!newData[week][room]) newData[week][room] = [];
            
            const roomList = [...newData[week][room]];
            const existingIdx = roomList.findIndex(b => b.id === blockData.id);
            
            if (existingIdx >= 0) {
                roomList[existingIdx] = blockData;
            } else {
                roomList.push(blockData);
            }
            
            // Ordenar por horário de início
            roomList.sort((a, b) => a.startHour.localeCompare(b.startHour));

            // Modify newData and sync to globalData
            newData[week][room] = roomList;
            setGlobalData(prevGlobal => {
                const updated = { ...prevGlobal, [selectedMonth]: newData };
                persistToDatabase(updated);
                return updated;
            });
            return newData;
        });

        setShowEditModal(false);
        setEditingBlock(null);
    };

    const replicateBlock = () => {
        if (!editingBlock.startHour || !editingBlock.endHour) return toast.error("Preencha horários de inicio e fim!");
        if (!editingBlock.especialidade) return toast.error("A especialidade é obrigatória.");

        const { week: currentWeek, room, ...blockData } = editingBlock;

        setScheduleData(prev => {
            const newData = { ...prev };
            
            WEEKS.forEach(targetWeek => {
                // Ignore the current week because saveBlock handles it.
                if (targetWeek === currentWeek) return;
                
                if (!newData[targetWeek]) newData[targetWeek] = {};
                if (!newData[targetWeek][room]) newData[targetWeek][room] = [];
                
                const roomList = [...newData[targetWeek][room]];
                
                // We create a fresh new ID for the copies to avoid React key collisions
                const replicatedBlock = {
                    ...blockData,
                    id: Date.now() + Math.random().toString(36).substring(2, 9)
                };
                
                roomList.push(replicatedBlock);
                roomList.sort((a, b) => a.startHour.localeCompare(b.startHour));
                
                newData[targetWeek][room] = roomList;
            });
            
            setGlobalData(prevGlobal => {
                const updated = { ...prevGlobal, [selectedMonth]: newData };
                persistToDatabase(updated);
                return updated;
            });
            return newData;
        });

        toast.success("Replicado para as demais semanas!");
        
        // Finalize by saving the block to its own week and closing
        saveBlock({ preventDefault: () => {} });
    };

    const deleteBlock = () => {
        const { week, room, id } = editingBlock;
        setScheduleData(prev => {
            const newData = { ...prev };
            if (newData[week] && newData[week][room]) {
                newData[week][room] = newData[week][room].filter(b => b.id !== id);
            }
            setGlobalData(prevGlobal => {
                const updated = { ...prevGlobal, [selectedMonth]: newData };
                persistToDatabase(updated);
                return updated;
            });
            return newData;
        });
        setShowEditModal(false);
        setEditingBlock(null);
    };

    const getBlocks = (week, room, dayId) => {
        const list = scheduleData?.[week]?.[room] || [];
        return list.filter(b => b.dayOfWeek === dayId);
    };

    const handleExportPdf = async () => {
        const input = document.getElementById('fixed-schedule-print-area');
        if (!input) return toast.error("Área de impressão não encontrada.");

        setIsPrinting(true);
        const toastId = toast.loading("Gerando arquivo PDF...");

        try {
            await new Promise(resolve => setTimeout(resolve, 300));

            const imgData = await toJpeg(input, {
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
            });

            const pdf = new jsPDF('l', 'mm', 'a3'); // A3 for a massive grid
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(imgData);
            const imgRatio = imgProps.width / imgProps.height;
            const pdfRatio = pdfWidth / pdfHeight;

            let finalWidth = pdfWidth;
            let finalHeight = pdfHeight;

            if (imgRatio > pdfRatio) {
                finalHeight = pdfWidth / imgRatio;
            } else {
                finalWidth = pdfHeight * imgRatio;
            }

            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
            pdf.save(`Grade_Fixa_Padrao.pdf`);
            toast.success("PDF gerado com sucesso!", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Erro ao gerar PDF", { id: toastId });
        } finally {
            setIsPrinting(false);
        }
    };

    const renderGrid = (isPrint = false) => (
        <div className={`bg-white border-slate-200 flex flex-col min-w-max overflow-hidden ${isPrint ? 'border' : 'bg-white/80 backdrop-blur-lg rounded-[1.5rem] shadow-sm border min-h-full'}`}>
            
            {/* Header dos Dias da Semana */}
            <div className={`flex border-b-2 border-slate-300 bg-slate-50 shrink-0 ${isPrint ? '' : 'sticky top-0 z-30 shadow-sm'}`}>
                <div className={`shrink-0 border-r border-slate-300 flex items-center justify-center bg-slate-100 ${isPrint ? 'w-10' : 'w-16'}`} />
                {DAYS.map(day => (
                    <div key={`head-${day.id}`} className={`flex-1 flex flex-col border-r border-slate-200 last:border-0 ${isPrint ? 'min-w-[150px]' : 'min-w-[300px]'}`}>
                        <div className={`flex items-center justify-center border-b border-slate-200 ${isPrint ? 'py-1' : 'py-2.5'}`}>
                            <span className={`${isPrint ? 'text-[9px]' : 'text-xs'} font-black uppercase tracking-widest text-slate-700`}>{day.label}</span>
                        </div>
                        <div className="flex">
                            {rooms.map((room, idx) => (
                                <div key={`h-${day.id}-${room}`} className={`flex-1 flex items-center justify-center bg-slate-100 ${isPrint ? 'py-0.5' : 'py-1.5'} ${idx !== rooms.length - 1 ? 'border-r border-slate-200' : ''}`}>
                                    <span className={`${isPrint ? 'text-[7px]' : 'text-[9px]'} font-black tracking-tight text-slate-500 truncate`}>SALA {room}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Linhas das Semanas */}
            {WEEKS.map((week, wIdx) => (
                <div key={`week-${week}`} className={`flex flex-1 hover:bg-blue-50/30 transition-colors ${wIdx !== WEEKS.length - 1 ? 'border-b border-slate-200' : ''}`}>
                    
                    {/* Título da Semana (Coluna Lateral) */}
                    <div className={`shrink-0 border-r border-slate-200 flex flex-col items-center justify-center bg-slate-50 ${isPrint ? 'w-10 py-1' : 'w-16 py-4'}`}>
                        <span className={`${isPrint ? 'text-[8px]' : 'text-[10px]'} font-black uppercase text-slate-400 tracking-widest rotate-180`} style={{ writingMode: 'vertical-rl' }}>Semana {week}</span>
                    </div>

                    {/* Células dos Dias */}
                    {DAYS.map(day => {
                        const cellDate = getDateForCell(week, day.id);
                        const isCurrentMonth = isSameMonth(cellDate, monthDateObj);
                        
                        return (
                            <div key={`cell-${week}-${day.id}`} className={`flex-1 flex flex-col border-r border-slate-100 last:border-0 ${isPrint ? 'min-w-[150px] p-0.5 gap-0.5' : 'min-w-[300px] p-1.5 gap-1.5'} ${!isCurrentMonth ? 'bg-slate-50 opacity-50' : 'bg-white'}`}>
                                
                                {/* DATA DO DIA */}
                                <div className={`w-full text-center ${isPrint ? 'text-[7px] pb-0.5' : 'text-[10px] pb-1'} font-black uppercase tracking-wider ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-400'}`}>
                                    {format(cellDate, "dd 'de' MMM", { locale: ptBR })}
                                </div>
                                
                                <div className={`flex w-full flex-1 ${isPrint ? 'gap-0.5' : 'gap-1.5'}`}>
                                    {/* Célula das Salas Lado a Lado */}
                                    {rooms.map((room, rIdx) => {
                                        const blocks = getBlocks(week, room, day.id);
                                        return (
                                            <div key={`cell-r-${room}`} className={`flex-1 flex flex-col min-w-0 bg-slate-50/50 border border-slate-100/60 overflow-hidden group hover:border-blue-200 transition-colors ${isPrint ? 'rounded-sm' : 'rounded-lg'}`}>
                                        <div className={`flex-1 flex flex-col overflow-y-auto ${isPrint ? 'p-0.5 gap-0.5' : 'p-1 gap-1'}`}>
                                            {blocks.map(block => {
                                                const colorTheme = COLORS.find(c => c.id === block.color) || COLORS[0];
                                                return (
                                                    <div 
                                                        key={block.id}
                                                        onClick={() => !isPrint && handleBlockEditClick(block, week, room)}
                                                        className={`w-full rounded border ${!isPrint ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} relative ${colorTheme.class} ${isPrint ? 'p-1' : 'p-1.5'}`}
                                                    >
                                                        <div className={`${isPrint ? 'text-[7px] mb-0' : 'text-[9px] mb-0.5'} font-black tracking-tight opacity-80 flex items-center justify-between`}>
                                                            <span>{block.startHour} - {block.endHour}</span>
                                                        </div>
                                                        <div className={`${isPrint ? 'text-[8px]' : 'text-[10px]'} font-black uppercase leading-tight line-clamp-2`}>
                                                            {block.especialidade}
                                                        </div>
                                                        {block.medico && (
                                                            <div className={`${isPrint ? 'text-[6px]' : 'text-[8px]'} font-bold mt-0.5 uppercase truncate opacity-80 flex items-center gap-1`}>
                                                                <User size={10} /> {block.medico}
                                                            </div>
                                                        )}
                                                        {block.observacoes && (
                                                            <div className={`${isPrint ? 'text-[6px] border-black/5 mt-0.5 pt-0.5' : 'text-[8px] border-black/10 mt-1 pt-1'} font-semibold uppercase italic opacity-75 line-clamp-2 leading-tight border-t`}>
                                                                Obs: {block.observacoes}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Botão de Adicionar Bloco */}
                                            {!isPrint && isCurrentMonth && (
                                                <button 
                                                    onClick={() => handleAddBlockClick(week, day.id, room)}
                                                    className="w-full flex items-center justify-center py-2 rounded border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors mt-auto opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}

        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm print:hidden">
            <div className="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl w-full max-w-[95vw] h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm border border-blue-200/50">
                            <Calendar size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Grade Padrão <span className="text-slate-500 font-bold">- Centro Cirúrgico</span></h2>
                            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Todas as salas e semanas lado a lado</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                        <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm shrink-0">
                            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><ChevronLeft size={16} strokeWidth={3} /></button>
                            <div className="px-3 flex flex-col items-center justify-center min-w-[140px] relative group cursor-pointer">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest leading-none mt-1">{format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM', { locale: ptBR })}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{format(parse(selectedMonth, 'yyyy-MM', new Date()), 'yyyy', { locale: ptBR })}</span>
                                <input type="month" value={selectedMonth} onChange={handleMonthChange} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                            </div>
                            <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><ChevronRight size={16} strokeWidth={3} /></button>
                        </div>
                        
                        <div className="h-6 w-px bg-slate-200 shrink-0"></div>

                        <button onClick={handleReplicateToNextMonth} disabled={loading} className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all shrink-0">
                            <Copy size={16} /> <span className="hidden sm:inline">Replicar P/ Próx. Mês</span> <span className="sm:hidden">Copiar</span>
                        </button>

                        <button onClick={handleClearMonth} disabled={loading} className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all shrink-0">
                            <Trash2 size={16} /> <span className="hidden sm:inline">Limpar Mês</span> <span className="sm:hidden">Limpar</span>
                        </button>
                        
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl border border-emerald-100/50 shrink-0">
                            {saving ? (
                                <><Loader2 size={14} className="animate-spin" /> <span className="text-[10px] font-bold uppercase tracking-widest">Salvando...</span></>
                            ) : (
                                <><CheckCircle2 size={14} /> <span className="text-[10px] font-bold uppercase tracking-widest">Salvo Auto</span></>
                            )}
                        </div>

                        <button onClick={handleExportPdf} disabled={isPrinting || loading} className="p-2.5 sm:px-5 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 shrink-0">
                            {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                            <span className="hidden sm:inline">Exportar PDF</span>
                        </button>
                        <button onClick={onClose} className="p-2.5 sm:p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/50 text-slate-400 shrink-0"><X size={18} /></button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white">
                            <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                            <p className="font-bold text-sm uppercase tracking-widest">Carregando Matriz...</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto bg-slate-100/50 custom-scrollbar p-3">
                            {renderGrid(false)}
                        </div>
                    )}
                </div>
            </div>

            {/* INVISIBLE PRINT AREA FOR PDF EXPORT */}
            <div style={{ position: 'absolute', top: '-20000px', left: '-20000px', width: '2200px', backgroundColor: '#ffffff', opacity: 0 }} className="print:hidden pointer-events-none">
                <div id="fixed-schedule-print-area" className="flex flex-col bg-white p-6" style={{ width: '2200px', height: '1400px', backgroundColor: '#ffffff' }}>
                    <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
                        <div className="flex items-center gap-4">
                            {theme?.logoUrl && <img src={theme.logoUrl} alt="Logo" className="h-12 object-contain" />}
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Grade Padrão - Centro Cirúrgico</h1>
                                <p className="text-sm font-bold text-slate-500 uppercase">Mapa de Escala Cirúrgica Fixa</p>
                            </div>
                        </div>
                    </div>
                    {renderGrid(true)}
                </div>
            </div>

            {/* Modal de Edição de Bloco */}
            {showEditModal && editingBlock && (
                <div className="fixed top-16 inset-x-0 bottom-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden animate-in fade-in duration-200">
                    <form onSubmit={saveBlock} className="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase text-lg tracking-tighter leading-none">Bloco Fixo</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                        Semana {editingBlock.week} • Sala {editingBlock.room}
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-rose-500 bg-white p-2 rounded-full shadow-sm hover:shadow transition-all border border-slate-100"><X size={18} /></button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Início</label>
                                    <input type="time" required value={editingBlock.startHour} onChange={e => setEditingBlock({...editingBlock, startHour: e.target.value})} className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Fim</label>
                                    <input type="time" required value={editingBlock.endHour} onChange={e => setEditingBlock({...editingBlock, endHour: e.target.value})} className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">Especialidade / Serviço</label>
                                {settingsData.especialidades.length > 0 ? (
                                    <select required value={editingBlock.especialidade} onChange={e => setEditingBlock({...editingBlock, especialidade: e.target.value})} className="w-full text-xs font-bold uppercase p-2 border border-emerald-200 bg-emerald-50 rounded-lg outline-none">
                                        <option value="">SELECIONE...</option>
                                        {settingsData.especialidades.map((esp, idx) => {
                                            const nomeEsp = typeof esp === 'object' ? esp.nome || esp.especialidade || esp.name : esp;
                                            const idEsp = typeof esp === 'object' ? esp.id || String(idx) : String(esp);
                                            return <option key={`esp-${idEsp}`} value={String(nomeEsp).toUpperCase()}>{String(nomeEsp).toUpperCase()}</option>
                                        })}
                                    </select>
                                ) : (
                                    <input type="text" required value={editingBlock.especialidade} onChange={e => setEditingBlock({...editingBlock, especialidade: e.target.value})} placeholder="Ex: UROLOGIA" className="w-full text-xs font-bold uppercase p-2 border border-emerald-200 bg-emerald-50 rounded-lg outline-none" />
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 block mb-1">Médico Titular (Opcional)</label>
                                {settingsData.cirurgioes.length > 0 ? (
                                    <select value={editingBlock.medico} onChange={e => setEditingBlock({...editingBlock, medico: e.target.value})} className="w-full text-xs font-bold uppercase p-2 border border-blue-200 bg-blue-50 rounded-lg outline-none">
                                        <option value="">A DEFINIR / ROTATIVO...</option>
                                        {settingsData.cirurgioes.map((doc, idx) => {
                                            const nomeDoc = typeof doc === 'object' ? doc.nome || doc.cirurgiao || doc.name : doc;
                                            const idDoc = typeof doc === 'object' ? doc.id || String(idx) : String(doc);
                                            return <option key={`doc-${idDoc}`} value={String(nomeDoc).toUpperCase()}>{String(nomeDoc).toUpperCase()}</option>
                                        })}
                                    </select>
                                ) : (
                                    <input type="text" value={editingBlock.medico} onChange={e => setEditingBlock({...editingBlock, medico: e.target.value})} placeholder="Ex: Dr. Fulano" className="w-full text-xs font-bold uppercase p-2 border border-blue-200 bg-blue-50 rounded-lg outline-none" />
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Observações (Opcional)</label>
                                <textarea 
                                    value={editingBlock.observacoes || ''} 
                                    onChange={e => setEditingBlock({...editingBlock, observacoes: e.target.value})} 
                                    placeholder="Detalhes ou restrições..." 
                                    className="w-full text-xs font-bold uppercase p-2 border border-slate-200 bg-white rounded-lg outline-none min-h-[60px] resize-none" 
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Cor do Bloco</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setEditingBlock({...editingBlock, color: c.id})}
                                            className={`w-7 h-7 rounded-full shadow-sm border-2 transition-all ${editingBlock.color === c.id ? `scale-110 border-slate-800` : 'border-transparent'} ${c.class.split(' ')[0]}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 gap-2">
                            {editingBlock.id && scheduleData[editingBlock.week] && scheduleData[editingBlock.week][editingBlock.room] && scheduleData[editingBlock.week][editingBlock.room].some(b => b.id === editingBlock.id) ? (
                                <button type="button" onClick={deleteBlock} className="p-2.5 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1 text-[10px] font-bold uppercase">
                                    <Trash2 size={16} /> Excluir
                                </button>
                            ) : (
                                <div />
                            )}
                            <div className="flex gap-2">
                                <button type="button" onClick={replicateBlock} className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors flex items-center gap-2 text-[9px] font-black uppercase">
                                    <Layers size={14} /> Replicar Mensal
                                </button>
                                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2 text-[10px] font-bold uppercase shadow-sm shadow-blue-500/20">
                                    <Save size={16} /> Salvar Neste Dia
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
