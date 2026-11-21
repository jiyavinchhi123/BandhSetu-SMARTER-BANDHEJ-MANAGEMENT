import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Tag,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { api, DashboardMetricsResponse } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Dashboard',
        message: err.message || 'Failed to fetch dashboard metrics',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const totalArtisans = metrics?.total_registered_women ?? 0;
  const activeArtisans = metrics?.active_women ?? 0;
  const piecesGiven = metrics?.total_pieces_given ?? 0;
  const piecesReceived = metrics?.total_pieces_received ?? 0;
  const piecesPending = metrics?.total_pending_pieces ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('dashboard', 'Dashboard')}</h1>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            title={t('refresh', 'Refresh')}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition-all shadow-xs shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/workers?action=add')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl shadow-xs transition-all active:scale-95 flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span>{t('register_artisan', 'Register Artisan')}</span>
          </button>
        </div>
      </div>

      {/* 4 Core Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Artisans */}
        <div
          onClick={() => navigate('/workers')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('total_artisans', 'Artisan Workers')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '—' : totalArtisans}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {activeArtisans} {t('active_registered', 'Active')}
              </span>
              <span className="text-xs text-slate-400">{t('total_registered', 'Total registered')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pieces Given */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('pieces_given', 'Pieces Given')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '—' : `${piecesGiven} ${language === 'gu' ? 'પીસ' : 'pcs'}`}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {t('pieces_given_desc', 'Total distributed to artisans')}
            </div>
          </div>
        </div>

        {/* Card 3: Pieces Received */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('pieces_received', 'Pieces Received')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {loading ? '—' : `${piecesReceived} ${language === 'gu' ? 'પીસ' : 'pcs'}`}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {t('pieces_received_desc', 'Total accepted returns')}
            </div>
          </div>
        </div>

        {/* Card 4: Pending Pieces */}
        <div
          onClick={() => navigate('/reports')}
          className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              {t('remaining_pending', 'Remaining Pending')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-900">
              {loading ? '—' : `${piecesPending} ${language === 'gu' ? 'પીસ' : 'pcs'}`}
            </div>
            <div className="text-xs font-medium text-amber-700 mt-1">
              {t('still_with_artisans', 'Still with artisans • View report')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Nav 1: Artisan Workers */}
        <div
          onClick={() => navigate('/workers')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-brand-600 transition-colors">
              {t('artisan_workers', 'Artisan Workers')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('artisan_card_desc', 'Manage artisan profiles, issue piece consignments, and record returns.')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
        </div>

        {/* Nav 2: Item Catalogue */}
        <div
          onClick={() => navigate('/items')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <Tag className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
              {t('item_catalogue', 'Item Catalogue')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('catalogue_card_desc', 'View and manage Bandhej designs, knot styles (Sarkam / Choot), and piece rates.')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
        </div>

        {/* Nav 3: Reports & Analytics */}
        <div
          onClick={() => navigate('/reports')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-rose-600 transition-colors">
              {t('reports_analytics', 'Reports & Analytics')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('reports_card_desc', 'Track unreturned work by original issue date, view pending pieces, and export reports.')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
        </div>
      </div>
    </div>
  );
};
