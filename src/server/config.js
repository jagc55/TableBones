import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url));
export const DIST_DIR = path.join(ROOT_DIR, 'dist');
export const PORT = parseInt(process.env.PORT || '3000', 10);

export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tableskull:tableskull@127.0.0.1:5432/tableskull';

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export const DISCONNECT_GRACE_MS = 4000;

export const DEFAULT_STATS = {
  matchesPlayed: 0,
  matchesWon: 0,
  wordsFound: 0,
  walkoverWins: 0,
};

export const DEFAULT_SETTINGS = {
  roundDurationSec: 120,
  turnTimeLimitSec: 45,
  dictionaryLang: 'es',
  bonegleGridSize: 5,
};

export const ACHIEVEMENT_IDS = new Set([
  'first-match',
  'ring-champion',
  'gracious-host',
  'secret-society',
  'peacekeeper',
  'silver-tongue',
  'last-man-standing',
  'high-roller',
]);
