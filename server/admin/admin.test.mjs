import assert from "node:assert/strict";
import { request } from "node:http";
import test from "node:test";
import { loadAuthConfig } from "../auth/config.mjs";
import { openAuthDatabase } from "../auth/db.mjs";
import { createAppServer } from "../index.mjs";

const ADMIN_EMAIL = "adm@torquelab.test";
const ADMIN_PASSWORD = "AdminPassword123";

function createTestHarness({
  startTimeMs = Date.parse("2026-11-26T12:00:00.000Z"),
} = {}) {
  let currentNow = startTimeMs;
  let db = null;
  const config = loadAuthConfig({
    NODE_ENV: "test",
    AUTH_JWT_SECRET: "test-admin-dashboard-secret-at-least-32-chars-88888",
    AUTH_DB_PATH: ":memory:",
    ADMIN_SEED_EMAIL: ADMIN_EMAIL,
    ADMIN_SEED_PASSWORD: ADMIN_PASSWORD,
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

    function send(method, path, { body, token } = {}) {
      return new Promise((resolve, reject) => {
        const payload = body !== undefined ? JSON.stringify(body) : null;
        const headers = {
          Origin: "http://localhost:8081",
          ...(payload !== null
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const req = request(
          { hostname: "127.0.0.1", port, path, method, headers },
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
              resolve({ status: res.statusCode, headers: res.headers, json });
            });
          },
        );
        req.on("error", reject);
        if (payload !== null) {
          req.write(payload);
        }
        req.end();
      });
    }

    async function loginAdmin() {
      const res = await send("POST", "/api/auth/login", {
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.user.role, "admin");
      return {
        user: res.json.user,
        token: res.json.tokens.accessToken,
      };
    }

    async function registerUser(email, name = "Motorista Teste") {
      const res = await send("POST", "/api/auth/register", {
        body: { name, email, password: "Password123" },
      });
      assert.equal(res.status, 201);
      return {
        user: res.json.user,
        token: res.json.tokens.accessToken,
      };
    }

    return {
      db,
      send,
      loginAdmin,
      registerUser,
      advanceMs(ms) {
        currentNow += ms;
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
    start,
  };
}

test("Cenário 1 (Visualização de KPIs reais): GET /api/admin/overview retorna contagens exatas separando user de admin", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const admin = await app.loginAdmin();
    const user1 = await app.registerUser("bruno@exemplo.com", "Bruno Silva");
    const user2 = await app.registerUser("carla@exemplo.com", "Carla Souza");

    // Cria 2 carros para user1 e 1 carro para user2 (total = 3 carros, média = 1.5 por usuário ativo)
    const v1 = await app.send("POST", "/api/user/vehicles", {
      token: user1.token,
      body: {
        catalogVehicleId: "cat-corolla-2022",
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 42000,
      },
    });
    assert.equal(v1.status, 201);

    const v2 = await app.send("POST", "/api/user/vehicles", {
      token: user1.token,
      body: {
        brand: "Honda",
        model: "Civic",
        year: 2021,
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 55000,
      },
    });
    assert.equal(v2.status, 201);

    const v3 = await app.send("POST", "/api/user/vehicles", {
      token: user2.token,
      body: {
        brand: "Toyota",
        model: "Yaris",
        year: 2023,
        fuel: "Flex",
        category: "compact",
        currentKm: 18000,
      },
    });
    assert.equal(v3.status, 201);

    const overviewRes = await app.send("GET", "/api/admin/overview", {
      token: admin.token,
    });
    assert.equal(overviewRes.status, 200);

    const overview = overviewRes.json;
    assert.equal(overview.users.total, 2);
    assert.equal(overview.users.active, 2);
    assert.equal(overview.users.newLast30Days, 2);
    assert.equal(overview.users.adminCount, 1);

    assert.ok(overview.catalogVehicles.total >= 1);
    assert.equal(
      overview.catalogVehicles.active + overview.catalogVehicles.inactive,
      overview.catalogVehicles.total,
    );

    assert.equal(overview.userVehicles.total, 3);
    assert.equal(overview.userVehicles.averagePerActiveUser, 1.5);

    assert.equal(overview.catalogServices.total, 8);
    assert.equal(overview.catalogServices.active, 8);
    assert.equal(overview.catalogServices.inactive, 0);
    assert.ok(typeof overview.generatedAt === "string");
    assert.ok(!Number.isNaN(Date.parse(overview.generatedAt)));

    // Compatibilidade com GET /api/admin/health (auth-roles)
    const healthRes = await app.send("GET", "/api/admin/health", {
      token: admin.token,
    });
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.json.status, "ok");
    assert.equal(healthRes.json.role, "admin");
  } finally {
    await app.close();
  }
});

