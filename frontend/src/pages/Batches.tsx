import React from 'react';
import { Layers, Plus } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';

export const Batches: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Work Batches & Orders</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Track saree consignments from fabric dispatch to knotting and return
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
          Create New Batch
        </Button>
      </div>

      <Card className="text-center py-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Batch Management Ready</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
          Full consignment dispatch, QR code tagging, and knot inspection will be enabled in Step 2.
        </p>
        <Badge variant="warning">Module Initialized</Badge>
      </Card>
    </div>
  );
};

