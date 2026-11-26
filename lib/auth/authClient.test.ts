import assert from "node:assert/strict";
import test from "node:test";
import { AuthClientError, createAuthClient } from "./authClient";
import { createMemoryTokenStorage } from "./tokenStorageCore";

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

test("Cenário 6: access_token expirado dispara 1 renovação automática via /api/auth/refresh e repete a requisição", async () => {
  const storage = createMemoryTokenStorage({
    accessToken: "expired-access",
    refreshToken: "valid-refresh-1",
    expiresIn: 900,
  });

  let refreshCalls = 0;
  let meCalls = 0;

  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    const authHeader = new Headers(init?.headers).get("Authorization");

    if (url.endsWith("/api/auth/me")) {
      meCalls += 1;
      if (authHeader === "Bearer expired-access") {
        return jsonResponse(401, { error: "Token expirado." });
      }
      if (authHeader === "Bearer fresh-access-2") {
        return jsonResponse(200, {
          user: {
            id: "u-1",
            name: "Bruno Silva",
            email: "bruno@exemplo.com",
            role: "user",
            status: "active",
            createdAt: "2026-11-25T12:00:00.000Z",
          },
        });
      }
    }

    if (url.endsWith("/api/auth/refresh")) {
      refreshCalls += 1;
      const body = JSON.parse(String(init?.body ?? "{}"));
      assert.equal(body.refreshToken, "valid-refresh-1");
      return jsonResponse(200, {
        user: {
          id: "u-1",
          name: "Bruno Silva",
          email: "bruno@exemplo.com",
          role: "user",
          status: "active",
          createdAt: "2026-11-25T12:00:00.000Z",
        },
        tokens: {
          accessToken: "fresh-access-2",
          refreshToken: "valid-refresh-2",
          expiresIn: 900,
        },
      });
    }

    return jsonResponse(404, { error: "Not found" });
  };

  let expiredCallbackCalls = 0;
  const client = createAuthClient({
    baseUrl: "http://localhost:3001",
    tokenStorage: storage,
    fetchImpl: fetchMock,
    onSessionExpired: () => {
      expiredCallbackCalls += 1;
    },
  });

  const user = await client.getMe();
  assert.equal(user.email, "bruno@exemplo.com");
  assert.equal(refreshCalls, 1);
  assert.equal(meCalls, 2);
  assert.equal(expiredCallbackCalls, 0);

  const saved = await storage.getTokens();
  assert.equal(saved?.accessToken, "fresh-access-2");
  assert.equal(saved?.refreshToken, "valid-refresh-2");
});

test("Chamadas concorrentes que recebem 401 deduplicam para exatamente 1 chamada a /api/auth/refresh", async () => {
  const storage = createMemoryTokenStorage({
    accessToken: "expired-access",
    refreshToken: "valid-refresh-1",
    expiresIn: 900,
  });

  let refreshCalls = 0;
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    const authHeader = new Headers(init?.headers).get("Authorization");

    if (url.endsWith("/api/auth/refresh")) {
      refreshCalls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return jsonResponse(200, {
        user: {
          id: "u-1",
          name: "Bruno",
          email: "bruno@exemplo.com",
          role: "user",
          status: "active",
          createdAt: "2026-11-25T12:00:00.000Z",
        },
        tokens: {
          accessToken: "new-access",
          refreshToken: "new-refresh",
          expiresIn: 900,
        },
      });
    }

    if (authHeader === "Bearer expired-access") {
      return jsonResponse(401, { error: "Expirado" });
    }
    return jsonResponse(200, { ok: true });
  };

  const client = createAuthClient({
    baseUrl: "http://localhost:3001",
    tokenStorage: storage,
    fetchImpl: fetchMock,
  });

  const [r1, r2, r3] = await Promise.all([
    client.authenticatedFetch("/api/test/1"),
    client.authenticatedFetch("/api/test/2"),
    client.authenticatedFetch("/api/test/3"),
  ]);

  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r3.status, 200);
  assert.equal(refreshCalls, 1);
});

test("Quando o refresh falha com 401, limpa tokens locais e dispara onSessionExpired", async () => {
  const storage = createMemoryTokenStorage({
    accessToken: "expired-access",
    refreshToken: "revoked-refresh",
    expiresIn: 900,
  });

  let expiredCalled = 0;
  const fetchMock: typeof fetch = async () =>
    jsonResponse(401, { error: "Sessão expirada." });

  const client = createAuthClient({
    baseUrl: "http://localhost:3001",
    tokenStorage: storage,
    fetchImpl: fetchMock,
    onSessionExpired: () => {
      expiredCalled += 1;
    },
  });

  await assert.rejects(() => client.getMe(), (err: unknown) => {
    assert.ok(err instanceof AuthClientError);
    assert.equal(err.status, 401);
    return true;
  });

  assert.equal(expiredCalled, 1);
  assert.equal(await storage.getTokens(), null);
});

test("RN-03: timeout dispara AuthClientError amigável com isTimeout = true", async () => {
  const fetchMock: typeof fetch = async (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new Error("Aborted"));
      });
    });

  const client = createAuthClient({
    baseUrl: "http://localhost:3001",
    timeoutMs: 30,
    fetchImpl: fetchMock,
  });

  await assert.rejects(
    () => client.login({ email: "a@b.com", password: "Password1" }),
    (err: unknown) => {
      assert.ok(err instanceof AuthClientError);
      assert.equal(err.isTimeout, true);
      return true;
    }
  );
});
