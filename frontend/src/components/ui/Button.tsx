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
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none touch-manipulation active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 min-h-[38px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2 shadow-sm', // 44px touch target
    lg: 'text-base px-5 py-3 min-h-[50px] gap-2.5 shadow-md',
  };

  const variantStyles = {
    primary:
      'bg-[#A20D38] hover:bg-[#880D32] text-white focus:ring-[#A20D38] shadow-sm shadow-[#A20D38]/20',
    secondary:
      'bg-[#30232A] hover:bg-[#1E161B] text-white focus:ring-[#30232A] shadow-xs',
    outline:
      'border border-[#F0E1E1] bg-white hover:bg-[#FCEDEC]/60 text-[#30232A] focus:ring-[#A20D38]',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-rose-600/20',
    ghost:
      'text-[#786773] hover:text-[#30232A] hover:bg-[#FCEDEC]/50 focus:ring-[#A20D38]',
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

