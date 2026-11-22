import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#F0E1E1] shadow-2xs p-4 sm:p-6 transition-all duration-200 ${
        hoverEffect ? 'hover:shadow-md hover:border-[#E57D89]/60' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

