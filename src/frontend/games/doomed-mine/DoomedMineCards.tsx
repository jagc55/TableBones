import React from 'react';
import type { PokerCard, PokerSuit } from './types';

// ==========================================
// 1930s FLEISCHER SVG SUIT ICONS
// ==========================================

export const SpadeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2 C12 2, 4 9, 4 14 C4 17.5, 7 19.5, 10 18 C9.5 20.5, 8.5 22, 7 22 L17 22 C15.5 22, 14.5 20.5, 14 18 C17 19.5, 20 17.5, 20 14 C20 9, 12 2, 12 2 Z"
      fill="#1c1511"
      stroke="#1c1511"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const HeartIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 21 C12 21, 3 15, 3 8.5 C3 5, 5.5 3, 8.5 3 C10.5 3, 11.5 4, 12 5.5 C12.5 4, 13.5 3, 15.5 3 C18.5 3, 21 5, 21 8.5 C21 15, 12 21, 12 21 Z"
      fill="#d33833"
      stroke="#1c1511"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const DiamondIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2 L20.5 12 L12 22 L3.5 12 Z"
      fill="#d33833"
      stroke="#1c1511"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const ClubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 11.5 C14 11.5, 15.5 10, 15.5 8 C15.5 6, 14 4.5, 12 4.5 C10 4.5, 8.5 6, 8.5 8 C8.5 10, 10 11.5, 12 11.5 Z M7.5 16 C9.5 16, 11 14.5, 11 12.5 C11 10.5, 9.5 9, 7.5 9 C5.5 9, 4 10.5, 4 12.5 C4 14.5, 5.5 16, 7.5 16 Z M16.5 16 C18.5 16, 20 14.5, 20 12.5 C20 10.5, 18.5 9, 16.5 9 C14.5 9, 13 10.5, 13 12.5 C13 14.5, 14.5 16, 16.5 16 Z M11 14 L9 22 L15 22 L13 14 Z"
      fill="#1c1511"
      stroke="#1c1511"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const SuitGraphic: React.FC<{ suit: PokerSuit; size?: number; className?: string }> = ({
  suit,
  size = 16,
  className,
}) => {
  switch (suit) {
    case 'spades':
      return <SpadeIcon size={size} className={className} />;
    case 'hearts':
      return <HeartIcon size={size} className={className} />;
    case 'diamonds':
      return <DiamondIcon size={size} className={className} />;
    case 'clubs':
      return <ClubIcon size={size} className={className} />;
  }
};

// ==========================================
// 1930s SKELETON FACE CARD PORTRAITS
// ==========================================

