import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users,
  Layers,
  IndianRupee,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, Button, Badge, EmptyState, ConfirmDialog } from '../components/ui';
import { formatINR, formatIndianDate, formatIndianDateTime } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { HealthResponse } from '../services/api';

interface OutletContextType {
  searchTerm: string;
  health: HealthResponse | null;
  isHealthLoading: boolean;
  refreshHealth: () => void;
}

interface BatchItem {
  id: string;
  batchCode: string;
  artisanName: string;
  village: string;
  knotStyle: string;
  pieces: number;
  ratePerPiece: number;
  totalPayable: number;
  issuedDate: string;
  dueDate: string;
  status: 'In Progress' | 'Quality Check' | 'Ready for Payout' | 'Settled';
}

const mockBatches: BatchItem[] = [
  {
    id: '1',
    batchCode: 'BAT-2026-089',
    artisanName: 'Kamlaben Vaghela',
    village: 'Anjar, Kutch',
    knotStyle: 'Ekdali (Single Dot)',
    pieces: 45,
    ratePerPiece: 120,
    totalPayable: 5400,
    issuedDate: '2026-11-01',
    dueDate: '2026-11-12',
    status: 'Ready for Payout',
  },
  {
    id: '2',
    batchCode: 'BAT-2026-090',
    artisanName: 'Santoshben Parmar',
    village: 'Mandvi, Bhuj',
    knotStyle: 'Shikari (Motif Work)',
    pieces: 28,
    ratePerPiece: 260,
    totalPayable: 7280,
    issuedDate: '2026-11-03',
    dueDate: '2026-11-14',
    status: 'In Progress',
  },
  {
    id: '3',
    batchCode: 'BAT-2026-091',
    artisanName: 'Meenaben Solanki',
    village: 'Jamnagar Rural',
    knotStyle: 'Jaal (Intricate Mesh)',
    pieces: 15,
    ratePerPiece: 450,
    totalPayable: 6750,
    issuedDate: '2026-11-04',
    dueDate: '2026-11-15',
    status: 'Quality Check',
  },
  {
    id: '4',
    batchCode: 'BAT-2026-092',
    artisanName: 'Geetaben Rathod',
    village: 'Mundra',
    knotStyle: 'Bharti (Dense Filling)',
    pieces: 32,
    ratePerPiece: 180,
    totalPayable: 5760,
    issuedDate: '2026-11-05',
    dueDate: '2026-11-16',
    status: 'In Progress',
  },
  {
    id: '5',
    batchCode: 'BAT-2026-087',
    artisanName: 'Dhaniben Jadeja',
    village: 'Khavda',
    knotStyle: 'Laddu-Jalebi Circles',
    pieces: 40,
    ratePerPiece: 210,
    totalPayable: 8400,
    issuedDate: '2026-10-28',
    dueDate: '2026-11-08',
    status: 'Settled',
  },
];

