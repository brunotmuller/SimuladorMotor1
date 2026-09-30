const FALCON_ORIGIN = "https://beta.falcon-server.com.br/data-hub";

export function normalizePlate(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPlate(value) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value);
}

function optionalString(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function mapFalconVehicle(payload) {
  const data = payload?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const vehicle = {};
  const fieldMap = {
    placa: "plate",
    marca: "brand",
    modelo: "model",
    ano: "year",
    ano_modelo: "modelYear",
    cor: "color",
    combustivel: "fuel",
    chassi: "chassis",
    municipio: "city",
    uf: "state",
    indicios_roubo_consultado_em: "theftCheckedAt",
  };
  for (const [source, target] of Object.entries(fieldMap)) {
    const text = optionalString(data[source]);
    if (text) vehicle[target] = text;
  }
  if (typeof data.importado === "boolean") vehicle.imported = data.importado;
  if (typeof data.indicios_roubo === "boolean") vehicle.theftIndicators = data.indicios_roubo;
  if (Array.isArray(data.ipva_por_estado)) {
    vehicle.ipvaByState = data.ipva_por_estado
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        ...(optionalString(item.uf) && { state: item.uf }),
        ...(optionalString(item.valor_venal) && { taxableValue: item.valor_venal }),
        ...(optionalString(item.aliquota) && { rate: item.aliquota }),
        ...(optionalString(item.valor_ipva) && { tax: item.valor_ipva }),
      }));
  }
  if (optionalString(data.imagem_placa)) vehicle.imageAvailable = true;
  return Object.keys(vehicle).length ? vehicle : null;
}

export async function fetchFalconPlate(plate, token, fetchImpl = fetch) {
  const normalized = normalizePlate(plate);
  if (!isValidPlate(normalized)) return { status: 400, body: { error: "Placa inválida." } };
  if (!token) return { status: 503, body: { error: "Consulta por placa não configurada no servidor." } };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(`${FALCON_ORIGIN}/private/v1/vehicles/${normalized}/search`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
      redirect: "error",
    });
    if (response.status === 404) return { status: 404, body: { error: "Placa não encontrada." } };
    if (!response.ok) return { status: 502, body: { error: "Falha ao consultar o serviço de placas." } };
    const vehicle = mapFalconVehicle(await response.json());
    if (!vehicle) return { status: 404, body: { error: "Placa não encontrada." } };
    return { status: 200, body: { data: vehicle } };
  } catch {
    return { status: 502, body: { error: "Não foi possível conectar ao serviço de placas." } };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFalconImage(plate, token, fetchImpl = fetch) {
  const normalized = normalizePlate(plate);
  if (!isValidPlate(normalized)) return { status: 400 };
  if (!token) return { status: 503 };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(`${FALCON_ORIGIN}/private/v1/vehicles/${normalized}/image`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, redirect: "error",
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) return { status: 404 };
    return { status: 200, contentType, bytes: Buffer.from(await response.arrayBuffer()) };
  } catch {
    return { status: 502 };
  } finally {
    clearTimeout(timeout);
  }
}
