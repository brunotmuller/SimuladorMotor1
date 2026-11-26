import assert from "node:assert/strict";
import { request } from "node:http";
import test from "node:test";
import { loadAuthConfig } from "../auth/config.mjs";
import { openAuthDatabase } from "../auth/db.mjs";
import { createAppServer } from "../index.mjs";

function createTestHarness({
  startTimeMs = Date.parse("2026-11-25T12:00:00.000Z"),
} = {}) {
  let currentNow = startTimeMs;
  const db = openAuthDatabase(":memory:");
  const config = loadAuthConfig({
    NODE_ENV: "test",
    AUTH_JWT_SECRET: "test-dashboard-secret-at-least-thirty-two-chars-99999",
    AUTH_DB_PATH: ":memory:",
  });

  const server = createAppServer({
    authDb: db,
    authConfig: config,
    now: () => currentNow,
    allowedOrigins: ["http://localhost:8081"],
  });

  async function start() {
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
      send,
      registerUser,
      advanceMs(ms) {
        currentNow += ms;
      },
      async close() {
        await new Promise((resolve) => server.close(resolve));
        db.close();
      },
    };
  }

  return { db, start };
}

test("Cenário 5 (Estado Vazio): novo usuário sem veículos recebe empty: true em GET /api/dashboard", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const { token } = await app.registerUser("novo@exemplo.com", "Novo Usuário");
    const res = await app.send("GET", "/api/dashboard", { token });

    assert.equal(res.status, 200);
    assert.equal(res.json.empty, true);
    assert.deepEqual(res.json.vehicles, []);
    assert.equal(res.json.activeVehicle, null);
    assert.equal(res.json.summary, null);
    assert.deepEqual(res.json.maintenances, []);
    assert.deepEqual(res.json.history, []);
  } finally {
    await app.close();
  }
});

test("Cenário 1 (Caminho Feliz): Dashboard carrega Toyota Corolla 2022 a 60.000 km com KPIs, serviços devidos e total", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const { token } = await app.registerUser("corolla@exemplo.com");

    const createRes = await app.send("POST", "/api/user/vehicles", {
      token,
      body: {
        catalogVehicleId: "cat-corolla-2022",
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        category: "medium_suv",
        fipePrice: "R$ 138.500",
        currentKm: 60000,
        lastRevisionMonths: 8,
      },
    });
    assert.equal(createRes.status, 201);

    const dash = await app.send("GET", "/api/dashboard", { token });
    assert.equal(dash.status, 200);
    assert.equal(dash.json.empty, false);
    assert.equal(dash.json.activeVehicle.brand, "Toyota");
    assert.equal(dash.json.activeVehicle.model, "Corolla");
    assert.equal(dash.json.activeVehicle.currentKm, 60000);
    assert.equal(dash.json.activeVehicle.fipePrice, "R$ 138.500");

    // Todos os 8 serviços do catálogo são aplicáveis a um carro Flex com 60.000 km
    assert.equal(dash.json.maintenances.length, 8);
    assert.equal(dash.json.summary.dueCount, 8);
    assert.equal(dash.json.summary.consumptionUnit, "km/L");

    // Preços devem ser múltiplos de 5 (roundToNearest5(baseCost * 1.22))
    let sumDue = 0;
    for (const item of dash.json.maintenances) {
      assert.equal(item.estimatedCost % 5, 0);
      if (item.dueNow) sumDue += item.estimatedCost;
    }
    assert.equal(dash.json.summary.totalDueCost, sumDue);
    assert.ok(sumDue > 0);
  } finally {
    await app.close();
  }
});

