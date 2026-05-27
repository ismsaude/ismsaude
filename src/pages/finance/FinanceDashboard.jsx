import React, { useState, useEffect, useMemo } from 'react';
import { financeService } from '../../services/financeService';
import { supabase } from '../../services/supabase';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, LayoutGrid, 
  Eye, EyeOff, Loader2, Calendar, FileText, ArrowRightLeft, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Período de data padrão: mês atual
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  });

  // Configurações de Customização dos Widgets (salvas no localStorage)
  const [widgetSettings, setWidgetSettings] = useState(() => {
    const saved = localStorage.getItem('sisgesp_finance_widgets');
    return saved ? JSON.parse(saved) : {
      chartCompare: true,
      chartAccounts: true,
      chartDoctors: true,
      chartConvenios: true,
      drePanel: true
    };
  });

  const [showWidgetConfig, setShowWidgetConfig] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [txs, accs, cats] = await Promise.all([
        financeService.getTransactions({
          startDate: dateRange.start,
          endDate: dateRange.end
        }),
        financeService.getAccounts(),
        financeService.getCategories()
      ]);
      setTransactions(txs || []);
      setAccounts(accs || []);
      setCategories(cats || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = (widgetKey) => {
    const updated = { ...widgetSettings, [widgetKey]: !widgetSettings[widgetKey] };
    setWidgetSettings(updated);
    localStorage.setItem('sisgesp_finance_widgets', JSON.stringify(updated));
  };

  // --- CÁLCULO DE KPIs FINANCEIROS ---
  const kpis = useMemo(() => {
    let realizedInflows = 0;
    let realizedOutflows = 0;
    let pendingInflows = 0;
    let pendingOutflows = 0;

    transactions.forEach(t => {
      const amount = parseFloat(t.amount);
      const isRealized = t.status === 'PAGO';

      if (t.type === 'ENTRADA') {
        if (isRealized) realizedInflows += amount;
        else pendingInflows += amount;
      } else {
        if (isRealized) realizedOutflows += amount;
        else pendingOutflows += amount;
      }
    });

    return {
      inflows: realizedInflows,
      outflows: realizedOutflows,
      net: realizedInflows - realizedOutflows,
      pending: pendingInflows // inadimplência projetada / faturamento suspenso
    };
  }, [transactions]);

  // --- DADOS PARA OS GRÁFICOS ---
  const chartsData = useMemo(() => {
    // 1. Receitas vs Despesas Comparativas (Agrupadas por data)
    const compareMap = {};
    transactions.forEach(t => {
      const dateLabel = new Date(t.transaction_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!compareMap[dateLabel]) {
        compareMap[dateLabel] = { date: dateLabel, Receitas: 0, Despesas: 0 };
      }
      if (t.type === 'ENTRADA') compareMap[dateLabel].Receitas += parseFloat(t.amount);
      else compareMap[dateLabel].Despesas += parseFloat(t.amount);
    });
    const compareData = Object.values(compareMap).slice(-15); // últimas 15 datas

    // 2. Divisão de Contas
    const accountsData = accounts.map(a => ({
      name: a.name,
      value: parseFloat(a.current_balance)
    })).filter(a => a.value > 0);

    // 3. Faturamento por Médico
    const doctorMap = {};
    transactions.forEach(t => {
      if (t.type === 'ENTRADA' && t.users?.name) {
        doctorMap[t.users.name] = (doctorMap[t.users.name] || 0) + parseFloat(t.amount);
      }
    });
    const doctorsData = Object.entries(doctorMap).map(([name, value]) => ({
      name: name.split(' ')[0] + ' ' + (name.split(' ')[1] || ''),
      value
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // 4. Distribuição de Receitas por Convênio
    const convenioMap = {};
    transactions.forEach(t => {
      // Tenta classificar o convênio
      if (t.type === 'ENTRADA') {
        const key = t.surgery_id ? 'CIRURGIAS SUS/CONVÊNIO' : 'PLANTÕES / OUTROS';
        convenioMap[key] = (convenioMap[key] || 0) + parseFloat(t.amount);
      }
    });
    const conveniosData = Object.entries(convenioMap).map(([name, value]) => ({ name, value }));

    return {
      compareData,
      accountsData,
      doctorsData,
      conveniosData
    };
  }, [transactions, accounts]);

  // --- ESTRUTURAÇÃO DO DRE INTELIGENTE ---
  const dre = useMemo(() => {
    const categoriesMap = {};
    
    // Inicializa categorias conhecidas
    categories.forEach(c => {
      categoriesMap[c.id] = {
        name: c.name,
        type: c.type,
        parent_id: c.parent_id,
        amount: 0
      };
    });

    // Lança valores
    transactions.forEach(t => {
      if (t.status === 'PAGO' && t.category_id && categoriesMap[t.category_id]) {
        categoriesMap[t.category_id].amount += parseFloat(t.amount);
      }
    });

    const categoriesArray = Object.values(categoriesMap);

    // Receita Bruta (Soma de todas as categorias de entrada)
    const grossRevenues = categoriesArray
      .filter(c => c.type === 'ENTRADA' && !c.parent_id)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Repasses e Deduções Diretas
    // (Por padrão assumimos a categoria "Repasses a Médicos" id: '20000000-0000-0000-0000-000000000001')
    const deductions = categoriesMap['20000000-0000-0000-0000-000000000001']?.amount || 0;

    // Receita Líquida
    const netRevenues = grossRevenues - deductions;

    // Outras Despesas Operacionais (Despesas que não sejam repasses diretos)
    const operatingExpenses = categoriesArray
      .filter(c => c.type === 'SAIDA' && c.parent_id !== '20000000-0000-0000-0000-000000000001' && c.parent_id !== null && c.parent_id !== '')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Total Despesas
    const totalExpenses = categoriesArray
      .filter(c => c.type === 'SAIDA' && c.name !== 'Repasses a Médicos')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Resultado Líquido (EBITDA / Lucro Gerencial)
    const netProfit = netRevenues - totalExpenses;

    return {
      grossRevenues,
      deductions,
      netRevenues,
      operatingExpenses: totalExpenses,
      netProfit,
      breakdown: categoriesArray.filter(c => c.amount > 0)
    };
  }, [transactions, categories]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444'];

  const baseInputStyle = "h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer";

  return (
    <div className="px-4 sm:px-6 pr-8 py-6 min-h-full bg-slate-50/50 font-sans text-slate-900">
      
      {/* Header Premium */}
      <div className="mb-6 border-b border-slate-200/60 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={24} /> 
            Cockpit e Business Intelligence
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Indicadores chave de saúde financeira e faturamento PJ</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Data Filter */}
          <div className="flex items-center gap-1.5 px-2 bg-white border border-slate-200 rounded-xl h-10 shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })} 
              className="bg-transparent text-[10px] font-bold text-slate-700 outline-none w-24 cursor-pointer"
            />
            <span className="text-[9px] text-slate-400 font-bold uppercase">até</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })} 
              className="bg-transparent text-[10px] font-bold text-slate-700 outline-none w-24 cursor-pointer"
            />
          </div>

          {/* Configuração de Layout */}
          <button
            onClick={() => setShowWidgetConfig(!showWidgetConfig)}
            className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase shadow-sm flex items-center gap-2 transition-all"
          >
            <LayoutGrid size={16} /> Layout
          </button>
        </div>
      </div>

      {/* Ribbon Configuração Widgets */}
      {showWidgetConfig && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-md animate-in slide-in-from-top-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Habilitar / Desabilitar Widgets</span>
          <div className="flex flex-wrap gap-3">
            {Object.keys(widgetSettings).map(k => (
              <button
                key={k}
                onClick={() => toggleWidget(k)}
                className={`h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border transition-all ${widgetSettings[k] ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                {widgetSettings[k] ? <Eye size={12} /> : <EyeOff size={12} />}
                {k === 'chartCompare' ? 'Receita x Despesa' : k === 'chartAccounts' ? 'Saldo por Contas' : k === 'chartDoctors' ? 'Médicos Destaque' : k === 'chartConvenios' ? 'Origens Faturamento' : 'Tabela DRE Gerencial'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Indicadores de KPIs Financeiros */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={36} className="text-indigo-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Entradas (Receitas)</span>
                <p className="text-xl font-black text-emerald-950 mt-1">R$ {kpis.inflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <TrendingUp size={24} className="text-emerald-600" />
            </div>

            <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-600">Saídas (Despesas)</span>
                <p className="text-xl font-black text-rose-950 mt-1">R$ {kpis.outflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <TrendingDown size={24} className="text-rose-600" />
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Saldo Operacional</span>
                <p className="text-xl font-black text-indigo-950 mt-1">R$ {kpis.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign size={24} className="text-indigo-600" />
            </div>

            <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-600">Valores Pendentes</span>
                <p className="text-xl font-black text-amber-950 mt-1">R$ {kpis.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <AlertCircle size={24} className="text-amber-600" />
            </div>
          </div>

          {/* Seção Grid Dinâmico de Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            
            {/* Comparativo de Receitas x Despesas */}
            {widgetSettings.chartCompare && (
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col min-h-[300px]">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><TrendingUp size={14} /> Evolução de Receitas vs Despesas</h3>
                <div className="flex-1 w-full min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartsData.compareData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorDes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 700 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900 }} />
                      <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRec)" />
                      <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDes)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Balanço de Contas */}
            {widgetSettings.chartAccounts && (
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col min-h-[300px]">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><ArrowRightLeft size={14} /> Distribuição de Saldos</h3>
                <div className="flex-1 w-full min-h-[180px] relative">
                  {chartsData.accountsData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">Sem saldo nas contas</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartsData.accountsData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                          {chartsData.accountsData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* Destaque Médico */}
            {widgetSettings.chartDoctors && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col min-h-[300px]">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Percent size={14} /> Faturamento por Médico (Top 5)</h3>
                <div className="flex-1 w-full min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.doctorsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 700 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Origens de Faturamento (SUS vs Convênio) */}
            {widgetSettings.chartConvenios && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col min-h-[300px]">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><FileText size={14} /> Origens de Faturamento</h3>
                <div className="flex-1 w-full min-h-[200px] relative">
                  {chartsData.conveniosData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">Sem dados de faturamento</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartsData.conveniosData} cx="50%" cy="50%" innerRadius={0} outerRadius={70} paddingAngle={2} dataKey="value">
                          {chartsData.conveniosData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Demonstrativo de Resultados do Exercício (DRE Gerencial) */}
          {widgetSettings.drePanel && (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm animate-in fade-in">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><FileText size={14} /> Demonstrativo de Resultados do Exercício (DRE Gerencial)</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {/* RECEITA BRUTA */}
                    <tr className="border-b border-slate-100 bg-slate-50/50 font-black text-slate-800 text-sm">
                      <td className="py-3.5 px-4 uppercase tracking-wider">(+) RECEITA BRUTA OPERACIONAL</td>
                      <td className="py-3.5 px-4 text-right text-emerald-600">R$ {dre.grossRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    {/* Quebra de Receitas */}
                    {dre.breakdown.filter(c => c.type === 'ENTRADA').map(c => (
                      <tr key={c.name} className="border-b border-slate-100/50 text-xs text-slate-600 font-bold">
                        <td className="py-2.5 px-8">Faturamento ref. {c.name}</td>
                        <td className="py-2.5 px-4 text-right">R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}

                    {/* DEDUCOES (REPASSES) */}
                    <tr className="border-b border-slate-100 bg-slate-50/50 font-black text-slate-800 text-sm">
                      <td className="py-3.5 px-4 uppercase tracking-wider">(-) DEDUÇÕES E REPASSES MÉDICOS</td>
                      <td className="py-3.5 px-4 text-right text-rose-600">- R$ {dre.deductions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    {/* RECEITA LIQUIDA */}
                    <tr className="border-b border-slate-100 bg-indigo-50/30 font-black text-slate-900 text-sm">
                      <td className="py-3.5 px-4 uppercase tracking-wider">(=) RECEITA LÍQUIDA OPERACIONAL</td>
                      <td className="py-3.5 px-4 text-right text-indigo-700">R$ {dre.netRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    {/* DESPESAS OPERACIONAIS */}
                    <tr className="border-b border-slate-100 bg-slate-50/50 font-black text-slate-800 text-sm">
                      <td className="py-3.5 px-4 uppercase tracking-wider">(-) DESPESAS OPERACIONAIS</td>
                      <td className="py-3.5 px-4 text-right text-rose-600">- R$ {dre.operatingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    {/* Quebra de Despesas */}
                    {dre.breakdown.filter(c => c.type === 'SAIDA' && c.name !== 'Repasses a Médicos').map(c => (
                      <tr key={c.name} className="border-b border-slate-100/50 text-xs text-slate-600 font-bold">
                        <td className="py-2.5 px-8">Despesa ref. {c.name}</td>
                        <td className="py-2.5 px-4 text-right">- R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}

                    {/* RESULTADO LIQUIDO */}
                    <tr className="border-b border-slate-150 bg-slate-900 text-white font-black text-base">
                      <td className="py-4 px-4 uppercase tracking-wider rounded-l-2xl">(=) RESULTADO LÍQUIDO DO EXERCÍCIO (LUCRO/PREJUÍZO)</td>
                      <td className={`py-4 px-4 text-right rounded-r-2xl ${dre.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        R$ {dre.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
