import {
  createMemoryTokenStorage,
  type TokenStorage,
} from "./tokenStorageCore";
import type {
  AuthApiError,
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UserRole,
  UserStatus,
} from "./types";

export const DEFAULT_API_BASE_URL = "http://localhost:3001";
export const DEFAULT_AUTH_TIMEOUT_MS = 10_000;

const TIMEOUT_ERROR_MESSAGE =
  "Tempo esgotado ao conectar ao servidor. Tente novamente.";
const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
const SESSION_EXPIRED_MESSAGE = "Sessão expirada. Faça login novamente.";

export type AuthClientErrorOptions = {
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
  isTimeout?: boolean;
  isNetworkError?: boolean;
};

export class AuthClientError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly retryAfterSeconds?: number;
  readonly isTimeout?: boolean;
  readonly isNetworkError?: boolean;

  constructor(
    status: number,
    message: string,
    options: AuthClientErrorOptions = {}
  ) {
    super(message);
    this.name = "AuthClientError";
    this.status = status;
    if (options.fields !== undefined) {
      this.fields = options.fields;
    }
    if (options.retryAfterSeconds !== undefined) {
      this.retryAfterSeconds = options.retryAfterSeconds;
    }
    if (options.isTimeout !== undefined) {
      this.isTimeout = options.isTimeout;
    }
    if (options.isNetworkError !== undefined) {
      this.isNetworkError = options.isNetworkError;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toApiError(): AuthApiError {
    return {
      status: this.status,
      error: this.message,
      ...(this.fields !== undefined ? { fields: this.fields } : {}),
      ...(this.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: this.retryAfterSeconds }
        : {}),
    };
  }
}

export type AuthClientOptions = {
  baseUrl?: string;
  tokenStorage?: TokenStorage;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  onSessionExpired?: () => void;
};

export interface AuthClient {
  register(payload: RegisterPayload): Promise<AuthSession>;
  login(payload: LoginPayload): Promise<AuthSession>;
  refreshSession(): Promise<AuthSession>;
  logout(): Promise<void>;
  authenticatedFetch(path: string, init?: RequestInit): Promise<Response>;
  getMe(): Promise<AuthUser>;
  getStoredTokens(): Promise<AuthTokens | null>;
}

function normalizeBaseUrl(rawUrl: string | undefined): string {
  const trimmed = typeof rawUrl === "string" ? rawUrl.trim() : "";
  const candidate = trimmed.length > 0 ? trimmed : DEFAULT_API_BASE_URL;
  return candidate.replace(/\/+$/, "");
}

export function resolveDefaultApiBaseUrl(): string {
  const envUrl =
    typeof process !== "undefined" && process.env
      ? process.env.EXPO_PUBLIC_API_BASE_URL
      : undefined;
  return normalizeBaseUrl(envUrl);
}

function buildRequestUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function isValidRole(value: unknown): value is UserRole {
  return value === "user" || value === "admin";
}

function isValidStatus(value: unknown): value is UserStatus {
  return value === "active" || value === "inactive" || value === "blocked";
}

function isValidAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.email === "string" &&
    isValidRole(record.role) &&
    isValidStatus(record.status) &&
    typeof record.createdAt === "string"
  );
}

function isValidAuthTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.accessToken === "string" &&
    record.accessToken.trim().length > 0 &&
    typeof record.refreshToken === "string" &&
    record.refreshToken.trim().length > 0 &&
    typeof record.expiresIn === "number" &&
    Number.isFinite(record.expiresIn) &&
    record.expiresIn >= 0
  );
}

function isValidAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isValidAuthUser(record.user) && isValidAuthTokens(record.tokens);
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    if (!text.trim()) {
      return null;
    }
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function extractFields(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, item]) => typeof item === "string"
  ) as [string, string][];

  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

function defaultStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return "Dados inválidos. Verifique os campos informados.";
    case 401:
      return SESSION_EXPIRED_MESSAGE;
    case 403:
      return "Permissão insuficiente para esta operação.";
    case 409:
      return "Conflito ao processar a solicitação.";
    case 429:
      return "Muitas tentativas. Tente novamente em instantes.";
    case 503:
      return "Serviço temporariamente indisponível. Tente novamente em instantes.";
    default:
      return "Não foi possível concluir a solicitação. Tente novamente.";
  }
}

