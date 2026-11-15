import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Calendar,
  IndianRupee,
  User,
  Package,
  Filter,
  Eye,
  FileCheck,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  api,
  WorkDistributionItem,
  WorkerItem,
  ItemCatalogue,
} from '../services/api';
import { ItemSearchSelect } from '../components/common/ItemSearchSelect';
import { MaterialDebitCreditLedger } from '../components/ledger/MaterialDebitCreditLedger';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatINR, formatIndianDate } from '../utils/formatters';

const KNOT_STYLES = [
  'Bharti (Dense Round Knots)',
  'Ekdali (Single Dot Classic)',
  'Shikari (Hunting & Animal Figures)',
  'Jaal (All-Over Web Pattern)',
  'Kodi (Shell Motif)',
  'Standard Bandhej',
];

const REJECTION_REASONS = [
  'Broken Knots / Missing Knots',
  'Fabric Torn / Needle Punched',
  'Uneven / Irregular Knots',
  'Stains / Dye Bleed / Discoloration',
  'Pattern / Design Mismatch',
  'Loose Knotting (Unraveling)',
  'Other Defect',
];

export const Batches: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'give-work' | 'receive-work' | 'ledger'>('orders');

  // Consignments List State
  const [distributions, setDistributions] = useState<WorkDistributionItem[]>([]);
  const [loadingDistributions, setLoadingDistributions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Give Work Form State
  const [giveDate, setGiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerItem | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerOptions, setWorkerOptions] = useState<WorkerItem[]>([]);
  const [isSearchingWorker, setIsSearchingWorker] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemCatalogue | null>(null);
  const [quantityIssued, setQuantityIssued] = useState<number | ''>(10);
  const [knotStyle, setKnotStyle] = useState('Bharti (Dense Round Knots)');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [giveRemarks, setGiveRemarks] = useState('');
  const [submittingGive, setSubmittingGive] = useState(false);

  // Receive Work Form State
  const [returnWorkerSearch, setReturnWorkerSearch] = useState('');
  const [returnWorkerOptions, setReturnWorkerOptions] = useState<WorkerItem[]>([]);
  const [selectedReturnWorker, setSelectedReturnWorker] = useState<WorkerItem | null>(null);
  const [pendingDistributions, setPendingDistributions] = useState<WorkDistributionItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<WorkDistributionItem | null>(null);

  const [qtyAccepted, setQtyAccepted] = useState<number | ''>(0);
  const [qtyRejected, setQtyRejected] = useState<number | ''>(0);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Load all distributions
  const loadDistributions = useCallback(async () => {
    setLoadingDistributions(true);
    try {
      const data = await api.getAllDistributions({
        status: statusFilter === 'All' ? undefined : statusFilter,
        q: searchQuery.trim() || undefined,
      });
      setDistributions(data);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Batches',
        message: err.message || 'Failed to load work consignments',
      });
    } finally {
      setLoadingDistributions(false);
    }
  }, [statusFilter, searchQuery, showToast]);

  useEffect(() => {
    if (activeTab === 'orders') {
      const delay = setTimeout(loadDistributions, 200);
      return () => clearTimeout(delay);
    }
  }, [activeTab, loadDistributions]);

  // Search workers for Give Work
  useEffect(() => {
    if (!workerSearch.trim()) {
      setWorkerOptions([]);
      return;
    }
    const search = async () => {
      try {
        setIsSearchingWorker(true);
        const data = await api.getWorkers({ q: workerSearch.trim(), limit: 8 });
        setWorkerOptions(data);
      } catch (err) {
        // ignore
      } finally {
        setIsSearchingWorker(false);
      }
    };
    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [workerSearch]);

  // Search workers for Receive Work
  useEffect(() => {
    if (!returnWorkerSearch.trim()) {
      setReturnWorkerOptions([]);
      return;
    }
    const search = async () => {
      try {
        const data = await api.getWorkers({ q: returnWorkerSearch.trim(), limit: 8 });
        setReturnWorkerOptions(data);
      } catch (err) {
        // ignore
      }
    };
    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [returnWorkerSearch]);

  // When selected return worker changes, fetch her pending distributions
  useEffect(() => {
    if (!selectedReturnWorker) {
      setPendingDistributions([]);
      setSelectedDistribution(null);
      return;
    }
    const fetchPending = async () => {
      setLoadingPending(true);
      try {
        const data = await api.getPendingDistributions(selectedReturnWorker.id);
        setPendingDistributions(data);
        if (data.length > 0) {
          setSelectedDistribution(data[0]);
          setQtyAccepted(data[0].quantity_pending);
          setQtyRejected(0);
        } else {
          setSelectedDistribution(null);
        }
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Error Loading Pending Batches',
          message: err.message || 'Failed to load worker consignments',
        });
      } finally {
        setLoadingPending(false);
      }
    };
    fetchPending();
  }, [selectedReturnWorker, showToast]);

  // Total work value calculation for Give Work
  const unitPrice = selectedItem ? selectedItem.price_per_piece : 0;
  const numPieces = typeof quantityIssued === 'number' ? quantityIssued : 0;
  const totalWorkValue = round(numPieces * unitPrice);

  function round(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // Handle Give Work Submission
  const handleGiveWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) {
      showToast({
        type: 'error',
        title: 'Artisan Required',
        message: 'Please search and select a woman artisan worker.',
      });
      return;
    }
    if (!selectedItem) {
      showToast({
        type: 'error',
        title: 'Item Design Required',
        message: 'Please search and select an item from catalogue.',
      });
      return;
    }
    if (!quantityIssued || quantityIssued <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Quantity',
        message: 'Number of pieces given must be at least 1.',
      });
      return;
    }

    try {
      setSubmittingGive(true);
      const res = await api.giveWork({
        worker_id: selectedWorker.id,
        item_id: selectedItem.id,
        quantity_issued: Number(quantityIssued),
        knot_style: knotStyle,
        issue_date: giveDate,
        due_date: dueDate,
        remarks: giveRemarks.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Consignment Dispatched!',
        message: `Issued ${res.quantity_issued} pcs of ${res.item_name_snapshot} to ${selectedWorker.full_name}. Batch ID: ${res.batch_code}`,
      });

      // Reset form but keep selectedWorker to easily allow multiple items on the same day!
      setSelectedItem(null);
      setQuantityIssued(10);
      setGiveRemarks('');
      loadDistributions();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Issue Work',
        message: err.message || 'Error occurred while issuing consignment',
      });
    } finally {
      setSubmittingGive(false);
    }
  };

  // Handle Receive Work Submission
  const handleReceiveWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistribution) {
      showToast({
        type: 'error',
        title: 'Batch Required',
        message: 'Please select an open consignment with pending pieces.',
      });
      return;
    }

    const accepted = typeof qtyAccepted === 'number' ? qtyAccepted : 0;
    const rejected = typeof qtyRejected === 'number' ? qtyRejected : 0;

    if (accepted < 0 || rejected < 0) {
      showToast({
        type: 'error',
        title: 'Invalid Quantity',
        message: 'Return quantities cannot be negative.',
      });
      return;
    }

    const totalReturn = accepted + rejected;
    if (totalReturn <= 0) {
      showToast({
        type: 'error',
        title: 'Return Quantity Required',
        message: 'Please enter at least 1 piece to receive (accepted or rejected).',
      });
      return;
    }

    if (totalReturn > selectedDistribution.quantity_pending) {
      showToast({
        type: 'error',
        title: 'Exceeds Pending Quantity',
        message: `Cannot return ${totalReturn} pieces. Only ${selectedDistribution.quantity_pending} pieces remain pending for batch ${selectedDistribution.batch_code}.`,
      });
      return;
    }

    try {
      setSubmittingReturn(true);
      const res = await api.receiveWork({
        distribution_id: selectedDistribution.id,
        quantity_returned: accepted,
        quantity_rejected: rejected,
        rejection_reason: rejected > 0 ? rejectionReason : undefined,
        rejection_remarks: rejected > 0 ? rejectionRemarks.trim() || undefined : undefined,
        return_date: returnDate,
        remarks: returnRemarks.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Work Return Recorded!',
        message: `Received ${res.quantity_returned} accepted (Earned ${formatINR(res.completed_work_value)}) and ${res.quantity_rejected} rejected pieces. Return ID: ${res.return_code}`,
      });

      // Refresh pending consignments for this worker
      if (selectedReturnWorker) {
        const updatedPending = await api.getPendingDistributions(selectedReturnWorker.id);
        setPendingDistributions(updatedPending);
        if (updatedPending.length > 0) {
          setSelectedDistribution(updatedPending[0]);
          setQtyAccepted(updatedPending[0].quantity_pending);
          setQtyRejected(0);
        } else {
          setSelectedDistribution(null);
        }
      }
      setReturnRemarks('');
      setRejectionRemarks('');
      loadDistributions();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Record Return',
        message: err.message || 'Error occurred while receiving work',
      });
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Jump from order row directly into Receive Work tab
  const handleOpenReceiveForBatch = (dist: WorkDistributionItem) => {
    setSelectedReturnWorker({
      id: dist.worker_id,
      serial_number: dist.worker_serial || `WRK-${dist.worker_id}`,
      full_name: dist.worker_name || 'Artisan Worker',
      phone: '',
      town: '',
      city: '',
      village: '',
      joining_date: '',
      status: 'Active',
      pending_pieces: dist.quantity_pending,
      payable_balance: 0,
      total_earned: 0,
      created_at: '',
      updated_at: '',
    });
    setReturnWorkerSearch(dist.worker_name || '');
    setSelectedDistribution(dist);
    setQtyAccepted(dist.quantity_pending);
    setQtyRejected(0);
    setActiveTab('receive-work');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Work Batches & Material Management
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-100 text-brand-800 border border-brand-200">
              Step 4 Core
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Give work consignments, record partial returns, track quality defects, and manage the double-entry material ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('give-work')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 ${
              activeTab === 'give-work'
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Plus className="w-4 h-4 text-brand-500" />
            <span>Give Work</span>
          </button>
          <button
            onClick={() => setActiveTab('receive-work')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 ${
              activeTab === 'receive-work'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Receive Return</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'orders'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Consignments & Batches</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {distributions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('give-work')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'give-work'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-rose-500" />
          <span>Give Work (Material Distribution)</span>
        </button>

        <button
          onClick={() => setActiveTab('receive-work')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'receive-work'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          <span>Receive Return (Partial & QC)</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'ledger'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4 text-blue-500" />
          <span>Material Debit-Credit Ledger</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL CONSIGNMENTS / BATCHES LIST */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search batch code, item name, artisan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              {['All', 'Issued', 'Partially Returned', 'Completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === status
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
              <button
                onClick={loadDistributions}
                className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 ml-auto md:ml-0"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingDistributions ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Consignments Table / Cards */}
          {loadingDistributions ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent mb-3" />
              <p className="text-sm text-slate-500">Loading consignments...</p>
            </div>
          ) : distributions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No consignments found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No batches matching "${searchQuery}".`
                  : 'No work distributions have been issued yet. Click "Give Work" to dispatch your first consignment.'}
              </p>
              <button
                onClick={() => setActiveTab('give-work')}
                className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Issue First Consignment
              </button>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Batch ID</th>
                      <th className="py-3.5 px-4">Artisan Worker</th>
                      <th className="py-3.5 px-4">Item & Knot Style</th>
                      <th className="py-3.5 px-4 text-right">Piece Rate</th>
                      <th className="py-3.5 px-4 text-center">Given</th>
                      <th className="py-3.5 px-4 text-center">Returned</th>
                      <th className="py-3.5 px-4 text-center">Rejected</th>
                      <th className="py-3.5 px-4 text-center font-bold text-brand-700">Pending</th>
                      <th className="py-3.5 px-4 text-right">Gross Wage</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {distributions.map((dist) => (
                      <tr key={dist.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          <div>{dist.batch_code}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Issued: {formatIndianDate(dist.issue_date)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{dist.worker_name || `Worker #${dist.worker_id}`}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{dist.worker_serial || '—'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{dist.item_name_snapshot}</div>
                          <div className="text-[10px] text-slate-500">{dist.knot_style}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                          {formatINR(dist.rate_per_piece, true)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                          {dist.quantity_issued}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                          {dist.quantity_returned}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-amber-600">
                          {dist.quantity_rejected || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                              dist.quantity_pending > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {dist.quantity_pending}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {formatINR(dist.total_gross_wage)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              dist.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : dist.status === 'Partially Returned'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {dist.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {dist.quantity_pending > 0 ? (
                            <button
                              onClick={() => handleOpenReceiveForBatch(dist)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Receive
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Finished</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-3 lg:hidden">
                {distributions.map((dist) => (
                  <div key={dist.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {dist.batch_code}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">
                          {dist.worker_name} ({dist.worker_serial})
                        </h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {dist.item_name_snapshot} • {dist.knot_style}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          dist.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : dist.status === 'Partially Returned'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {dist.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Given</div>
                        <div className="font-bold text-rose-600">{dist.quantity_issued}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Received</div>
                        <div className="font-bold text-emerald-600">{dist.quantity_returned}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Rejected</div>
                        <div className="font-bold text-amber-600">{dist.quantity_rejected || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold text-brand-700">Pending</div>
                        <div className="font-bold text-slate-900">{dist.quantity_pending}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[11px]">Snapshot Rate: </span>
                        <strong className="text-slate-800">{formatINR(dist.rate_per_piece, true)}</strong>
                      </div>
                      {dist.quantity_pending > 0 && (
                        <button
                          onClick={() => handleOpenReceiveForBatch(dist)}
                          className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Receive Work
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GIVE WORK / MATERIAL DISTRIBUTION FORM (Requirement A) */}
      {/* ========================================================================= */}
      {activeTab === 'give-work' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Give Work / Material Distribution Form
              </h2>
              <p className="text-xs text-slate-500">
                Dispatches raw cloth & tying thread. Automatically generates unique Distribution ID & snapshots piece price.
              </p>
            </div>
          </div>

          <form onSubmit={handleGiveWorkSubmit} className="space-y-5">
            {/* 1. Date Picker (defaults today in IST) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Issue Date (IST) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={giveDate}
                  onChange={(e) => setGiveDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>
            </div>

            {/* 2. Worker Search & Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Woman Artisan Worker <span className="text-rose-500">*</span>
              </label>
              {selectedWorker ? (
                <div className="p-3.5 bg-brand-50/60 border border-brand-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                      {selectedWorker.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{selectedWorker.full_name}</div>
                      <div className="text-xs text-slate-500">
                        Serial: <span className="font-mono font-semibold">{selectedWorker.serial_number}</span> • Village: {selectedWorker.village}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWorker(null);
                      setWorkerSearch('');
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200"
                  >
                    Change Worker
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search artisan by name, serial (e.g. 'Rani', 'WRK')..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  {workerOptions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {workerOptions.map((w) => (
                        <div
                          key={w.id}
                          onClick={() => {
                            setSelectedWorker(w);
                            setWorkerSearch('');
                            setWorkerOptions([]);
                          }}
                          className="p-3 hover:bg-brand-50/50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{w.full_name}</span>
                            <span className="ml-2 font-mono text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                              {w.serial_number}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {w.village}, {w.city} • Phone: {w.phone}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Pending Pieces</span>
                            <span className="font-bold text-slate-800">{w.pending_pieces} pcs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Searchable Item Dropdown & Snapshot Price */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Item / Design Selection <span className="text-rose-500">*</span>
              </label>
              <ItemSearchSelect
                value={selectedItem?.id || null}
                onChange={(item) => setSelectedItem(item)}
                placeholder="Type item design name (e.g. 'Rani', 'Saree', 'Dupatta')..."
              />
            </div>

            {/* 4. Number of Pieces Given & Automatic Work Value Calculation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Number of Pieces Given <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantityIssued}
                  onChange={(e) => setQuantityIssued(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="10"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Total Work Value (Auto-Calculated)
                </label>
                <div className="px-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {numPieces} pcs × {formatINR(unitPrice, true)}
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {formatINR(totalWorkValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Knot Style & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Knot Style / Pattern
                </label>
                <select
                  value={knotStyle}
                  onChange={(e) => setKnotStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {KNOT_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Estimated Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={giveRemarks}
                onChange={(e) => setGiveRemarks(e.target.value)}
                placeholder="e.g. Festival priority dispatch / special white silk border"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            {/* Historical Price Protection Disclaimer */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Historical Price Protection:</strong> The current catalogue rate ({formatINR(unitPrice, true)}/pc) will be permanently locked into this transaction. Multiple consignments can be assigned to this worker today.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingGive}
              className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-brand-500/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span>{submittingGive ? 'Issuing Consignment...' : 'Dispatch Consignment (Debit Material)'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RECEIVE COMPLETED WORK & PARTIAL RETURNS (Requirements C, D, E) */}
      {/* ========================================================================= */}
      {activeTab === 'receive-work' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Receive Completed Work & Partial Returns
              </h2>
              <p className="text-xs text-slate-500">
                Supports partial returns, quality rejections, and auto-calculates artisan completed wages.
              </p>
            </div>
          </div>

          <form onSubmit={handleReceiveWorkSubmit} className="space-y-5">
            {/* 1. Worker Search */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Search Artisan Worker <span className="text-rose-500">*</span>
              </label>
              {selectedReturnWorker ? (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      {selectedReturnWorker.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{selectedReturnWorker.full_name}</div>
                      <div className="text-xs text-slate-500">
                        Serial: <span className="font-mono font-semibold">{selectedReturnWorker.serial_number}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReturnWorker(null);
                      setReturnWorkerSearch('');
                      setSelectedDistribution(null);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200"
                  >
                    Change Worker
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search artisan returning work..."
                    value={returnWorkerSearch}
                    onChange={(e) => setReturnWorkerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {returnWorkerOptions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {returnWorkerOptions.map((w) => (
                        <div
                          key={w.id}
                          onClick={() => {
                            setSelectedReturnWorker(w);
                            setReturnWorkerSearch('');
                            setReturnWorkerOptions([]);
                          }}
                          className="p-3 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{w.full_name}</span>
                            <span className="ml-2 font-mono text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                              {w.serial_number}
                            </span>
                            <div className="text-[11px] text-slate-400">{w.village}</div>
                          </div>
                          <span className="font-bold text-slate-800">{w.pending_pieces} pcs pending</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Select Pending Consignment */}
            {selectedReturnWorker && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Original Consignment to Return Against <span className="text-rose-500">*</span>
                </label>
                {loadingPending ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Loading pending batches for {selectedReturnWorker.full_name}...
                  </div>
                ) : pendingDistributions.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    No active consignments pending return for this artisan.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {pendingDistributions.map((dist) => (
                      <div
                        key={dist.id}
                        onClick={() => {
                          setSelectedDistribution(dist);
                          setQtyAccepted(dist.quantity_pending);
                          setQtyRejected(0);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedDistribution?.id === dist.id
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {dist.batch_code}
                            </span>
                            <span className="text-xs text-slate-600 font-semibold">
                              {dist.item_name_snapshot}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Issued: {formatIndianDate(dist.issue_date)} • Snapshot Rate:{' '}
                            <strong className="text-slate-800">{formatINR(dist.rate_per_piece, true)}/pc</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Pending Pieces</span>
                          <span className="text-base font-black text-amber-700">
                            {dist.quantity_pending}{' '}
                            <span className="text-xs font-normal text-slate-500">/ {dist.quantity_issued}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Quantities to Return: Accepted & Rejected */}
            {selectedDistribution && (
              <>
                <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Selected Batch:</span>
                    <span className="font-mono text-slate-900">{selectedDistribution.batch_code}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Original Quantity Given:</span>
                    <span className="font-bold">{selectedDistribution.quantity_issued} pieces</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Already Returned:</span>
                    <span className="font-bold text-emerald-600">{selectedDistribution.quantity_returned} pieces</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Already Rejected:</span>
                    <span className="font-bold text-amber-600">{selectedDistribution.quantity_rejected || 0} pieces</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Currently Pending:</span>
                    <span className="text-amber-700 text-sm">{selectedDistribution.quantity_pending} pieces</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Accepted Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Accepted Pieces (Wages Earned)</span>
                      <span className="text-[10px] text-emerald-600">Creates Wage</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedDistribution.quantity_pending}
                      value={qtyAccepted}
                      onChange={(e) => setQtyAccepted(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 rounded-xl text-base font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* Rejected Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Rejected / Defective Pieces</span>
                      <span className="text-[10px] text-amber-600">₹0 Wage</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedDistribution.quantity_pending}
                      value={qtyRejected}
                      onChange={(e) => setQtyRejected(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-amber-50/40 border border-amber-300 rounded-xl text-base font-bold text-amber-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* If Rejected > 0, show Rejection Reason & Remarks (Requirement E) */}
                {typeof qtyRejected === 'number' && qtyRejected > 0 && (
                  <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Quality Rejection Details (Will not create wages)</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                        Reason for Defect
                      </label>
                      <select
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs"
                      >
                        {REJECTION_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                        Defect Inspection Notes
                      </label>
                      <input
                        type="text"
                        value={rejectionRemarks}
                        onChange={(e) => setRejectionRemarks(e.target.value)}
                        placeholder="e.g. Knotting broken on pallu area / fabric damaged"
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Calculated Completed Work Value */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">
                      Completed Work Value Added to Wages
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Formula: {typeof qtyAccepted === 'number' ? qtyAccepted : 0} accepted pcs ×{' '}
                      {formatINR(selectedDistribution.rate_per_piece, true)}
                    </span>
                  </div>
                  <div className="text-xl font-black text-emerald-400">
                    {formatINR((typeof qtyAccepted === 'number' ? qtyAccepted : 0) * selectedDistribution.rate_per_piece)}
                  </div>
                </div>

                {/* Return Date & General Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Return Date (IST) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Return Remarks
                    </label>
                    <input
                      type="text"
                      value={returnRemarks}
                      onChange={(e) => setReturnRemarks(e.target.value)}
                      placeholder="e.g. First partial return of 5 pcs"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Submit Return */}
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span>{submittingReturn ? 'Recording Return...' : 'Record Return (Credit Material & Add Wages)'}</span>
                </button>
              </>
            )}
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MATERIAL DEBIT-CREDIT LEDGER (Requirement B) */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <MaterialDebitCreditLedger showWorkerSelector={true} />
      )}
    </div>
  );
};