test("Cenário 2 (Criação de serviço no catálogo): POST /api/admin/catalog/services grava updatedBy, atualiza KPI e reflete no Dashboard do Usuário", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const admin = await app.loginAdmin();
    const user = await app.registerUser("motorista@exemplo.com", "Motorista");

    const vehicleRes = await app.send("POST", "/api/user/vehicles", {
      token: user.token,
      body: {
        catalogVehicleId: "cat-corolla-2022",
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 45000,
      },
    });
    assert.equal(vehicleRes.status, 201);

    const beforeOverview = await app.send("GET", "/api/admin/overview", {
      token: admin.token,
    });
    const prevActiveServices = beforeOverview.json.catalogServices.active;

    const createServiceRes = await app.send(
      "POST",
      "/api/admin/catalog/services",
      {
        token: admin.token,
        body: {
          name: "Troca de fluido de arrefecimento",
          category: "fluidos",
          intervalKm: 40000,
          intervalMonths: 24,
          baseCost: 260,
          combustionOnly: false,
          notes: "Drenar sistema completo e aplicar aditivo orgânico.",
        },
      },
    );
    assert.equal(createServiceRes.status, 201);
    assert.equal(
      createServiceRes.json.service.name,
      "Troca de fluido de arrefecimento",
    );
    assert.equal(createServiceRes.json.service.intervalKm, 40000);
    assert.equal(createServiceRes.json.service.intervalMonths, 24);
    assert.equal(createServiceRes.json.service.baseCost, 260);
    assert.equal(createServiceRes.json.service.combustionOnly, false);
    assert.equal(createServiceRes.json.service.active, true);
    assert.equal(createServiceRes.json.service.updatedBy, admin.user.id);

    const afterOverview = await app.send("GET", "/api/admin/overview", {
      token: admin.token,
    });
    assert.equal(
      afterOverview.json.catalogServices.active,
      prevActiveServices + 1,
    );

    // Verifica propagação imediata para o cálculo de manutenções do usuário (GET /api/dashboard)
    const userDash = await app.send("GET", "/api/dashboard", {
      token: user.token,
    });
    assert.equal(userDash.status, 200);
    const coolantItem = userDash.json.maintenances.find(
      (item) => item.name === "Troca de fluido de arrefecimento",
    );
    assert.ok(
      coolantItem,
      "Novo serviço deve aparecer automaticamente em GET /api/dashboard",
    );
    assert.equal(coolantItem.dueNow, true);
    assert.equal(coolantItem.estimatedCost % 5, 0);
  } finally {
    await app.close();
  }
});

test("Cenário 3 (Desativação segura de carro do catálogo): PATCH active=false remove de /api/catalog/vehicles sem afetar carros de usuários", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const admin = await app.loginAdmin();
    const user = await app.registerUser("dono@exemplo.com", "Dono Corolla");

    const createUserVehicle = await app.send("POST", "/api/user/vehicles", {
      token: user.token,
      body: {
        catalogVehicleId: "cat-corolla-2022",
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 50000,
      },
    });
    assert.equal(createUserVehicle.status, 201);

    const deactivateRes = await app.send(
      "PATCH",
      "/api/admin/catalog/vehicles/cat-corolla-2022",
      {
        token: admin.token,
        body: { active: false },
      },
    );
    assert.equal(deactivateRes.status, 200);
    assert.equal(deactivateRes.json.vehicle.id, "cat-corolla-2022");
    assert.equal(deactivateRes.json.vehicle.active, false);
    assert.equal(deactivateRes.json.vehicle.updatedBy, admin.user.id);

    // Não aparece mais no catálogo público de seleção para novos cadastros
    const publicCatalog = await app.send("GET", "/api/catalog/vehicles", {
      token: user.token,
    });
    assert.equal(publicCatalog.status, 200);
    assert.equal(
      publicCatalog.json.vehicles.some((v) => v.id === "cat-corolla-2022"),
      false,
    );

    // Continua visível na listagem administrativa quando status=inactive
    const inactiveList = await app.send(
      "GET",
      "/api/admin/catalog/vehicles?status=inactive",
      { token: admin.token },
    );
    assert.equal(inactiveList.status, 200);
    assert.equal(
      inactiveList.json.items.some((v) => v.id === "cat-corolla-2022"),
      true,
    );

    // Veículo já salvo na garagem do usuário permanece íntegro
    const userDash = await app.send("GET", "/api/dashboard", {
      token: user.token,
    });
    assert.equal(userDash.status, 200);
    assert.equal(userDash.json.empty, false);
    assert.equal(userDash.json.activeVehicle.catalogVehicleId, "cat-corolla-2022");
    assert.equal(userDash.json.activeVehicle.model, "Corolla");
  } finally {
    await app.close();
  }
});

