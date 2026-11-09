import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4 shadow-sm">
        {icon || <PackageOpen className="w-7 h-7" />}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

