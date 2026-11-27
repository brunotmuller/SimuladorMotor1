import { randomUUID } from "node:crypto";
import {
  ensureDatabaseAdapter,
  openDatabaseAdapter,
} from "../db/adapter.mjs";
import {
  ensureDashboardSchema,
  seedDefaultCatalogs,
} from "../dashboard/db.mjs";
import { DEFAULT_DB_PATH } from "./config.mjs";

const DEFAULT_ADMIN_NAME = "Administrador TorqueLab";

const SQLITE_SCHEMA_SQL = `
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

const POSTGRES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
  ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id_token_hash
  ON refresh_tokens (user_id, token_hash);
`;

export async function initializeAuthDatabase(db) {
  const adapter = ensureDatabaseAdapter(db);
  await adapter.exec(
    adapter.driver === "postgres" ? POSTGRES_SCHEMA_SQL : SQLITE_SCHEMA_SQL,
  );
  await ensureDashboardSchema(adapter);
  await seedDefaultCatalogs(adapter);
  return adapter;
}

export async function openAuthDatabase(dbPathOrOptions = DEFAULT_DB_PATH) {
  let adapter;
  if (
    dbPathOrOptions &&
    typeof dbPathOrOptions === "object" &&
    !Array.isArray(dbPathOrOptions)
  ) {
    adapter = await openDatabaseAdapter(dbPathOrOptions);
  } else {
    const targetPath =
      typeof dbPathOrOptions === "string" && dbPathOrOptions.trim() !== ""
        ? dbPathOrOptions.trim()
        : DEFAULT_DB_PATH;
    adapter = await openDatabaseAdapter({
      env: { ...process.env, POSTGRES_URL: "", DATABASE_URL: "" },
      dbPath: targetPath,
    });
  }

  await initializeAuthDatabase(adapter);
  return adapter;
}

export async function seedInitialAdmin(db, config, hashPasswordFn) {
  const adapter = ensureDatabaseAdapter(db);
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
  const existing = await adapter.get(
    "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [normalizedEmail],
  );

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

  const result = await adapter.run(
    `INSERT INTO users (
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
    ) VALUES (?, ?, ?, ?, 'admin', 'active', 0, NULL, ?, ?)
    ON CONFLICT DO NOTHING`,
    [id, adminName, normalizedEmail, passwordHash, now, now],
  );

  if (result.changes === 0) {
    const raced = await adapter.get(
      "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [normalizedEmail],
    );
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

export async function promoteConfiguredAdmin(db, email = process.env.ADMIN_PROMOTE_EMAIL) {
  const adapter = ensureDatabaseAdapter(db);
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail) return { promoted: false, reason: "not_configured" };

  const now = new Date().toISOString();
  const result = await adapter.run(
    "UPDATE users SET role = 'admin', updated_at = ? WHERE LOWER(email) = LOWER(?)",
    [now, normalizedEmail],
  );

  return result.changes > 0
    ? { promoted: true, email: normalizedEmail }
    : { promoted: false, reason: "user_not_found", email: normalizedEmail };
}
