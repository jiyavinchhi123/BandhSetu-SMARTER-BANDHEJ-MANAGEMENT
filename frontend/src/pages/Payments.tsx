import React from 'react';
import { IndianRupee, FileText } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';

export const Payments: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Artisan Wage Registers</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Piece-rate wage settlements, advances, and bank/cash payment receipts
          </p>
        </div>
        <Button variant="primary" icon={<FileText className="w-4 h-4" />}>
          Generate Monthly Register
        </Button>
      </div>

      <Card className="text-center py-12">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <IndianRupee className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Wage Engine Initialized</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
          FastAPI calculation engine handles gross wages, thread wastage penalties, and net payable.
        </p>
        <Badge variant="success">FastAPI Calculation Service Active</Badge>
      </Card>
    </div>
  );
};

