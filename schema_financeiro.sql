-- ==========================================
-- SCHEMA FINANCEIRO - SISGESP (ISMSAUDE)
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Contas Bancárias
CREATE TABLE IF NOT EXISTS finance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bank_name TEXT,
    agency TEXT,
    account_number TEXT,
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Categorias Hierárquicas
CREATE TABLE IF NOT EXISTS finance_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SAIDA')),
    parent_id UUID REFERENCES finance_categories(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#cbd5e1',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Catálogo de Serviços
CREATE TABLE IF NOT EXISTS finance_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Vendas de Serviços
CREATE TABLE IF NOT EXISTS finance_service_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES finance_services(id) ON DELETE RESTRICT,
    buyer_name TEXT NOT NULL,
    sale_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'CANCELADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Movimentações Financeiras (Receitas/Despesas)
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SAIDA')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO')),
    payment_method TEXT CHECK (payment_method IN ('PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO', 'DINHEIRO', 'OUTRO')),
    
    -- Vínculos opcionais
    doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    surgery_id UUID REFERENCES surgeries(id) ON DELETE SET NULL,
    shift_id TEXT,
    service_sale_id UUID REFERENCES finance_service_sales(id) ON DELETE SET NULL,
    imported_transaction_id UUID, -- Será atualizado após a conciliação
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Transações Importadas para Conciliação
CREATE TABLE IF NOT EXISTS finance_imported_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
    fitid TEXT,
    transaction_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    memo TEXT,
    reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    reconciled_transaction_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Atualiza a referência de conciliação de volta
ALTER TABLE finance_transactions 
ADD CONSTRAINT fk_imported_trans 
FOREIGN KEY (imported_transaction_id) 
REFERENCES finance_imported_transactions(id) ON DELETE SET NULL;

-- 7. Configurações Financeiras do Médico
CREATE TABLE IF NOT EXISTS finance_doctor_settings (
    doctor_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    admin_fee_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    bank_name TEXT,
    bank_agency TEXT,
    bank_account TEXT,
    pix_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Repasses Consolidados
CREATE TABLE IF NOT EXISTS finance_repasses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reference_month TEXT NOT NULL,
    gross_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    admin_fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    glosa_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO')),
    payment_date DATE,
    transaction_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Itens Detalhados do Repasse
CREATE TABLE IF NOT EXISTS finance_repasse_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repasse_id UUID NOT NULL REFERENCES finance_repasses(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('SHIFT', 'SURGERY', 'OTHER')),
    surgery_id UUID REFERENCES surgeries(id) ON DELETE SET NULL,
    shift_id TEXT,
    description TEXT NOT NULL,
    gross_amount NUMERIC(15, 2) NOT NULL,
    admin_fee_rate NUMERIC(5, 2) NOT NULL,
    admin_fee_amount NUMERIC(15, 2) NOT NULL,
    net_amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Controle de Glosas
CREATE TABLE IF NOT EXISTS finance_glosas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surgery_id UUID REFERENCES surgeries(id) ON DELETE SET NULL,
    shift_id TEXT,
    convenio TEXT NOT NULL,
    doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    glosa_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO_PARCIAL', 'GLOSADO')),
    recovered_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    deducted_from_repasse_id UUID REFERENCES finance_repasses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- AUTOMATION TRIGGERS FOR BALANCES
-- ==========================================

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Caso de inserção ou atualização para transação confirmada (PAGO)
    IF (TG_OP = 'INSERT' AND NEW.status = 'PAGO') THEN
        IF NEW.type = 'ENTRADA' THEN
            UPDATE finance_accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSE
            UPDATE finance_accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Reverte o valor antigo (se estava PAGO)
        IF OLD.status = 'PAGO' THEN
            IF OLD.type = 'ENTRADA' THEN
                UPDATE finance_accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
            ELSE
                UPDATE finance_accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
            END IF;
        END IF;
        -- Aplica o novo valor (se está PAGO)
        IF NEW.status = 'PAGO' THEN
            IF NEW.type = 'ENTRADA' THEN
                UPDATE finance_accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
            ELSE
                UPDATE finance_accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'PAGO') THEN
        -- Reverte se foi deletado
        IF OLD.type = 'ENTRADA' THEN
            UPDATE finance_accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        ELSE
            UPDATE finance_accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Dropar se já existir e criar trigger
