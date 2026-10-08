import React from 'react';
import { MidnightCard } from './types';

// SVG Artwork for Special Roles

export const BossIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
    {/* Fedora Hat */}
    <ellipse cx="36" cy="18" rx="26" ry="6" fill="#1c1511" stroke="#ffd043" strokeWidth="2" />
    <path d="M22 18 C22 10, 26 6, 36 6 C46 6, 50 10, 50 18 Z" fill="#2b1e17" stroke="#ffd043" strokeWidth="2" />
    <path d="M24 16 C28 14, 44 14, 48 16" stroke="#d33833" strokeWidth="3" />
    {/* Skeleton Skull */}
    <path
      d="M20 22 C20 16, 52 16, 52 22 C53 32, 50 40, 44 43 L44 48 L28 48 L28 43 C22 40, 19 32, 20 22 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.5"
    />
    {/* Dark Eye Sockets */}
    <ellipse cx="28" cy="30" rx="4.5" ry="5.5" fill="#1c1511" />
    <ellipse cx="44" cy="30" rx="4.5" ry="5.5" fill="#1c1511" />
    <circle cx="27" cy="29" r="1.2" fill="#ffd043" />
    <circle cx="43" cy="29" r="1.2" fill="#ffd043" />
    {/* Nose Cavity */}
    <path d="M36 34 L34 38 L38 38 Z" fill="#1c1511" />
    {/* Teeth with Golden Tooth */}
    <rect x="30" y="43" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="33" y="43" width="3" height="4" fill="#ffd043" stroke="#1c1511" strokeWidth="1" />
    <rect x="36" y="43" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="39" y="43" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    {/* Pinstripe Suit & Tie */}
    <path d="M16 66 L26 48 L46 48 L56 66 Z" fill="#1c1511" stroke="#2b1e17" strokeWidth="2" />
    <path d="M36 48 L33 66 L39 66 Z" fill="#d33833" stroke="#ffd043" strokeWidth="1.2" />
    {/* Smoking Cigar */}
    <rect x="42" y="38" width="12" height="3" rx="1.5" fill="#8c5b1b" stroke="#1c1511" strokeWidth="1" />
    <rect x="52" y="38" width="2" height="3" fill="#ff4433" />
    <circle cx="56" cy="34" r="1.8" fill="rgba(200, 200, 200, 0.7)" />
    <circle cx="59" cy="30" r="2.5" fill="rgba(200, 200, 200, 0.5)" />
  </svg>
);

export const FemmeFataleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
    {/* 1930s Finger-wave Hair */}
    <path
      d="M18 24 C14 12, 32 4, 46 6 C56 8, 58 18, 56 28 C54 36, 52 44, 52 50 C48 52, 46 40, 48 30 C48 20, 42 12, 32 14 C24 16, 20 22, 18 24 Z"
      fill="#1c1511"
      stroke="#4eb4dc"
      strokeWidth="1.5"
    />
    {/* Feather Fascinator */}
    <path d="M48 10 C52 2, 58 2, 60 4 C58 8, 54 12, 48 12 Z" fill="#4eb4dc" stroke="#1c1511" strokeWidth="1.5" />
    {/* Skull Face */}
    <path
      d="M24 22 C24 16, 48 16, 48 22 C49 32, 46 40, 42 43 L42 48 L30 48 L30 43 C26 40, 23 32, 24 22 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.5"
    />
    {/* Glamorous Eye Sockets with Eyelashes */}
    <ellipse cx="31" cy="28" rx="4" ry="4.5" fill="#1c1511" />
    <ellipse cx="41" cy="28" rx="4" ry="4.5" fill="#1c1511" />
    <path d="M27 25 L25 22 M33 24 L34 21 M43 24 L44 21 M47 25 L49 22" stroke="#1c1511" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="31" cy="28" r="1.2" fill="#4eb4dc" />
    <circle cx="41" cy="28" r="1.2" fill="#4eb4dc" />
    {/* Rosy Cheeks */}
    <circle cx="26" cy="34" r="2.5" fill="rgba(211, 56, 51, 0.4)" />
    <circle cx="46" cy="34" r="2.5" fill="rgba(211, 56, 51, 0.4)" />
    {/* Crimson Lips over Teeth */}
    <path d="M32 42 C34 40, 38 40, 40 42 C38 44, 34 44, 32 42 Z" fill="#d33833" stroke="#1c1511" strokeWidth="1" />
    {/* Evening Gown & Pearl Necklace */}
    <path d="M22 66 L28 50 L44 50 L50 66 Z" fill="#2b1e17" stroke="#4eb4dc" strokeWidth="2" />
    <circle cx="32" cy="51" r="1.5" fill="#fdfbf5" />
    <circle cx="36" cy="52" r="1.8" fill="#fdfbf5" />
    <circle cx="40" cy="51" r="1.5" fill="#fdfbf5" />
    {/* Cigarette Holder */}
    <line x1="40" y1="42" x2="62" y2="38" stroke="#1c1511" strokeWidth="1.8" />
    <rect x="60" y="37" width="5" height="2" fill="#fdfbf5" />
    <circle cx="66" cy="37" r="1" fill="#ff4433" />
  </svg>
);

