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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async checkHealth(): Promise<HealthResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data: HealthResponse = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        status: 'offline',
        project: 'Bandhej Backend API',
        version: '1.0.0',
        environment: 'offline',
        timestamp_ist: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        database: {
          connected: false,
          dialect: 'none',
          message: error instanceof Error ? error.message : 'Failed to reach FastAPI backend server',
        },
      };
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const api = new ApiClient();

