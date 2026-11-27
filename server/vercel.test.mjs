import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import vercelHandler from "../api/[...route].mjs";
import { loadAuthConfig } from "./auth/config.mjs";
import { createRequestHandler } from "./index.mjs";

function createMockResponse() {
  const headers = new Map();
  let resolveDone;
  const done = new Promise((res) => {
    resolveDone = res;
  });

  const response = {
    statusCode: 200,
    headersSent: false,
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), value);
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
    writeHead(status, extraHeaders = {}) {
      this.statusCode = status;
      for (const [key, value] of Object.entries(extraHeaders)) {
        headers.set(String(key).toLowerCase(), value);
      }
      this.headersSent = true;
      return this;
    },
    end(chunk = "") {
      this.headersSent = true;
      const body =
        Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk ?? "");
      let json = null;
      if (body.trim()) {
        try {
          json = JSON.parse(body);
        } catch {
          json = null;
        }
      }
      resolveDone({
        status: this.statusCode,
        headers: Object.fromEntries(headers.entries()),
        body,
        json,
      });
    },
  };

  return { response, done };
}

async function invokeHandler(handler, { method = "GET", url, headers = {}, body } = {}) {
  const { response, done } = createMockResponse();
  const request = {
    method,
    url,
    headers,
    ...(body !== undefined ? { body } : {}),
    socket: { remoteAddress: "127.0.0.1" },
  };
  await handler(request, response);
  return done;
}

function createInMemoryLibsqlFactory() {
  const backingDb = new DatabaseSync(":memory:");
  backingDb.exec("PRAGMA foreign_keys = ON;");

  function wrapExecutor(db) {
    return {
      async execute(input) {
        const sql = typeof input === "string" ? input : input.sql;
        const args = typeof input === "string" ? [] : (input.args ?? []);
        const stmt = db.prepare(sql);
        const trimmed = sql.trim().toUpperCase();
        if (
          trimmed.startsWith("SELECT") ||
          trimmed.startsWith("PRAGMA") ||
          trimmed.startsWith("WITH")
        ) {
          return { rows: stmt.all(...args), rowsAffected: 0, lastInsertRowid: null };
        }
        const res = stmt.run(...args);
        return {
          rows: [],
          rowsAffected: Number(res?.changes ?? 0),
          lastInsertRowid: res?.lastInsertRowid ?? null,
        };
      },
    };
  }

  const factory = () => ({
    ...wrapExecutor(backingDb),
    async executeMultiple(sql) {
      backingDb.exec(sql);
    },
    async transaction() {
      backingDb.exec("BEGIN");
      return {
        ...wrapExecutor(backingDb),
        async commit() {
          backingDb.exec("COMMIT");
        },
        async rollback() {
          backingDb.exec("ROLLBACK");
        },
        async close() {},
      };
    },
    async close() {},
  });

  return { factory, backingDb };
}

