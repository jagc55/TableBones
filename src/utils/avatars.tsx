import React from 'react';
import aviatorImg from '../assets/avatars/aviator.png';

export interface AvatarMeta {
  id: string;
  name: string;
  title: string;
  src?: string;
}

export interface CustomAvatarDefinition {
  id: string;
  name: string;
  title: string;
  src: string;
}

/**
 * ============================================================================
 * REGISTRO DE AVATARES PERSONALIZADOS (IMÁGENES)
 * ============================================================================
 * Para añadir más avatares en el futuro:
 * 1. Coloca la imagen en: src/assets/avatars/<nombre>.png
 * 2. Impórtala arriba y añádela a este array CUSTOM_AVATARS.
 * ============================================================================
 */
export const CUSTOM_AVATARS: CustomAvatarDefinition[] = [
  {
    id: 'aviator',
    name: 'The Flying Ace',
    title: 'Sky Corsair',
    src: aviatorImg,
  },
];

export const AVATAR_LIST: AvatarMeta[] = [
  ...CUSTOM_AVATARS.map((ca) => ({
    id: ca.id,
    name: ca.name,
    title: ca.title,
    src: ca.src,
  })),
  { id: 'boxer', name: 'The Prizefighter', title: 'Ring Champion' },
  { id: 'ringmaster', name: 'The Ringmaster', title: 'Circus Maestro' },
  { id: 'diceshark', name: 'The Dice Shark', title: 'Saloon Gambler' },
  { id: 'clockmaker', name: 'The Clockmaker', title: 'Master of Time' },
  { id: 'baron', name: 'The Iron Baron', title: 'Highborn Strategist' },
  { id: 'captain', name: 'The Sea Captain', title: 'Old Salt' },
  { id: 'illusionist', name: 'The Illusionist', title: 'Grand Magician' },
  { id: 'gambler', name: 'The Lucky Vagrant', title: 'Fortune Chaser' },
];

interface AvatarIconProps {
  id: string;
  size?: number;
  className?: string;
}

