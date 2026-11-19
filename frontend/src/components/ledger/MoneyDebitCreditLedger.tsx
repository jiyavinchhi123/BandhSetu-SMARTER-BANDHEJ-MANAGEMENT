import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Info,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import {
  api,
  MoneyLedgerSummary,
  MoneyTransactionItem,
  WorkerItem,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatIndianDate } from '../../utils/formatters';

interface MoneyDebitCreditLedgerProps {
  initialWorkerId?: number;
  showWorkerSelector?: boolean;
}

export const MoneyDebitCreditLedger: React.FC<MoneyDebitCreditLedgerProps> = ({
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

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [ledgerSummary, setLedgerSummary] = useState<MoneyLedgerSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Reversal Modal State
  const [reversingTxn, setReversingTxn] = useState<MoneyTransactionItem | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [submittingReversal, setSubmittingReversal] = useState(false);

  // Search workers
  useEffect(() => {
    if (!showWorkerSelector) return;
    const fetchWorkerList = async () => {
      try {
        setIsSearchingWorker(true);
        const data = await api.getWorkers({ q: workerSearch.trim() || undefined, limit: 12 });
        setWorkers(data);
        if (!selectedWorkerId && data.length > 0 && !initialWorkerId) {
          setSelectedWorkerId(data[0].id);
        }
      } catch (err) {
        // ignore
      } finally {
        setIsSearchingWorker(false);
      }
    };

    const debounce = setTimeout(fetchWorkerList, 250);
    return () => clearTimeout(debounce);
  }, [workerSearch, showWorkerSelector]);

  // Load money ledger summary
  const loadLedger = useCallback(async () => {
    if (!selectedWorkerId) return;
    setLoading(true);
    try {
      const summary = await api.getMoneyLedger(selectedWorkerId, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setLedgerSummary(summary);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Money Ledger',
        message: err.message || 'Failed to fetch financial ledger summary',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedWorkerId, startDate, endDate, showToast]);

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
        message: 'Please provide a clear reason (min 4 characters) for reversing this financial entry.',
      });
      return;
    }

    try {
      setSubmittingReversal(true);
      await api.reverseMoneyTransaction(reversingTxn.id, {
        reason: reversalReason.trim(),
      });
      showToast({
        type: 'success',
        title: 'Transaction Reversed',
        message: `Financial entry ${reversingTxn.transaction_code} has been marked as reversed with compensating adjustment.`,
      });
      setReversingTxn(null);
      setReversalReason('');
      loadLedger();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Reversal Failed',
        message: err.message || 'Could not reverse financial transaction',
      });
    } finally {
      setSubmittingReversal(false);
    }
  };

  // Handle Printable Statement Trigger
  const handlePrintStatement = () => {
    window.print();
  };

  // Handle CSV Download
  const handleDownloadCsv = () => {
    if (!selectedWorkerId) return;
    const url = api.getStatementCsvUrl(selectedWorkerId);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `Statement_${ledgerSummary?.worker_serial || selectedWorkerId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Artisan Selector */}
      {showWorkerSelector && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Artisan Worker
            </label>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, serial (e.g. 'Radhaben', 'WRK')..."
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
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
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
              onClick={handlePrintStatement}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Print Account Statement"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Print Statement
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Download Statement as CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Download CSV
            </button>
            <button
              onClick={loadLedger}
              title="Refresh Ledger"
              className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Clear Screen Legend (Mandatory Business Requirement) */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Money Debit-Credit Legend (Worker-Account Perspective)
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-emerald-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-emerald-400 block font-semibold text-sm">CREDIT (+ Balance)</strong>
              <span className="text-slate-300 text-[11px]">
                Accepted Work Earnings & Approved Wage Adjustments (Increases artisan's payable balance)
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-rose-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-rose-400 block font-semibold text-sm">DEBIT (- Balance)</strong>
              <span className="text-slate-300 text-[11px]">
                Cash Advances & Wage Payouts Made to Worker (Reduces artisan's payable balance)
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3" />
          <p className="text-sm text-slate-500">Calculating financial debit-credit balances...</p>
        </div>
      ) : !ledgerSummary ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          Select an artisan worker to view her financial money ledger.
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Earned */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Work Earned</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  CREDITS
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {formatINR(ledgerSummary.total_earned)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Accepted knotting work earnings</div>
            </div>

            {/* Total Advances */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Advance Taken</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  DEBIT
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {formatINR(ledgerSummary.total_advance_taken)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Cash / digital advance draws</div>
            </div>

            {/* Total Payments Made */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Payments Made</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  DEBIT
                </span>
              </div>
              <div className="text-2xl font-black text-blue-700 mt-2">
                {formatINR(ledgerSummary.total_payments_made)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Wage settlements disbursed</div>
            </div>

            {/* Remaining Payable Amount */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Remaining Payable</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ledgerSummary.remaining_payable > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {ledgerSummary.remaining_payable > 0 ? 'Due for Payment' : 'Settled'}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {formatINR(ledgerSummary.remaining_payable)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Formula: {formatINR(ledgerSummary.total_earned)} - {formatINR(ledgerSummary.total_advance_taken + ledgerSummary.total_payments_made)}
              </div>
            </div>
          </div>

          {/* Date Range Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-700">Filter Dates:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="From date"
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="To date"
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 ml-1 font-semibold"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <strong>{ledgerSummary.transactions.length}</strong> transactions for{' '}
              <strong>{ledgerSummary.worker_name}</strong> ({ledgerSummary.worker_serial})
            </div>
          </div>

          {/* Printable Statement Header (Visible only when printing) */}
          <div className="hidden print:block p-4 border-b border-slate-200 mb-4">
            <h2 className="text-xl font-bold text-slate-900">BandhSetu — Artisan Account Statement</h2>
            <div className="text-xs text-slate-600 mt-1">
              Artisan: <strong>{ledgerSummary.worker_name}</strong> ({ledgerSummary.worker_serial}) | Date:{' '}
              {formatIndianDate(new Date().toISOString())}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Total Earned: <strong>{formatINR(ledgerSummary.total_earned)}</strong> | Total Paid/Advanced:{' '}
              <strong>{formatINR(ledgerSummary.total_advance_taken + ledgerSummary.total_payments_made)}</strong> | Net
              Payable: <strong>{formatINR(ledgerSummary.remaining_payable)}</strong>
            </div>
          </div>

          {/* Full Chronological Money Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Chronological Money Debit-Credit Ledger
                </h3>
                <p className="text-[11px] text-slate-500">
                  Every wage earning and disbursement recorded with immutable running balance.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {ledgerSummary.transactions.length} Entries
              </span>
            </div>

            {ledgerSummary.transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No financial transactions recorded for this artisan in the selected range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Txn ID</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center">Type</th>
                      <th className="py-3 px-4 text-right text-rose-700 font-bold">Debit (Payout/Adv)</th>
                      <th className="py-3 px-4 text-right text-emerald-700 font-bold">Credit (Earned)</th>
                      <th className="py-3 px-4 text-right font-black text-slate-900">Running Balance</th>
                      <th className="py-3 px-4">Mode / Ref</th>
                      <th className="py-3 px-4">Recorded By</th>
                      <th className="py-3 px-4">Remarks</th>
                      {isAdmin && <th className="py-3 px-4 text-center print:hidden">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerSummary.transactions.map((txn) => (
                      <tr
                        key={txn.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          txn.is_reversed ? 'opacity-40 bg-slate-50 line-through' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {formatIndianDate(txn.transaction_date)}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                          {txn.transaction_code}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                          {txn.description}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {txn.transaction_type === 'WORK_EARNING' ? (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3" /> CREDIT
                            </span>
                          ) : txn.transaction_type === 'ADVANCE_GIVEN' ? (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <ArrowDownLeft className="w-3 h-3" /> ADVANCE
                            </span>
                          ) : txn.transaction_type === 'WAGE_PAYOUT' ? (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                              <ArrowDownLeft className="w-3 h-3" /> PAYOUT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> ADJUSTMENT
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          {txn.debit_amount > 0 ? formatINR(txn.debit_amount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {txn.credit_amount > 0 ? formatINR(txn.credit_amount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                          {formatINR(txn.running_balance)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {txn.payment_mode || '—'}
                          {txn.reference_no && (
                            <div className="font-mono text-[10px] text-slate-400">{txn.reference_no}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {txn.recorded_by_name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                          {txn.is_reversed
                            ? `[REVERSED: ${txn.reversal_reason}] ${txn.remarks || ''}`
                            : txn.remarks || '—'}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-center print:hidden">
                            {!txn.is_reversed && txn.transaction_type !== 'CORRECTION_REVERSAL' ? (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Admin Auditable Reversal Modal */}
      {reversingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Auditable Financial Reversal
                </h3>
                <p className="text-xs text-slate-500">
                  Txn Code: <span className="font-mono font-semibold">{reversingTxn.transaction_code}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReversal} className="mt-4 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
                <strong className="block font-semibold mb-1">Financial Audit Policy:</strong>
                Financial transactions are never deleted. Reversing this will flag the record as reversed and post a compensating adjustment to restore the worker’s payable balance.
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
                  placeholder="e.g. Bank transfer failed / accidental double entry by operator"
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
