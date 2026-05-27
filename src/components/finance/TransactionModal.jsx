import React, { useState, useEffect } from 'react';
import { financeService } from '../../services/financeService';
import { supabase } from '../../services/supabase';
import { X, Save, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionModal({ isOpen, onClose, onSave, transactionId = null }) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  const [formData, setFormData] = useState({
    account_id: '',
    category_id: '',
    type: 'SAIDA',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    status: 'PENDENTE',
    payment_method: 'PIX',
    doctor_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      const [accs, cats, { data: users }] = await Promise.all([
        financeService.getAccounts(),
        financeService.getCategories(),
        supabase.from('users').select('id, name, role').order('name')
      ]);

      setAccounts(accs || []);
      setCategories(cats || []);
      setDoctors(users?.filter(u => ['Médico', 'Médico Autorizador', 'Administrador'].includes(u.role)) || []);

      if (transactionId) {
        // Modo Edição: carrega a transação existente
        const { data: tx, error } = await supabase
          .from('finance_transactions')
          .select('*')
          .eq('id', transactionId)
          .single();
        
        if (error) throw error;
        if (tx) {
          setFormData({
            account_id: tx.account_id,
            category_id: tx.category_id || '',
            type: tx.type,
            amount: tx.amount.toString(),
            transaction_date: tx.transaction_date,
            description: tx.description,
            status: tx.status,
            payment_method: tx.payment_method || 'PIX',
            doctor_id: tx.doctor_id || ''
          });
        }
      } else {
        // Modo Criação: preenche defaults
        setFormData({
          account_id: accs?.[0]?.id || '',
          category_id: '',
          type: 'SAIDA',
          amount: '',
          transaction_date: new Date().toISOString().split('T')[0],
          description: '',
          status: 'PENDENTE',
          payment_method: 'PIX',
          doctor_id: ''
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dependências do modal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.account_id) return toast.error('Selecione uma conta bancária');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return toast.error('Insira um valor maior que zero');
    if (!formData.description.trim()) return toast.error('A descrição é obrigatória');

    setLoading(false);
    try {
      const payload = {
        account_id: formData.account_id,
        category_id: formData.category_id || null,
        type: formData.type,
        amount: parseFloat(formData.amount),
        transaction_date: formData.transaction_date,
        description: formData.description,
        status: formData.status,
        payment_method: formData.payment_method,
        doctor_id: formData.doctor_id || null
      };

      if (transactionId) {
        await financeService.updateTransaction(transactionId, payload);
        toast.success('Transação atualizada com sucesso!');
      } else {
        await financeService.createTransaction(payload);
        toast.success('Transação cadastrada com sucesso!');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar transação.');
    }
  };

  if (!isOpen) return null;

  const baseInputStyle = "w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm";

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose}></div>
      
      {/* Container do Modal */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -translate-y-10 translate-x-10 blur-xl"></div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">
              {transactionId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
              Fluxo de Caixa ERP
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
          
          {/* Tipo de Transação (Botoes de Inflow/Outflow) */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'SAIDA' })}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${formData.type === 'SAIDA' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowDownLeft size={16} strokeWidth={3} /> Despesa
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'ENTRADA' })}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${formData.type === 'ENTRADA' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowUpRight size={16} strokeWidth={3} /> Receita
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Valor */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className={`${baseInputStyle} text-lg text-slate-900`}
                placeholder="R$ 0,00"
              />
            </div>

            {/* Conta Bancária */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Conta Bancária</label>
              <select
                value={formData.account_id}
                onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                className={`${baseInputStyle} cursor-pointer`}
                required
              >
                <option value="" disabled>Selecione a conta...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} (R$ {acc.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Categoria</label>
              <select
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className={`${baseInputStyle} cursor-pointer`}
              >
                <option value="">Sem Categoria (Lançamento Geral)</option>
                {categories.filter(c => c.type === formData.type).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Data do Lançamento */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Data</label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                className={baseInputStyle}
              />
            </div>

            {/* Método de Pagamento */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Método</label>
              <select
                value={formData.payment_method}
                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                className={`${baseInputStyle} cursor-pointer`}
              >
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="TRANSFERENCIA">TED/DOC/Transf.</option>
                <option value="CARTAO">Cartão de Crédito</option>
                <option value="DINHEIRO">Dinheiro Físico</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            {/* Status (Pago ou Pendente) */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className={`${baseInputStyle} cursor-pointer font-black ${formData.status === 'PAGO' ? 'text-emerald-600' : 'text-amber-500'}`}
              >
                <option value="PENDENTE">A Realizar (Pendente)</option>
                <option value="PAGO">Realizado / Conciliado</option>
              </select>
            </div>

            {/* Vínculo com Médico */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Médico Associado (Opcional)</label>
              <select
                value={formData.doctor_id}
                onChange={e => setFormData({ ...formData, doctor_id: e.target.value })}
                className={`${baseInputStyle} cursor-pointer`}
              >
                <option value="">Nenhum</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Descrição do Lançamento</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className={baseInputStyle}
                placeholder="Ex: Mensalidade de software, Honorário cirurgia tal..."
              />
            </div>

          </div>

          {/* Footer Ações */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-xs uppercase"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Confirmar Lançamento
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
