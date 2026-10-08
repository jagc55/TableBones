import type { Room } from '../types';
import type { GameAction, NetworkEvent } from '../../shared/types/network';
import { api } from '../utils/api';
export type { BonegleWordFeedback, BonegleMatchState, MidnightMatchState, MatchState, GameAction, NetworkEvent } from '../../shared/types/network';
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
