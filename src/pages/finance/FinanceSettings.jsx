import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { financeService } from '../../services/financeService';
import { 
  FolderPlus, Plus, Edit2, Trash2, ShieldCheck, DollarSign, 
  Settings, Folder, Palette, HelpCircle, Loader2, Save, UserCheck, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinanceSettings() {
  const [activeTab, setActiveTab] = useState('services');
  const [loading, setLoading] = useState(false);

  // States para Serviços
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', base_price: 0 });
  const [editingServiceId, setEditingServiceId] = useState(null);

  // States para Médicos
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorSettingsForm, setDoctorSettingsForm] = useState({
    admin_fee_rate: 10.00,
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    pix_key: ''
  });

  // States para Categorias
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'SAIDA', parent_id: '', color: '#cbd5e1', icon: 'Folder' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'services') {
        const data = await financeService.getServices();
        setServices(data || []);
      } else if (activeTab === 'doctors') {
        // Carrega usuários que são médicos ou administradores
        const { data: usersData, error } = await supabase
          .from('users')
          .select('id, name, role')
          .order('name');
        if (error) throw error;
        
        // Filtra para médicos (ou perfil adequado)
        const medicos = usersData.filter(u => ['Médico', 'Médico Autorizador', 'Administrador'].includes(u.role));
        setDoctors(medicos);
        
        if (medicos.length > 0) {
          const firstDocId = medicos[0].id;
          setSelectedDoctorId(firstDocId);
          await loadDoctorSettings(firstDocId);
        }
      } else if (activeTab === 'categories') {
        const cats = await financeService.getCategories();
        setCategories(cats || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados de configurações.');
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE SERVIÇOS ---
  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) return toast.error('Nome do serviço é obrigatório');
    
    try {
      if (editingServiceId) {
        await financeService.updateService(editingServiceId, serviceForm);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await financeService.createService(serviceForm);
        toast.success('Serviço cadastrado com sucesso!');
      }
      setServiceForm({ name: '', description: '', base_price: 0 });
      setEditingServiceId(null);
      const data = await financeService.getServices();
      setServices(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar o serviço.');
    }
  };

  const handleEditService = (service) => {
    setServiceForm({
      name: service.name,
      description: service.description || '',
      base_price: service.base_price
    });
    setEditingServiceId(service.id);
  };

  const handleDeleteService = async (id) => {
    if (!confirm('Deseja realmente remover este serviço?')) return;
    try {
      await financeService.deleteService(id);
      toast.success('Serviço removido com sucesso!');
      setServices(services.filter(s => s.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover serviço (pode estar vinculado a vendas).');
    }
  };

  // --- LÓGICA DE CONFIGURAÇÃO DE MÉDICOS ---
  const loadDoctorSettings = async (docId) => {
    try {
      const settings = await financeService.getDoctorSettings(docId);
      if (settings) {
        setDoctorSettingsForm({
          admin_fee_rate: settings.admin_fee_rate,
          bank_name: settings.bank_name || '',
          bank_agency: settings.bank_agency || '',
          bank_account: settings.bank_account || '',
          pix_key: settings.pix_key || ''
        });
      } else {
        setDoctorSettingsForm({
          admin_fee_rate: 10.00,
          bank_name: '',
          bank_agency: '',
          bank_account: '',
          pix_key: ''
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar configurações do médico.');
    }
  };

  const handleSaveDoctorSettings = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) return toast.error('Nenhum médico selecionado');
    try {
      await financeService.updateDoctorSettings(selectedDoctorId, doctorSettingsForm);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar as configurações.');
    }
  };

  // --- LÓGICA DE CATEGORIAS ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return toast.error('Nome da categoria é obrigatório');
    try {
      await financeService.createCategory(categoryForm);
      toast.success('Categoria criada com sucesso!');
      setCategoryForm({ name: '', type: 'SAIDA', parent_id: '', color: '#cbd5e1', icon: 'Folder' });
      const cats = await financeService.getCategories();
      setCategories(cats || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar categoria.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Deseja remover esta categoria?')) return;
    try {
      await financeService.deleteCategory(id);
      toast.success('Categoria removida com sucesso!');
      setCategories(categories.filter(c => c.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Erro ao deletar categoria.');
    }
  };

  const baseInputStyle = "w-full h-9 px-3 py-2 bg-white/50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800";

  return (
    <div className="px-4 sm:px-6 pr-8 py-6 min-h-full bg-slate-50/50 font-sans text-slate-900">
      
      {/* Header Premium */}
      <div className="mb-6 border-b border-slate-200/60 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
            <Settings className="text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} size={24} /> 
            Configurações Financeiras
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Parâmetros, Serviços e Repasse do ERP</p>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-3 mb-6 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('services')}
          className={`px-5 py-2 text-xs font-black uppercase tracking-wide transition-all rounded-xl ${activeTab === 'services' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Serviços Ofertados
        </button>
        <button 
          onClick={() => setActiveTab('doctors')}
          className={`px-5 py-2 text-xs font-black uppercase tracking-wide transition-all rounded-xl ${activeTab === 'doctors' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Regras de Médicos
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-2 text-xs font-black uppercase tracking-wide transition-all rounded-xl ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Categorias DRE
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="text-indigo-600 animate-spin" />
        </div>
      )}

      {/* Tab Content: SERVICES */}
      {!loading && activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-4 bg-white/70 backdrop-blur-lg border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Plus size={16} /> {editingServiceId ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>
            
            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Nome do Serviço</label>
                <input 
                  type="text" 
                  value={serviceForm.name} 
                  onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} 
                  className={baseInputStyle}
                  placeholder="Ex: Plantão Extra 12h"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Descrição</label>
                <textarea 
                  value={serviceForm.description} 
                  onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} 
                  className={`${baseInputStyle} h-20 resize-none py-1.5`}
                  placeholder="Explicação do serviço financeiro..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Preço Base (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={serviceForm.base_price} 
                  onChange={e => setServiceForm({ ...serviceForm, base_price: parseFloat(e.target.value) || 0 })} 
                  className={baseInputStyle}
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all">
                  <Save size={14} /> Salvar Serviço
                </button>
                {editingServiceId && (
                  <button 
                    type="button" 
                    onClick={() => { setEditingServiceId(null); setServiceForm({ name: '', description: '', base_price: 0 }); }} 
                    className="w-full h-8 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase mt-2"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Listagem */}
          <div className="lg:col-span-8 bg-white/70 backdrop-blur-lg border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-5">Serviços Cadastrados</h3>
            
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {services.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase">Nenhum serviço cadastrado.</div>
              ) : (
                services.map(s => (
                  <div key={s.id} className="py-4 flex justify-between items-center group">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{s.name}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{s.description || 'Sem descrição'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-emerald-600 text-sm bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-lg">
                        R$ {s.base_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditService(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteService(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: DOCTORS */}
      {!loading && activeTab === 'doctors' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Seletor Lateral */}
          <div className="lg:col-span-4 bg-white/70 backdrop-blur-lg border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col max-h-[70vh]">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserCheck size={16} /> Selecionar Profissional
            </h3>
            <div className="overflow-y-auto flex-1 custom-scrollbar space-y-1.5 pr-2">
              {doctors.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDoctorId(d.id); loadDoctorSettings(d.id); }}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${selectedDoctorId === d.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate">{d.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-500">{d.role === 'Administrador' ? 'ADM' : 'MED'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Formulário de Configuração */}
          <div className="lg:col-span-8 bg-white/70 backdrop-blur-lg border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <DollarSign size={16} /> Parâmetros de Rateio & Dados Bancários
            </h3>

            {selectedDoctorId ? (
              <form onSubmit={handleSaveDoctorSettings} className="space-y-6">
                
                {/* Parâmetros do Repasse */}
                <div className="bg-slate-50/60 border border-slate-200/60 p-5 rounded-2xl">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Palette size={14} className="text-indigo-500" /> Taxas Administrativas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Retenção de Taxa Administrativa (%)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.01"
                          value={doctorSettingsForm.admin_fee_rate} 
                          onChange={e => setDoctorSettingsForm({ ...doctorSettingsForm, admin_fee_rate: parseFloat(e.target.value) || 0 })} 
                          className={`${baseInputStyle} pr-8`}
                          placeholder="10.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1 ml-1">Descontada da PJ no cálculo do repasse do profissional.</p>
                    </div>
                  </div>
                </div>

                {/* Dados de Pagamento */}
                <div className="bg-slate-50/60 border border-slate-200/60 p-5 rounded-2xl">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-emerald-500" /> Informações para Pagamento
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Banco</label>
                      <input 
                        type="text" 
                        value={doctorSettingsForm.bank_name} 
                        onChange={e => setDoctorSettingsForm({ ...doctorSettingsForm, bank_name: e.target.value })} 
                        className={baseInputStyle}
                        placeholder="Ex: Itaú Unibanco"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Agência</label>
                      <input 
                        type="text" 
                        value={doctorSettingsForm.bank_agency} 
                        onChange={e => setDoctorSettingsForm({ ...doctorSettingsForm, bank_agency: e.target.value })} 
                        className={baseInputStyle}
                        placeholder="0001"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Conta Corrente / Poupança</label>
                      <input 
                        type="text" 
                        value={doctorSettingsForm.bank_account} 
                        onChange={e => setDoctorSettingsForm({ ...doctorSettingsForm, bank_account: e.target.value })} 
                        className={baseInputStyle}
                        placeholder="12345-6"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Chave PIX</label>
                      <input 
                        type="text" 
                        value={doctorSettingsForm.pix_key} 
                        onChange={e => setDoctorSettingsForm({ ...doctorSettingsForm, pix_key: e.target.value })} 
                        className={baseInputStyle}
                        placeholder="CPF, CNPJ, Celular, E-mail ou Chave Aleatória"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-indigo-600/10 flex items-center gap-2 transition-all">
                    <Save size={14} /> Salvar Parâmetros
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase">Selecione um médico na lista ao lado para configurar.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: CATEGORIES */}
      {!loading && activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-4 bg-white/70 backdrop-blur-lg border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-5 flex items-center gap-2">
              <FolderPlus size={16} /> Nova Categoria DRE
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Nome da Categoria</label>
                <input 
                  type="text" 
                  value={categoryForm.name} 
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} 
                  className={baseInputStyle}
                  placeholder="Ex: Consultoria Externa"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Tipo</label>
                <select 
                  value={categoryForm.type} 
                  onChange={e => setCategoryForm({ ...categoryForm, type: e.target.value })} 
                  className={`${baseInputStyle} cursor-pointer`}
                >
                  <option value="ENTRADA">RECEITA (ENTRADA)</option>
                  <option value="SAIDA">DESPESA (SAÍDA)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Categoria Pai (Opcional - Subcategoria)</label>
                <select 
                  value={categoryForm.parent_id} 
                  onChange={e => setCategoryForm({ ...categoryForm, parent_id: e.target.value })} 
                  className={`${baseInputStyle} cursor-pointer`}
                >
                  <option value="">Nenhuma (Categoria Principal)</option>
                  {categories.filter(c => !c.parent_id).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Cor Visual</label>
                  <input 
                    type="color" 
                    value={categoryForm.color} 
                    onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })} 
                    className="w-full h-9 rounded-lg border border-slate-200 p-0.5 cursor-pointer bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Ícone</label>
                  <select 
                    value={categoryForm.icon} 
                    onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })} 
                    className={`${baseInputStyle} cursor-pointer`}
                  >
                    <option value="Folder">Pasta</option>
                    <option value="DollarSign">Dinheiro</option>
                    <option value="Activity">Atividade</option>
                    <option value="ShieldCheck">Escudo</option>
                    <option value="Users">Médicos</option>
                    <option value="Percent">Porcentagem</option>
                    <option value="Briefcase">Maleta</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all">
                  <Save size={14} /> Salvar Categoria
                </button>
              </div>
            </form>
          </div>

          {/* Listagem */}
          <div className="lg:col-span-8 bg-white/70 backdrop-blur-lg border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-5">Estrutura de Categorias</h3>

            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {categories.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase">Nenhuma categoria cadastrada.</div>
              ) : (
                // Agrupa e exibe categorias principais e suas subcategorias
                categories.filter(c => !c.parent_id).map(mainCat => {
                  const subCats = categories.filter(c => c.parent_id === mainCat.id);
                  return (
                    <div key={mainCat.id} className="py-4">
                      {/* Categoria Principal */}
                      <div className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: mainCat.color }}>
                            <Folder size={12} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 text-sm">{mainCat.name}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wide ml-2 px-1.5 py-0.5 rounded ${mainCat.type === 'ENTRADA' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                              {mainCat.type}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteCategory(mainCat.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Subcategorias */}
                      {subCats.length > 0 && (
                        <div className="ml-9 mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                          {subCats.map(subCat => (
                            <div key={subCat.id} className="flex justify-between items-center group py-1">
                              <span className="text-xs font-bold text-slate-500 uppercase">{subCat.name}</span>
                              <button 
                                onClick={() => handleDeleteCategory(subCat.id)}
                                className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
