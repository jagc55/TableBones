import { UserProfile } from '../types';

const AUDIO_MUTED_KEY = 'tablebones_audio_muted';
const THEME_KEY = 'tablebones_theme';
export const GUEST_PROFILE_COOKIE = 'tablebones_guest_profile';
export const AUTH_TOKEN_KEY = 'tableskull_auth_token';

export interface GuestProfileData {
  name: string;
  avatarId: string;
  stats?: UserProfile['stats'];
  achievements?: Array<{ id: string; unlockedAt: number }>;
}

export const getCookie = (name: string): string | null => {
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

export const setCookie = (name: string, value: string, days = 365): void => {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // Ignore inaccessible browser storage.
  }
};

export const deleteCookie = (name: string): void => {
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {
    // Ignore inaccessible browser storage.
  }
};

export const loadGuestProfile = (): GuestProfileData | null => {
  try {
    const raw = getCookie(GUEST_PROFILE_COOKIE) || localStorage.getItem(GUEST_PROFILE_COOKIE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === 'string') {
      return parsed as GuestProfileData;
    }
  } catch {
    // Ignore storage read errors.
  }
  return null;
};

export const saveGuestProfile = (data: GuestProfileData): void => {
  try {
    const serialized = JSON.stringify(data);
    setCookie(GUEST_PROFILE_COOKIE, serialized, 365);
    localStorage.setItem(GUEST_PROFILE_COOKIE, serialized);
  } catch {
    // Ignore storage write errors.
  }
};

export const clearGuestProfile = (): void => {
  try {
    deleteCookie(GUEST_PROFILE_COOKIE);
    localStorage.removeItem(GUEST_PROFILE_COOKIE);
  } catch {
    // Ignore storage write errors.
  }
};

export const loadAudioMuted = (): boolean => {
  try {
    return localStorage.getItem(AUDIO_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const saveAudioMuted = (muted: boolean): void => {
  try {
    localStorage.setItem(AUDIO_MUTED_KEY, String(muted));
  } catch {
    // Ignore inaccessible browser storage.
  }
};

export const loadTheme = (): 'day' | 'night' => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'night' || saved === 'day') return saved;
  } catch {
    // Ignore inaccessible browser storage.
  }
  return 'day';
};

export const saveTheme = (theme: 'day' | 'night'): void => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore inaccessible browser storage.
  }
};

