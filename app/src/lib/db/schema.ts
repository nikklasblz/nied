/**
 * Esquema SQLite de niED v0.3.
 *
 * Tablas mínimas (ver diseño §13). Llaves de progreso: track_id + unit_id,
 * de modo que regenerar un sílabo no destruye XP histórico.
 */

export const SCHEMA = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS xp_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity TEXT NOT NULL,
    track_id TEXT,
    unit_id TEXT,
    xp INTEGER NOT NULL,
    multiplier REAL NOT NULL DEFAULT 1.0,
    occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_xp_events_track_unit ON xp_events(track_id, unit_id);
  CREATE INDEX IF NOT EXISTS idx_xp_events_occurred ON xp_events(occurred_at);

  CREATE TABLE IF NOT EXISTS unit_progress (
    track_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente',
    started_at TEXT,
    completed_at TEXT,
    PRIMARY KEY (track_id, unit_id)
  );

  CREATE TABLE IF NOT EXISTS streaks (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date TEXT,
    freeze_used_iso_week TEXT
  );
  INSERT OR IGNORE INTO streaks (id) VALUES (1);

  CREATE TABLE IF NOT EXISTS achievements_unlocked (
    achievement_id TEXT PRIMARY KEY,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    selected_answer INTEGER NOT NULL,
    correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_quiz_track_unit ON quiz_attempts(track_id, unit_id);
`;
