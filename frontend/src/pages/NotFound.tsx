import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
        The requested module or screen does not exist.
      </p>
      <Button
        variant="primary"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate('/')}
      >
        Back to Dashboard
      </Button>
    </div>
  );
};