test("Cenário 4 (Filtro e paginação de carros de usuários): GET /api/admin/user-vehicles?brand=Toyota&page=1&limit=10 mascara e-mail e calcula topModels", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const admin = await app.loginAdmin();
    const bruno = await app.registerUser("bruno@exemplo.com", "Bruno");
    const ana = await app.registerUser("ana@exemplo.com", "Ana");

    await app.send("POST", "/api/user/vehicles", {
      token: bruno.token,
      body: {
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 45000,
      },
    });
    await app.send("POST", "/api/user/vehicles", {
      token: ana.token,
      body: {
        brand: "Toyota",
        model: "Corolla",
        year: 2023,
        fuel: "Híbrido",
        category: "medium_suv",
        currentKm: 20000,
      },
    });
    await app.send("POST", "/api/user/vehicles", {
      token: ana.token,
      body: {
        brand: "Fiat",
        model: "Argo",
        year: 2021,
        fuel: "Flex",
        category: "compact",
        currentKm: 65000,
      },
    });

    const filteredRes = await app.send(
      "GET",
      "/api/admin/user-vehicles?brand=Toyota&page=1&limit=10",
      { token: admin.token },
    );
    assert.equal(filteredRes.status, 200);
    assert.equal(filteredRes.json.items.length, 2);
    assert.equal(filteredRes.json.pagination.page, 1);
    assert.equal(filteredRes.json.pagination.limit, 10);
    assert.equal(filteredRes.json.pagination.total, 2);
    assert.equal(filteredRes.json.pagination.totalPages, 1);

    for (const item of filteredRes.json.items) {
      assert.equal(item.brand, "Toyota");
      assert.match(item.ownerEmailMasked, /^[a-z]\*\*\*@exemplo\.com$/);
      assert.equal(item.ownerEmailMasked.includes("bruno@"), false);
      assert.equal(item.ownerEmailMasked.includes("ana@"), false);
    }

    assert.deepEqual(filteredRes.json.topModels, [
      { brand: "Toyota", model: "Corolla", count: 2 },
    ]);

    // Filtro por faixa de KM
    const kmFiltered = await app.send(
      "GET",
      "/api/admin/user-vehicles?brand=Toyota&kmMin=30000&kmMax=50000",
      { token: admin.token },
    );
    assert.equal(kmFiltered.status, 200);
    assert.equal(kmFiltered.json.items.length, 1);
    assert.equal(kmFiltered.json.items[0].currentKm, 45000);
  } finally {
    await app.close();
  }
});

test("Cenário 5 (Validação e conflito de duplicidade): 409 em nome/veículo duplicado e 400 com fields.baseCost em custo negativo", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const admin = await app.loginAdmin();

    // Nome duplicado de serviço já existente (case-insensitive)
    const dupService = await app.send("POST", "/api/admin/catalog/services", {
      token: admin.token,
      body: {
        name: "  óleo do motor + filtro de óleo  ",
        category: "motor",
        intervalKm: 10000,
        baseCost: 260,
      },
    });
    assert.equal(dupService.status, 409);
    assert.match(dupService.json.error, /Já existe um serviço/i);

    // Valor negativo baseCost: -50
    const negCost = await app.send("POST", "/api/admin/catalog/services", {
      token: admin.token,
      body: {
        name: "Limpeza de bicos injetores",
        category: "motor",
        intervalKm: 30000,
        baseCost: -50,
      },
    });
    assert.equal(negCost.status, 400);
    assert.ok(negCost.json.fields?.baseCost);

    // Veículo duplicado no catálogo (brand, model, year, fuel)
    const createCar = await app.send("POST", "/api/admin/catalog/vehicles", {
      token: admin.token,
      body: {
        brand: "Porsche",
        model: "911 Carrera",
        year: 2025,
        fuel: "Gasolina",
        category: "premium",
        costFactor: 2.4,
        referenceConsumption: 8.5,
      },
    });
    assert.equal(createCar.status, 201);

    const dupCar = await app.send("POST", "/api/admin/catalog/vehicles", {
      token: admin.token,
      body: {
        brand: "porsche",
        model: "911 carrera",
        year: 2025,
        fuel: "gasolina",
        category: "premium",
        costFactor: 2.5,
      },
    });
    assert.equal(dupCar.status, 409);
    assert.match(dupCar.json.error, /já existe no catálogo/i);
  } finally {
    await app.close();
  }
});

