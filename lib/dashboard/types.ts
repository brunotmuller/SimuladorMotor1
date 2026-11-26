export type VehicleCategory =
  | "compact"
  | "medium_suv"
  | "diesel_pickup"
  | "premium"
  | "electric";

export type MaintenanceUrgency = "urgent" | "recommended" | "upcoming";

export type CatalogVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  fuel: string;
  category: VehicleCategory;
  costFactor: number;
  referenceConsumption: number;
  fipePrice: string | null;
  active: boolean;
};

export type CatalogService = {
  id: string;
  name: string;
  category: string;
  intervalKm: number;
  intervalMonths: number | null;
  baseCost: number;
  combustionOnly: boolean;
  notes: string | null;
  active: boolean;
};

export type UserVehicle = {
  id: string;
  ownerId: string;
  catalogVehicleId: string | null;
  nickname: string | null;
  brand: string;
  model: string;
  year: number;
  version: string | null;
  fuel: string;
  category: VehicleCategory;
  costFactor: number;
  plate: string | null;
  fipePrice: string | null;
  fipeCode: string | null;
  fipeCached: boolean;
  currentKm: number;
  lastRevisionMonths: number;
  healthScore: number;
  estimatedConsumption: number;
  isActive: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardMaintenanceItem = {
  serviceId: string;
  name: string;
  category: string;
  urgency: MaintenanceUrgency;
  statusLabel: string;
  reason: string;
  intervalKm: number;
  intervalMonths: number | null;
  baseCost: number;
  estimatedCost: number;
  combustionOnly: boolean;
  notes: string | null;
  lastDoneKm: number | null;
  lastDoneAt: string | null;
  nextDueKm: number;
  nextDueDate: string | null;
  overdueKm: number;
  overdueMonths: number;
  dueNow: boolean;
};

export type MaintenanceLogItem = {
  id: string;
  vehicleId: string;
  ownerId: string;
  serviceId: string | null;
  serviceName: string;
  performedAt: string;
  performedKm: number;
  paidCost: number | null;
  estimatedCost: number;
  notes: string | null;
  createdAt: string;
};

export type DashboardSummary = {
  healthScore: number;
  estimatedConsumption: number;
  consumptionUnit: "km/L" | "km/kWh";
  urgentCount: number;
  recommendedCount: number;
  upcomingCount: number;
  dueCount: number;
  nextMilestoneKm: number | null;
  totalDueCost: number;
  totalUpcomingCost: number;
};

export type DashboardResponse = {
  empty: boolean;
  vehicles: UserVehicle[];
  activeVehicle: UserVehicle | null;
  summary: DashboardSummary | null;
  maintenances: DashboardMaintenanceItem[];
  history: MaintenanceLogItem[];
};

export type CreateVehiclePayload = {
  catalogVehicleId?: string | null;
  nickname?: string | null;
  brand: string;
  model: string;
  year: number;
  version?: string | null;
  fuel?: string;
  category?: VehicleCategory;
  plate?: string | null;
  fipePrice?: string | null;
  fipeCode?: string | null;
  fipeCached?: boolean;
  currentKm: number;
  lastRevisionMonths?: number;
  healthScore?: number;
  estimatedConsumption?: number;
  isDemo?: boolean;
};

export type UpdateVehiclePayload = {
  nickname?: string | null;
  brand?: string;
  model?: string;
  year?: number;
  version?: string | null;
  fuel?: string;
  category?: VehicleCategory;
  plate?: string | null;
  fipePrice?: string | null;
  fipeCode?: string | null;
  fipeCached?: boolean;
  currentKm?: number;
  lastRevisionMonths?: number;
  healthScore?: number;
  estimatedConsumption?: number;
  confirmKmRegression?: boolean;
};

export type CreateMaintenanceLogPayload = {
  vehicleId: string;
  serviceId: string;
  performedAt: string;
  performedKm: number;
  paidCost?: number | null;
  notes?: string | null;
};
