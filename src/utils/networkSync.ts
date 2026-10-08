import { ChatMessage, Room } from '../types';
import type { MidnightCard, PlayedTrickCard } from '../games/midnight-alley/types';
import { api } from './api';

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

export type MatchState = BonegleMatchState | MidnightMatchState;

export type GameAction =
  | { type: 'SUBMIT_WORD'; word: string; path: Array<{ row: number; col: number }> }
  | { type: 'PLACE_BID'; bid: number }
  | { type: 'PLAY_CARD'; cardId: string; chameleonChoice?: 'gangster' | 'alibi' }
  | { type: 'ADVANCE_TRICK' }
  | { type: 'NEXT_ROUND' };

export type NetworkEvent =
  | { type: 'CONNECTED'; userId: string }
  | { type: 'ROOM_UPDATED'; room: Room }
  | { type: 'MATCH_STARTED'; room: Room }
  | { type: 'MATCH_STATE'; roomId: string; state: MatchState }
  | { type: 'MATCH_FINISHED'; roomId: string; state: MatchState; room?: Room }
  | { type: 'BONEGLE_WORD_RESULT'; roomId: string; word: string; status: BonegleWordFeedback['status'] }
  | { type: 'ROOM_CLOSED'; roomId: string }
  | { type: 'CHAT_MESSAGE'; roomId: string; chatMessage: ChatMessage }
  | { type: 'ERROR'; message: string };

let cachedLanUrl = '';

// Query local network IP from server endpoint
export const fetchNetworkInfo = async (): Promise<string> => {
  if (cachedLanUrl) return cachedLanUrl;
  try {
    const apiBase = window.location.pathname.startsWith('/tablebones') ? '/tablebones/api' : '/api';
    const res = await fetch(`${apiBase}/network-info`);
    if (res.ok) {
      const data = await res.json();
      if (data.lanUrl) {
        cachedLanUrl = data.lanUrl;
        return data.lanUrl;
      }
    }
  } catch {
    // Network details are optional for invite links.
  }
  return '';
};

void fetchNetworkInfo();

export const getCachedLanUrl = (): string => cachedLanUrl;

export const buildInviteUrl = (room: Room): string => {
  const host = window.location.hostname;
  let baseUrl = window.location.origin;

  // If host is browsing on localhost/127.0.0.1, prioritize LAN IP so friends on Wi-Fi can connect
  if ((host === 'localhost' || host === '127.0.0.1') && cachedLanUrl) {
    baseUrl = cachedLanUrl;
  }

  return `${baseUrl}${window.location.pathname}?join=${encodeURIComponent(room.code)}`;
};

class NetworkManager {
  private socket: WebSocket | null = null;
  private listeners: Set<(event: NetworkEvent) => void> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private roomId: string | null = null;

  public connect(): void {
    if (typeof window === 'undefined' || this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
    const token = api.getAuthToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const subpath = window.location.pathname.startsWith('/tablebones') ? '/tablebones' : '';
    const socket = new WebSocket(`${protocol}//${window.location.host}${subpath}/tablebones-ws?token=${encodeURIComponent(token)}`);
    this.socket = socket;
    socket.onopen = () => {
      if (this.roomId) this.sendSubscription(this.roomId);
    };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as NetworkEvent;
        if (event?.type) this.emit(event);
      } catch {
        this.emit({ type: 'ERROR', message: 'Received an invalid realtime message.' });
      }
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.scheduleReconnect();
    };
  }

  public subscribeRoom(roomId: string): void {
    this.roomId = roomId;
    this.connect();
    if (this.socket?.readyState === WebSocket.OPEN) this.sendSubscription(roomId);
  }

  public clearRoom(roomId?: string): void {
    const targetRoomId = roomId || this.roomId;
    if (targetRoomId && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'UNSUBSCRIBE_ROOM', roomId: targetRoomId }));
    }
    if (!roomId || this.roomId === roomId) this.roomId = null;
  }

  public leaveRoom(roomId: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'LEAVE_ROOM', roomId }));
    }
    this.clearRoom(roomId);
  }

  public sendChat(roomId: string, text: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.emit({ type: 'ERROR', message: 'Realtime connection is unavailable. Please try again.' });
      this.connect();
      return;
    }
    this.socket.send(JSON.stringify({ type: 'CHAT_SEND', roomId, text }));
  }

  public sendGameAction(roomId: string, action: GameAction): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.emit({ type: 'ERROR', message: 'Realtime connection is unavailable. Please try again.' });
      this.connect();
      return;
    }
    this.socket.send(JSON.stringify({ type: 'GAME_ACTION', roomId, action }));
  }

  public subscribe(listener: (event: NetworkEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private sendSubscription(roomId: string): void {
    this.socket?.send(JSON.stringify({ type: 'SUBSCRIBE_ROOM', roomId }));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  private emit(event: NetworkEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

export const networkManager = new NetworkManager();
