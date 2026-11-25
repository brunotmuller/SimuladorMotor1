import {
  argon2Sync,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ARGON2_MEMORY_KIB = 65536; // 64 MiB
const ARGON2_PASSES = 3;
const ARGON2_PARALLELISM = 1;
const ARGON2_TAG_LENGTH = 32;
const ARGON2_SALT_BYTES = 16;

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const ARGON2_PARAMS_RE = /^m=(\d+),t=(\d+),p=(\d+)$/;

function encodeBase64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeBase64UrlJson(segment) {
  if (typeof segment !== "string" || !BASE64URL_RE.test(segment)) {
    return null;
  }
  try {
    const raw = Buffer.from(segment, "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hashPassword(plain) {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new TypeError("A senha deve ser uma string não vazia.");
  }

  const nonce = randomBytes(ARGON2_SALT_BYTES);
  const derived = argon2Sync("argon2id", {
    message: plain,
    nonce,
    memory: ARGON2_MEMORY_KIB,
    passes: ARGON2_PASSES,
    parallelism: ARGON2_PARALLELISM,
    tagLength: ARGON2_TAG_LENGTH,
  });

  return `$argon2id$m=${ARGON2_MEMORY_KIB},t=${ARGON2_PASSES},p=${ARGON2_PARALLELISM}$${nonce.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(plain, storedHash) {
  if (typeof plain !== "string" || typeof storedHash !== "string") {
    return false;
  }

  try {
    const parts = storedHash.split("$");
    if (parts.length !== 5 || parts[0] !== "" || parts[1] !== "argon2id") {
      return false;
    }

    const paramsMatch = ARGON2_PARAMS_RE.exec(parts[2]);
    if (!paramsMatch) {
      return false;
    }

    const memory = Number(paramsMatch[1]);
    const passes = Number(paramsMatch[2]);
    const parallelism = Number(paramsMatch[3]);

    if (
      !Number.isSafeInteger(memory) ||
      memory < 8 ||
      memory > 524288 ||
      !Number.isSafeInteger(passes) ||
      passes < 1 ||
      passes > 20 ||
      !Number.isSafeInteger(parallelism) ||
      parallelism < 1 ||
      parallelism > 16
    ) {
      return false;
    }

    const saltSegment = parts[3];
    const hashSegment = parts[4];
    if (!BASE64URL_RE.test(saltSegment) || !BASE64URL_RE.test(hashSegment)) {
      return false;
    }

    const nonce = Buffer.from(saltSegment, "base64url");
    const expectedHash = Buffer.from(hashSegment, "base64url");

    if (
      nonce.length < 8 ||
      expectedHash.length < 16 ||
      expectedHash.length > 64
    ) {
      return false;
    }

    const derived = argon2Sync("argon2id", {
      message: plain,
      nonce,
      memory,
      passes,
      parallelism,
      tagLength: expectedHash.length,
    });

    if (derived.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(derived, expectedHash);
  } catch {
    return false;
  }
}

export function signAccessToken(user, config, nowMs = Date.now()) {
  if (!user || typeof user.id !== "string" || user.id.trim() === "") {
    throw new TypeError("Usuário inválido para emissão de token.");
  }
  if (user.role !== "user" && user.role !== "admin") {
    throw new TypeError("Papel de usuário inválido para emissão de token.");
  }
  if (
    !config ||
    typeof config.jwtSecret !== "string" ||
    config.jwtSecret.length === 0
  ) {
    throw new TypeError("Configuração JWT inválida.");
  }

  const ttlSeconds =
    Number.isSafeInteger(config.accessTtlSeconds) && config.accessTtlSeconds > 0
      ? config.accessTtlSeconds
      : 900;

  const iat = Math.floor(nowMs / 1000);
  const exp = iat + ttlSeconds;

  const encodedHeader = encodeBase64UrlJson({ alg: "HS256", typ: "JWT" });
  const encodedPayload = encodeBase64UrlJson({
    sub: user.id,
    role: user.role,
    iat,
    exp,
  });

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", config.jwtSecret)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

export function verifyAccessToken(token, config, nowMs = Date.now()) {
  if (
    typeof token !== "string" ||
    !config ||
    typeof config.jwtSecret !== "string" ||
    config.jwtSecret.length === 0
  ) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (
    !BASE64URL_RE.test(encodedHeader) ||
    !BASE64URL_RE.test(encodedPayload) ||
    !BASE64URL_RE.test(encodedSignature)
  ) {
    return null;
  }

  const header = decodeBase64UrlJson(encodedHeader);
  if (!header || header.alg !== "HS256") {
    return null;
  }
  if (header.typ !== undefined && header.typ !== "JWT") {
    return null;
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", config.jwtSecret)
    .update(signingInput)
    .digest();
  const providedSignature = Buffer.from(encodedSignature, "base64url");

  if (
    providedSignature.length !== expectedSignature.length ||
    providedSignature.toString("base64url") !== encodedSignature ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  const payload = decodeBase64UrlJson(encodedPayload);
  if (!payload) {
    return null;
  }

  if (
    typeof payload.sub !== "string" ||
    payload.sub.trim() === "" ||
    (payload.role !== "user" && payload.role !== "admin") ||
    typeof payload.iat !== "number" ||
    !Number.isFinite(payload.iat) ||
    typeof payload.exp !== "number" ||
    !Number.isFinite(payload.exp)
  ) {
    return null;
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  if (!(payload.exp > nowSeconds)) {
    return null;
  }

  return {
    sub: payload.sub,
    role: payload.role,
    iat: payload.iat,
    exp: payload.exp,
  };
}

export function generateRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashToken(rawToken) {
  if (typeof rawToken !== "string" || rawToken.length === 0) {
    throw new TypeError("Token inválido para geração de hash.");
  }

  return createHash("sha256").update(rawToken).digest("hex");
}
