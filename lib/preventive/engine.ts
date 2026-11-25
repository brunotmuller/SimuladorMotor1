import {
  MAINTENANCE_CATALOG,
  getMonthlyUsageOption,
} from "./catalog";
import {
  CustomIntervalOverride,
  DemoVehicleTemplate,
  LimitingTrigger,
  MaintenanceDefinition,
  MaintenanceEvaluation,
  MaintenanceHistoryEntry,
  MaintenanceItemId,
  MaintenanceStatus,
  MonthlyUsageLevel,
  PreventiveVehicle,
  VehicleHealthSummary,
  VehicleMaintenanceRecord,
} from "./types";

const MS_PER_DAY = 86_400_000;

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(base: Date, days: number): Date {
  const copy = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    12,
    0,
    0,
    0
  );
  copy.setDate(copy.getDate() + Math.round(days));
  return copy;
}

export function addMonths(base: Date, months: number): Date {
  const copy = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    12,
    0,
    0,
    0
  );
  copy.setMonth(copy.getMonth() + Math.round(months));
  return copy;
}

export function diffDays(later: Date, earlier: Date): number {
  const a = new Date(
    later.getFullYear(),
    later.getMonth(),
    later.getDate(),
    12,
    0,
    0,
    0
  );
  const b = new Date(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate(),
    12,
    0,
    0,
    0
  );
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString("pt-BR")} km`;
}

export function validateKmUpdate(
  currentKm: number,
  rawInput: string
): { valid: true; km: number } | { valid: false; error: string } {
  const cleaned = rawInput.replace(/[^\d]/g, "");
  if (!cleaned) {
    return { valid: false, error: "Informe a nova quilometragem do veículo." };
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { valid: false, error: "Quilometragem inválida." };
  }
  if (parsed < currentKm) {
    return {
      valid: false,
      error: `A nova quilometragem não pode ser menor que o último registro (${formatKm(
        currentKm
      )}).`,
    };
  }
  if (parsed > 2_000_000) {
    return {
      valid: false,
      error: "Valor muito alto. Confira os dígitos do hodômetro.",
    };
  }
  return { valid: true, km: parsed };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveIntervals(
  def: MaintenanceDefinition,
  custom?: CustomIntervalOverride
) {
  const intervalKm =
    custom && custom.intervalKm !== undefined
      ? custom.intervalKm
      : def.defaultIntervalKm;
  const intervalDays =
    custom && custom.intervalDays !== undefined
      ? custom.intervalDays
      : def.defaultIntervalDays;
  const intervalMonths =
    custom && custom.intervalMonths !== undefined
      ? custom.intervalMonths
      : def.defaultIntervalMonths;

  const isCustomInterval = Boolean(
    custom &&
      ((custom.intervalKm !== undefined &&
        custom.intervalKm !== def.defaultIntervalKm) ||
        (custom.intervalDays !== undefined &&
          custom.intervalDays !== def.defaultIntervalDays) ||
        (custom.intervalMonths !== undefined &&
          custom.intervalMonths !== def.defaultIntervalMonths))
  );

  return { intervalKm, intervalDays, intervalMonths, isCustomInterval };
}

/**
 * Avalia um item de manutenção usando apenas:
 * - KM atual informado pelo usuário
 * - Data e KM da última manutenção
 * - Intervalo por KM e/ou por tempo (vence o primeiro limite atingido)
 * - Estimativa mensal de uso para projeção aproximada de datas
 */
export function evaluateMaintenanceItem(
  definition: MaintenanceDefinition,
  record: VehicleMaintenanceRecord,
  vehicle: Pick<PreventiveVehicle, "currentKm" | "monthlyUsage" | "customIntervals">,
  referenceDate: Date = new Date()
): MaintenanceEvaluation {
  const custom = vehicle.customIntervals?.[definition.id];
  const {
    intervalKm,
    intervalDays,
    intervalMonths,
    isCustomInterval,
  } = resolveIntervals(definition, custom);

  const monthlyKm = getMonthlyUsageOption(vehicle.monthlyUsage).estimatedMonthlyKm;
  const lastDate = parseIsoDate(record.lastDoneDate);

  // 1) Cálculo por KM (se aplicável)
  let kmRemaining: number | null = null;
  let kmProgress = 0;
  let nextDueKm: number | null = null;
  let estimatedDueDateByKm: Date | null = null;
  let kmOverdue = false;
  let kmWarning = false;

  if (intervalKm && intervalKm > 0) {
    const kmDriven = Math.max(0, vehicle.currentKm - record.lastDoneKm);
    kmRemaining = intervalKm - kmDriven;
    nextDueKm = record.lastDoneKm + intervalKm;
    kmProgress = clamp(kmDriven / intervalKm, 0, 1);

    if (kmRemaining <= 0) {
      kmOverdue = true;
      estimatedDueDateByKm = referenceDate;
    } else {
      const estimatedDays = Math.max(
        1,
        Math.ceil((kmRemaining / Math.max(1, monthlyKm)) * 30)
      );
      estimatedDueDateByKm = addDays(referenceDate, estimatedDays);
      const kmWarnThreshold = Math.min(1500, Math.round(intervalKm * 0.2));
      kmWarning = kmProgress >= 0.8 || kmRemaining <= kmWarnThreshold;
    }
  }

  // 2) Cálculo por Tempo (se aplicável)
  let daysRemaining: number | null = null;
  let timeProgress = 0;
  let dueDateByTime: Date | null = null;
  let timeOverdue = false;
  let timeWarning = false;

  if ((intervalDays && intervalDays > 0) || (intervalMonths && intervalMonths > 0)) {
    dueDateByTime =
      intervalMonths && intervalMonths > 0
        ? addMonths(lastDate, intervalMonths)
        : addDays(lastDate, intervalDays ?? 15);

    const totalPeriodDays = Math.max(1, diffDays(dueDateByTime, lastDate));
    const daysElapsed = Math.max(0, diffDays(referenceDate, lastDate));
    daysRemaining = diffDays(dueDateByTime, referenceDate);
    timeProgress = clamp(daysElapsed / totalPeriodDays, 0, 1);

    if (daysRemaining <= 0) {
      timeOverdue = true;
    } else {
      const warnDays =
        totalPeriodDays <= 20
          ? 3
          : Math.min(30, Math.max(7, Math.round(totalPeriodDays * 0.15)));
      timeWarning = timeProgress >= 0.8 || daysRemaining <= warnDays;
    }
  }

  // 3) Combinação: vence pelo primeiro limite atingido
  let status: MaintenanceStatus = "green";
  let limitingTrigger: LimitingTrigger = intervalKm ? "km" : "time";
  let overdueReason: string | null = null;

  if (kmOverdue || timeOverdue) {
    status = "red";
    if (kmOverdue && timeOverdue) {
      limitingTrigger = "both";
      overdueReason = "Vencida por quilometragem e por prazo";
    } else if (kmOverdue) {
      limitingTrigger = "km";
      overdueReason = "Vencida por quilometragem";
    } else {
      limitingTrigger = "time";
      overdueReason = "Vencida pelo prazo";
    }
  } else if (kmWarning || timeWarning) {
    status = "yellow";
    if (kmWarning && timeWarning) {
      limitingTrigger = kmProgress >= timeProgress ? "km" : "time";
    } else if (kmWarning) {
      limitingTrigger = "km";
    } else {
      limitingTrigger = "time";
    }
  } else {
    status = "green";
    if (intervalKm && (intervalDays || intervalMonths)) {
      limitingTrigger = kmProgress >= timeProgress ? "km" : "time";
    } else {
      limitingTrigger = intervalKm ? "km" : "time";
    }
  }

  // 4) Próxima data prevista (a que ocorrer primeiro entre projeção por km e limite de tempo)
  let earliestDate: Date | null = null;
  if (estimatedDueDateByKm && dueDateByTime) {
    earliestDate =
      estimatedDueDateByKm.getTime() <= dueDateByTime.getTime()
        ? estimatedDueDateByKm
        : dueDateByTime;
  } else {
    earliestDate = dueDateByTime ?? estimatedDueDateByKm;
  }
  const nextDueDate = earliestDate ? toIsoDate(earliestDate) : null;

  // 5) Progresso e textos amigáveis
  const rawProgress = Math.max(kmProgress, timeProgress);
  const progressPercent = Math.round(rawProgress * 100);

  const statusLabel =
    status === "red"
      ? "Vencida · Atenção"
      : status === "yellow"
        ? "Próxima do prazo"
        : "Em dia";

  let remainingLabel = "";
  if (status === "red") {
    if (kmOverdue && timeOverdue) {
      remainingLabel = `Passou ${formatKm(Math.abs(kmRemaining ?? 0))} e ${Math.abs(
        daysRemaining ?? 0
      )} dias`;
    } else if (kmOverdue) {
      const over = Math.abs(kmRemaining ?? 0);
      remainingLabel =
        over === 0 ? "Atingiu o limite de KM" : `Passou ${formatKm(over)}`;
    } else {
      const overDays = Math.abs(daysRemaining ?? 0);
      remainingLabel =
        overDays === 0
          ? "Vence hoje"
          : `Atrasada há ${overDays} ${overDays === 1 ? "dia" : "dias"}`;
    }
  } else if (limitingTrigger === "time" && daysRemaining !== null) {
    remainingLabel =
      daysRemaining === 1
        ? "Falta 1 dia"
        : `Faltam ${daysRemaining} dias`;
  } else if (kmRemaining !== null) {
    remainingLabel = `Faltam ${formatKm(kmRemaining)}`;
  } else if (daysRemaining !== null) {
    remainingLabel = `Faltam ${daysRemaining} dias`;
  }

  let nextForecastLabel = "—";
  if (nextDueKm !== null && nextDueDate) {
    nextForecastLabel = `${formatKm(nextDueKm)} ou ~${formatDateBR(nextDueDate)}`;
  } else if (nextDueKm !== null) {
    nextForecastLabel = formatKm(nextDueKm);
  } else if (nextDueDate) {
    nextForecastLabel = formatDateBR(nextDueDate);
  }

  // Pontuação de urgência para ordenação em "Próximas manutenções"
  const baseWeight = status === "red" ? 200 : status === "yellow" ? 100 : 0;
  const urgencyScore = baseWeight + progressPercent;

  return {
    definition,
    status,
    statusLabel,
    progressPercent,
    kmRemaining,
    daysRemaining,
    remainingLabel,
    lastDoneDate: record.lastDoneDate,
    lastDoneKm: record.lastDoneKm,
    nextDueKm,
    nextDueDate,
    nextForecastLabel,
    limitingTrigger,
    overdueReason,
    effectiveIntervalKm: intervalKm,
    effectiveIntervalDays: intervalDays,
    effectiveIntervalMonths: intervalMonths,
    isCustomInterval,
    urgencyScore,
  };
}

export function evaluateVehicleHealth(
  vehicle: PreventiveVehicle,
  referenceDate: Date = new Date()
): VehicleHealthSummary {
  const items = MAINTENANCE_CATALOG.map((def) => {
    const fallbackRecord: VehicleMaintenanceRecord = {
      lastDoneDate: toIsoDate(referenceDate),
      lastDoneKm: vehicle.currentKm,
    };
    const record = vehicle.maintenanceRecords?.[def.id] ?? fallbackRecord;
    return evaluateMaintenanceItem(def, record, vehicle, referenceDate);
  });

  const greenCount = items.filter((i) => i.status === "green").length;
  const yellowCount = items.filter((i) => i.status === "yellow").length;
  const redCount = items.filter((i) => i.status === "red").length;

  const priorityItems = [...items]
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, 3);

  const overallStatus: MaintenanceStatus =
    redCount > 0 ? "red" : yellowCount > 0 ? "yellow" : "green";

  const healthScore = Math.max(
    15,
    Math.min(100, Math.round(100 - redCount * 22 - yellowCount * 9))
  );

  let overallHeadline = "Tudo em dia com seu carro";
  let overallDescription =
    "Todas as manutenções essenciais estão dentro do prazo. Continue atualizando sua quilometragem.";

  if (redCount > 0) {
    overallHeadline =
      redCount === 1
        ? "1 manutenção precisa de atenção"
        : `${redCount} manutenções precisam de atenção`;
    overallDescription =
      "Resolva primeiro os itens em vermelho para manter seu carro seguro e evitar gastos maiores.";
  } else if (yellowCount > 0) {
    overallHeadline =
      yellowCount === 1
        ? "1 manutenção próxima do vencimento"
        : `${yellowCount} manutenções próximas do vencimento`;
    overallDescription =
      "Programe com calma os itens em amarelo antes de vencer o prazo ou a quilometragem.";
  }

  return {
    items,
    priorityItems,
    greenCount,
    yellowCount,
    redCount,
    overallStatus,
    overallHeadline,
    overallDescription,
    healthScore,
  };
}

export function createVehicleFromDemo(
  template: DemoVehicleTemplate,
  options?: {
    ownerId?: string;
    currentKm?: number;
    year?: number;
    version?: string;
    monthlyUsage?: MonthlyUsageLevel;
    referenceDate?: Date;
  }
): PreventiveVehicle {
  const now = options?.referenceDate ?? new Date();
  const km = options?.currentKm ?? template.suggestedKm;
  const maintenanceRecords = {} as Record<
    MaintenanceItemId,
    VehicleMaintenanceRecord
  >;

  for (const def of MAINTENANCE_CATALOG) {
    const offset = template.demoMaintenanceOffsets[def.id];
    maintenanceRecords[def.id] = {
      lastDoneKm: Math.max(0, km - offset.kmAgo),
      lastDoneDate: toIsoDate(addDays(now, -offset.daysAgo)),
    };
  }

  const timestamp = now.toISOString();
  return {
    id: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ownerId: options?.ownerId ?? "local-driver",
    brand: template.brand,
    model: template.model,
    year: options?.year ?? template.year,
    version: options?.version ?? template.version,
    currentKm: km,
    monthlyUsage: options?.monthlyUsage ?? template.suggestedUsage,
    isDemoData: true,
    demoTemplateId: template.id,
    tirePressure: null,
    maintenanceRecords,
    customIntervals: {},
    history: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createCustomVehicle(input: {
  ownerId?: string;
  brand: string;
  model: string;
  year: number;
  version?: string;
  currentKm: number;
  monthlyUsage: MonthlyUsageLevel;
  fipeCode?: string;
  referenceDate?: Date;
}): PreventiveVehicle {
  const now = input.referenceDate ?? new Date();
  const todayIso = toIsoDate(now);
  const maintenanceRecords = {} as Record<
    MaintenanceItemId,
    VehicleMaintenanceRecord
  >;

  // Para veículo novo sem histórico prévio, inicia a contagem a partir da data e km atuais
  // (usuário pode ajustar qualquer item ou registrar uma troca a qualquer momento).
  for (const def of MAINTENANCE_CATALOG) {
    maintenanceRecords[def.id] = {
      lastDoneKm: input.currentKm,
      lastDoneDate: todayIso,
    };
  }

  const timestamp = now.toISOString();
  return {
    id: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ownerId: input.ownerId ?? "local-driver",
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    version: input.version?.trim() || undefined,
    currentKm: input.currentKm,
    monthlyUsage: input.monthlyUsage,
    isDemoData: false,
    fipeCode: input.fipeCode,
    tirePressure: null,
    maintenanceRecords,
    customIntervals: {},
    history: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Registra uma manutenção realizada ("Já fiz essa troca"):
 * - Atualiza data e km da última manutenção
 * - Recalcula próxima previsão
 * - Salva registro imutável no histórico ordenado por data mais recente
 */
export function recordMaintenanceCompletion(
  vehicle: PreventiveVehicle,
  itemId: MaintenanceItemId,
  params: {
    performedDate: string; // YYYY-MM-DD
    performedKm: number;
    notes?: string;
    referenceDate?: Date;
  }
): { vehicle: PreventiveVehicle; historyEntry: MaintenanceHistoryEntry } {
  const definition = MAINTENANCE_CATALOG.find((item) => item.id === itemId);
  if (!definition) {
    throw new Error(`Item de manutenção desconhecido: ${itemId}`);
  }

  const safeKm = Math.max(0, Math.round(params.performedKm));
  const updatedCurrentKm = Math.max(vehicle.currentKm, safeKm);
  const updatedRecords: Record<MaintenanceItemId, VehicleMaintenanceRecord> = {
    ...vehicle.maintenanceRecords,
    [itemId]: {
      lastDoneDate: params.performedDate,
      lastDoneKm: safeKm,
    },
  };

  const tempVehicle: PreventiveVehicle = {
    ...vehicle,
    currentKm: updatedCurrentKm,
    maintenanceRecords: updatedRecords,
  };

  const evaluation = evaluateMaintenanceItem(
    definition,
    updatedRecords[itemId],
    tempVehicle,
    params.referenceDate ?? parseIsoDate(params.performedDate)
  );

  const historyEntry: MaintenanceHistoryEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    vehicleId: vehicle.id,
    itemId,
    serviceName: definition.name,
    performedDate: params.performedDate,
    performedKm: safeKm,
    nextForecastLabel: evaluation.nextForecastLabel,
    nextDueKm: evaluation.nextDueKm,
    nextDueDate: evaluation.nextDueDate,
    notes: params.notes?.trim() || undefined,
    createdAt: (params.referenceDate ?? new Date()).toISOString(),
  };

  const updatedHistory = [historyEntry, ...vehicle.history].sort((a, b) => {
    if (a.performedDate !== b.performedDate) {
      return b.performedDate.localeCompare(a.performedDate);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  const updatedVehicle: PreventiveVehicle = {
    ...tempVehicle,
    history: updatedHistory,
    updatedAt: (params.referenceDate ?? new Date()).toISOString(),
  };

  return { vehicle: updatedVehicle, historyEntry };
}