test("Cenário 2 (Múltiplos carros): alternar para BYD Dolphin elétrico a 20.000 km omite serviços combustionOnly", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const { token } = await app.registerUser("multi@exemplo.com");

    const corolla = await app.send("POST", "/api/user/vehicles", {
      token,
      body: {
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        currentKm: 60000,
      },
    });
    assert.equal(corolla.status, 201);

    const dolphin = await app.send("POST", "/api/user/vehicles", {
      token,
      body: {
        catalogVehicleId: "cat-dolphin-2024",
        brand: "BYD",
        model: "Dolphin",
        year: 2024,
        fuel: "Elétrico",
        category: "electric",
        currentKm: 20000,
      },
    });
    assert.equal(dolphin.status, 201);
    const dolphinId = dolphin.json.vehicle.id;
    const corollaId = corolla.json.vehicle.id;

    // Alterna para Corolla e depois seleciona Dolphin
    const selCorolla = await app.send(
      "POST",
      `/api/user/vehicles/${corollaId}/select`,
      { token },
    );
    assert.equal(selCorolla.status, 200);
    assert.equal(selCorolla.json.activeVehicle.id, corollaId);

    const selDolphin = await app.send(
      "POST",
      `/api/user/vehicles/${dolphinId}/select`,
      { token },
    );
    assert.equal(selDolphin.status, 200);
    assert.equal(selDolphin.json.activeVehicle.id, dolphinId);
    assert.equal(selDolphin.json.vehicles.length, 2);
    assert.equal(selDolphin.json.summary.consumptionUnit, "km/kWh");

    // Nenhum serviço combustionOnly (ex.: óleo ou velas) pode aparecer no elétrico
    const ids = selDolphin.json.maintenances.map((m) => m.serviceId);
    assert.equal(ids.includes("svc-oil"), false);
    assert.equal(ids.includes("svc-spark-plugs"), false);
    assert.equal(ids.includes("svc-air-fuel"), false);
    assert.equal(ids.includes("svc-timing-belt"), false);
    assert.equal(selDolphin.json.maintenances.length, 4);
    assert.equal(selDolphin.json.summary.nextMilestoneKm, 30000);
  } finally {
    await app.close();
  }
});

test("Cenário 3 (Registrar manutenção): marcar óleo a 60.000 km por R$ 420 recalcula para 70.000 km sem alterar catálogo", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const { token } = await app.registerUser("revisao@exemplo.com");

    const created = await app.send("POST", "/api/user/vehicles", {
      token,
      body: {
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 60000,
      },
    });
    const vehicleId = created.json.vehicle.id;
    const totalBefore = created.json.dashboard.summary.totalDueCost;

    const logRes = await app.send("POST", "/api/user/maintenance-logs", {
      token,
      body: {
        vehicleId,
        serviceId: "svc-oil",
        performedAt: "2026-11-25",
        performedKm: 60000,
        paidCost: 420,
        notes: "Óleo 0W20 sintético",
      },
    });

    assert.equal(logRes.status, 201);
    assert.equal(logRes.json.log.paidCost, 420);
    assert.equal(logRes.json.log.serviceId, "svc-oil");

    const oilAfter = logRes.json.dashboard.maintenances.find(
      (m) => m.serviceId === "svc-oil",
    );
    assert.equal(oilAfter.dueNow, false);
    assert.equal(oilAfter.urgency, "upcoming");
    assert.equal(oilAfter.nextDueKm, 70000);
    assert.ok(logRes.json.dashboard.summary.totalDueCost < totalBefore);

    // Catálogo global continua intacto (base_cost = 340)
    const serviceRow = harness.db
      .prepare("SELECT base_cost FROM catalog_services WHERE id = 'svc-oil'")
      .get();
    assert.equal(serviceRow.base_cost, 340);

    // RN-02: desativar serviço remove das recomendações futuras, mas mantém no histórico
    harness.db
      .prepare("UPDATE catalog_services SET active = 0 WHERE id = 'svc-oil'")
      .run();
    const afterDeactivate = await app.send("GET", "/api/dashboard", { token });
    assert.equal(
      afterDeactivate.json.maintenances.some((m) => m.serviceId === "svc-oil"),
      false,
    );
    assert.equal(
      afterDeactivate.json.history.some((h) => h.serviceId === "svc-oil"),
      true,
    );
  } finally {
    await app.close();
  }
});

