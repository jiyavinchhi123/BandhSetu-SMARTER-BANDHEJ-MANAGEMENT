import React from 'react';
import { Package, Plus } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';

export const Inventory: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Raw Fabric & Thread Stock</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Silk, Gajji, Georgette fabrics, tying threads, and dye materials
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
          Add Material Lot
        </Button>
      </div>

      <Card className="text-center py-12">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Package className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Inventory Tracker Ready</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
          Weight loss tracking, yarn distribution, and saree stock controls ready for Step 2.
        </p>
        <Badge variant="neutral">Initial Setup</Badge>
      </Card>
    </div>
  );
};

