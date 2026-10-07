const AUDIO_MUTED_KEY = 'tablebones_audio_muted';
const THEME_KEY = 'tablebones_theme';

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
