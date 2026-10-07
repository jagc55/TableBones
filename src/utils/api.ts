import { ChatMessage, Room, RoomSettings, UserProfile } from '../types';
import type { MatchState } from './networkSync';

const AUTH_TOKEN_KEY = 'tableskull_auth_token';
const API_BASE = window.location.pathname.startsWith('/tablebones') ? '/tablebones/api' : '/api';

interface ApiErrorBody {
  error?: string;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

const getToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const setToken = (token: string): void => {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // The session remains usable for this page even when storage is unavailable.
  }
};

const clearToken = (): void => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore inaccessible browser storage.
  }
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) throw new ApiError(body.error || 'Request failed.', response.status);
  return body;
};

const guestIdentity = () => ({
  alias: `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
  avatarId: 'boxer',
});

export const api = {
  getAuthToken: getToken,

  async ensureGuestSession(): Promise<UserProfile> {
    const token = getToken();
    if (token) {
      try {
        return (await request<{ user: UserProfile }>('/me')).user;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        clearToken();
      }
    }

    const session = await request<{ token: string; user: UserProfile }>('/auth/guest', {
      method: 'POST',
      body: JSON.stringify(guestIdentity()),
    });
    setToken(session.token);
    return session.user;
  },

  async getProfile(): Promise<UserProfile> {
    return (await request<{ user: UserProfile }>('/me')).user;
  },

  async getAchievements(): Promise<UnlockedAchievement[]> {
    return (await request<{ achievements: UnlockedAchievement[] }>('/me/achievements')).achievements;
  },

  async updateProfile(profile: Pick<UserProfile, 'name' | 'avatarId'>): Promise<UserProfile> {
    return (await request<{ user: UserProfile }>('/me', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    })).user;
  },

  async listRooms(): Promise<Room[]> {
    return (await request<{ rooms: Room[] }>('/rooms')).rooms;
  },

  async lookupRoomByCode(code: string): Promise<Room> {
    return (await request<{ room: Room }>(`/rooms/by-code/${encodeURIComponent(code.trim().toUpperCase())}`)).room;
  },

  async fetchActiveRoom(): Promise<Room | null> {
    return (await request<{ room: Room | null }>('/me/active-room')).room;
  },

  async createRoom(input: Pick<Room, 'title' | 'gameId' | 'isPrivate' | 'settings'>): Promise<Room> {
    return (await request<{ room: Room }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(input),
    })).room;
  },

  async joinRoom(roomId: string): Promise<Room> {
    return (await request<{ room: Room }>(`/rooms/${encodeURIComponent(roomId)}/join`, { method: 'POST' })).room;
  },

  async kickPlayer(roomId: string, playerId: string): Promise<Room> {
    return (await request<{ room: Room }>(`/rooms/${encodeURIComponent(roomId)}/kick`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    })).room;
  },

  async transferHost(roomId: string, playerId: string): Promise<Room> {
    return (await request<{ room: Room }>(`/rooms/${encodeURIComponent(roomId)}/transfer-host`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    })).room;
  },

  async addBot(roomId: string, name: string, avatarId: string): Promise<Room> {
    return (await request<{ room: Room }>(`/rooms/${encodeURIComponent(roomId)}/add-bot`, {
      method: 'POST',
      body: JSON.stringify({ name, avatarId }),
    })).room;
  },

  async updateRoomSettings(roomId: string, input: { settings: RoomSettings; title?: string; isPrivate?: boolean }): Promise<Room> {
    return (await request<{ room: Room }>(`/rooms/${encodeURIComponent(roomId)}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })).room;
  },

  async leaveRoom(roomId: string): Promise<void> {
    await request<{ ok: boolean }>(`/rooms/${encodeURIComponent(roomId)}/leave`, { method: 'POST' });
  },

  async setReady(roomId: string, ready: boolean): Promise<Room> {
    return (await request<{ room: Room }>(`/rooms/${encodeURIComponent(roomId)}/ready`, {
      method: 'POST',
      body: JSON.stringify({ ready }),
    })).room;
  },

  async startRoom(roomId: string): Promise<Room> {
    return (await request<{ room: Room }>(`/rooms/${encodeURIComponent(roomId)}/start`, { method: 'POST' })).room;
  },

  async rematchRoom(roomId: string): Promise<{ room: Room; match: MatchState }> {
    return request<{ room: Room; match: MatchState }>(`/rooms/${encodeURIComponent(roomId)}/rematch`, { method: 'POST' });
  },

  async fetchChat(roomId: string): Promise<ChatMessage[]> {
    return (await request<{ messages: ChatMessage[] }>(`/rooms/${encodeURIComponent(roomId)}/chat`)).messages;
  },

  async mutePlayer(roomId: string, playerId: string, muted: boolean): Promise<void> {
    await request<{ ok: boolean }>(`/rooms/${encodeURIComponent(roomId)}/mute`, {
      method: 'POST',
      body: JSON.stringify({ playerId, muted }),
    });
  },

  async linkGoogle(credential: string): Promise<UserProfile> {
    return (await request<{ user: UserProfile }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    })).user;
  },
};

export type CreateRoomInput = Pick<Room, 'title' | 'gameId' | 'isPrivate'> & {
  settings: RoomSettings;
};