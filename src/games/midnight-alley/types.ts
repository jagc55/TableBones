// Types for Midnight Alley (1930s Mafia Skeleton Card Game)

export type StandardSuit = 'gold' | 'cyan' | 'ruby';
export type TrumpSuit = 'black';
export type CardSuit = StandardSuit | TrumpSuit;

export type SpecialRole = 'boss' | 'femme-fatale' | 'gangster' | 'chameleon' | 'alibi';

export interface MidnightCard {
  id: string;
  type: 'suit' | 'special';
  suit?: CardSuit;
  value?: number; // 1 to 14
  role?: SpecialRole;
  name: string;
  subtitle: string;
  description: string;
  bonusValue?: number; // 14s carry bonus points if won in trick
}

export interface PlayedTrickCard {
  playerId: string;
  playerName: string;
  playerAvatarId: string;
  card: MidnightCard;
  chameleonChoice?: 'gangster' | 'alibi';
}

export type MidnightPhase =
  | 'bidding'          // Players place bids on tricks (0 to current round card count)
  | 'playing'          // Active trick in progress
  | 'trick_resolved'   // Brief pause showing trick winner and bonuses
  | 'round_summary'    // Scoreboard comparing bids vs tricks won
  | 'game_over';       // Match finished

export interface TrickResult {
  winnerPlayerId: string;
  winnerPlayerName: string;
  winningCard: MidnightCard;
  bonusPoints: number;
  bonusReason?: string;
}

export interface RoundScoreBreakdown {
  playerId: string;
  bid: number;
  tricksWon: number;
  bidScore: number;
  bonusScore: number;
  totalRoundScore: number;
  cumulativeScore: number;
}

export interface PlayerRoundRecord {
  roundScore: number;       // The delta gained or lost in that round
  cumulativeScore: number;  // The total score after that round
}
