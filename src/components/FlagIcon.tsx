import React from 'react';

interface FlagProps {
  country: 'uk' | 'es';
  className?: string;
  size?: number;
}

export const FlagIcon: React.FC<FlagProps> = ({ country, className = '', size = 18 }) => {
  if (country === 'uk') {
    return (
      <svg
        viewBox="0 0 60 40"
        width={size * 1.3}
        height={size}
        className={className}
        style={{
          borderRadius: '3px',
          border: '1px solid rgba(0, 0, 0, 0.35)',
          display: 'inline-block',
          verticalAlign: 'middle',
          flexShrink: 0,
        }}
        aria-label="United Kingdom Flag"
      >
        <clipPath id="uk-clip">
          <rect width="60" height="40" rx="3" />
        </clipPath>
        <g clipPath="url(#uk-clip)">
          {/* Blue background */}
          <rect width="60" height="40" fill="#012169" />
          {/* White diagonals */}
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
          {/* Red diagonals */}
          <path d="M0,0 L30,20 M60,0 L30,20 M60,40 L30,20 M0,40 L30,20" stroke="#C8102E" strokeWidth="4" />
          {/* White cross */}
          <path d="M30,0 v40 M0,20 h60" stroke="#FFFFFF" strokeWidth="12" />
          {/* Red cross */}
          <path d="M30,0 v40 M0,20 h60" stroke="#C8102E" strokeWidth="7" />
        </g>
      </svg>
    );
  }

  // Spain Flag
  return (
    <svg
      viewBox="0 0 60 40"
      width={size * 1.3}
      height={size}
      className={className}
      style={{
        borderRadius: '3px',
        border: '1px solid rgba(0, 0, 0, 0.35)',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
      aria-label="Spain Flag"
    >
      <clipPath id="es-clip">
        <rect width="60" height="40" rx="3" />
      </clipPath>
      <g clipPath="url(#es-clip)">
        {/* Red top band */}
        <rect width="60" height="10" fill="#AA151B" />
        {/* Yellow center band */}
        <rect y="10" width="60" height="20" fill="#F1BF00" />
        {/* Red bottom band */}
        <rect y="30" width="60" height="10" fill="#AA151B" />
        {/* Simplified Spanish coat of arms seal */}
        <rect x="12" y="16" width="6" height="8" rx="1.5" fill="#AA151B" stroke="#000" strokeWidth="0.5" />
        <circle cx="15" cy="14.5" r="1.5" fill="#F1BF00" stroke="#000" strokeWidth="0.5" />
      </g>
    </svg>
  );
};
