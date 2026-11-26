import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ensureDashboardSchema,
  seedDefaultCatalogs,
} from "../dashboard/db.mjs";
import { DEFAULT_DB_PATH } from "./config.mjs";

const DEFAULT_ADMIN_NAME = "Administrador TorqueLab";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  replaced_by_token_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id_token_hash
  ON refresh_tokens (user_id, token_hash);
`;

export function openAuthDatabase(dbPath = DEFAULT_DB_PATH) {
  const targetPath =
    typeof dbPath === "string" && dbPath.trim() !== ""
      ? dbPath.trim()
      : DEFAULT_DB_PATH;

  if (targetPath !== ":memory:") {
    mkdirSync(dirname(targetPath), { recursive: true });
  }

  const db = new DatabaseSync(targetPath);

  db.exec("PRAGMA foreign_keys = ON;");
  if (targetPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }

  db.exec(SCHEMA_SQL);
  ensureDashboardSchema(db);
  seedDefaultCatalogs(db);

  return db;
}

export function seedInitialAdmin(db, config, hashPasswordFn) {
  const rawEmail =
    typeof config?.adminSeedEmail === "string"
      ? config.adminSeedEmail.trim()
      : "";
  const rawPassword =
    typeof config?.adminSeedPassword === "string"
      ? config.adminSeedPassword
      : "";

  if (!rawEmail || rawPassword.trim() === "") {
    return { seeded: false, reason: "not_configured" };
  }

  if (typeof hashPasswordFn !== "function") {
    throw new TypeError("hashPasswordFn deve ser uma função.");
  }

  const normalizedEmail = rawEmail.toLowerCase();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
    .get(normalizedEmail);

  if (existing) {
    return {
      seeded: false,
      reason: "already_exists",
      userId: existing.id,
    };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const adminName =
    typeof config?.adminSeedName === "string" &&
    config.adminSeedName.trim() !== ""
      ? config.adminSeedName.trim()
      : DEFAULT_ADMIN_NAME;
  const passwordHash = hashPasswordFn(rawPassword);

  const result = db
    .prepare(
      `INSERT OR IGNORE INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        status,
        failed_login_count,
        locked_until,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'admin', 'active', 0, NULL, ?, ?)`,
    )
    .run(id, adminName, normalizedEmail, passwordHash, now, now);

  if (result.changes === 0) {
    const raced = db
      .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
      .get(normalizedEmail);
    return {
      seeded: false,
      reason: "already_exists",
      userId: raced?.id ?? null,
    };
  }

  return {
    seeded: true,
    userId: id,
    email: normalizedEmail,
  };
}