test("Cenário 6 (Erros e Segurança): sem token -> 401, km -500 -> 400, veículo de terceiro -> 404", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    // Sem token -> 401
    const unauth = await app.send("GET", "/api/dashboard");
    assert.equal(unauth.status, 401);

    const userA = await app.registerUser("usera@exemplo.com", "User A");
    const userB = await app.registerUser("userb@exemplo.com", "User B");

    const carA = await app.send("POST", "/api/user/vehicles", {
      token: userA.token,
      body: {
        brand: "Jeep",
        model: "Compass",
        year: 2021,
        currentKm: 45000,
      },
    });
    const carAId = carA.json.vehicle.id;

    // KM negativo -> 400 Bad Request com campo
    const badKm = await app.send("PATCH", `/api/user/vehicles/${carAId}`, {
      token: userA.token,
      body: { currentKm: -500 },
    });
    assert.equal(badKm.status, 400);
    assert.ok(badKm.json.fields.currentKm);

    // Usuário B tentando editar, selecionar, deletar ou logar no carro de A -> 404
    const patchOther = await app.send("PATCH", `/api/user/vehicles/${carAId}`, {
      token: userB.token,
      body: { currentKm: 46000 },
    });
    assert.equal(patchOther.status, 404);

    const selectOther = await app.send(
      "POST",
      `/api/user/vehicles/${carAId}/select`,
      { token: userB.token },
    );
    assert.equal(selectOther.status, 404);

    const deleteOther = await app.send(
      "DELETE",
      `/api/user/vehicles/${carAId}`,
      { token: userB.token },
    );
    assert.equal(deleteOther.status, 404);

    const logOther = await app.send("POST", "/api/user/maintenance-logs", {
      token: userB.token,
      body: {
        vehicleId: carAId,
        serviceId: "svc-oil",
        performedAt: "2026-11-25",
        performedKm: 46000,
      },
    });
    assert.equal(logOther.status, 404);

    // Confirma que carro de A não foi alterado
    const dashA = await app.send("GET", "/api/dashboard", {
      token: userA.token,
    });
    assert.equal(dashA.json.activeVehicle.currentKm, 45000);
  } finally {
    await app.close();
  }
});

test("RN-01 e RN-04: regressão de KM exige confirmação (409 -> 200), limite de 20 carros (422) e soft delete promove próximo ativo", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const { token } = await app.registerUser("regras@exemplo.com");

    const first = await app.send("POST", "/api/user/vehicles", {
      token,
      body: { brand: "Chevrolet", model: "Onix", year: 2022, currentKm: 40000 },
    });
    const firstId = first.json.vehicle.id;

    // Regressão sem confirmação -> 409
    const regBlocked = await app.send("PATCH", `/api/user/vehicles/${firstId}`, {
      token,
      body: { currentKm: 35000 },
    });
    assert.equal(regBlocked.status, 409);
    assert.equal(regBlocked.json.requiresKmRegressionConfirmation, true);

    // Regressão com confirmação -> 200
    const regOk = await app.send("PATCH", `/api/user/vehicles/${firstId}`, {
      token,
      body: { currentKm: 35000, confirmKmRegression: true },
    });
    assert.equal(regOk.status, 200);
    assert.equal(regOk.json.vehicle.currentKm, 35000);

    // Cadastra mais 19 veículos (total 20)
    let lastId = firstId;
    for (let i = 2; i <= 20; i += 1) {
      const res = await app.send("POST", "/api/user/vehicles", {
        token,
        body: {
          brand: "Fiat",
          model: `Modelo ${i}`,
          year: 2022,
          currentKm: i * 1000,
        },
      });
      assert.equal(res.status, 201);
      lastId = res.json.vehicle.id;
    }

    // 21º veículo deve retornar 422
    const overflow = await app.send("POST", "/api/user/vehicles", {
      token,
      body: { brand: "Fiat", model: "Modelo 21", year: 2022, currentKm: 1000 },
    });
    assert.equal(overflow.status, 422);

    // Soft delete do ativo promove outro automaticamente e libera vaga
    const delRes = await app.send("DELETE", `/api/user/vehicles/${lastId}`, {
      token,
    });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.json.deletedId, lastId);
    assert.ok(delRes.json.nextActiveVehicleId);
    assert.equal(delRes.json.dashboard.vehicles.length, 19);

    // Catálogo interno disponível para fallback sem FIPE
    const catRes = await app.send("GET", "/api/catalog/vehicles?search=corolla", {
      token,
    });
    assert.equal(catRes.status, 200);
    assert.ok(catRes.json.vehicles.some((v) => v.model === "Corolla"));
  } finally {
    await app.close();
  }
});

