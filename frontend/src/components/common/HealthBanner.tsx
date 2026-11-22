import React from 'react';
import { RefreshCw, Server, AlertCircle } from 'lucide-react';
import { HealthResponse } from '../../services/api';

interface HealthBannerProps {
  health: HealthResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const HealthBanner: React.FC<HealthBannerProps> = ({
  health,
  isLoading,
  onRefresh,
}) => {
  const isHealthy = health?.status === 'healthy';
  const isDegraded = health?.status === 'degraded';
  const isOffline = !health || health.status === 'offline';

  return (
    <div
      className={`rounded-full px-4 py-1.5 flex items-center justify-between gap-3 text-xs border shadow-2xs transition-all ${
        isHealthy
          ? 'bg-white border-[#F0E1E1] text-[#30232A]'
          : isDegraded
          ? 'bg-amber-50/80 border-amber-200 text-amber-900'
          : 'bg-rose-50/80 border-rose-200 text-rose-900'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isHealthy ? 'bg-emerald-400' : isDegraded ? 'bg-amber-400' : 'bg-rose-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isHealthy ? 'bg-emerald-500' : isDegraded ? 'bg-amber-500' : 'bg-rose-500'
            }`}
          />
        </span>

        <div className="flex items-center gap-1.5 truncate text-[11px] font-medium text-[#786773]">
          <span className="font-semibold text-[#30232A]">FastAPI:</span>
          <span>
            {isHealthy
              ? 'Operational'
              : isDegraded
              ? 'Degraded'
              : 'Offline'}
          </span>
          {health?.timestamp_ist && (
            <span className="hidden sm:inline text-[#786773]/70 ml-1">
              • {health.timestamp_ist}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1 font-semibold px-2 py-1 rounded-lg bg-white/70 hover:bg-white text-slate-700 hover:text-slate-900 shadow-2xs border border-black/5 transition-colors disabled:opacity-50"
          title="Re-check FastAPI backend health status"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden xs:inline">Check</span>
        </button>
      </div>
    </div>
  );
};

