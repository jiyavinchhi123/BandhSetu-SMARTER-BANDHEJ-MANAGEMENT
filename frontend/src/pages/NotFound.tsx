import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-[#FCEDEC] flex items-center justify-center text-[#A20D38] mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#30232A]">Page Not Found</h2>
      <p className="text-sm text-[#786773] max-w-sm mt-1 mb-6">
        The requested module or screen does not exist.
      </p>
      <Button
        variant="primary"
        className="rounded-full px-6"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate('/')}
      >
        Back to Dashboard
      </Button>
    </div>
  );
};

