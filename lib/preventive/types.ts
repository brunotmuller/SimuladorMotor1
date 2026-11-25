export type MonthlyUsageLevel = "pouco" | "normal" | "frequente" | "intenso";

export type MaintenanceStatus = "green" | "yellow" | "red";

export type MaintenanceItemId =
  | "tire_pressure"
  | "engine_oil"
  | "engine_air_filter"
  | "cabin_filter"
  | "alignment_balancing"
  | "brake_pads";

export type MonthlyUsageOption = {
  id: MonthlyUsageLevel;
  label: string;
  rangeLabel: string;
  estimatedMonthlyKm: number;
  description: string;
};

export type PlainLanguageGuide = {
  whatIsIt: string;
  whereToResolve: string[];
  avoidScams: string[];
  whenToWorry: string[];
};

export type MaintenanceDefinition = {
  id: MaintenanceItemId;
  name: string;
  shortName: string;
  iconName:
    | "speedometer-outline"
    | "water-outline"
    | "leaf-outline"
    | "snow-outline"
    | "git-compare-outline"
    | "disc-outline";
  defaultIntervalKm: number | null;
  defaultIntervalDays: number | null;
  defaultIntervalMonths: number | null;
  intervalSummary: string;
  isDemoReference: boolean;
  guide: PlainLanguageGuide;
};

export type CustomIntervalOverride = {
  intervalKm?: number | null;
  intervalDays?: number | null;
  intervalMonths?: number | null;
};

export type VehicleMaintenanceRecord = {
  lastDoneDate: string; // ISO date YYYY-MM-DD
  lastDoneKm: number;
};

export type MaintenanceHistoryEntry = {
  id: string;
  vehicleId: string;
  itemId: MaintenanceItemId;
  serviceName: string;
  performedDate: string; // ISO date YYYY-MM-DD
  performedKm: number;
  nextForecastLabel: string;
  nextDueKm: number | null;
  nextDueDate: string | null;
  notes?: string;
  createdAt: string;
};

export type TirePressureSpec = {
  frontEmptyPsi: number;
  rearEmptyPsi: number;
  frontLoadedPsi: number;
  rearLoadedPsi: number;
  source: "user_confirmed" | "unconfirmed";
  note?: string;
};

export type PreventiveVehicle = {
  id: string;
  ownerId: string;
  brand: string;
  model: string;
  year: number;
  version?: string;
  currentKm: number;
  monthlyUsage: MonthlyUsageLevel;
  isDemoData: boolean;
  demoTemplateId?: string;
  fipeCode?: string;
  tirePressure: TirePressureSpec | null;
  maintenanceRecords: Record<MaintenanceItemId, VehicleMaintenanceRecord>;
  customIntervals: Partial<Record<MaintenanceItemId, CustomIntervalOverride>>;
  history: MaintenanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type DemoVehicleTemplate = {
  id: string;
  brand: string;
  model: string;
  year: number;
  version: string;
  suggestedKm: number;
  suggestedUsage: MonthlyUsageLevel;
  categoryLabel: string;
  demoMaintenanceOffsets: Record<
    MaintenanceItemId,
    { kmAgo: number; daysAgo: number }
  >;
};

export type LimitingTrigger = "km" | "time" | "both";

export type MaintenanceEvaluation = {
  definition: MaintenanceDefinition;
  status: MaintenanceStatus;
  statusLabel: string;
  progressPercent: number; // 0..100
  kmRemaining: number | null;
  daysRemaining: number | null;
  remainingLabel: string;
  lastDoneDate: string;
  lastDoneKm: number;
  nextDueKm: number | null;
  nextDueDate: string | null;
  nextForecastLabel: string;
  limitingTrigger: LimitingTrigger;
  overdueReason: string | null;
  effectiveIntervalKm: number | null;
  effectiveIntervalDays: number | null;
  effectiveIntervalMonths: number | null;
  isCustomInterval: boolean;
  urgencyScore: number; // higher = needs attention sooner
};

export type VehicleHealthSummary = {
  items: MaintenanceEvaluation[];
  priorityItems: MaintenanceEvaluation[];
  greenCount: number;
  yellowCount: number;
  redCount: number;
  overallStatus: MaintenanceStatus;
  overallHeadline: string;
  overallDescription: string;
  healthScore: number; // 0..100
};

export type PreventiveStoreState = {
  version: number;
  ownerId: string;
  activeVehicleId: string | null;
  vehicles: PreventiveVehicle[];
};
