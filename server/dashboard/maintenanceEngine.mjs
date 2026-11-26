export const CATEGORY_COST_FACTORS = Object.freeze({
  compact: 1.0,
  medium_suv: 1.22,
  diesel_pickup: 1.45,
  premium: 1.85,
  electric: 0.95,
});

const URGENCY_ORDER = Object.freeze({
  urgent: 0,
  recommended: 1,
  upcoming: 2,
});

const STATUS_LABELS = Object.freeze({
  urgent: "Atrasada / Urgente",
  recommended: "Recomendada agora",
  upcoming: "Próxima revisão",
});

const ELECTRIC_RE =
  /eletric|electric|\b(byd|dolphin|seal|yuan|tesla|leaf|zoe|ev|e-tech)\b/i;

const PREMIUM_RE =
  /\b(bmw|mercedes|audi|volvo|porsche|lexus|jaguar|land rover|mini|alfa romeo|maserati)\b/i;

const DIESEL_PICKUP_RE =
  /\b(diesel|hilux|s10|ranger|amarok|l200|triton|frontier|strada|toro|saveiro|montana|rampage|maverick|ram|sw4|pajero|trailblazer)\b/i;

const MEDIUM_SUV_RE =
  /\b(corolla|civic|cruze|sentra|jetta|compass|renegade|creta|t-cross|tcross|nivus|taos|tracker|hr-v|hrv|zr-v|cr-v|kicks|duster|tiggo|haval|rav4|tucson|sportage|equinox|fastback|pulse|suv|turbo)\b/i;

const DAYS_PER_MONTH = 30.4375;
const MS_PER_DAY = 86_400_000;

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseIsoDateUtc(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate ?? ""));
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDateUtc(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsUtc(baseDate, monthsToAdd) {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const day = baseDate.getUTCDate();

  const targetMonthIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfMonth = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfMonth);

  return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
}

export function roundToNearest5(value) {
  return Math.round(Number(value) / 5) * 5;
}

export function isElectricVehicle(vehicle = {}) {
  if (!vehicle || typeof vehicle !== "object") {
    return false;
  }
  if (vehicle.category === "electric") {
    return true;
  }
  const combined = normalizeText(
    `${vehicle.fuel ?? ""} ${vehicle.brand ?? ""} ${vehicle.model ?? ""}`,
  );
  return ELECTRIC_RE.test(combined);
}

export function inferVehicleCategory(vehicle = {}) {
  const explicitCategory = vehicle?.category;
  if (
    typeof explicitCategory === "string" &&
    Object.prototype.hasOwnProperty.call(CATEGORY_COST_FACTORS, explicitCategory)
  ) {
    return {
      category: explicitCategory,
      costFactor: CATEGORY_COST_FACTORS[explicitCategory],
    };
  }

  if (isElectricVehicle(vehicle)) {
    return {
      category: "electric",
      costFactor: CATEGORY_COST_FACTORS.electric,
    };
  }

  const combined = normalizeText(
    `${vehicle?.fuel ?? ""} ${vehicle?.brand ?? ""} ${vehicle?.model ?? ""}`,
  );

  if (PREMIUM_RE.test(combined)) {
    return {
      category: "premium",
      costFactor: CATEGORY_COST_FACTORS.premium,
    };
  }

  if (DIESEL_PICKUP_RE.test(combined)) {
    return {
      category: "diesel_pickup",
      costFactor: CATEGORY_COST_FACTORS.diesel_pickup,
    };
  }

  if (MEDIUM_SUV_RE.test(combined)) {
    return {
      category: "medium_suv",
      costFactor: CATEGORY_COST_FACTORS.medium_suv,
    };
  }

  return {
    category: "compact",
    costFactor: CATEGORY_COST_FACTORS.compact,
  };
}

function compareLogRecency(a, b) {
  const dateA = String(a.performedAt ?? a.performed_at ?? "");
  const dateB = String(b.performedAt ?? b.performed_at ?? "");
  if (dateA !== dateB) {
    return dateA > dateB ? 1 : -1;
  }

  const kmA = Number(a.performedKm ?? a.performed_km ?? 0);
  const kmB = Number(b.performedKm ?? b.performed_km ?? 0);
  if (kmA !== kmB) {
    return kmA > kmB ? 1 : -1;
  }

  const createdA = String(a.createdAt ?? a.created_at ?? "");
  const createdB = String(b.createdAt ?? b.created_at ?? "");
  if (createdA !== createdB) {
    return createdA > createdB ? 1 : -1;
  }

  return 0;
}

function buildLatestLogsByService(logs) {
  const latestByService = new Map();
  for (const log of logs ?? []) {
    const serviceId = log?.serviceId ?? log?.service_id;
    if (!serviceId) {
      continue;
    }
    const existing = latestByService.get(serviceId);
    if (!existing || compareLogRecency(log, existing) > 0) {
      latestByService.set(serviceId, log);
    }
  }
  return latestByService;
}

