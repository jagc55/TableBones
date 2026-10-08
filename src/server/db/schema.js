import { pool } from './pool.js';
export const initializeDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      alias VARCHAR(24) NOT NULL,
      avatar_id VARCHAR(64) NOT NULL DEFAULT 'boxer',
      google_sub TEXT UNIQUE,
      google_email TEXT UNIQUE,
      stats JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash CHAR(64) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id UUID PRIMARY KEY,
      code VARCHAR(16) UNIQUE NOT NULL,
      title VARCHAR(36) NOT NULL,
      game_id VARCHAR(32) NOT NULL CHECK (game_id IN ('bonegle', 'midnight-alley')),
      is_private BOOLEAN NOT NULL DEFAULT FALSE,
      min_players SMALLINT NOT NULL,
      max_players SMALLINT NOT NULL,
      status VARCHAR(16) NOT NULL CHECK (status IN ('waiting', 'in_progress', 'finished', 'closed')),
      host_id UUID NOT NULL REFERENCES users(id),
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      winner_id UUID REFERENCES users(id),
      win_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS room_players (
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_ready BOOLEAN NOT NULL DEFAULT FALSE,
      score INTEGER NOT NULL DEFAULT 0,
      is_bot BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS matches (
      id UUID PRIMARY KEY,
      room_id UUID NOT NULL REFERENCES rooms(id),
      game_id VARCHAR(32) NOT NULL CHECK (game_id IN ('bonegle', 'midnight-alley')),
      status VARCHAR(16) NOT NULL CHECK (status IN ('active', 'finished', 'abandoned')),
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      winner_id UUID REFERENCES users(id),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY,
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      sender_name VARCHAR(24) NOT NULL,
      sender_avatar_id VARCHAR(64) NOT NULL,
      text VARCHAR(140) NOT NULL,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS muted_players (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muted_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, muted_user_id)
    );
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, achievement_id)
    );
  `);
  await pool.query(`
    UPDATE rooms SET status = 'closed', closed_at = NOW()
    WHERE status IN ('waiting', 'in_progress')
    AND id NOT IN (
      SELECT DISTINCT room_id FROM room_players WHERE is_bot = FALSE
    )
  `);
};
