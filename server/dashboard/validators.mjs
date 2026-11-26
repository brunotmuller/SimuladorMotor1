export const VALID_CATEGORIES = Object.freeze([
  "compact",
  "medium_suv",
  "diesel_pickup",
  "premium",
  "electric",
]);

const VALID_CATEGORY_SET = new Set(VALID_CATEGORIES);
const MIN_YEAR = 1950;
const MAX_KM = 2_000_000;
const MAX_REVISION_MONTHS = 120;
const MAX_PAID_COST = 100_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeInt(value) {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isValidCalendarDate(value) {
  if (typeof value !== "string") {
    return false;
  }
  const match = ISO_DATE_RE.exec(value.trim());
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateOptionalString(value, maxLength, fieldLabel) {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${fieldLabel} deve ser um texto válido.` };
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (trimmed.length > maxLength) {
    return {
      ok: false,
      error: `${fieldLabel} deve ter no máximo ${maxLength} caracteres.`,
    };
  }
  return { ok: true, value: trimmed };
}

function validateOptionalPlate(value) {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "A placa deve ser um texto válido." };
  }
  const normalized = value.trim().replace(/\s+/g, "").toUpperCase();
  if (normalized === "") {
    return { ok: true, value: null };
  }
  if (normalized.length > 10) {
    return { ok: false, error: "A placa deve ter no máximo 10 caracteres." };
  }
  return { ok: true, value: normalized };
}

export function validateCreateVehiclePayload(body) {
  const input = isPlainObject(body) ? body : {};
  const fields = {};
  const maxYear = new Date().getFullYear() + 2;

  const brand = typeof input.brand === "string" ? input.brand.trim() : "";
  if (brand.length === 0) {
    fields.brand = "Informe a marca do veículo.";
  } else if (brand.length < 2 || brand.length > 80) {
    fields.brand = "A marca deve ter entre 2 e 80 caracteres.";
  }

  const model = typeof input.model === "string" ? input.model.trim() : "";
  if (model.length === 0) {
    fields.model = "Informe o modelo do veículo.";
  } else if (model.length < 2 || model.length > 80) {
    fields.model = "O modelo deve ter entre 2 e 80 caracteres.";
  }

  if (!isSafeInt(input.year) || input.year < MIN_YEAR || input.year > maxYear) {
    fields.year = `O ano deve ser um inteiro entre ${MIN_YEAR} e ${maxYear}.`;
  }

  if (
    !isSafeInt(input.currentKm) ||
    input.currentKm < 0 ||
    input.currentKm > MAX_KM
  ) {
    fields.currentKm =
      "A quilometragem deve ser um número inteiro entre 0 e 2.000.000.";
  }

  const nicknameResult = validateOptionalString(input.nickname, 40, "O apelido");
  if (!nicknameResult.ok) {
    fields.nickname = nicknameResult.error;
  }

  let lastRevisionMonths = 0;
  if (input.lastRevisionMonths !== undefined && input.lastRevisionMonths !== null) {
    if (
      !isSafeInt(input.lastRevisionMonths) ||
      input.lastRevisionMonths < 0 ||
      input.lastRevisionMonths > MAX_REVISION_MONTHS
    ) {
      fields.lastRevisionMonths =
        "Os meses desde a última revisão devem ser um inteiro entre 0 e 120.";
    } else {
      lastRevisionMonths = input.lastRevisionMonths;
    }
  }

  let lastRevisionKm = null;
  if (input.lastRevisionKm !== undefined && input.lastRevisionKm !== null) {
    if (
      !isSafeInt(input.lastRevisionKm) ||
      input.lastRevisionKm < 0 ||
      input.lastRevisionKm > MAX_KM
    ) {
      fields.lastRevisionKm =
        "A quilometragem da última revisão deve ser um inteiro entre 0 e 2.000.000.";
    } else if (
      isSafeInt(input.currentKm) &&
      input.lastRevisionKm > input.currentKm
    ) {
      fields.lastRevisionKm =
        "A KM da última revisão não pode ser maior que a quilometragem atual.";
    } else {
      lastRevisionKm = input.lastRevisionKm;
    }
  }

  let fuel = "Flex";
  if (input.fuel !== undefined && input.fuel !== null) {
    if (typeof input.fuel !== "string") {
      fields.fuel = "O combustível deve ser um texto válido.";
    } else {
      const trimmedFuel = input.fuel.trim();
      if (trimmedFuel.length > 40) {
        fields.fuel = "O combustível deve ter no máximo 40 caracteres.";
      } else if (trimmedFuel.length > 0) {
        fuel = trimmedFuel;
      }
    }
  }

  let category;
  if (input.category !== undefined && input.category !== null && input.category !== "") {
    if (
      typeof input.category !== "string" ||
      !VALID_CATEGORY_SET.has(input.category)
    ) {
      fields.category = "Categoria de veículo inválida.";
    } else {
      category = input.category;
    }
  }

  const plateResult = validateOptionalPlate(input.plate);
  if (!plateResult.ok) {
    fields.plate = plateResult.error;
  }

  const versionResult = validateOptionalString(input.version, 80, "A versão");
  if (!versionResult.ok) {
    fields.version = versionResult.error;
  }

  const fipePriceResult = validateOptionalString(
    input.fipePrice,
    40,
    "O valor FIPE",
  );
  if (!fipePriceResult.ok) {
    fields.fipePrice = fipePriceResult.error;
  }

  const fipeCodeResult = validateOptionalString(
    input.fipeCode,
    32,
    "O código FIPE",
  );
  if (!fipeCodeResult.ok) {
    fields.fipeCode = fipeCodeResult.error;
  }

  const catalogVehicleIdResult = validateOptionalString(
    input.catalogVehicleId,
    64,
    "O identificador do catálogo",
  );
  if (!catalogVehicleIdResult.ok) {
    fields.catalogVehicleId = catalogVehicleIdResult.error;
  }

  let fipeCached = false;
  if (input.fipeCached !== undefined) {
    if (typeof input.fipeCached !== "boolean") {
      fields.fipeCached = "fipeCached deve ser booleano.";
    } else {
      fipeCached = input.fipeCached;
    }
  }

  let isDemo = false;
  if (input.isDemo !== undefined) {
    if (typeof input.isDemo !== "boolean") {
      fields.isDemo = "isDemo deve ser booleano.";
    } else {
      isDemo = input.isDemo;
    }
  }

  let healthScore;
  if (input.healthScore !== undefined && input.healthScore !== null) {
    if (
      !isSafeInt(input.healthScore) ||
      input.healthScore < 0 ||
      input.healthScore > 100
    ) {
      fields.healthScore = "A nota de saúde deve ser um inteiro entre 0 e 100.";
    } else {
      healthScore = input.healthScore;
    }
  }

  let estimatedConsumption;
  if (
    input.estimatedConsumption !== undefined &&
    input.estimatedConsumption !== null
  ) {
    if (
      typeof input.estimatedConsumption !== "number" ||
      !Number.isFinite(input.estimatedConsumption) ||
      input.estimatedConsumption <= 0 ||
      input.estimatedConsumption > 100
    ) {
      fields.estimatedConsumption =
        "O consumo estimado deve ser um número maior que 0 e até 100.";
    } else {
      estimatedConsumption = Number(input.estimatedConsumption.toFixed(2));
    }
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  const data = {
    brand,
    model,
    year: input.year,
    currentKm: input.currentKm,
    nickname: nicknameResult.value,
    lastRevisionMonths,
    lastRevisionKm,
    fuel,
    plate: plateResult.value,
    version: versionResult.value,
    fipePrice: fipePriceResult.value,
    fipeCode: fipeCodeResult.value,
    catalogVehicleId: catalogVehicleIdResult.value,
    fipeCached,
    isDemo,
  };

  if (category !== undefined) {
    data.category = category;
  }
  if (healthScore !== undefined) {
    data.healthScore = healthScore;
  }
  if (estimatedConsumption !== undefined) {
    data.estimatedConsumption = estimatedConsumption;
  }

  return { valid: true, data };
}

export function validateUpdateVehiclePayload(body) {
  const input = isPlainObject(body) ? body : {};
  const fields = {};
  const data = {};
  const maxYear = new Date().getFullYear() + 2;
  let updatableFieldCount = 0;

  if (hasOwn(input, "brand") && input.brand !== undefined) {
    updatableFieldCount += 1;
    const brand = typeof input.brand === "string" ? input.brand.trim() : "";
    if (brand.length < 2 || brand.length > 80) {
      fields.brand = "A marca deve ter entre 2 e 80 caracteres.";
    } else {
      data.brand = brand;
    }
  }

  if (hasOwn(input, "model") && input.model !== undefined) {
    updatableFieldCount += 1;
    const model = typeof input.model === "string" ? input.model.trim() : "";
    if (model.length < 2 || model.length > 80) {
      fields.model = "O modelo deve ter entre 2 e 80 caracteres.";
    } else {
      data.model = model;
    }
  }

  if (hasOwn(input, "year") && input.year !== undefined) {
    updatableFieldCount += 1;
    if (!isSafeInt(input.year) || input.year < MIN_YEAR || input.year > maxYear) {
      fields.year = `O ano deve ser um inteiro entre ${MIN_YEAR} e ${maxYear}.`;
    } else {
      data.year = input.year;
    }
  }

  if (hasOwn(input, "currentKm") && input.currentKm !== undefined) {
    updatableFieldCount += 1;
    if (
      !isSafeInt(input.currentKm) ||
      input.currentKm < 0 ||
      input.currentKm > MAX_KM
    ) {
      fields.currentKm =
        "A quilometragem deve ser um número inteiro entre 0 e 2.000.000.";
    } else {
      data.currentKm = input.currentKm;
    }
  }

  if (hasOwn(input, "nickname") && input.nickname !== undefined) {
    updatableFieldCount += 1;
    const res = validateOptionalString(input.nickname, 40, "O apelido");
    if (!res.ok) {
      fields.nickname = res.error;
    } else {
      data.nickname = res.value;
    }
  }

  if (
    hasOwn(input, "lastRevisionMonths") &&
    input.lastRevisionMonths !== undefined
  ) {
    updatableFieldCount += 1;
    if (
      !isSafeInt(input.lastRevisionMonths) ||
      input.lastRevisionMonths < 0 ||
      input.lastRevisionMonths > MAX_REVISION_MONTHS
    ) {
      fields.lastRevisionMonths =
        "Os meses desde a última revisão devem ser um inteiro entre 0 e 120.";
    } else {
      data.lastRevisionMonths = input.lastRevisionMonths;
    }
  }

  if (hasOwn(input, "lastRevisionKm") && input.lastRevisionKm !== undefined) {
    updatableFieldCount += 1;
    if (input.lastRevisionKm === null) {
      data.lastRevisionKm = null;
    } else if (
      !isSafeInt(input.lastRevisionKm) ||
      input.lastRevisionKm < 0 ||
      input.lastRevisionKm > MAX_KM
    ) {
      fields.lastRevisionKm =
        "A quilometragem da última revisão deve ser um inteiro entre 0 e 2.000.000.";
    } else if (
      data.currentKm !== undefined &&
      input.lastRevisionKm > data.currentKm
    ) {
      fields.lastRevisionKm =
        "A KM da última revisão não pode ser maior que a quilometragem atual.";
    } else {
      data.lastRevisionKm = input.lastRevisionKm;
    }
  }

  if (hasOwn(input, "fuel") && input.fuel !== undefined) {
    updatableFieldCount += 1;
    if (typeof input.fuel !== "string" || input.fuel.trim().length === 0) {
      fields.fuel = "Informe um combustível válido.";
    } else if (input.fuel.trim().length > 40) {
      fields.fuel = "O combustível deve ter no máximo 40 caracteres.";
    } else {
      data.fuel = input.fuel.trim();
    }
  }

  if (hasOwn(input, "category") && input.category !== undefined) {
    updatableFieldCount += 1;
    if (
      typeof input.category !== "string" ||
      !VALID_CATEGORY_SET.has(input.category)
    ) {
      fields.category = "Categoria de veículo inválida.";
    } else {
      data.category = input.category;
    }
  }

  if (hasOwn(input, "plate") && input.plate !== undefined) {
    updatableFieldCount += 1;
    const res = validateOptionalPlate(input.plate);
    if (!res.ok) {
      fields.plate = res.error;
    } else {
      data.plate = res.value;
    }
  }

  if (hasOwn(input, "version") && input.version !== undefined) {
    updatableFieldCount += 1;
    const res = validateOptionalString(input.version, 80, "A versão");
    if (!res.ok) {
      fields.version = res.error;
    } else {
      data.version = res.value;
    }
  }

  if (hasOwn(input, "fipePrice") && input.fipePrice !== undefined) {
    updatableFieldCount += 1;
    const res = validateOptionalString(input.fipePrice, 40, "O valor FIPE");
    if (!res.ok) {
      fields.fipePrice = res.error;
    } else {
      data.fipePrice = res.value;
    }
  }

  if (hasOwn(input, "fipeCode") && input.fipeCode !== undefined) {
    updatableFieldCount += 1;
    const res = validateOptionalString(input.fipeCode, 32, "O código FIPE");
    if (!res.ok) {
      fields.fipeCode = res.error;
    } else {
      data.fipeCode = res.value;
    }
  }

  if (hasOwn(input, "fipeCached") && input.fipeCached !== undefined) {
    updatableFieldCount += 1;
    if (typeof input.fipeCached !== "boolean") {
      fields.fipeCached = "fipeCached deve ser booleano.";
    } else {
      data.fipeCached = input.fipeCached;
    }
  }

  if (hasOwn(input, "healthScore") && input.healthScore !== undefined) {
    updatableFieldCount += 1;
    if (
      !isSafeInt(input.healthScore) ||
      input.healthScore < 0 ||
      input.healthScore > 100
    ) {
      fields.healthScore = "A nota de saúde deve ser um inteiro entre 0 e 100.";
    } else {
      data.healthScore = input.healthScore;
    }
  }

  if (
    hasOwn(input, "estimatedConsumption") &&
    input.estimatedConsumption !== undefined
  ) {
    updatableFieldCount += 1;
    if (
      typeof input.estimatedConsumption !== "number" ||
      !Number.isFinite(input.estimatedConsumption) ||
      input.estimatedConsumption <= 0 ||
      input.estimatedConsumption > 100
    ) {
      fields.estimatedConsumption =
        "O consumo estimado deve ser um número maior que 0 e até 100.";
    } else {
      data.estimatedConsumption = Number(input.estimatedConsumption.toFixed(2));
    }
  }

  if (
    hasOwn(input, "confirmKmRegression") &&
    input.confirmKmRegression !== undefined
  ) {
    if (typeof input.confirmKmRegression !== "boolean") {
      fields.confirmKmRegression = "confirmKmRegression deve ser booleano.";
    } else {
      data.confirmKmRegression = input.confirmKmRegression;
    }
  }

  if (updatableFieldCount === 0 && Object.keys(fields).length === 0) {
    fields._form = "Informe ao menos um campo para atualizar o veículo.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return { valid: true, data };
}

export function validateCreateMaintenanceLogPayload(body) {
  const input = isPlainObject(body) ? body : {};
  const fields = {};

  const vehicleId =
    typeof input.vehicleId === "string" ? input.vehicleId.trim() : "";
  if (vehicleId.length === 0) {
    fields.vehicleId = "Informe o veículo da manutenção.";
  }

  const serviceId =
    typeof input.serviceId === "string" ? input.serviceId.trim() : "";
  if (serviceId.length === 0) {
    fields.serviceId = "Informe o serviço realizado.";
  }

  const performedAt =
    typeof input.performedAt === "string" ? input.performedAt.trim() : "";
  if (!isValidCalendarDate(performedAt)) {
    fields.performedAt = "Informe uma data válida no formato YYYY-MM-DD.";
  }

  if (
    !isSafeInt(input.performedKm) ||
    input.performedKm < 0 ||
    input.performedKm > MAX_KM
  ) {
    fields.performedKm =
      "A quilometragem da manutenção deve ser um inteiro entre 0 e 2.000.000.";
  }

  let paidCost = null;
  if (input.paidCost !== undefined && input.paidCost !== null) {
    if (
      typeof input.paidCost !== "number" ||
      !Number.isFinite(input.paidCost) ||
      input.paidCost < 0 ||
      input.paidCost > MAX_PAID_COST
    ) {
      fields.paidCost =
        "O valor pago deve ser um número entre 0 e 100.000.";
    } else {
      paidCost = Number(input.paidCost.toFixed(2));
    }
  }

  const notesResult = validateOptionalString(input.notes, 200, "As observações");
  if (!notesResult.ok) {
    fields.notes = notesResult.error;
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return {
    valid: true,
    data: {
      vehicleId,
      serviceId,
      performedAt,
      performedKm: input.performedKm,
      paidCost,
      notes: notesResult.value,
    },
  };
}
