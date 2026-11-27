import { ensureDatabaseAdapter } from "../db/adapter.mjs";
import { AuthError, toPublicUser } from "./authService.mjs";
import { verifyAccessToken } from "./crypto.mjs";

const BEARER_RE = /^Bearer\s+([^\s]+)$/i;

export function extractBearerToken(request) {
  const header =
    request?.headers?.authorization ?? request?.headers?.Authorization;
  if (typeof header !== "string") {
    return null;
  }

  const match = BEARER_RE.exec(header.trim());
  return match ? match[1] : null;
}

export async function authenticateRequest(
  request,
  { db, config, now = () => Date.now() },
) {
  const token = extractBearerToken(request);
  if (!token) {
    throw new AuthError(401, "Autenticação necessária ou sessão expirada.");
  }

  const payload = verifyAccessToken(token, config, now());
  if (!payload) {
    throw new AuthError(401, "Autenticação necessária ou sessão expirada.");
  }

  const adapter = ensureDatabaseAdapter(db);
  const userRow = await adapter.get(
    `SELECT id, name, email, role, status, created_at
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [payload.sub],
  );

  if (!userRow) {
    throw new AuthError(401, "Autenticação necessária ou sessão expirada.");
  }

  if (userRow.status !== "active") {
    throw new AuthError(403, "Esta conta não está ativa para acesso.");
  }

  return toPublicUser(userRow);
}

export function requireRole(authUser, expectedRole) {
  if (!authUser || authUser.role !== expectedRole) {
    throw new AuthError(403, "Permissão insuficiente para acessar este recurso.");
  }
}
