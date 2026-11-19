import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Users,
  Package,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Wallet,
  Clock,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  api,
  ReportResponse,
  ReportColumn,
  ReportFilterParams,
} from '../services/api';
import { Button, Card, Badge, LoadingSpinner, EmptyState } from '../components/ui';
import { formatINR, formatIndianDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

interface ReportTabConfig {
  id: string;
  name: string;
  shortName: string;
  category: 'operational' | 'financial' | 'summary';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const REPORT_TABS: ReportTabConfig[] = [
  {
    id: 'worker-wise',
    name: 'Worker-Wise Business Report',
    shortName: 'Artisans',
    category: 'summary',
    icon: Users,
    description: 'Comprehensive breakdown of pieces issued, returned, wages, and balances per artisan.',
  },
  {
    id: 'item-wise',
    name: 'Item Design Performance',
    shortName: 'Item Catalogue',
    category: 'operational',
    icon: Layers,
    description: 'Production velocity, tying costs, and completion volume grouped by fabric item.',
  },
  {
    id: 'daily-distribution',
    name: 'Daily Work Distribution',
    shortName: 'Distributions',
    category: 'operational',
    icon: ArrowUpRight,
    description: 'Daily consignment dispatches, artisan assignments, and material debit log.',
  },
  {
    id: 'daily-returns',
    name: 'Daily Returns & Quality QC',
    shortName: 'Returns & QC',
    category: 'operational',
    icon: ArrowDownLeft,
    description: 'Daily accepted tying pieces, rejected pieces, and earned wage credits.',
  },
  {
    id: 'pending-work',
    name: 'Active Pending Work Consignments',
    shortName: 'Pending Work',
    category: 'operational',
    icon: Clock,
    description: 'Pieces currently in artisan custody, snapshot piece rates, and overdue flags.',
  },
  {
    id: 'daily-wages',
    name: 'Daily Wages Earned',
    shortName: 'Daily Wages',
    category: 'financial',
    icon: Sparkles,
    description: 'Daily verified tying wage accruals created from accepted piece returns.',
  },
  {
    id: 'advances',
    name: 'Advances & Cash Withdrawals',
    shortName: 'Advances',
    category: 'financial',
    icon: Coins,
    description: 'All cash and UPI advance debits with approval references and remarks.',
  },
  {
    id: 'payments',
    name: 'Wage Payouts & Disbursements',
    shortName: 'Payouts',
    category: 'financial',
    icon: Wallet,
    description: 'Official wage settlements and payment register by payment mode.',
  },
  {
    id: 'outstanding-balances',
    name: 'Outstanding Worker Balances',
    shortName: 'Balances',
    category: 'financial',
    icon: IndianRupee,
    description: 'Artisans with net payable balances pending settlement.',
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Business Summary',
    shortName: 'Monthly P&L',
    category: 'summary',
    icon: FileText,
    description: 'Month-by-month high level rollup of fabric pieces, wages, and payouts.',
  },
];

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Report Tab
  const initialTab = searchParams.get('tab') || 'worker-wise';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Filters State
  const [datePreset, setDatePreset] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Report Data State
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && REPORT_TABS.some((t) => t.id === tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: ReportFilterParams = {
        report_type: activeTab,
        date_preset: datePreset !== 'all' ? datePreset : undefined,
        start_date: datePreset === 'custom' && startDate ? startDate : undefined,
        end_date: datePreset === 'custom' && endDate ? endDate : undefined,
        search_query: debouncedSearch.trim() || undefined,
      };

      const data = await api.getReportData(params);
      setReportData(data);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Report',
        message: err.message || 'Could not fetch report data.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, datePreset, startDate, endDate, debouncedSearch, showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle CSV Download
  const handleDownloadCsv = () => {
    const params: ReportFilterParams = {
      report_type: activeTab,
      date_preset: datePreset !== 'all' ? datePreset : undefined,
      start_date: datePreset === 'custom' && startDate ? startDate : undefined,
      end_date: datePreset === 'custom' && endDate ? endDate : undefined,
      search_query: debouncedSearch.trim() || undefined,
    };
    const downloadUrl = api.getReportCsvUrl(params);
    window.open(downloadUrl, '_blank');
    showToast({
      type: 'success',
      title: 'Export Started',
      message: 'Downloading spreadsheet file...',
    });
  };

  // Handle Print Dialog
  const handlePrint = () => {
    window.print();
  };

  // Format cell values
  const renderCellValue = (val: any, format?: string) => {
    if (val === null || val === undefined || val === '') return '—';

    if (format === 'currency') {
      const num = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(num)) return '₹0.00';
      return formatINR(num);
    }

    if (format === 'number') {
      const num = typeof val === 'number' ? val : parseInt(val, 10);
      return isNaN(num) ? '0' : num.toLocaleString('en-IN');
    }

    if (format === 'date') {
      return formatIndianDate(String(val));
    }

    if (format === 'badge') {
      const str = String(val);
      let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';
      if (str === 'Active' || str === 'Settled' || str === 'Completed') variant = 'success';
      if (str === 'In Progress' || str === 'Issued' || str === 'OVERDUE') variant = 'warning';
      if (str === 'Inactive' || str === 'Reversed') variant = 'danger';

      return (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            variant === 'success'
              ? 'bg-emerald-100 text-emerald-800'
              : variant === 'warning'
              ? 'bg-amber-100 text-amber-800'
              : variant === 'danger'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {str}
        </span>
      );
    }

    return String(val);
  };

  const currentTabConfig = REPORT_TABS.find((t) => t.id === activeTab) || REPORT_TABS[0];
  const TabIcon = currentTabConfig.icon;

  return (
    <div className="space-y-6 pb-16">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER & ACTION TOOLBAR (Hidden during print) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Business Intelligence & Audits
            </span>
            <span className="text-xs text-gray-500">10 Report Sections</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-emerald-700" />
            Reports & Business Analytics
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            Real-time material debit-credit tracking, artisan wage balances, quality control, and executive summaries.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            disabled={isLoading}
            className="text-xs font-semibold min-h-[44px]"
            title="Refresh current report"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={isLoading || !reportData || reportData.total_records === 0}
            className="text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 min-h-[44px]"
            title="Download CSV for Excel"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-700" />
            Export Excel / CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="text-xs font-semibold min-h-[44px]"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print / PDF View
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. PRINT-ONLY HEADER (Visible only during printing) */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-wide uppercase">
              BandhSetu — Artisan Management System
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              Bandhej Artisan Network · Jamnagar / Bhuj / Kutch, Gujarat
            </p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p className="font-semibold text-gray-900">{reportData?.report_title}</p>
            <p>Printed on: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            {reportData?.start_date && (
              <p>Period: {reportData.start_date} to {reportData.end_date || 'Present'}</p>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. REPORT SECTION NAVIGATION TABS (Horizontal Scroll on Mobile) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 print:hidden">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
          {REPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all touch-manipulation min-h-[44px] ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{tab.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. FILTER CONTROLS BAR (Hidden during print) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 print:hidden space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Period:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation min-h-[36px] ${
                  datePreset === p.id
                    ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Dynamic Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, serial no, or item..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white min-h-[40px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              className="text-xs h-[36px]"
            >
              Apply Dates
            </Button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. SUMMARY KPI STRIP (Aggregate Metrics for Active Report) */}
      {/* ------------------------------------------------------------- */}
      {reportData && reportData.summary_metrics && Object.keys(reportData.summary_metrics).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Key Report Totals
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(reportData.summary_metrics).map(([key, value]) => {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const isCurrency =
                key.includes('wage') ||
                key.includes('earned') ||
                key.includes('advance') ||
                key.includes('paid') ||
                key.includes('payout') ||
                key.includes('balance') ||
                key.includes('amount') ||
                key.includes('value') ||
                key.includes('disbursed');

              return (
                <div key={key} className="p-2.5 rounded-lg bg-gray-50/80 border border-gray-100">
                  <div className="text-[11px] text-gray-500 font-medium truncate">{label}</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 mt-0.5 truncate">
                    {isCurrency && typeof value === 'number'
                      ? formatINR(value)
                      : typeof value === 'number'
                      ? value.toLocaleString('en-IN')
                      : String(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TABULAR REPORT PRESENTATION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Title Bar */}
        <div className="p-4 bg-gray-50/60 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <TabIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{reportData?.report_title}</h2>
              <p className="text-xs text-gray-500">{currentTabConfig.description}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Showing <strong className="text-gray-900">{reportData?.total_records || 0}</strong> record(s)
          </div>
        </div>

        {/* Content State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-medium text-gray-500 animate-pulse">
              Generating {currentTabConfig.name}...
            </p>
          </div>
        ) : !reportData || reportData.rows.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<TabIcon className="w-7 h-7" />}
              title="No Records Found"
              description={`No transaction or master records matched the selected period (${datePreset}) and search criteria.`}
              actionLabel="Reset Search Filter"
              onAction={() => {
                setSearchQuery('');
                setDatePreset('this_month');
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider text-[11px]">
                  {reportData.columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 whitespace-nowrap ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-emerald-50/30 transition-colors odd:bg-white even:bg-gray-50/40"
                  >
                    {reportData.columns.map((col) => {
                      const val = row[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 whitespace-nowrap text-gray-800 ${
                            col.align === 'right'
                              ? 'text-right font-mono'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {renderCellValue(val, col.format)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
