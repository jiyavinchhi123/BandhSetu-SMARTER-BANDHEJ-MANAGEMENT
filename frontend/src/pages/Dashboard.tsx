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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Hero Banner */}
      <div className="bg-white rounded-3xl border border-[#F0E1E1] p-6 sm:p-10 shadow-2xs relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl z-10">
          <h1 className="font-serif font-bold text-[#A20D38] text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none">
            BandhSetu
          </h1>
          <h2 className="font-serif text-lg sm:text-2xl text-[#30232A] font-semibold tracking-normal pt-1">
            Smarter Bandhej Management
          </h2>
          <div className="w-16 h-0.5 bg-[#A20D38] my-2" />
          <p className="text-xs sm:text-sm text-[#786773] leading-relaxed pt-1">
            {language === 'gu'
              ? '૨૦૦-૫૦૦ કારીગર બહેનોનું સરળ અને આધુનિક સંચાલન.'
              : 'Manage 200–500 home-based women artisans'}
          </p>
        </div>

        {/* Bandhani Fabric Draped Image Banner */}
        <div className="w-full md:w-96 h-40 sm:h-44 rounded-2xl overflow-hidden shrink-0 border border-[#F0E1E1] shadow-xs relative">
          <img
            src="/bandhani-fabric.png"
            alt="Bandhani Tied-Resist Fabric"
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/10 pointer-events-none" />
        </div>
      </div>

      {/* 2. Operations Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#30232A]">
            {t('dashboard_overview', 'Operations Overview')}
          </h2>
          <p className="text-xs text-[#786773] mt-0.5">
            {language === 'gu'
              ? 'કારીગરો, કારખાનાની સામગ્રી અને હિસાબનું સમીક્ષા કેન્દ્ર'
              : 'Real-time overview of active artisans, custody pieces, and workshop operations'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            title={t('refresh', 'Refresh')}
            className="p-2.5 bg-white hover:bg-[#FCEDEC] border border-[#F0E1E1] text-[#786773] hover:text-[#A20D38] rounded-full transition-all shadow-2xs shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/workers?action=add')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#A20D38] hover:bg-[#880D32] text-white font-medium text-sm rounded-full shadow-xs transition-all active:scale-95 flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span>{t('register_artisan', 'Register Artisan')}</span>
          </button>
        </div>
      </div>

      {/* 3. 4 Core Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Artisans */}
        <div
          onClick={() => navigate('/workers')}
          className="bg-white p-6 rounded-3xl border border-[#F0E1E1] shadow-2xs hover:border-[#E57D89] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#786773] uppercase tracking-wider">
              {t('total_artisans', 'Artisan Workers')}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#FCEDEC] text-[#A20D38] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-bold text-[#30232A]">
              {loading ? '—' : totalArtisans}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {activeArtisans} {t('active_registered', 'Active')}
              </span>
              <span className="text-xs text-[#786773]">{t('total_registered', 'Total registered')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pieces Given */}
        <div className="bg-white p-6 rounded-3xl border border-[#F0E1E1] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#786773] uppercase tracking-wider">
              {t('pieces_given', 'Pieces Given')}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#FCEDEC] text-[#880D32] flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-bold text-[#30232A]">
              {loading ? '—' : `${piecesGiven} ${language === 'gu' ? 'પીસ' : 'pcs'}`}
            </div>
            <div className="text-xs text-[#786773] mt-1">
              {t('pieces_given_desc', 'Total distributed to artisans')}
            </div>
          </div>
        </div>

        {/* Card 3: Pieces Received */}
        <div className="bg-white p-6 rounded-3xl border border-[#F0E1E1] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#786773] uppercase tracking-wider">
              {t('pieces_received', 'Pieces Received')}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-bold text-emerald-800">
              {loading ? '—' : `${piecesReceived} ${language === 'gu' ? 'પીસ' : 'pcs'}`}
            </div>
            <div className="text-xs text-[#786773] mt-1">
              {t('pieces_received_desc', 'Total accepted returns')}
            </div>
          </div>
        </div>

        {/* Card 4: Pending Pieces */}
        <div
          onClick={() => navigate('/reports')}
          className="bg-white p-6 rounded-3xl border border-[#F0E1E1] shadow-2xs hover:border-[#E57D89] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A20D38] uppercase tracking-wider">
              {t('remaining_pending', 'Remaining Pending')}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#FCEDEC] text-[#A20D38] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-bold text-[#A20D38]">
              {loading ? '—' : `${piecesPending} ${language === 'gu' ? 'પીસ' : 'pcs'}`}
            </div>
            <div className="text-xs font-medium text-[#786773] mt-1">
              {t('still_with_artisans', 'Still with artisans • View report')}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Sections Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        {/* Nav 1: Artisan Workers */}
        <div
          onClick={() => navigate('/workers')}
          className="bg-white p-6 rounded-3xl border border-[#F0E1E1] shadow-2xs hover:border-[#E57D89] hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEDEC] text-[#A20D38] flex items-center justify-center mb-1">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#30232A] group-hover:text-[#A20D38] transition-colors">
              {t('artisan_workers', 'Artisan Workers')}
            </h3>
            <p className="text-xs text-[#786773]">
              {t('artisan_card_desc', 'Manage artisan profiles, issue piece consignments, and record returns.')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#F0E1E1] group-hover:text-[#A20D38] group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
        </div>

        {/* Nav 2: Item Catalogue */}
        <div
          onClick={() => navigate('/items')}
          className="bg-white p-6 rounded-3xl border border-[#F0E1E1] shadow-2xs hover:border-[#E57D89] hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEDEC] text-[#880D32] flex items-center justify-center mb-1">
              <Tag className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#30232A] group-hover:text-[#A20D38] transition-colors">
              {t('item_catalogue', 'Item Catalogue')}
            </h3>
            <p className="text-xs text-[#786773]">
              {t('catalogue_card_desc', 'View and manage Bandhej designs, knot styles (Sarkam / Choot), and piece rates.')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#F0E1E1] group-hover:text-[#A20D38] group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
        </div>

        {/* Nav 3: Reports & Analytics */}
        <div
          onClick={() => navigate('/reports')}
          className="bg-white p-6 rounded-3xl border border-[#F0E1E1] shadow-2xs hover:border-[#E57D89] hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEDEC] text-[#A20D38] flex items-center justify-center mb-1">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#30232A] group-hover:text-[#A20D38] transition-colors">
              {t('reports_analytics', 'Reports & Analytics')}
            </h3>
            <p className="text-xs text-[#786773]">
              {t('reports_card_desc', 'Track unreturned work by original issue date, view pending pieces, and export reports.')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#F0E1E1] group-hover:text-[#A20D38] group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
        </div>
      </div>
    </div>
  );
};
