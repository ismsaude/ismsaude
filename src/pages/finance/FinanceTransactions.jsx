import React, { useState, useEffect, useMemo } from 'react';
import { financeService } from '../../services/financeService';
import { supabase } from '../../services/supabase';
import { 
  Plus, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, 
  Filter, Search, RefreshCw, Landmark, CreditCard, Loader2, DollarSign,
  TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import TransactionModal from '../../components/finance/TransactionModal';

export default function FinanceTransactions() {
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('extract'); // 'extract' ou 'flow'
  
  // Data States
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Modais
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  
  // Form de Nova Conta
  const [accountForm, setAccountForm] = useState({ name: '', bank_name: '', agency: '', account_number: '', initial_balance: 0 });

  // Filtros de Lançamento
  const [filters, setFilters] = useState({
    accountId: '',
    categoryId: '',
    type: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadInitialData();
  }, [filters]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [accs, cats, txs] = await Promise.all([
        financeService.getAccounts(),
        financeService.getCategories(),
        financeService.getTransactions(filters)
      ]);
      setAccounts(accs || []);
      setCategories(cats || []);
      setTransactions(txs || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return;
    try {
      await financeService.deleteTransaction(id);
      toast.success('Transação excluída com sucesso!');
      loadInitialData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir transação.');
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.name.trim()) return toast.error('Nome da conta é obrigatório');
    try {
      await financeService.createAccount({
        ...accountForm,
        current_balance: accountForm.initial_balance
      });
      toast.success('Conta bancária cadastrada com sucesso!');
      setAccountForm({ name: '', bank_name: '', agency: '', account_number: '', initial_balance: 0 });
      setIsAccountModalOpen(false);
      loadInitialData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar conta.');
    }
  };

  // --- CÁLCULO DE PROJEÇÕES DO FLUXO DE CAIXA ---
  const cashFlowProjection = useMemo(() => {
    // Agrupa transações por mês (YYYY-MM)
    const monthlyData = {};
    const todayStr = new Date().toISOString().split('T')[0];

    // Consulta transações completas sem filtros para projeção fiel do fluxo
    // (Por simplicidade usamos as transações atuais carregadas na tela)
    transactions.forEach(t => {
      const monthKey = t.transaction_date.substring(0, 7); // "YYYY-MM"
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          realizedInflow: 0,
          projectedInflow: 0,
          realizedOutflow: 0,
          projectedOutflow: 0
        };
      }

      const isRealized = t.status === 'PAGO';
      const amount = parseFloat(t.amount);

      if (t.type === 'ENTRADA') {
        if (isRealized) monthlyData[monthKey].realizedInflow += amount;
        else monthlyData[monthKey].projectedInflow += amount;
      } else {
        if (isRealized) monthlyData[monthKey].realizedOutflow += amount;
        else monthlyData[monthKey].projectedOutflow += amount;
      }
    });

    // Converte para array ordenado por mês
    const sortedMonths = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Calcula saldo acumulado projetado
    // Inicialmente assume o saldo total atual de todas as contas
    let cumulativeBalance = accounts.reduce((acc, curr) => acc + parseFloat(curr.current_balance), 0);
    
    // Filtramos apenas os meses futuros para acumular as projeções
    return sortedMonths.map(m => {
      const netMonth = (m.realizedInflow + m.projectedInflow) - (m.realizedOutflow + m.projectedOutflow);
      cumulativeBalance += m.projectedInflow - m.projectedOutflow; // Incrementa apenas o projetado (o realizado já altera o balance atual via trigger)
      
      // Formata a label do mês
      const [year, month] = m.month.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const label = `${monthNames[parseInt(month) - 1]}/${year}`;

      return {
        ...m,
        label,
        net: netMonth,
        accumulated: cumulativeBalance
      };
    });
  }, [transactions, accounts]);

  const totalConsolidatedBalance = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + parseFloat(curr.current_balance), 0);
  }, [accounts]);

  const baseInputStyle = "h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm";

  return (
    <div className="px-4 sm:px-6 pr-8 py-6 min-h-full bg-slate-50/50 font-sans text-slate-900">
      
      {/* Header Premium */}
      <div className="mb-6 border-b border-slate-200/60 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
            <Landmark className="text-indigo-600" size={24} /> 
            Contas e Lançamentos
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Gestão de caixa, conciliação e extrato geral</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus size={16} /> Nova Conta
          </button>
          <button 
            onClick={() => { setSelectedTxId(null); setIsTxModalOpen(true); }}
            className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-indigo-600/10 flex items-center gap-2 transition-all"
          >
            <Plus size={16} /> Lançar Movimentação
          </button>
        </div>
      </div>

      {/* Grid de Contas Bancárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Consolidado */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl border border-transparent shadow-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-10 translate-x-10 blur-lg"></div>
          <div className="flex justify-between items-center z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Consolidado</span>
            <DollarSign size={16} className="text-indigo-400" />
          </div>
          <div className="z-10 mt-4">
            <span className="text-2xl font-black tracking-tight">R$ {totalConsolidatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Soma de todas as contas cadastradas</p>
          </div>
        </div>

        {/* Contas Ativas */}
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white/80 backdrop-blur-md border border-slate-200 p-5 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{acc.bank_name || 'Banco'}</span>
                <h4 className="font-bold text-slate-800 text-xs truncate max-w-[140px] mt-0.5">{acc.name}</h4>
              </div>
              <Landmark size={16} className="text-slate-400" />
            </div>
            <div className="z-10 mt-4">
              <span className="text-xl font-black text-slate-900 tracking-tight">R$ {acc.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Ag: {acc.agency || '-'} | CC: {acc.account_number || '-'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros e Layout de Conteúdo */}
      <div className="bg-white/80 backdrop-blur-lg border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col min-h-[50vh]">
        
        {/* Toggle Modos e Filtros Rápidos */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-slate-100 pb-5">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shadow-inner w-fit">
            <button
              onClick={() => setViewMode('extract')}
              className={`px-5 py-2 text-xs font-black uppercase tracking-wide rounded-xl transition-all ${viewMode === 'extract' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Extrato Geral
            </button>
            <button
              onClick={() => setViewMode('flow')}
              className={`px-5 py-2 text-xs font-black uppercase tracking-wide rounded-xl transition-all ${viewMode === 'flow' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Fluxo de Caixa Projetado
            </button>
          </div>

          {/* Filtros rápidos (Apenas para modo extrato) */}
          {viewMode === 'extract' && (
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={filters.accountId} 
                onChange={e => setFilters({ ...filters, accountId: e.target.value })} 
                className={`${baseInputStyle} cursor-pointer`}
              >
                <option value="">Todas as Contas</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <select 
                value={filters.type} 
                onChange={e => setFilters({ ...filters, type: e.target.value })} 
                className={`${baseInputStyle} cursor-pointer`}
              >
                <option value="">Todos os Tipos</option>
                <option value="ENTRADA">Receitas</option>
                <option value="SAIDA">Despesas</option>
              </select>

              <select 
                value={filters.status} 
                onChange={e => setFilters({ ...filters, status: e.target.value })} 
                className={`${baseInputStyle} cursor-pointer`}
              >
                <option value="">Todos os Status</option>
                <option value="PAGO">Pago / Efetivado</option>
                <option value="PENDENTE">A realizar</option>
              </select>

              <div className="flex items-center gap-1.5 px-2 bg-white border border-slate-200 rounded-lg h-9 shadow-sm">
                <Calendar size={13} className="text-slate-400" />
                <input 
                  type="date" 
                  value={filters.startDate} 
                  onChange={e => setFilters({ ...filters, startDate: e.target.value })} 
                  className="bg-transparent text-[10px] font-bold text-slate-700 outline-none w-24 cursor-pointer"
                />
                <span className="text-[9px] text-slate-400 font-bold uppercase">até</span>
                <input 
                  type="date" 
                  value={filters.endDate} 
                  onChange={e => setFilters({ ...filters, endDate: e.target.value })} 
                  className="bg-transparent text-[10px] font-bold text-slate-700 outline-none w-24 cursor-pointer"
                />
              </div>

              <button 
                onClick={() => setFilters({ accountId: '', categoryId: '', type: '', status: '', startDate: '', endDate: '' })}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-rose-500 text-[10px] font-black uppercase transition-all shadow-sm"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        {/* Listagem de Transações */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 size={36} className="text-indigo-600 animate-spin" />
          </div>
        ) : viewMode === 'extract' ? (
          <div className="flex-1 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Conta</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-slate-400 text-xs font-bold uppercase">Nenhum lançamento financeiro encontrado.</td>
                    </tr>
                  ) : (
                    transactions.map(t => {
                      const amountFormatted = t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/60 transition-colors text-xs font-bold text-slate-700">
                          <td className="py-3.5 px-4 text-slate-400 font-medium">{new Date(t.transaction_date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3.5 px-4 text-slate-800 font-black">
                            {t.description}
                            {t.users?.name && (
                              <span className="block text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">Médico: {t.users.name}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{t.finance_accounts?.name || 'N/A'}</td>
                          <td className="py-3.5 px-4">
                            <span 
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border"
                              style={{ 
                                backgroundColor: t.finance_categories?.color ? t.finance_categories.color + '15' : '#f1f5f9',
                                color: t.finance_categories?.color || '#64748b',
                                borderColor: t.finance_categories?.color ? t.finance_categories.color + '30' : '#cbd5e1'
                              }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.finance_categories?.color || '#64748b' }}></div>
                              {t.finance_categories?.name || 'Geral'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-medium uppercase">{t.payment_method || 'PIX'}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${t.status === 'PAGO' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                              {t.status === 'PAGO' ? <CheckCircle size={10} /> : <Clock size={10} />}
                              {t.status === 'PAGO' ? 'Pago' : 'Pendente'}
                            </span>
                          </td>
                          <td className={`py-3.5 px-4 text-right text-sm font-black ${t.type === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === 'ENTRADA' ? '+' : '-'} R$ {amountFormatted}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => { setSelectedTxId(t.id); setIsTxModalOpen(true); }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Visualização de Fluxo de Caixa */
          <div className="flex-1 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-3 px-4">Mês de Referência</th>
                    <th className="py-3 px-4 text-right text-emerald-600 bg-emerald-50/20">Receitas Realizadas</th>
                    <th className="py-3 px-4 text-right text-emerald-600/70 bg-emerald-50/10">Receitas Projetadas</th>
                    <th className="py-3 px-4 text-right text-rose-600 bg-rose-50/20">Despesas Realizadas</th>
                    <th className="py-3 px-4 text-right text-rose-600/70 bg-rose-50/10">Despesas Projetadas</th>
                    <th className="py-3 px-4 text-right bg-indigo-50/10">Saldo Líquido Mês</th>
                    <th className="py-3 px-4 text-right bg-indigo-50/20">Saldo Acumulado Projetado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cashFlowProjection.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-400 text-xs font-bold uppercase">Nenhum dado projetado para os próximos meses.</td>
                    </tr>
                  ) : (
                    cashFlowProjection.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors text-xs font-bold text-slate-700">
                        <td className="py-4 px-4 text-slate-800 font-black">{m.label}</td>
                        <td className="py-4 px-4 text-right text-emerald-600 font-medium">R$ {m.realizedInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right text-slate-500 font-medium">R$ {m.projectedInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right text-rose-600 font-medium">R$ {m.realizedOutflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right text-slate-500 font-medium">R$ {m.projectedOutflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className={`py-4 px-4 text-right font-black ${m.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          R$ {m.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 text-right text-indigo-700 font-black text-sm bg-indigo-50/10">
                          R$ {m.accumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modal de Transação */}
      <TransactionModal 
        isOpen={isTxModalOpen} 
        onClose={() => { setIsTxModalOpen(false); setSelectedTxId(null); }} 
        onSave={loadInitialData}
        transactionId={selectedTxId}
      />

      {/* Modal de Nova Conta Bancária */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAccountModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">Cadastrar Nova Conta</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Nome Identificador</label>
                <input 
                  type="text" 
                  required
                  value={accountForm.name} 
                  onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} 
                  className={baseInputStyle}
                  placeholder="Ex: Conta Principal Itaú"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Nome do Banco</label>
                <input 
                  type="text" 
                  value={accountForm.bank_name} 
                  onChange={e => setAccountForm({ ...accountForm, bank_name: e.target.value })} 
                  className={baseInputStyle}
                  placeholder="Ex: Itaú Unibanco"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Agência</label>
                  <input 
                    type="text" 
                    value={accountForm.agency} 
                    onChange={e => setAccountForm({ ...accountForm, agency: e.target.value })} 
                    className={baseInputStyle}
                    placeholder="0001"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Número da Conta</label>
                  <input 
                    type="text" 
                    value={accountForm.account_number} 
                    onChange={e => setAccountForm({ ...accountForm, account_number: e.target.value })} 
                    className={baseInputStyle}
                    placeholder="12345-6"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Saldo Inicial (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={accountForm.initial_balance} 
                  onChange={e => setAccountForm({ ...accountForm, initial_balance: parseFloat(e.target.value) || 0 })} 
                  className={baseInputStyle}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAccountModalOpen(false)}
                  className="h-10 px-4 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-xs uppercase"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase transition-all shadow-md"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
