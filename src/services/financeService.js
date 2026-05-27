import { supabase } from './supabase';
import { logAction } from '../utils/logger';

export const financeService = {
  // ==========================================
  // 1. GESTÃO DE CONTAS (ACCOUNTS)
  // ==========================================
  async getAccounts() {
    const { data, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async createAccount(account) {
    const { data, error } = await supabase
      .from('finance_accounts')
      .insert([account])
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - CONTA', `Criou conta: ${account.name}`);
    return data[0];
  },

  async updateAccount(id, account) {
    const { data, error } = await supabase
      .from('finance_accounts')
      .update(account)
      .eq('id', id)
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - CONTA', `Atualizou conta ID: ${id}`);
    return data[0];
  },

  async deleteAccount(id) {
    const { error } = await supabase
      .from('finance_accounts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await logAction('FINANCEIRO - CONTA', `Excluiu conta ID: ${id}`);
    return true;
  },

  // ==========================================
  // 2. CATEGORIAS FINANCEIRAS (CATEGORIES)
  // ==========================================
  async getCategories() {
    const { data, error } = await supabase
      .from('finance_categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async createCategory(category) {
    const { data, error } = await supabase
      .from('finance_categories')
      .insert([category])
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - CATEGORIA', `Criou categoria: ${category.name}`);
    return data[0];
  },

  async deleteCategory(id) {
    const { error } = await supabase
      .from('finance_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await logAction('FINANCEIRO - CATEGORIA', `Excluiu categoria ID: ${id}`);
    return true;
  },

  // ==========================================
  // 3. MOVIMENTAÇÕES (TRANSACTIONS)
  // ==========================================
  async getTransactions(filters = {}) {
    let query = supabase
      .from('finance_transactions')
      .select(`
        *,
        finance_accounts (name, bank_name),
        finance_categories (name, color, icon),
        users (name)
      `)
      .order('transaction_date', { ascending: false });

    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.startDate) query = query.gte('transaction_date', filters.startDate);
    if (filters.endDate) query = query.lte('transaction_date', filters.endDate);
    if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createTransaction(transaction) {
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert([transaction])
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - TRANSAÇÃO', `Criou transação de ${transaction.type}: R$${transaction.amount}`);
    return data[0];
  },

  async updateTransaction(id, transaction) {
    const { data, error } = await supabase
      .from('finance_transactions')
      .update(transaction)
      .eq('id', id)
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - TRANSAÇÃO', `Atualizou transação ID: ${id}`);
    return data[0];
  },

  async deleteTransaction(id) {
    const { error } = await supabase
      .from('finance_transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await logAction('FINANCEIRO - TRANSAÇÃO', `Excluiu transação ID: ${id}`);
    return true;
  },

  // ==========================================
  // 4. CONCILIAÇÃO BANCÁRIA (RECONCILIATION)
  // ==========================================
  async getImportedTransactions(accountId, reconciled = false) {
    const { data, error } = await supabase
      .from('finance_imported_transactions')
      .select('*')
      .eq('account_id', accountId)
      .eq('reconciled', reconciled)
      .order('transaction_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  async importImportedTransactions(transactions) {
    const { data, error } = await supabase
      .from('finance_imported_transactions')
      .upsert(transactions, { onConflict: 'fitid,account_id' })
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - CONCILIAÇÃO', `Importou ${transactions.length} transações OFX.`);
    return data;
  },

  async reconcileMatch(importedId, transactionId) {
    // 1. Atualiza a transação importada
    const { error: error1 } = await supabase
      .from('finance_imported_transactions')
      .update({
        reconciled: true,
        reconciled_transaction_id: transactionId
      })
      .eq('id', importedId);
    if (error1) throw error1;

    // 2. Atualiza a transação do sistema para status PAGO/Conciliado
    const { error: error2 } = await supabase
      .from('finance_transactions')
      .update({
        status: 'PAGO',
        imported_transaction_id: importedId
      })
      .eq('id', transactionId);
    if (error2) throw error2;

    await logAction('FINANCEIRO - CONCILIAÇÃO', `Conciliou transação importada ${importedId} com transação ${transactionId}.`);
    return true;
  },

  // ==========================================
  // 5. SERVIÇOS E VENDAS (SERVICES & SALES)
  // ==========================================
  async getServices() {
    const { data, error } = await supabase
      .from('finance_services')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async createService(service) {
    const { data, error } = await supabase
      .from('finance_services')
      .insert([service])
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - SERVIÇO', `Criou serviço: ${service.name}`);
    return data[0];
  },

  async updateService(id, service) {
    const { data, error } = await supabase
      .from('finance_services')
      .update(service)
      .eq('id', id)
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - SERVIÇO', `Atualizou serviço ID: ${id}`);
    return data[0];
  },

  async deleteService(id) {
    const { error } = await supabase
      .from('finance_services')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await logAction('FINANCEIRO - SERVIÇO', `Excluiu serviço ID: ${id}`);
    return true;
  },

  async getServiceSales() {
    const { data, error } = await supabase
      .from('finance_service_sales')
      .select('*, finance_services(name)')
      .order('sale_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createServiceSale(sale) {
    const { data, error } = await supabase
      .from('finance_service_sales')
      .insert([sale])
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - VENDA', `Criou venda de serviço no valor de R$${sale.amount}`);
    return data[0];
  },

  async updateServiceSale(id, sale) {
    const { data, error } = await supabase
      .from('finance_service_sales')
      .update(sale)
      .eq('id', id)
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - VENDA', `Atualizou venda ID: ${id}`);
    return data[0];
  },

  // ==========================================
  // 6. REPASSE MÉDICO (DOCTOR SPLITS)
  // ==========================================
  async getDoctorSettings(doctorId) {
    const { data, error } = await supabase
      .from('finance_doctor_settings')
      .select('*')
      .eq('doctor_id', doctorId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateDoctorSettings(doctorId, settings) {
    const { data, error } = await supabase
      .from('finance_doctor_settings')
      .upsert({ doctor_id: doctorId, ...settings })
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - REPASSE', `Atualizou configurações de repasse do médico ID: ${doctorId}`);
    return data[0];
  },

  async getRepasses(filters = {}) {
    let query = supabase
      .from('finance_repasses')
      .select('*, users(name)')
      .order('reference_month', { ascending: false });

    if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);
    if (filters.month) query = query.eq('reference_month', filters.month);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getRepasseDetails(repasseId) {
    const { data: repasse, error: err1 } = await supabase
      .from('finance_repasses')
      .select('*, users(*)')
      .eq('id', repasseId)
      .single();
    if (err1) throw err1;

    const { data: items, error: err2 } = await supabase
      .from('finance_repasse_items')
      .select('*, surgeries(*)')
      .eq('repasse_id', repasseId);
    if (err2) throw err2;

    return { ...repasse, items };
  },

  async createRepasse(repasse, items) {
    // 1. Cria repasse cabeçalho
    const { data: savedRepasse, error: err1 } = await supabase
      .from('finance_repasses')
      .insert([repasse])
      .select();
    if (err1) throw err1;

    const repasseId = savedRepasse[0].id;

    // 2. Preenche os itens
    const itemsWithId = items.map(item => ({ ...item, repasse_id: repasseId }));
    const { error: err2 } = await supabase
      .from('finance_repasse_items')
      .insert(itemsWithId);
    if (err2) {
      // Rollback manual do cabeçalho
      await supabase.from('finance_repasses').delete().eq('id', repasseId);
      throw err2;
    }

    await logAction('FINANCEIRO - REPASSE', `Criou repasse ID: ${repasseId} para o médico ID: ${repasse.doctor_id}`);
    return savedRepasse[0];
  },

  async payRepasse(repasseId, accountId, paymentDate) {
    // 1. Busca os dados do repasse
    const repasse = await this.getRepasseDetails(repasseId);
    if (repasse.status === 'PAGO') throw new Error('Repasse já foi pago.');

    // 2. Cria a transação de débito/saída
    const transaction = {
      account_id: accountId,
      category_id: '20000000-0000-0000-0000-000000000001', // ID fixado para "Repasse a Médicos"
      type: 'SAIDA',
      amount: repasse.net_amount,
      transaction_date: paymentDate,
      description: `Repasse ref. ${repasse.reference_month} - Dr(a). ${repasse.users.name}`,
      status: 'PAGO',
      payment_method: 'PIX',
      doctor_id: repasse.doctor_id
    };

    const savedTx = await this.createTransaction(transaction);

    // 3. Atualiza status do repasse
    const { data, error } = await supabase
      .from('finance_repasses')
      .update({
        status: 'PAGO',
        payment_date: paymentDate,
        transaction_id: savedTx.id
      })
      .eq('id', repasseId)
      .select();
    if (error) throw error;

    await logAction('FINANCEIRO - REPASSE', `Marcou repasse ID: ${repasseId} como PAGO.`);
    return data[0];
  },

  // ==========================================
  // 7. CONTROLE DE GLOSAS (GLOSAS)
  // ==========================================
  async getGlosas(filters = {}) {
    let query = supabase
      .from('finance_glosas')
      .select('*, surgeries(*), users(name)')
      .order('glosa_date', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);
    if (filters.convenio) query = query.eq('convenio', filters.convenio);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createGlosa(glosa) {
    const { data, error } = await supabase
      .from('finance_glosas')
      .insert([glosa])
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - GLOSA', `Criou glosa no valor de R$${glosa.amount}`);
    return data[0];
  },

  async updateGlosa(id, glosa) {
    const { data, error } = await supabase
      .from('finance_glosas')
      .update(glosa)
      .eq('id', id)
      .select();
    if (error) throw error;
    await logAction('FINANCEIRO - GLOSA', `Atualizou glosa ID: ${id}`);
    return data[0];
  }
};