export const GangsterIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
    {/* Newsboy Flat Cap */}
    <path
      d="M18 20 C18 10, 54 8, 56 18 C58 24, 20 26, 18 20 Z"
      fill="#3a3028"
      stroke="#1c1511"
      strokeWidth="2.5"
    />
    <path d="M16 22 C22 25, 48 24, 54 20" stroke="#ffd043" strokeWidth="2" />
    {/* Skull Face */}
    <path
      d="M22 22 C22 16, 50 16, 50 22 C51 32, 48 40, 44 43 L44 48 L28 48 L28 43 C24 40, 21 32, 22 22 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.5"
    />
    {/* Tough Eyebrows & Eye Sockets */}
    <path d="M25 24 L34 27 M47 24 L38 27" stroke="#1c1511" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="29" cy="31" rx="4" ry="4.5" fill="#1c1511" />
    <ellipse cx="43" cy="31" rx="4" ry="4.5" fill="#1c1511" />
    {/* Nose Cavity */}
    <path d="M36 34 L34 38 L38 38 Z" fill="#1c1511" />
    {/* Grinning Teeth */}
    <rect x="30" y="43" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="33" y="43" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="36" y="43" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="39" y="43" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    {/* Suspenders & Shirt */}
    <path d="M18 66 L26 48 L46 48 L54 66 Z" fill="#e8dcc8" stroke="#1c1511" strokeWidth="2" />
    <line x1="28" y1="48" x2="26" y2="66" stroke="#1c1511" strokeWidth="3" />
    <line x1="44" y1="48" x2="46" y2="66" stroke="#1c1511" strokeWidth="3" />
    {/* Tommy Gun Outline in Corner */}
    <rect x="8" y="52" width="16" height="5" rx="1.5" fill="#1c1511" />
    <circle cx="16" cy="60" r="5" fill="#1c1511" />
  </svg>
);

export const ChameleonIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
    {/* Trenchcoat High Collar */}
    <path d="M16 66 L22 42 L30 46 L36 40 L42 46 L50 42 L56 66 Z" fill="#2d3a33" stroke="#1c1511" strokeWidth="2.5" />
    {/* Skull Face half hidden */}
    <path
      d="M24 20 C24 14, 48 14, 48 20 C49 30, 47 38, 44 42 L28 42 C25 38, 23 30, 24 20 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.5"
    />
    {/* Wide-brim fedora pulled low */}
    <ellipse cx="36" cy="18" rx="24" ry="5.5" fill="#1c1511" stroke="#3e88a5" strokeWidth="2" />
    <path d="M24 18 C24 10, 28 6, 36 6 C44 6, 48 10, 48 18 Z" fill="#202b25" />
    {/* Shifty Glowing Eyes peering from the shadow */}
    <ellipse cx="30" cy="27" rx="3.5" ry="4" fill="#1c1511" />
    <ellipse cx="42" cy="27" rx="3.5" ry="4" fill="#1c1511" />
    <circle cx="31" cy="27" r="1.5" fill="#ffd043" />
    <circle cx="41" cy="27" r="1.5" fill="#ffd043" />
    {/* Double Badge Mask (Half Gangster / Half Alibi) */}
    <circle cx="54" cy="52" r="11" fill="#fdfbf5" stroke="#1c1511" strokeWidth="2" />
    <path d="M54 41 L54 63" stroke="#1c1511" strokeWidth="1.5" strokeDasharray="2 2" />
    <text x="47" y="55" fontSize="8" fontFamily="sans-serif" fontWeight="bold" fill="#d33833">G</text>
    <text x="56" y="55" fontSize="8" fontFamily="sans-serif" fontWeight="bold" fill="#3e88a5">A</text>
  </svg>
);

