import { randomUUID } from "node:crypto";
import { ensureDatabaseAdapter } from "../db/adapter.mjs";
import {
  validateCreateCatalogService,
  validateCreateCatalogVehicle,
  validateUpdateCatalogService,
  validateUpdateCatalogVehicle,
} from "./validators.mjs";

const THIRTY_DAYS_MS = 30 * 86_400_000;

export class AdminError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = "AdminError";
    this.status = status;
    if (options.fields !== undefined) {
      this.fields = options.fields;
    }
  }
}

export function maskEmail(email) {
  if (typeof email !== "string") {
    return "***";
  }
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return "***";
  }
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  return `${local[0]}***@${domain}`;
}

function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function toAdminUserVehicle(row) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    version: row.version ?? null,
    nickname: row.nickname ?? null,
    currentKm: row.current_km,
    category: row.category,
    fuel: row.fuel,
    ownerName: row.owner_name,
    ownerEmailMasked: maskEmail(row.owner_email),
    createdAt: row.created_at,
  };
}

function toAdminCatalogVehicle(row) {
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
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAdminCatalogService(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    intervalKm: row.interval_km,
    intervalMonths: row.interval_months ?? null,
    baseCost: row.base_cost,
    combustionOnly: Boolean(row.combustion_only),
    notes: row.notes ?? null,
    active: Boolean(row.active),
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUniqueConstraintError(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    message.includes("UNIQUE constraint failed") ||
    error?.errstr?.includes?.("UNIQUE constraint failed")
  );
}

export function createAdminService({ db, now = () => Date.now() }) {
  if (!db) {
    throw new TypeError("Instância de banco de dados (db) é obrigatória.");
  }

  const adapter = ensureDatabaseAdapter(db);

  async function getOverview() {
    const currentNow = now();
    const generatedAt = new Date(currentNow).toISOString();
    const thirtyDaysAgoIso = new Date(currentNow - THIRTY_DAYS_MS).toISOString();

    const userStats = await adapter.get(
      `SELECT
        COALESCE(SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END), 0) AS total,
        COALESCE(SUM(CASE WHEN role = 'user' AND status = 'active' THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN role = 'user' AND created_at >= ? THEN 1 ELSE 0 END), 0) AS new_last_30_days,
        COALESCE(SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END), 0) AS admin_count
      FROM users`,
      [thirtyDaysAgoIso],
    );

    const catalogVehicleStats = await adapter.get(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END), 0) AS inactive
      FROM catalog_vehicles`,
    );

    const userVehicleStats = await adapter.get(
      `SELECT COUNT(*) AS total
      FROM user_vehicles
      WHERE deleted_at IS NULL`,
    );

    const catalogServiceStats = await adapter.get(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END), 0) AS inactive
      FROM catalog_services`,
    );

    const activeUsersCount = Number(userStats?.active ?? 0);
    const totalUserVehicles = Number(userVehicleStats?.total ?? 0);
    const averagePerActiveUser =
      activeUsersCount > 0
        ? Number((totalUserVehicles / activeUsersCount).toFixed(2))
        : 0;

    return {
      users: {
        total: Number(userStats?.total ?? 0),
        active: activeUsersCount,
        newLast30Days: Number(userStats?.new_last_30_days ?? 0),
        adminCount: Number(userStats?.admin_count ?? 0),
      },
      catalogVehicles: {
        total: Number(catalogVehicleStats?.total ?? 0),
        active: Number(catalogVehicleStats?.active ?? 0),
        inactive: Number(catalogVehicleStats?.inactive ?? 0),
      },
      userVehicles: {
        total: totalUserVehicles,
        averagePerActiveUser,
      },
      catalogServices: {
        total: Number(catalogServiceStats?.total ?? 0),
        active: Number(catalogServiceStats?.active ?? 0),
        inactive: Number(catalogServiceStats?.inactive ?? 0),
      },
      generatedAt,
    };
  }

  async function listUserVehicles({
    page = 1,
    limit = 20,
    search = "",
    brand = "",
    category = "",
    kmMin = null,
    kmMax = null,
  } = {}) {
    const conditions = ["uv.deleted_at IS NULL"];
    const params = [];

    const normalizedBrand = typeof brand === "string" ? brand.trim().toLowerCase() : "";
    if (normalizedBrand) {
      conditions.push("LOWER(uv.brand) LIKE ?");
      params.push(`%${normalizedBrand}%`);
    }

    const normalizedCategory =
      typeof category === "string" ? category.trim() : "";
    if (normalizedCategory) {
      conditions.push("uv.category = ?");
      params.push(normalizedCategory);
    }

    if (typeof kmMin === "number" && Number.isFinite(kmMin)) {
      conditions.push("uv.current_km >= ?");
      params.push(kmMin);
    }

    if (typeof kmMax === "number" && Number.isFinite(kmMax)) {
      conditions.push("uv.current_km <= ?");
      params.push(kmMax);
    }

    const normalizedSearch =
      typeof search === "string" ? search.trim().toLowerCase() : "";
    if (normalizedSearch) {
      conditions.push(
        "LOWER(uv.brand || ' ' || uv.model || ' ' || COALESCE(uv.nickname, '') || ' ' || u.name) LIKE ?",
      );
      params.push(`%${normalizedSearch}%`);
    }

    const whereClause = conditions.join(" AND ");
    const offset = (page - 1) * limit;

    const totalRow = await adapter.get(
      `SELECT COUNT(*) AS total
      FROM user_vehicles uv
      INNER JOIN users u ON u.id = uv.owner_id
      WHERE ${whereClause}`,
      params,
    );

    const total = Number(totalRow?.total ?? 0);

    const rows = await adapter.all(
      `SELECT
        uv.id,
        uv.brand,
        uv.model,
        uv.year,
        uv.version,
        uv.nickname,
        uv.current_km,
        uv.category,
        uv.fuel,
        uv.created_at,
        u.name AS owner_name,
        u.email AS owner_email
      FROM user_vehicles uv
      INNER JOIN users u ON u.id = uv.owner_id
      WHERE ${whereClause}
      ORDER BY uv.created_at DESC, uv.id DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const topModelRows = await adapter.all(
      `SELECT
        uv.brand AS brand,
        uv.model AS model,
        COUNT(*) AS count
      FROM user_vehicles uv
      INNER JOIN users u ON u.id = uv.owner_id
      WHERE ${whereClause}
      GROUP BY LOWER(uv.brand), LOWER(uv.model)
      ORDER BY count DESC, uv.brand ASC, uv.model ASC
      LIMIT 5`,
      params,
    );

    return {
      items: rows.map(toAdminUserVehicle),
      pagination: buildPagination(page, limit, total),
      topModels: topModelRows.map((row) => ({
        brand: row.brand,
        model: row.model,
        count: Number(row.count),
      })),
    };
  }

  async function listCatalogVehicles({
    page = 1,
    limit = 20,
    search = "",
    brand = "",
    category = "",
    status = "all",
  } = {}) {
    const conditions = [];
    const params = [];

    if (status === "active") {
      conditions.push("active = 1");
    } else if (status === "inactive") {
      conditions.push("active = 0");
    }

    const normalizedBrand = typeof brand === "string" ? brand.trim().toLowerCase() : "";
    if (normalizedBrand) {
      conditions.push("LOWER(brand) LIKE ?");
      params.push(`%${normalizedBrand}%`);
    }

    const normalizedCategory =
      typeof category === "string" ? category.trim() : "";
    if (normalizedCategory) {
      conditions.push("category = ?");
      params.push(normalizedCategory);
    }

    const normalizedSearch =
      typeof search === "string" ? search.trim().toLowerCase() : "";
    if (normalizedSearch) {
      conditions.push("LOWER(brand || ' ' || model || ' ' || fuel) LIKE ?");
      params.push(`%${normalizedSearch}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    const totalRow = await adapter.get(
      `SELECT COUNT(*) AS total FROM catalog_vehicles ${whereClause}`,
      params,
    );
    const total = Number(totalRow?.total ?? 0);

    const rows = await adapter.all(
      `SELECT *
      FROM catalog_vehicles
      ${whereClause}
      ORDER BY active DESC, brand ASC, model ASC, year DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      items: rows.map(toAdminCatalogVehicle),
      pagination: buildPagination(page, limit, total),
    };
  }

  async function assertUniqueCatalogVehicle({ brand, model, year, fuel }, excludeId = null) {
    const targetBrand = brand.trim().toLowerCase();
    const targetModel = model.trim().toLowerCase();
    const targetFuel = fuel.trim().toLowerCase();

    const candidates = await adapter.all(
      `SELECT id, brand, model, fuel
      FROM catalog_vehicles
      WHERE year = ?`,
      [year],
    );

    const existing = candidates.find(
      (row) =>
        row.id !== excludeId &&
        row.brand.trim().toLowerCase() === targetBrand &&
        row.model.trim().toLowerCase() === targetModel &&
        row.fuel.trim().toLowerCase() === targetFuel,
    );

    if (existing) {
      throw new AdminError(409, "Este veículo já existe no catálogo.", {
        fields: {
          model: "Combinação marca/modelo/ano/combustível já cadastrada.",
        },
      });
    }
  }

  async function createCatalogVehicle(adminUserId, payload) {
    const validation = validateCreateCatalogVehicle(payload);
    if (!validation.valid) {
      throw new AdminError(400, "Dados do veículo do catálogo inválidos.", {
        fields: validation.fields,
      });
    }

    const { data } = validation;
    await assertUniqueCatalogVehicle(data);

    const id = randomUUID();
    const nowIso = new Date(now()).toISOString();

    await adapter.run(
      `INSERT INTO catalog_vehicles (
        id,
        brand,
        model,
        year,
        fuel,
        category,
        cost_factor,
        reference_consumption,
        fipe_price,
        active,
        updated_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.brand,
        data.model,
        data.year,
        data.fuel,
        data.category,
        data.costFactor,
        data.referenceConsumption,
        data.fipePrice,
        data.active ? 1 : 0,
        adminUserId ?? null,
        nowIso,
        nowIso,
      ],
    );

    const created = await adapter.get(
      "SELECT * FROM catalog_vehicles WHERE id = ? LIMIT 1",
      [id],
    );
    return toAdminCatalogVehicle(created);
  }

  async function updateCatalogVehicle(adminUserId, id, payload) {
    const validation = validateUpdateCatalogVehicle(payload);
    if (!validation.valid) {
      throw new AdminError(400, "Dados de atualização do veículo inválidos.", {
        fields: validation.fields,
      });
    }

    const existing = await adapter.get(
      "SELECT * FROM catalog_vehicles WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing) {
      throw new AdminError(404, "Veículo do catálogo não encontrado.");
    }

    const { data } = validation;
    const nextBrand = data.brand !== undefined ? data.brand : existing.brand;
    const nextModel = data.model !== undefined ? data.model : existing.model;
    const nextYear = data.year !== undefined ? data.year : existing.year;
    const nextFuel = data.fuel !== undefined ? data.fuel : existing.fuel;
    const nextCategory =
      data.category !== undefined ? data.category : existing.category;
    const nextCostFactor =
      data.costFactor !== undefined ? data.costFactor : existing.cost_factor;
    const nextReferenceConsumption =
      data.referenceConsumption !== undefined
        ? data.referenceConsumption
        : existing.reference_consumption;
    const nextFipePrice =
      data.fipePrice !== undefined ? data.fipePrice : existing.fipe_price;
    const nextActive =
      data.active !== undefined ? (data.active ? 1 : 0) : existing.active;

    await assertUniqueCatalogVehicle(
      {
        brand: nextBrand,
        model: nextModel,
        year: nextYear,
        fuel: nextFuel,
      },
      existing.id,
    );

    const nowIso = new Date(now()).toISOString();

    await adapter.run(
      `UPDATE catalog_vehicles
      SET
        brand = ?,
        model = ?,
        year = ?,
        fuel = ?,
        category = ?,
        cost_factor = ?,
        reference_consumption = ?,
        fipe_price = ?,
        active = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        nextBrand,
        nextModel,
        nextYear,
        nextFuel,
        nextCategory,
        nextCostFactor,
        nextReferenceConsumption,
        nextFipePrice,
        nextActive,
        adminUserId ?? null,
        nowIso,
        existing.id,
      ],
    );

    const updated = await adapter.get(
      "SELECT * FROM catalog_vehicles WHERE id = ? LIMIT 1",
      [existing.id],
    );
    return toAdminCatalogVehicle(updated);
  }

  async function listCatalogServices({
    page = 1,
    limit = 20,
    search = "",
    category = "",
    combustionOnly = "all",
    status = "all",
  } = {}) {
    const conditions = [];
    const params = [];

    if (status === "active") {
      conditions.push("active = 1");
    } else if (status === "inactive") {
      conditions.push("active = 0");
    }

    if (combustionOnly === true || combustionOnly === "true") {
      conditions.push("combustion_only = 1");
    } else if (combustionOnly === false || combustionOnly === "false") {
      conditions.push("combustion_only = 0");
    }

    const normalizedCategory =
      typeof category === "string" ? category.trim().toLowerCase() : "";
    if (normalizedCategory) {
      conditions.push("LOWER(category) = ?");
      params.push(normalizedCategory);
    }

    const normalizedSearch =
      typeof search === "string" ? search.trim().toLowerCase() : "";
    if (normalizedSearch) {
      conditions.push(
        "LOWER(name || ' ' || category || ' ' || COALESCE(notes, '')) LIKE ?",
      );
      params.push(`%${normalizedSearch}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    const totalRow = await adapter.get(
      `SELECT COUNT(*) AS total FROM catalog_services ${whereClause}`,
      params,
    );
    const total = Number(totalRow?.total ?? 0);

    const rows = await adapter.all(
      `SELECT *
      FROM catalog_services
      ${whereClause}
      ORDER BY active DESC, interval_km ASC, name ASC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      items: rows.map(toAdminCatalogService),
      pagination: buildPagination(page, limit, total),
    };
  }

  async function assertUniqueCatalogServiceName(name, excludeId = null) {
    const targetName = name.trim().toLowerCase();
    const candidates = await adapter.all(
      "SELECT id, name FROM catalog_services",
    );

    const existing = candidates.find(
      (row) =>
        row.id !== excludeId && row.name.trim().toLowerCase() === targetName,
    );

    if (existing) {
      throw new AdminError(
        409,
        "Já existe um serviço com este nome no catálogo.",
        {
          fields: {
            name: "Já existe um serviço com este nome.",
          },
        },
      );
    }
  }

  async function createCatalogService(adminUserId, payload) {
    const validation = validateCreateCatalogService(payload);
    if (!validation.valid) {
      throw new AdminError(400, "Dados do serviço do catálogo inválidos.", {
        fields: validation.fields,
      });
    }

    const { data } = validation;
    await assertUniqueCatalogServiceName(data.name);

    const id = randomUUID();
    const nowIso = new Date(now()).toISOString();

    try {
      await adapter.run(
        `INSERT INTO catalog_services (
          id,
          name,
          category,
          interval_km,
          interval_months,
          base_cost,
          combustion_only,
          notes,
          active,
          updated_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.name,
          data.category,
          data.intervalKm,
          data.intervalMonths,
          data.baseCost,
          data.combustionOnly ? 1 : 0,
          data.notes,
          data.active ? 1 : 0,
          adminUserId ?? null,
          nowIso,
          nowIso,
        ],
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AdminError(
          409,
          "Já existe um serviço com este nome no catálogo.",
          {
            fields: { name: "Já existe um serviço com este nome." },
          },
        );
      }
      throw error;
    }

    const created = await adapter.get(
      "SELECT * FROM catalog_services WHERE id = ? LIMIT 1",
      [id],
    );
    return toAdminCatalogService(created);
  }

  async function updateCatalogService(adminUserId, id, payload) {
    const validation = validateUpdateCatalogService(payload);
    if (!validation.valid) {
      throw new AdminError(400, "Dados de atualização do serviço inválidos.", {
        fields: validation.fields,
      });
    }

    const existing = await adapter.get(
      "SELECT * FROM catalog_services WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing) {
      throw new AdminError(404, "Serviço do catálogo não encontrado.");
    }

    const { data } = validation;
    const nextName = data.name !== undefined ? data.name : existing.name;
    const nextCategory =
      data.category !== undefined ? data.category : existing.category;
    const nextIntervalKm =
      data.intervalKm !== undefined ? data.intervalKm : existing.interval_km;
    const nextIntervalMonths =
      data.intervalMonths !== undefined
        ? data.intervalMonths
        : existing.interval_months;
    const nextBaseCost =
      data.baseCost !== undefined ? data.baseCost : existing.base_cost;
    const nextCombustionOnly =
      data.combustionOnly !== undefined
        ? data.combustionOnly
          ? 1
          : 0
        : existing.combustion_only;
    const nextNotes = data.notes !== undefined ? data.notes : existing.notes;
    const nextActive =
      data.active !== undefined ? (data.active ? 1 : 0) : existing.active;

    await assertUniqueCatalogServiceName(nextName, existing.id);

    const nowIso = new Date(now()).toISOString();

    try {
      await adapter.run(
        `UPDATE catalog_services
        SET
          name = ?,
          category = ?,
          interval_km = ?,
          interval_months = ?,
          base_cost = ?,
          combustion_only = ?,
          notes = ?,
          active = ?,
          updated_by = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          nextName,
          nextCategory,
          nextIntervalKm,
          nextIntervalMonths,
          nextBaseCost,
          nextCombustionOnly,
          nextNotes,
          nextActive,
          adminUserId ?? null,
          nowIso,
          existing.id,
        ],
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AdminError(
          409,
          "Já existe um serviço com este nome no catálogo.",
          {
            fields: { name: "Já existe um serviço com este nome." },
          },
        );
      }
      throw error;
    }

    const updated = await adapter.get(
      "SELECT * FROM catalog_services WHERE id = ? LIMIT 1",
      [existing.id],
    );
    return toAdminCatalogService(updated);
  }

  return {
    getOverview,
    listUserVehicles,
    listCatalogVehicles,
    createCatalogVehicle,
    updateCatalogVehicle,
    listCatalogServices,
    createCatalogService,
    updateCatalogService,
  };
}
