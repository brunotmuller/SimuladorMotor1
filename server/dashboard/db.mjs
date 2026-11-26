const DASHBOARD_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS catalog_vehicles (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  fuel TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('compact', 'medium_suv', 'diesel_pickup', 'premium', 'electric')),
  cost_factor REAL NOT NULL DEFAULT 1.0,
  reference_consumption REAL NOT NULL DEFAULT 11.5,
  fipe_price TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  category TEXT NOT NULL,
  interval_km INTEGER NOT NULL,
  interval_months INTEGER,
  base_cost REAL NOT NULL,
  combustion_only INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_vehicles (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_vehicle_id TEXT REFERENCES catalog_vehicles(id),
  nickname TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  version TEXT,
  fuel TEXT NOT NULL DEFAULT 'Flex',
  category TEXT NOT NULL DEFAULT 'compact' CHECK (category IN ('compact', 'medium_suv', 'diesel_pickup', 'premium', 'electric')),
  cost_factor REAL NOT NULL DEFAULT 1.0,
  plate TEXT,
  fipe_price TEXT,
  fipe_code TEXT,
  fipe_cached INTEGER NOT NULL DEFAULT 0,
  current_km INTEGER NOT NULL,
  last_revision_months INTEGER NOT NULL DEFAULT 0,
  health_score INTEGER NOT NULL DEFAULT 85,
  estimated_consumption REAL NOT NULL DEFAULT 11.5,
  is_active INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES user_vehicles(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES catalog_services(id),
  service_name TEXT NOT NULL,
  performed_at TEXT NOT NULL,
  performed_km INTEGER NOT NULL,
  paid_cost REAL,
  estimated_cost REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_vehicles_owner_deleted
  ON user_vehicles (owner_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_service
  ON maintenance_logs (vehicle_id, service_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_owner_performed
  ON maintenance_logs (owner_id, performed_at);

CREATE INDEX IF NOT EXISTS idx_catalog_services_active
  ON catalog_services (active);

CREATE INDEX IF NOT EXISTS idx_catalog_vehicles_active
  ON catalog_vehicles (active);

CREATE INDEX IF NOT EXISTS idx_user_vehicles_brand_category_deleted
  ON user_vehicles (brand, category, deleted_at);
`;

export const DEFAULT_CATALOG_VEHICLES = Object.freeze([
  {
    id: "cat-corolla-2022",
    brand: "Toyota",
    model: "Corolla",
    year: 2022,
    fuel: "Flex",
    category: "medium_suv",
    costFactor: 1.22,
    referenceConsumption: 12.5,
    fipePrice: "R$ 138.500",
  },
  {
    id: "cat-dolphin-2024",
    brand: "BYD",
    model: "Dolphin",
    year: 2024,
    fuel: "Elétrico",
    category: "electric",
    costFactor: 0.95,
    referenceConsumption: 6.2,
    fipePrice: "R$ 149.800",
  },
  {
    id: "cat-compass-2021",
    brand: "Jeep",
    model: "Compass",
    year: 2021,
    fuel: "Flex",
    category: "medium_suv",
    costFactor: 1.22,
    referenceConsumption: 9.8,
    fipePrice: "R$ 142.000",
  },
  {
    id: "cat-onix-2022",
    brand: "Chevrolet",
    model: "Onix",
    year: 2022,
    fuel: "Flex",
    category: "compact",
    costFactor: 1.0,
    referenceConsumption: 13.4,
    fipePrice: "R$ 82.400",
  },
  {
    id: "cat-hb20-2023",
    brand: "Hyundai",
    model: "HB20",
    year: 2023,
    fuel: "Flex",
    category: "compact",
    costFactor: 1.0,
    referenceConsumption: 13.2,
    fipePrice: "R$ 86.900",
  },
  {
    id: "cat-polo-2023",
    brand: "Volkswagen",
    model: "Polo",
    year: 2023,
    fuel: "Flex",
    category: "compact",
    costFactor: 1.0,
    referenceConsumption: 13.0,
    fipePrice: "R$ 95.200",
  },
  {
    id: "cat-strada-2023",
    brand: "Fiat",
    model: "Strada",
    year: 2023,
    fuel: "Flex",
    category: "diesel_pickup",
    costFactor: 1.35,
    referenceConsumption: 11.8,
    fipePrice: "R$ 108.500",
  },
  {
    id: "cat-hrv-2022",
    brand: "Honda",
    model: "HR-V",
    year: 2022,
    fuel: "Flex",
    category: "medium_suv",
    costFactor: 1.22,
    referenceConsumption: 11.9,
    fipePrice: "R$ 126.000",
  },
  {
    id: "cat-bmw-320i-2022",
    brand: "BMW",
    model: "320i",
    year: 2022,
    fuel: "Gasolina",
    category: "premium",
    costFactor: 1.85,
    referenceConsumption: 10.6,
    fipePrice: "R$ 268.000",
  },
]);

export const DEFAULT_CATALOG_SERVICES = Object.freeze([
  {
    id: "svc-oil",
    name: "Óleo do motor + filtro de óleo",
    category: "motor",
    intervalKm: 10000,
    intervalMonths: 12,
    baseCost: 340,
    combustionOnly: 1,
    notes: "Lubrificante conforme especificação do fabricante e filtro novo.",
  },
  {
    id: "svc-alignment",
    name: "Alinhamento e balanceamento",
    category: "pneus",
    intervalKm: 10000,
    intervalMonths: null,
    baseCost: 190,
    combustionOnly: 0,
    notes: "Mantém estabilidade direcional e evita desgaste irregular dos pneus.",
  },
  {
    id: "svc-cabin",
    name: "Filtro de cabine (ar-condicionado)",
    category: "filtros",
    intervalKm: 15000,
    intervalMonths: 12,
    baseCost: 95,
    combustionOnly: 0,
    notes: "Preserva a qualidade do ar interno e o fluxo do ar-condicionado.",
  },
  {
    id: "svc-air-fuel",
    name: "Filtros de ar do motor e combustível",
    category: "filtros",
    intervalKm: 15000,
    intervalMonths: null,
    baseCost: 165,
    combustionOnly: 1,
    notes: "Protege o sistema de injeção e mantém o consumo eficiente.",
  },
  {
    id: "svc-brakes",
    name: "Pastilhas de freio (revisão/troca)",
    category: "freios",
    intervalKm: 20000,
    intervalMonths: null,
    baseCost: 380,
    combustionOnly: 0,
    notes: "Inspeção da espessura das pastilhas e discos dianteiros/traseiros.",
  },
  {
    id: "svc-brake-fluid",
    name: "Fluido de freio",
    category: "fluidos",
    intervalKm: 30000,
    intervalMonths: 24,
    baseCost: 180,
    combustionOnly: 0,
    notes: "Substituição completa para manter eficiência de frenagem e evitar umidade.",
  },
  {
    id: "svc-spark-plugs",
    name: "Velas de ignição",
    category: "motor",
    intervalKm: 40000,
    intervalMonths: null,
    baseCost: 320,
    combustionOnly: 1,
    notes: "Garante partida rápida, queima limpa e menor consumo.",
  },
  {
    id: "svc-timing-belt",
    name: "Correia dentada / acessórios",
    category: "motor",
    intervalKm: 60000,
    intervalMonths: 48,
    baseCost: 780,
    combustionOnly: 1,
    notes: "Item crítico de sincronismo do motor; substitua preventivamente.",
  },
]);

function ensureColumnExists(db, tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    db.exec(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
    );
  }
}

export function ensureDashboardSchema(db) {
  db.exec(DASHBOARD_SCHEMA_SQL);
  ensureColumnExists(
    db,
    "catalog_vehicles",
    "updated_by",
    "TEXT REFERENCES users(id)",
  );
  ensureColumnExists(
    db,
    "catalog_services",
    "updated_by",
    "TEXT REFERENCES users(id)",
  );
}

export function seedDefaultCatalogs(db) {
  const now = new Date().toISOString();

  const insertVehicle = db.prepare(`
    INSERT OR IGNORE INTO catalog_vehicles (
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
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertService = db.prepare(`
    INSERT OR IGNORE INTO catalog_services (
      id,
      name,
      category,
      interval_km,
      interval_months,
      base_cost,
      combustion_only,
      notes,
      active,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  let vehiclesInserted = 0;
  let servicesInserted = 0;

  db.exec("BEGIN");
  try {
    for (const vehicle of DEFAULT_CATALOG_VEHICLES) {
      const result = insertVehicle.run(
        vehicle.id,
        vehicle.brand,
        vehicle.model,
        vehicle.year,
        vehicle.fuel,
        vehicle.category,
        vehicle.costFactor,
        vehicle.referenceConsumption,
        vehicle.fipePrice,
        now,
        now,
      );
      vehiclesInserted += result.changes;
    }

    for (const service of DEFAULT_CATALOG_SERVICES) {
      const result = insertService.run(
        service.id,
        service.name,
        service.category,
        service.intervalKm,
        service.intervalMonths,
        service.baseCost,
        service.combustionOnly,
        service.notes,
        now,
        now,
      );
      servicesInserted += result.changes;
    }

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore rollback errors if transaction is already closed.
    }
    throw error;
  }

  return { vehiclesInserted, servicesInserted };
}