DROP TRIGGER IF EXISTS trg_update_account_balance ON finance_transactions;
CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();


-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_transactions_account ON finance_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON finance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_doctor ON finance_transactions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_imported_trans_fitid ON finance_imported_transactions(fitid);
CREATE INDEX IF NOT EXISTS idx_repasse_items_repasse ON finance_repasse_items(repasse_id);
CREATE INDEX IF NOT EXISTS idx_repasses_doctor ON finance_repasses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_glosas_surgery ON finance_glosas(surgery_id);


-- ==========================================
-- SEED DATA (CATEGORIES & ACCOUNTS)
-- ==========================================

-- Contas Padrão
INSERT INTO finance_accounts (name, bank_name, initial_balance, current_balance)
VALUES 
('Caixa Interno', 'Dinheiro Físico', 0.00, 0.00),
('Itaú Corrente PJ', 'Banco Itaú', 0.00, 0.00),
('Sicoob PJ', 'Sicoob', 0.00, 0.00)
ON CONFLICT DO NOTHING;

-- Categorias de Entrada (Receitas)
INSERT INTO finance_categories (id, name, type, color, icon)
VALUES 
('10000000-0000-0000-0000-000000000001', 'Faturamento de Plantões', 'ENTRADA', '#10b981', 'Calendar'),
('10000000-0000-0000-0000-000000000002', 'Faturamento de Cirurgias SUS', 'ENTRADA', '#34d399', 'Activity'),
('10000000-0000-0000-0000-000000000003', 'Faturamento de Convênios', 'ENTRADA', '#6ee7b7', 'ShieldCheck'),
('10000000-0000-0000-0000-000000000004', 'Honorários Particulares', 'ENTRADA', '#a7f3d0', 'DollarSign'),
('10000000-0000-0000-0000-000000000005', 'Outras Receitas', 'ENTRADA', '#cbd5e1', 'PlusCircle')
ON CONFLICT (id) DO NOTHING;

-- Categorias de Saída (Despesas)
INSERT INTO finance_categories (id, name, type, color, icon)
VALUES 
('20000000-0000-0000-0000-000000000001', 'Repasses a Médicos', 'SAIDA', '#ef4444', 'Users'),
('20000000-0000-0000-0000-000000000002', 'Impostos e Taxas', 'SAIDA', '#f87171', 'Percent'),
('20000000-0000-0000-0000-000000000003', 'Despesas Operacionais', 'SAIDA', '#fca5a5', 'Briefcase'),
('20000000-0000-0000-0000-000000000004', 'Marketing e Comercial', 'SAIDA', '#fecaca', 'TrendingUp'),
('20000000-0000-0000-0000-000000000005', 'Material e Medicamentos', 'SAIDA', '#fee2e2', 'Syringe')
ON CONFLICT (id) DO NOTHING;

-- Subcategorias de Despesas Operacionais (exemplo de hierarquia)
INSERT INTO finance_categories (name, type, parent_id, color, icon)
VALUES 
('Aluguel e Condomínio', 'SAIDA', '20000000-0000-0000-0000-000000000003', '#fca5a5', 'Home'),
('Sistemas e Software', 'SAIDA', '20000000-0000-0000-0000-000000000003', '#fca5a5', 'Cpu'),
('Material de Escritório', 'SAIDA', '20000000-0000-0000-0000-000000000003', '#fca5a5', 'Paperclip')
ON CONFLICT DO NOTHING;