async function parseErrorResponse(response: Response): Promise<AuthClientError> {
  const payload = await parseJsonSafely(response);
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  const message =
    record && typeof record.error === "string" && record.error.trim().length > 0
      ? record.error.trim()
      : defaultStatusMessage(response.status);

  const fields = record ? extractFields(record.fields) : undefined;

  let retryAfterSeconds: number | undefined;
  if (
    record &&
    typeof record.retryAfterSeconds === "number" &&
    Number.isFinite(record.retryAfterSeconds) &&
    record.retryAfterSeconds >= 0
  ) {
    retryAfterSeconds = record.retryAfterSeconds;
  } else {
    const retryHeader = response.headers?.get?.("retry-after");
    if (retryHeader) {
      const parsedHeader = Number(retryHeader);
      if (Number.isFinite(parsedHeader) && parsedHeader >= 0) {
        retryAfterSeconds = parsedHeader;
      }
    }
  }

  return new AuthClientError(response.status, message, {
    fields,
    retryAfterSeconds,
  });
}

async function parseAuthSessionResponse(
  response: Response
): Promise<AuthSession> {
  const payload = await parseJsonSafely(response);
  if (!isValidAuthSession(payload)) {
    throw new AuthClientError(
      500,
      "Resposta inválida do servidor de autenticação."
    );
  }
  return payload;
}

