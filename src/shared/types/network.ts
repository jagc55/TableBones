import type { ChatMessage, Room } from './index';
import type { MidnightCard, PlayedTrickCard } from './midnight-alley';
import type { DoomedMineMatchState, DoomedMineAction } from './doomed-mine';
export interface BonegleWordFeedback {
  word: string;
  status: 'valid' | 'duplicate' | 'invalid';
  id: number;
}

export interface BonegleMatchState {
  gameId: 'bonegle';
  roomId: string;
  board: string[][];
  deadline: number;
  phase: 'active' | 'resolved';
  language?: 'en' | 'es';
  submittedWords: Record<string, Array<{ word: string; path: Array<{ row: number; col: number }> }>>;
  wordFeedback?: BonegleWordFeedback;
  breakdowns?: Record<string, { score: number; words: Array<{ word: string; points: number; shared: boolean; awarded: number }> }>;
  winnerId?: string | null;
  winReason?: string;
}

export interface MidnightMatchState {
  gameId: 'midnight-alley';
  roomId: string;
  round: number;
  maxRounds: number;
  phase: 'bidding' | 'playing' | 'trick_resolved' | 'round_summary' | 'game_over';
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

export type MatchState = BonegleMatchState | MidnightMatchState | DoomedMineMatchState;

export type GameAction =
  | { type: 'SUBMIT_WORD'; word: string; path: Array<{ row: number; col: number }> }
  | { type: 'PLACE_BID'; bid: number }
  | { type: 'PLAY_CARD'; cardId: string; chameleonChoice?: 'gangster' | 'alibi' }
  | { type: 'ADVANCE_TRICK' }
  | { type: 'NEXT_ROUND' }
  | DoomedMineAction
  | { type: string; [key: string]: any };

export type NetworkEvent =
  | { type: 'CONNECTED'; userId: string }
  | { type: 'ROOM_UPDATED'; room: Room }
  | { type: 'MATCH_STARTED'; room: Room }
  | { type: 'MATCH_STATE'; roomId: string; state: MatchState }
  | { type: 'MATCH_FINISHED'; roomId: string; state: MatchState; room?: Room; scores?: Record<string, number>; breakdowns?: Record<string, any> }
  | { type: 'GAME_ACTION_RESULT'; roomId: string; [key: string]: any }
  | { type: 'BONEGLE_WORD_RESULT'; roomId: string; word: string; status: BonegleWordFeedback['status'] }
  | { type: 'ROOM_CLOSED'; roomId: string }
  | { type: 'CHAT_MESSAGE'; roomId: string; chatMessage: ChatMessage }
  | { type: 'ERROR'; message: string };
