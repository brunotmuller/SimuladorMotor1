import assert from "node:assert/strict";
import test from "node:test";
import { AuthClientError, createAuthClient } from "../auth/authClient";
import { createMemoryTokenStorage } from "../auth/tokenStorageCore";
import {
  AdminClientError,
  createAdminClient,
  DEFAULT_ADMIN_TIMEOUT_MS,
} from "./adminClient";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("DEFAULT_ADMIN_TIMEOUT_MS é 15.000 ms (RN-04)", () => {
  assert.equal(DEFAULT_ADMIN_TIMEOUT_MS, 15_000);
});

test("adminClient realiza chamadas de overview, listagens com filtros e CRUD com renovação automática em 401", async () => {
  const storage = createMemoryTokenStorage({
    accessToken: "expired-admin-token",
    refreshToken: "valid-admin-refresh",
    expiresIn: 900,
  });

  let refreshCount = 0;
  const seenRequests: { url: string; method: string; body: string | null }[] =
    [];

  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const auth = new Headers(init?.headers).get("Authorization");
    seenRequests.push({
      url,
      method,
      body: typeof init?.body === "string" ? init.body : null,
    });

    if (url.endsWith("/api/auth/refresh")) {
      refreshCount += 1;
      return jsonResponse(200, {
        user: {
          id: "admin-1",
          name: "Admin TorqueLab",
          email: "adm@email.com",
          role: "admin",
          status: "active",
          createdAt: "2026-11-26T12:00:00.000Z",
        },
        tokens: {
          accessToken: "fresh-admin-token",
          refreshToken: "new-admin-refresh",
          expiresIn: 900,
        },
      });
    }

    if (auth === "Bearer expired-admin-token") {
      return jsonResponse(401, { error: "Token expirado." });
    }
    assert.equal(auth, "Bearer fresh-admin-token");

    if (url.endsWith("/api/admin/overview")) {
      return jsonResponse(200, {
        users: { total: 5, active: 4, newLast30Days: 2, adminCount: 1 },
        catalogVehicles: { total: 8, active: 7, inactive: 1 },
        userVehicles: { total: 6, averagePerActiveUser: 1.5 },
        catalogServices: { total: 9, active: 8, inactive: 1 },
        generatedAt: "2026-11-26T15:00:00.000Z",
      });
    }

    if (url.includes("/api/admin/user-vehicles?")) {
      assert.ok(url.includes("brand=Toyota"));
      assert.ok(url.includes("page=1"));
      assert.ok(url.includes("limit=10"));
      assert.ok(url.includes("kmMin=10000"));
      assert.ok(url.includes("kmMax=80000"));
      return jsonResponse(200, {
        items: [
          {
            id: "uv-1",
            brand: "Toyota",
            model: "Corolla",
            year: 2022,
            version: "XEi",
            nickname: null,
            currentKm: 45000,
            category: "medium_suv",
            fuel: "Flex",
            ownerName: "Bruno",
            ownerEmailMasked: "b***@exemplo.com",
            createdAt: "2026-11-26T10:00:00.000Z",
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        topModels: [{ brand: "Toyota", model: "Corolla", count: 1 }],
      });
    }

    if (url.includes("/api/admin/catalog/services?") && method === "GET") {
      assert.ok(url.includes("combustionOnly=false"));
      assert.ok(url.includes("status=active"));
      return jsonResponse(200, {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }

    if (url.endsWith("/api/admin/catalog/services") && method === "POST") {
      return jsonResponse(201, {
        service: {
          id: "srv-coolant",
          name: "Troca de fluido de arrefecimento",
          category: "fluidos",
          intervalKm: 40000,
          intervalMonths: 24,
          baseCost: 260,
          combustionOnly: false,
          notes: null,
          active: true,
          updatedBy: "admin-1",
          createdAt: "2026-11-26T15:00:00.000Z",
          updatedAt: "2026-11-26T15:00:00.000Z",
        },
      });
    }

    if (
      url.endsWith("/api/admin/catalog/vehicles/cat-corolla-2022") &&
      method === "PATCH"
    ) {
      return jsonResponse(200, {
        vehicle: {
          id: "cat-corolla-2022",
          brand: "Toyota",
          model: "Corolla",
          year: 2022,
          fuel: "Flex",
          category: "medium_suv",
          costFactor: 1.22,
          referenceConsumption: 11.5,
          fipePrice: "R$ 138.500",
          active: false,
          updatedBy: "admin-1",
          createdAt: "2026-11-26T10:00:00.000Z",
          updatedAt: "2026-11-26T15:00:00.000Z",
        },
      });
    }

    return jsonResponse(404, { error: "Not found" });
  };

  const authClient = createAuthClient({
    baseUrl: "http://localhost:3001",
    tokenStorage: storage,
    fetchImpl: fetchMock,
    timeoutMs: DEFAULT_ADMIN_TIMEOUT_MS,
  });
  const adminClient = createAdminClient(authClient);

  const overview = await adminClient.getOverview();
  assert.equal(overview.users.total, 5);
  assert.equal(overview.users.adminCount, 1);
  assert.equal(refreshCount, 1);

  const userVehicles = await adminClient.listUserVehicles({
    brand: "Toyota",
    page: 1,
    limit: 10,
    kmMin: 10000,
    kmMax: 80000,
  });
  assert.equal(userVehicles.items.length, 1);
  assert.equal(userVehicles.items[0].ownerEmailMasked, "b***@exemplo.com");

  const servicesList = await adminClient.listCatalogServices({
    combustionOnly: false,
    status: "active",
  });
  assert.equal(servicesList.pagination.total, 0);

  const createdService = await adminClient.createCatalogService({
    name: "Troca de fluido de arrefecimento",
    category: "fluidos",
    intervalKm: 40000,
    intervalMonths: 24,
    baseCost: 260,
    combustionOnly: false,
  });
  assert.equal(createdService.id, "srv-coolant");
  assert.equal(createdService.updatedBy, "admin-1");

  const deactivated = await adminClient.updateCatalogVehicle(
    "cat-corolla-2022",
    { active: false }
  );
  assert.equal(deactivated.active, false);
  assert.ok(seenRequests.length >= 6);
});

test("adminClient mapeia erros 400 (fields), 403 (RBAC) e 409 (conflito de duplicidade)", async () => {
  const client = createAdminClient({
    async authenticatedFetch(path, init) {
      if (path === "/api/admin/overview") {
        return jsonResponse(403, {
          error: "Acesso restrito a administradores.",
        });
      }
      if (path === "/api/admin/catalog/services" && init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}")) as {
          baseCost?: number;
        };
        if (body.baseCost !== undefined && body.baseCost < 0) {
          return jsonResponse(400, {
            error: "Dados inválidos para o serviço.",
            fields: {
              baseCost: "O custo-base deve ser um número entre 0 e 100.000.",
            },
          });
        }
        return jsonResponse(409, {
          error: "Já existe um serviço com este nome no catálogo.",
        });
      }
      return jsonResponse(404, { error: "Não encontrado." });
    },
  });

  await assert.rejects(
    () => client.getOverview(),
    (err: unknown) => {
      assert.ok(err instanceof AdminClientError);
      assert.equal(err.status, 403);
      assert.match(err.message, /administradores/i);
      return true;
    }
  );

  await assert.rejects(
    () =>
      client.createCatalogService({
        name: "Serviço inválido",
        category: "motor",
        intervalKm: 10000,
        baseCost: -50,
      }),
    (err: unknown) => {
      assert.ok(err instanceof AdminClientError);
      assert.equal(err.status, 400);
      assert.ok(err.fields?.baseCost);
      return true;
    }
  );

  await assert.rejects(
    () =>
      client.createCatalogService({
        name: "Troca de óleo e filtro",
        category: "motor",
        intervalKm: 10000,
        baseCost: 250,
      }),
    (err: unknown) => {
      assert.ok(err instanceof AdminClientError);
      assert.equal(err.status, 409);
      assert.match(err.message, /Já existe um serviço/i);
      return true;
    }
  );
});

test("adminClient aplica timeout dedicado via AbortController e propaga AuthClientError timeout", async () => {
  let signalAborted = false;
  const slowClient = createAdminClient(
    {
      authenticatedFetch(_path, init) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            signalAborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      },
    },
    { timeoutMs: 35 }
  );

  await assert.rejects(
    () => slowClient.getOverview(),
    (err: unknown) => {
      assert.ok(err instanceof AdminClientError);
      assert.equal(err.status, 408);
      assert.equal(err.isTimeout, true);
      assert.match(err.message, /15 segundos/i);
      return true;
    }
  );
  assert.equal(signalAborted, true);

  const authTimeoutClient = createAdminClient({
    async authenticatedFetch() {
      throw new AuthClientError(0, "Tempo limite excedido.", {
        isTimeout: true,
      });
    },
  });

  await assert.rejects(
    () => authTimeoutClient.getOverview(),
    (err: unknown) => {
      assert.ok(err instanceof AdminClientError);
      assert.equal(err.isTimeout, true);
      return true;
    }
  );
});
