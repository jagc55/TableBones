export type GameId = 'vortilex' | 'skull-bones' | 'royal-checkers' | 'mystery-manor';

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
  dictionaryLang: 'en' | 'es';
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
