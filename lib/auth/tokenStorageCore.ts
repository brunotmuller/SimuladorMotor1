import type { AuthTokens } from "./types";

export const AUTH_TOKENS_STORAGE_KEY = "torquelab-auth-tokens-v1";

export interface TokenStorage {
  getTokens(): Promise<AuthTokens | null>;
  saveTokens(tokens: AuthTokens): Promise<void>;
  clearTokens(): Promise<void>;
}

export interface KeyValueTokenAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

function isValidStoredTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.accessToken !== "string" ||
    typeof record.refreshToken !== "string" ||
    typeof record.expiresIn !== "number" ||
    !Number.isFinite(record.expiresIn) ||
    record.expiresIn < 0
  ) {
    return false;
  }

  return (
    record.accessToken.trim().length > 0 ||
    record.refreshToken.trim().length > 0
  );
}

export function serializeAuthTokens(tokens: AuthTokens): string {
  const normalized: AuthTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  };
  return JSON.stringify(normalized);
}

export function parseAuthTokens(raw: string | null | undefined): AuthTokens | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredTokens(parsed)) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresIn: parsed.expiresIn,
    };
  } catch {
    return null;
  }
}

export function createKeyValueTokenStorage(
  adapter: KeyValueTokenAdapter,
  storageKey: string = AUTH_TOKENS_STORAGE_KEY
): TokenStorage {
  return {
    async getTokens(): Promise<AuthTokens | null> {
      try {
        const raw = await adapter.getItem(storageKey);
        return parseAuthTokens(raw);
      } catch {
        return null;
      }
    },

    async saveTokens(tokens: AuthTokens): Promise<void> {
      try {
        await adapter.setItem(storageKey, serializeAuthTokens(tokens));
      } catch {
        // Ignore storage write failures without leaking token payloads in logs.
      }
    },

    async clearTokens(): Promise<void> {
      try {
        await adapter.removeItem(storageKey);
      } catch {
        // Ignore storage removal failures.
      }
    },
  };
}

export function createMemoryTokenStorage(
  initialTokens: AuthTokens | null = null
): TokenStorage {
  let stored: AuthTokens | null = initialTokens ? { ...initialTokens } : null;

  return {
    async getTokens(): Promise<AuthTokens | null> {
      return stored ? { ...stored } : null;
    },

    async saveTokens(tokens: AuthTokens): Promise<void> {
      stored = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    },

    async clearTokens(): Promise<void> {
      stored = null;
    },
  };
}
