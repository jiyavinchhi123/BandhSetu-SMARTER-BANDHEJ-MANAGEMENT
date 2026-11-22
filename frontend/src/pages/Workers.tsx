import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { api, WorkerItem } from '../services/api';
import { Button, Card, Badge, Input, LoadingSpinner } from '../components/ui';
import { formatINR, formatIndianDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../context/LanguageContext';
import { translateEntityName } from '../utils/translations';
import { BandhaniWatermark } from '../components/common/BandhaniMotif';

export const Workers: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [selectedCluster, setSelectedCluster] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Register Worker Modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsRegisterOpen(true);
    }
  }, [searchParams]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [town, setTown] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load workers
  const fetchWorkers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getWorkers({
        q: searchTerm,
        status: statusFilter,
      });
      // Chronological ascending: oldest first, latest entry at last
      const sorted = [...data].sort((a, b) => a.id - b.id);
      setWorkers(sorted);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Artisans',
        message: err.message || 'Could not fetch workers.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, showToast]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchWorkers();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchWorkers]);

  // Extract distinct clusters from workers
  const availableClusters = useMemo(() => {
    const set = new Set<string>();
    workers.forEach((w) => {
      const loc = w.town || w.village || w.city;
      if (loc && loc.trim()) set.add(loc.trim());
    });
    return Array.from(set);
  }, [workers]);

  // Filtered workers by cluster
  const filteredWorkers = useMemo(() => {
    if (selectedCluster === 'All') return workers;
    return workers.filter((w) => {
      const loc = w.town || w.village || w.city;
      return loc?.trim().toLowerCase() === selectedCluster.toLowerCase();
    });
  }, [workers, selectedCluster]);

  // Dynamic statistics
  const totalArtisansCount = workers.length;
  const totalClustersCount = availableClusters.length > 0 ? availableClusters.length : (workers.length > 0 ? 1 : 0);
  const pendingPaymentsCount = workers.filter((w) => (w.payable_balance || 0) > 0).length;

  // Handle worker registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      showToast({
        type: 'error',
        title: 'Required Fields Missing',
        message: 'Full Name and Mobile Number are mandatory.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createWorker({
        full_name: fullName.trim(),
        phone: phone.trim(),
        town: town.trim() || undefined,
        address: address.trim() || undefined,
        status: 'Active',
        remarks: remarks.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Artisan Registered Successfully',
        message: `${created.full_name} assigned permanent Serial Number ${created.serial_number}.`,
      });

      setIsRegisterOpen(false);
      setFullName('');
      setPhone('');
      setTown('');
      setAddress('');
      setRemarks('');
      fetchWorkers();
      navigate(`/workers/${created.id}`);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Registration Failed',
        message: err.message || 'Could not register artisan worker.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Artisan Workers Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FCEDEC] text-[#A20D38] flex items-center justify-center shrink-0 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#30232A]">
              {t('artisan_workers', 'Artisan Worker')}
            </h1>
            <p className="text-xs text-[#786773] mt-0.5">
              {language === 'gu'
                ? 'કારીગર પ્રોફાઇલ, સોંપેલ કામ, બાકી હિસાબ અને સંચાલન'
                : 'Manage artisan profiles, custody balances, and consignment tracking'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#A20D38] hover:bg-[#880D32] text-white font-semibold text-sm shadow-xs transition-all active:scale-95 w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('register_artisan', '+ Register Artisan')}</span>
        </button>
      </div>

      {/* C. Search and Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Wide Pill Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#786773] absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t(
                'search_workers_placeholder',
                'Search by Full Name, Serial Number, Mobile, Town or Address...'
              )}
              className="w-full pl-12 pr-4 py-3 bg-white text-xs sm:text-sm text-[#30232A] placeholder:text-[#786773]/70 rounded-full border border-[#F0E1E1] focus:outline-none focus:ring-2 focus:ring-[#A20D38]/20 focus:border-[#A20D38] shadow-2xs transition-all font-medium"
            />
          </div>

          {/* Cluster Filter Pill Dropdown */}
          <div className="relative w-full md:w-auto shrink-0">
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="appearance-none w-full md:w-auto px-5 py-3 pr-10 rounded-full border border-[#F0E1E1] bg-white text-xs sm:text-sm font-semibold text-[#30232A] focus:outline-none focus:ring-2 focus:ring-[#A20D38]/20 focus:border-[#A20D38] shadow-2xs cursor-pointer"
            >
              <option value="All">{t('all_clusters', 'All Clusters')}</option>
              {availableClusters.map((cluster) => (
                <option key={cluster} value={cluster}>
                  {translateEntityName(cluster, language)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#786773] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Quick Status Filter Tabs & Results Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[#786773] font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#A20D38]" /> {t('status_label', 'Status')}:
            </span>
            {['Active', 'Inactive', 'All'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${statusFilter === st
                  ? 'bg-[#A20D38] text-white font-bold shadow-2xs'
                  : 'bg-white text-[#786773] hover:bg-[#FCEDEC] hover:text-[#A20D38] border border-[#F0E1E1]'
                  }`}
              >
                {st === 'Active' ? t('active', 'Active') : st === 'Inactive' ? t('inactive', 'Inactive') : t('all', 'All')}
              </button>
            ))}
          </div>

          <div className="text-[#786773] font-medium">
            {t('showing', 'Showing')}{' '}
            <span className="font-bold text-[#30232A]">{filteredWorkers.length}</span>{' '}
            {t('artisans', 'artisans')}
          </div>
        </div>
      </div>

      {/* D. Artisan Cards — Spacious 2-Column Grid */}
      {isLoading ? (
        <LoadingSpinner label="Searching artisan workers..." size="lg" />
      ) : filteredWorkers.length === 0 ? (
        <Card className="text-center py-16 border-dashed border-[#F0E1E1] bg-white rounded-3xl">
          <Users className="w-12 h-12 text-[#E57D89] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-serif font-bold text-[#30232A]">
            {t('no_artisans_found', 'No artisans found')}
          </h3>
          <p className="text-xs sm:text-sm text-[#786773] max-w-sm mx-auto mt-1 mb-4">
            No artisan worker records matched your search query "{searchTerm}".
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setSelectedCluster('All');
            }}
          >
            {t('clear_search_filter', 'Clear Search Filter')}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              onClick={() => navigate(`/workers/${worker.id}`)}
              className="bg-white rounded-3xl border border-[#F0E1E1] p-6 sm:p-7 shadow-2xs hover:shadow-md hover:border-[#E57D89]/80 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
            >
              {/* Subtle Bandhani Diamond Motif Watermark in Top Right */}
              <div className="absolute top-2 right-2 w-32 h-32 pointer-events-none opacity-40">
                <BandhaniWatermark className="w-full h-full text-[#A20D38]" />
              </div>

              <div className="space-y-4 relative z-10">
                {/* Header: Artisan Name & Serial/Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#30232A] group-hover:text-[#A20D38] transition-colors leading-tight">
                      {translateEntityName(worker.full_name, language)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-semibold text-[#880D32] bg-[#FCEDEC] px-2.5 py-0.5 rounded-full border border-[#F0E1E1]">
                        {worker.serial_number}
                      </span>
                      <Badge
                        variant={worker.status === 'Active' ? 'success' : 'neutral'}
                        dot
                        size="sm"
                      >
                        {worker.status === 'Active' ? t('active', 'Active') : t('inactive', 'Inactive')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Location & Mobile Number */}
                <div className="space-y-1.5 text-xs text-[#786773]">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#A20D38] shrink-0" />
                    <span className="font-medium text-[#30232A]">
                      {translateEntityName(worker.town || worker.village || 'Gujarat', language)}
                      {worker.address ? ` – ${translateEntityName(worker.address, language)}` : ''}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 font-mono">
                    <Phone className="w-4 h-4 text-[#A20D38] shrink-0" />
                    <span>{worker.phone}</span>
                  </p>
                </div>

                {/* Financial Highlights: Pending Pieces & Payable Balance */}
                <div className="grid grid-cols-2 divide-x divide-[#F0E1E1] pt-3 pb-2 border-t border-[#F0E1E1]/70">
                  <div className="pr-4">
                    <p className="text-[11px] text-[#786773] font-medium">
                      {t('pending_pcs_label', 'Pending Pieces')}
                    </p>
                    <p className="font-serif text-lg sm:text-xl font-bold text-[#A20D38] mt-0.5">
                      {worker.pending_pieces} {t('pieces_unit', 'Pcs')}
                    </p>
                  </div>
                  <div className="pl-4">
                    <p className="text-[11px] text-[#786773] font-medium">
                      {t('payable_bal_label', 'Payable Balance')}
                    </p>
                    <p className="font-serif text-lg sm:text-xl font-bold text-[#A20D38] mt-0.5">
                      {formatINR(worker.payable_balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer: Joining Date & View Profile */}
              <div className="mt-4 pt-3 border-t border-[#F0E1E1] flex items-center justify-between text-xs text-[#786773] relative z-10">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-[#786773]" />
                  <span>
                    {t('joined', 'Joined')}: {formatIndianDate(worker.joining_date)}
                  </span>
                </span>
                <span className="inline-flex items-center font-bold text-[#A20D38] group-hover:translate-x-1 transition-transform">
                  <span>{language === 'gu' ? 'ખાતું જુઓ' : 'View Profile'}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Register New Worker */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto border border-[#F0E1E1]">
            <div className="flex items-center justify-between border-b border-[#F0E1E1] pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#30232A] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#A20D38]" />
                  {t('register_new_artisan_modal_title', 'Register New Artisan Worker')}
                </h3>
                <p className="text-xs text-[#786773] mt-0.5">
                  {language === 'gu'
                    ? 'યુનિક સીરીયલ નંબર આપોઆપ જનરેટ થશે.'
                    : 'Unique sequential serial number will be generated automatically.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label={`${t('full_name', 'Full Name')} *`}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rekhaben Rathod"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={`${t('mobile_number', 'Mobile Number')} *`}
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98250 12345"
                />
                <Input
                  label={t('town_city', 'Town / Village')}
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="e.g. Anjar"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#30232A]">
                  {t('address', 'Address / Street')}
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Khatri Chowk, Main Bazaar, Bhuj"
                  className="w-full rounded-xl border border-[#F0E1E1] p-3 text-xs sm:text-sm text-[#30232A] focus:outline-none focus:ring-2 focus:ring-[#A20D38]/20 focus:border-[#A20D38] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#30232A]">
                  {t('specialization_remarks_label', 'Specialization / Remarks')}
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Expert in fine Shikari work, prefers Gajji Silk sarees..."
                  className="w-full rounded-xl border border-[#F0E1E1] p-3 text-xs sm:text-sm text-[#30232A] focus:outline-none focus:ring-2 focus:ring-[#A20D38]/20 focus:border-[#A20D38] transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0E1E1]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRegisterOpen(false)}
                  disabled={isSubmitting}
                >
                  {t('cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  {t('submit_register', 'Register Artisan')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
