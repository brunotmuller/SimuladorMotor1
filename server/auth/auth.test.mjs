import assert from "node:assert/strict";
import { request } from "node:http";
import test from "node:test";
import { loadAuthConfig } from "./config.mjs";
import { openAuthDatabase } from "./db.mjs";
import { createAppServer } from "../index.mjs";

function createTestServer({
  adminSeedEmail = "admin@torquelab.com",
  adminSeedPassword = "Admin2026",
  startTimeMs = Date.parse("2026-11-25T12:00:00.000Z"),
  accessTtlSeconds = 900,
  refreshTtlSeconds = 604800,
} = {}) {
  let currentNow = startTimeMs;
  let db = null;
  const config = loadAuthConfig({
    NODE_ENV: "test",
    AUTH_JWT_SECRET: "test-secret-with-at-least-thirty-two-characters-12345",
    AUTH_DB_PATH: ":memory:",
    AUTH_ACCESS_TTL_SECONDS: String(accessTtlSeconds),
    AUTH_REFRESH_TTL_SECONDS: String(refreshTtlSeconds),
    ADMIN_SEED_EMAIL: adminSeedEmail,
    ADMIN_SEED_PASSWORD: adminSeedPassword,
  });

  async function start() {
    db = await openAuthDatabase(":memory:");
    const server = createAppServer({
      authDb: db,
      authConfig: config,
      now: () => currentNow,
      allowedOrigins: ["http://localhost:8081"],
    });
    await server.initAuth();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    return {
      port,
      advanceMs(ms) {
        currentNow += ms;
      },
      send(method, path, { body, headers = {} } = {}) {
        return new Promise((resolve, reject) => {
          const payload = body !== undefined ? JSON.stringify(body) : null;
          const reqHeaders = {
            Origin: "http://localhost:8081",
            ...(payload !== null
              ? {
                  "Content-Type": "application/json",
                  "Content-Length": Buffer.byteLength(payload),
                }
              : {}),
            ...headers,
          };
          const req = request(
            {
              hostname: "127.0.0.1",
              port,
              path,
              method,
              headers: reqHeaders,
            },
            (res) => {
              let raw = "";
              res.on("data", (chunk) => {
                raw += chunk;
              });
              res.on("end", () => {
                let json = null;
                if (raw.trim()) {
                  try {
                    json = JSON.parse(raw);
                  } catch {
                    json = null;
                  }
                }
                resolve({
                  status: res.statusCode,
                  headers: res.headers,
                  raw,
                  json,
                });
              });
            },
          );
          req.on("error", reject);
          if (payload !== null) {
            req.write(payload);
          }
          req.end();
        });
      },
      async close() {
        await new Promise((resolve) => server.close(resolve));
        await db.close();
      },
    };
  }

  return {
    get db() {
      return db;
    },
    config,
    start,
  };
}

