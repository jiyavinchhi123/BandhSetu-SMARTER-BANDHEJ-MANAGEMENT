import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Calendar,
  IndianRupee,
  Package,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';
import { api, WorkerItem } from '../services/api';
import { Button, Card, Badge, Input, LoadingSpinner } from '../components/ui';
import { formatINR, formatIndianDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';

export const Workers: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [selectedVillage, setSelectedVillage] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Register Worker Modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [town, setTown] = useState('Bhuj');
  const [city, setCity] = useState('Bhuj');
  const [village, setVillage] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load workers
  const fetchWorkers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getWorkers({
        q: searchTerm,
        status: statusFilter,
        village: selectedVillage === 'All' ? undefined : selectedVillage,
      });
      setWorkers(data);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Artisans',
        message: err.message || 'Could not fetch workers.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, selectedVillage, showToast]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchWorkers();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchWorkers]);

  // Handle worker registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !village.trim()) {
      showToast({
        type: 'error',
        title: 'Required Fields Missing',
        message: 'Full Name, Phone number and Village are mandatory.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createWorker({
        full_name: fullName.trim(),
        phone: phone.trim(),
        town: town.trim(),
        city: city.trim(),
        village: village.trim(),
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
      setVillage('');
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

  // Extract distinct villages for quick filters
  const villagesList = Array.from(new Set(workers.map((w) => w.village).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            Bandhej Artisan Worker Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Managing 200–500 home-based women artisans across Kutch and Saurashtra clusters
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsRegisterOpen(true)}
        >
          Register New Artisan
        </Button>
      </div>

      {/* Prominent Search Bar (Dynamic Partial Matching) */}
      <Card className="p-4 sm:p-5 border-slate-200/90 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Full Name (type 'R'), Serial Number (WRK-0001), Mobile, or Village..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-sm sm:text-base text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium"
          />
        </div>

        {/* Quick Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {['Active', 'Inactive', 'All'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-brand-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{workers.length}</span> artisans
          </div>
        </div>
      </Card>

      {/* Workers Grid / Cards */}
      {isLoading ? (
        <LoadingSpinner label="Searching artisan workers..." size="lg" />
      ) : workers.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No artisans found</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No worker records matched your search query "{searchTerm}".
          </p>
          <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
            Clear Search Filter
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((worker) => (
            <div
              key={worker.id}
              onClick={() => navigate(`/workers/${worker.id}`)}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Serial & Status */}
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200/60">
                    {worker.serial_number}
                  </span>
                  <Badge
                    variant={worker.status === 'Active' ? 'success' : 'neutral'}
                    dot
                    size="sm"
                  >
                    {worker.status}
                  </Badge>
                </div>

                {/* Worker Identity */}
                <div>
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-brand-600 transition-colors leading-snug">
                    {worker.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {worker.village}, {worker.town} ({worker.city})
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{worker.phone}</span>
                  </p>
                </div>

                {/* Operational Counters: Pending Pieces & Payable Balance */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Pending Knotting
                    </span>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Package className="w-3.5 h-3.5 text-amber-500" />
                      <span>{worker.pending_pieces} Sarees</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Payable Balance
                    </span>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">
                      {formatINR(worker.payable_balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px]">
                  Joined: {formatIndianDate(worker.joining_date)}
                </span>
                <span className="inline-flex items-center font-bold text-brand-600 group-hover:translate-x-1 transition-transform">
                  View Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Register New Worker */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-600" />
                  Register New Bandhej Artisan
                </h3>
                <p className="text-xs text-slate-500">
                  Unique sequential serial number will be generated automatically.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Full Name *"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rekhaben Rathod"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Mobile Number *"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98250 12345"
                />
                <Input
                  label="Village *"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Khavda"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Town"
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="e.g. Anjar"
                />
                <Input
                  label="City / District"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bhuj"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Specialization / Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Expert in fine Shikari work, prefers Gajji Silk sarees..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-200">
                Notice: Women artisans do not receive application login accounts. Management records work, returns, and payments on their behalf.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRegisterOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  Register Artisan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