function buildReason({
  dueByKm,
  dueByTime,
  overdueKm,
  overdueMonths,
  intervalKm,
  intervalMonths,
  nextDueKm,
  currentKm,
}) {
  if (dueByKm && dueByTime) {
    const kmPart =
      overdueKm > 0
        ? `${overdueKm.toLocaleString("pt-BR")} km acima do intervalo`
        : `atingiu o marco de ${intervalKm.toLocaleString("pt-BR")} km`;
    const timePart =
      overdueMonths > 0
        ? `e ${overdueMonths} mês(es) além do prazo`
        : `e prazo de ${intervalMonths} meses atingido`;
    return `${kmPart} ${timePart}.`;
  }
  if (dueByKm) {
    if (overdueKm > 0) {
      return `Passou ${overdueKm.toLocaleString("pt-BR")} km do intervalo de ${intervalKm.toLocaleString("pt-BR")} km.`;
    }
    return `Atingiu o marco de ${intervalKm.toLocaleString("pt-BR")} km.`;
  }
  if (dueByTime) {
    if (overdueMonths > 0) {
      return `Vencida há ${overdueMonths} mês(es) (prazo de ${intervalMonths} meses).`;
    }
    return `Prazo de ${intervalMonths} meses atingido desde a última revisão.`;
  }
  const remainingKm = Math.max(0, nextDueKm - currentKm);
  return `Faltam ${remainingKm.toLocaleString("pt-BR")} km para o marco de ${nextDueKm.toLocaleString("pt-BR")} km.`;
}