export const AlibiIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
    {/* White Surrender Flag on Stick */}
    <line x1="56" y1="8" x2="56" y2="44" stroke="#1c1511" strokeWidth="2.5" />
    <path d="M56 10 C48 12, 42 8, 36 11 L36 24 C42 21, 48 25, 56 22 Z" fill="#fdfbf5" stroke="#1c1511" strokeWidth="2" />
    {/* Innocent Hands Raised Skeleton */}
    <circle cx="30" cy="24" r="12" fill="#fdfbf5" stroke="#1c1511" strokeWidth="2.5" />
    {/* Innocent Surprised Eyes */}
    <circle cx="26" cy="22" r="3.5" fill="#1c1511" />
    <circle cx="34" cy="22" r="3.5" fill="#1c1511" />
    <circle cx="27" cy="21" r="1.2" fill="#fdfbf5" />
    <circle cx="35" cy="21" r="1.2" fill="#fdfbf5" />
    {/* Open Mouth "Who, Me?" */}
    <ellipse cx="30" cy="30" rx="3.5" ry="4" fill="#1c1511" />
    {/* Raised Hands */}
    <path d="M12 30 L16 18 M48 30 L44 18" stroke="#1c1511" strokeWidth="3" strokeLinecap="round" />
    {/* Newspaper Held: "ALIBI PROVEN" */}
    <rect x="14" y="44" width="36" height="22" rx="2" fill="#e8dcc8" stroke="#1c1511" strokeWidth="2" />
    <line x1="18" y1="49" x2="46" y2="49" stroke="#1c1511" strokeWidth="3" />
    <line x1="18" y1="54" x2="46" y2="54" stroke="#887766" strokeWidth="1.5" />
    <line x1="18" y1="58" x2="46" y2="58" stroke="#887766" strokeWidth="1.5" />
    <line x1="18" y1="62" x2="36" y2="62" stroke="#887766" strokeWidth="1.5" />
  </svg>
);

// Advanced Mode SVG Icons: Police (Kraken), Fat Vinnie (Whale), Briefcase (Loot)

export const PoliceIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
    {/* Police Peaked Visor Cap */}
    <path d="M16 20 C16 9, 56 9, 56 20 C58 26, 14 26, 16 20 Z" fill="#1b2a4a" stroke="#ffd043" strokeWidth="2" />
    <ellipse cx="36" cy="24" rx="22" ry="4.5" fill="#1c1511" />
    {/* Gold Star Badge on Cap */}
    <polygon
      points="36,11 37.8,15.5 42.5,15.5 38.6,18.3 40.1,22.8 36,20 31.9,22.8 33.4,18.3 29.5,15.5 34.2,15.5"
      fill="#ffd043"
      stroke="#1c1511"
      strokeWidth="0.8"
    />
    {/* Stern Skeleton Head */}
    <path
      d="M22 24 C22 18, 50 18, 50 24 C51 34, 48 42, 44 45 L44 49 L28 49 L28 45 C24 42, 21 34, 22 24 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.5"
    />
    {/* Stern Eyes */}
    <ellipse cx="29" cy="33" rx="4" ry="4.5" fill="#1c1511" />
    <ellipse cx="43" cy="33" rx="4" ry="4.5" fill="#1c1511" />
    <circle cx="30" cy="32" r="1.2" fill="#ffd043" />
    <circle cx="44" cy="32" r="1.2" fill="#ffd043" />
    {/* Nose Cavity */}
    <path d="M36 36 L34 40 L38 40 Z" fill="#1c1511" />
    {/* Teeth */}
    <rect x="30" y="44" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="33" y="44" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="36" y="44" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="39" y="44" width="3" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    {/* Navy Uniform Jacket & Brass Buttons */}
    <path d="M16 66 L26 49 L46 49 L56 66 Z" fill="#1b2a4a" stroke="#1c1511" strokeWidth="2.2" />
    <path d="M36 49 L33 66 L39 66 Z" fill="#d33833" stroke="#ffd043" strokeWidth="1" />
    <circle cx="36" cy="54" r="1.5" fill="#ffd043" />
    <circle cx="36" cy="60" r="1.5" fill="#ffd043" />
    {/* Nightstick / Baton */}
    <line x1="8" y1="40" x2="20" y2="66" stroke="#4a3525" strokeWidth="4.5" strokeLinecap="round" />
    <line x1="8" y1="40" x2="13" y2="43" stroke="#ffd043" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

