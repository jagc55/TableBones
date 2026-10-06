import { UserProfile, Achievement } from '../types';
import { INITIAL_ACHIEVEMENTS } from './mockData';

const STORAGE_KEYS = {
  USER_PROFILE: 'tablebones_user_profile',
  ACHIEVEMENTS: 'tablebones_achievements',
  AUDIO_MUTED: 'tablebones_audio_muted',
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

export const loadUserProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Storage read error', e);
  }
  return DEFAULT_PROFILE;
};

export const saveUserProfile = (profile: UserProfile): void => {
  try {
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
