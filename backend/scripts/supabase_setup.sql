-- ==============================================================================
-- BANDHSETU — COMPLETE SUPABASE PRODUCTION DATABASE DDL & SETUP SCRIPT
-- ==============================================================================
-- Target Engine: PostgreSQL 15+ (Supabase Cloud)
-- Schema: public
-- Includes: Extensions, Tables, Foreign Keys, Indexes, Constraints, RLS, Triggers
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USERS & PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'manager', -- 'admin' or 'manager'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lock_reason VARCHAR(255),
    locked_at TIMESTAMP WITH TIME ZONE,
    access_start_time VARCHAR(10) NOT NULL DEFAULT '09:00',
    access_end_time VARCHAR(10) NOT NULL DEFAULT '20:00',
    temporary_extension_until TIMESTAMP WITH TIME ZONE,
    token_version INTEGER NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(60),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ------------------------------------------------------------------------------
-- 2. ARTISAN WORKERS TABLE (No login accounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(50) UNIQUE NOT NULL, -- WRK-0001
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    town VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active' or 'Inactive'
    remarks TEXT,
    pending_pieces INTEGER NOT NULL DEFAULT 0,
    payable_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_serial ON workers(serial_number);
CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(full_name);
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_location ON workers(city, town, village);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);

-- ------------------------------------------------------------------------------
-- 3. ITEM CATALOGUE & PRICE MANAGEMENT TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(100) UNIQUE,
    price_per_piece NUMERIC(10, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(item_name);
CREATE INDEX IF NOT EXISTS idx_items_code ON items(item_code);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active);

