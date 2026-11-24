export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'offline';
  project: string;
  version: string;
  environment: string;
  timestamp_ist: string;
  database: {
    connected: boolean;
    dialect: string;
    message: string;
  };
  details?: Record<string, unknown>;
}

export interface UserProfile {
  id: number;
  business_id?: number;
  company_name?: string;
  company_code?: string;
  is_primary_admin?: boolean;
  authorized_by_id?: number | null;
  email: string;
  phone?: string | null;
  full_name: string;
  role: 'admin' | 'manager';
  is_active: boolean;
  is_locked: boolean;
  lock_reason?: string | null;
  access_start_time: string;
  access_end_time: string;
  temporary_extension_until?: string | null;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  created_at: string;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  phone?: string;
  email?: string;
  password?: string;
  old_password?: string;
}

export interface ProfileUpdateResponse {
  user: UserProfile;
  access_token?: string | null;
  message: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: 'admin' | 'manager';
  user_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  business_id?: number;
  company_name?: string;
  company_code?: string;
  is_primary_admin?: boolean;
  access_start_time: string;
  access_end_time: string;
  is_extended: boolean;
  extension_until?: string | null;
  server_time_ist: string;
}

export interface CompanyRegisterPayload {
  company_name: string;
  legal_name?: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
  city?: string;
  state?: string;
}

export interface CompanyResponse {
  id: number;
  code: string;
  name: string;
  legal_name?: string | null;
  owner_admin_id?: number | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number | null;
  user_email?: string | null;
  user_role?: string | null;
  action: string;
  ip_address?: string | null;
  details?: string | null;
  timestamp_ist: string;
  created_at: string;
}

export interface ForgotPasswordRequestOTPResponse {
  message: string;
  channel: 'email' | 'sms';
  cooldown_seconds: number;
  masked_recipient?: string | null;
  masked_phone?: string | null;
  dev_otp?: string | null;
}

export interface ForgotPasswordVerifyOTPResponse {
  message: string;
  reset_token: string;
}

export interface ForgotPasswordResetPasswordResponse {
  message: string;
}

export interface SMTPConfigResponse {
  is_configured: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user?: string | null;
  smtp_from_email?: string | null;
  smtp_from_name: string;
  smtp_tls: boolean;
  masked_user?: string | null;
  message: string;
}

export interface SMTPConfigPayload {
  smtp_user: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_tls?: boolean;
  test_connection?: boolean;
}

// --- STEP 3: WORKER & ITEM INTERFACES ---
export interface WorkerItem {
  id: number;
  serial_number: string;
  full_name: string;
  phone: string;
  town: string;
  address?: string | null;
  city?: string;
  village?: string;
  joining_date: string;
  status: string;
  remarks?: string | null;
  pending_pieces: number;
  payable_balance: number;
  total_earned: number;
  created_at: string;
  updated_at: string;
}

