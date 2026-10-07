import { Room, ChatMessage } from '../types';
import { encodeRoomInvite } from './storage';

export type NetworkEvent =
  | { type: 'SYNC_ROOM'; room: Room; kickedPlayerId?: string; leftPlayerId?: string }
  | { type: 'START_GAME'; roomId: string }
  | { type: 'ROOM_CLOSED'; roomId: string }
  | { type: 'CHAT_MESSAGE'; roomId: string; chatMessage: ChatMessage }
  | { type: 'GAME_MESSAGE'; roomId: string; playerId: string; messageType: string; payload: unknown }
  | { type: 'BONEGLE_WORDS'; roomId: string; playerId: string; words: string[] };

type NetworkEnvelope = NetworkEvent & {
  _senderSessionId: string;
  _msgId: string;
};

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
  } catch (e) {
    console.warn('Could not fetch network info', e);
  }
  return '';
};

// Immediate background fetch
fetchNetworkInfo();

export const getCachedLanUrl = (): string => cachedLanUrl;

export const buildInviteUrl = (room: Room): string => {
  const host = window.location.hostname;
  let baseUrl = window.location.origin;

  // If host is browsing on localhost/127.0.0.1, prioritize LAN IP so friends on Wi-Fi can connect
  if ((host === 'localhost' || host === '127.0.0.1') && cachedLanUrl) {
    baseUrl = cachedLanUrl;
  }

  const encoded = encodeRoomInvite(room);
  return `${baseUrl}${window.location.pathname}?join=${encodeURIComponent(room.code)}&data=${encoded}`;
};

class NetworkManager {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners: Set<(event: NetworkEvent) => void> = new Set();
  private processedMsgIds: Set<string> = new Set();
  private sessionId: string;
  private reconnectTimer: any = null;

  constructor() {
    this.sessionId = 'net-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

    // 1. Initialize BroadcastChannel for same-browser tabs
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel('tablebones_rooms_sync');
      this.bc.onmessage = (event: MessageEvent) => {
        this.handleIncoming(event.data);
      };
    }

    // 2. Initialize WebSocket for LAN and Internet cross-device connections
    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const subpath = window.location.pathname.startsWith('/tablebones') ? '/tablebones' : '';
      const wsUrl = `${protocol}//${window.location.host}${subpath}/tablebones-ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const envelope = JSON.parse(event.data);
          this.handleIncoming(envelope);
        } catch (e) {
          console.warn('Error parsing WS message', e);
        }
      };

      this.ws.onclose = () => {
        // Auto-reconnect after 2 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectWebSocket();
          }, 2000);
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (e) {
      console.warn('Failed to initiate WebSocket connection', e);
    }
  }

  private handleIncoming(data: any) {
    if (!data || !data.type) return;

    // Filter out messages we sent ourselves
    if (data._senderSessionId === this.sessionId) return;

    // Deduplicate messages received through both WS and BC
    if (data._msgId) {
      if (this.processedMsgIds.has(data._msgId)) return;
      this.processedMsgIds.add(data._msgId);
      if (this.processedMsgIds.size > 200) {
        // Keep set size bounded
        const first = this.processedMsgIds.values().next().value;
        if (first) this.processedMsgIds.delete(first);
      }
    }

    // Notify all active listeners
    this.listeners.forEach((listener) => {
      try {
        listener(data as NetworkEvent);
      } catch (err) {
        console.error('Network listener error', err);
      }
    });
  }

  public send(event: NetworkEvent) {
    const envelope: NetworkEnvelope = {
      ...event,
      _senderSessionId: this.sessionId,
      _msgId: Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8),
    };

    // 1. Send via WebSocket to all other devices
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(envelope));
    }

    // 2. Send via BroadcastChannel to other tabs on this machine
    if (this.bc) {
      try {
        this.bc.postMessage(envelope);
      } catch (e) {
        console.warn('BroadcastChannel error', e);
      }
    }
  }

  public subscribe(listener: (event: NetworkEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkManager = new NetworkManager();
