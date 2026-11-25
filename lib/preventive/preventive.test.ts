import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_VEHICLES, MAINTENANCE_CATALOG } from "./catalog";
import {
  createCustomVehicle,
  createVehicleFromDemo,
  evaluateMaintenanceItem,
  evaluateVehicleHealth,
  recordMaintenanceCompletion,
  validateKmUpdate,
} from "./engine";
import {
  KeyValueStorageAdapter,
  loadPreventiveStoreWithAdapter,
  savePreventiveStoreWithAdapter,
} from "./storageCore";

function createMemoryAdapter(): KeyValueStorageAdapter {
  const map = new Map<string, string>();
  return {
    async getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}

test("Catálogo contém os 10 modelos populares brasileiros e os 6 itens obrigatórios", () => {
  const requiredModels = [
    "Onix",
    "HB20",
    "Corolla",
    "Gol",
    "Argo",
    "Polo",
    "Compass",
    "Creta",
    "HR-V",
    "Strada",
  ];
  for (const model of requiredModels) {
    assert.ok(
      DEMO_VEHICLES.some((v) => v.model === model),
      `Modelo popular ausente: ${model}`
    );
  }
  assert.equal(MAINTENANCE_CATALOG.length, 6);
  for (const item of MAINTENANCE_CATALOG) {
    assert.ok(item.guide.whatIsIt.length > 20);
    assert.ok(item.guide.whereToResolve.length >= 2);
    assert.ok(item.guide.avoidScams.length >= 2);
    assert.ok(item.guide.whenToWorry.length >= 2);
  }
});

test("Cadastro de veículo novo inicia todos os itens em dia (verde) sem inventar PSI oficial", () => {
  const refDate = new Date(2026, 10, 25, 12, 0, 0);
  const vehicle = createCustomVehicle({
    brand: "Toyota",
    model: "Corolla",
    year: 2023,
    version: "2.0 XEi",
    currentKm: 35000,
    monthlyUsage: "normal",
    referenceDate: refDate,
  });

  assert.equal(vehicle.brand, "Toyota");
  assert.equal(vehicle.currentKm, 35000);
  assert.equal(vehicle.tirePressure, null);

  const summary = evaluateVehicleHealth(vehicle, refDate);
  assert.equal(summary.greenCount, 6);
  assert.equal(summary.yellowCount, 0);
  assert.equal(summary.redCount, 0);
});

test("Atualização de quilometragem valida corretamente e bloqueia valores menores que o último registro", () => {
  const invalidLower = validateKmUpdate(42800, "42000");
  assert.equal(invalidLower.valid, false);

  const invalidEmpty = validateKmUpdate(42800, "");
  assert.equal(invalidEmpty.valid, false);

  const validSame = validateKmUpdate(42800, "42800");
  assert.equal(validSame.valid, true);

  const validHigher = validateKmUpdate(42800, "45500");
  assert.equal(validHigher.valid, true);
  if (validHigher.valid) {
    assert.equal(validHigher.km, 45500);
  }
});

test("Manutenção próxima do vencimento fica AMARELA (por KM e por tempo)", () => {
  const refDate = new Date(2026, 10, 25, 12, 0, 0);
  const oilDef = MAINTENANCE_CATALOG.find((i) => i.id === "engine_oil")!;
  const tireDef = MAINTENANCE_CATALOG.find((i) => i.id === "tire_pressure")!;

  const oilEval = evaluateMaintenanceItem(
    oilDef,
    { lastDoneDate: "2026-08-01", lastDoneKm: 40000 },
    { currentKm: 48600, monthlyUsage: "normal", customIntervals: {} },
    refDate
  );
  assert.equal(oilEval.status, "yellow");
  assert.equal(oilEval.kmRemaining, 1400);

  const tireEval = evaluateMaintenanceItem(
    tireDef,
    { lastDoneDate: "2026-11-12", lastDoneKm: 48200 },
    { currentKm: 48600, monthlyUsage: "normal", customIntervals: {} },
    refDate
  );
  assert.equal(tireEval.status, "yellow");
  assert.equal(tireEval.daysRemaining, 2);
});

test("Manutenção vencida por quilometragem fica VERMELHA mesmo dentro do prazo de tempo", () => {
  const refDate = new Date(2026, 10, 25, 12, 0, 0);
  const oilDef = MAINTENANCE_CATALOG.find((i) => i.id === "engine_oil")!;

  const oilEval = evaluateMaintenanceItem(
    oilDef,
    { lastDoneDate: "2026-06-01", lastDoneKm: 40000 },
    { currentKm: 50400, monthlyUsage: "intenso", customIntervals: {} },
    refDate
  );

  assert.equal(oilEval.status, "red");
  assert.equal(oilEval.limitingTrigger, "km");
  assert.equal(oilEval.kmRemaining, -400);
  assert.equal(oilEval.progressPercent, 100);
});

test("Manutenção vencida por tempo fica VERMELHA mesmo com KM abaixo do limite (primeiro limite atingido)", () => {
  const refDate = new Date(2026, 10, 25, 12, 0, 0);
  const oilDef = MAINTENANCE_CATALOG.find((i) => i.id === "engine_oil")!;
  const tireDef = MAINTENANCE_CATALOG.find((i) => i.id === "tire_pressure")!;

  // Óleo rodou apenas 3.500 km, mas completou mais de 12 meses
  const oilByTime = evaluateMaintenanceItem(
    oilDef,
    { lastDoneDate: "2025-11-10", lastDoneKm: 40000 },
    { currentKm: 43500, monthlyUsage: "pouco", customIntervals: {} },
    refDate
  );
  assert.equal(oilByTime.status, "red");
  assert.equal(oilByTime.limitingTrigger, "time");
  assert.ok((oilByTime.daysRemaining ?? 0) < 0);

  // Calibragem passou de 15 dias
  const tireByTime = evaluateMaintenanceItem(
    tireDef,
    { lastDoneDate: "2026-11-05", lastDoneKm: 43200 },
    { currentKm: 43500, monthlyUsage: "pouco", customIntervals: {} },
    refDate
  );
  assert.equal(tireByTime.status, "red");
  assert.equal(tireByTime.limitingTrigger, "time");
});

test("Estimativa de uso mensal altera a data aproximada de próxima manutenção", () => {
  const refDate = new Date(2026, 10, 25, 12, 0, 0);
  const brakeDef = MAINTENANCE_CATALOG.find((i) => i.id === "brake_pads")!;

  const lowUsage = evaluateMaintenanceItem(
    brakeDef,
    { lastDoneDate: "2026-10-01", lastDoneKm: 40000 },
    { currentKm: 45000, monthlyUsage: "pouco", customIntervals: {} },
    refDate
  );
  const highUsage = evaluateMaintenanceItem(
    brakeDef,
    { lastDoneDate: "2026-10-01", lastDoneKm: 40000 },
    { currentKm: 45000, monthlyUsage: "intenso", customIntervals: {} },
    refDate
  );

  assert.ok(lowUsage.nextDueDate && highUsage.nextDueDate);
  assert.ok(highUsage.nextDueDate < lowUsage.nextDueDate);
});

test("Registrar 'Já fiz essa troca' volta status para VERDE, zera barra, calcula próxima previsão e salva no histórico ordenado", () => {
  const refDate = new Date(2026, 10, 25, 12, 0, 0);
  const base = createVehicleFromDemo(DEMO_VEHICLES[1], {
    referenceDate: refDate,
  });

  // Antes da troca, óleo do HB20 demo está vencido por KM
  const before = evaluateVehicleHealth(base, refDate).items.find(
    (i) => i.definition.id === "engine_oil"
  )!;
  assert.equal(before.status, "red");

  const step1 = recordMaintenanceCompletion(base, "engine_oil", {
    performedDate: "2026-11-25",
    performedKm: base.currentKm,
    notes: "Óleo 5W30 sintético",
    referenceDate: refDate,
  });

  const after = evaluateVehicleHealth(step1.vehicle, refDate).items.find(
    (i) => i.definition.id === "engine_oil"
  )!;
  assert.equal(after.status, "green");
  assert.equal(after.progressPercent, 0);
  assert.equal(after.nextDueKm, base.currentKm + 10000);
  assert.equal(step1.vehicle.history.length, 1);
  assert.equal(step1.historyEntry.serviceName, "Óleo do motor e filtro de óleo");

  // Segundo registro com data anterior garante ordenação cronológica sem perder o anterior
  const step2 = recordMaintenanceCompletion(step1.vehicle, "tire_pressure", {
    performedDate: "2026-11-20",
    performedKm: base.currentKm - 100,
    referenceDate: refDate,
  });

  assert.equal(step2.vehicle.history.length, 2);
  assert.equal(step2.vehicle.history[0].performedDate, "2026-11-25");
  assert.equal(step2.vehicle.history[1].performedDate, "2026-11-20");
});

test("Persistência preserva veículos, KM, histórico e separa dados por usuário após reload", async () => {
  const adapter = createMemoryAdapter();
  const refDate = new Date(2026, 10, 25, 12, 0, 0);

  const carA = createCustomVehicle({
    ownerId: "user-a",
    brand: "Volkswagen",
    model: "Polo",
    year: 2023,
    version: "1.0 TSI",
    currentKm: 28000,
    monthlyUsage: "frequente",
    referenceDate: refDate,
  });
  const { vehicle: carAWithHistory } = recordMaintenanceCompletion(
    carA,
    "alignment_balancing",
    {
      performedDate: "2026-11-25",
      performedKm: 28000,
      referenceDate: refDate,
    }
  );

  const savedOk = await savePreventiveStoreWithAdapter(
    {
      version: 1,
      ownerId: "user-a",
      activeVehicleId: carAWithHistory.id,
      vehicles: [carAWithHistory],
    },
    adapter
  );
  assert.equal(savedOk, true);

  // Simula recarregamento da página para user-a
  const reloadedA = await loadPreventiveStoreWithAdapter("user-a", adapter);
  assert.equal(reloadedA.vehicles.length, 1);
  assert.equal(reloadedA.activeVehicleId, carAWithHistory.id);
  assert.equal(reloadedA.vehicles[0].currentKm, 28000);
  assert.equal(reloadedA.vehicles[0].history.length, 1);

  // Garante isolamento para outro usuário (user-b)
  const reloadedB = await loadPreventiveStoreWithAdapter("user-b", adapter);
  assert.equal(reloadedB.vehicles.length, 0);
});
