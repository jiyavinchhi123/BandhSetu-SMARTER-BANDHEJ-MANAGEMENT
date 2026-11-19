import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Package,
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  IndianRupee,
  Coins,
  Wallet,
  TrendingUp,
  BarChart3,
  Search,
  UserPlus,
  FileCheck,
  RefreshCw,
  AlertCircle,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  api,
  DashboardMetricsResponse,
  TrendDataPoint,
  RecentActivityItem,
} from '../services/api';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from '../components/ui';
import { formatINR, formatIndianDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Dashboard Error',
        message: err.message || 'Failed to load business analytics.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Quick Action navigation handlers
  const handleQuickAction = (route: string) => {
    navigate(route);
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500 animate-pulse">
          Aggregating BandhSetu business metrics and ledger data...
        </p>
      </div>
    );
  }

  const m = metrics || {
    total_registered_women: 0,
    active_women: 0,
    total_pieces_given: 0,
    total_pieces_received: 0,
    total_pending_pieces: 0,
    total_accepted_work_value: 0,
    total_wages_earned: 0,
    total_advances: 0,
    total_payments: 0,
    total_outstanding_payable: 0,
    trends: [],
    recent_activity: [],
  };

  const activePercent =
    m.total_registered_women > 0
      ? Math.round((m.active_women / m.total_registered_women) * 100)
      : 0;

  const returnPercent =
    m.total_pieces_given > 0
      ? Math.round((m.total_pieces_received / m.total_pieces_given) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* 1. WELCOME BANNER & REFRESH BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Sparkles className="w-64 h-64 text-white" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700/60 text-emerald-200 border border-emerald-500/30">
                {user?.role === 'admin' ? 'Owner / Admin Portal' : 'Manager Operations Hub'}
              </span>
              <span className="text-xs text-emerald-200/80">
                Asia/Kolkata (IST)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              BandhSetu Executive Dashboard
            </h1>
            <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
              Real-time ledger overview for 200–500 Bandhej artisans across Jamnagar, Bhuj, and Mandvi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-sm border border-white/10 transition-all touch-manipulation min-h-[44px]"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Sync Live'}</span>
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/reports')}
              className="bg-white text-emerald-900 hover:bg-emerald-50 border-white text-xs font-semibold min-h-[44px]"
            >
              <BarChart3 className="w-4 h-4 mr-1.5 text-emerald-800" />
              Full Reports
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. QUICK ACTION BUTTONS (Touch targets >= 44px) */}
      {/* ------------------------------------------------------------- */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 px-0.5">
          Operational Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* Action 1: Add Worker */}
          <button
            onClick={() => handleQuickAction('/workers?action=add')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-white hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-300 transition-all shadow-sm active:scale-95 min-h-[76px] text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-800 leading-tight">Add Worker</span>
            <span className="text-[10px] text-gray-400">Register artisan</span>
          </button>

          {/* Action 2: Search Worker */}
          <button
            onClick={() => handleQuickAction('/workers')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 transition-all shadow-sm active:scale-95 min-h-[76px] text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-800 leading-tight">Search Worker</span>
            <span className="text-[10px] text-gray-400">By serial or name</span>
          </button>

          {/* Action 3: Give Work */}
          <button
            onClick={() => handleQuickAction('/batches?tab=give-work')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-white hover:bg-indigo-50/50 border border-gray-200 hover:border-indigo-300 transition-all shadow-sm active:scale-95 min-h-[76px] text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <PackagePlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-800 leading-tight">Give Work</span>
            <span className="text-[10px] text-gray-400">Issue fabric debit</span>
          </button>

          {/* Action 4: Receive Work */}
          <button
            onClick={() => handleQuickAction('/batches?tab=receive-work')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-white hover:bg-teal-50/50 border border-gray-200 hover:border-teal-300 transition-all shadow-sm active:scale-95 min-h-[76px] text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-800 leading-tight">Receive Work</span>
            <span className="text-[10px] text-gray-400">QC & wage credit</span>
          </button>

          {/* Action 5: Record Advance */}
          <button
            onClick={() => handleQuickAction('/payments?tab=advance')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-white hover:bg-amber-50/50 border border-gray-200 hover:border-amber-300 transition-all shadow-sm active:scale-95 min-h-[76px] text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-800 leading-tight">Record Advance</span>
            <span className="text-[10px] text-gray-400">Cash / UPI debit</span>
          </button>

          {/* Action 6: Make Payment */}
          <button
            onClick={() => handleQuickAction('/payments?tab=payout')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-white hover:bg-purple-50/50 border border-gray-200 hover:border-purple-300 transition-all shadow-sm active:scale-95 min-h-[76px] text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-800 leading-tight">Make Payment</span>
            <span className="text-[10px] text-gray-400">Wage payout</span>
          </button>

          {/* Action 7: View Reports */}
          <button
            onClick={() => handleQuickAction('/reports')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-white hover:bg-rose-50/50 border border-gray-200 hover:border-rose-300 transition-all shadow-sm active:scale-95 min-h-[76px] text-center group col-span-2 sm:col-span-1"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-800 leading-tight">View Reports</span>
            <span className="text-[10px] text-gray-400">10 Analytics tabs</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. THE 10 CORE DASHBOARD CARDS */}
      {/* ------------------------------------------------------------- */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 px-0.5">
          10 Core Business & Ledger Indicators
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total Registered Women */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-gray-600">Registered Women</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                {m.total_registered_women}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Total registered artisan profiles
              </p>
            </div>
          </div>

          {/* Card 2: Active Women */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-gray-600">Active Women</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700 tracking-tight flex items-baseline gap-2">
                {m.active_women}
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {activePercent}%
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Eligible for work distribution
              </p>
            </div>
          </div>

          {/* Card 3: Total Pieces Given */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-gray-600">Pieces Given (Debit)</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-900 tracking-tight">
                {m.total_pieces_given.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Cumulative pieces dispatched
              </p>
            </div>
          </div>

          {/* Card 4: Total Pieces Received */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-gray-600">Pieces Received (Credit)</span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-700 tracking-tight flex items-baseline gap-2">
                {m.total_pieces_received.toLocaleString('en-IN')}
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                  {returnPercent}%
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Accepted finished tying work
              </p>
            </div>
          </div>

          {/* Card 5: Total Pending Pieces */}
          <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm flex flex-col justify-between bg-gradient-to-b from-amber-50/30 to-white">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-amber-800">Pending Pieces</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-700 tracking-tight">
                {m.total_pending_pieces.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-amber-600/90 mt-0.5 font-medium">
                Active in artisan custody
              </p>
            </div>
          </div>

          {/* Card 6: Total Accepted Work Value */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-gray-600">Accepted Work Value</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {formatINR(m.total_accepted_work_value)}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Gross value of passed craft
              </p>
            </div>
          </div>

          {/* Card 7: Total Wages Earned */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-gray-600">Total Wages Earned</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
                {formatINR(m.total_wages_earned)}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Credit to women money ledger
              </p>
            </div>
          </div>

          {/* Card 8: Total Advances */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-gray-600">Total Advances</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
                {formatINR(m.total_advances)}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Cash / UPI advances disbursed
              </p>
            </div>
          </div>

          {/* Card 9: Total Payments */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-medium text-gray-600">Total Payouts Made</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-purple-700 tracking-tight">
                {formatINR(m.total_payments)}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Settlements & wage payments
              </p>
            </div>
          </div>

          {/* Card 10: Total Outstanding Payable */}
          <div className="bg-emerald-50/60 rounded-xl p-4 border-2 border-emerald-500/40 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold text-emerald-900">Total Outstanding</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-900 tracking-tight">
                {formatINR(m.total_outstanding_payable)}
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                Net remaining payable to women
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. 7-DAY OPERATIONAL & FINANCIAL TRENDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Visualizer (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                7-Day Operations & Financial Activity
              </h3>
              <p className="text-xs text-gray-500">
                Daily pieces issued vs. returned, and wages earned vs. cash disbursed
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                Given
              </span>
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Received
              </span>
            </div>
          </div>

          {/* 7-Day Trend Chart Bars */}
          <div className="space-y-3.5 pt-2">
            {m.trends.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No activity recorded in the past 7 days.
              </p>
            ) : (
              m.trends.map((t, idx) => {
                const maxPieces = Math.max(
                  ...m.trends.map((x) => Math.max(x.pieces_given, x.pieces_received, 1))
                );
                const givenWidth = Math.min(100, Math.round((t.pieces_given / maxPieces) * 100));
                const receivedWidth = Math.min(100, Math.round((t.pieces_received / maxPieces) * 100));

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 w-16">{t.date}</span>
                      <div className="flex items-center gap-4 text-[11px] text-gray-500">
                        <span>
                          <strong className="text-indigo-700">{t.pieces_given}</strong> given
                        </span>
                        <span>
                          <strong className="text-emerald-700">{t.pieces_received}</strong> received
                        </span>
                        <span>
                          Earned:{' '}
                          <strong className="text-gray-800">{formatINR(t.wages_earned)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(givenWidth, 2)}%` }}
                        />
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(receivedWidth, 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. RECENT ACTIVITY FEED (1 Column) */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Live Operational Feed
              </h3>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Recent 10 Events
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {m.recent_activity.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">
                  No recent ledger transactions.
                </p>
              ) : (
                m.recent_activity.map((act) => {
                  let badgeColor = 'bg-blue-100 text-blue-700';
                  if (act.category === 'RECEIVE') badgeColor = 'bg-emerald-100 text-emerald-700';
                  if (act.category === 'ADVANCE') badgeColor = 'bg-amber-100 text-amber-700';
                  if (act.category === 'PAYOUT') badgeColor = 'bg-purple-100 text-purple-700';

                  return (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-white transition-all text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badgeColor}`}
                        >
                          {act.category}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {act.date} · {act.timestamp_ist}
                        </span>
                      </div>
                      <div className="font-medium text-gray-800 line-clamp-1">{act.title}</div>
                      <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {act.description}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                        {act.pieces !== null && act.pieces !== undefined && (
                          <span className="text-indigo-600">{act.pieces} pcs</span>
                        )}
                        {act.amount !== null && act.amount !== undefined && (
                          <span className="text-emerald-700 ml-auto">
                            {formatINR(act.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate('/reports?tab=daily-distribution')}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors min-h-[44px]"
            >
              <span>Audit All Daily Activity Logs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
