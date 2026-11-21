import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  api,
  WorkerItem,
  WorkDistributionItem,
  MaterialLedgerItem,
  PaymentItem,
  TimelineItem,
  ItemCatalogue,
  MaterialLedgerSummary,
  MaterialTransactionItem,
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
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [distributions, setDistributions] = useState<WorkDistributionItem[]>([]);
  const [materials, setMaterials] = useState<MaterialLedgerItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [materialSummary, setMaterialSummary] = useState<MaterialLedgerSummary | null>(null);

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
      const [w, distList, matList, payList, tlList, matSummary] = await Promise.all([
        api.getWorker(workerId),
        api.getWorkerWorkDistribution(workerId),
        api.getWorkerMaterialLedger(workerId),
        api.getWorkerPayments(workerId),
        api.getWorkerTimeline(workerId),
        api.getMaterialDebitCreditLedger(workerId).catch(() => null),
      ]);
      setWorker(w);
      setDistributions(distList);
      setMaterials(matList);
      setPayments(payList);
      setTimeline(tlList);
      setMaterialSummary(matSummary);

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

  // Memoized lists for the Two-Sided Single Structure Khata
  // Left: RECEIVED (Work Returned) | Right: GIVEN (Work Issued)
  const allReceivedItems = useMemo(() => {
    const items: Array<{
      id: string | number;
      date: string;
      pcs: number;
      amount: number;
      design: string;
      rate: number;
      distributionId?: number;
      batchCode?: string;
      returnCode?: string;
      remarks?: string | null;
    }> = [];

    distributions.forEach((d) => {
      if (d.returns && d.returns.length > 0) {
        d.returns.forEach((r) => {
          items.push({
            id: `ret-${r.id}`,
            date: r.return_date,
            pcs: r.quantity_returned,
            amount: r.completed_work_value || (r.quantity_returned * (r.rate_per_piece_snapshot || d.rate_per_piece)),
            design: r.item_name_snapshot || d.item_name_snapshot,
            rate: r.rate_per_piece_snapshot || d.rate_per_piece,
            distributionId: d.id,
            batchCode: d.batch_code,
            returnCode: r.return_code,
            remarks: r.remarks,
          });
        });
      } else if (d.quantity_returned > 0) {
        items.push({
          id: `dist-ret-${d.id}`,
          date: d.return_date || d.issue_date,
          pcs: d.quantity_returned,
          amount: d.quantity_returned * d.rate_per_piece,
          design: d.item_name_snapshot,
          rate: d.rate_per_piece,
          distributionId: d.id,
          batchCode: d.batch_code,
          remarks: d.remarks,
        });
      }
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [distributions]);

  const allGivenItems = useMemo(() => {
    return distributions.map((d) => ({
      id: `dist-${d.id}`,
      distObj: d,
      date: d.issue_date,
      pcs: d.quantity_issued,
      amount: d.total_gross_wage || (d.quantity_issued * d.rate_per_piece),
      design: d.item_name_snapshot,
      rate: d.rate_per_piece,
      batchCode: d.batch_code,
      pendingPcs: d.quantity_pending,
      returnedPcs: d.quantity_returned,
      dueDate: d.due_date,
      status: d.status,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [distributions]);

  const totalReceivedPcs = allReceivedItems.reduce((sum, item) => sum + item.pcs, 0);
  const totalReceivedAmount = allReceivedItems.reduce((sum, item) => sum + item.amount, 0);
  const totalGivenPcs = allGivenItems.reduce((sum, item) => sum + item.pcs, 0);
  const totalGivenAmount = allGivenItems.reduce((sum, item) => sum + item.amount, 0);
  const netPendingPcs = totalGivenPcs - totalReceivedPcs;

  if (isLoading || !worker) {
    return <LoadingSpinner label="Loading artisan profile..." size="lg" />;
  }

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

      {/* 3-IN-1 SINGLE STRUCTURE: TWO-SIDED ARTISAN WORK KHATA (Received on Left, Given on Right) */}
      <Card className="space-y-6 p-4 sm:p-6 border-slate-200 shadow-sm">
        {/* Khata Header & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-brand-100 text-brand-700">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                Artisan Work & Movement Ledger (Khata)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Single unified ledger structure: <strong>Received on Left</strong> and <strong>Given on Right</strong> in format <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">Date | No of Pcs | Amount | Name of Design</code>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsDistributeOpen(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs"
            >
              + Give Work
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={() => {
                const pendingDist = distributions.find((d) => d.quantity_pending > 0);
                if (pendingDist) {
                  handleOpenReceiveModal(pendingDist);
                } else {
                  showToast({ type: 'info', title: 'No Pending Work', message: 'All given work has been returned.' });
                }
              }}
              className="border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs shadow-xs"
            >
              ↗ Receive Return
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<IndianRupee className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => setIsPaymentOpen(true)}
              className="border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100 font-bold text-xs shadow-xs"
            >
              ₹ Record Payment
            </Button>
          </div>
        </div>

        {/* TWO-SIDED KHATA TABLE: LEFT = RECEIVED | RIGHT = GIVEN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-2 border-slate-300 rounded-2xl overflow-hidden shadow-xs divide-y lg:divide-y-0 lg:divide-x-2 divide-slate-300 bg-white">
          
          {/* ======================================================== */}
          {/* LEFT SIDE: RECEIVED (Work Returned by Artisan)          */}
          {/* Format: Date | No of Pcs | Amount(auto) | Name of design*/}
          {/* ======================================================== */}
          <div className="flex flex-col bg-emerald-50/20">
            <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between border-b border-emerald-900">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-700 text-white">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-sm tracking-wide block uppercase">
                    RECEIVED (આવેલું કામ / जमा)
                  </span>
                  <span className="text-[11px] text-emerald-200 block">
                    When item received from artisan
                  </span>
                </div>
              </div>
              <Badge variant="success" size="sm" className="bg-emerald-700 text-white border-emerald-600">
                {allReceivedItems.length} Entries
              </Badge>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-emerald-100/80 border-b border-emerald-200 text-[11px] font-black text-emerald-950 uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">No of Pcs</th>
                    <th className="p-3 text-right">Amount (Auto-Calc)</th>
                    <th className="p-3">Name of Design</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100/90 font-medium">
                  {allReceivedItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 text-xs italic">
                        No pieces received yet from artisan. Click "Receive Return" above to record returns.
                      </td>
                    </tr>
                  ) : (
                    allReceivedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                          {formatIndianDate(item.date)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-black text-emerald-800 text-xs bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block border border-emerald-200">
                            {item.pcs} pcs
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-emerald-800 font-mono text-sm">
                          {formatINR(item.amount)}
                        </td>
                        <td className="p-3">
                          <span className="font-extrabold text-slate-900 block">{item.design}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            @{formatINR(item.rate)}/pc {item.returnCode ? `• ${item.returnCode}` : ''}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Left Side (Received) Totals Footer */}
            <div className="bg-emerald-100 border-t-2 border-emerald-300 p-3 flex items-center justify-between text-xs font-black text-emerald-950">
              <span className="uppercase tracking-wider">TOTAL RECEIVED:</span>
              <div className="flex items-center gap-4">
                <span className="bg-emerald-200/80 px-2.5 py-0.5 rounded-full text-emerald-900">
                  {totalReceivedPcs} pcs
                </span>
                <span className="text-base font-black text-emerald-950 font-mono">
                  {formatINR(totalReceivedAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT SIDE: GIVEN (Work Issued to Artisan)               */}
          {/* Format: Date | No of Pcs | Amount(auto) | Name of design*/}
          {/* ======================================================== */}
          <div className="flex flex-col bg-rose-50/20">
            <div className="bg-rose-800 text-white px-4 py-3 flex items-center justify-between border-b border-rose-900">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-700 text-white">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-sm tracking-wide block uppercase">
                    GIVEN (આપેલું કામ / उधार)
                  </span>
                  <span className="text-[11px] text-rose-200 block">
                    When item given to artisan
                  </span>
                </div>
              </div>
              <Badge variant="danger" size="sm" className="bg-rose-700 text-white border-rose-600">
                {allGivenItems.length} Batches
              </Badge>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-rose-100/80 border-b border-rose-200 text-[11px] font-black text-rose-950 uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">No of Pcs</th>
                    <th className="p-3 text-right">Amount (Auto-Calc)</th>
                    <th className="p-3">Name of Design</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100/90 font-medium">
                  {allGivenItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 text-xs italic">
                        No items given yet to artisan. Click "+ Give Work" above to assign fabric.
                      </td>
                    </tr>
                  ) : (
                    allGivenItems.map((item) => (
                      <tr key={item.id} className="hover:bg-rose-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                          {formatIndianDate(item.date)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-black text-rose-800 text-xs bg-rose-100 px-2.5 py-0.5 rounded-full inline-block border border-rose-200">
                            {item.pcs} pcs
                          </span>
                          {item.pendingPcs > 0 && (
                            <span className="text-[10px] text-amber-800 font-extrabold mt-0.5 block">
                              ({item.pendingPcs} pending)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-black text-rose-800 font-mono text-sm">
                          {formatINR(item.amount)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-extrabold text-slate-900 block">{item.design}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                @{formatINR(item.rate)}/pc • {item.batchCode}
                              </span>
                            </div>
                            {item.pendingPcs > 0 && (
                              <button
                                onClick={() => handleOpenReceiveModal(item.distObj)}
                                className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors shrink-0 border border-emerald-300"
                                title="Receive knots for this batch"
                              >
                                Receive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Right Side (Given) Totals Footer */}
            <div className="bg-rose-100 border-t-2 border-rose-300 p-3 flex items-center justify-between text-xs font-black text-rose-950">
              <span className="uppercase tracking-wider">TOTAL GIVEN:</span>
              <div className="flex items-center gap-4">
                <span className="bg-rose-200/80 px-2.5 py-0.5 rounded-full text-rose-900">
                  {totalGivenPcs} pcs
                </span>
                <span className="text-base font-black text-rose-950 font-mono">
                  {formatINR(totalGivenAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* NET RECONCILIATION SUMMARY BAR */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-slate-50 to-emerald-50 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">
                Net Pending Material with Artisan:{' '}
                <span className="text-amber-900 font-black">{netPendingPcs} Pieces</span>
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Formula: Total Given ({totalGivenPcs} pcs) − Total Received ({totalReceivedPcs} pcs) = {netPendingPcs} pcs remaining
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Work Value Given</span>
              <span className="font-mono font-bold text-rose-800 text-sm">{formatINR(totalGivenAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Wages Earned (Received)</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">{formatINR(totalReceivedAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Payable Balance</span>
              <span className="font-mono font-extrabold text-brand-700 text-base">{formatINR(worker.payable_balance)}</span>
            </div>
          </div>
        </div>

        {/* INTEGRATED SECTION 2: WAGE DISBURSEMENTS & CASH ADVANCES */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                Payments & Cash Advances Ledger
              </h3>
              <p className="text-[11px] text-slate-500">
                Wage payments disbursed and cash/UPI advances given to {worker.full_name}.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsPaymentOpen(true)}
              className="font-bold text-xs self-start sm:self-auto"
            >
              + Record Payment / Advance
            </Button>
          </div>

          {payments.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
              No payments recorded yet for this artisan.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Receipt / Ref No</th>
                    <th className="p-3">Authorized By</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-slate-600">{formatIndianDate(p.payment_date)}</td>
                      <td className="p-3">
                        <Badge
                          variant={p.payment_type === 'Wage Payout' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {p.payment_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-extrabold text-emerald-700 text-sm font-mono">
                        {formatINR(p.amount)}
                      </td>
                      <td className="p-3 text-slate-700 font-bold">{p.payment_mode}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{p.reference_no || 'Cash Ledger'}</td>
                      <td className="p-3 text-slate-600">{p.disbursed_by_name}</td>
                      <td className="p-3 text-slate-400 truncate max-w-xs">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* INTEGRATED SECTION 3: RECENT ACTIVITY TIMELINE */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-brand-600" />
              Chronological Audit Trail
            </h3>
            <p className="text-[11px] text-slate-500">
              Unified chronological timeline of work dispatches, returns, and cash disbursements.
            </p>
          </div>

          {timeline.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
              No activity logged yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {timeline.map((item) => {
                const isIssued = item.category === 'WORK_ISSUED';
                const isReturned = item.category === 'WORK_RETURNED';
                const isRemaining = isReturned && item.remaining_quantity === 0;
                const isPayment = item.category === 'PAYMENT_DISBURSED';
                const isAdvance = item.category === 'ADVANCE_GIVEN';

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isIssued
                            ? 'bg-rose-50 text-rose-600'
                            : isRemaining
                            ? 'bg-emerald-600 text-white'
                            : isReturned
                            ? 'bg-emerald-50 text-emerald-600'
                            : isAdvance
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {isIssued && <ArrowDownLeft className="w-3.5 h-3.5" />}
                        {isReturned && (isRemaining ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />)}
                        {(isPayment || isAdvance) && <IndianRupee className="w-3.5 h-3.5" />}
                        {!isIssued && !isReturned && !isPayment && !isAdvance && <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">{item.title}</span>
                          <Badge
                            variant={
                              isIssued
                                ? 'danger'
                                : isRemaining
                                ? 'success'
                                : isReturned
                                ? 'success'
                                : isAdvance
                                ? 'warning'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {item.status_badge}
                          </Badge>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 sm:self-center">
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        {formatIndianDate(item.date)}
                      </span>
                      {item.amount && (
                        <p
                          className={`font-bold text-xs mt-0.5 font-mono ${
                            isIssued
                              ? 'text-slate-700'
                              : isReturned
                              ? 'text-emerald-700'
                              : isAdvance
                              ? 'text-amber-700'
                              : 'text-blue-700'
                          }`}
                        >
                          {formatINR(item.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

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

