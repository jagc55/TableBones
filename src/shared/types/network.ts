import type { ChatMessage, Room } from './index';
import type { BonegleMatchState, BonegleWordFeedback } from '../../frontend/games/bonegle/types';
import type { MidnightMatchState } from '../../frontend/games/midnight-alley/types';
import type { DoomedMineMatchState, DoomedMineAction } from '../../frontend/games/doomed-mine/types';

// Backward compatibility re-exports for individual games
export type { BonegleMatchState, BonegleWordFeedback };
export type { MidnightMatchState };
export type { DoomedMineMatchState, DoomedMineAction };

/**
 * Authoritative base match state emitted over WebSocket.
 * Any game engine extends this contract without requiring core platform modifications.
 */
export interface BaseMatchState {
  gameId: string;
  roomId: string;
  deadline?: number | null;
  winnerId?: string | null;
  winReason?: string;
  [key: string]: any;
}

/**
 * MatchState discriminated union - defaults to BaseMatchState while permitting full type narrowing
 * for registered TableSkull games.
 */
export type MatchState = BonegleMatchState | MidnightMatchState | DoomedMineMatchState | BaseMatchState;

/**
 * Standard game action dispatched by client game engines to the server.
 */
export interface GameAction {
  type: string;
  [key: string]: unknown;
}

/**
 * Platform Realtime Network Events.
 * Game-specific action outcomes stream via GAME_ACTION_RESULT or custom events.
 */
export type NetworkEvent =
  | { type: 'CONNECTED'; userId: string }
  | { type: 'ROOM_UPDATED'; room: Room }
  | { type: 'MATCH_STARTED'; room: Room }
  | { type: 'MATCH_STATE'; roomId: string; state: MatchState }
  | { type: 'MATCH_FINISHED'; roomId: string; state: MatchState; room?: Room; scores?: Record<string, number>; breakdowns?: Record<string, any> }
  | { type: 'GAME_ACTION_RESULT'; roomId: string; [key: string]: any }
  | { type: 'BONEGLE_WORD_RESULT'; roomId: string; word: string; status: 'valid' | 'duplicate' | 'invalid' }
  | { type: 'ROOM_CLOSED'; roomId: string }
  | { type: 'CHAT_MESSAGE'; roomId: string; chatMessage: ChatMessage }
  | { type: 'ERROR'; message: string };
