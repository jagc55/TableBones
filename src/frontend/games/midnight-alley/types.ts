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
  subtitle?: string;
  description?: string;
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

export interface MidnightMatchState {
  gameId: 'midnight-alley';
  roomId: string;
  round: number;
  maxRounds: number;
  phase: MidnightPhase;
  hands: Record<string, MidnightCard[]>;
  handCounts: Record<string, number>;
  bids: Record<string, number | undefined>;
  tricksWon: Record<string, number>;
  roundBonuses: Record<string, number>;
  cumulativeScores: Record<string, number>;
  leadPlayerId: string | null;
  turnPlayerId: string | null;
  currentTrick: PlayedTrickCard[];
  lastResult: {
    winnerPlayerId: string;
    winnerPlayerName?: string;
    winningCard: MidnightCard;
    bonusPoints: number;
    bonusReason?: string;
  } | null;
  players?: Array<{ id: string; name: string; avatarId: string; isBot: boolean }>;
  roundSummaryScores?: Record<string, any> | null;
  roundHistory?: Record<number, Record<string, any>>;
  lastRoundWinnerId?: string | null;
  lastTrickWinnerId?: string | null;
  history: unknown[];
  deadline: number | null;
  winnerId?: string | null;
  winReason?: string;
}
