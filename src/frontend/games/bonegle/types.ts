import { Player, RoomSettings, BaseGameEngineProps } from '../../types';

export type BonegleGridSize = 4 | 5 | 6;
export type BonegleLang = 'es' | 'en';

export interface BoneglePathStep {
  r: number;
  c: number;
  letter: string;
}

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

export interface BonegleSubmissionFeedback {
  word: string;
  status: 'valid' | 'invalid' | 'duplicate';
  pts?: number;
}

export interface BoardSolution {
  words: string[];
  wordsSet: Set<string>;
  longestWord: string;
  longestWordLength: number;
  totalPossibleWords: number;
}

export interface BonegleWordItem {
  word: string;
  pts: number;
}

export interface BonegleSharedWordItem {
  word: string;
  pts: number;
  sharedWith: string[];
}

export interface BoneglePlayerBreakdown {
  player: Player;
  uniqueWords: BonegleWordItem[];
  sharedWords: BonegleSharedWordItem[];
  totalScore: number;
}

export interface BonegleEngineProps extends BaseGameEngineProps {
  settings?: RoomSettings;
  timeLeftSec?: number;
}