test("Histórico de revisão inicial (lastRevisionKm): carro com 73.000 km e última revisão aos 70.000 km não marca atraso falso de 63.000 km", async () => {
  const harness = createTestHarness();
  const app = await harness.start();
  try {
    const { token } = await app.registerUser("revisao70k@exemplo.com");

    // 1) Carro 73.000 km com revisões em dia até 70.000 km -> 0 atrasadas, próximo óleo aos 80.000 km
    const createOk = await app.send("POST", "/api/user/vehicles", {
      token,
      body: {
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 73000,
        lastRevisionKm: 70000,
        lastRevisionMonths: 3,
      },
    });
    assert.equal(createOk.status, 201);
    assert.equal(createOk.json.vehicle.lastRevisionKm, 70000);
    assert.equal(createOk.json.dashboard.summary.dueCount, 0);

    const oilOk = createOk.json.dashboard.maintenances.find(
      (m) => m.serviceId === "svc-oil",
    );
    assert.ok(oilOk);
    assert.equal(oilOk.dueNow, false);
    assert.equal(oilOk.overdueKm, 0);
    assert.equal(oilOk.nextDueKm, 80000);

    const beltOk = createOk.json.dashboard.maintenances.find(
      (m) => m.serviceId === "svc-timing-belt",
    );
    assert.ok(beltOk);
    assert.equal(beltOk.dueNow, false);
    assert.equal(beltOk.nextDueKm, 120000);

    // 2) Atualizar última revisão para 60.000 km -> óleo atrasado em apenas 3.000 km (não 63.000 km)
    const patch60k = await app.send(
      "PATCH",
      `/api/user/vehicles/${createOk.json.vehicle.id}`,
      {
        token,
        body: { lastRevisionKm: 60000 },
      },
    );
    assert.equal(patch60k.status, 200);
    const oil60k = patch60k.json.dashboard.maintenances.find(
      (m) => m.serviceId === "svc-oil",
    );
    assert.equal(oil60k.dueNow, true);
    assert.equal(oil60k.overdueKm, 3000);
    assert.equal(oil60k.nextDueKm, 70000);

    // 3) Carro com 55.000 km e última revisão aos 50.000 km -> correia de 60.000 km ainda vence aos 60.000 km
    const create55k = await app.send("POST", "/api/user/vehicles", {
      token,
      body: {
        brand: "Honda",
        model: "Civic",
        year: 2021,
        fuel: "Flex",
        currentKm: 55000,
        lastRevisionKm: 50000,
        lastRevisionMonths: 2,
      },
    });
    assert.equal(create55k.status, 201);
    const belt55k = create55k.json.dashboard.maintenances.find(
      (m) => m.serviceId === "svc-timing-belt",
    );
    assert.equal(belt55k.dueNow, false);
    assert.equal(belt55k.nextDueKm, 60000);

    // 4) Validação: lastRevisionKm > currentKm retorna 400
    const badRev = await app.send("POST", "/api/user/vehicles", {
      token,
      body: {
        brand: "Fiat",
        model: "Argo",
        year: 2022,
        currentKm: 40000,
        lastRevisionKm: 50000,
      },
    });
    assert.equal(badRev.status, 400);
    assert.ok(badRev.json.fields?.lastRevisionKm);
  } finally {
    await app.close();
  }
});