export function evaluateVehicleMaintenances(
  vehicle,
  activeServices = [],
  logs = [],
  referenceDate = new Date(),
) {
  const refDate =
    referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refUtc = new Date(
    Date.UTC(
      refDate.getUTCFullYear(),
      refDate.getUTCMonth(),
      refDate.getUTCDate(),
    ),
  );

  const electric = isElectricVehicle(vehicle);
  const inferred = inferVehicleCategory(vehicle);
  const rawCostFactor = vehicle?.costFactor ?? vehicle?.cost_factor;
  const costFactor =
    typeof rawCostFactor === "number" &&
    Number.isFinite(rawCostFactor) &&
    rawCostFactor > 0
      ? rawCostFactor
      : inferred.costFactor;

  const currentKm = Math.max(
    0,
    Number(vehicle?.currentKm ?? vehicle?.current_km ?? 0),
  );
  const lastRevisionMonths = Math.max(
    0,
    Number(vehicle?.lastRevisionMonths ?? vehicle?.last_revision_months ?? 0),
  );
  const rawLastRevisionKm =
    vehicle?.lastRevisionKm ?? vehicle?.last_revision_km ?? null;
  const lastRevisionKm =
    rawLastRevisionKm !== null &&
    rawLastRevisionKm !== undefined &&
    Number.isFinite(Number(rawLastRevisionKm))
      ? Math.min(currentKm, Math.max(0, Number(rawLastRevisionKm)))
      : null;

  const latestLogs = buildLatestLogsByService(logs);
  const items = [];

  for (const service of activeServices ?? []) {
    const isActive = service?.active === 1 || service?.active === true;
    if (!isActive) {
      continue;
    }

    const combustionOnly =
      service?.combustion_only === 1 || service?.combustionOnly === true;
    if (electric && combustionOnly) {
      continue;
    }

    const serviceId = service.id;
    const intervalKm = Number(service.intervalKm ?? service.interval_km);
    const rawIntervalMonths =
      service.intervalMonths ?? service.interval_months ?? null;
    const intervalMonths =
      rawIntervalMonths !== null && Number(rawIntervalMonths) > 0
        ? Number(rawIntervalMonths)
        : null;
    const baseCost = Number(service.baseCost ?? service.base_cost);
    const estimatedCost = roundToNearest5(baseCost * costFactor);

    const lastLog = latestLogs.get(serviceId) ?? null;

    let lastDoneKm = null;
    let lastDoneAt = null;
    let nextDueKm;
    let nextDueDate = null;
    let dueByKm = false;
    let overdueKm = 0;
    let dueByTime = false;
    let overdueMonths = 0;

    if (lastLog) {
      lastDoneKm = Number(lastLog.performedKm ?? lastLog.performed_km);
      lastDoneAt = String(lastLog.performedAt ?? lastLog.performed_at);

      const kmSinceLast = Math.max(0, currentKm - lastDoneKm);
      nextDueKm = lastDoneKm + intervalKm;
      dueByKm = kmSinceLast >= intervalKm;
      overdueKm = dueByKm ? kmSinceLast - intervalKm : 0;

      if (intervalMonths !== null) {
        const lastDoneDate = parseIsoDateUtc(lastDoneAt);
        if (lastDoneDate) {
          const diffDays = Math.max(
            0,
            (refUtc.getTime() - lastDoneDate.getTime()) / MS_PER_DAY,
          );
          const monthsSinceLast = diffDays / DAYS_PER_MONTH;
          dueByTime = monthsSinceLast >= intervalMonths;
          overdueMonths = dueByTime
            ? Math.max(0, Math.round(monthsSinceLast - intervalMonths))
            : 0;
          nextDueDate = formatIsoDateUtc(
            addMonthsUtc(lastDoneDate, intervalMonths),
          );
        }
      }
    } else {
      if (lastRevisionKm !== null) {
        const baselineKm =
          intervalKm <= 10000
            ? lastRevisionKm
            : Math.floor(lastRevisionKm / intervalKm) * intervalKm;
        const kmSinceBaseline = Math.max(0, currentKm - baselineKm);
        nextDueKm = baselineKm + intervalKm;
        dueByKm = kmSinceBaseline >= intervalKm;
        overdueKm = dueByKm ? kmSinceBaseline - intervalKm : 0;
      } else {
        dueByKm = currentKm >= intervalKm;
        overdueKm = dueByKm ? currentKm - intervalKm : 0;
        nextDueKm = dueByKm ? currentKm : intervalKm;
      }

      if (intervalMonths !== null) {
        dueByTime = lastRevisionMonths >= intervalMonths;
        overdueMonths = dueByTime ? lastRevisionMonths - intervalMonths : 0;
        const remainingMonths = Math.max(0, intervalMonths - lastRevisionMonths);
        nextDueDate = formatIsoDateUtc(addMonthsUtc(refUtc, remainingMonths));
      }
    }

    const dueNow = dueByKm || dueByTime;
    const urgentByKm =
      dueByKm && (overdueKm > intervalKm * 0.2 || overdueKm > 2000);
    const urgentByTime =
      dueByTime &&
      intervalMonths !== null &&
      overdueMonths > intervalMonths * 0.2;

    const urgency = dueNow
      ? urgentByKm || urgentByTime
        ? "urgent"
        : "recommended"
      : "upcoming";

    items.push({
      serviceId,
      name: service.name,
      category: service.category,
      urgency,
      statusLabel: STATUS_LABELS[urgency],
      reason: buildReason({
        dueByKm,
        dueByTime,
        overdueKm,
        overdueMonths,
        intervalKm,
        intervalMonths,
        nextDueKm,
        currentKm,
      }),
      intervalKm,
      intervalMonths,
      baseCost,
      estimatedCost,
      combustionOnly,
      notes: service.notes ?? null,
      lastDoneKm,
      lastDoneAt,
      nextDueKm,
      nextDueDate,
      overdueKm,
      overdueMonths,
      dueNow,
    });
  }

  items.sort((a, b) => {
    const rankDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (rankDiff !== 0) {
      return rankDiff;
    }
    if (a.urgency === "upcoming") {
      if (a.nextDueKm !== b.nextDueKm) {
        return a.nextDueKm - b.nextDueKm;
      }
      return a.intervalKm - b.intervalKm;
    }
    if (a.overdueKm !== b.overdueKm) {
      return b.overdueKm - a.overdueKm;
    }
    if (a.overdueMonths !== b.overdueMonths) {
      return b.overdueMonths - a.overdueMonths;
    }
    return a.intervalKm - b.intervalKm;
  });

  let urgentCount = 0;
  let recommendedCount = 0;
  let upcomingCount = 0;
  let totalDueCost = 0;
  let totalUpcomingCost = 0;

  for (const item of items) {
    if (item.urgency === "urgent") {
      urgentCount += 1;
      totalDueCost += item.estimatedCost;
    } else if (item.urgency === "recommended") {
      recommendedCount += 1;
      totalDueCost += item.estimatedCost;
    } else {
      upcomingCount += 1;
      totalUpcomingCost += item.estimatedCost;
    }
  }

  const futureMilestones = items
    .map((item) => item.nextDueKm)
    .filter((km) => km > currentKm);
  const nextMilestoneKm =
    futureMilestones.length > 0
      ? Math.min(...futureMilestones)
      : items.length > 0
        ? Math.min(...items.map((item) => item.nextDueKm))
        : null;

  const rawHealthScore = vehicle?.healthScore ?? vehicle?.health_score;
  const computedHealth = Math.max(
    20,
    Math.min(100, 100 - urgentCount * 12 - recommendedCount * 6),
  );
  const healthScore =
    typeof rawHealthScore === "number" && Number.isFinite(rawHealthScore)
      ? Math.max(0, Math.min(100, Math.round(rawHealthScore)))
      : computedHealth;

  const rawConsumption =
    vehicle?.estimatedConsumption ?? vehicle?.estimated_consumption;
  const estimatedConsumption =
    typeof rawConsumption === "number" &&
    Number.isFinite(rawConsumption) &&
    rawConsumption > 0
      ? Number(rawConsumption.toFixed(1))
      : electric
        ? 6.0
        : 11.5;

  const summary = {
    healthScore,
    estimatedConsumption,
    consumptionUnit: electric ? "km/kWh" : "km/L",
    urgentCount,
    recommendedCount,
    upcomingCount,
    dueCount: urgentCount + recommendedCount,
    nextMilestoneKm,
    totalDueCost,
    totalUpcomingCost,
  };

  return { items, summary };
}