test("Cenário 1 (Deploy Unificado Same-Origin na Vercel): produção e preview funcionam sem erro CORS", async () => {
  const config = loadAuthConfig({
    NODE_ENV: "test",
    AUTH_JWT_SECRET: "vercel-test-secret-with-at-least-thirty-two-chars-123",
    AUTH_DB_PATH: ":memory:",
  });
  const handler = createRequestHandler({
    authConfig: config,
    env: { NODE_ENV: "test" },
    serveWebDist: false,
  });

  try {
    const reg = await invokeHandler(handler, {
      method: "POST",
      url: "/api/auth/register",
      headers: {
        host: "torquelab.vercel.app",
        origin: "https://torquelab.vercel.app",
      },
      body: {
        name: "Bruno Vercel",
        email: "bruno@vercel.test",
        password: "Password123",
      },
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.headers["access-control-allow-origin"], "https://torquelab.vercel.app");

    const login = await invokeHandler(handler, {
      method: "POST",
      url: "/api/auth/login",
      headers: {
        "x-forwarded-host": "torquelab-abc123.vercel.app",
        origin: "https://torquelab-abc123.vercel.app",
      },
      body: {
        email: "bruno@vercel.test",
        password: "Password123",
      },
    });
    assert.equal(login.status, 200);
    assert.equal(
      login.headers["access-control-allow-origin"],
      "https://torquelab-abc123.vercel.app",
    );

    const dash = await invokeHandler(handler, {
      method: "GET",
      url: "/api/dashboard",
      headers: {
        host: "torquelab.vercel.app",
        authorization: `Bearer ${login.json.tokens.accessToken}`,
      },
    });
    assert.equal(dash.status, 200);
    assert.equal(dash.json.empty, true);
  } finally {
    await handler.closeDb();
  }
});

test("Cenário 2 (Persistência no Turso entre Cold Starts): instância 2 lê veículo criado na instância 1 sem duplicar schema/seed", async () => {
  const { factory, backingDb } = createInMemoryLibsqlFactory();
  const env = {
    NODE_ENV: "production",
    VERCEL: "1",
    AUTH_JWT_SECRET: "turso-cold-start-secret-at-least-thirty-two-chars-999",
    TURSO_DATABASE_URL: "libsql://torquelab-test.turso.io",
    TURSO_AUTH_TOKEN: "turso-test-token",
    ADMIN_SEED_EMAIL: "admin@torquelab.test",
    ADMIN_SEED_PASSWORD: "AdminPassword123",
  };

  const instance1 = createRequestHandler({
    env,
    createLibsqlClient: factory,
    serveWebDist: false,
  });

  let token;
  try {
    const reg = await invokeHandler(instance1, {
      method: "POST",
      url: "/api/auth/register",
      headers: { host: "torquelab.vercel.app" },
      body: {
        name: "Motorista Turso",
        email: "turso@torquelab.test",
        password: "Password123",
      },
    });
    assert.equal(reg.status, 201);
    token = reg.json.tokens.accessToken;

    const createVeh = await invokeHandler(instance1, {
      method: "POST",
      url: "/api/user/vehicles",
      headers: {
        host: "torquelab.vercel.app",
        authorization: `Bearer ${token}`,
      },
      body: {
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        currentKm: 45000,
        lastRevisionMonths: 4,
      },
    });
    assert.equal(createVeh.status, 201);
  } finally {
    await instance1.closeDb();
  }

  // Segunda instância simulando novo cold start conectando no mesmo Turso
  const instance2 = createRequestHandler({
    env,
    createLibsqlClient: factory,
    serveWebDist: false,
  });

  try {
    const dash = await invokeHandler(instance2, {
      method: "GET",
      url: "/api/dashboard",
      headers: {
        host: "torquelab.vercel.app",
        authorization: `Bearer ${token}`,
      },
    });
    assert.equal(dash.status, 200);
    assert.equal(dash.json.empty, false);
    assert.equal(dash.json.vehicles.length, 1);
    assert.equal(dash.json.activeVehicle.model, "Corolla");
  } finally {
    await instance2.closeDb();
    backingDb.close();
  }
});

test("Cenário 3 (Proteção contra SQLite Efêmero na Vercel): VERCEL=1 + NODE_ENV=production sem TURSO_DATABASE_URL retorna 503", async () => {
  const handler = createRequestHandler({
    env: {
      NODE_ENV: "production",
      VERCEL: "1",
      AUTH_JWT_SECRET: "prod-secret-with-at-least-thirty-two-characters-1234",
    },
    serveWebDist: false,
  });

  const res = await invokeHandler(handler, {
    method: "POST",
    url: "/api/auth/login",
    headers: { host: "torquelab.vercel.app" },
    body: { email: "alguem@torquelab.test", password: "Password123" },
  });

  assert.equal(res.status, 503);
  assert.equal(
    res.json.error,
    "Serviço temporariamente indisponível. Tente novamente em instantes.",
  );
});

test("Cenário 4 (Consulta de Placa Same-Origin via entrypoint Vercel): /api/vehicles/:plate", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ data: { placa: "ABC1D23", marca: "HONDA", modelo: "CIVIC" } }),
      { status: 200 },
    );

  const prevToken = process.env.FALCON_API_TOKEN;
  process.env.FALCON_API_TOKEN = "TEST_TOKEN";
  try {
    const res = await invokeHandler(vercelHandler, {
      method: "GET",
      url: "/api/vehicles/ABC1D23",
      headers: { host: "torquelab.vercel.app" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.plate, "ABC1D23");
    assert.equal(res.json.data.brand, "HONDA");
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) {
      delete process.env.FALCON_API_TOKEN;
    } else {
      process.env.FALCON_API_TOKEN = prevToken;
    }
  }
});

test("Cenário 5 (Preflight CORS): origem autorizada -> 204 sem *, origem não autorizada -> 403", async () => {
  const handler = createRequestHandler({
    env: {
      NODE_ENV: "production",
      AUTH_JWT_SECRET: "cors-test-secret-with-at-least-thirty-two-characters-123",
    },
    allowedOrigins: ["http://localhost:8081"],
    serveWebDist: false,
  });

  const allowed = await invokeHandler(handler, {
    method: "OPTIONS",
    url: "/api/auth/login",
    headers: {
      host: "torquelab.vercel.app",
      origin: "http://localhost:8081",
    },
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:8081");
  assert.notEqual(allowed.headers["access-control-allow-origin"], "*");

  const blocked = await invokeHandler(handler, {
    method: "OPTIONS",
    url: "/api/auth/login",
    headers: {
      host: "torquelab.vercel.app",
      origin: "https://malicioso.exemplo",
    },
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json.error, "Origem não permitida.");
});

test("Cenário 6 (Configuração Docker Local, Vercel e Package.json): alinhamento de same-origin, Node 24 e @libsql/client", () => {
  const root = resolve(process.cwd());
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const vercelJson = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  const dockerfile = readFileSync(resolve(root, "Dockerfile"), "utf8");
  const compose = readFileSync(resolve(root, "docker-compose.yml"), "utf8");

  assert.equal(pkg.engines?.node, "24.x");
  assert.ok(pkg.dependencies?.["@libsql/client"]);
  assert.equal(vercelJson.outputDirectory, "dist");
  assert.equal(vercelJson.rewrites[0].source, "/api/(.*)");
  assert.equal(vercelJson.rewrites[0].destination, "/api/[...route]");
  assert.match(dockerfile, /EXPO_PUBLIC_API_BASE_URL=same-origin/);
  assert.match(dockerfile, /EXPO_PUBLIC_PLATE_API_URL=\/api\/vehicles/);
  assert.match(dockerfile, /WEB_BASE_PATH=\//);
  assert.match(compose, /WEB_BASE_PATH:\s*\//);
});
