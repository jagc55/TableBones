import { GameDefinition, Room, Achievement } from '../types';
import { getAllGameDefinitions } from '../games';

export const GAMES_CATALOG: GameDefinition[] = getAllGameDefinitions();

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-match',
    title: 'First Match',
    description: 'Play your first online board game match.',
    category: 'combat',
    isUnlocked: false,
    iconKey: 'Swords',
    points: 10,
  },
  {
    id: 'ring-champion',
    title: 'First Victory',
    description: 'Win any multiplayer match.',
    category: 'combat',
    isUnlocked: false,
    iconKey: 'Trophy',
    points: 25,
  },
  {
    id: 'gracious-host',
    title: 'Game Host',
    description: 'Create a public game room for others to join.',
    category: 'hosting',
    isUnlocked: false,
    iconKey: 'Crown',
    points: 15,
  },
  {
    id: 'secret-society',
    title: 'Private Game',
    description: 'Join or host a private room using a room code.',
    category: 'social',
    isUnlocked: false,
    iconKey: 'Key',
    points: 15,
  },
  {
    id: 'peacekeeper',
    title: 'Peacekeeper',
    description: 'Mute a disruptive player in the chat.',
    category: 'social',
    isUnlocked: false,
    iconKey: 'VolumeX',
    points: 20,
  },
  {
    id: 'silver-tongue',
    title: 'Active Chatter',
    description: 'Send 5 messages in game chat.',
    category: 'social',
    isUnlocked: false,
    iconKey: 'MessageSquare',
    points: 15,
  },
  {
    id: 'last-man-standing',
    title: 'Default Win',
    description: 'Win a match when opponents leave below the minimum player count.',
    category: 'veteran',
    isUnlocked: false,
    iconKey: 'Award',
    points: 30,
  },
  {
    id: 'high-roller',
    title: 'High Scorer',
    description: 'Score 30 or more points in a single match.',
    category: 'combat',
    isUnlocked: false,
    iconKey: 'Sparkles',
    points: 35,
  },
];

export const INITIAL_PUBLIC_ROOMS: Room[] = [];
