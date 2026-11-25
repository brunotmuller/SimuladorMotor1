import assert from "node:assert/strict";
import test from "node:test";
import { AuthClientError, createAuthClient } from "../auth/authClient";
import { createMemoryTokenStorage } from "../auth/tokenStorageCore";
import {
  createDashboardClient,
  DashboardClientError,
} from "./dashboardClient";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("dashboardClient envia chamadas autenticadas e renova automaticamente em 401", async () => {
  const storage = createMemoryTokenStorage({
    accessToken: "expired-token",
    refreshToken: "valid-refresh",
    expiresIn: 900,
  });

  let refreshCount = 0;

  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    const auth = new Headers(init?.headers).get("Authorization");

    if (url.endsWith("/api/auth/refresh")) {
      refreshCount += 1;
      return jsonResponse(200, {
        user: {
          id: "u1",
          name: "Bruno",
          email: "bruno@exemplo.com",
          role: "user",
          status: "active",
          createdAt: "2026-11-25T12:00:00.000Z",
        },
        tokens: {
          accessToken: "fresh-token",
          refreshToken: "new-refresh",
          expiresIn: 900,
        },
      });
    }

    if (url.endsWith("/api/dashboard")) {
      if (auth === "Bearer expired-token") {
        return jsonResponse(401, { error: "Expirado" });
      }
      assert.equal(auth, "Bearer fresh-token");
      return jsonResponse(200, {
        empty: true,
        vehicles: [],
        activeVehicle: null,
        summary: null,
        maintenances: [],
        history: [],
      });
    }

    return jsonResponse(404, { error: "Not found" });
  };

  const authClient = createAuthClient({
    baseUrl: "http://localhost:3001",
    tokenStorage: storage,
    fetchImpl: fetchMock,
  });
  const dashboardClient = createDashboardClient(authClient);

  const dashboard = await dashboardClient.getDashboard();
  assert.equal(dashboard.empty, true);
  assert.equal(refreshCount, 1);
});

test("dashboardClient mapeia erros 400 (fields), 409 (regressão de KM) e 422 (limite)", async () => {
  const client = createDashboardClient({
    async authenticatedFetch(path) {
      if (path.includes("bad-km")) {
        return jsonResponse(400, {
          error: "Dados inválidos.",
          fields: { currentKm: "Quilometragem inválida." },
        });
      }
      if (path.includes("regress")) {
        return jsonResponse(409, {
          error: "Confirme regressão.",
          requiresKmRegressionConfirmation: true,
        });
      }
      return jsonResponse(422, { error: "Limite de 20 veículos atingido." });
    },
  });

  await assert.rejects(
    () => client.updateVehicle("bad-km", { currentKm: -10 }),
    (err: unknown) => {
      assert.ok(err instanceof DashboardClientError);
      assert.equal(err.status, 400);
      assert.equal(err.fields?.currentKm, "Quilometragem inválida.");
      return true;
    }
  );

  await assert.rejects(
    () => client.updateVehicle("regress", { currentKm: 10000 }),
    (err: unknown) => {
      assert.ok(err instanceof DashboardClientError);
      assert.equal(err.status, 409);
      assert.equal(err.requiresKmRegressionConfirmation, true);
      return true;
    }
  );

  await assert.rejects(
    () =>
      client.createVehicle({
        brand: "Fiat",
        model: "Argo",
        year: 2022,
        currentKm: 1000,
      }),
    (err: unknown) => {
      assert.ok(err instanceof DashboardClientError);
      assert.equal(err.status, 422);
      return true;
    }
  );
});

test("dashboardClient propaga timeout do AuthClientError com isTimeout = true", async () => {
  const client = createDashboardClient({
    async authenticatedFetch() {
      throw new AuthClientError(0, "Tempo esgotado.", { isTimeout: true });
    },
  });

  await assert.rejects(() => client.getDashboard(), (err: unknown) => {
    assert.ok(err instanceof DashboardClientError);
    assert.equal(err.isTimeout, true);
    return true;
  });
});
