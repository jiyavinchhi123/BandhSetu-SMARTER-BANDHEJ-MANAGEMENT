import React from 'react';

interface BandhaniLogoProps {
  className?: string;
  size?: number;
}

export const BandhaniLogo: React.FC<BandhaniLogoProps> = ({ className = '', size = 56 }) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <img
        src="/bandhsetu-emblem.png"
        alt="BandhSetu Emblem"
        className="w-full h-full object-contain filter drop-shadow-xs"
        onError={(e) => {
          // If image fails, fallback to inline SVG
          e.currentTarget.style.display = 'none';
          const next = e.currentTarget.nextElementSibling as HTMLElement;
          if (next) next.style.display = 'block';
        }}
      />
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full text-[#A20D38] hidden"
        fill="currentColor"
      >
        {/* Fallback diamond concentric dots */}
        <circle cx="50" cy="50" r="3.5" fill="#A20D38" />
        {/* Ring 1 */}
        <circle cx="50" cy="40" r="2.5" />
        <circle cx="60" cy="50" r="2.5" />
        <circle cx="50" cy="60" r="2.5" />
        <circle cx="40" cy="50" r="2.5" />
        {/* Ring 2 */}
        <circle cx="50" cy="30" r="2.2" />
        <circle cx="57" cy="37" r="2.2" />
        <circle cx="70" cy="50" r="2.2" />
        <circle cx="57" cy="63" r="2.2" />
        <circle cx="50" cy="70" r="2.2" />
        <circle cx="43" cy="63" r="2.2" />
        <circle cx="30" cy="50" r="2.2" />
        <circle cx="43" cy="37" r="2.2" />
        {/* Ring 3 */}
        <circle cx="50" cy="20" r="2" />
        <circle cx="60" cy="30" r="2" />
        <circle cx="70" cy="40" r="2" />
        <circle cx="80" cy="50" r="2" />
        <circle cx="70" cy="60" r="2" />
        <circle cx="60" cy="70" r="2" />
        <circle cx="50" cy="80" r="2" />
        <circle cx="40" cy="70" r="2" />
        <circle cx="30" cy="60" r="2" />
        <circle cx="20" cy="50" r="2" />
        <circle cx="30" cy="40" r="2" />
        <circle cx="40" cy="30" r="2" />
      </svg>
    </div>
  );
};

export const BandhaniWatermark: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`pointer-events-none select-none text-[#A20D38]/15 ${className}`}
      fill="currentColor"
    >
      <circle cx="50" cy="50" r="3" />
      <circle cx="50" cy="38" r="2.2" />
      <circle cx="62" cy="50" r="2.2" />
      <circle cx="50" cy="62" r="2.2" />
      <circle cx="38" cy="50" r="2.2" />
      <circle cx="50" cy="26" r="2" />
      <circle cx="59" cy="35" r="2" />
      <circle cx="74" cy="50" r="2" />
      <circle cx="59" cy="65" r="2" />
      <circle cx="50" cy="74" r="2" />
      <circle cx="41" cy="65" r="2" />
      <circle cx="26" cy="50" r="2" />
      <circle cx="41" cy="35" r="2" />
      <circle cx="50" cy="14" r="1.8" />
      <circle cx="63" cy="27" r="1.8" />
      <circle cx="73" cy="37" r="1.8" />
      <circle cx="86" cy="50" r="1.8" />
      <circle cx="73" cy="63" r="1.8" />
      <circle cx="63" cy="73" r="1.8" />
      <circle cx="50" cy="86" r="1.8" />
      <circle cx="37" cy="73" r="1.8" />
      <circle cx="27" cy="63" r="1.8" />
      <circle cx="14" cy="50" r="1.8" />
      <circle cx="27" cy="37" r="1.8" />
      <circle cx="37" cy="27" r="1.8" />
    </svg>
  );
};

export const BandhSetuFullLogo: React.FC<{ className?: string; alt?: string }> = ({
  className = '',
  alt = 'BandhSetu — Smarter Bandhej Management',
}) => {
  return (
    <img
      src="/bandhsetu-logo.png"
      alt={alt}
      className={`object-contain ${className}`}
    />
  );
};
