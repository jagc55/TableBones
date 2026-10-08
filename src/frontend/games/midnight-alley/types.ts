// Types for Midnight Alley (1930s Mafia Skeleton Card Game)

export type StandardSuit = 'gold' | 'cyan' | 'ruby';
export type TrumpSuit = 'black';
export type CardSuit = StandardSuit | TrumpSuit;

export type SpecialRole =
  | 'boss'
  | 'femme-fatale'
  | 'gangster'
  | 'chameleon'
  | 'alibi'
  | 'police'
  | 'fat-vinnie'
  | 'briefcase';

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
  destroyed?: boolean;
  policePlayerId?: string | null;
  policePlayerName?: string | null;
  nextLeadPlayerId?: string | null;
  winnerPlayerId: string | null;
  winnerPlayerName?: string | null;
  winningCard: MidnightCard;
  bonusPoints: number;
  bonusReason?: string;
  briefcases?: Array<{ briefcasePlayerId: string; winnerPlayerId: string | null }>;
}

export interface RoundScoreBreakdown {
  playerId: string;
  bid: number;
  tricksWon: number;
  bidScore: number;
  bonusScore: number;
  briefcaseBonus?: number;
  briefcaseDetails?: string[];
  totalRoundScore: number;
  cumulativeScore: number;
}

export interface PlayerRoundRecord {
  roundScore: number;       // The delta gained or lost in that round
  cumulativeScore: number;  // The total score after that round
  briefcaseBonus?: number;
  briefcaseDetails?: string[];
}

export interface MidnightMatchState {
  gameId: 'midnight-alley';
  roomId: string;
  advancedMode?: boolean;
  round: number;
  maxRounds: number;
  phase: MidnightPhase;
  playerOrder?: string[];
  hands: Record<string, MidnightCard[]>;
  handCounts: Record<string, number>;
  bids: Record<string, number | undefined>;
  tricksWon: Record<string, number>;
  roundBonuses: Record<string, number>;
  briefcaseAlliances?: Array<{ briefcasePlayerId: string; winnerPlayerId: string }>;
  cumulativeScores: Record<string, number>;
  leadPlayerId: string | null;
  turnPlayerId: string | null;
  policeNextLeadId?: string | null;
  currentTrick: PlayedTrickCard[];
  lastResult: {
    destroyed?: boolean;
    policePlayerId?: string | null;
    policePlayerName?: string | null;
    nextLeadPlayerId?: string | null;
    winnerPlayerId: string | null;
    winnerPlayerName?: string | null;
    winningCard: MidnightCard;
    bonusPoints: number;
    bonusReason?: string;
  } | null;
  players?: Array<{ id: string; name: string; avatarId: string; isBot: boolean }>;
  roundSummaryScores?: Record<string, RoundScoreBreakdown> | null;
  roundHistory?: Record<number, Record<string, any>>;
  lastRoundWinnerId?: string | null;
  lastTrickWinnerId?: string | null;
  history: unknown[];
  deadline: number | null;
  winnerId?: string | null;
  winReason?: string;
}