export const FatVinnieIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
    {/* Wide All-White Mob Fedora */}
    <ellipse cx="36" cy="18" rx="28" ry="6.5" fill="#fdfbf5" stroke="#1c1511" strokeWidth="2.2" />
    <path d="M22 18 C22 9, 26 5, 36 5 C46 5, 50 9, 50 18 Z" fill="#ffffff" stroke="#1c1511" strokeWidth="2.2" />
    <path d="M22 17 C26 15, 46 15, 50 17" stroke="#1c1511" strokeWidth="3" />
    {/* Giant Heavyweight Skull */}
    <path
      d="M16 23 C16 16, 56 16, 56 23 C58 35, 54 44, 46 47 L46 51 L26 51 L26 47 C18 44, 14 35, 16 23 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.5"
    />
    {/* Dark Sunglasses */}
    <rect x="23" y="27" width="10" height="8" rx="2.5" fill="#1c1511" />
    <rect x="39" y="27" width="10" height="8" rx="2.5" fill="#1c1511" />
    <line x1="33" y1="30" x2="39" y2="30" stroke="#ffd043" strokeWidth="2" />
    {/* Nose Cavity */}
    <path d="M36 37 L33 41 L39 41 Z" fill="#1c1511" />
    {/* Grin with Golden Tooth */}
    <rect x="28" y="46" width="4" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="32" y="46" width="4" height="4" fill="#ffd043" stroke="#1c1511" strokeWidth="1" />
    <rect x="36" y="46" width="4" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="40" y="46" width="4" height="4" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    {/* White Pinstripe Suit with Gold Pocket Chain */}
    <path d="M12 68 L24 51 L48 51 L60 68 Z" fill="#ffffff" stroke="#1c1511" strokeWidth="2.5" />
    <path d="M36 51 L33 68 L39 68 Z" fill="#1c1511" />
    <path d="M26 58 C32 63, 40 63, 46 58" stroke="#ffd043" strokeWidth="2" strokeLinecap="round" />
    {/* Fat Smoldering Cigar */}
    <rect x="42" y="40" width="15" height="4" rx="2" fill="#6e421a" stroke="#1c1511" strokeWidth="1.2" />
    <circle cx="56" cy="42" r="1.5" fill="#ff4422" />
    <circle cx="61" cy="38" r="2" fill="rgba(200, 200, 200, 0.6)" />
  </svg>
);

export const BriefcaseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
    {/* Leather Handle */}
    <path d="M28 20 C28 14, 44 14, 44 20" stroke="#5a3d28" strokeWidth="3.5" strokeLinecap="round" />
    {/* Main Leather Briefcase Body */}
    <rect x="12" y="20" width="48" height="38" rx="4" fill="#784824" stroke="#1c1511" strokeWidth="2.5" />
    {/* Straps */}
    <rect x="22" y="20" width="4" height="38" fill="#5a3d28" stroke="#1c1511" strokeWidth="1" />
    <rect x="46" y="20" width="4" height="38" fill="#5a3d28" stroke="#1c1511" strokeWidth="1" />
    {/* Brass Latches */}
    <rect x="21" y="34" width="6" height="5" rx="1" fill="#ffd043" stroke="#1c1511" strokeWidth="1.2" />
    <rect x="45" y="34" width="6" height="5" rx="1" fill="#ffd043" stroke="#1c1511" strokeWidth="1.2" />
    {/* Keyhole */}
    <circle cx="36" cy="36" r="3.5" fill="#ffd043" stroke="#1c1511" strokeWidth="1" />
    <rect x="35" y="36" width="2" height="3" fill="#1c1511" />
    {/* Cash Stacks Popping Out ($$$) */}
    <rect x="18" y="14" width="16" height="7" rx="1.5" fill="#2d8a4e" stroke="#1c1511" strokeWidth="1.2" transform="rotate(-6 18 14)" />
    <text x="21" y="19" fontSize="6" fontFamily="sans-serif" fontWeight="900" fill="#fdfbf5">$100</text>
    <rect x="38" y="13" width="16" height="7" rx="1.5" fill="#246e3e" stroke="#1c1511" strokeWidth="1.2" transform="rotate(8 38 13)" />
    <text x="41" y="19" fontSize="6" fontFamily="sans-serif" fontWeight="900" fill="#fdfbf5">$100</text>
    {/* Gold Coins around base */}
    <circle cx="16" cy="58" r="4" fill="#ffd043" stroke="#1c1511" strokeWidth="1.2" />
    <text x="14.5" y="60" fontSize="5" fontFamily="sans-serif" fontWeight="bold" fill="#1c1511">$</text>
    <circle cx="56" cy="58" r="4" fill="#ffd043" stroke="#1c1511" strokeWidth="1.2" />
    <text x="54.5" y="60" fontSize="5" fontFamily="sans-serif" fontWeight="bold" fill="#1c1511">$</text>
  </svg>
);