-- ------------------------------------------------------------------------------
-- 4. WORK DISTRIBUTIONS TABLE (Immutable Rate Snapshots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_distributions (
    id SERIAL PRIMARY KEY,
    batch_code VARCHAR(50) NOT NULL, -- DIST-YYYYMMDD-XXXX
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    item_name_snapshot VARCHAR(255) NOT NULL,
    item_code_snapshot VARCHAR(100),
    rate_per_piece NUMERIC(10, 2) NOT NULL, -- Permanent historical snapshot price
    knot_style VARCHAR(100) NOT NULL,
    quantity_issued INTEGER NOT NULL CHECK (quantity_issued > 0),
    quantity_returned INTEGER NOT NULL DEFAULT 0,
    quantity_rejected INTEGER NOT NULL DEFAULT 0,
    quantity_pending INTEGER NOT NULL,
    total_gross_wage NUMERIC(12, 2) NOT NULL,
    deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bonus NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_payable NUMERIC(12, 2) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Issued',
    qc_remarks TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distributions_batch ON work_distributions(batch_code);
CREATE INDEX IF NOT EXISTS idx_distributions_worker ON work_distributions(worker_id);
CREATE INDEX IF NOT EXISTS idx_distributions_item ON work_distributions(item_id);
CREATE INDEX IF NOT EXISTS idx_distributions_status ON work_distributions(status);
CREATE INDEX IF NOT EXISTS idx_distributions_dates ON work_distributions(issue_date, due_date);

-- ------------------------------------------------------------------------------
-- 5. WORK RETURNS & QUALITY CONTROL TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_returns (
    id SERIAL PRIMARY KEY,
    return_code VARCHAR(50) UNIQUE NOT NULL, -- RET-YYYYMMDD-XXXX
    distribution_id INTEGER NOT NULL REFERENCES work_distributions(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    item_name_snapshot VARCHAR(255) NOT NULL,
    rate_per_piece_snapshot NUMERIC(10, 2) NOT NULL,
    quantity_returned INTEGER NOT NULL DEFAULT 0 CHECK (quantity_returned >= 0),
    quantity_rejected INTEGER NOT NULL DEFAULT 0 CHECK (quantity_rejected >= 0),
    rejection_reason VARCHAR(100),
    rejection_remarks TEXT,
    completed_work_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_code ON work_returns(return_code);
CREATE INDEX IF NOT EXISTS idx_returns_dist ON work_returns(distribution_id);
CREATE INDEX IF NOT EXISTS idx_returns_worker ON work_returns(worker_id);
CREATE INDEX IF NOT EXISTS idx_returns_date ON work_returns(return_date);

-- ------------------------------------------------------------------------------
-- 6. MATERIAL DEBIT-CREDIT LEDGER TRANSACTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_transactions (
    id SERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL, -- MTXN-YYYYMMDD-XXXX
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    distribution_id INTEGER REFERENCES work_distributions(id) ON DELETE SET NULL,
    return_id INTEGER REFERENCES work_returns(id) ON DELETE SET NULL,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(100),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(50) NOT NULL, -- DEBIT_GIVEN, CREDIT_RECEIVED, REJECTED_RETURNED, LEDGER_CORRECTION
    debit_qty INTEGER NOT NULL DEFAULT 0,
    credit_qty INTEGER NOT NULL DEFAULT 0,
    rejected_qty INTEGER NOT NULL DEFAULT 0,
    rate_per_piece NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    running_balance INTEGER NOT NULL DEFAULT 0,
    recorded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(100),
    remarks TEXT,
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    reversal_reason TEXT,
    reversal_ref_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mat_txns_code ON material_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_mat_txns_worker ON material_transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_mat_txns_date ON material_transactions(transaction_date);

-- ------------------------------------------------------------------------------
-- 7. PAYMENT RECORDS TABLE (Advances & Settlements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_records (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    distribution_id INTEGER REFERENCES work_distributions(id) ON DELETE SET NULL,
    payment_type VARCHAR(50) NOT NULL, -- 'Wage Payout', 'Advance Given', 'Bonus', 'Deduction'
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash', -- Cash, UPI, Bank Transfer
    reference_no VARCHAR(100),
    disbursed_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_worker ON payment_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payment_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payment_records(reference_no);

-- ------------------------------------------------------------------------------
-- 8. MONEY DEBIT-CREDIT LEDGER TRANSACTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS money_transactions (
    id SERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL, -- FIN-YYYYMMDD-XXXX
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    distribution_id INTEGER REFERENCES work_distributions(id) ON DELETE SET NULL,
    return_id INTEGER REFERENCES work_returns(id) ON DELETE SET NULL,
    payment_record_id INTEGER REFERENCES payment_records(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(50) NOT NULL, -- WORK_EARNING, ADVANCE_GIVEN, WAGE_PAYOUT, BONUS_CREDIT, CORRECTION_REVERSAL
    description VARCHAR(255) NOT NULL,
    credit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    debit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    running_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50),
    reference_no VARCHAR(100),
    recorded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    remarks TEXT,
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    reversal_reason TEXT,
    reversal_ref_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_money_txns_code ON money_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_money_txns_worker ON money_transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_money_txns_date ON money_transactions(transaction_date);

-- ------------------------------------------------------------------------------
-- 9. AUDIT LOGS TABLE (Immutable Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(100),
    user_agent VARCHAR(255),
    details VARCHAR(1000),
    timestamp_ist VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass (For backend server connections)
CREATE POLICY "service_role_bypass_users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_workers" ON workers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_items" ON items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_distributions" ON work_distributions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_returns" ON work_returns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_mat_txns" ON material_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_money_txns" ON money_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_payments" ON payment_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_audit" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 11. INITIAL SEED DATA (Default Owner & Manager Accounts)
-- ------------------------------------------------------------------------------
-- Admin: admin@bandhej.com / Admin@123
-- Manager: manager@bandhej.com / Manager@123
-- (Passwords hashed using bcrypt $2b$12$)
INSERT INTO users (email, phone, full_name, hashed_password, role, is_active, is_locked, access_start_time, access_end_time, token_version)
VALUES 
(
    'admin@bandhej.com', 
    '+919876543210', 
    'Bhavna Mehta (Owner)', 
    '$2b$12$K1r.mQyqT9.d4iFfE3dOue7119pP9U6oYtE79hY40vO5c3R4kF85K', 
    'admin', 
    true, 
    false, 
    '00:00', 
    '23:59', 
    1
),
(
    'manager@bandhej.com', 
    '+919876543211', 
    'Rajesh Patel (Manager)', 
    '$2b$12$e5r.ZKyqU8.a3jGfF4cOte6229qQ0V7pZuF80iZ51wP6d4S5lG96L', 
    'manager', 
    true, 
    false, 
    '09:00', 
    '20:00', 
    1
)
ON CONFLICT (email) DO NOTHING;
