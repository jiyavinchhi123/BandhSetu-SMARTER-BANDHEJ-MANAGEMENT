-- ==============================================================================
-- BANDHSETU — SUPABASE & POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enforces role-based isolation at the database level for:
-- 1. Admin / Owner (Full access)
-- 2. Manager (Operational access only; no access to security controls or audit logs)
-- 3. Anonymous / Public / Artisans (Zero direct database access)
-- ==============================================================================

-- 1. Enable RLS on all relational tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Extract current user role from JWT claims or users table
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claim.role', true),
    (SELECT role FROM users WHERE id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::integer)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. SERVICE ROLE BYPASS (For backend FastAPI server connections)
-- ==============================================================================
CREATE POLICY service_role_all_users ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_workers ON workers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_items ON items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_distributions ON work_distributions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_returns ON work_returns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_mat_txns ON material_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_money_txns ON money_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_payments ON payment_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_audit ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 3. USERS & PROFILES POLICIES
-- ==============================================================================
-- Admin can view, create, update, and manage all users
CREATE POLICY admin_users_all ON users
  FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Managers can only view their own user profile (cannot view other managers or admin)
CREATE POLICY manager_users_view_self ON users
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'manager'
    AND id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::integer
  );

-- ==============================================================================
-- 4. ARTISAN WORKERS POLICIES
-- ==============================================================================
-- Both Admin and Manager can read and write artisan records
CREATE POLICY admin_manager_workers_read ON workers
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY admin_manager_workers_write ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY admin_manager_workers_update ON workers
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_current_user_role() IN ('admin', 'manager'));

-- Only Admin can permanently delete worker records
CREATE POLICY admin_workers_delete ON workers
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'admin');

-- ==============================================================================
-- 5. ITEM CATALOGUE POLICIES
-- ==============================================================================
-- Both Admin and Manager can view active items
CREATE POLICY auth_items_read ON items
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'manager'));

-- Only Admin can create, modify, or change prices of items
CREATE POLICY admin_items_write ON items
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY admin_items_update ON items
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- ==============================================================================
-- 6. WORK DISTRIBUTIONS & RETURNS POLICIES
-- ==============================================================================
CREATE POLICY auth_distributions_rw ON work_distributions
  FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY auth_returns_rw ON work_returns
  FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_current_user_role() IN ('admin', 'manager'));

-- ==============================================================================
-- 7. MATERIAL & MONEY DEBIT-CREDIT LEDGERS POLICIES
-- ==============================================================================
-- Both Admin and Manager can view and append transactions
CREATE POLICY auth_mat_txns_rw ON material_transactions
  FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY auth_money_txns_rw ON money_transactions
  FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY auth_payments_rw ON payment_records
  FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_current_user_role() IN ('admin', 'manager'));

-- ==============================================================================
-- 8. AUDIT LOGS POLICIES (Immutable Ledger)
-- ==============================================================================
-- Only Admin can read audit logs
CREATE POLICY admin_audit_read ON audit_logs
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'admin');

-- System/Authenticated users can append audit entries, but NO UPDATE or DELETE allowed
CREATE POLICY auth_audit_insert ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
