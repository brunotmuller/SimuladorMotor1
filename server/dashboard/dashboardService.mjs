import { randomUUID } from "node:crypto";
import {
  evaluateVehicleMaintenances,
  inferVehicleCategory,
  roundToNearest5,
} from "./maintenanceEngine.mjs";
import {
  validateCreateMaintenanceLogPayload,
  validateCreateVehiclePayload,
  validateUpdateVehiclePayload,
} from "./validators.mjs";

export const MAX_ACTIVE_VEHICLES = 20;

export class DashboardError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = "DashboardError";
    this.status = status;
    if (options.fields !== undefined) {
      this.fields = options.fields;
    }
    if (options.requiresKmRegressionConfirmation !== undefined) {
      this.requiresKmRegressionConfirmation =
        options.requiresKmRegressionConfirmation;
    }
  }
}

export function toCatalogVehicle(row) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    fuel: row.fuel,
    category: row.category,
    costFactor: row.cost_factor,
    referenceConsumption: row.reference_consumption,
    fipePrice: row.fipe_price ?? null,
    active: Boolean(row.active),
  };
}

export function toUserVehicle(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    catalogVehicleId: row.catalog_vehicle_id ?? null,
    nickname: row.nickname ?? null,
    brand: row.brand,
    model: row.model,
    year: row.year,
    version: row.version ?? null,
    fuel: row.fuel,
    category: row.category,
    costFactor: row.cost_factor,
    plate: row.plate ?? null,
    fipePrice: row.fipe_price ?? null,
    fipeCode: row.fipe_code ?? null,
    fipeCached: Boolean(row.fipe_cached),
    currentKm: row.current_km,
    lastRevisionMonths: row.last_revision_months,
    healthScore: row.health_score,
    estimatedConsumption: row.estimated_consumption,
    isActive: Boolean(row.is_active),
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMaintenanceLog(row) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    ownerId: row.owner_id,
    serviceId: row.service_id ?? null,
    serviceName: row.service_name,
    performedAt: row.performed_at,
    performedKm: row.performed_km,
    paidCost: row.paid_cost ?? null,
    estimatedCost: row.estimated_cost,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  };
}

function runInTransaction(db, work) {
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore rollback errors if transaction is already closed.
    }
    throw error;
  }
}

