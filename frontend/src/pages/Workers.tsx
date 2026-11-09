import React from 'react';
import { Users, Plus, Phone, MapPin, Award } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { formatINR } from '../utils/formatters';

const workersList = [
  { id: '1', name: 'Kamlaben Vaghela', village: 'Anjar, Kutch', phone: '+91 98250 12345', experience: '12 Yrs', rating: 'Master Artisan', activeBatches: 2, earnings: 14500 },
  { id: '2', name: 'Santoshben Parmar', village: 'Mandvi, Bhuj', phone: '+91 94280 67890', experience: '8 Yrs', rating: 'Senior Artisan', activeBatches: 1, earnings: 9800 },
  { id: '3', name: 'Meenaben Solanki', village: 'Jamnagar Rural', phone: '+91 99790 54321', experience: '15 Yrs', rating: 'Jaal Specialist', activeBatches: 3, earnings: 18400 },
  { id: '4', name: 'Geetaben Rathod', village: 'Mundra', phone: '+91 97120 98765', experience: '6 Yrs', rating: 'Skilled Artisan', activeBatches: 1, earnings: 8200 },
];

export const Workers: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Artisan Worker Directory</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Managing 384 verified Bandhej craftswomen across Kutch and Saurashtra
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
          Register New Worker
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workersList.map((worker) => (
          <Card key={worker.id} hoverEffect className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                  {worker.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{worker.name}</h3>
                  <Badge variant="info" size="sm">{worker.rating}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{worker.village}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{worker.phone}</span>
              </p>
              <p className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span>Experience: {worker.experience}</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">{worker.activeBatches} Active Batches</span>
              <span className="font-bold text-brand-700">Earnings: {formatINR(worker.earnings)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

