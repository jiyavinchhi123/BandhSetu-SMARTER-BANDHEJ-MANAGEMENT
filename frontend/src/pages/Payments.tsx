import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Calendar,
  CheckCircle,
  FileText,
  CreditCard,
  User,
  ShieldCheck,
  Printer,
  Download,
  Info,
} from 'lucide-react';
import { api, WorkerItem } from '../services/api';
import { MoneyDebitCreditLedger } from '../components/ledger/MoneyDebitCreditLedger';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatINR, formatIndianDate } from '../utils/formatters';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

export const Payments: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ledger' | 'advance' | 'payout'>('ledger');

  // Advance Form State
  const [advWorkerSearch, setAdvWorkerSearch] = useState('');
  const [advWorkerOptions, setAdvWorkerOptions] = useState<WorkerItem[]>([]);
  const [selectedAdvWorker, setSelectedAdvWorker] = useState<WorkerItem | null>(null);
  const [advAmount, setAdvAmount] = useState<number | ''>(500);
  const [advMode, setAdvMode] = useState('Cash');
  const [advRefNo, setAdvRefNo] = useState('');
  const [advDate, setAdvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advRemarks, setAdvRemarks] = useState('');
  const [submittingAdv, setSubmittingAdv] = useState(false);

  // Payout Form State
  const [payWorkerSearch, setPayWorkerSearch] = useState('');
  const [payWorkerOptions, setPayWorkerOptions] = useState<WorkerItem[]>([]);
  const [selectedPayWorker, setSelectedPayWorker] = useState<WorkerItem | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number | ''>('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRefNo, setPayRefNo] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isFullSettlement, setIsFullSettlement] = useState(false);
  const [payRemarks, setPayRemarks] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Search workers for Advance
  useEffect(() => {
    if (!advWorkerSearch.trim()) {
      setAdvWorkerOptions([]);
      return;
    }
    const search = async () => {
      try {
        const data = await api.getWorkers({ q: advWorkerSearch.trim(), limit: 8 });
        setAdvWorkerOptions(data);
      } catch (err) {
        // ignore
      }
    };
    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [advWorkerSearch]);

  // Search workers for Payout
  useEffect(() => {
    if (!payWorkerSearch.trim()) {
      setPayWorkerOptions([]);
      return;
    }
    const search = async () => {
      try {
        const data = await api.getWorkers({ q: payWorkerSearch.trim(), limit: 8 });
        setPayWorkerOptions(data);
      } catch (err) {
        // ignore
      }
    };
    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [payWorkerSearch]);

  // When selected payout worker changes, auto-fill full balance if checked
  useEffect(() => {
    if (selectedPayWorker) {
      setPayoutAmount(Math.max(0, selectedPayWorker.payable_balance));
      setIsFullSettlement(true);
    }
  }, [selectedPayWorker]);

  // Handle Advance Submission
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvWorker) {
      showToast({
        type: 'error',
        title: 'Artisan Required',
        message: 'Please search and select a woman artisan worker.',
      });
      return;
    }
    if (!advAmount || advAmount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Advance amount must be greater than zero.',
      });
      return;
    }

    try {
      setSubmittingAdv(true);
      const res = await api.recordAdvance({
        worker_id: selectedAdvWorker.id,
        amount: Number(advAmount),
        payment_mode: advMode,
        reference_no: advRefNo.trim() || undefined,
        payment_date: advDate,
        remarks: advRemarks.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Advance Recorded!',
        message: `Disbursed advance of ${formatINR(res.debit_amount)} via ${res.payment_mode} to ${selectedAdvWorker.full_name}. New balance: ${formatINR(res.running_balance)}`,
      });

      // Update worker's local state
      setSelectedAdvWorker((prev) => (prev ? { ...prev, payable_balance: res.running_balance } : null));
      setAdvAmount(500);
      setAdvRefNo('');
      setAdvRemarks('');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Record Advance',
        message: err.message || 'Error occurred while recording advance',
      });
    } finally {
      setSubmittingAdv(false);
    }
  };

  // Handle Wage Payout Submission
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayWorker) {
      showToast({
        type: 'error',
        title: 'Artisan Required',
        message: 'Please search and select an artisan worker.',
      });
      return;
    }
    if (!payoutAmount || payoutAmount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Payout amount must be greater than zero.',
      });
      return;
    }

    try {
      setSubmittingPay(true);
      const res = await api.recordPayout({
        worker_id: selectedPayWorker.id,
        amount: Number(payoutAmount),
        payment_mode: payMode,
        reference_no: payRefNo.trim() || undefined,
        payment_date: payDate,
        is_full_settlement: isFullSettlement,
        remarks: payRemarks.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Wage Payout Recorded!',
        message: `Disbursed ${formatINR(res.debit_amount)} via ${res.payment_mode} to ${selectedPayWorker.full_name}. Remaining balance: ${formatINR(res.running_balance)}`,
      });

      setSelectedPayWorker((prev) => (prev ? { ...prev, payable_balance: res.running_balance } : null));
      setPayoutAmount('');
      setPayRefNo('');
      setPayRemarks('');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Record Payout',
        message: err.message || 'Error occurred while recording payout',
      });
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Wages, Advances & Money Ledger
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Step 5 Core
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Worker-account financial debit-credit ledger, advance tracking, wage settlements, and printable statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('advance')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 ${
              activeTab === 'advance'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-amber-500" />
            <span>Record Advance</span>
          </button>
          <button
            onClick={() => setActiveTab('payout')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 ${
              activeTab === 'payout'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <IndianRupee className="w-4 h-4 text-emerald-500" />
            <span>Wage Payout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'ledger'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Money Debit-Credit Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('advance')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'advance'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-amber-600" />
          <span>Record Advance / Withdrawal</span>
        </button>

        <button
          onClick={() => setActiveTab('payout')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'payout'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>Wage Payout & Settlements</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MONEY DEBIT-CREDIT LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <MoneyDebitCreditLedger showWorkerSelector={true} />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ADVANCE / WITHDRAWAL ENTRY FORM (Requirement C) */}
      {/* ========================================================================= */}
      {activeTab === 'advance' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Record Advance / Cash Withdrawal Entry
              </h2>
              <p className="text-xs text-slate-500">
                Disburse mid-month advance to artisan. Reduces payable wage balance and records DEBIT.
              </p>
            </div>
          </div>

          <form onSubmit={handleAdvanceSubmit} className="space-y-5">
            {/* 1. Worker Search & Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Artisan Worker <span className="text-rose-500">*</span>
              </label>
              {selectedAdvWorker ? (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                      {selectedAdvWorker.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{selectedAdvWorker.full_name}</div>
                      <div className="text-xs text-slate-500">
                        Serial: <span className="font-mono font-semibold">{selectedAdvWorker.serial_number}</span> • Village: {selectedAdvWorker.village}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAdvWorker(null);
                      setAdvWorkerSearch('');
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
                    placeholder="Search artisan by name, serial (e.g. 'Radha', 'WRK')..."
                    value={advWorkerSearch}
                    onChange={(e) => setAdvWorkerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  {advWorkerOptions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {advWorkerOptions.map((w) => (
                        <div
                          key={w.id}
                          onClick={() => {
                            setSelectedAdvWorker(w);
                            setAdvWorkerSearch('');
                            setAdvWorkerOptions([]);
                          }}
                          className="p-3 hover:bg-amber-50/50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{w.full_name}</span>
                            <span className="ml-2 font-mono text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                              {w.serial_number}
                            </span>
                            <div className="text-[11px] text-slate-400">{w.village}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Payable Balance</span>
                            <span className="font-bold text-emerald-700">{formatINR(w.payable_balance)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prominently Show Latest Payable Balance Before Recording (Requirement C) */}
            {selectedAdvWorker && (
              <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-600 block">
                    Current Payable Balance (Before Advance):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Advances will be subtracted from this balance.
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900">
                  {formatINR(selectedAdvWorker.payable_balance)}
                </div>
              </div>
            )}

            {/* Date & Advance Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Advance Date (IST) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={advDate}
                    onChange={(e) => setAdvDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Advance Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="500.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Mode & Reference Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <select
                  value={advMode}
                  onChange={(e) => setAdvMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reference No. (Optional)
                </label>
                <input
                  type="text"
                  value={advRefNo}
                  onChange={(e) => setAdvRefNo(e.target.value)}
                  placeholder="e.g. UPI-UTR / Cheque #"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
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
                value={advRemarks}
                onChange={(e) => setAdvRemarks(e.target.value)}
                placeholder="e.g. Diwali emergency cash advance draw"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            {/* Post-Advance Balance Preview */}
            {selectedAdvWorker && typeof advAmount === 'number' && advAmount > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
                <span>
                  <strong>New Projected Balance:</strong> {formatINR(selectedAdvWorker.payable_balance)} - {formatINR(advAmount)}
                </span>
                <strong className="text-base font-black">
                  = {formatINR(selectedAdvWorker.payable_balance - advAmount)}
                </strong>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingAdv}
              className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-amber-500/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span>{submittingAdv ? 'Recording Advance...' : 'Disburse Advance (Debit Money Ledger)'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WAGE PAYOUT & SETTLEMENTS (Requirement D) */}
      {/* ========================================================================= */}
      {activeTab === 'payout' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Record Wage Payout & Settlement
              </h2>
              <p className="text-xs text-slate-500">
                Disburse accepted piece-rate earnings via Cash, UPI, or Bank Transfer. Supports partial and full settlements.
              </p>
            </div>
          </div>

          <form onSubmit={handlePayoutSubmit} className="space-y-5">
            {/* 1. Worker Search & Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Artisan Worker <span className="text-rose-500">*</span>
              </label>
              {selectedPayWorker ? (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      {selectedPayWorker.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{selectedPayWorker.full_name}</div>
                      <div className="text-xs text-slate-500">
                        Serial: <span className="font-mono font-semibold">{selectedPayWorker.serial_number}</span> • Village: {selectedPayWorker.village}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPayWorker(null);
                      setPayWorkerSearch('');
                      setPayoutAmount('');
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
                    placeholder="Search artisan by name or serial..."
                    value={payWorkerSearch}
                    onChange={(e) => setPayWorkerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {payWorkerOptions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {payWorkerOptions.map((w) => (
                        <div
                          key={w.id}
                          onClick={() => {
                            setSelectedPayWorker(w);
                            setPayWorkerSearch('');
                            setPayWorkerOptions([]);
                          }}
                          className="p-3 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{w.full_name}</span>
                            <span className="ml-2 font-mono text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                              {w.serial_number}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Payable Balance</span>
                            <span className="font-bold text-emerald-700">{formatINR(w.payable_balance)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prominently Display Current Payable Balance */}
            {selectedPayWorker && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Artisan Current Payable Balance
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    Lifetime Earned: {formatINR(selectedPayWorker.total_earned)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black text-emerald-400">
                    {formatINR(selectedPayWorker.payable_balance)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutAmount(Math.max(0, selectedPayWorker.payable_balance));
                      setIsFullSettlement(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm"
                  >
                    Settle All
                  </button>
                </div>
              </div>
            )}

            {/* Date & Payout Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payout Date (IST) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payout Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={payoutAmount}
                    onChange={(e) => {
                      setPayoutAmount(e.target.value === '' ? '' : parseFloat(e.target.value));
                      setIsFullSettlement(false);
                    }}
                    placeholder="1500.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Mode & Reference Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Disbursal Mode <span className="text-rose-500">*</span>
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bank UTR / UPI Reference No.
                </label>
                <input
                  type="text"
                  value={payRefNo}
                  onChange={(e) => setPayRefNo(e.target.value)}
                  placeholder="e.g. UTR-20261119-98765"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            {/* Full Settlement Checkbox */}
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="full_settle_toggle"
                checked={isFullSettlement}
                onChange={(e) => setIsFullSettlement(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label
                htmlFor="full_settle_toggle"
                className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
              >
                Mark this transaction as Full Settlement of remaining balance
              </label>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payout Notes / Remarks
              </label>
              <input
                type="text"
                value={payRemarks}
                onChange={(e) => setPayRemarks(e.target.value)}
                placeholder="e.g. Bi-weekly wage payout for Khatri Sarees"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            {/* Post-Payout Balance Preview */}
            {selectedPayWorker && typeof payoutAmount === 'number' && payoutAmount > 0 && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <span>
                  <strong>New Projected Balance:</strong> {formatINR(selectedPayWorker.payable_balance)} - {formatINR(payoutAmount)}
                </span>
                <strong className="text-base font-black">
                  = {formatINR(selectedPayWorker.payable_balance - payoutAmount)}
                </strong>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingPay}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <IndianRupee className="w-5 h-5" />
              <span>{submittingPay ? 'Recording Wage Payout...' : 'Disburse Wage Payout (Debit Money Ledger)'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
