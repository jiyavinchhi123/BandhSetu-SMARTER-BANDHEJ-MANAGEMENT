import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 min-h-[38px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2 shadow-sm', // 44px touch target
    lg: 'text-base px-5 py-3 min-h-[50px] gap-2.5 shadow-md',
  };

  const variantStyles = {
    primary:
      'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 shadow-brand-500/20',
    secondary:
      'bg-slate-800 hover:bg-slate-900 text-white focus:ring-slate-700 shadow-slate-800/10',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-brand-500',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-rose-600/20',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-400',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

