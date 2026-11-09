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
      (error as any).detail = data.detail;
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
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to list managers');
    }
    return await response.json();
  }

  async createManager(data: {
    email: string;
    phone?: string;
    full_name: string;
    password: string;
    access_start_time: string;
    access_end_time: string;
  }): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to create manager');
    }
    return await response.json();
  }

  async lockManager(managerId: number, reason: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/lock`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to lock manager');
    }
    return await response.json();
  }

  async unlockManager(managerId: number): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/unlock`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to unlock manager');
    }
    return await response.json();
  }

  async toggleManagerActive(managerId: number): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/toggle-active`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to toggle manager state');
    }
    return await response.json();
  }

  async updateManagerTiming(managerId: number, access_start_time: string, access_end_time: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/timing`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ access_start_time, access_end_time }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to update access timing');
    }
    return await response.json();
  }

  async extendManagerHours(managerId: number, extend_minutes: number, reason?: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/managers/${managerId}/extend-hours`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ extend_minutes, reason: reason || 'Overtime business demand' }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to extend hours');
    }
    return await response.json();
  }

  async getAuditLogs(limit = 40): Promise<AuditLogItem[]> {
    const response = await fetch(`${this.baseUrl}/managers/audit-logs/all?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to fetch audit logs');
    }
    return await response.json();
  }
}

export const api = new ApiClient();