test("Cenário 1 (Caminho Feliz): cadastro cria usuário com papel user forçado, senha hasheada e retorna 201", async () => {
  const harness = createTestServer();
  const app = await harness.start();
  try {
    const res = await app.send("POST", "/api/auth/register", {
      body: {
        name: "Bruno Silva",
        email: "bruno@exemplo.com",
        password: "Torque2026",
        role: "admin", // tentativa de escalação deve ser ignorada
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.json.user.name, "Bruno Silva");
    assert.equal(res.json.user.email, "bruno@exemplo.com");
    assert.equal(res.json.user.role, "user");
    assert.equal(res.json.user.status, "active");
    assert.equal("password_hash" in res.json.user, false);
    assert.ok(res.json.tokens.accessToken.split(".").length === 3);
    assert.ok(res.json.tokens.refreshToken.length >= 32);

    // Verifica no SQLite que a senha está em Argon2id e nunca em texto puro
    const row = await harness.db.get(
      "SELECT password_hash, role FROM users WHERE email = ?",
      ["bruno@exemplo.com"],
    );
    assert.equal(row.role, "user");
    assert.ok(row.password_hash.startsWith("$argon2id$"));
    assert.equal(row.password_hash.includes("Torque2026"), false);

    // GET /api/auth/me retorna perfil do usuário autenticado
    const me = await app.send("GET", "/api/auth/me", {
      headers: { Authorization: `Bearer ${res.json.tokens.accessToken}` },
    });
    assert.equal(me.status, 200);
    assert.equal(me.json.user.email, "bruno@exemplo.com");
    assert.equal(me.json.user.role, "user");
  } finally {
    await app.close();
  }
});

test("Cenário 2 (Caminho Feliz): login de administrador retorna 200 com role admin e libera /api/admin/health", async () => {
  const harness = createTestServer();
  const app = await harness.start();
  try {
    const login = await app.send("POST", "/api/auth/login", {
      body: {
        email: "admin@torquelab.com",
        password: "Admin2026",
      },
    });

    assert.equal(login.status, 200);
    assert.equal(login.json.user.role, "admin");
    assert.equal(login.json.user.email, "admin@torquelab.com");

    const adminHealth = await app.send("GET", "/api/admin/health", {
      headers: { Authorization: `Bearer ${login.json.tokens.accessToken}` },
    });
    assert.equal(adminHealth.status, 200);
    assert.equal(adminHealth.json.role, "admin");
  } finally {
    await app.close();
  }
});

test("Cenário 3 (Erro): cadastro com e-mail duplicado case-insensitive retorna 409 Conflict", async () => {
  const harness = createTestServer();
  const app = await harness.start();
  try {
    const first = await app.send("POST", "/api/auth/register", {
      body: {
        name: "Bruno Silva",
        email: "bruno@exemplo.com",
        password: "Torque2026",
      },
    });
    assert.equal(first.status, 201);

    const dup = await app.send("POST", "/api/auth/register", {
      body: {
        name: "Outro Bruno",
        email: "BRUNO@exemplo.com",
        password: "Torque2026",
      },
    });
    assert.equal(dup.status, 409);
    assert.equal(dup.json.error, "Este e-mail já está em uso.");
  } finally {
    await app.close();
  }
});

test("Cenário 4 (Segurança): usuário comum tentando acessar /api/admin/* recebe 403 Forbidden", async () => {
  const harness = createTestServer();
  const app = await harness.start();
  try {
    const reg = await app.send("POST", "/api/auth/register", {
      body: {
        name: "Motorista Comum",
        email: "driver@exemplo.com",
        password: "Torque2026",
      },
    });
    const token = reg.json.tokens.accessToken;

    const healthAttempt = await app.send("GET", "/api/admin/health", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(healthAttempt.status, 403);

    const otherAdminRoute = await app.send("GET", "/api/admin/overview", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(otherAdminRoute.status, 403);
  } finally {
    await app.close();
  }
});

test("Cenário 5 (Erro/Força bruta): 5 falhas retornam 401 genérico e 6ª tentativa retorna 429; conta bloqueada retorna 403", async () => {
  const harness = createTestServer();
  const app = await harness.start();
  try {
    const reg = await app.send("POST", "/api/auth/register", {
      body: {
        name: "Bruno Silva",
        email: "bruno@exemplo.com",
        password: "Torque2026",
      },
    });
    assert.equal(reg.status, 201);

    for (let i = 1; i <= 5; i += 1) {
      const attempt = await app.send("POST", "/api/auth/login", {
        body: {
          email: "bruno@exemplo.com",
          password: `WrongPass${i}`,
        },
      });
      assert.equal(attempt.status, 401, `Tentativa ${i} deveria retornar 401`);
      assert.equal(attempt.json.error, "E-mail ou senha inválidos.");
    }

    const sixth = await app.send("POST", "/api/auth/login", {
      body: {
        email: "bruno@exemplo.com",
        password: "Torque2026",
      },
    });
    assert.equal(sixth.status, 429);
    assert.ok(sixth.json.retryAfterSeconds > 0);
    assert.ok(Number(sixth.headers["retry-after"]) > 0);

    // Após 15 minutos, desbloqueia e bloqueio de conta inactive/blocked retorna 403
    await harness.db.run(
      "UPDATE users SET status = 'blocked', locked_until = NULL WHERE email = ?",
      ["bruno@exemplo.com"],
    );

    const blockedLogin = await app.send("POST", "/api/auth/login", {
      body: {
        email: "bruno@exemplo.com",
        password: "Torque2026",
      },
    });
    assert.equal(blockedLogin.status, 403);
  } finally {
    await app.close();
  }
});

test("Rotação de refresh token, detecção de reuso e revogação no logout", async () => {
  const harness = createTestServer({ accessTtlSeconds: 60 });
  const app = await harness.start();
  try {
    const reg = await app.send("POST", "/api/auth/register", {
      body: {
        name: "Carla Dias",
        email: "carla@exemplo.com",
        password: "Torque2026",
      },
    });
    const rt1 = reg.json.tokens.refreshToken;

    // Avança além do TTL de 60s -> access token antigo expira (401)
    app.advanceMs(61_000);
    const expiredMe = await app.send("GET", "/api/auth/me", {
      headers: { Authorization: `Bearer ${reg.json.tokens.accessToken}` },
    });
    assert.equal(expiredMe.status, 401);

    // Refresh rotaciona rt1 -> rt2 e emite novo accessToken válido
    const refreshed = await app.send("POST", "/api/auth/refresh", {
      body: { refreshToken: rt1 },
    });
    assert.equal(refreshed.status, 200);
    const rt2 = refreshed.json.tokens.refreshToken;
    assert.notEqual(rt2, rt1);

    const validMe = await app.send("GET", "/api/auth/me", {
      headers: { Authorization: `Bearer ${refreshed.json.tokens.accessToken}` },
    });
    assert.equal(validMe.status, 200);

    // Reuso do rt1 já revogado revoga todas as sessões do usuário (inclusive rt2!)
    const reuse = await app.send("POST", "/api/auth/refresh", {
      body: { refreshToken: rt1 },
    });
    assert.equal(reuse.status, 401);

    const revokedRt2 = await app.send("POST", "/api/auth/refresh", {
      body: { refreshToken: rt2 },
    });
    assert.equal(revokedRt2.status, 401);

    // Novo login + logout revoga o token
    const relogin = await app.send("POST", "/api/auth/login", {
      body: { email: "carla@exemplo.com", password: "Torque2026" },
    });
    assert.equal(relogin.status, 200);

    const logoutRes = await app.send("POST", "/api/auth/logout", {
      body: { refreshToken: relogin.json.tokens.refreshToken },
    });
    assert.equal(logoutRes.status, 204);

    const afterLogout = await app.send("POST", "/api/auth/refresh", {
      body: { refreshToken: relogin.json.tokens.refreshToken },
    });
    assert.equal(afterLogout.status, 401);
  } finally {
    await app.close();
  }
});

test("Validação RN-01 rejeita payload inválido com 400 Bad Request e lista de campos", async () => {
  const harness = createTestServer();
  const app = await harness.start();
  try {
    const res = await app.send("POST", "/api/auth/register", {
      body: {
        name: "A",
        email: "email-invalido",
        password: "semnumeros",
      },
    });
    assert.equal(res.status, 400);
    assert.ok(res.json.fields.name);
    assert.ok(res.json.fields.email);
    assert.ok(res.json.fields.password);
  } finally {
    await app.close();
  }
});
