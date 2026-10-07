export type GameId = 'bonegle' | 'midnight-alley';


export interface GameDefinition {
  id: GameId;
  title: string;
  subtitle: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedTimeMin: number;
  iconName: string;
  badge: string;
}

export type RoomStatus = 'waiting' | 'in_progress' | 'finished';

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  isBot?: boolean;
  hasLeft?: boolean;
  /** Generic extensible payload for game-specific round/match breakdowns or stats */
  customData?: Record<string, unknown>;
  /** Optional game breakdown items for victory podium display */
  breakdownItems?: Array<{ label: string; value: string | number }>;
  /** @deprecated Word-search specific breakdown. Prefer customData or breakdownItems in new games */
  wordsBreakdown?: {
    uniqueWords: { word: string; pts: number }[];
    sharedWords: { word: string; pts: number; sharedWith?: string[] }[];
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomSettings {
  roundDurationSec: number;
  turnTimeLimitSec: number;
  /** Deterministic seed string shared by all contenders in the match */
  matchSeed?: string;
  dictionaryLang?: 'en' | 'es';
  /** Extensible custom settings bag for individual game parameters */
  customSettings?: Record<string, unknown>;
  /** @deprecated Specific to Bonegle. Maintained for backwards compatibility */
  bonegleGridSize?: 4 | 5 | 6;
  /** @deprecated Use matchSeed instead */
  bonegleSeed?: string;
  /** @deprecated Maintained for backwards compatibility */
  bonegleBoard?: string[][];
  [key: string]: unknown;
}

export interface Room {
  id: string;
  code: string;
  title: string;
  gameId: GameId;
  isPrivate: boolean;
  minPlayers: number;
  maxPlayers: number;
  status: RoomStatus;
  hostId: string;
  players: Player[];
  settings: RoomSettings;
  createdAt: number;
  winnerId?: string | null;
  winReason?: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'combat' | 'social' | 'hosting' | 'veteran';
  isUnlocked: boolean;
  unlockedAt?: number;
  iconKey: string;
  points: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarId: string;
  isGoogleAuth: boolean;
  googleEmail?: string;
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    wordsFound: number;
    walkoverWins: number;
  };
  mutedPlayerIds: string[];
}

export const AFK_CONFIG = {
  TURN_TIMEOUT_SEC: 45,
  BID_TIMEOUT_SEC: 45,
  REMATCH_TIMEOUT_SEC: 45,
} as const;

export * from './game';