export const MinerJackIcon: React.FC<{ size?: number; className?: string }> = ({ size = 44, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <ellipse cx="32" cy="16" rx="20" ry="5" fill="#3a2f26" stroke="#1c1511" strokeWidth="2" />
    <path d="M18 16 C18 10, 24 6, 32 6 C40 6, 46 10, 46 16 Z" fill="#4d3e33" stroke="#1c1511" strokeWidth="2" />
    <circle cx="32" cy="11" r="3.5" fill="#ffd043" stroke="#1c1511" strokeWidth="1.5" />
    <path
      d="M20 20 C20 14, 44 14, 44 20 C45 28, 42 36, 38 38 L38 43 L26 43 L26 38 C22 36, 19 28, 20 20 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.2"
    />
    <ellipse cx="26" cy="27" rx="3.5" ry="4.5" fill="#1c1511" />
    <ellipse cx="38" cy="27" rx="3.5" ry="4.5" fill="#1c1511" />
    <circle cx="25.5" cy="26.5" r="1" fill="#ffd043" />
    <circle cx="37.5" cy="26.5" r="1" fill="#ffd043" />
    <rect x="28" y="39" width="2.5" height="3" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <rect x="30.5" y="39" width="3" height="3" fill="#ffd043" stroke="#1c1511" strokeWidth="1" />
    <rect x="33.5" y="39" width="2.5" height="3" fill="#fdfbf5" stroke="#1c1511" strokeWidth="1" />
    <line x1="14" y1="56" x2="50" y2="44" stroke="#1c1511" strokeWidth="3" />
    <path d="M46 40 L52 46 L48 50 Z" fill="#ffd043" stroke="#1c1511" strokeWidth="1.5" />
  </svg>
);

export const SaloonQueenIcon: React.FC<{ size?: number; className?: string }> = ({ size = 44, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <path d="M16 22 C14 10, 30 4, 44 6 C50 8, 52 16, 50 24" fill="none" stroke="#1c1511" strokeWidth="2" />
    <circle cx="46" cy="12" r="5" fill="#d33833" stroke="#1c1511" strokeWidth="1.5" />
    <path
      d="M22 20 C22 14, 42 14, 42 20 C43 28, 40 36, 36 38 L36 43 L28 43 L28 38 C24 36, 21 28, 22 20 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.2"
    />
    <ellipse cx="27" cy="26" rx="3.5" ry="4" fill="#1c1511" />
    <ellipse cx="37" cy="26" rx="3.5" ry="4" fill="#1c1511" />
    <circle cx="27" cy="26" r="1.2" fill="#ffd043" />
    <circle cx="37" cy="26" r="1.2" fill="#ffd043" />
    <path d="M24 23 L22 20 M39 23 L41 20" stroke="#1c1511" strokeWidth="1.5" />
    <circle cx="19" cy="30" r="2.5" fill="#ffd043" stroke="#1c1511" strokeWidth="1" />
    <circle cx="45" cy="30" r="2.5" fill="#ffd043" stroke="#1c1511" strokeWidth="1" />
    <path d="M30 38 C32 36, 34 36, 36 38 C34 40, 32 40, 30 38 Z" fill="#d33833" stroke="#1c1511" strokeWidth="1" />
  </svg>
);

export const ForemanKingIcon: React.FC<{ size?: number; className?: string }> = ({ size = 44, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <path
      d="M18 18 L22 6 L32 14 L42 6 L46 18 Z"
      fill="#ffd043"
      stroke="#1c1511"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="32" cy="10" r="2" fill="#d33833" />
    <path
      d="M20 20 C20 14, 44 14, 44 20 C45 30, 42 38, 38 40 L38 45 L26 45 L26 40 C22 38, 19 30, 20 20 Z"
      fill="#fdfbf5"
      stroke="#1c1511"
      strokeWidth="2.2"
    />
    <ellipse cx="27" cy="27" rx="4" ry="5" fill="#1c1511" />
    <ellipse cx="37" cy="27" rx="4" ry="5" fill="#1c1511" />
    <circle cx="27" cy="26.5" r="1.3" fill="#ffd043" />
    <circle cx="37" cy="26.5" r="1.3" fill="#ffd043" />
    <path
      d="M23 37 C27 34, 32 37, 32 37 C32 37, 37 34, 41 37 C43 40, 37 42, 32 39 C27 42, 21 40, 23 37 Z"
      fill="#2b1e17"
      stroke="#1c1511"
      strokeWidth="1.5"
    />
    <rect x="46" y="32" width="10" height="14" rx="2" fill="#ffd043" stroke="#1c1511" strokeWidth="1.5" />
    <circle cx="51" cy="39" r="3" fill="#fdfbf5" />
  </svg>
);

export const AceEmblemIcon: React.FC<{ suit: PokerSuit; size?: number; className?: string }> = ({
  suit,
  size = 46,
  className,
}) => (
  <div className={`ace-art-wrapper ${className || ''}`} style={{ width: size, height: size }}>
    <SuitGraphic suit={suit} size={Math.round(size * 0.85)} />
  </div>
);

// ==========================================
// POKER CARD COMPONENT (AUTHENTIC PLAYING CARD)
// ==========================================

export interface PokerCardViewProps {
  card?: PokerCard | null;
  faceDown?: boolean;
  highlighted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  onClick?: () => void;
}

export const PokerCardView: React.FC<PokerCardViewProps> = ({
  card,
  faceDown = false,
  highlighted = false,
  size = 'md',
  label,
  onClick,
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  // FACE DOWN: Vintage Criss-Cross Engraving with Pickaxes
  if (faceDown || !card) {
    return (
      <div
        onClick={onClick}
        className={`poker-card-view card-face-down ${isSm ? 'size-sm' : isLg ? 'size-lg' : 'size-md'} ${
          onClick ? 'is-clickable' : ''
        }`}
        title="Carta oculta en el pozo"
      >
        <div className="card-back-pattern">
          <div className="card-back-center-badge">
            <span className="back-pickaxe-icon">⛏</span>
          </div>
        </div>
      </div>
    );
  }

  const isRedSuit = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitColor = isRedSuit ? '#d33833' : '#1c1511';

  return (
    <div
      onClick={onClick}
      className={`poker-card-view card-face-up ${isSm ? 'size-sm' : isLg ? 'size-lg' : 'size-md'} ${
        highlighted ? 'card-highlight-active' : ''
      } ${onClick ? 'is-clickable' : ''}`}
      style={{ color: suitColor }}
    >
      {/* Top Left Index */}
      <div className="corner-index corner-top">
        <span className="rank-text">{card.rank}</span>
        <SuitGraphic suit={card.suit} size={isSm ? 10 : isLg ? 14 : 12} />
      </div>

      {/* Center Artwork */}
      <div className="card-center-stage">
        {card.rank === 'J' && <MinerJackIcon size={isSm ? 28 : isLg ? 52 : 38} />}
        {card.rank === 'Q' && <SaloonQueenIcon size={isSm ? 28 : isLg ? 52 : 38} />}
        {card.rank === 'K' && <ForemanKingIcon size={isSm ? 28 : isLg ? 52 : 38} />}
        {card.rank === 'A' && <AceEmblemIcon suit={card.suit} size={isSm ? 30 : isLg ? 56 : 42} />}
        {!['J', 'Q', 'K', 'A'].includes(card.rank) && (
          <div className="number-card-suit-badge">
            <SuitGraphic suit={card.suit} size={isSm ? 22 : isLg ? 44 : 34} />
          </div>
        )}

        {label && <span className="card-label-tag">{label}</span>}
      </div>

      {/* Bottom Right Index */}
      <div className="corner-index corner-bottom">
        <span className="rank-text">{card.rank}</span>
        <SuitGraphic suit={card.suit} size={isSm ? 10 : isLg ? 14 : 12} />
      </div>

      {highlighted && <div className="card-best-pill">BEST HAND</div>}
    </div>
  );
};

// ==========================================
// TACTILE BRASS PRESSURE TOKEN CHIP
// ==========================================

export interface PressureTokenChipProps {
  token: number;
  totalTokens: number;
  selected?: boolean;
  confirmed?: boolean;
  disabled?: boolean;
  holderName?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const PressureTokenChip: React.FC<PressureTokenChipProps> = ({
  token,
  totalTokens,
  selected = false,
  confirmed = false,
  disabled = false,
  holderName,
  size = 'md',
  onClick,
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const stars = '★'.repeat(Math.min(token, totalTokens));

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`brass-token-chip ${isSm ? 'chip-sm' : isLg ? 'chip-lg' : 'chip-md'} ${
        selected ? 'chip-selected' : ''
      } ${confirmed ? 'chip-confirmed' : ''} ${holderName ? 'chip-held' : ''}`}
      title={
        holderName
          ? `Token ${token} held by ${holderName}`
          : `Pressure Token ${token} (${stars})`
      }
    >
      <div className="chip-outer-rim">
        <div className="chip-inner-face">
          <span className="chip-number">{token}</span>
          {!isSm && <span className="chip-stars-row">{stars}</span>}
        </div>
      </div>

      {holderName && (
        <span className="chip-holder-tag" title={holderName}>
          {holderName}
        </span>
      )}
    </button>
  );
};