export function createAuthClient(options: AuthClientOptions = {}): AuthClient {
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? resolveDefaultApiBaseUrl()
  );
  const tokenStorage = options.tokenStorage ?? createMemoryTokenStorage();
  const timeoutMs =
    typeof options.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_AUTH_TIMEOUT_MS;
  const onSessionExpired = options.onSessionExpired;

  let inflightRefresh: Promise<AuthSession> | null = null;
  let sessionEpoch = 0;

  async function runFetch(
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const fetchFn =
      options.fetchImpl ??
      ((input: RequestInfo | URL, reqInit?: RequestInit) => {
        if (typeof globalThis.fetch !== "function") {
          return Promise.reject(
            new AuthClientError(0, NETWORK_ERROR_MESSAGE, {
              isNetworkError: true,
            })
          );
        }
        return globalThis.fetch(input, reqInit);
      });

    const controller = new AbortController();
    let timedOut = false;

    const externalSignal = init.signal;
    const handleExternalAbort = () => {
      controller.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener("abort", handleExternalAbort, {
          once: true,
        });
      }
    }

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      return await fetchFn(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof AuthClientError) {
        throw error;
      }
      if (timedOut) {
        throw new AuthClientError(0, TIMEOUT_ERROR_MESSAGE, {
          isTimeout: true,
        });
      }
      throw new AuthClientError(0, NETWORK_ERROR_MESSAGE, {
        isNetworkError: true,
      });
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", handleExternalAbort);
      }
    }
  }

  async function notifySessionExpired(): Promise<void> {
    await tokenStorage.clearTokens();
    onSessionExpired?.();
  }

  async function register(payload: RegisterPayload): Promise<AuthSession> {
    const response = await runFetch(
      buildRequestUrl(baseUrl, "/api/auth/register"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    const session = await parseAuthSessionResponse(response);
    sessionEpoch += 1;
    await tokenStorage.saveTokens(session.tokens);
    return session;
  }

  async function login(payload: LoginPayload): Promise<AuthSession> {
    const response = await runFetch(
      buildRequestUrl(baseUrl, "/api/auth/login"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    const session = await parseAuthSessionResponse(response);
    sessionEpoch += 1;
    await tokenStorage.saveTokens(session.tokens);
    return session;
  }

  async function executeRefresh(): Promise<AuthSession> {
    const epochAtStart = sessionEpoch;
    let expirationHandled = false;

    const handleFailure = async () => {
      if (expirationHandled || sessionEpoch !== epochAtStart) {
        return;
      }
      expirationHandled = true;
      await notifySessionExpired();
    };

    const currentTokens = await tokenStorage.getTokens();
    const refreshToken = currentTokens?.refreshToken?.trim();

    if (!refreshToken) {
      await handleFailure();
      throw new AuthClientError(401, SESSION_EXPIRED_MESSAGE);
    }

    try {
      const response = await runFetch(
        buildRequestUrl(baseUrl, "/api/auth/refresh"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      const session = await parseAuthSessionResponse(response);
      if (sessionEpoch !== epochAtStart) {
        throw new AuthClientError(401, SESSION_EXPIRED_MESSAGE);
      }

      await tokenStorage.saveTokens(session.tokens);
      return session;
    } catch (error) {
      await handleFailure();
      throw error;
    }
  }

  async function refreshSession(): Promise<AuthSession> {
    if (inflightRefresh) {
      return inflightRefresh;
    }

    const refreshPromise = executeRefresh();
    inflightRefresh = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      if (inflightRefresh === refreshPromise) {
        inflightRefresh = null;
      }
    }
  }

  async function logout(): Promise<void> {
    sessionEpoch += 1;
    inflightRefresh = null;

    const currentTokens = await tokenStorage.getTokens();
    const refreshToken = currentTokens?.refreshToken?.trim();

    try {
      if (refreshToken) {
        await runFetch(buildRequestUrl(baseUrl, "/api/auth/logout"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Tolerate network/timeout failures during logout and still clear local tokens.
    } finally {
      await tokenStorage.clearTokens();
    }
  }

  function withBearerHeader(
    init: RequestInit | undefined,
    accessToken: string
  ): RequestInit {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return {
      ...init,
      headers,
    };
  }

  async function refreshOrThrowUnauthorized(): Promise<AuthSession> {
    try {
      return await refreshSession();
    } catch (error) {
      if (error instanceof AuthClientError) {
        if (error.status === 401 || error.status === 403) {
          throw error;
        }
        throw new AuthClientError(401, error.message || SESSION_EXPIRED_MESSAGE, {
          fields: error.fields,
          retryAfterSeconds: error.retryAfterSeconds,
          isTimeout: error.isTimeout,
          isNetworkError: error.isNetworkError,
        });
      }
      throw new AuthClientError(401, SESSION_EXPIRED_MESSAGE);
    }
  }

  async function authenticatedFetch(
    path: string,
    init?: RequestInit
  ): Promise<Response> {
    const url = buildRequestUrl(baseUrl, path);
    const currentTokens = await tokenStorage.getTokens();
    const accessToken = currentTokens?.accessToken?.trim();

    if (!accessToken) {
      if (currentTokens?.refreshToken?.trim()) {
        const refreshed = await refreshOrThrowUnauthorized();
        return runFetch(url, withBearerHeader(init, refreshed.tokens.accessToken));
      }

      await notifySessionExpired();
      throw new AuthClientError(401, SESSION_EXPIRED_MESSAGE);
    }

    const response = await runFetch(url, withBearerHeader(init, accessToken));
    if (response.status !== 401) {
      return response;
    }

    const refreshed = await refreshOrThrowUnauthorized();
    return runFetch(url, withBearerHeader(init, refreshed.tokens.accessToken));
  }

  async function getMe(): Promise<AuthUser> {
    const response = await authenticatedFetch("/api/auth/me", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    const payload = await parseJsonSafely(response);
    if (
      !payload ||
      typeof payload !== "object" ||
      !("user" in payload) ||
      !isValidAuthUser((payload as { user?: unknown }).user)
    ) {
      throw new AuthClientError(
        500,
        "Resposta inválida ao carregar perfil do usuário."
      );
    }

    return (payload as { user: AuthUser }).user;
  }

  async function getStoredTokens(): Promise<AuthTokens | null> {
    return tokenStorage.getTokens();
  }

  return {
    register,
    login,
    refreshSession,
    logout,
    authenticatedFetch,
    getMe,
    getStoredTokens,
  };
}