export const AvatarIcon: React.FC<AvatarIconProps> = ({ id, size = 48, className = '' }) => {
  // 1. Comprobar si es un avatar personalizado de imagen
  const customAvatar = CUSTOM_AVATARS.find((ca) => ca.id === id);
  if (customAvatar) {
    const radius = Math.max(4, Math.round(size * 0.22));
    const borderWidth = Math.max(1.5, Math.round(size * 0.05));

    return (
      <div
        className={`avatar-badge-frame ${className}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: radius,
          backgroundColor: '#f6c445',
          border: `${borderWidth}px solid #1c1511`,
          boxShadow: size >= 26 ? '1.5px 1.5px 0px #1c1511' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }}
        title={customAvatar.name}
      >
        <img
          src={customAvatar.src}
          alt={customAvatar.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: 'scale(1.08)',
            filter: 'drop-shadow(1px 1px 0px rgba(28, 21, 17, 0.35))',
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }

  const strokeColor = '#1c1511';
  const strokeWidth = 3;

  switch (id) {
    case 'boxer':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="64" height="64" rx="14" fill="#f6c445" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Head & Jaw */}
          <circle cx="32" cy="30" r="14" fill="#fdfbf5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Prizefighter hair */}
          <path d="M20 25C21 18 28 16 32 16C37 16 43 18 44 24C41 22 36 21 32 23C27 24 23 23 20 25Z" fill="#1c1511" />
          {/* Pie-cut cartoon eyes */}
          <circle cx="27" cy="30" r="2.5" fill={strokeColor} />
          <circle cx="37" cy="30" r="2.5" fill={strokeColor} />
          {/* Confident grin */}
          <path d="M26 36C28 39 36 39 38 36" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" />
          {/* Boxing Gloves guarding chin */}
          <circle cx="21" cy="48" r="8" fill="#d33833" stroke={strokeColor} strokeWidth={strokeWidth} />
          <circle cx="43" cy="48" r="8" fill="#d33833" stroke={strokeColor} strokeWidth={strokeWidth} />
          <path d="M19 44L24 49" stroke="#fdfbf5" strokeWidth="2" strokeLinecap="round" />
          <path d="M41 44L46 49" stroke="#fdfbf5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'ringmaster':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="64" height="64" rx="14" fill="#d33833" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Head */}
          <circle cx="32" cy="36" r="13" fill="#fdfbf5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Top Hat */}
          <rect x="22" y="12" width="20" height="15" rx="3" fill="#1c1511" stroke={strokeColor} strokeWidth={strokeWidth} />
          <rect x="16" y="25" width="32" height="4" rx="2" fill="#1c1511" stroke={strokeColor} strokeWidth="2" />
          <rect x="22" y="21" width="20" height="4" fill="#f6c445" />
          {/* Eyes */}
          <circle cx="28" cy="35" r="2" fill={strokeColor} />
          <circle cx="36" cy="35" r="2" fill={strokeColor} />
          {/* Handlebar Mustache */}
          <path
            d="M23 43C27 41 30 43 32 44C34 43 37 41 41 43C42 41 39 39 32 41C25 39 22 41 23 43Z"
            fill="#1c1511"
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          {/* Bowtie */}
          <polygon points="26,53 38,53 32,56" fill="#f6c445" stroke={strokeColor} strokeWidth="2" />
          <polygon points="26,59 38,59 32,56" fill="#f6c445" stroke={strokeColor} strokeWidth="2" />
        </svg>
      );

    case 'diceshark':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="64" height="64" rx="14" fill="#3e88a5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Head */}
          <circle cx="32" cy="35" r="14" fill="#fdfbf5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Fedora hat */}
          <ellipse cx="32" cy="24" rx="20" ry="5" fill="#1c1511" stroke={strokeColor} strokeWidth="2" />
          <path d="M21 23C21 14 26 12 32 12C38 12 43 14 43 23Z" fill="#1c1511" stroke={strokeColor} strokeWidth="2" />
          <path d="M22 21H42" stroke="#d33833" strokeWidth="3" />
          {/* Monocle on right eye */}
          <circle cx="37" cy="35" r="4.5" fill="#3e88a5" stroke={strokeColor} strokeWidth="2" opacity="0.4" />
          <circle cx="37" cy="35" r="4.5" stroke={strokeColor} strokeWidth="2" />
          <path d="M41.5 35L45 42" stroke={strokeColor} strokeWidth="1.5" />
          {/* Left Eye */}
          <circle cx="26" cy="35" r="2" fill={strokeColor} />
          {/* Smug mouth holding toothpick */}
          <path d="M28 42C31 43 36 42 37 40" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          <line x1="37" y1="41" x2="44" y2="39" stroke="#f6c445" strokeWidth="2" />
        </svg>
      );

    case 'clockmaker':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="64" height="64" rx="14" fill="#e8d7b3" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Head */}
          <circle cx="32" cy="33" r="14" fill="#fdfbf5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Cap */}
          <path d="M19 28C19 20 25 17 32 17C39 17 45 20 45 28Z" fill="#2b1e17" stroke={strokeColor} strokeWidth="2" />
          <path d="M16 28H48" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          {/* Clockmaker brass goggles */}
          <circle cx="26" cy="33" r="5" fill="#f6c445" stroke={strokeColor} strokeWidth="2" />
          <circle cx="38" cy="33" r="5" fill="#f6c445" stroke={strokeColor} strokeWidth="2" />
          <line x1="31" y1="33" x2="33" y2="33" stroke={strokeColor} strokeWidth="3" />
          <circle cx="26" cy="33" r="2" fill={strokeColor} />
          <circle cx="38" cy="33" r="2" fill={strokeColor} />
          {/* Pocket watch gear below */}
          <circle cx="32" cy="50" r="7" fill="#f6c445" stroke={strokeColor} strokeWidth="2" />
          <line x1="32" y1="50" x2="32" y2="45" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="50" x2="35" y2="52" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'baron':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="64" height="64" rx="14" fill="#1c1511" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Head */}
          <circle cx="32" cy="36" r="13" fill="#fdfbf5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* High Top Hat */}
          <rect x="23" y="10" width="18" height="20" rx="2" fill="#2b1e17" stroke="#f6c445" strokeWidth="2" />
          <rect x="17" y="28" width="30" height="4" rx="2" fill="#2b1e17" stroke="#f6c445" strokeWidth="1.5" />
          {/* Stern eyes */}
          <line x1="24" y1="34" x2="29" y2="36" stroke={strokeColor} strokeWidth="2" />
          <line x1="40" y1="34" x2="35" y2="36" stroke={strokeColor} strokeWidth="2" />
          <circle cx="27" cy="37" r="2" fill={strokeColor} />
          <circle cx="37" cy="37" r="2" fill={strokeColor} />
          {/* Stiff Collar */}
          <polygon points="26,52 38,52 32,47" fill="#fdfbf5" stroke={strokeColor} strokeWidth="2" />
          <polygon points="32,49 28,57 36,57" fill="#d33833" />
        </svg>
      );

    case 'captain':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="64" height="64" rx="14" fill="#3e88a5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Head & Beard */}
          <circle cx="32" cy="34" r="13" fill="#fdfbf5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Sailor's Cap */}
          <path d="M20 25C20 17 25 15 32 15C39 15 44 17 44 25Z" fill="#1c1511" stroke={strokeColor} strokeWidth="2" />
          <path d="M17 25H47" stroke="#f6c445" strokeWidth="3.5" strokeLinecap="round" />
          {/* Anchor on hat */}
          <circle cx="32" cy="20" r="1.5" fill="#f6c445" />
          {/* Eyes */}
          <circle cx="27" cy="32" r="2" fill={strokeColor} />
          <circle cx="37" cy="32" r="2" fill={strokeColor} />
          {/* Bushy Beard */}
          <path d="M22 36C22 47 42 47 42 36C40 43 24 43 22 36Z" fill="#e8d7b3" stroke={strokeColor} strokeWidth="2" />
          {/* Corn-cob pipe */}
          <path d="M36 41L45 44" stroke="#d33833" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="44" y="38" width="5" height="7" rx="1.5" fill="#f6c445" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );

    case 'illusionist':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="64" height="64" rx="14" fill="#f6c445" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Head */}
          <circle cx="32" cy="35" r="13" fill="#fdfbf5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Mystic Turban / Mask */}
          <path d="M21 26C21 16 32 12 32 12C32 12 43 16 43 26Z" fill="#d33833" stroke={strokeColor} strokeWidth="2" />
          <circle cx="32" cy="20" r="3" fill="#3e88a5" stroke={strokeColor} strokeWidth="1.5" />
          {/* Mysterious Eyes */}
          <path d="M24 33C26 31 29 33 29 34" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M35 34C35 33 38 31 40 33" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          <circle cx="27" cy="35" r="1.5" fill={strokeColor} />
          <circle cx="37" cy="35" r="1.5" fill={strokeColor} />
          {/* Subtle smirk */}
          <path d="M30 42C33 43 36 41 37 40" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'gambler':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="64" height="64" rx="14" fill="#e8d7b3" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Head */}
          <circle cx="32" cy="35" r="13" fill="#fdfbf5" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Newsboy flat cap */}
          <path d="M18 26C19 18 29 17 38 18C44 19 46 23 46 27C38 27 24 28 18 26Z" fill="#1c1511" stroke={strokeColor} strokeWidth="2" />
          <path d="M16 27C24 28 36 29 46 25" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          {/* Mischievous wink eye */}
          <path d="M25 35L29 35" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="37" cy="34" r="2.5" fill={strokeColor} />
          {/* Broad grin */}
          <path d="M26 41C29 45 35 45 38 41" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          {/* Ace card peeking out */}
          <rect x="38" y="44" width="12" height="16" rx="2" fill="#fdfbf5" stroke={strokeColor} strokeWidth="1.5" transform="rotate(15 38 44)" />
          <polygon points="43,51 45,55 41,55" fill="#d33833" />
        </svg>
      );
  }
};