// Suit Icons

export const SuitIcon: React.FC<{ suit: 'gold' | 'cyan' | 'ruby' | 'black'; size?: number }> = ({
  suit,
  size = 20,
}) => {
  switch (suit) {
    case 'black': // Midnight Syndicate Trump (Tommy Gun & Skull)
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="11" r="8" fill="#1c1511" stroke="#ffd043" strokeWidth="1.5" />
          <ellipse cx="9" cy="10" rx="1.5" ry="2" fill="#ffd043" />
          <ellipse cx="15" cy="10" rx="1.5" ry="2" fill="#ffd043" />
          <line x1="6" y1="21" x2="18" y2="21" stroke="#ffd043" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'gold': // Stash Gold
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" fill="#f6c445" stroke="#1c1511" strokeWidth="2" />
          <circle cx="12" cy="12" r="6" stroke="#1c1511" strokeWidth="1.5" strokeDasharray="2 2" />
          <text x="9" y="16" fontSize="11" fontFamily="sans-serif" fontWeight="900" fill="#1c1511">$</text>
        </svg>
      );
    case 'cyan': // Speakeasy Cyan
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M5 5 L19 5 L12 14 Z" fill="#3e88a5" stroke="#1c1511" strokeWidth="2" />
          <line x1="12" y1="14" x2="12" y2="20" stroke="#1c1511" strokeWidth="2.5" />
          <line x1="7" y1="20" x2="17" y2="20" stroke="#1c1511" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="13" cy="8" r="2" fill="#d33833" />
        </svg>
      );
    case 'ruby': // Blood Ruby
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#d33833" stroke="#1c1511" strokeWidth="2" />
          <circle cx="8" cy="8" r="1.5" fill="#fdfbf5" />
          <circle cx="12" cy="12" r="1.5" fill="#fdfbf5" />
          <circle cx="16" cy="16" r="1.5" fill="#fdfbf5" />
        </svg>
      );
  }
};

// Tactical Playing Card Component

interface MidnightCardViewProps {
  card: MidnightCard;
  isPlayable?: boolean;
  isDimmed?: boolean;
  onClick?: () => void;
  compact?: boolean;
  chameleonChoice?: 'gangster' | 'alibi';
  isWhiteCard?: boolean;
}

const ROLE_SUBTITLES: Record<string, string> = {
  boss: 'THE BOSS',
  'femme-fatale': 'FEMME FATALE',
  gangster: 'GANGSTER',
  chameleon: 'CHAMELEON',
  alibi: 'ALIBI',
  police: 'THE POLICE',
  'fat-vinnie': 'FAT VINNIE',
  briefcase: 'BRIEFCASE',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  boss: 'Defeats all Gangsters and standard suits. Loses ONLY to a Femme Fatale.',
  'femme-fatale': 'Defeats normal cards and enchants The Boss (+50 bonus). Loses to Gangsters.',
  gangster: 'Defeats Femme Fatale and normal suits. The first Gangster played wins the trick.',
  chameleon: 'Can be played as either a Gangster or an Alibi.',
  alibi: 'Zero value escape card. Avoids winning unwanted tricks.',
  police: 'Kraken raid! Destroys all trick cards. No trick winner. Next trick led by player to left.',
  'fat-vinnie': 'White whale kingpin. Mutes all specials to Alibis and strips suits to white. Highest value wins.',
  briefcase: 'Black money briefcase. Acts as an Alibi. Winner associates with you: +20 PTS if both hit exact bids.',
};

