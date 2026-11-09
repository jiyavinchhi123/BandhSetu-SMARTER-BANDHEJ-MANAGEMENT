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

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: 'admin' | 'manager';
  user_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  access_start_time: string;
  access_end_time: string;
  is_extended: boolean;
  extension_until?: string | null;
  server_time_ist: string;
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

// --- STEP 3: WORKER & ITEM INTERFACES ---
export interface WorkerItem {
  id: number;
  serial_number: string;
  full_name: string;
  phone: string;
  town: string;
  city: string;
  village: string;
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
  created_at: string;
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
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
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

  // Admin - Manager Controls
  async listManagers(): Promise<UserProfile[]> {
    const response = await fetch(`${this.baseUrl}/managers/`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to list managers');
    return await response.json();
  }

  async createManager(data: any): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create manager');
    return await response.json();
  }

  async lockManager(managerId: number, reason: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/lock`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to lock manager');
    return await response.json();
  }

  async unlockManager(managerId: number): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/unlock`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to unlock manager');
    return await response.json();
  }

  async toggleManagerActive(managerId: number): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/toggle-active`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to toggle manager state');
    return await response.json();
  }

  async updateManagerTiming(managerId: number, access_start_time: string, access_end_time: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/timing`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ access_start_time, access_end_time }),
    });
    if (!response.ok) throw new Error('Failed to update access timing');
    return await response.json();
  }

  async extendManagerHours(managerId: number, extend_minutes: number, reason?: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/extend-hours`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ extend_minutes, reason: reason || 'Overtime business demand' }),
    });
    if (!response.ok) throw new Error('Failed to extend hours');
    return await response.json();
  }

  async getAuditLogs(limit = 40): Promise<AuditLogItem[]> {
    const response = await fetch(`${this.baseUrl}/managers/audit-logs/all?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
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
    town: string;
    city: string;
    village: string;
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
      const err = await response.json();
      throw new Error(err.detail || 'Failed to register artisan');
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
}

export const api = new ApiClient();
