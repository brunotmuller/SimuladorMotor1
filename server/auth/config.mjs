const DEV_FALLBACK_JWT_SECRET =
  "torquelab-dev-fallback-jwt-secret-do-not-use-in-production-2026";

export const DEFAULT_DB_PATH = "./data/torquelab.sqlite";
export const DEFAULT_ACCESS_TTL_SECONDS = 900;
export const DEFAULT_REFRESH_TTL_SECONDS = 604800;
export const MIN_JWT_SECRET_LENGTH = 32;

function parsePositiveInteger(rawValue, defaultValue, variableName) {
  if (rawValue === undefined || rawValue === null) {
    return defaultValue;
  }

  const normalized = String(rawValue).trim();
  if (normalized === "") {
    return defaultValue;
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      `Configuração inválida: ${variableName} deve ser um número inteiro positivo.`,
    );
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Configuração inválida: ${variableName} deve ser um número inteiro positivo.`,
    );
  }

  return parsed;
}

export function loadAuthConfig(env = process.env) {
  const source = env ?? {};
  const nodeEnv =
    typeof source.NODE_ENV === "string" && source.NODE_ENV.trim() !== ""
      ? source.NODE_ENV.trim()
      : "development";
  const isProduction = nodeEnv === "production";

  const rawJwtSecret =
    typeof source.AUTH_JWT_SECRET === "string"
      ? source.AUTH_JWT_SECRET.trim()
      : "";

  let jwtSecret;
  let isUsingDevFallbackSecret = false;

  if (isProduction) {
    if (!rawJwtSecret || rawJwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `Configuração inválida: AUTH_JWT_SECRET é obrigatório em produção e deve ter no mínimo ${MIN_JWT_SECRET_LENGTH} caracteres.`,
      );
    }
    jwtSecret = rawJwtSecret;
  } else if (rawJwtSecret) {
    jwtSecret = rawJwtSecret;
  } else {
    jwtSecret = DEV_FALLBACK_JWT_SECRET;
    isUsingDevFallbackSecret = true;
  }

  const dbPath =
    typeof source.AUTH_DB_PATH === "string" && source.AUTH_DB_PATH.trim() !== ""
      ? source.AUTH_DB_PATH.trim()
      : DEFAULT_DB_PATH;

  const accessTtlSeconds = parsePositiveInteger(
    source.AUTH_ACCESS_TTL_SECONDS,
    DEFAULT_ACCESS_TTL_SECONDS,
    "AUTH_ACCESS_TTL_SECONDS",
  );

  const refreshTtlSeconds = parsePositiveInteger(
    source.AUTH_REFRESH_TTL_SECONDS,
    DEFAULT_REFRESH_TTL_SECONDS,
    "AUTH_REFRESH_TTL_SECONDS",
  );

  const adminSeedEmail =
    typeof source.ADMIN_SEED_EMAIL === "string" &&
    source.ADMIN_SEED_EMAIL.trim() !== ""
      ? source.ADMIN_SEED_EMAIL.trim().toLowerCase()
      : null;

  const adminSeedPassword =
    typeof source.ADMIN_SEED_PASSWORD === "string" &&
    source.ADMIN_SEED_PASSWORD.trim() !== ""
      ? source.ADMIN_SEED_PASSWORD
      : null;

  return Object.freeze({
    nodeEnv,
    jwtSecret,
    isUsingDevFallbackSecret,
    dbPath,
    accessTtlSeconds,
    refreshTtlSeconds,
    adminSeedEmail,
    adminSeedPassword,
  });
}