export interface ItemCatalogue {
  id: number;
  item_name: string;
  item_code?: string | null;
  item_type?: string | null;
  is_sarkam?: boolean;
  is_choot?: boolean;
  price_per_piece: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkDistributionItem {
  id: number;
  batch_code: string;
  worker_id: number;
  item_id?: number | null;
  item_name_snapshot: string;
  item_code_snapshot?: string | null;
  rate_per_piece: number;
  knot_style: string;
  quantity_issued: number;
  quantity_returned: number;
  quantity_rejected?: number;
  quantity_pending: number;
  total_gross_wage: number;
  deductions: number;
  bonus: number;
  net_payable: number;
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  status: string;
  qc_remarks?: string | null;
  remarks?: string | null;
  worker_name?: string;
  worker_serial?: string;
  returns?: WorkReturnItem[];
  created_at: string;
}

export interface WorkReturnItem {
  id: number;
  return_code: string;
  distribution_id: number;
  worker_id: number;
  item_id?: number | null;
  item_name_snapshot: string;
  rate_per_piece_snapshot: number;
  quantity_returned: number;
  quantity_rejected: number;
  rejection_reason?: string | null;
  rejection_remarks?: string | null;
  completed_work_value: number;
  return_date: string;
  recorded_by_name?: string | null;
  remarks?: string | null;
  worker_name?: string;
  worker_serial?: string;
  batch_code?: string;
  created_at: string;
}

export interface MaterialTransactionItem {
  id: number;
  transaction_code: string;
  worker_id: number;
  distribution_id?: number | null;
  return_id?: number | null;
  item_name: string;
  item_code?: string | null;
  transaction_date: string;
  transaction_type: string;
  debit_qty: number;
  credit_qty: number;
  rejected_qty: number;
  rate_per_piece: number;
  total_value: number;
  running_balance: number;
  recorded_by_name?: string | null;
  remarks?: string | null;
  is_reversed: boolean;
  reversal_reason?: string | null;
  created_at: string;
}

export interface ItemWisePendingItem {
  item_id?: number | null;
  item_name: string;
  item_code?: string | null;
  total_given: number;
  total_received: number;
  total_rejected: number;
  pending_quantity: number;
  rate_per_piece: number;
  estimated_pending_wage: number;
}

export interface MaterialLedgerSummary {
  worker_id: number;
  worker_name: string;
  worker_serial: string;
  total_given: number;
  total_received: number;
  total_rejected: number;
  remaining_pending: number;
  item_wise_pending: ItemWisePendingItem[];
  transactions: MaterialTransactionItem[];
}

export interface MoneyTransactionItem {
  id: number;
  transaction_code: string;
  worker_id: number;
  distribution_id?: number | null;
  return_id?: number | null;
  payment_record_id?: number | null;
  transaction_date: string;
  transaction_type: string;
  description: string;
  credit_amount: number;
  debit_amount: number;
  running_balance: number;
  payment_mode?: string | null;
  reference_no?: string | null;
  recorded_by_name: string;
  remarks?: string | null;
  is_reversed: boolean;
  reversal_reason?: string | null;
  created_at: string;
}

export interface MoneyLedgerSummary {
  worker_id: number;
  worker_name: string;
  worker_serial: string;
  total_earned: number;
  total_advance_taken: number;
  total_payments_made: number;
  remaining_payable: number;
  transactions: MoneyTransactionItem[];
}

export interface MaterialLedgerItem {
  id: number;
  worker_id: number;
  lot_number?: string | null;
  material_type: string;
  issued_qty: number;
  returned_qty: number;
  unit: string;
  issue_date: string;
  return_date?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
}

export interface PaymentItem {
  id: number;
  worker_id: number;
  distribution_id?: number | null;
  payment_type: string;
  amount: number;
  payment_mode: string;
  reference_no?: string | null;
  disbursed_by_name: string;
  payment_date: string;
  notes?: string | null;
  created_at: string;
}

export interface TimelineItem {
  id: string;
  category: string;
  title: string;
  description: string;
  amount?: number | null;
  quantity?: number | null;
  remaining_quantity?: number | null;
  batch_code?: string | null;
  item_name?: string | null;
  date: string;
  status_badge: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private getToken(): string | null {
    return localStorage.getItem('bandhej_auth_token');
  }

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponseError(response: Response, defaultMessage: string): Promise<never> {
    let message = defaultMessage;
    let code = 'ERROR';
    try {
      const data = await response.json();
      if (typeof data.detail === 'string') {
        message = data.detail;
      } else if (data.detail?.message) {
        message = data.detail.message;
        code = data.detail.code || code;
      } else if (Array.isArray(data.detail)) {
        message = data.detail.map((e: any) => `${e.loc?.slice(-1)[0] || 'field'}: ${e.msg}`).join(', ');
      }
    } catch {}

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('bandhej:unauthorized', { detail: message }));
    }

