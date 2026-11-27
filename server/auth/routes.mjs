import { isDatabaseAdapterError } from "../db/adapter.mjs";
import { AuthError, createAuthService } from "./authService.mjs";
import { authenticateRequest, requireRole } from "./middleware.mjs";

const DEFAULT_MAX_BODY_BYTES = 16384;

export function isDatabaseError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }
  if (isDatabaseAdapterError(error)) {
    return true;
  }
  if (typeof error.code === "string") {
    const upperCode = error.code.toUpperCase();
    if (upperCode.startsWith("ERR_SQLITE") || upperCode.startsWith("TURSO_")) {
      return true;
    }
  }
  if (typeof error.errcode === "number") {
    return true;
  }
  const message = typeof error.message === "string" ? error.message : "";
  return /(SQLITE_|database is locked|unable to open database|disk I\/O error|database is not open)/i.test(
    message,
  );
}

export async function readJsonBody(request, maxBytes = DEFAULT_MAX_BODY_BYTES) {
  if (request?.body !== undefined && request?.body !== null) {
    if (typeof request.body === "string" || Buffer.isBuffer(request.body)) {
      const byteLength = Buffer.byteLength(request.body);
      if (byteLength > maxBytes) {
        throw new AuthError(413, "Payload excede o tamanho máximo permitido.");
      }
      const rawBody = Buffer.isBuffer(request.body)
        ? request.body.toString("utf8").trim()
        : request.body.trim();
      if (rawBody === "") {
        return {};
      }
      let parsedBody;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        throw new AuthError(400, "Corpo JSON inválido.");
      }
      if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        throw new AuthError(400, "Corpo JSON inválido.");
      }
      return parsedBody;
    }

    if (typeof request.body === "object" && !Array.isArray(request.body)) {
      return request.body;
    }

    throw new AuthError(400, "Corpo JSON inválido.");
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw new AuthError(413, "Payload excede o tamanho máximo permitido.");
    }
    chunks.push(buffer);
  }

  if (totalBytes === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw === "") {
    return {};
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AuthError(400, "Corpo JSON inválido.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AuthError(400, "Corpo JSON inválido.");
  }

  return parsed;
}

function sendRouteError(response, error, sendJson) {
  if (response.headersSent) {
    return;
  }

  if (error instanceof AuthError) {
    if (error.status === 429 && error.retryAfterSeconds !== undefined) {
      response.setHeader("Retry-After", String(error.retryAfterSeconds));
    }

    const body = { error: error.message };
    if (error.fields !== undefined) {
      body.fields = error.fields;
    }
    if (error.retryAfterSeconds !== undefined) {
      body.retryAfterSeconds = error.retryAfterSeconds;
    }
    sendJson(response, error.status, body);
    return;
  }

  if (isDatabaseError(error)) {
    console.error("[TorqueLab DB]", error.code ?? error.name, error.message);
    sendJson(response, 503, {
      error: "Serviço temporariamente indisponível. Tente novamente em instantes.",
    });
    return;
  }

  sendJson(response, 500, {
    error: "Erro interno ao processar a solicitação.",
  });
}

export function createAuthRouter({
  db = null,
  getDb = null,
  config,
  now = () => Date.now(),
}) {
  let cachedDb = db;
  let cachedAuthService = db
    ? createAuthService({ db, config, now })
    : null;

  async function resolveContext() {
    if (!cachedDb) {
      if (typeof getDb !== "function") {
        throw new Error("SQLITE_UNAVAILABLE: banco de dados indisponível.");
      }
      cachedDb = await getDb();
    }
    if (!cachedAuthService) {
      cachedAuthService = createAuthService({ db: cachedDb, config, now });
    }
    return { db: cachedDb, authService: cachedAuthService };
  }

  return async function handleAuthRoute(
    request,
    response,
    pathname,
    sendJson,
  ) {
    const isAuthPath =
      pathname === "/api/auth" || pathname.startsWith("/api/auth/");
    const isAdminPath =
      pathname === "/api/admin" || pathname.startsWith("/api/admin/");

    if (!isAuthPath && !isAdminPath) {
      return false;
    }

    try {
      const { db: activeDb, authService } = await resolveContext();

      if (isAuthPath) {
        switch (pathname) {
          case "/api/auth/register": {
            if (request.method !== "POST") {
              sendJson(response, 405, { error: "Método não permitido." });
              return true;
            }
            const body = await readJsonBody(request);
            const session = await authService.register(body);
            sendJson(response, 201, session);
            return true;
          }

          case "/api/auth/login": {
            if (request.method !== "POST") {
              sendJson(response, 405, { error: "Método não permitido." });
              return true;
            }
            const body = await readJsonBody(request);
            const ip = request.socket?.remoteAddress ?? "unknown";
            const session = await authService.login(body, { ip });
            sendJson(response, 200, session);
            return true;
          }

          case "/api/auth/refresh": {
            if (request.method !== "POST") {
              sendJson(response, 405, { error: "Método não permitido." });
              return true;
            }
            const body = await readJsonBody(request);
            const session = await authService.refresh(body.refreshToken);
            sendJson(response, 200, session);
            return true;
          }

          case "/api/auth/logout": {
            if (request.method !== "POST") {
              sendJson(response, 405, { error: "Método não permitido." });
              return true;
            }
            const body = await readJsonBody(request);
            await authService.logout(body.refreshToken);
            response.writeHead(204, { "Cache-Control": "no-store" });
            response.end();
            return true;
          }

          case "/api/auth/me": {
            if (request.method !== "GET") {
              sendJson(response, 405, { error: "Método não permitido." });
              return true;
            }
            const user = await authenticateRequest(request, {
              db: activeDb,
              config,
              now,
            });
            sendJson(response, 200, { user });
            return true;
          }

          default: {
            sendJson(response, 404, {
              error: "Rota de autenticação não encontrada.",
            });
            return true;
          }
        }
      }

      // Prefixo /api/admin/* — exige autenticação + papel admin em qualquer rota
      const authUser = await authenticateRequest(request, {
        db: activeDb,
        config,
        now,
      });
      requireRole(authUser, "admin");

      if (pathname === "/api/admin/health") {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Método não permitido." });
          return true;
        }
        sendJson(response, 200, {
          status: "ok",
          role: "admin",
          user: authUser,
        });
        return true;
      }

      sendJson(response, 404, {
        error: "Rota administrativa não encontrada.",
      });
      return true;
    } catch (error) {
      sendRouteError(response, error, sendJson);
      return true;
    }
  };
}
