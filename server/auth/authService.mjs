import { randomUUID } from "node:crypto";
import { ensureDatabaseAdapter } from "../db/adapter.mjs";
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyPassword,
} from "./crypto.mjs";
import {
  validateLoginPayload,
  validateRegisterPayload,
} from "./validators.mjs";

const IP_RATE_LIMIT_MAX_ATTEMPTS = 10;
const IP_RATE_LIMIT_WINDOW_MS = 60_000;
const ACCOUNT_MAX_FAILED_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_MS = 15 * 60_000;
const MAX_TRACKED_IPS = 5000;

export class AuthError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    if (options.fields !== undefined) {
      this.fields = options.fields;
    }
    if (options.retryAfterSeconds !== undefined) {
      this.retryAfterSeconds = options.retryAfterSeconds;
    }
  }
}

export function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

function extractRefreshToken(input) {
  if (typeof input === "string") {
    return input.trim();
  }
  if (input && typeof input === "object" && typeof input.refreshToken === "string") {
    return input.refreshToken.trim();
  }
  return "";
}

function isUniqueConstraintError(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    message.includes("UNIQUE constraint failed") ||
    error?.errstr?.includes?.("UNIQUE constraint failed")
  );
}

export function createAuthService({ db, config, now = () => Date.now() }) {
  if (!db) {
    throw new TypeError("Instância de banco de dados (db) é obrigatória.");
  }
  if (!config) {
    throw new TypeError("Configuração de autenticação (config) é obrigatória.");
  }

  const adapter = ensureDatabaseAdapter(db);
  const ipAttempts = new Map();

  function enforceIpRateLimit(ipKey, currentNow) {
    if (ipAttempts.size > MAX_TRACKED_IPS) {
      for (const [key, entry] of ipAttempts.entries()) {
        if (currentNow - entry.windowStart >= IP_RATE_LIMIT_WINDOW_MS) {
          ipAttempts.delete(key);
        }
      }
    }

    const existing = ipAttempts.get(ipKey);
    const entry =
      !existing || currentNow - existing.windowStart >= IP_RATE_LIMIT_WINDOW_MS
        ? { windowStart: currentNow, count: 0 }
        : existing;

    if (entry.count >= IP_RATE_LIMIT_MAX_ATTEMPTS) {
      const remainingMs = entry.windowStart + IP_RATE_LIMIT_WINDOW_MS - currentNow;
      const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      throw new AuthError(
        429,
        "Muitas tentativas de login. Tente novamente em instantes.",
        { retryAfterSeconds },
      );
    }

    entry.count += 1;
    ipAttempts.set(ipKey, entry);
  }

  async function insertRefreshToken(userId, currentNow, executor = adapter) {
    const tokenId = randomUUID();
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const nowIso = new Date(currentNow).toISOString();
    const expiresAt = new Date(
      currentNow + config.refreshTtlSeconds * 1000,
    ).toISOString();

    await executor.run(
      `INSERT INTO refresh_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        revoked_at,
        replaced_by_token_id,
        created_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?)`,
      [tokenId, userId, tokenHash, expiresAt, nowIso],
    );

    return { tokenId, rawRefreshToken };
  }

  async function issueSession(userRow, currentNow) {
    const accessToken = signAccessToken(
      { id: userRow.id, role: userRow.role },
      config,
      currentNow,
    );
    const { rawRefreshToken } = await insertRefreshToken(userRow.id, currentNow);

    return {
      user: toPublicUser(userRow),
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: config.accessTtlSeconds,
      },
    };
  }

  async function register(payload) {
    const validation = validateRegisterPayload(payload);
    if (!validation.valid) {
      throw new AuthError(400, "Dados de cadastro inválidos.", {
        fields: validation.fields,
      });
    }

    const { name, email, password } = validation.data;

    const existing = await adapter.get(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (existing) {
      throw new AuthError(409, "Este e-mail já está em uso.");
    }

    const currentNow = now();
    const nowIso = new Date(currentNow).toISOString();
    const id = randomUUID();
    const passwordHash = hashPassword(password);

    try {
      await adapter.run(
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
        ) VALUES (?, ?, ?, ?, 'user', 'active', 0, NULL, ?, ?)`,
        [id, name, email, passwordHash, nowIso, nowIso],
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AuthError(409, "Este e-mail já está em uso.");
      }
      throw error;
    }

    const createdUser = {
      id,
      name,
      email,
      role: "user",
      status: "active",
      created_at: nowIso,
    };

    return issueSession(createdUser, currentNow);
  }

  async function login(payload, options = {}) {
    const currentNow = now();
    const ipKey =
      typeof options?.ip === "string" && options.ip.trim() !== ""
        ? options.ip.trim()
        : typeof payload?.ip === "string" && payload.ip.trim() !== ""
          ? payload.ip.trim()
          : "unknown";

    enforceIpRateLimit(ipKey, currentNow);

    const validation = validateLoginPayload(payload);
    if (!validation.valid) {
      throw new AuthError(400, "Dados de login inválidos.", {
        fields: validation.fields,
      });
    }

    const { email, password } = validation.data;
    const user = await adapter.get(
      `SELECT
        id,
        name,
        email,
        password_hash,
        role,
        status,
        failed_login_count,
        locked_until,
        created_at
      FROM users
      WHERE email = ?
      LIMIT 1`,
      [email],
    );

    if (!user) {
      throw new AuthError(401, "E-mail ou senha inválidos.");
    }

    const lockedUntilMs = user.locked_until ? Date.parse(user.locked_until) : NaN;
    if (Number.isFinite(lockedUntilMs) && lockedUntilMs > currentNow) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((lockedUntilMs - currentNow) / 1000),
      );
      const retryMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
      throw new AuthError(
        429,
        `Muitas tentativas incorretas. Tente novamente em ${retryMinutes} minuto(s).`,
        { retryAfterSeconds },
      );
    }

    if (user.status !== "active") {
      throw new AuthError(403, "Esta conta não está ativa para acesso.");
    }

    const nowIso = new Date(currentNow).toISOString();
    const passwordMatches = verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
      const previousLockExpired =
        Number.isFinite(lockedUntilMs) && lockedUntilMs <= currentNow;
      const baseCount = previousLockExpired ? 0 : Number(user.failed_login_count || 0);
      const nextFailedCount = baseCount + 1;
      const nextLockedUntil =
        nextFailedCount >= ACCOUNT_MAX_FAILED_ATTEMPTS
          ? new Date(currentNow + ACCOUNT_LOCKOUT_MS).toISOString()
          : null;

      await adapter.run(
        `UPDATE users
        SET failed_login_count = ?, locked_until = ?, updated_at = ?
        WHERE id = ?`,
        [nextFailedCount, nextLockedUntil, nowIso, user.id],
      );

      throw new AuthError(401, "E-mail ou senha inválidos.");
    }

    await adapter.run(
      `UPDATE users
      SET failed_login_count = 0, locked_until = NULL, updated_at = ?
      WHERE id = ?`,
      [nowIso, user.id],
    );

    return issueSession(user, currentNow);
  }

  async function refresh(rawRefreshToken) {
    const token = extractRefreshToken(rawRefreshToken);
    if (!token) {
      throw new AuthError(401, "Token de renovação inválido.");
    }

    const currentNow = now();
    const nowIso = new Date(currentNow).toISOString();
    const tokenHash = hashToken(token);

    const tokenRow = await adapter.get(
      `SELECT id, user_id, expires_at, revoked_at, replaced_by_token_id
      FROM refresh_tokens
      WHERE token_hash = ?
      LIMIT 1`,
      [tokenHash],
    );

    if (!tokenRow) {
      throw new AuthError(401, "Sessão inválida ou expirada.");
    }

    if (tokenRow.revoked_at !== null) {
      await adapter.run(
        `UPDATE refresh_tokens
        SET revoked_at = ?
        WHERE user_id = ? AND revoked_at IS NULL`,
        [nowIso, tokenRow.user_id],
      );

      throw new AuthError(
        401,
        "Sessão revogada por segurança. Faça login novamente.",
      );
    }

    const expiresAtMs = Date.parse(tokenRow.expires_at);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= currentNow) {
      throw new AuthError(401, "Sessão expirada. Faça login novamente.");
    }

    const user = await adapter.get(
      `SELECT id, name, email, role, status, created_at
      FROM users
      WHERE id = ?
      LIMIT 1`,
      [tokenRow.user_id],
    );

    if (!user) {
      throw new AuthError(401, "Sessão inválida ou expirada.");
    }

    if (user.status !== "active") {
      throw new AuthError(403, "Esta conta não está ativa para acesso.");
    }

    let newRawRefreshToken;
    let tokenRaced = false;

    try {
      await adapter.transaction(async (tx) => {
        const inserted = await insertRefreshToken(user.id, currentNow, tx);
        newRawRefreshToken = inserted.rawRefreshToken;

        const updated = await tx.run(
          `UPDATE refresh_tokens
          SET revoked_at = ?, replaced_by_token_id = ?
          WHERE id = ? AND revoked_at IS NULL`,
          [nowIso, inserted.tokenId, tokenRow.id],
        );

        if (updated.changes === 0) {
          tokenRaced = true;
          throw new AuthError(
            401,
            "Sessão revogada por segurança. Faça login novamente.",
          );
        }
      });
    } catch (error) {
      if (tokenRaced) {
        await adapter.run(
          `UPDATE refresh_tokens
          SET revoked_at = ?
          WHERE user_id = ? AND revoked_at IS NULL`,
          [nowIso, user.id],
        );
      }
      throw error;
    }

    const accessToken = signAccessToken(
      { id: user.id, role: user.role },
      config,
      currentNow,
    );

    return {
      user: toPublicUser(user),
      tokens: {
        accessToken,
        refreshToken: newRawRefreshToken,
        expiresIn: config.accessTtlSeconds,
      },
    };
  }

  async function logout(rawRefreshToken) {
    const token = extractRefreshToken(rawRefreshToken);
    if (!token) {
      return { revoked: false };
    }

    const nowIso = new Date(now()).toISOString();
    const result = await adapter.run(
      `UPDATE refresh_tokens
      SET revoked_at = ?
      WHERE token_hash = ? AND revoked_at IS NULL`,
      [nowIso, hashToken(token)],
    );

    return { revoked: result.changes > 0 };
  }

  async function getProfile(userId) {
    if (typeof userId !== "string" || userId.trim() === "") {
      return null;
    }

    const row = await adapter.get(
      `SELECT id, name, email, role, status, created_at
      FROM users
      WHERE id = ?
      LIMIT 1`,
      [userId],
    );

    return row ? toPublicUser(row) : null;
  }

  return {
    register,
    login,
    refresh,
    logout,
    getProfile,
  };
}