export const MidnightCardView: React.FC<MidnightCardViewProps> = ({
  card,
  isPlayable = true,
  isDimmed = false,
  onClick,
  compact = false,
  chameleonChoice,
  isWhiteCard = false,
}) => {
  const isSpecial = card.type === 'special';
  const role = chameleonChoice ? chameleonChoice : card.role;

  const getBorderColor = () => {
    if (isWhiteCard) return '#9e9488';
    if (role === 'boss') return '#ffd043';
    if (role === 'femme-fatale') return '#4eb4dc';
    if (role === 'gangster') return '#d33833';
    if (role === 'chameleon') return '#8c5b1b';
    if (role === 'alibi') return '#887766';
    if (role === 'police') return '#1b2a4a';
    if (role === 'fat-vinnie') return '#bfa15f';
    if (role === 'briefcase') return '#1e5f38';
    if (card.suit === 'black') return '#1c1511';
    if (card.suit === 'gold') return '#f6c445';
    if (card.suit === 'cyan') return '#3e88a5';
    if (card.suit === 'ruby') return '#d33833';
    return 'var(--color-ink-stroke)';
  };

  const getHeaderBg = () => {
    if (isWhiteCard) return '#fdfbf5';
    if (role === 'boss') return '#ffd043';
    if (role === 'femme-fatale') return '#4eb4dc';
    if (role === 'gangster') return '#d33833';
    if (role === 'chameleon') return '#e8dcc8';
    if (role === 'alibi') return '#e8dcc8';
    if (role === 'police') return '#1b2a4a';
    if (role === 'fat-vinnie') return '#fdfbf5';
    if (role === 'briefcase') return '#1e5f38';
    if (card.suit === 'black') return '#1c1511';
    if (card.suit === 'gold') return '#f6c445';
    if (card.suit === 'cyan') return '#3e88a5';
    if (card.suit === 'ruby') return '#d33833';
    return '#e8dcc8';
  };

  const getHeaderTextColor = () => {
    if (isWhiteCard) return '#1c1511';
    if (role === 'boss' || card.suit === 'gold') return '#1c1511';
    if (card.suit === 'black' || role === 'gangster' || card.suit === 'ruby' || role === 'police' || role === 'briefcase') {
      return '#fdfbf5';
    }
    return '#1c1511';
  };

  const cardSubtitle = card.subtitle || (role ? ROLE_SUBTITLES[role] : undefined) || (isSpecial ? 'SPECIAL' : '');
  const cardDesc = card.description || (role ? ROLE_DESCRIPTIONS[role] : undefined) || '';

  return (
    <div
      onClick={isPlayable && onClick ? onClick : undefined}
      className={`midnight-card-item ${compact ? 'card-compact' : ''} ${
        isDimmed ? 'card-unplayable' : ''
      } ${onClick && isPlayable ? 'card-interactive' : ''} ${isWhiteCard ? 'card-white-suit' : ''}`}
      style={{ borderColor: getBorderColor() }}
      title={`${card.name}${cardDesc ? `: ${cardDesc}` : ''}`}
    >
      {/* Top Banner / Number */}
      <div className="card-top-header" style={{ backgroundColor: getHeaderBg(), color: getHeaderTextColor() }}>
        {isSpecial ? (
          <span className={`card-role-title ${role === 'femme-fatale' ? 'title-femme-fatale' : ''}`}>
            {role === 'boss' && 'THE BOSS'}
            {role === 'femme-fatale' && 'FEMME FATALE'}
            {role === 'gangster' && 'GANGSTER'}
            {role === 'chameleon' && 'CHAMELEON'}
            {role === 'alibi' && 'ALIBI'}
            {role === 'police' && 'THE POLICE'}
            {role === 'fat-vinnie' && 'FAT VINNIE'}
            {role === 'briefcase' && 'BRIEFCASE'}
          </span>
        ) : isWhiteCard ? (
          <div className="card-suit-header-row">
            <span className="card-number-val" style={{ color: '#1c1511' }}>{card.value}</span>
            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#887766' }}>WHITE</span>
          </div>
        ) : (
          <div className="card-suit-header-row">
            <span className="card-number-val">{card.value}</span>
            {card.suit && <SuitIcon suit={card.suit} size={compact ? 14 : 18} />}
          </div>
        )}
      </div>

      {/* Center Illustration */}
      <div className="card-art-box">
        {role === 'boss' && <BossIcon size={compact ? 36 : 60} />}
        {role === 'femme-fatale' && <FemmeFataleIcon size={compact ? 36 : 60} />}
        {role === 'gangster' && <GangsterIcon size={compact ? 36 : 60} />}
        {role === 'chameleon' && <ChameleonIcon size={compact ? 36 : 60} />}
        {role === 'alibi' && <AlibiIcon size={compact ? 36 : 60} />}
        {role === 'police' && <PoliceIcon size={compact ? 36 : 60} />}
        {role === 'fat-vinnie' && <FatVinnieIcon size={compact ? 36 : 60} />}
        {role === 'briefcase' && <BriefcaseIcon size={compact ? 36 : 60} />}

        {!isSpecial && !isWhiteCard && card.suit && (
          <div className="card-suit-center-badge">
            <SuitIcon suit={card.suit} size={compact ? 32 : 54} />
            <span className="card-center-num">{card.value}</span>
          </div>
        )}

        {!isSpecial && isWhiteCard && (
          <div className="card-suit-center-badge">
            <span className="card-center-num" style={{ fontSize: compact ? '26px' : '36px', color: '#1c1511' }}>
              {card.value}
            </span>
            <span style={{ fontSize: '7.5px', color: '#887766', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              WHITE CARD
            </span>
          </div>
        )}
      </div>

      {/* Bottom Subtitle / Bonus */}
      <div className="card-bottom-bar">
        {!isWhiteCard && card.bonusValue ? (
          <span className="card-bonus-tag">+{card.bonusValue} PTS</span>
        ) : isSpecial ? (
          <span className="card-sub-name">{cardSubtitle ? cardSubtitle.split(' ')[0] : 'SPECIAL'}</span>
        ) : (
          <span className="card-corner-num">{card.value}</span>
        )}
      </div>

      <style>{`
        .midnight-card-item {
          width: 90px;
          height: 130px;
          background-color: var(--color-glove-ivory);
          border: 3px solid var(--color-ink-stroke);
          border-radius: 10px;
          box-shadow: 2.5px 2.5px 0px var(--color-shadow-solid);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          position: relative;
          user-select: none;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
          flex-shrink: 0;
        }
        .midnight-card-item.card-white-suit {
          background-color: #ffffff;
          box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.2);
        }
        .midnight-card-item.card-compact {
          width: 74px;
          height: 108px;
        }
        .midnight-card-item.card-interactive:hover {
          transform: translateY(-8px);
          box-shadow: 4px 8px 0px var(--color-shadow-solid);
          cursor: pointer;
        }
        .card-unplayable {
          opacity: 0.45;
          filter: grayscale(0.5);
          cursor: not-allowed !important;
        }
        .card-top-header {
          padding: 2.5px 4px;
          border-bottom: 2px solid var(--color-ink-stroke);
          font-family: var(--font-heading);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .card-role-title {
          font-size: 8.5px;
          letter-spacing: 0.01em;
          white-space: nowrap;
          text-align: center;
          max-width: 100%;
        }
        .card-role-title.title-femme-fatale {
          font-size: 7.5px;
          letter-spacing: -0.01em;
        }
        .card-compact .card-role-title {
          font-size: 7px;
          letter-spacing: 0;
        }
        .card-compact .card-role-title.title-femme-fatale {
          font-size: 6.2px;
          letter-spacing: -0.02em;
        }
        .card-suit-header-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2px;
        }
        .card-number-val {
          font-size: 15px;
          font-weight: 900;
          line-height: 1;
        }
        .card-art-box {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .card-suit-center-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .card-center-num {
          font-family: var(--font-heading);
          font-size: 20px;
          color: var(--color-text-main);
          line-height: 1;
          margin-top: 2px;
        }
        .card-bottom-bar {
          padding: 2px 4px;
          border-top: 1.5px dashed var(--color-ink-stroke);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-canvas-parchment);
        }
        .card-bonus-tag {
          font-family: var(--font-accent);
          font-size: 9px;
          color: var(--color-cuphead-red);
          font-weight: bold;
        }
        .card-sub-name {
          font-family: var(--font-body);
          font-size: 8px;
          font-weight: 700;
          color: var(--color-text-lead);
        }
        .card-corner-num {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-main);
        }
      `}</style>
    </div>
  );
};