    const err = new Error(message);
    (err as any).status = response.status;
    (err as any).code = code;
    throw err;
  }

  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return {
        status: 'offline',
        project: 'Bandhej Backend API',
        version: '1.0.0',
        environment: 'offline',
        timestamp_ist: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        database: {
          connected: false,
          dialect: 'none',
          message: error instanceof Error ? error.message : 'Backend unreachable',
        },
      };
    }
  }

  // Auth Endpoints
  async login(identifier: string, password: string, company_name?: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, company_name }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.detail?.message || data.detail || 'Authentication failed';
      const code = data.detail?.code || 'AUTH_ERROR';
      const error = new Error(errorMsg);
      (error as any).code = code;
      (error as any).status = response.status;
      throw error;
    }
    return data as LoginResponse;
  }

  async registerCompany(payload: CompanyRegisterPayload): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.detail?.message || data.detail || 'Company registration failed';
      const code = data.detail?.code || 'REGISTER_ERROR';
      const error = new Error(errorMsg);
      (error as any).code = code;
      (error as any).status = response.status;
      throw error;
    }
    return data as LoginResponse;
  }

  async getMyCompany(): Promise<CompanyResponse> {
    const response = await fetch(`${this.baseUrl}/company/my-company`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      await this.handleResponseError(response, 'Failed to fetch company profile');
    }
    return await response.json();
  }

  async getCompanyAdmins(): Promise<UserProfile[]> {
    const response = await fetch(`${this.baseUrl}/company/admins`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      await this.handleResponseError(response, 'Failed to fetch company admins');
    }
    return await response.json();
  }

  async createCompanyAdmin(payload: { email: string; phone?: string; full_name: string; password: string }): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/company/admins`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      await this.handleResponseError(response, 'Failed to create company admin');
    }
    return await response.json();
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch {
      // Ignore network errors on logout
    }
  }

  async getMe(): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.detail?.message || data.detail || 'Session expired');
      (error as any).code = data.detail?.code || 'SESSION_EXPIRED';
      (error as any).status = response.status;
      throw error;
    }
    return data as UserProfile;
  }

  async updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUpdateResponse> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      await this.handleResponseError(response, 'Failed to update credentials');
    }
    return await response.json();
  }

  // Forgot Password - Email & Mobile OTP Verification (100% Free Lifetime Delivery)
  async requestPasswordResetOTP(identifier: string, channel: 'email' | 'sms' = 'email'): Promise<ForgotPasswordRequestOTPResponse> {
    const response = await fetch(`${this.baseUrl}/auth/forgot-password/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, phone: identifier, channel }),
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.detail?.message || data.detail || 'Failed to request OTP';
      throw new Error(errorMsg);
    }
    return data as ForgotPasswordRequestOTPResponse;
  }

  async verifyPasswordResetOTP(identifier: string, otp: string): Promise<ForgotPasswordVerifyOTPResponse> {
    const response = await fetch(`${this.baseUrl}/auth/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, phone: identifier, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.detail?.message || data.detail || 'OTP verification failed';
      throw new Error(errorMsg);
    }
    return data as ForgotPasswordVerifyOTPResponse;
  }

  async resetPasswordWithOTP(identifier: string, resetToken: string, newPassword: string): Promise<ForgotPasswordResetPasswordResponse> {
    const response = await fetch(`${this.baseUrl}/auth/forgot-password/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, phone: identifier, reset_token: resetToken, new_password: newPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.detail?.message || data.detail || 'Failed to reset password';
      throw new Error(errorMsg);
    }
    return data as ForgotPasswordResetPasswordResponse;
  }

  // SMTP Email Configuration (100% Free Lifetime Email OTP Delivery)
  async getSMTPConfig(): Promise<SMTPConfigResponse> {
    const response = await fetch(`${this.baseUrl}/auth/smtp-config`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail?.message || data.detail || 'Failed to fetch SMTP configuration');
    }
    return data as SMTPConfigResponse;
  }

  async saveSMTPConfig(payload: SMTPConfigPayload): Promise<SMTPConfigResponse> {
    const response = await fetch(`${this.baseUrl}/auth/smtp-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail?.message || data.detail || 'Failed to verify & save SMTP configuration');
    }
    return data as SMTPConfigResponse;
  }

  // Admin - Manager Controls
  async listManagers(): Promise<UserProfile[]> {
    const response = await fetch(`${this.baseUrl}/managers/`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to list managers');
    return await response.json();
  }

  async createManager(data: any): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to create manager');
    return await response.json();
  }

  async lockManager(managerId: number, reason: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/lock`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to lock manager');
    return await response.json();
  }

  async unlockManager(managerId: number): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/unlock`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to unlock manager');
    return await response.json();
  }

  async toggleManagerActive(managerId: number): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/toggle-active`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to toggle manager state');
    return await response.json();
  }

  async updateManagerTiming(managerId: number, access_start_time: string, access_end_time: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/timing`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ access_start_time, access_end_time }),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to update access timing');
    return await response.json();
  }

  async extendManagerHours(managerId: number, extend_minutes: number, reason?: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/extend-hours`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ extend_minutes, reason: reason || 'Overtime business demand' }),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to extend hours');
    return await response.json();
  }

  async getAuditLogs(limit = 40): Promise<AuditLogItem[]> {
    const response = await fetch(`${this.baseUrl}/managers/audit-logs/all?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to fetch audit logs');
    return await response.json();
  }

  async registerManager(data: {
    full_name: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) await this.handleResponseError(response, 'Registration failed');
    return await response.json();
  }

  async approveManager(managerId: number): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to approve manager');
    return await response.json();
  }

  async deleteManager(managerId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) await this.handleResponseError(response, 'Failed to delete manager');
    return await response.json();
  }

  // ==========================================
  // --- STEP 3: WORKER MANAGEMENT METHODS ---
  // ==========================================

  async getWorkers(params?: {
    q?: string;
    status?: string;
    city?: string;
    village?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorkerItem[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.city) query.set('city', params.city);
    if (params?.village) query.set('village', params.village);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const response = await fetch(`${this.baseUrl}/workers/?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load workers directory');
    return await response.json();
  }

  async createWorker(data: {
    full_name: string;
    phone: string;
    town?: string;
    address?: string;
    city?: string;
    village?: string;
    joining_date?: string;
    status?: string;
    remarks?: string;
  }): Promise<WorkerItem> {
    const response = await fetch(`${this.baseUrl}/workers/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      let message = 'Failed to register artisan';
      try {
        const err = await response.json();
        if (typeof err.detail === 'string') {
          message = err.detail;
        } else if (Array.isArray(err.detail)) {
          message = err.detail.map((e: any) => `${e.loc?.slice(-1)[0] || 'field'}: ${e.msg}`).join(', ');
        }
      } catch {}
      throw new Error(message);
    }
    return await response.json();
  }

  async getWorker(workerId: number): Promise<WorkerItem> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Worker profile not found');
    return await response.json();
  }

  async updateWorker(workerId: number, data: Partial<WorkerItem>): Promise<WorkerItem> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update worker details');
    return await response.json();
  }

  async getWorkerMaterialLedger(workerId: number): Promise<MaterialLedgerItem[]> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}/material-ledger`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load material ledger');
    return await response.json();
  }

  async getWorkerWorkDistribution(workerId: number): Promise<WorkDistributionItem[]> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}/work-distribution`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load work distribution');
    return await response.json();
  }

  async getWorkerReturns(workerId: number): Promise<WorkDistributionItem[]> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}/returns`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load returns');
    return await response.json();
  }

  async getWorkerEarnings(workerId: number): Promise<WorkDistributionItem[]> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}/earnings`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load earnings ledger');
    return await response.json();
  }

  async getWorkerPayments(workerId: number): Promise<PaymentItem[]> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}/payments`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load payment records');
    return await response.json();
  }

  async getWorkerTimeline(workerId: number): Promise<TimelineItem[]> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}/transactions`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load timeline history');
    return await response.json();
  }

  async distributeWork(workerId: number, data: {
    item_id: number;
    knot_style: string;
    quantity_issued: number;
    due_date: string;
    bonus?: number;
    deductions?: number;
    remarks?: string;
  }): Promise<WorkDistributionItem> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}/distribute`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to issue work batch');
    }
    return await response.json();
  }

  async recordPayment(workerId: number, data: {
    payment_type: string;
    amount: number;
    payment_mode: string;
    reference_no?: string;
    notes?: string;
  }): Promise<PaymentItem> {
    const response = await fetch(`${this.baseUrl}/workers/${workerId}/payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to record payment');
    }
    return await response.json();
  }

  // ==========================================
  // --- STEP 3: ITEM & PRICE MANAGEMENT ---
  // ==========================================

  async getItems(params?: { q?: string; active_only?: boolean }): Promise<ItemCatalogue[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.active_only !== undefined) query.set('active_only', String(params.active_only));

    const response = await fetch(`${this.baseUrl}/items/?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load items catalogue');
    return await response.json();
  }

  async createItem(data: {
    item_name: string;
    item_code?: string;
    item_type?: string;
    is_sarkam?: boolean;
    is_choot?: boolean;
    price_per_piece: number;
    description?: string;
    is_active?: boolean;
  }): Promise<ItemCatalogue> {
    const response = await fetch(`${this.baseUrl}/items/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to create item');
    }
    return await response.json();
  }

  async updateItem(itemId: number, data: Partial<ItemCatalogue>): Promise<ItemCatalogue> {
    const response = await fetch(`${this.baseUrl}/items/${itemId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to update item catalogue');
    }
    return await response.json();
  }

  async toggleItemStatus(itemId: number): Promise<ItemCatalogue> {
    const response = await fetch(`${this.baseUrl}/items/${itemId}/toggle-status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to toggle item status');
    return await response.json();
  }

  // ==========================================
  // --- STEP 4: WORK DISTRIBUTION & LEDGER ---
  // ==========================================

  async giveWork(data: {
    worker_id: number;
    item_id: number;
    quantity_issued: number;
    knot_style?: string;
    issue_date?: string;
    due_date?: string;
    deductions?: number;
    bonus?: number;
    remarks?: string;
  }): Promise<WorkDistributionItem> {
    const response = await fetch(`${this.baseUrl}/distributions/give-work`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to issue work distribution');
    }
    return await response.json();
  }

  async receiveWork(data: {
    distribution_id: number;
    quantity_returned?: number;
    quantity_rejected?: number;
    rejection_reason?: string;
    rejection_remarks?: string;
    return_date?: string;
    remarks?: string;
  }): Promise<WorkReturnItem> {
    const response = await fetch(`${this.baseUrl}/distributions/receive-work`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to record work return');
    }
    return await response.json();
  }

  async getPendingDistributions(workerId?: number): Promise<WorkDistributionItem[]> {
    const query = new URLSearchParams();
    if (workerId) query.set('worker_id', String(workerId));

    const response = await fetch(`${this.baseUrl}/distributions/pending?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch pending distributions');
    return await response.json();
  }

  async getAllDistributions(params?: {
    worker_id?: number;
    status?: string;
    q?: string;
  }): Promise<WorkDistributionItem[]> {
    const query = new URLSearchParams();
    if (params?.worker_id) query.set('worker_id', String(params.worker_id));
    if (params?.status) query.set('status', params.status);
    if (params?.q) query.set('q', params.q);

    const response = await fetch(`${this.baseUrl}/distributions/?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load distributions');
    return await response.json();
  }

  async getMaterialDebitCreditLedger(workerId: number): Promise<MaterialLedgerSummary> {
    const response = await fetch(`${this.baseUrl}/distributions/ledger/${workerId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load material debit-credit ledger');
    return await response.json();
  }

  async reverseMaterialTransaction(
    txnId: number,
    data: { reason: string; notes?: string }
  ): Promise<MaterialTransactionItem> {
    const response = await fetch(`${this.baseUrl}/distributions/transactions/${txnId}/reverse`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to reverse transaction');
    }
    return await response.json();
  }

  // ==========================================
  // --- STEP 5: WAGES, PAYMENTS & MONEY LEDGER ---
  // ==========================================

  async recordAdvance(data: {
    worker_id: number;
    amount: number;
    payment_mode?: string;
    reference_no?: string;
    payment_date?: string;
    remarks?: string;
  }): Promise<MoneyTransactionItem> {
    const response = await fetch(`${this.baseUrl}/payments/advance`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to record advance');
    }
    return await response.json();
  }

  async recordPayout(data: {
    worker_id: number;
    amount: number;
    payment_mode?: string;
    reference_no?: string;
    payment_date?: string;
    is_full_settlement?: boolean;
    remarks?: string;
  }): Promise<MoneyTransactionItem> {
    const response = await fetch(`${this.baseUrl}/payments/payout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to record wage payout');
    }
    return await response.json();
  }

  async getMoneyLedger(
    workerId: number,
    params?: { start_date?: string; end_date?: string }
  ): Promise<MoneyLedgerSummary> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);

    const response = await fetch(`${this.baseUrl}/payments/ledger/${workerId}?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load money debit-credit ledger');
    return await response.json();
  }

  async reverseMoneyTransaction(
    txnId: number,
    data: { reason: string }
  ): Promise<MoneyTransactionItem> {
    const response = await fetch(`${this.baseUrl}/payments/transactions/${txnId}/reverse`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to reverse financial transaction');
    }
    return await response.json();
  }

  getStatementCsvUrl(workerId: number): string {
    return `${this.baseUrl}/payments/statement/${workerId}/csv`;
  }

  // --- STEP 6: ANALYTICS & REPORTING METHODS ---
  async getDashboardMetrics(): Promise<DashboardMetricsResponse> {
    const response = await fetch(`${this.baseUrl}/analytics/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to load dashboard metrics');
    }
    return await response.json();
  }

  async getReportData(params: ReportFilterParams): Promise<ReportResponse> {
    const query = new URLSearchParams();
    query.set('report_type', params.report_type);
    if (params.date_preset) query.set('date_preset', params.date_preset);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    if (params.worker_id) query.set('worker_id', String(params.worker_id));
    if (params.item_id) query.set('item_id', String(params.item_id));
    if (params.search_query) query.set('search_query', params.search_query);

    const response = await fetch(`${this.baseUrl}/analytics/reports?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to load report data');
    }
    return await response.json();
  }

  getReportCsvUrl(params: ReportFilterParams): string {
    const query = new URLSearchParams();
    query.set('report_type', params.report_type);
    if (params.date_preset) query.set('date_preset', params.date_preset);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    if (params.worker_id) query.set('worker_id', String(params.worker_id));
    if (params.item_id) query.set('item_id', String(params.item_id));
    if (params.search_query) query.set('search_query', params.search_query);

    return `${this.baseUrl}/analytics/reports/csv?${query.toString()}`;
  }

  async getPendingWorkReport(params: PendingWorkFilterParams = {}): Promise<PendingWorkReportResponse> {
    const query = new URLSearchParams();
    if (params.date_preset) query.set('date_preset', params.date_preset);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    if (params.q) query.set('q', params.q);
    if (params.town) query.set('town', params.town);
    if (params.item_name) query.set('item_name', params.item_name);

    const response = await fetch(`${this.baseUrl}/analytics/pending-work-report?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to load artisan pending work report');
    }
    return await response.json();
  }

  getPendingWorkReportCsvUrl(params: PendingWorkFilterParams = {}): string {
    const query = new URLSearchParams();
    if (params.date_preset) query.set('date_preset', params.date_preset);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    if (params.q) query.set('q', params.q);
    if (params.town) query.set('town', params.town);
    if (params.item_name) query.set('item_name', params.item_name);

    const token = localStorage.getItem('token');
    if (token) query.set('token', token);

    return `${this.baseUrl}/analytics/pending-work-report/csv?${query.toString()}`;
  }

  async downloadPendingWorkReportCsv(params: PendingWorkFilterParams = {}): Promise<void> {
    const query = new URLSearchParams();
    if (params.date_preset) query.set('date_preset', params.date_preset);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    if (params.q) query.set('q', params.q);
    if (params.town) query.set('town', params.town);
    if (params.item_name) query.set('item_name', params.item_name);

    const response = await fetch(`${this.baseUrl}/analytics/pending-work-report/csv?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`CSV download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    a.download = `bandhsetu_pending_work_${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }
}

// --- STEP 6: ANALYTICS & REPORTING INTERFACES ---
export interface TrendDataPoint {
  date: string;
  pieces_given: number;
  pieces_received: number;
  wages_earned: number;
  payouts_made: number;
}

export interface RecentActivityItem {
  id: string;
  category: string;
  title: string;
  description: string;
  amount?: number | null;
  pieces?: number | null;
  date: string;
  timestamp_ist: string;
}

export interface DashboardMetricsResponse {
  total_registered_women: number;
  active_women: number;
  total_pieces_given: number;
  total_pieces_received: number;
  total_pending_pieces: number;
  total_accepted_work_value: number;
  total_wages_earned: number;
  total_advances: number;
  total_payments: number;
  total_outstanding_payable: number;
  trends: TrendDataPoint[];
  recent_activity: RecentActivityItem[];
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'number' | 'date' | 'badge' | 'text';
}

export interface ReportResponse {
  report_type: string;
  report_title: string;
  date_preset?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_records: number;
  summary_metrics: Record<string, any>;
  columns: ReportColumn[];
  rows: Record<string, any>[];
}

export interface ReportFilterParams {
  report_type: string;
  date_preset?: string;
  start_date?: string;
  end_date?: string;
  worker_id?: number;
  item_id?: number;
  search_query?: string;
}

// --- ARTISAN PENDING WORK & NON-SUBMISSION REPORT INTERFACES ---
export interface PendingWorkDistributionItem {
  distribution_id: number;
  batch_code: string;
  worker_id: number;
  artisan_name: string;
  serial_number: string;
  town: string;
  phone: string;
  issue_date: string;
  item_name: string;
  knot_style?: string | null;
  rate_per_piece: number;
  given_pcs: number;
  received_pcs: number;
  rejected_pcs: number;
  remaining_pcs: number;
  days_pending: number;
  is_zero_return: boolean;
}

export interface ArtisanPendingGroup {
  worker_id: number;
  artisan_name: string;
  serial_number: string;
  town: string;
  phone: string;
  total_given: number;
  total_received: number;
  total_rejected: number;
  total_pending: number;
  is_zero_submission: boolean;
  distributions: PendingWorkDistributionItem[];
}

export interface PendingWorkSummary {
  total_artisans_with_pending: number;
  total_pieces_given: number;
  total_pieces_received: number;
  total_pieces_pending: number;
  artisans_zero_submissions: number;
}

export interface PendingWorkReportResponse {
  start_date: string;
  end_date: string;
  date_preset?: string | null;
  summary: PendingWorkSummary;
  distributions: PendingWorkDistributionItem[];
  artisan_groups: ArtisanPendingGroup[];
  available_towns: string[];
  available_designs: string[];
}

export interface PendingWorkFilterParams {
  start_date?: string;
  end_date?: string;
  date_preset?: string;
  q?: string;
  town?: string;
  item_name?: string;
}

export const api = new ApiClient();
