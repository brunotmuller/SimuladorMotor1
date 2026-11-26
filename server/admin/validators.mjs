import { VALID_CATEGORIES } from "../dashboard/validators.mjs";

const VALID_CATEGORY_SET = new Set(VALID_CATEGORIES);

const MIN_YEAR = 1950;
const MIN_COST_FACTOR = 0.5;
const MAX_COST_FACTOR = 5.0;
const MAX_CONSUMPTION = 100;

const MIN_INTERVAL_KM = 1_000;
const MAX_INTERVAL_KM = 300_000;
const MIN_INTERVAL_MONTHS = 1;
const MAX_INTERVAL_MONTHS = 120;
const MAX_BASE_COST = 100_000;

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isSafeInt(value) {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function readParam(source, key) {
  if (!source) {
    return undefined;
  }
  if (typeof source.get === "function") {
    const value = source.get(key);
    return value === null ? undefined : value;
  }
  if (typeof source === "object") {
    return source[key];
  }
  return undefined;
}

function parseStrictIntegerParam(rawValue) {
  if (typeof rawValue === "number") {
    return Number.isSafeInteger(rawValue) ? rawValue : null;
  }
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function validateOptionalText(value, maxLength, label) {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${label} deve ser um texto válido.` };
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (trimmed.length > maxLength) {
    return {
      ok: false,
      error: `${label} deve ter no máximo ${maxLength} caracteres.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function parsePagination(searchParams) {
  const fields = {};

  const rawPage = readParam(searchParams, "page");
  let page = DEFAULT_PAGE;
  if (
    rawPage !== undefined &&
    rawPage !== null &&
    String(rawPage).trim() !== ""
  ) {
    const parsedPage = parseStrictIntegerParam(rawPage);
    if (parsedPage === null || parsedPage < 1) {
      fields.page = "A página deve ser um número inteiro maior ou igual a 1.";
    } else {
      page = parsedPage;
    }
  }

  const rawLimit = readParam(searchParams, "limit");
  let limit = DEFAULT_LIMIT;
  if (
    rawLimit !== undefined &&
    rawLimit !== null &&
    String(rawLimit).trim() !== ""
  ) {
    const parsedLimit = parseStrictIntegerParam(rawLimit);
    if (parsedLimit === null || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
      fields.limit = `O limite por página deve ser um número inteiro entre 1 e ${MAX_LIMIT}.`;
    } else {
      limit = parsedLimit;
    }
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return { valid: true, data: { page, limit } };
}

export function validateCreateCatalogVehicle(body) {
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

  const fuel = typeof input.fuel === "string" ? input.fuel.trim() : "";
  if (fuel.length === 0) {
    fields.fuel = "Informe o tipo de combustível.";
  } else if (fuel.length < 2 || fuel.length > 40) {
    fields.fuel = "O combustível deve ter entre 2 e 40 caracteres.";
  }

  const category = typeof input.category === "string" ? input.category : "";
  if (!VALID_CATEGORY_SET.has(category)) {
    fields.category = "Categoria de veículo inválida.";
  }

  let costFactor;
  if (
    !isFiniteNumber(input.costFactor) ||
    input.costFactor < MIN_COST_FACTOR ||
    input.costFactor > MAX_COST_FACTOR
  ) {
    fields.costFactor =
      "O fator de custo deve ser um número entre 0.50 e 5.00.";
  } else {
    costFactor = Number(input.costFactor.toFixed(2));
  }

  let referenceConsumption = category === "electric" ? 6.0 : 11.5;
  if (
    input.referenceConsumption !== undefined &&
    input.referenceConsumption !== null
  ) {
    if (
      !isFiniteNumber(input.referenceConsumption) ||
      input.referenceConsumption <= 0 ||
      input.referenceConsumption > MAX_CONSUMPTION
    ) {
      fields.referenceConsumption =
        "O consumo de referência deve ser maior que 0 e até 100.";
    } else {
      referenceConsumption = Number(input.referenceConsumption.toFixed(2));
    }
  }

  const fipePriceResult = validateOptionalText(
    input.fipePrice,
    40,
    "O valor FIPE",
  );
  if (!fipePriceResult.ok) {
    fields.fipePrice = fipePriceResult.error;
  }

  let active = true;
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") {
      fields.active = "O status ativo deve ser booleano.";
    } else {
      active = input.active;
    }
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return {
    valid: true,
    data: {
      brand,
      model,
      year: input.year,
      fuel,
      category,
      costFactor,
      referenceConsumption,
      fipePrice: fipePriceResult.value,
      active,
    },
  };
}

export function validateUpdateCatalogVehicle(body) {
  const input = isPlainObject(body) ? body : {};
  const fields = {};
  const data = {};
  const maxYear = new Date().getFullYear() + 2;
  let updatableCount = 0;

  if (hasOwn(input, "brand") && input.brand !== undefined) {
    updatableCount += 1;
    const brand = typeof input.brand === "string" ? input.brand.trim() : "";
    if (brand.length < 2 || brand.length > 80) {
      fields.brand = "A marca deve ter entre 2 e 80 caracteres.";
    } else {
      data.brand = brand;
    }
  }

  if (hasOwn(input, "model") && input.model !== undefined) {
    updatableCount += 1;
    const model = typeof input.model === "string" ? input.model.trim() : "";
    if (model.length < 2 || model.length > 80) {
      fields.model = "O modelo deve ter entre 2 e 80 caracteres.";
    } else {
      data.model = model;
    }
  }

  if (hasOwn(input, "year") && input.year !== undefined) {
    updatableCount += 1;
    if (!isSafeInt(input.year) || input.year < MIN_YEAR || input.year > maxYear) {
      fields.year = `O ano deve ser um inteiro entre ${MIN_YEAR} e ${maxYear}.`;
    } else {
      data.year = input.year;
    }
  }

  if (hasOwn(input, "fuel") && input.fuel !== undefined) {
    updatableCount += 1;
    const fuel = typeof input.fuel === "string" ? input.fuel.trim() : "";
    if (fuel.length < 2 || fuel.length > 40) {
      fields.fuel = "O combustível deve ter entre 2 e 40 caracteres.";
    } else {
      data.fuel = fuel;
    }
  }

  if (hasOwn(input, "category") && input.category !== undefined) {
    updatableCount += 1;
    if (
      typeof input.category !== "string" ||
      !VALID_CATEGORY_SET.has(input.category)
    ) {
      fields.category = "Categoria de veículo inválida.";
    } else {
      data.category = input.category;
    }
  }

  if (hasOwn(input, "costFactor") && input.costFactor !== undefined) {
    updatableCount += 1;
    if (
      !isFiniteNumber(input.costFactor) ||
      input.costFactor < MIN_COST_FACTOR ||
      input.costFactor > MAX_COST_FACTOR
    ) {
      fields.costFactor =
        "O fator de custo deve ser um número entre 0.50 e 5.00.";
    } else {
      data.costFactor = Number(input.costFactor.toFixed(2));
    }
  }

  if (
    hasOwn(input, "referenceConsumption") &&
    input.referenceConsumption !== undefined
  ) {
    updatableCount += 1;
    if (
      !isFiniteNumber(input.referenceConsumption) ||
      input.referenceConsumption <= 0 ||
      input.referenceConsumption > MAX_CONSUMPTION
    ) {
      fields.referenceConsumption =
        "O consumo de referência deve ser maior que 0 e até 100.";
    } else {
      data.referenceConsumption = Number(input.referenceConsumption.toFixed(2));
    }
  }

  if (hasOwn(input, "fipePrice") && input.fipePrice !== undefined) {
    updatableCount += 1;
    const res = validateOptionalText(input.fipePrice, 40, "O valor FIPE");
    if (!res.ok) {
      fields.fipePrice = res.error;
    } else {
      data.fipePrice = res.value;
    }
  }

  if (hasOwn(input, "active") && input.active !== undefined) {
    updatableCount += 1;
    if (typeof input.active !== "boolean") {
      fields.active = "O status ativo deve ser booleano.";
    } else {
      data.active = input.active;
    }
  }

  if (updatableCount === 0 && Object.keys(fields).length === 0) {
    fields._form =
      "Informe ao menos um campo para atualizar o veículo do catálogo.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return { valid: true, data };
}

export function validateCreateCatalogService(body) {
  const input = isPlainObject(body) ? body : {};
  const fields = {};

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length === 0) {
    fields.name = "Informe o nome do serviço.";
  } else if (name.length < 3 || name.length > 100) {
    fields.name = "O nome do serviço deve ter entre 3 e 100 caracteres.";
  }

  const category =
    typeof input.category === "string" ? input.category.trim() : "";
  if (category.length === 0) {
    fields.category = "Informe a categoria do serviço.";
  } else if (category.length < 2 || category.length > 40) {
    fields.category = "A categoria deve ter entre 2 e 40 caracteres.";
  }

  if (
    !isSafeInt(input.intervalKm) ||
    input.intervalKm < MIN_INTERVAL_KM ||
    input.intervalKm > MAX_INTERVAL_KM
  ) {
    fields.intervalKm =
      "O intervalo em km deve ser um número inteiro entre 1.000 e 300.000.";
  }

  let intervalMonths = null;
  if (input.intervalMonths !== undefined && input.intervalMonths !== null) {
    if (
      !isSafeInt(input.intervalMonths) ||
      input.intervalMonths < MIN_INTERVAL_MONTHS ||
      input.intervalMonths > MAX_INTERVAL_MONTHS
    ) {
      fields.intervalMonths =
        "O prazo em meses deve ser um número inteiro entre 1 e 120.";
    } else {
      intervalMonths = input.intervalMonths;
    }
  }

  let baseCost;
  if (
    !isFiniteNumber(input.baseCost) ||
    input.baseCost < 0 ||
    input.baseCost > MAX_BASE_COST
  ) {
    fields.baseCost = "O custo-base deve ser um número entre 0 e 100.000.";
  } else {
    baseCost = Number(input.baseCost.toFixed(2));
  }

  let combustionOnly = false;
  if (input.combustionOnly !== undefined) {
    if (typeof input.combustionOnly !== "boolean") {
      fields.combustionOnly = "combustionOnly deve ser booleano.";
    } else {
      combustionOnly = input.combustionOnly;
    }
  }

  const notesResult = validateOptionalText(
    input.notes,
    240,
    "As observações técnicas",
  );
  if (!notesResult.ok) {
    fields.notes = notesResult.error;
  }

  let active = true;
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") {
      fields.active = "O status ativo deve ser booleano.";
    } else {
      active = input.active;
    }
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return {
    valid: true,
    data: {
      name,
      category,
      intervalKm: input.intervalKm,
      intervalMonths,
      baseCost,
      combustionOnly,
      notes: notesResult.value,
      active,
    },
  };
}

export function validateUpdateCatalogService(body) {
  const input = isPlainObject(body) ? body : {};
  const fields = {};
  const data = {};
  let updatableCount = 0;

  if (hasOwn(input, "name") && input.name !== undefined) {
    updatableCount += 1;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length < 3 || name.length > 100) {
      fields.name = "O nome do serviço deve ter entre 3 e 100 caracteres.";
    } else {
      data.name = name;
    }
  }

  if (hasOwn(input, "category") && input.category !== undefined) {
    updatableCount += 1;
    const category =
      typeof input.category === "string" ? input.category.trim() : "";
    if (category.length < 2 || category.length > 40) {
      fields.category = "A categoria deve ter entre 2 e 40 caracteres.";
    } else {
      data.category = category;
    }
  }

  if (hasOwn(input, "intervalKm") && input.intervalKm !== undefined) {
    updatableCount += 1;
    if (
      !isSafeInt(input.intervalKm) ||
      input.intervalKm < MIN_INTERVAL_KM ||
      input.intervalKm > MAX_INTERVAL_KM
    ) {
      fields.intervalKm =
        "O intervalo em km deve ser um número inteiro entre 1.000 e 300.000.";
    } else {
      data.intervalKm = input.intervalKm;
    }
  }

  if (hasOwn(input, "intervalMonths") && input.intervalMonths !== undefined) {
    updatableCount += 1;
    if (input.intervalMonths === null) {
      data.intervalMonths = null;
    } else if (
      !isSafeInt(input.intervalMonths) ||
      input.intervalMonths < MIN_INTERVAL_MONTHS ||
      input.intervalMonths > MAX_INTERVAL_MONTHS
    ) {
      fields.intervalMonths =
        "O prazo em meses deve ser um número inteiro entre 1 e 120.";
    } else {
      data.intervalMonths = input.intervalMonths;
    }
  }

  if (hasOwn(input, "baseCost") && input.baseCost !== undefined) {
    updatableCount += 1;
    if (
      !isFiniteNumber(input.baseCost) ||
      input.baseCost < 0 ||
      input.baseCost > MAX_BASE_COST
    ) {
      fields.baseCost = "O custo-base deve ser um número entre 0 e 100.000.";
    } else {
      data.baseCost = Number(input.baseCost.toFixed(2));
    }
  }

  if (hasOwn(input, "combustionOnly") && input.combustionOnly !== undefined) {
    updatableCount += 1;
    if (typeof input.combustionOnly !== "boolean") {
      fields.combustionOnly = "combustionOnly deve ser booleano.";
    } else {
      data.combustionOnly = input.combustionOnly;
    }
  }

  if (hasOwn(input, "notes") && input.notes !== undefined) {
    updatableCount += 1;
    const res = validateOptionalText(
      input.notes,
      240,
      "As observações técnicas",
    );
    if (!res.ok) {
      fields.notes = res.error;
    } else {
      data.notes = res.value;
    }
  }

  if (hasOwn(input, "active") && input.active !== undefined) {
    updatableCount += 1;
    if (typeof input.active !== "boolean") {
      fields.active = "O status ativo deve ser booleano.";
    } else {
      data.active = input.active;
    }
  }

  if (updatableCount === 0 && Object.keys(fields).length === 0) {
    fields._form =
      "Informe ao menos um campo para atualizar o serviço do catálogo.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return { valid: true, data };
}
