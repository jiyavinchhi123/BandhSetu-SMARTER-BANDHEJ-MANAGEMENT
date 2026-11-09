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
import { formatINR, formatIndianDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';

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

  // Issue Work Modal State
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemCatalogue | null>(null);
  const [knotStyle, setKnotStyle] = useState('Bharti (Dense)');
  const [quantity, setQuantity] = useState(20);
  const [dueDate, setDueDate] = useState('');
  const [bonus, setBonus] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [issueRemarks, setIssueRemarks] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

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
  const [editVillage, setEditVillage] = useState('');
  const [editTown, setEditTown] = useState('');
  const [editCity, setEditCity] = useState('');
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
      setEditVillage(w.village);
      setEditTown(w.town);
      setEditCity(w.city);
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

  // Issue Work Consignment Submission (Includes snapshot rate)
  const handleIssueWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      showToast({ type: 'error', title: 'Item Required', message: 'Please search and select an item.' });
      return;
    }
    if (!dueDate) {
      showToast({ type: 'error', title: 'Due Date Required', message: 'Please select an estimated return date.' });
      return;
    }

    setIsSubmittingWork(true);
    try {
      const created = await api.distributeWork(workerId, {
        item_id: selectedItem.id,
        knot_style: knotStyle,
        quantity_issued: Number(quantity),
        due_date: dueDate,
        bonus: Number(bonus),
        deductions: Number(deductions),
        remarks: issueRemarks.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Consignment Dispatched',
        message: `Batch ${created.batch_code} issued with rate ₹${created.rate_per_piece}/pc (Historical rate locked).`,
      });

      setIsDistributeOpen(false);
      setSelectedItem(null);
      setQuantity(20);
      setDueDate('');
      setIssueRemarks('');
      loadWorkerData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to Issue Work', message: err.message });
    } finally {
      setIsSubmittingWork(false);
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
        full_name: editName,
        phone: editPhone,
        village: editVillage,
        town: editTown,
        city: editCity,
        status: editStatus,
        remarks: editRemarks,
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
                  {worker.village}, {worker.town} ({worker.city})
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 2. MATERIAL LEDGER TAB */}
      {activeTab === 'material' && (
        <Card className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Raw Fabric & Yarn Material Ledger</h3>
            <p className="text-xs text-slate-500">Track fabric meters, saree pieces, and tying thread cones</p>
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">No material logged yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Lot Code</th>
                    <th className="p-3">Material Type</th>
                    <th className="p-3 text-center">Issued Qty</th>
                    <th className="p-3 text-center">Returned Qty</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-700">{m.lot_number || '—'}</td>
                      <td className="p-3 font-semibold text-slate-800">{m.material_type}</td>
                      <td className="p-3 text-center font-bold">
                        {m.issued_qty} {m.unit}
                      </td>
                      <td className="p-3 text-center text-slate-600">
                        {m.returned_qty} {m.unit}
                      </td>
                      <td className="p-3 text-slate-500">{formatIndianDate(m.issue_date)}</td>
                      <td className="p-3 text-center">
                        <Badge variant={m.status === 'Returned' ? 'success' : 'neutral'} size="sm">
                          {m.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400 truncate max-w-xs">{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Artisan Earnings & Wages Ledger</h3>
              <p className="text-xs text-slate-500">
                Calculated piece-rate remuneration with bonus and deductions
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-semibold">Total Net Value: </span>
              <span className="text-base font-bold text-slate-900">{formatINR(worker.total_earned)}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="p-3">Batch Code</th>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Locked Rate</th>
                  <th className="p-3 text-right">Gross Wage</th>
                  <th className="p-3 text-right">Bonus</th>
                  <th className="p-3 text-right">Deductions</th>
                  <th className="p-3 text-right">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {distributions.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono font-bold text-brand-700">{e.batch_code}</td>
                    <td className="p-3 font-semibold text-slate-800">{e.item_name_snapshot}</td>
                    <td className="p-3 text-center font-bold">{e.quantity_issued}</td>
                    <td className="p-3 text-right font-mono">{formatINR(e.rate_per_piece)}</td>
                    <td className="p-3 text-right font-bold text-slate-800">{formatINR(e.total_gross_wage)}</td>
                    <td className="p-3 text-right text-emerald-600 font-semibold">+{formatINR(e.bonus)}</td>
                    <td className="p-3 text-right text-rose-600 font-semibold">-{formatINR(e.deductions)}</td>
                    <td className="p-3 text-right font-extrabold text-brand-700 text-sm">
                      {formatINR(e.net_payable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
              <p className="text-slate-400 font-semibold">Village / Locality</p>
              <p className="font-bold text-slate-800 mt-0.5">{worker.village}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Town & District</p>
              <p className="font-bold text-slate-800 mt-0.5">{worker.town}, {worker.city}</p>
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

      {/* MODAL: ISSUE WORK CONSIGNMENT (With Searchable Dropdown & Auto Price Fetch) */}
      {isDistributeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-600" />
                Issue Work Consignment to {worker.full_name}
              </h3>
              <p className="text-xs text-slate-500">
                Select fabric item to automatically fetch its piece rate and lock the historical snapshot.
              </p>
            </div>

            <form onSubmit={handleIssueWork} className="space-y-4">
              {/* Searchable Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Item Catalogue * (Type to search, e.g. "R")
                </label>
                <ItemSearchSelect
                  value={selectedItem?.id || null}
                  onChange={(item) => setSelectedItem(item)}
                />
              </div>

              {/* Automatically Fetched Price Display */}
              {selectedItem && (
                <div className="p-3 bg-brand-50 rounded-xl border border-brand-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-brand-900">{selectedItem.item_name}</span>
                    <p className="text-[11px] text-brand-700">Historical snapshot rate applicable</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-brand-600 uppercase font-semibold">Piece Rate:</span>
                    <p className="text-base font-extrabold text-brand-800">
                      {formatINR(selectedItem.price_per_piece)}/pc
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Knot Style *</label>
                  <select
                    value={knotStyle}
                    onChange={(e) => setKnotStyle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium"
                  >
                    <option value="Bharti (Dense)">Bharti (Dense)</option>
                    <option value="Ekdali (Single Dot)">Ekdali (Single Dot)</option>
                    <option value="Shikari (Motif)">Shikari (Motif)</option>
                    <option value="Jaal (All-Over Mesh)">Jaal (All-Over Mesh)</option>
                    <option value="Laddu-Jalebi Circles">Laddu-Jalebi Circles</option>
                  </select>
                </div>

                <Input
                  label="Quantity of Sarees/Pieces *"
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Estimated Return Due Date *"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <Input
                  label="Incentive Bonus (₹)"
                  type="number"
                  min="0"
                  value={bonus}
                  onChange={(e) => setBonus(Number(e.target.value))}
                />
              </div>

              {/* Calculated Wage Preview */}
              {selectedItem && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between font-medium">
                  <span>Gross Calculated Wage:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {quantity} × {formatINR(selectedItem.price_per_piece)} + ₹{bonus} ={' '}
                    <span className="text-brand-700">
                      {formatINR(quantity * selectedItem.price_per_piece + Number(bonus))}
                    </span>
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDistributeOpen(false)}
                  disabled={isSubmittingWork}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmittingWork}>
                  Confirm & Dispatch Batch
                </Button>
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
                label="Full Name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mobile Number"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
                <Input
                  label="Village"
                  required
                  value={editVillage}
                  onChange={(e) => setEditVillage(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Town"
                  value={editTown}
                  onChange={(e) => setEditTown(e.target.value)}
                />
                <Input
                  label="City"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-700">Remarks</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
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