export const Dashboard: React.FC = () => {
  const { searchTerm } = useOutletContext<OutletContextType>();
  const { showToast } = useToast();

  const [batches, setBatches] = useState<BatchItem[]>(mockBatches);
  const [selectedBatchForPayout, setSelectedBatchForPayout] = useState<BatchItem | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Filter batches based on search
  const filteredBatches = useMemo(() => {
    if (!searchTerm.trim()) return batches;
    const q = searchTerm.toLowerCase();
    return batches.filter(
      (b) =>
        b.artisanName.toLowerCase().includes(q) ||
        b.batchCode.toLowerCase().includes(q) ||
        b.village.toLowerCase().includes(q) ||
        b.knotStyle.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q)
    );
  }, [batches, searchTerm]);

  // Aggregate KPI stats
  const totalActiveWorkers = 384;
  const activeBatchesCount = batches.filter((b) => b.status !== 'Settled').length;
  const totalPendingPayout = batches
    .filter((b) => b.status === 'Ready for Payout')
    .reduce((sum, b) => sum + b.totalPayable, 0);

  // Handle sensitive action: Payout confirmation
  const handleConfirmPayout = () => {
    if (!selectedBatchForPayout) return;

    setIsProcessingAction(true);
    setTimeout(() => {
      setBatches((prev) =>
        prev.map((b) =>
          b.id === selectedBatchForPayout.id ? { ...b, status: 'Settled' } : b
        )
      );
      setIsProcessingAction(false);
      showToast({
        type: 'success',
        title: 'Payment Disbursed Successfully',
        message: `${formatINR(selectedBatchForPayout.totalPayable)} recorded for ${
          selectedBatchForPayout.artisanName
        }.`,
      });
      setSelectedBatchForPayout(null);
    }, 800);
  };

  const getStatusBadgeVariant = (status: BatchItem['status']) => {
    switch (status) {
      case 'Settled':
        return 'success';
      case 'Ready for Payout':
        return 'info';
      case 'Quality Check':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 text-white p-6 sm:p-8 shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kutch & Saurashtra Bandhej Cluster</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
            Bandhej Artisan Workshop Management
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Real-time tracking of piece-rate knotting, fabric consignments, quality audits,
            and wage settlements for 380+ women craftswomen.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <Card className="flex flex-col justify-between" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Artisans</span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {totalActiveWorkers}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18 registered this month</span>
            </p>
          </div>
        </Card>

        {/* Metric 2 */}
        <Card className="flex flex-col justify-between" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Batches in Knotting</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {activeBatchesCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>160 Sarees under knotting</span>
            </p>
          </div>
        </Card>

        {/* Metric 3 */}
        <Card className="flex flex-col justify-between" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Wages</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatINR(totalPendingPayout)}
            </div>
            <p className="text-[11px] text-brand-600 font-semibold mt-1">
              Ready for immediate disbursal
            </p>
          </div>
        </Card>

        {/* Metric 4 */}
        <Card className="flex flex-col justify-between" hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">QC Pass Rate</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              98.4%
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tying tension & dots verified</span>
            </p>
          </div>
        </Card>
      </div>

      {/* Quick Action Buttons (Touch Friendly) */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() =>
            showToast({
              type: 'info',
              title: 'Issue New Consignment',
              message: 'Batch assignment modal will launch in Step 2.',
            })
          }
        >
          Issue New Batch
        </Button>

        <Button
          variant="outline"
          size="md"
          icon={<IndianRupee className="w-4 h-4" />}
          onClick={() =>
            showToast({
              type: 'info',
              title: 'Batch Wage Payout',
              message: 'Wage register calculation ready.',
            })
          }
        >
          Disburse Wages
        </Button>

        <Button
          variant="outline"
          size="md"
          icon={<Users className="w-4 h-4" />}
          onClick={() =>
            showToast({
              type: 'info',
              title: 'Worker Registration',
              message: 'Artisan enrollment form is staged.',
            })
          }
        >
          Add Artisan
        </Button>
      </div>

      {/* Recent Batches Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Recent Production Batches
            </h3>
            <p className="text-xs text-slate-500">
              Assigned fabric, knot styles, and wage calculation per artisan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Showing {filteredBatches.length} of {batches.length}
            </span>
          </div>
        </div>

        {filteredBatches.length === 0 ? (
          <EmptyState
            title="No batches match your search"
            description={`No records found matching "${searchTerm}". Try a different artisan name or batch code.`}
            actionLabel="Reset Search"
            onAction={() => window.location.reload()}
          />
        ) : (
          <>
            {/* Desktop Table View (hidden on small screens) */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Batch Code</th>
                    <th className="py-3 px-4">Artisan Worker</th>
                    <th className="py-3 px-4">Knot Style</th>
                    <th className="py-3 px-4 text-center">Pieces</th>
                    <th className="py-3 px-4 text-right">Rate</th>
                    <th className="py-3 px-4 text-right">Payable</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-xs text-brand-700">
                        {batch.batchCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{batch.artisanName}</p>
                        <p className="text-xs text-slate-400">{batch.village}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                        {batch.knotStyle}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                        {batch.pieces}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-slate-600 font-medium">
                        {formatINR(batch.ratePerPiece)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatINR(batch.totalPayable)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatIndianDate(batch.dueDate)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={getStatusBadgeVariant(batch.status)} dot>
                          {batch.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {batch.status === 'Ready for Payout' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedBatchForPayout(batch)}
                          >
                            Pay ₹
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (visible on mobile screens < md) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                        {batch.batchCode}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">
                        {batch.artisanName}
                      </h4>
                      <p className="text-xs text-slate-500">{batch.village}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(batch.status)} dot size="sm">
                      {batch.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 bg-slate-50/50 rounded-xl px-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Style</p>
                      <p className="font-medium text-slate-700 truncate">{batch.knotStyle}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Quantity</p>
                      <p className="font-semibold text-slate-800">{batch.pieces} Sarees</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Rate</p>
                      <p className="font-medium text-slate-700">{formatINR(batch.ratePerPiece)}/pc</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Payable</p>
                      <p className="font-bold text-brand-700 text-sm">
                        {formatINR(batch.totalPayable)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Due: {formatIndianDate(batch.dueDate)}
                    </span>

                    {batch.status === 'Ready for Payout' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedBatchForPayout(batch)}
                      >
                        Disburse Payout
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog for Sensitive Business Action */}
      <ConfirmDialog
        isOpen={selectedBatchForPayout !== null}
        title="Confirm Wage Disbursement"
        description={
          selectedBatchForPayout
            ? `Are you sure you want to disburse ${formatINR(
                selectedBatchForPayout.totalPayable
              )} to ${selectedBatchForPayout.artisanName} for Batch ${
                selectedBatchForPayout.batchCode
              }? This action records an immediate cash/bank transaction in the ledger.`
            : ''
        }
        confirmText="Confirm & Disburse"
        cancelText="Cancel"
        variant="primary"
        isLoading={isProcessingAction}
        onConfirm={handleConfirmPayout}
        onCancel={() => setSelectedBatchForPayout(null)}
      />
    </div>
  );
};

