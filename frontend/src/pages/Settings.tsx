import React from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { Card, Button, Input } from '../components/ui';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Enterprise Settings</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Configure business profile, currency rates, knot styles, and Supabase cloud links
        </p>
      </div>

      <Card className="space-y-4">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-brand-600" />
          Business & Regional Localization
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Business Name" defaultValue="Kutch Heritage Bandhej Udyog" />
          <Input label="Default Currency" defaultValue="INR (₹)" disabled />
          <Input label="Timezone" defaultValue="Asia/Kolkata (IST)" disabled />
          <Input label="Allowed Fabric Wastage (%)" defaultValue="3.0" type="number" step="0.1" />
        </div>
        <div className="pt-2 flex justify-end">
          <Button variant="primary" icon={<Save className="w-4 h-4" />}>
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  );
};

