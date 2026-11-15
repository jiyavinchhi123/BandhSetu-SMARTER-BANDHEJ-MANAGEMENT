import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  RotateCcw,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Info,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import {
  api,
  MaterialLedgerSummary,
  MaterialTransactionItem,
  WorkerItem,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatIndianDate } from '../../utils/formatters';

interface MaterialDebitCreditLedgerProps {
  initialWorkerId?: number;
  showWorkerSelector?: boolean;
}

export const MaterialDebitCreditLedger: React.FC<MaterialDebitCreditLedgerProps> = ({
  initialWorkerId,
  showWorkerSelector = true,
}) => {
  const { role } = useAuth();
  const { showToast } = useToast();
  const isAdmin = role === 'admin';

  const [selectedWorkerId, setSelectedWorkerId] = useState<number | undefined>(initialWorkerId);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [isSearchingWorker, setIsSearchingWorker] = useState(false);

  const [ledgerSummary, setLedgerSummary] = useState<MaterialLedgerSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Reversal Modal State
  const [reversingTxn, setReversingTxn] = useState<MaterialTransactionItem | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [submittingReversal, setSubmittingReversal] = useState(false);

  // Fetch workers for search
  useEffect(() => {
    if (!showWorkerSelector) return;
    const fetchWorkerList = async () => {
      try {
        setIsSearchingWorker(true);
        const data = await api.getWorkers({ q: workerSearch.trim() || undefined, limit: 15 });
        setWorkers(data);
        if (!selectedWorkerId && data.length > 0 && !initialWorkerId) {
          setSelectedWorkerId(data[0].id);
        }
      } catch (err: any) {
        // ignore background worker load err
      } finally {
        setIsSearchingWorker(false);
      }
    };

    const debounce = setTimeout(fetchWorkerList, 250);
    return () => clearTimeout(debounce);
  }, [workerSearch, showWorkerSelector]);

  // Load ledger when selected worker changes
  const loadLedger = useCallback(async () => {
    if (!selectedWorkerId) return;
    setLoading(true);
    try {
      const summary = await api.getMaterialDebitCreditLedger(selectedWorkerId);
      setLedgerSummary(summary);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Ledger',
        message: err.message || 'Failed to fetch material debit-credit ledger',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedWorkerId, showToast]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // Handle Reversal Submission
  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingTxn) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 4) {
      showToast({
        type: 'error',
        title: 'Reason Required',
        message: 'Please provide a clear reason (min 4 characters) for reversing this transaction.',
      });
      return;
    }

    try {
      setSubmittingReversal(true);
      await api.reverseMaterialTransaction(reversingTxn.id, {
        reason: reversalReason.trim(),
      });
      showToast({
        type: 'success',
        title: 'Transaction Reversed',
        message: `Transaction ${reversingTxn.transaction_code} has been marked as reversed with compensating adjustment.`,
      });
      setReversingTxn(null);
      setReversalReason('');
      loadLedger();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Reversal Failed',
        message: err.message || 'Could not reverse transaction',
      });
    } finally {
      setSubmittingReversal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Worker Selector */}
      {showWorkerSelector && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Artisan Worker
            </label>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, serial (e.g. 'Rekhaben', 'WRK')..."
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            {/* Quick suggestions pills */}
            <div className="flex flex-wrap gap-1.5 mt-2 max-w-lg">
              {workers.slice(0, 5).map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    selectedWorkerId === w.id
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {w.full_name} ({w.serial_number})
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={loadLedger}
              title="Refresh Ledger"
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Clear Screen Legend (Mandatory Business Requirement) */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Material Debit-Credit Legend (Worker-Account Perspective)
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-rose-500/30 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-rose-400 block font-semibold">DEBIT (Given)</strong>
              <span className="text-slate-300 text-[11px]">Material Given to Worker = Debit quantity</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-emerald-400 block font-semibold">CREDIT (Received)</strong>
              <span className="text-slate-300 text-[11px]">Completed Material Returned = Credit quantity</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-amber-500/30 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-amber-400 block font-semibold">REJECTED (Defect)</strong>
              <span className="text-slate-300 text-[11px]">Defective piece returned = No wages earned</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent mb-3" />
          <p className="text-sm text-slate-500">Calculating double-entry balances...</p>
        </div>
      ) : !ledgerSummary ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          Select an artisan worker to inspect her material debit-credit ledger.
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Given</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  DEBIT
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">
                {ledgerSummary.total_given}{' '}
                <span className="text-xs font-normal text-slate-500">pieces</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Material assigned to worker</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Received</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  CREDIT
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                {ledgerSummary.total_received}{' '}
                <span className="text-xs font-normal text-slate-500">pieces</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Accepted completed pieces</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Rejected</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  QC DEFECT
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {ledgerSummary.total_rejected}{' '}
                <span className="text-xs font-normal text-slate-500">pieces</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Returned broken/damaged</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-brand-50/40 to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-900">Remaining Pending</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ledgerSummary.remaining_pending > 0
                      ? 'bg-brand-100 text-brand-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {ledgerSummary.remaining_pending > 0 ? 'Active Work' : 'All Clear'}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {ledgerSummary.remaining_pending}{' '}
                <span className="text-xs font-normal text-slate-500">pieces</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Formula: {ledgerSummary.total_given} - {ledgerSummary.total_received} - {ledgerSummary.total_rejected}
              </div>
            </div>
          </div>

          {/* Item-Wise Pending Quantities (Prominent Requirement B) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Item-Wise Pending Quantities for {ledgerSummary.worker_name} ({ledgerSummary.worker_serial})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                {ledgerSummary.item_wise_pending.length} Distinct Design(s)
              </span>
            </div>

            {ledgerSummary.item_wise_pending.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active or historical items recorded for this artisan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-4">Item / Design</th>
                      <th className="py-2.5 px-4 text-right">Given (Debit)</th>
                      <th className="py-2.5 px-4 text-right">Received (Credit)</th>
                      <th className="py-2.5 px-4 text-right">Rejected</th>
                      <th className="py-2.5 px-4 text-right font-bold text-brand-700">Remaining Pending</th>
                      <th className="py-2.5 px-4 text-right">Rate / Piece</th>
                      <th className="py-2.5 px-4 text-right">Estimated Pending Wage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerSummary.item_wise_pending.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.item_name}
                          {item.item_code && (
                            <span className="ml-2 font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.item_code}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-600 font-medium">
                          {item.total_given} pcs
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                          {item.total_received} pcs
                        </td>
                        <td className="py-3 px-4 text-right text-amber-600 font-medium">
                          {item.total_rejected > 0 ? `${item.total_rejected} pcs` : '0'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                              item.pending_quantity > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.pending_quantity} pcs
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {formatINR(item.rate_per_piece, true)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatINR(item.estimated_pending_wage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Full Double-Entry Transaction Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Full Material Debit-Credit Transaction Ledger
                </h3>
                <p className="text-[11px] text-slate-500">
                  Auditable transaction history with running balances. Records cannot be deleted.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {ledgerSummary.transactions.length} Transactions
              </span>
            </div>

            {ledgerSummary.transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No ledger transactions found for this worker.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Txn ID</th>
                      <th className="py-3 px-4">Item Design</th>
                      <th className="py-3 px-4 text-center">Type</th>
                      <th className="py-3 px-4 text-right text-rose-700">Debit (Given)</th>
                      <th className="py-3 px-4 text-right text-emerald-700">Credit (Received)</th>
                      <th className="py-3 px-4 text-right text-amber-700">Rejected</th>
                      <th className="py-3 px-4 text-right font-bold text-slate-900">Running Balance</th>
                      <th className="py-3 px-4">Recorded By</th>
                      <th className="py-3 px-4">Remarks</th>
                      {isAdmin && <th className="py-3 px-4 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerSummary.transactions.map((txn) => {
                      const isDebit = txn.debit_qty > 0;
                      const isCredit = txn.credit_qty > 0;
                      const isRejected = txn.rejected_qty > 0 && !isCredit && !isDebit;

                      return (
                        <tr
                          key={txn.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            txn.is_reversed ? 'opacity-40 bg-slate-50 line-through' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {formatIndianDate(txn.transaction_date)}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {txn.transaction_code}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {txn.item_name}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {txn.transaction_type === 'DEBIT_GIVEN' ? (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3" /> DEBIT
                              </span>
                            ) : txn.transaction_type === 'CREDIT_RECEIVED' ? (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" /> CREDIT
                              </span>
                            ) : txn.transaction_type === 'REJECTED_RETURNED' ? (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> REJECTED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> ADJUSTMENT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600">
                            {txn.debit_qty > 0 ? `+${txn.debit_qty}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            {txn.credit_qty > 0 ? `-${txn.credit_qty}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-amber-600">
                            {txn.rejected_qty > 0 ? `-${txn.rejected_qty}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                            {txn.running_balance}{' '}
                            <span className="text-[10px] font-normal text-slate-400">pcs</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {txn.recorded_by_name || 'System'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                            {txn.is_reversed
                              ? `[REVERSED: ${txn.reversal_reason}] ${txn.remarks || ''}`
                              : txn.remarks || '—'}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-center">
                              {!txn.is_reversed && txn.transaction_type !== 'LEDGER_CORRECTION' ? (
                                <button
                                  onClick={() => {
                                    setReversingTxn(txn);
                                    setReversalReason('');
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors inline-flex items-center gap-1"
                                  title="Auditable Reversal"
                                >
                                  <RotateCcw className="w-3 h-3" /> Reverse
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Locked</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Admin Auditable Reversal Modal */}
      {reversingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Auditable Transaction Reversal
                </h3>
                <p className="text-xs text-slate-500">
                  Txn Code: <span className="font-mono font-semibold">{reversingTxn.transaction_code}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReversal} className="mt-4 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
                <strong className="block font-semibold mb-1">Permanent Audit Policy:</strong>
                Financial & material transactions are never deleted. Reversing this will flag the record as reversed and automatically post a compensating adjustment to restore the worker’s balance.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Reversal <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Accidental duplicate entry by operator / wrong worker selected"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReversingTxn(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReversal}
                  className="px-5 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submittingReversal ? 'Reversing...' : 'Confirm Auditable Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

