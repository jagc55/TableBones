import { Player, RoomSettings, BaseGameEngineProps } from '../types';

export type BonegleGridSize = 4 | 5 | 6;
export type BonegleLang = 'es' | 'en';

export interface BoneglePathStep {
  r: number;
  c: number;
  letter: string;
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