export function createDashboardService({ db, now = () => Date.now() }) {
  if (!db) {
    throw new TypeError("Instância de banco de dados (db) é obrigatória.");
  }

  function listCatalogVehicles({ search = "", category = "" } = {}) {
    const conditions = ["active = 1"];
    const params = [];

    const normalizedCategory =
      typeof category === "string" ? category.trim() : "";
    if (normalizedCategory) {
      conditions.push("category = ?");
      params.push(normalizedCategory);
    }

    const normalizedSearch =
      typeof search === "string" ? search.trim().toLowerCase() : "";
    if (normalizedSearch) {
      conditions.push("LOWER(brand || ' ' || model) LIKE ?");
      params.push(`%${normalizedSearch}%`);
    }

    const sql = `
      SELECT *
      FROM catalog_vehicles
      WHERE ${conditions.join(" AND ")}
      ORDER BY brand ASC, model ASC, year DESC
    `;

    return db.prepare(sql).all(...params).map(toCatalogVehicle);
  }

  function listUserVehicles(ownerId) {
    const rows = db
      .prepare(
        `SELECT *
        FROM user_vehicles
        WHERE owner_id = ? AND deleted_at IS NULL
        ORDER BY is_active DESC, updated_at DESC, created_at DESC`,
      )
      .all(ownerId);

    return rows.map(toUserVehicle);
  }

  function getOwnedVehicleRow(ownerId, vehicleId) {
    if (typeof vehicleId !== "string" || vehicleId.trim() === "") {
      return null;
    }
    return db
      .prepare(
        `SELECT *
        FROM user_vehicles
        WHERE id = ? AND owner_id = ? AND deleted_at IS NULL
        LIMIT 1`,
      )
      .get(vehicleId.trim(), ownerId);
  }

  function getDashboard(ownerId, { vehicleId = null } = {}) {
    const vehicles = listUserVehicles(ownerId);

    if (vehicles.length === 0) {
      if (vehicleId) {
        throw new DashboardError(404, "Veículo não encontrado.");
      }
      return {
        empty: true,
        vehicles: [],
        activeVehicle: null,
        summary: null,
        maintenances: [],
        history: [],
      };
    }

    let activeVehicle;
    if (vehicleId) {
      activeVehicle = vehicles.find((item) => item.id === vehicleId) ?? null;
      if (!activeVehicle) {
        throw new DashboardError(404, "Veículo não encontrado.");
      }
    } else {
      activeVehicle = vehicles.find((item) => item.isActive) ?? vehicles[0];
    }

    const activeServices = db
      .prepare("SELECT * FROM catalog_services WHERE active = 1")
      .all();

    const logRows = db
      .prepare(
        `SELECT *
        FROM maintenance_logs
        WHERE vehicle_id = ? AND owner_id = ?
        ORDER BY performed_at DESC, created_at DESC`,
      )
      .all(activeVehicle.id, ownerId);

    const history = logRows.map(toMaintenanceLog);
    const { items, summary } = evaluateVehicleMaintenances(
      activeVehicle,
      activeServices,
      history,
      new Date(now()),
    );

    return {
      empty: false,
      vehicles,
      activeVehicle,
      summary,
      maintenances: items,
      history,
    };
  }

  function createVehicle(ownerId, payload) {
    const validation = validateCreateVehiclePayload(payload);
    if (!validation.valid) {
      throw new DashboardError(400, "Dados do veículo inválidos.", {
        fields: validation.fields,
      });
    }

    const activeCountRow = db
      .prepare(
        `SELECT COUNT(*) AS count
        FROM user_vehicles
        WHERE owner_id = ? AND deleted_at IS NULL`,
      )
      .get(ownerId);

    if (Number(activeCountRow?.count ?? 0) >= MAX_ACTIVE_VEHICLES) {
      throw new DashboardError(
        422,
        `Limite máximo de ${MAX_ACTIVE_VEHICLES} veículos ativos por conta atingido.`,
      );
    }

    const { data } = validation;
    let catalogRow = null;
    if (data.catalogVehicleId) {
      catalogRow = db
        .prepare(
          "SELECT * FROM catalog_vehicles WHERE id = ? AND active = 1 LIMIT 1",
        )
        .get(data.catalogVehicleId);
      if (!catalogRow) {
        throw new DashboardError(400, "Veículo de catálogo inválido.", {
          fields: {
            catalogVehicleId: "Veículo de catálogo não encontrado.",
          },
        });
      }
    }

    const inferred = inferVehicleCategory({
      category: data.category ?? catalogRow?.category,
      fuel: data.fuel,
      brand: data.brand,
      model: data.model,
    });

    const finalCategory = inferred.category;
    const finalCostFactor =
      catalogRow && finalCategory === catalogRow.category
        ? catalogRow.cost_factor
        : inferred.costFactor;
    const finalFipePrice = data.fipePrice ?? catalogRow?.fipe_price ?? null;
    const finalConsumption =
      data.estimatedConsumption ??
      catalogRow?.reference_consumption ??
      (finalCategory === "electric" ? 6.0 : 11.5);
    const finalHealthScore = data.healthScore ?? 85;

    const id = randomUUID();
    const nowIso = new Date(now()).toISOString();

    runInTransaction(db, () => {
      db.prepare(
        `UPDATE user_vehicles
        SET is_active = 0, updated_at = ?
        WHERE owner_id = ? AND deleted_at IS NULL AND is_active = 1`,
      ).run(nowIso, ownerId);

      db.prepare(
        `INSERT INTO user_vehicles (
          id,
          owner_id,
          catalog_vehicle_id,
          nickname,
          brand,
          model,
          year,
          version,
          fuel,
          category,
          cost_factor,
          plate,
          fipe_price,
          fipe_code,
          fipe_cached,
          current_km,
          last_revision_months,
          health_score,
          estimated_consumption,
          is_active,
          is_demo,
          deleted_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, ?, ?)`,
      ).run(
        id,
        ownerId,
        catalogRow ? catalogRow.id : null,
        data.nickname,
        data.brand,
        data.model,
        data.year,
        data.version,
        data.fuel,
        finalCategory,
        finalCostFactor,
        data.plate,
        finalFipePrice,
        data.fipeCode,
        data.fipeCached ? 1 : 0,
        data.currentKm,
        data.lastRevisionMonths,
        finalHealthScore,
        finalConsumption,
        data.isDemo ? 1 : 0,
        nowIso,
        nowIso,
      );
    });

    const createdRow = getOwnedVehicleRow(ownerId, id);
    const vehicle = toUserVehicle(createdRow);
    const dashboard = getDashboard(ownerId, { vehicleId: id });

    return { vehicle, dashboard };
  }

  function updateVehicle(ownerId, vehicleId, payload) {
    const validation = validateUpdateVehiclePayload(payload);
    if (!validation.valid) {
      throw new DashboardError(400, "Dados de atualização inválidos.", {
        fields: validation.fields,
      });
    }

    const existing = getOwnedVehicleRow(ownerId, vehicleId);
    if (!existing) {
      throw new DashboardError(404, "Veículo não encontrado.");
    }

    const { data } = validation;

    if (
      data.currentKm !== undefined &&
      data.currentKm < existing.current_km &&
      !data.confirmKmRegression
    ) {
      throw new DashboardError(
        409,
        "A nova quilometragem é menor que a atual. Confirme a correção antes de salvar.",
        { requiresKmRegressionConfirmation: true },
      );
    }

    const nextBrand = data.brand !== undefined ? data.brand : existing.brand;
    const nextModel = data.model !== undefined ? data.model : existing.model;
    const nextYear = data.year !== undefined ? data.year : existing.year;
    const nextFuel = data.fuel !== undefined ? data.fuel : existing.fuel;

    let nextCategory = existing.category;
    let nextCostFactor = existing.cost_factor;

    if (data.category !== undefined) {
      const inferred = inferVehicleCategory({ category: data.category });
      nextCategory = inferred.category;
      nextCostFactor = inferred.costFactor;
    } else if (
      data.fuel !== undefined ||
      data.brand !== undefined ||
      data.model !== undefined
    ) {
      const inferred = inferVehicleCategory({
        fuel: nextFuel,
        brand: nextBrand,
        model: nextModel,
      });
      nextCategory = inferred.category;
      nextCostFactor = inferred.costFactor;
    }

    const nextNickname =
      data.nickname !== undefined ? data.nickname : existing.nickname;
    const nextVersion =
      data.version !== undefined ? data.version : existing.version;
    const nextPlate = data.plate !== undefined ? data.plate : existing.plate;
    const nextFipePrice =
      data.fipePrice !== undefined ? data.fipePrice : existing.fipe_price;
    const nextFipeCode =
      data.fipeCode !== undefined ? data.fipeCode : existing.fipe_code;
    const nextFipeCached =
      data.fipeCached !== undefined
        ? data.fipeCached
          ? 1
          : 0
        : existing.fipe_cached;
    const nextCurrentKm =
      data.currentKm !== undefined ? data.currentKm : existing.current_km;
    const nextLastRevisionMonths =
      data.lastRevisionMonths !== undefined
        ? data.lastRevisionMonths
        : existing.last_revision_months;
    const nextHealthScore =
      data.healthScore !== undefined ? data.healthScore : existing.health_score;
    const nextEstimatedConsumption =
      data.estimatedConsumption !== undefined
        ? data.estimatedConsumption
        : existing.estimated_consumption;

    const nowIso = new Date(now()).toISOString();

    db.prepare(
      `UPDATE user_vehicles
      SET
        nickname = ?,
        brand = ?,
        model = ?,
        year = ?,
        version = ?,
        fuel = ?,
        category = ?,
        cost_factor = ?,
        plate = ?,
        fipe_price = ?,
        fipe_code = ?,
        fipe_cached = ?,
        current_km = ?,
        last_revision_months = ?,
        health_score = ?,
        estimated_consumption = ?,
        updated_at = ?
      WHERE id = ? AND owner_id = ? AND deleted_at IS NULL`,
    ).run(
      nextNickname,
      nextBrand,
      nextModel,
      nextYear,
      nextVersion,
      nextFuel,
      nextCategory,
      nextCostFactor,
      nextPlate,
      nextFipePrice,
      nextFipeCode,
      nextFipeCached,
      nextCurrentKm,
      nextLastRevisionMonths,
      nextHealthScore,
      nextEstimatedConsumption,
      nowIso,
      existing.id,
      ownerId,
    );

    const updatedRow = getOwnedVehicleRow(ownerId, existing.id);
    const vehicle = toUserVehicle(updatedRow);
    const dashboard = getDashboard(ownerId, { vehicleId: existing.id });

    return { vehicle, dashboard };
  }

  function selectActiveVehicle(ownerId, vehicleId) {
    const existing = getOwnedVehicleRow(ownerId, vehicleId);
    if (!existing) {
      throw new DashboardError(404, "Veículo não encontrado.");
    }

    const nowIso = new Date(now()).toISOString();

    runInTransaction(db, () => {
      db.prepare(
        `UPDATE user_vehicles
        SET is_active = 0
        WHERE owner_id = ? AND deleted_at IS NULL AND is_active = 1`,
      ).run(ownerId);

      db.prepare(
        `UPDATE user_vehicles
        SET is_active = 1, updated_at = ?
        WHERE id = ? AND owner_id = ? AND deleted_at IS NULL`,
      ).run(nowIso, existing.id, ownerId);
    });

    return getDashboard(ownerId, { vehicleId: existing.id });
  }

  function deleteVehicle(ownerId, vehicleId) {
    const existing = getOwnedVehicleRow(ownerId, vehicleId);
    if (!existing) {
      throw new DashboardError(404, "Veículo não encontrado.");
    }

    const nowIso = new Date(now()).toISOString();

    const nextActiveVehicleId = runInTransaction(db, () => {
      db.prepare(
        `UPDATE user_vehicles
        SET deleted_at = ?, is_active = 0, updated_at = ?
        WHERE id = ? AND owner_id = ? AND deleted_at IS NULL`,
      ).run(nowIso, nowIso, existing.id, ownerId);

      if (existing.is_active === 1) {
        const nextCandidate = db
          .prepare(
            `SELECT id
            FROM user_vehicles
            WHERE owner_id = ? AND deleted_at IS NULL
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1`,
          )
          .get(ownerId);

        if (nextCandidate) {
          db.prepare(
            `UPDATE user_vehicles
            SET is_active = 1, updated_at = ?
            WHERE id = ? AND owner_id = ? AND deleted_at IS NULL`,
          ).run(nowIso, nextCandidate.id, ownerId);
          return nextCandidate.id;
        }
        return null;
      }

      const currentActive = db
        .prepare(
          `SELECT id
          FROM user_vehicles
          WHERE owner_id = ? AND deleted_at IS NULL AND is_active = 1
          LIMIT 1`,
        )
        .get(ownerId);

      return currentActive?.id ?? null;
    });

    return {
      deletedId: existing.id,
      nextActiveVehicleId,
      dashboard: getDashboard(ownerId),
    };
  }

  function createMaintenanceLog(ownerId, payload) {
    const validation = validateCreateMaintenanceLogPayload(payload);
    if (!validation.valid) {
      throw new DashboardError(400, "Dados do registro de manutenção inválidos.", {
        fields: validation.fields,
      });
    }

    const { data } = validation;
    const vehicle = getOwnedVehicleRow(ownerId, data.vehicleId);
    if (!vehicle) {
      throw new DashboardError(404, "Veículo não encontrado.");
    }

    const service = db
      .prepare(
        "SELECT * FROM catalog_services WHERE id = ? AND active = 1 LIMIT 1",
      )
      .get(data.serviceId);
    if (!service) {
      throw new DashboardError(
        404,
        "Serviço não encontrado ou indisponível no catálogo.",
      );
    }

    const estimatedCost = roundToNearest5(
      Number(service.base_cost) * Number(vehicle.cost_factor),
    );
    const logId = randomUUID();
    const nowIso = new Date(now()).toISOString();

    runInTransaction(db, () => {
      db.prepare(
        `INSERT INTO maintenance_logs (
          id,
          vehicle_id,
          owner_id,
          service_id,
          service_name,
          performed_at,
          performed_km,
          paid_cost,
          estimated_cost,
          notes,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        logId,
        vehicle.id,
        ownerId,
        service.id,
        service.name,
        data.performedAt,
        data.performedKm,
        data.paidCost,
        estimatedCost,
        data.notes,
        nowIso,
      );

      if (data.performedKm > vehicle.current_km) {
        db.prepare(
          `UPDATE user_vehicles
          SET current_km = ?, updated_at = ?
          WHERE id = ? AND owner_id = ? AND deleted_at IS NULL`,
        ).run(data.performedKm, nowIso, vehicle.id, ownerId);
      }
    });

    const logRow = db
      .prepare("SELECT * FROM maintenance_logs WHERE id = ? LIMIT 1")
      .get(logId);
    const log = toMaintenanceLog(logRow);
    const dashboard = getDashboard(ownerId, { vehicleId: vehicle.id });

    return { log, dashboard };
  }

  function listMaintenanceLogs(ownerId, vehicleId = null) {
    if (vehicleId) {
      const vehicle = getOwnedVehicleRow(ownerId, vehicleId);
      if (!vehicle) {
        throw new DashboardError(404, "Veículo não encontrado.");
      }
      return db
        .prepare(
          `SELECT *
          FROM maintenance_logs
          WHERE vehicle_id = ? AND owner_id = ?
          ORDER BY performed_at DESC, created_at DESC`,
        )
        .all(vehicle.id, ownerId)
        .map(toMaintenanceLog);
    }

    return db
      .prepare(
        `SELECT ml.*
        FROM maintenance_logs ml
        INNER JOIN user_vehicles uv ON uv.id = ml.vehicle_id
        WHERE ml.owner_id = ? AND uv.deleted_at IS NULL
        ORDER BY ml.performed_at DESC, ml.created_at DESC`,
      )
      .all(ownerId)
      .map(toMaintenanceLog);
  }

  return {
    listCatalogVehicles,
    listUserVehicles,
    getDashboard,
    createVehicle,
    updateVehicle,
    selectActiveVehicle,
    deleteVehicle,
    createMaintenanceLog,
    listMaintenanceLogs,
  };
}
