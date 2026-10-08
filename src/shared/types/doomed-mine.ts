export type PokerSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type PokerRank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface PokerCard {
  id: string;
  suit: PokerSuit;
  rank: PokerRank;
  value: number; // 2..14 (Ace = 14)
}

export type DoomedMinePhase =
  | 'pre_flop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'game_over';

export interface PlayerHandEvaluation {
  handName: string;
  category: string;
  categoryRank: number;
  bestCards: PokerCard[];
  score: number[];
  token: number | null;
  rankOrder: number; // 1 (weakest) to N (strongest)
}

export interface ShowdownViolation {
  playerAId: string;
  playerAName: string;
  tokenA: number;
  handAName: string;
  playerBId: string;
  playerBName: string;
  tokenB: number;
  handBName: string;
  message: string;
}

export interface ShowdownResult {
  success: boolean;
  message: string;
  evaluations: Record<string, PlayerHandEvaluation>;
  violations: ShowdownViolation[];
}

export interface PlayerTokenHistory {
  preFlop?: number | null;
  flop?: number | null;
  turn?: number | null;
  river?: number | null;
  r1?: number | null;
  r2?: number | null;
  r3?: number | null;
  r4?: number | null;
}

export interface DoomedMinePlayer {
  id: string;
  name: string;
  avatarId: string;
  isBot: boolean;
}

export interface DoomedMineLogEntry {
  id: string;
  type: 'TOKEN_CLAIM' | 'TOKEN_SWAP' | 'TOKEN_DISPLACE' | 'TOKEN_CONFIRM' | 'TOKEN_UNCONFIRM' | 'TOKEN_RELEASE' | 'PHASE_CHANGE' | 'NEW_EXPEDITION';
  text: string;
  timestamp: number;
  senderId?: string;
  senderName?: string;
}

export interface DoomedMineMatchState {
  gameId: 'doomed-mine';
  roomId: string;
  hostId?: string | null;
  phase: DoomedMinePhase;
  expedition: number;
  maxExpeditions: number;
  successes: number;
  failures: number;
  communityCards: PokerCard[];
  privateCards: Record<string, PokerCard[]>;
  tokens: Record<string, number | null>;
  ready: Record<string, boolean>;
  tokenHistory: Record<string, PlayerTokenHistory>;
  availableTokens: number[];
  players: DoomedMinePlayer[];
  showdownResult: ShowdownResult | null;
  deadline: number | null;
  winnerId?: string | null;
  winReason?: string;
  scores: Record<string, number>;
  actionLog?: DoomedMineLogEntry[];
  pendingGameOver?: 'victory' | 'defeat' | null;
  roundDurationSec?: number;
}

export type DoomedMineAction =
  | { type: 'SELECT_TOKEN'; token: number }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'NEXT_EXPEDITION' }
  | { type: 'CONFIRM_TOKEN' }
  | { type: 'UNCONFIRM_TOKEN' }
  | { type: 'RELEASE_TOKEN' };

