import React, { useState } from 'react';
import { Package, Layers, Plus, Info } from 'lucide-react';
import { MaterialDebitCreditLedger } from '../components/ledger/MaterialDebitCreditLedger';

export const Inventory: React.FC = () => {
  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Fabric Inventory & Material Ledger
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              Live Balances
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track cloth pieces with artisans, double-entry debit/credit transactions, and running balances.
          </p>
        </div>
      </div>

      {/* Embedded Material Debit-Credit Ledger with Worker Selector */}
      <MaterialDebitCreditLedger showWorkerSelector={true} />
    </div>
  );
};
