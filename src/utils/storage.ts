import { UserProfile, Achievement, Room, RoomSettings } from '../types';
import { INITIAL_ACHIEVEMENTS, INITIAL_PUBLIC_ROOMS } from './mockData';

const STORAGE_KEYS = {
  USER_PROFILE: 'tablebones_user_profile',
  ACHIEVEMENTS: 'tablebones_achievements',
  AUDIO_MUTED: 'tablebones_audio_muted',
  ROOMS: 'tablebones_active_rooms',
};

const DEFAULT_PROFILE: UserProfile = {
  id: 'guest-' + Math.floor(1000 + Math.random() * 9000),
  name: 'Lucky Pugilist',
  avatarId: 'boxer',
  isGoogleAuth: false,
  googleEmail: undefined,
  stats: {
    matchesPlayed: 0,
    matchesWon: 0,
    wordsFound: 0,
    walkoverWins: 0,
  },
  mutedPlayerIds: [],
};

const CONTENDER_NICKNAMES = [
  'Lucky Pugilist',
  'Velvet Shadow',
  'Ace High',
  'Silver Fox',
  'Silent Jack',
  'Diamond Dan',
  'Midnight Kid',
  'Iron Jaw',
];

const CONTENDER_AVATARS = ['boxer', 'ringmaster', 'captain', 'detective', 'shark', 'illusionist'];

export const getSessionPlayerId = (): string => {
  try {
    let sessionId = sessionStorage.getItem('tablebones_session_id');
    if (!sessionId) {
      sessionId = 'p-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000).toString(36);
      sessionStorage.setItem('tablebones_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return 'p-' + Math.floor(Math.random() * 10000);
  }
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  roundDurationSec: 60,
  turnTimeLimitSec: 45,
  dictionaryLang: 'en',
};

export const loadUserProfile = (): UserProfile => {
  const sessionId = getSessionPlayerId();
  try {
    let sessionName = sessionStorage.getItem('tablebones_session_name');
    let sessionAvatar = sessionStorage.getItem('tablebones_session_avatar');

    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!sessionName) {
      const primarySession = localStorage.getItem('tablebones_primary_session');
      if (!primarySession || primarySession === sessionId) {
        localStorage.setItem('tablebones_primary_session', sessionId);
        sessionName = parsed?.name || 'Lucky Pugilist';
        sessionAvatar = parsed?.avatarId || 'boxer';
      } else {
        const randIndex = Math.floor(Math.random() * CONTENDER_NICKNAMES.length);
        sessionName = `${CONTENDER_NICKNAMES[randIndex]} #${Math.floor(10 + Math.random() * 90)}`;
        sessionAvatar = CONTENDER_AVATARS[Math.floor(Math.random() * CONTENDER_AVATARS.length)];
      }
      sessionStorage.setItem('tablebones_session_name', sessionName || 'Lucky Pugilist');
      sessionStorage.setItem('tablebones_session_avatar', sessionAvatar || 'boxer');
    }

    const finalName = sessionName || 'Lucky Pugilist';
    const finalAvatar = sessionAvatar || 'boxer';

    return {
      ...DEFAULT_PROFILE,
      ...(parsed || {}),
      id: sessionId,
      name: finalName,
      avatarId: finalAvatar,
    };
  } catch (e) {
    console.warn('Storage read error', e);
  }
  return { ...DEFAULT_PROFILE, id: sessionId };
};

export const saveUserProfile = (profile: UserProfile): void => {
  try {
    sessionStorage.setItem('tablebones_session_name', profile.name);
    sessionStorage.setItem('tablebones_session_avatar', profile.avatarId);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.warn('Storage write error', e);
  }
};

export const loadAchievements = (): Achievement[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (raw) {
      const saved: Achievement[] = JSON.parse(raw);
      // Merge with INITIAL_ACHIEVEMENTS to handle any new additions
      return INITIAL_ACHIEVEMENTS.map((initial) => {
        const found = saved.find((s) => s.id === initial.id);
        return found ? found : initial;
      });
    }
  } catch (e) {
    console.warn('Storage read error', e);
  }
  return INITIAL_ACHIEVEMENTS;
};

export const saveAchievements = (achievements: Achievement[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  } catch (e) {
    console.warn('Storage write error', e);
  }
};

export const loadAudioMuted = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUDIO_MUTED) === 'true';
  } catch {
    return false;
  }
};

export const saveAudioMuted = (muted: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIO_MUTED, String(muted));
  } catch (e) {
    console.warn('Storage write error', e);
  }
};

export const loadTheme = (): 'day' | 'night' => {
  try {
    const saved = localStorage.getItem('tablebones_theme');
    if (saved === 'night' || saved === 'day') return saved;
  } catch {}
  return 'day';
};

export const saveTheme = (theme: 'day' | 'night'): void => {
  try {
    localStorage.setItem('tablebones_theme', theme);
  } catch {}
};

export const loadActiveRooms = (): Room[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROOMS);
    if (raw) {
      const saved: Room[] = JSON.parse(raw);
      // Merge saved with initial rooms so defaults always exist
      const combined = [...saved];
      for (const init of INITIAL_PUBLIC_ROOMS) {
        if (!combined.some((r) => r.id === init.id)) {
          combined.push(init);
        }
      }
      return combined;
    }
  } catch (e) {
    console.warn('Rooms read error', e);
  }
  return INITIAL_PUBLIC_ROOMS;
};

export const saveActiveRooms = (rooms: Room[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  } catch (e) {
    console.warn('Rooms write error', e);
  }
};

export const encodeRoomInvite = (room: Room): string => {
  try {
    const compact = {
      i: room.id,
      c: room.code,
      t: room.title,
      g: room.gameId,
      p: room.isPrivate,
      min: room.minPlayers,
      max: room.maxPlayers,
      h: room.hostId,
      s: room.settings,
    };
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(compact)))));
  } catch (e) {
    console.warn('Failed to encode room invite', e);
    return '';
  }
};

export const decodeRoomInvite = (dataStr: string): Partial<Room> | null => {
  try {
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(dataStr))));
    const c = JSON.parse(jsonStr);
    return {
      id: c.i,
      code: c.c,
      title: c.t,
      gameId: c.g,
      isPrivate: c.p,
      minPlayers: c.min,
      maxPlayers: c.max,
      hostId: c.h,
      settings: c.s,
    };
  } catch (e) {
    console.warn('Failed to decode room invite', e);
    return null;
  }
};
