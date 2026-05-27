import React, { useState, useEffect } from 'react';
import { financeService } from '../../services/financeService';
import { parseOFX } from '../../utils/ofxParser';
import { 
  Upload, FileText, ArrowRightLeft, Check, Plus, AlertCircle, 
  HelpCircle, Landmark, Loader2, Sparkles, ChevronRight, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import TransactionModal from '../../components/finance/TransactionModal';

export default function FinanceConciliation() {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  // Transações carregadas para conciliação
  const [importedTxs, setImportedTxs] = useState([]);
  const [systemTxs, setSystemTxs] = useState([]);

  // Seleções
  const [selectedImportedTx, setSelectedImportedTx] = useState(null);
  const [selectedSystemTx, setSelectedSystemTx] = useState(null);

  // Modal para criação rápida de transação inexistente no sistema
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [modalPreFill, setModalPreFill] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadTransactions();
    }
  }, [selectedAccountId]);

  const loadAccounts = async () => {
    try {
      const data = await financeService.getAccounts();
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar contas bancárias.');
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // 1. Busca transações importadas pendentes (reconciled = false)
      const imported = await financeService.getImportedTransactions(selectedAccountId, false);
      setImportedTxs(imported || []);

      // 2. Busca transações do sistema pendentes (status = PENDENTE)
      const system = await financeService.getTransactions({
        accountId: selectedAccountId,
        status: 'PENDENTE'
      });
      setSystemTxs(system || []);
      
      setSelectedImportedTx(null);
      setSelectedSystemTx(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar lançamentos para conciliação.');
    } finally {
      setLoading(false);
    }
  };

  // --- PARSE E UPLOAD DO OFX ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedAccountId) return toast.error('Selecione uma conta bancária antes de importar.');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        const text = event.target.result;
        const parsedTransactions = parseOFX(text);

        if (parsedTransactions.length === 0) {
          toast.error('Nenhuma transação encontrada no arquivo OFX.');
          return;
        }

        // Adiciona o id da conta nas transações importadas
        const payload = parsedTransactions.map(tx => ({
          ...tx,
          account_id: selectedAccountId
        }));

        await financeService.importImportedTransactions(payload);
        toast.success(`Importação realizada! ${parsedTransactions.length} transações salvas.`);
        loadTransactions();
      } catch (error) {
        console.error(error);
        toast.error(error.message || 'Erro ao processar o arquivo OFX.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file, 'latin1'); // latin1 ajuda com caracteres brasileiros nos OFX
  };

  // --- LÓGICA DE DETECÇÃO AUTOMÁTICA DE MATCH ---
  // Verifica se uma transação do sistema bate com a importada selecionada
  const isSuggestedMatch = (sysTx, impTx) => {
    if (!impTx) return false;
    
    // Verifica se os valores são iguais (com sinal correto)
    const amountMatch = Math.abs(parseFloat(sysTx.amount)) === Math.abs(parseFloat(impTx.amount));
    
    // Verifica se a data é próxima (+/- 3 dias de diferença)
    const sysDate = new Date(sysTx.transaction_date);
    const impDate = new Date(impTx.transaction_date);
    const diffTime = Math.abs(sysDate - impDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const dateMatch = diffDays <= 3;

    return amountMatch && dateMatch;
  };

  const handleReconcile = async () => {
    if (!selectedImportedTx || !selectedSystemTx) {
      return toast.error('Selecione uma transação do banco e uma do sistema para conciliar.');
    }

    try {
      setLoading(true);
      await financeService.reconcileMatch(selectedImportedTx.id, selectedSystemTx.id);
      toast.success('Conciliação realizada com sucesso!');
      loadTransactions();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao efetuar a conciliação.');
      setLoading(false);
    }
  };

  // Criação rápida pré-preenchida
  const handleQuickCreateTransaction = () => {
    if (!selectedImportedTx) return;
    setModalPreFill(selectedImportedTx);
    setIsTxModalOpen(true);
  };

  return (
    <div className="px-4 sm:px-6 pr-8 py-6 min-h-full bg-slate-50/50 font-sans text-slate-900">
      
      {/* Header Premium */}
      <div className="mb-6 border-b border-slate-200/60 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="text-indigo-600" size={24} /> 
            Conciliação Bancária
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Concilie o extrato do seu banco com os lançamentos internos</p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedAccountId} 
            onChange={e => setSelectedAccountId(e.target.value)} 
            className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
          >
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          {/* Input OFX escondido */}
          <label className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-indigo-600/10 flex items-center gap-2 transition-all cursor-pointer select-none">
            <Upload size={16} /> Importar OFX
            <input type="file" accept=".ofx" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Painel de Conciliação Duplo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[55vh]">
        
        {/* LADO ESQUERDO: Transações do Banco (OFX) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col max-h-[65vh]">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
            <span>1. Extrato Importado (Banco)</span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">{importedTxs.length} pendentes</span>
          </h3>

          <div className="overflow-y-auto flex-1 custom-scrollbar space-y-2 pr-2">
            {importedTxs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-bold uppercase flex flex-col items-center gap-2">
                <FileText size={32} className="text-slate-300" />
                Nenhum extrato importado pendente.<br />Importe um arquivo OFX no botão acima.
              </div>
            ) : (
              importedTxs.map(tx => {
                const amountFormatted = tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                const isSelected = selectedImportedTx?.id === tx.id;
                return (
                  <button
                    key={tx.id}
                    onClick={() => { setSelectedImportedTx(tx); setSelectedSystemTx(null); }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-slate-50/50 hover:bg-slate-100/60 border-slate-100'}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(tx.transaction_date).toLocaleDateString('pt-BR')}</span>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase mt-0.5 truncate max-w-[200px] sm:max-w-[300px]" title={tx.description}>{tx.description}</h4>
                        {tx.memo && <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">{tx.memo}</p>}
                      </div>
                      <span className={`font-black text-xs shrink-0 px-2.5 py-1 rounded-lg ${tx.amount >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                        R$ {amountFormatted}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* LADO DIREITO: Transações do Sistema (SISGESP) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col max-h-[65vh]">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
            <span>2. Lançamentos Internos (Sistema)</span>
            <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded text-[10px]">{systemTxs.length} a realizar</span>
          </h3>

          <div className="overflow-y-auto flex-1 custom-scrollbar space-y-2 pr-2">
            {selectedImportedTx ? (
              systemTxs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs font-bold uppercase">Nenhum lançamento interno pendente.</div>
              ) : (
                systemTxs.map(tx => {
                  const amountFormatted = tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                  const isSelected = selectedSystemTx?.id === tx.id;
                  const isSuggested = isSuggestedMatch(tx, selectedImportedTx);
                  
                  return (
                    <button
                      key={tx.id}
                      onClick={() => setSelectedSystemTx(tx)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all relative ${isSelected ? 'bg-indigo-50 border-indigo-300 shadow-sm' : isSuggested ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/30' : 'bg-slate-50/50 hover:bg-slate-100/60 border-slate-100'}`}
                    >
                      {/* Badge de Sugestão */}
                      {isSuggested && (
                        <span className="absolute -top-2 right-4 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Sparkles size={8} /> Sugestão de Par
                        </span>
                      )}

                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(tx.transaction_date).toLocaleDateString('pt-BR')}</span>
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase mt-0.5 truncate max-w-[200px]" title={tx.description}>{tx.description}</h4>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-200/50 text-slate-500 font-bold uppercase tracking-wide mt-1 inline-block">{tx.finance_categories?.name || 'Geral'}</span>
                        </div>
                        <span className={`font-black text-xs shrink-0 px-2.5 py-1 rounded-lg ${tx.type === 'ENTRADA' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          R$ {amountFormatted}
                        </span>
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs font-bold uppercase flex flex-col items-center gap-2">
                <HelpCircle size={32} className="text-slate-300" />
                Selecione uma transação importada (do banco) à esquerda para ver os pares correspondentes do sistema.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Barra de Ações Inferior (Consolidada) */}
      {(selectedImportedTx || selectedSystemTx) && (
        <div className="bg-slate-900 text-white rounded-3xl p-5 mt-6 flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-bottom-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full -translate-x-10 -translate-y-10 blur-xl"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 z-10">
            {selectedImportedTx && (
              <div className="text-center md:text-left">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">BANCO</span>
                <p className="text-xs font-extrabold truncate max-w-[220px]">{selectedImportedTx.description}</p>
                <p className="text-sm font-black text-indigo-200">R$ {selectedImportedTx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            )}

            {selectedImportedTx && selectedSystemTx && (
              <ChevronRight className="text-indigo-400 rotate-90 md:rotate-0" size={24} />
            )}

            {selectedSystemTx && (
              <div className="text-center md:text-left">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">SISTEMA</span>
                <p className="text-xs font-extrabold truncate max-w-[220px]">{selectedSystemTx.description}</p>
                <p className="text-sm font-black text-emerald-200">R$ {selectedSystemTx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 z-10 shrink-0">
            {selectedImportedTx && !selectedSystemTx && (
              <button
                onClick={handleQuickCreateTransaction}
                className="h-10 px-5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-bold text-xs uppercase transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Lançar Transação
              </button>
            )}

            {selectedImportedTx && selectedSystemTx && (
              <button
                onClick={handleReconcile}
                className="h-10 px-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
              >
                <Check size={14} strokeWidth={3} /> Reconciliar Match
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal para Cadastro pre-preenchido */}
      {isTxModalOpen && modalPreFill && (
        <TransactionModal 
          isOpen={isTxModalOpen}
          onClose={() => { setIsTxModalOpen(false); setModalPreFill(null); }}
          onSave={loadTransactions}
          // Custom properties can be simulated inside loading within the modal
          // (The modal automatically fetches the transactionId if set, otherwise resets.
          // In this case, we can pass our pre-filled values directly via state or by modifying the modal's default state)
        />
      )}

    </div>
  );
}