test("Cenário 6 (Bloqueio RBAC): usuário comum recebe 403 Forbidden e requisição sem token recebe 401 Unauthorized", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const regularUser = await app.registerUser("comum@exemplo.com", "Comum");

    // Sem token -> 401
    const unauthOverview = await app.send("GET", "/api/admin/overview");
    assert.equal(unauthOverview.status, 401);

    // Usuário role=user -> 403 em GET e POST
    const forbiddenOverview = await app.send("GET", "/api/admin/overview", {
      token: regularUser.token,
    });
    assert.equal(forbiddenOverview.status, 403);

    const forbiddenUserVehicles = await app.send(
      "GET",
      "/api/admin/user-vehicles",
      { token: regularUser.token },
    );
    assert.equal(forbiddenUserVehicles.status, 403);

    const forbiddenCreateService = await app.send(
      "POST",
      "/api/admin/catalog/services",
      {
        token: regularUser.token,
        body: {
          name: "Tentativa indevida",
          category: "motor",
          intervalKm: 10000,
          baseCost: 100,
        },
      },
    );
    assert.equal(forbiddenCreateService.status, 403);
  } finally {
    await app.close();
  }
});

test("RN-02 e RN-03: bloqueio de DELETE físico (405), imutabilidade de maintenance_logs antigos e limite de paginação <= 100", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const admin = await app.loginAdmin();
    const user = await app.registerUser("historico@exemplo.com", "Histórico");

    // DELETE físico nos catálogos retorna 405 Method Not Allowed
    const delVehicle = await app.send(
      "DELETE",
      "/api/admin/catalog/vehicles/cat-corolla-2022",
      { token: admin.token },
    );
    assert.equal(delVehicle.status, 405);
    assert.match(delVehicle.json.error, /PATCH/i);

    const delService = await app.send(
      "DELETE",
      "/api/admin/catalog/services/srv-oil",
      { token: admin.token },
    );
    assert.equal(delService.status, 405);
    assert.match(delService.json.error, /PATCH/i);

    // Paginação acima de 100 é rejeitada com 400
    const badLimit = await app.send(
      "GET",
      "/api/admin/catalog/vehicles?page=1&limit=101",
      { token: admin.token },
    );
    assert.equal(badLimit.status, 400);
    assert.ok(badLimit.json.fields?.limit);

    const maxLimitOk = await app.send(
      "GET",
      "/api/admin/catalog/vehicles?page=1&limit=100",
      { token: admin.token },
    );
    assert.equal(maxLimitOk.status, 200);
    assert.equal(maxLimitOk.json.pagination.limit, 100);

    // Imutabilidade histórica (RN-02): cria veículo e registra manutenção com custo atual
    const vehicleRes = await app.send("POST", "/api/user/vehicles", {
      token: user.token,
      body: {
        catalogVehicleId: "cat-corolla-2022",
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 30000,
      },
    });
    assert.equal(vehicleRes.status, 201);
    const vehicleId = vehicleRes.json.vehicle.id;

    const servicesList = await app.send("GET", "/api/admin/catalog/services", {
      token: admin.token,
    });
    const oilService = servicesList.json.items.find((s) =>
      s.name.toLowerCase().includes("óleo"),
    );
    assert.ok(oilService);

    const logRes = await app.send("POST", "/api/user/maintenance-logs", {
      token: user.token,
      body: {
        vehicleId,
        serviceId: oilService.id,
        performedKm: 30000,
        performedAt: "2026-11-20",
        paidCost: 310,
      },
    });
    assert.equal(logRes.status, 201);
    const originalEstimated = logRes.json.log.estimatedCost;
    const originalPaid = logRes.json.log.paidCost;

    // Admin altera drasticamente o baseCost do serviço
    const patchService = await app.send(
      "PATCH",
      `/api/admin/catalog/services/${oilService.id}`,
      {
        token: admin.token,
        body: { baseCost: 999 },
      },
    );
    assert.equal(patchService.status, 200);
    assert.equal(patchService.json.service.baseCost, 999);

    // Histórico gravado anteriormente permanece inalterado
    const logsAfter = await app.send(
      "GET",
      `/api/user/maintenance-logs?vehicleId=${vehicleId}`,
      { token: user.token },
    );
    assert.equal(logsAfter.status, 200);
    assert.equal(logsAfter.json.logs.length, 1);
    assert.equal(logsAfter.json.logs[0].paidCost, originalPaid);
    assert.equal(logsAfter.json.logs[0].estimatedCost, originalEstimated);
  } finally {
    await app.close();
  }
});
