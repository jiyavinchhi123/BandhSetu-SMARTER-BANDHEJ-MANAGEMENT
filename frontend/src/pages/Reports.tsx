import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Users,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  Phone,
  MapPin,
  Tag,
} from 'lucide-react';
import {
  api,
  PendingWorkReportResponse,
  PendingWorkDistributionItem,
  ArtisanPendingGroup,
} from '../services/api';
import { formatIndianDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { translateEntityName } from '../utils/translations';

type DatePreset = 'this_month' | 'prev_month' | 'last_30_days' | 'all_time' | 'custom';
type ViewMode = 'detailed' | 'grouped';
type SortField = 'date_asc' | 'date_desc' | 'pending_desc' | 'name_asc';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  // Search & Filter State
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [selectedDesign, setSelectedDesign] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [sortField, setSortField] = useState<SortField>('date_asc');

  // Report Data & Loading State
  const [reportData, setReportData] = useState<PendingWorkReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Initialize dates to current month up to today on mount
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setStartDate(fmt(firstDay));
    setEndDate(fmt(today));
  }, []);

  // Fetch report data
  const fetchReport = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        const params: any = {
          date_preset: datePreset,
          q: searchQuery.trim() || undefined,
          town: selectedTown || undefined,
          item_name: selectedDesign || undefined,
        };

        if (datePreset === 'custom') {
          if (startDate) params.start_date = startDate;
          if (endDate) params.end_date = endDate;
        }

        const res = await api.getPendingWorkReport(params);
        setReportData(res);

        // Keep start & end date inputs synced with backend resolved dates if preset
        if (datePreset !== 'custom') {
          setStartDate(res.start_date);
          setEndDate(res.end_date);
        }
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Report Load Failed',
          message: err.message || 'Could not load pending work report',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [datePreset, startDate, endDate, searchQuery, selectedTown, selectedDesign, showToast]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle Preset Quick Click
  const handlePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'this_month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(fmt(first));
      setEndDate(fmt(today));
    } else if (preset === 'prev_month') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(fmt(first));
      setEndDate(fmt(last));
    } else if (preset === 'last_30_days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setStartDate(fmt(past));
      setEndDate(fmt(today));
    } else if (preset === 'all_time') {
      setStartDate('2020-01-01');
      setEndDate(fmt(today));
    }
  };

  // Sorted distributions list
  const sortedDistributions = useMemo(() => {
    if (!reportData) return [];
    const list = [...reportData.distributions];

    switch (sortField) {
      case 'date_asc':
        return list.sort((a, b) => a.issue_date.localeCompare(b.issue_date));
      case 'date_desc':
        return list.sort((a, b) => b.issue_date.localeCompare(a.issue_date));
      case 'pending_desc':
        return list.sort((a, b) => b.remaining_pcs - a.remaining_pcs);
      case 'name_asc':
        return list.sort((a, b) => a.artisan_name.localeCompare(b.artisan_name));
      default:
        return list;
    }
  }, [reportData, sortField]);

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Client-side CSV generator fallback (contains ONLY the 6 columns and rows)
  const generateClientCsv = (data: PendingWorkReportResponse) => {
    const rows = [
      [
        'Date',
        'Serial No.',
        'Artisan Name',
        'Town',
        'Remaining Pcs',
        'Name of Design',
      ],
      ...data.distributions.map((d) => [
        `"${formatIndianDate(d.issue_date)}"`,
        `"${d.serial_number}"`,
        `"${d.artisan_name.replace(/"/g, '""')}"`,
        `"${d.town}"`,
        d.remaining_pcs,
        `"${d.item_name.replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.setAttribute('download', `bandhsetu_pending_work_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  };

  // Trigger CSV Export
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params: any = {
        date_preset: datePreset,
        q: searchQuery.trim() || undefined,
        town: selectedTown || undefined,
        item_name: selectedDesign || undefined,
      };
      if (datePreset === 'custom') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      await api.downloadPendingWorkReportCsv(params);
      showToast({
        type: 'success',
        title: 'Export Downloaded',
        message: 'Pending work report has been exported to CSV.',
      });
    } catch (err: any) {
      if (reportData && reportData.distributions.length > 0) {
        generateClientCsv(reportData);
        showToast({
          type: 'success',
          title: 'Export Downloaded',
          message: 'Exported CSV from current report view.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Export Failed',
          message: err.message || 'Failed to download CSV export',
        });
      }
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary;

  return (
    <div className="space-y-6 pb-20 md:pb-6 print:p-0 print:m-0 print:space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* 1. REPORT HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#30232A] tracking-tight">
            {t('reports_analytics', 'Reports & Analytics')}
          </h1>
          <p className="text-xs text-[#786773] mt-0.5">Track artisan custody batches, issue timelines, and unreturned work</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => fetchReport(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#786773] hover:text-[#A20D38] bg-white hover:bg-[#FCEDEC] rounded-full border border-[#F0E1E1] shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#A20D38] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t('refresh', 'Refresh')}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 rounded-full border border-emerald-200 shadow-2xs transition-all active:scale-95 disabled:opacity-60"
            title="Export to CSV / Excel"
          >
            <FileSpreadsheet className={`w-4 h-4 text-emerald-700 ${exporting ? 'animate-pulse' : ''}`} />
            <span>{exporting ? 'Exporting...' : t('export_excel_csv', 'Export Excel/CSV')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#A20D38] hover:bg-[#880D32] rounded-full shadow-2xs transition-all active:scale-95"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
            <span>{t('print_report', 'Print Report')}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SEARCH & FILTER PANEL */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-[#F0E1E1] shadow-2xs p-4 sm:p-6 space-y-4 print:hidden">
        {/* Quick Date Range Preset Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-nowrap">
          <span className="text-[#786773] text-xs font-semibold mr-1 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#A20D38]" /> Preset:
          </span>
          {[
            { id: 'this_month', label: language === 'gu' ? 'આ મહિને' : 'This Month' },
            { id: 'prev_month', label: language === 'gu' ? 'ગયા મહિને' : 'Last Month' },
            { id: 'last_30_days', label: language === 'gu' ? 'છેલ્લા ૩૦ દિવસ' : 'Last 30 Days' },
            { id: 'all_time', label: language === 'gu' ? 'તમામ સમય' : 'All Time' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id as DatePreset)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                datePreset === preset.id
                  ? 'bg-[#A20D38] text-white shadow-2xs'
                  : 'bg-[#FFF9F6] text-[#786773] hover:bg-[#FCEDEC] hover:text-[#A20D38] border border-[#F0E1E1]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Inputs Grid: Date Range, Search Query, Town, Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              {t('from_issue_date', 'From Issue Date')}
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              {t('to_issue_date', 'To Issue Date')}
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              {t('artisan_serial_batch', 'Artisan / Serial / Batch')}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('search_report_placeholder', 'e.g. Simaben, WRK-0001...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>
          </div>

          {/* Town Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              {t('filter_by_town', 'Filter by Town')}
            </label>
            <select
              value={selectedTown}
              onChange={(e) => setSelectedTown(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
            >
              <option value="">{t('all_towns', 'All Towns / Villages')}</option>
              {reportData?.available_towns.map((t) => (
                <option key={t} value={t}>
                  {translateEntityName(t, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Design Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              {t('filter_by_design', 'Filter by Design')}
            </label>
            <select
              value={selectedDesign}
              onChange={(e) => setSelectedDesign(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
            >
              <option value="">{t('all_designs', 'All Designs / Items')}</option>
              {reportData?.available_designs.map((d) => (
                <option key={d} value={d}>
                  {translateEntityName(d, language)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SUMMARY CARDS: ARTISANS WITH PENDING WORK & REMAINING PCS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 print:hidden">
        {/* Card 1: Artisans with Pending Work */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-slate-900 leading-tight truncate">
              {summary?.total_artisans_with_pending ?? 0}
            </div>
            <div className="text-xs text-slate-500 font-medium">{t('artisans_with_pending_work', 'Artisans with Pending Work')}</div>
          </div>
        </div>

        {/* Card 2: Total Remaining Pieces */}
        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-amber-900 leading-tight truncate">
              {summary?.total_pieces_pending ?? 0} <span className="text-xs font-normal text-amber-800">{language === 'gu' ? 'પીસ' : 'pcs'}</span>
            </div>
            <div className="text-xs text-amber-800 font-medium">{t('total_remaining_pieces', 'Total Remaining Pieces')}</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. VIEW CONTROLS & TABLE HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 print:hidden">
        {/* Toggle between Detailed Table and Grouped View */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'detailed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('all_pending_distributions', 'All Pending Distributions')} ({sortedDistributions.length})
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'grouped'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('group_by_artisan', 'Group by Artisan')} ({reportData?.artisan_groups.length ?? 0})
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{t('sort_by_label', 'Sort by:')}</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="date_asc">{t('sort_oldest_first', 'Oldest Issue Date (Ascending)')}</option>
            <option value="date_desc">{t('sort_newest_first', 'Newest Issue Date (Descending)')}</option>
            <option value="pending_desc">{t('sort_pending_desc', 'Highest Pending Pcs First')}</option>
            <option value="name_asc">{t('sort_name_asc', 'Artisan Name (A-Z)')}</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. SEARCH RESULTS — DETAILED TABLE VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'detailed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-brand-600 mb-2" />
              <p className="text-sm">Calculating pending pieces against distribution records...</p>
            </div>
          ) : sortedDistributions.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Pending Work Found!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                All consignments issued during this period have been fully submitted and cleared, or no work distributions match the selected filters.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3 px-4">{t('table_date', 'Date')}</th>
                      <th className="py-3 px-3">{t('table_serial_no', 'Serial No.')}</th>
                      <th className="py-3 px-4">{t('table_artisan_name', 'Artisan Name')}</th>
                      <th className="py-3 px-3">{t('table_town', 'Town')}</th>
                      <th className="py-3 px-4 text-right">{t('table_remaining_pcs', 'Remaining Pcs')}</th>
                      <th className="py-3 px-4">{t('table_name_of_design', 'Name of Design')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedDistributions.map((row) => (
                      <tr
                        key={row.distribution_id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Date */}
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {formatIndianDate(row.issue_date)}
                        </td>

                        {/* 2. Serial No. */}
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/60">
                            {row.serial_number}
                          </span>
                        </td>

                        {/* 3. Artisan Name as clickable link to their profile */}
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <Link
                            to={`/workers/${row.worker_id}`}
                            className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-800 hover:underline group-hover:text-brand-700 transition-colors"
                            title="Open Artisan Profile & Khata Ledger"
                          >
                            <span>{translateEntityName(row.artisan_name, language)}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>

                        {/* 4. Town */}
                        <td className="py-3 px-3 text-slate-600">{translateEntityName(row.town, language)}</td>

                        {/* 5. Remaining Pcs */}
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200/80">
                            {row.remaining_pcs} {language === 'gu' ? 'પીસ' : 'pcs'}
                          </span>
                        </td>

                        {/* 6. Name of Design */}
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-900">{translateEntityName(row.item_name, language)}</span>
                          {row.knot_style && row.knot_style !== 'Standard' && (
                            <span className="text-[11px] text-slate-400 ml-1.5 font-normal">
                              ({translateEntityName(row.knot_style, language)})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Table Footer with Summary Subtotal */}
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={4} className="py-3.5 px-4 text-slate-700">
                        {language === 'gu'
                          ? `કુલ બાકી માલ (${sortedDistributions.length} નોંધ):`
                          : `Total Across ${sortedDistributions.length} Pending Consignments:`}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-amber-900 text-sm">
                        {sortedDistributions.reduce((acc, r) => acc + r.remaining_pcs, 0)} {language === 'gu' ? 'પીસ' : 'pcs'}
                      </td>
                      <td className="py-3.5 px-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards View (Optimized for Phones) */}
              <div className="grid grid-cols-1 gap-3 md:hidden p-3 bg-slate-50/60 divide-y divide-slate-100">
                {sortedDistributions.map((row) => (
                  <div
                    key={row.distribution_id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        {formatIndianDate(row.issue_date)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200">
                        {row.remaining_pcs} {language === 'gu' ? 'પીસ બાકી' : 'pcs pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <Link
                        to={`/workers/${row.worker_id}`}
                        className="flex items-center gap-2 group text-brand-600 hover:text-brand-800"
                      >
                        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                          {row.serial_number}
                        </span>
                        <span className="font-bold text-slate-900 text-sm group-hover:underline">
                          {translateEntityName(row.artisan_name, language)}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-xs text-slate-500">{translateEntityName(row.town, language)}</span>
                    </div>

                    <div className="text-xs text-slate-800 pt-1 flex items-center justify-between">
                      <span className="font-medium text-slate-900">{translateEntityName(row.item_name, language)}</span>
                      {row.knot_style && row.knot_style !== 'Standard' && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {translateEntityName(row.knot_style, language)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 text-center text-xs font-bold text-amber-900">
                  {language === 'gu'
                    ? `કુલ બાકી પીસ: ${sortedDistributions.reduce((acc, r) => acc + r.remaining_pcs, 0)} પીસ`
                    : `Total Pending Pieces: ${sortedDistributions.reduce((acc, r) => acc + r.remaining_pcs, 0)} pcs`}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. SEARCH RESULTS — ARTISAN-WISE GROUPED VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-brand-600 mb-2" />
              <p className="text-sm">Grouping pending work by artisan...</p>
            </div>
          ) : reportData?.artisan_groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Pending Work Found!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                All artisans have cleared their consignments for the selected period.
              </p>
            </div>
          ) : (
            reportData?.artisan_groups.map((group) => (
              <div
                key={group.worker_id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Artisan Header Bar */}
                <div className="bg-slate-50/90 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      to={`/workers/${group.worker_id}`}
                      className="text-base font-bold text-slate-900 hover:text-brand-600 hover:underline flex items-center gap-1.5 transition-colors"
                      title="Click to view worker profile"
                    >
                      <span>{translateEntityName(group.artisan_name, language)}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
                    </Link>

                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                      {group.serial_number}
                    </span>

                    <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{translateEntityName(group.town, language)}</span>
                    </span>

                    {group.phone && (
                      <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{group.phone}</span>
                      </span>
                    )}

                    {group.is_zero_submission && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                        {language === 'gu' ? 'ઝીરો જમા' : 'Zero Submissions'}
                      </span>
                    )}
                  </div>

                  {/* Artisan Subtotal Summary Tag */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-xs text-slate-500">
                      {language === 'gu' ? 'આપેલ:' : 'Given:'} <strong className="text-slate-800">{group.total_given}</strong> | {language === 'gu' ? 'જમા:' : 'Received:'}{' '}
                      <strong className="text-emerald-700">{group.total_received}</strong>
                    </div>
                    <div className="px-3 py-1 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20">
                      {language === 'gu' ? `કુલ બાકી: ${group.total_pending} પીસ` : `Total Pending: ${group.total_pending} pcs`}
                    </div>
                  </div>
                </div>

                {/* Sub-table for this Artisan's Pending Distributions */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[550px]">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                        <th className="py-2.5 px-4">{language === 'gu' ? 'આપ્યા તારીખ' : 'Date Given'}</th>
                        <th className="py-2.5 px-3">{t('col_design_name', 'Design / Item')}</th>
                        <th className="py-2.5 px-3">{language === 'gu' ? 'બેચ કોડ' : 'Batch Code'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'gu' ? 'આપેલ' : 'Given'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'gu' ? 'જમા' : 'Received'}</th>
                        <th className="py-2.5 px-4 text-right">{language === 'gu' ? 'બાકી' : 'Pending'}</th>
                        <th className="py-2.5 px-4 text-center">{t('col_status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.distributions.map((dist) => (
                        <tr key={dist.distribution_id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-medium text-slate-800">
                            {formatIndianDate(dist.issue_date)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {translateEntityName(dist.item_name, language)}
                            {dist.knot_style && dist.knot_style !== 'Standard' && (
                              <span className="text-[10px] font-normal text-slate-400 ml-1.5">
                                ({translateEntityName(dist.knot_style, language)})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {dist.batch_code}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">{dist.given_pcs}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                            {dist.received_pcs}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-amber-800">
                            {dist.remaining_pcs} {language === 'gu' ? 'પીસ' : 'pcs'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {dist.is_zero_return ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                {language === 'gu' ? '૦ જમા' : '0 returned'}
                              </span>
                            ) : dist.days_pending > 14 ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                {language === 'gu' ? `મુદત વીતી (${dist.days_pending}દિ)` : `Overdue (${dist.days_pending}d)`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">{dist.days_pending}{language === 'gu' ? ' દિવસ' : 'd'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-50/40 font-semibold text-slate-800 border-t border-amber-200/60">
                        <td colSpan={3} className="py-2 px-4 text-amber-900 text-xs">
                          {language === 'gu'
                            ? `${translateEntityName(group.artisan_name, language)} પાસે કુલ બાકી:`
                            : `Total pending with ${group.artisan_name}:`}
                        </td>
                        <td className="py-2 px-3 text-right">{group.total_given}</td>
                        <td className="py-2 px-3 text-right text-emerald-700">{group.total_received}</td>
                        <td className="py-2 px-4 text-right font-bold text-amber-900 text-xs">
                          {group.total_pending} {language === 'gu' ? 'પીસ' : 'pieces'}
                        </td>
                        <td className="py-2 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
