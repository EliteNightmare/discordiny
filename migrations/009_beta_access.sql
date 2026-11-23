-- Run ONLY against the production discordiny D1 database.
-- Beta invitations and membership intentionally survive beta gameplay resets.
CREATE TABLE IF NOT EXISTS beta_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1))
);
INSERT OR IGNORE INTO beta_settings (id, enabled) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS beta_invites (
  code_hash TEXT PRIMARY KEY,
  created_by_discord_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  redeemed_by_discord_id TEXT UNIQUE,
  redeemed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_beta_invites_redeemer ON beta_invites(redeemed_by_discord_id);
