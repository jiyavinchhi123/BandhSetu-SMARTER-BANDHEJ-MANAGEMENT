import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MapPin,
  Phone,
  Calendar,
  Package,
  IndianRupee,
  Layers,
  FileText,
  Plus,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  Truck,
  Edit,
  Save,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  api,
  WorkerItem,
  WorkDistributionItem,
  MaterialLedgerItem,
  PaymentItem,
  TimelineItem,
  ItemCatalogue,
} from '../services/api';
import { Button, Card, Badge, Input, LoadingSpinner } from '../components/ui';
import { ItemSearchSelect } from '../components/common/ItemSearchSelect';
import { MaterialDebitCreditLedger } from '../components/ledger/MaterialDebitCreditLedger';
import { MoneyDebitCreditLedger } from '../components/ledger/MoneyDebitCreditLedger';
import { formatINR, formatIndianDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';

const KNOT_STYLES = [
  'Bharti (Dense Round Knots)',
  'Ekdali (Single Dot Classic)',
  'Shikari (Hunting & Animal Figures)',
  'Jaal (All-Over Web Pattern)',
  'Kodi (Shell Motif)',
  'Standard Bandhej',
];

const getTodayIST = () => new Date().toISOString().split('T')[0];
const getDefaultDueDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
};

export const WorkerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const workerId = Number(id);

  const [worker, setWorker] = useState<WorkerItem | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'personal'
    | 'material'
    | 'distribution'
    | 'returns'
    | 'earnings'
    | 'payments'
    | 'timeline'
  >('distribution');

  const [isLoading, setIsLoading] = useState(true);

  // Tab Data States
  const [distributions, setDistributions] = useState<WorkDistributionItem[]>([]);
  const [materials, setMaterials] = useState<MaterialLedgerItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  // Issue Work / Give Work Consignment Modal State (Step 4 Debit-Credit Ledger)
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemCatalogue | null>(null);
  const [issueDate, setIssueDate] = useState(getTodayIST);
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [dueDate, setDueDate] = useState(getDefaultDueDate);
  const [issueRemarks, setIssueRemarks] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Receive Return Modal State
  const [selectedDistForReturn, setSelectedDistForReturn] = useState<WorkDistributionItem | null>(null);
  const [returnQtyAccepted, setReturnQtyAccepted] = useState<number | ''>(0);
  const [returnQtyRejected, setReturnQtyRejected] = useState<number | ''>(0);
  const [returnDate, setReturnDate] = useState(getTodayIST);
  const [rejectionReason, setRejectionReason] = useState('Broken Knots / Missing Knots');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Record Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('Wage Payout');
  const [paymentAmount, setPaymentAmount] = useState(2000);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [refNo, setRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Edit Profile Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTown, setEditTown] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editRemarks, setEditRemarks] = useState('');

  const loadWorkerData = useCallback(async () => {
    if (!workerId) return;
    setIsLoading(true);
    try {
      const [w, distList, matList, payList, tlList] = await Promise.all([
        api.getWorker(workerId),
        api.getWorkerWorkDistribution(workerId),
        api.getWorkerMaterialLedger(workerId),
        api.getWorkerPayments(workerId),
        api.getWorkerTimeline(workerId),
      ]);
      setWorker(w);
      setDistributions(distList);
      setMaterials(matList);
      setPayments(payList);
      setTimeline(tlList);

      // Seed edit form
      setEditName(w.full_name);
      setEditPhone(w.phone);
      setEditTown(w.town);
      setEditAddress(w.address || '');
      setEditStatus(w.status);
      setEditRemarks(w.remarks || '');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Profile',
        message: err.message || 'Worker not found.',
      });
      navigate('/workers');
    } finally {
      setIsLoading(false);
    }
  }, [workerId, showToast, navigate]);

  useEffect(() => {
    loadWorkerData();
  }, [loadWorkerData]);

  // Calculations for Give Work Modal
  const unitPrice = selectedItem ? Number(selectedItem.price_per_piece) : 0;
  const numPieces = typeof quantity === 'number' && !isNaN(quantity) ? quantity : 0;
  const totalWorkValue = Math.round((numPieces * unitPrice + Number.EPSILON) * 100) / 100;

  // Issue Work Consignment Submission (Step 4 Give Work with Material Ledger Debit)
  const handleIssueWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      showToast({ type: 'error', title: 'Item Design Required', message: 'Please search and select an item from catalogue.' });
      return;
    }
    if (!numPieces || numPieces <= 0) {
      showToast({ type: 'error', title: 'Invalid Quantity', message: 'Number of pieces given must be at least 1.' });
      return;
    }

    setIsSubmittingWork(true);
    try {
      const created = await api.giveWork({
        worker_id: workerId,
        item_id: selectedItem.id,
        quantity_issued: numPieces,
        issue_date: issueDate || getTodayIST(),
        due_date: dueDate || undefined,
        remarks: issueRemarks.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Consignment Dispatched!',
        message: `Issued ${created.quantity_issued} pcs of ${created.item_name_snapshot} to ${worker?.full_name}. Batch ID: ${created.batch_code}`,
      });

      setIsDistributeOpen(false);
      setSelectedItem(null);
      setQuantity(10);
      setIssueDate(getTodayIST());
      setDueDate(getDefaultDueDate());
      setIssueRemarks('');
      loadWorkerData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Dispatch Consignment',
        message: err.message || 'Error occurred while issuing consignment',
      });
    } finally {
      setIsSubmittingWork(false);
    }
  };

  // Open Receive Return Modal for a specific batch
  const handleOpenReceiveModal = (dist: WorkDistributionItem) => {
    setSelectedDistForReturn(dist);
    setReturnQtyAccepted(dist.quantity_pending);
    setReturnQtyRejected(0);
    setReturnDate(getTodayIST());
    setReturnRemarks('');
  };

  // Handle Receive Return Submission (Updates Issued status to Partially Returned / Completed)
  const handleReceiveReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistForReturn) return;

    const accepted = typeof returnQtyAccepted === 'number' ? returnQtyAccepted : 0;
    const rejected = typeof returnQtyRejected === 'number' ? returnQtyRejected : 0;
    const total = accepted + rejected;

    if (total <= 0) {
      showToast({ type: 'error', title: 'Invalid Quantity', message: 'Please enter at least 1 piece to receive.' });
      return;
    }

    if (total > selectedDistForReturn.quantity_pending) {
      showToast({
        type: 'error',
        title: 'Exceeds Pending',
        message: `Cannot return ${total} pieces. Only ${selectedDistForReturn.quantity_pending} pieces remain pending.`,
      });
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const res = await api.receiveWork({
        distribution_id: selectedDistForReturn.id,
        quantity_returned: accepted,
        quantity_rejected: rejected,
        rejection_reason: rejected > 0 ? rejectionReason : undefined,
        return_date: returnDate,
        remarks: returnRemarks.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Work Return Recorded!',
        message: `Received ${res.quantity_returned} accepted (Earned ${formatINR(res.completed_work_value)}) and ${res.quantity_rejected} rejected pieces. Status updated.`,
      });

      setSelectedDistForReturn(null);
      loadWorkerData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to Record Return', message: err.message });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Record Wage/Advance Payment Submission
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      showToast({ type: 'error', title: 'Invalid Amount', message: 'Enter a valid payment amount.' });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const p = await api.recordPayment(workerId, {
        payment_type: paymentType,
        amount: Number(paymentAmount),
        payment_mode: paymentMode,
        reference_no: refNo.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Payment Recorded',
        message: `${formatINR(p.amount)} recorded as ${p.payment_type}.`,
      });

      setIsPaymentOpen(false);
      setPaymentAmount(2000);
      setRefNo('');
      setPayNotes('');
      loadWorkerData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Payment Recording Failed', message: err.message });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateWorker(workerId, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
        town: editTown.trim(),
        address: editAddress.trim() || undefined,
        status: editStatus,
        remarks: editRemarks.trim() || undefined,
      });
      setWorker(updated);
      showToast({ type: 'success', title: 'Profile Updated', message: 'Details updated successfully.' });
      setIsEditOpen(false);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Update Failed', message: err.message });
    }
  };

  if (isLoading || !worker) {
    return <LoadingSpinner label="Loading artisan profile..." size="lg" />;
  }

  // Filter returns
  const returnBatches = distributions.filter((d) => d.quantity_returned > 0 || d.status === 'Completed');

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/workers')}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400">Worker Directory</span>
        <span className="text-xs text-slate-400">/</span>
        <span className="text-xs font-bold text-slate-700">{worker.full_name}</span>
      </div>

      {/* Hero Card: Prominently showing Pending Quantities & Payable Balance */}
      <Card className="p-6 border-slate-200 bg-gradient-to-r from-white via-slate-50 to-brand-50/20 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity & Contact */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-3xl bg-brand-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-brand-500/20 shrink-0">
              {worker.full_name.split(' ').map((n) => n[0]).join('')}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-brand-700 bg-brand-100/70 px-2.5 py-0.5 rounded-lg border border-brand-200">
                  {worker.serial_number}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {worker.full_name}
                </h1>
                <Badge variant={worker.status === 'Active' ? 'success' : 'neutral'} dot>
                  {worker.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {worker.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {worker.town || worker.village || 'Gujarat'}
                  {worker.address ? ` • ${worker.address}` : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Joined: {formatIndianDate(worker.joining_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsDistributeOpen(true)}
            >
              Issue Consignment
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<IndianRupee className="w-4 h-4" />}
              onClick={() => setIsPaymentOpen(true)}
            >
              Record Payment
            </Button>
            <Button
              variant="ghost"
              size="md"
              icon={<Edit className="w-4 h-4" />}
              onClick={() => setIsEditOpen(true)}
            >
              Edit Details
            </Button>
          </div>
        </div>

        {/* PROMINENT OPERATIONAL & FINANCIAL STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80">
          {/* Stat 1: Pending Quantities */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Pending Saree Knotting
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-900 mt-1">
                {worker.pending_pieces}{' '}
                <span className="text-sm font-semibold text-amber-700">Pieces</span>
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Currently with artisan</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 2: Payable Balance */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-300/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Payable Wage Balance
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-900 mt-1">
                {formatINR(worker.payable_balance)}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Ready for disbursal</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 3: Total Lifetime Earnings */}
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Lifetime Earnings
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                {formatINR(worker.total_earned)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Cumulative work value</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-200/80 text-slate-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </Card>

      {/* SEPARATE PROFILE TABS */}
      <div className="border-b border-slate-200 overflow-x-auto pb-0.5">
        <nav className="flex space-x-1 sm:space-x-2 min-w-max">
          {[
            { id: 'distribution', label: 'Work Distribution', count: distributions.length },
            { id: 'material', label: 'Material Ledger', count: materials.length },
            { id: 'returns', label: 'Work Returns', count: returnBatches.length },
            { id: 'earnings', label: 'Earnings & Wages', count: distributions.length },
            { id: 'payments', label: 'Advances & Payments', count: payments.length },
            { id: 'timeline', label: 'Complete History', count: timeline.length },
            { id: 'personal', label: 'Personal Details' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-700 bg-brand-50/40 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB CONTENT PANELS */}

      {/* 1. WORK DISTRIBUTION TAB (With Snapshot Rate) */}
      {activeTab === 'distribution' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Consignments & Work Batches</h3>
              <p className="text-xs text-slate-500">
                Fabric assigned for knotting. Rate per piece is locked as historical snapshot.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsDistributeOpen(true)}
            >
              Issue New Batch
            </Button>
          </div>

          {distributions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">No batches issued yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Batch Code</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Knot Style</th>
                    <th className="p-3 text-center">Issued</th>
                    <th className="p-3 text-center">Pending</th>
                    <th className="p-3 text-right">Locked Rate</th>
                    <th className="p-3 text-right">Net Payable</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {distributions.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-brand-700">{d.batch_code}</td>
                      <td className="p-3 font-semibold text-slate-800">{d.item_name_snapshot}</td>
                      <td className="p-3 text-slate-600">{d.knot_style}</td>
                      <td className="p-3 text-center">{d.quantity_issued}</td>
                      <td className="p-3 text-center font-bold text-amber-700">{d.quantity_pending}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-700">
                        {formatINR(d.rate_per_piece)}/pc
                      </td>
                      <td className="p-3 text-right font-bold text-brand-700">
                        {formatINR(d.net_payable)}
                      </td>
                      <td className="p-3 text-slate-500">{formatIndianDate(d.due_date)}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={d.status === 'Completed' ? 'success' : 'warning'}
                          size="sm"
                          dot
                        >
                          {d.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {d.quantity_pending > 0 ? (
                          <button
                            onClick={() => handleOpenReceiveModal(d)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1 transition-colors shadow-2xs"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Receive Return
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 2. MATERIAL LEDGER TAB (Double-Entry Debit/Credit with Legend) */}
      {activeTab === 'material' && (
        <div className="space-y-6">
          <MaterialDebitCreditLedger initialWorkerId={worker.id} showWorkerSelector={false} />
        </div>
      )}

      {/* 3. WORK RETURNS TAB */}
      {activeTab === 'returns' && (
        <Card className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Completed Knotting Returns</h3>
            <p className="text-xs text-slate-500">Inspection & return verification of finished pieces</p>
          </div>

          {returnBatches.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No finished returns registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Batch Code</th>
                    <th className="p-3">Item</th>
                    <th className="p-3 text-center">Pieces Returned</th>
                    <th className="p-3">Return Date</th>
                    <th className="p-3">Quality Remarks</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnBatches.map((r) => (
                    <tr key={r.id}>
                      <td className="p-3 font-mono font-bold text-brand-700">{r.batch_code}</td>
                      <td className="p-3 font-semibold text-slate-800">{r.item_name_snapshot}</td>
                      <td className="p-3 text-center font-bold text-emerald-700">
                        {r.quantity_returned} / {r.quantity_issued}
                      </td>
                      <td className="p-3 text-slate-500">
                        {r.return_date ? formatIndianDate(r.return_date) : 'Pending final check'}
                      </td>
                      <td className="p-3 text-slate-600">{r.qc_remarks || 'Knot density verified'}</td>
                      <td className="p-3 text-center">
                        <Badge variant="success" size="sm">
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 4. EARNINGS & MONEY LEDGER TAB */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <MoneyDebitCreditLedger initialWorkerId={worker.id} showWorkerSelector={false} />
        </div>
      )}

      {/* 5. ADVANCES & PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Advances & Wage Disbursements</h3>
              <p className="text-xs text-slate-500">Direct cash and bank/UPI payout register</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsPaymentOpen(true)}
            >
              Record Payment
            </Button>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">No payments recorded yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Amount Disbursed</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Receipt / Ref No</th>
                    <th className="p-3">Authorized By</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="p-3 text-slate-600">{formatIndianDate(p.payment_date)}</td>
                      <td className="p-3">
                        <Badge
                          variant={p.payment_type === 'Wage Payout' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {p.payment_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-extrabold text-emerald-700 text-sm">
                        {formatINR(p.amount)}
                      </td>
                      <td className="p-3 text-slate-700 font-bold">{p.payment_mode}</td>
                      <td className="p-3 font-mono text-slate-500">{p.reference_no || 'Cash Ledger'}</td>
                      <td className="p-3 text-slate-600">{p.disbursed_by_name}</td>
                      <td className="p-3 text-slate-400 truncate max-w-xs">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 6. COMPLETE TRANSACTION HISTORY TAB */}
      {activeTab === 'timeline' && (
        <Card className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Unified Chronological Audit Trail</h3>
            <p className="text-xs text-slate-500">Every consignment, return, fabric receipt, and payout in sequence</p>
          </div>

          <div className="space-y-3 pt-2">
            {timeline.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                  {item.category === 'WORK_ISSUED' && <Layers className="w-5 h-5 text-brand-600" />}
                  {item.category === 'PAYMENT_DISBURSED' && <IndianRupee className="w-5 h-5 text-emerald-600" />}
                  {item.category === 'ADVANCE_GIVEN' && <IndianRupee className="w-5 h-5 text-amber-600" />}
                  {item.category === 'MATERIAL_ISSUED' && <Package className="w-5 h-5 text-indigo-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {formatIndianDate(item.date)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>

                {item.amount && (
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900">{formatINR(item.amount)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 7. PERSONAL DETAILS TAB */}
      {activeTab === 'personal' && (
        <Card className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-base">Artisan Master Record</h3>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit className="w-3.5 h-3.5" />}
              onClick={() => setIsEditOpen(true)}
            >
              Edit Details
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-semibold">Serial Number</p>
              <p className="font-mono font-bold text-brand-700 text-sm mt-0.5">{worker.serial_number}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Active Status</p>
              <p className="font-bold text-slate-800 mt-0.5">{worker.status}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Full Name</p>
              <p className="font-bold text-slate-900 mt-0.5">{worker.full_name}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Mobile Number</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5">{worker.phone}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Town</p>
              <p className="font-bold text-slate-800 mt-0.5">{worker.town}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Address</p>
              <p className="font-bold text-slate-800 mt-0.5">{worker.address || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400 font-semibold">Remarks & Craft Specialization</p>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1">
                {worker.remarks || 'No additional remarks recorded.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* MODAL: GIVE WORK / MATERIAL DISTRIBUTION FORM (Exact match to Work Batches Give Work Form) */}
      {isDistributeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto my-auto border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
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
              <button
                type="button"
                onClick={() => setIsDistributeOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueWork} className="space-y-5">
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
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                  />
                </div>
              </div>

              {/* 2. Worker Card */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Woman Artisan Worker <span className="text-rose-500">*</span>
                </label>
                <div className="p-3.5 bg-brand-50/60 border border-brand-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                      {worker.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{worker.full_name}</div>
                      <div className="text-xs text-slate-500">
                        Serial: <span className="font-mono font-semibold">{worker.serial_number}</span> • Town: {worker.town || worker.village || 'Kutch'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-brand-200">
                    Active Artisan
                  </span>
                </div>
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
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
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

              {/* 5. Estimated Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Estimated Due Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                  />
                </div>
              </div>

              {/* 6. Remarks / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={issueRemarks}
                  onChange={(e) => setIssueRemarks(e.target.value)}
                  placeholder="e.g. Festival priority dispatch / special white silk border"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* 7. Historical Price Protection Disclaimer */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Historical Price Protection:</strong> The current catalogue rate ({formatINR(unitPrice, true)}/pc) will be permanently locked into this transaction. Multiple consignments can be assigned to this worker today.
                </span>
              </div>

              {/* 8. Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDistributeOpen(false)}
                  disabled={isSubmittingWork}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWork}
                  className="py-3 px-6 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-brand-500/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowDownLeft className="w-5 h-5" />
                  <span>{isSubmittingWork ? 'Issuing Consignment...' : 'Dispatch Consignment (Debit Material)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECEIVE RETURN WORK */}
      {selectedDistForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto my-auto border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Receive Work Return
                  </h2>
                  <p className="text-xs text-slate-500">
                    Batch: <span className="font-mono font-bold text-slate-700">{selectedDistForReturn.batch_code}</span> • {selectedDistForReturn.item_name_snapshot}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDistForReturn(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveReturnSubmit} className="space-y-4">
              {/* Batch Summary */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Issued</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedDistForReturn.quantity_issued} pcs</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Pending</p>
                  <p className="font-bold text-amber-700 text-sm mt-0.5">{selectedDistForReturn.quantity_pending} pcs</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Piece Rate</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">₹{selectedDistForReturn.rate_per_piece}/pc</p>
                </div>
              </div>

              {/* Return Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Return Date (IST) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Quantities: Accepted & Rejected */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5">
                    Accepted Pieces <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedDistForReturn.quantity_pending}
                    required
                    value={returnQtyAccepted}
                    onChange={(e) => setReturnQtyAccepted(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-300 rounded-xl text-base font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-emerald-600 mt-1">Generates artisan wage</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">
                    Rejected / QC Defect
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedDistForReturn.quantity_pending}
                    value={returnQtyRejected}
                    onChange={(e) => setReturnQtyRejected(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-amber-50/50 border border-amber-300 rounded-xl text-base font-bold text-amber-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-amber-600 mt-1">₹0.00 wage credited</p>
                </div>
              </div>

              {/* Earned Wage Preview */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800">
                  Artisan Earned Wage:
                </span>
                <span className="text-base font-black text-emerald-900">
                  {typeof returnQtyAccepted === 'number' ? returnQtyAccepted : 0} pcs × ₹{selectedDistForReturn.rate_per_piece} = {formatINR((typeof returnQtyAccepted === 'number' ? returnQtyAccepted : 0) * selectedDistForReturn.rate_per_piece)}
                </span>
              </div>

              {/* Rejection Reason (only if rejected > 0) */}
              {(typeof returnQtyRejected === 'number' && returnQtyRejected > 0) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Defect / Rejection Reason
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium"
                  >
                    <option value="Broken Knots / Missing Knots">Broken Knots / Missing Knots</option>
                    <option value="Fabric Torn / Needle Punched">Fabric Torn / Needle Punched</option>
                    <option value="Uneven / Irregular Knots">Uneven / Irregular Knots</option>
                    <option value="Stains / Dye Bleed / Discoloration">Stains / Dye Bleed / Discoloration</option>
                    <option value="Pattern / Design Mismatch">Pattern / Design Mismatch</option>
                    <option value="Loose Knotting (Unraveling)">Loose Knotting (Unraveling)</option>
                    <option value="Other Defect">Other Defect</option>
                  </select>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="e.g. Quality approved by master artisan"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDistForReturn(null)}
                  disabled={isSubmittingReturn}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span>{isSubmittingReturn ? 'Recording Return...' : 'Record Return & Credit Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT OR ADVANCE */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
              Record Wage Payout / Advance
            </h3>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Payment Category</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="Wage Payout">Wage Payout (Deducts from Payable Balance)</option>
                  <option value="Advance Given">Cash Advance (Deducts from Payable Balance)</option>
                  <option value="Bonus">Artisan Festival Bonus (Adds to Balance)</option>
                </select>
              </div>

              <Input
                label="Amount (₹) *"
                type="number"
                min="1"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="Cash">Cash at Workshop</option>
                  <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                  <option value="UPI">UPI / Google Pay</option>
                </select>
              </div>

              <Input
                label="Receipt / Reference No. (Optional)"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="e.g. CASH-REC-2026-89 or UPI UTR"
              />

              <Input
                label="Notes / Purpose"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Cleared payment for Batches 089 and 090"
              />

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentOpen(false)}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmittingPayment}>
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT WORKER DETAILS */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit Artisan Information</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <Input
                label="Full Name *"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mobile Number *"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
                <Input
                  label="Town *"
                  required
                  value={editTown}
                  onChange={(e) => setEditTown(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Address</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. Near Khatri Chowk, Main Bazaar, Bhuj"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Specialization / Remarks</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="e.g. Expert in fine Shikari work, prefers Gajji Silk sarees..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

