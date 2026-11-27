import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createAdminRouter } from "./admin/routes.mjs";
import { loadAuthConfig } from "./auth/config.mjs";
import { hashPassword } from "./auth/crypto.mjs";
import {
  initializeAuthDatabase,
  openAuthDatabase,
  promoteConfiguredAdmin,
  seedInitialAdmin,
} from "./auth/db.mjs";
import { createAuthRouter, isDatabaseError } from "./auth/routes.mjs";
import { createDashboardRouter } from "./dashboard/routes.mjs";
import { fetchFalconImage, fetchFalconPlate } from "./falcon.mjs";
import { createStaticWebHandler } from "./static.mjs";

const port = Number(process.env.PORT || process.env.API_PORT || 3001);
const host = process.env.API_HOST?.trim() || "0.0.0.0";

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function parseAllowedOrigins(rawOrigins) {
  if (rawOrigins instanceof Set) {
    return rawOrigins;
  }
  if (Array.isArray(rawOrigins)) {
    return new Set(rawOrigins.map((value) => String(value).trim()).filter(Boolean));
  }
  const source =
    typeof rawOrigins === "string"
      ? rawOrigins
      : (process.env.ALLOWED_ORIGINS ??
        "http://localhost:8081,http://127.0.0.1:8081");
  return new Set(
    source
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function isOriginAllowed(origin, request, origins, allowLocalDevOrigins) {
  if (!origin) return true;
  if (origins.has(origin)) return true;

  // Aceita apenas domínios HTTPS do projeto TorqueLab na Vercel,
  // incluindo URLs únicas de implantação e o domínio estável.
  try {
    const parsedOrigin = new URL(origin);
    if (
      parsedOrigin.protocol === "https:" &&
      (parsedOrigin.hostname === "torquelab.vercel.app" ||
        /^torquelab-[a-z0-9-]+\.vercel\.app$/i.test(parsedOrigin.hostname))
    ) {
      return true;
    }
  } catch {
    // Origem inválida será rejeitada abaixo.
  }

  const reqHost = request.headers?.["x-forwarded-host"] ?? request.headers?.host;
  const normalizedHost = Array.isArray(reqHost) ? reqHost[0] : reqHost;
  if (
    typeof normalizedHost === "string" &&
    normalizedHost.trim() !== "" &&
    (origin === `http://${normalizedHost.trim()}` ||
      origin === `https://${normalizedHost.trim()}`)
  ) {
    return true;
  }

  if (
    allowLocalDevOrigins &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  ) {
    return true;
  }

  return false;
}

export function createRequestHandler({
  authDb = null,
  authConfig = null,
  env = process.env,
  createLibsqlClient,
  now = () => Date.now(),
  allowedOrigins = null,
  falconToken = null,
  serveWebDist = process.env.SERVE_WEB_DIST === "true",
  webDistDir = process.env.WEB_DIST_DIR || resolve(process.cwd(), "dist"),
  webBasePath = process.env.WEB_BASE_PATH || "/",
} = {}) {
  const token =
    falconToken !== null ? falconToken : env?.FALCON_API_TOKEN?.trim();
  const origins = parseAllowedOrigins(allowedOrigins);
  const config = authConfig ?? loadAuthConfig(env);
  const allowLocalDevOrigins =
    allowedOrigins === null && config.nodeEnv !== "production";
  const attempts = new Map();

  let ownedDb = null;
  let activeDb = authDb;
  let initPromise = null;

  async function ensureAuthDb() {
    if (!initPromise) {
      initPromise = (async () => {
        if (!activeDb) {
          const targetPath =
            config.nodeEnv === "test" && !env?.AUTH_DB_PATH
              ? ":memory:"
              : config.dbPath;
          ownedDb = await openAuthDatabase({
            env,
            dbPath: targetPath,
            createLibsqlClient,
          });
          activeDb = ownedDb;
        } else {
          activeDb = await initializeAuthDatabase(activeDb);
        }

        await seedInitialAdmin(activeDb, config, hashPassword);
        const promotion = await promoteConfiguredAdmin(
          activeDb,
          env?.ADMIN_PROMOTE_EMAIL,
        );
        if (promotion.promoted) {
          console.log(`Conta administrativa habilitada: ${promotion.email}`);
        } else if (promotion.reason === "user_not_found") {
          console.warn(
            `Conta para promoção administrativa não encontrada: ${promotion.email}`,
          );
        }

        return activeDb;
      })().catch((err) => {
        initPromise = null;
        throw err;
      });
    }

    return initPromise;
  }

  const handleAdminRoute = createAdminRouter({
    getDb: ensureAuthDb,
    config,
    now,
  });

  const handleAuthRoute = createAuthRouter({
    getDb: ensureAuthDb,
    config,
    now,
  });

  const handleDashboardRoute = createDashboardRouter({
    getDb: ensureAuthDb,
    config,
    now,
  });

  const handleStaticWeb = serveWebDist
    ? createStaticWebHandler({ distDir: webDistDir, basePath: webBasePath })
    : null;

  function limited(address) {
    const currentNow = now();
    const previous = attempts.get(address);
    const entry =
      !previous || currentNow - previous.since > 60_000
        ? { since: currentNow, count: 0 }
        : previous;
    entry.count += 1;
    attempts.set(address, entry);
    return entry.count > 30;
  }

  const requestHandler = async (request, response) => {
    try {
      const origin = request.headers.origin;
      if (origin && !isOriginAllowed(origin, request, origins, allowLocalDevOrigins)) {
        return json(response, 403, { error: "Origem não permitida." });
      }
      if (origin) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Vary", "Origin");
        response.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        );
        response.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization",
        );
        response.setHeader("Access-Control-Allow-Credentials", "true");
      }
      if (request.method === "OPTIONS") {
        return response.writeHead(204).end();
      }

      const urlObj = new URL(request.url ?? "/", "http://localhost");
      const path = urlObj.pathname;

      if (path === "/api/health") {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return json(response, 405, { error: "Método não permitido." });
        }
        return json(response, 200, { status: "ok" });
      }

      const handledByAdmin = await handleAdminRoute(
        request,
        response,
        urlObj,
        json,
      );
      if (handledByAdmin) {
        return;
      }

      const handledByAuth = await handleAuthRoute(request, response, path, json);
      if (handledByAuth) {
        return;
      }

      const handledByDashboard = await handleDashboardRoute(
        request,
        response,
        urlObj,
        json,
      );
      if (handledByDashboard) {
        return;
      }

      if (handleStaticWeb && handleStaticWeb(request, response, path)) {
        return;
      }

      if (request.method !== "GET") {
        return json(response, 405, { error: "Método não permitido." });
      }

      const match = /^\/api\/vehicles\/([^/]+)(\/image)?$/.exec(path);
      if (!match) {
        return json(response, 404, { error: "Rota não encontrada." });
      }
      if (limited(request.socket?.remoteAddress ?? "unknown")) {
        return json(response, 429, {
          error: "Muitas consultas. Tente novamente em um minuto.",
        });
      }
      let plate;
      try {
        plate = decodeURIComponent(match[1]);
      } catch {
        return json(response, 400, { error: "Placa inválida." });
      }

      if (match[2]) {
        const result = await fetchFalconImage(plate, token);
        if (result.status !== 200) {
          return json(response, result.status, {
            error: "Imagem indisponível.",
          });
        }
        response.writeHead(200, {
          "Content-Type": result.contentType,
          "Cache-Control": "private, max-age=60",
        });
        return response.end(result.bytes);
      }
      const result = await fetchFalconPlate(plate, token);
      return json(response, result.status, result.body);
    } catch (error) {
      if (response.headersSent) {
        return;
      }
      if (isDatabaseError(error)) {
        console.error("[TorqueLab DB]", error.code ?? error.name, error.message);
        return json(response, 503, {
          error:
            "Serviço temporariamente indisponível. Tente novamente em instantes.",
        });
      }
      return json(response, 500, {
        error: "Erro interno ao processar a solicitação.",
      });
    }
  };

  requestHandler.initAuth = ensureAuthDb;
  requestHandler.closeDb = async () => {
    if (ownedDb) {
      try {
        await ownedDb.close();
      } catch {
        // Ignore close errors during shutdown.
      }
      ownedDb = null;
      activeDb = null;
      initPromise = null;
    }
  };

  return requestHandler;
}

export function createAppServer(options = {}) {
  const requestHandler = createRequestHandler(options);
  const appServer = createServer(requestHandler);

  appServer.on("close", () => {
    void requestHandler.closeDb();
  });

  appServer.initAuth = requestHandler.initAuth;
  return appServer;
}

export const server = createAppServer();

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await server.initAuth();
  server.listen(port, host, () => {
    const mode =
      process.env.SERVE_WEB_DIST === "true"
        ? "API + Frontend Web"
        : "API TorqueLab";
    console.log(`${mode} rodando em http://${host}:${port}`);
  });
}
