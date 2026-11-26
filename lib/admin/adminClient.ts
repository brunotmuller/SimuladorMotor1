import { AuthClientError, type AuthClient } from "../auth/authClient";
import type {
  AdminCatalogService,
  AdminCatalogServicesQuery,
  AdminCatalogServicesResponse,
  AdminCatalogVehicle,
  AdminCatalogVehiclesQuery,
  AdminCatalogVehiclesResponse,
  AdminOverviewResponse,
  AdminUserVehiclesQuery,
  AdminUserVehiclesResponse,
  CreateCatalogServicePayload,
  CreateCatalogVehiclePayload,
  PaginationMeta,
  UpdateCatalogServicePayload,
  UpdateCatalogVehiclePayload,
} from "./types";

export const DEFAULT_ADMIN_TIMEOUT_MS = 15_000;

const ADMIN_TIMEOUT_MESSAGE =
  "A requisição administrativa excedeu o tempo limite de 15 segundos. Tente novamente.";
const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

export type AdminClientErrorOptions = {
  fields?: Record<string, string>;
  isTimeout?: boolean;
  isNetworkError?: boolean;
};

export class AdminClientError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly isTimeout?: boolean;
  readonly isNetworkError?: boolean;

  constructor(
    status: number,
    message: string,
    options: AdminClientErrorOptions = {}
  ) {
    super(message);
    this.name = "AdminClientError";
    this.status = status;
    if (options.fields !== undefined) {
      this.fields = options.fields;
    }
    if (options.isTimeout !== undefined) {
      this.isTimeout = options.isTimeout;
    }
    if (options.isNetworkError !== undefined) {
      this.isNetworkError = options.isNetworkError;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type AdminClientOptions = {
  timeoutMs?: number;
};

export interface AdminClient {
  getOverview(): Promise<AdminOverviewResponse>;
  listUserVehicles(
    query?: AdminUserVehiclesQuery
  ): Promise<AdminUserVehiclesResponse>;
  listCatalogVehicles(
    query?: AdminCatalogVehiclesQuery
  ): Promise<AdminCatalogVehiclesResponse>;
  createCatalogVehicle(
    payload: CreateCatalogVehiclePayload
  ): Promise<AdminCatalogVehicle>;
  updateCatalogVehicle(
    id: string,
    payload: UpdateCatalogVehiclePayload
  ): Promise<AdminCatalogVehicle>;
  listCatalogServices(
    query?: AdminCatalogServicesQuery
  ): Promise<AdminCatalogServicesResponse>;
  createCatalogService(
    payload: CreateCatalogServicePayload
  ): Promise<AdminCatalogService>;
  updateCatalogService(
    id: string,
    payload: UpdateCatalogServicePayload
  ): Promise<AdminCatalogService>;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isPaginationMeta(value: unknown): value is PaginationMeta {
  if (!isObjectRecord(value)) {
    return false;
  }
  return (
    typeof value.page === "number" &&
    typeof value.limit === "number" &&
    typeof value.total === "number" &&
    typeof value.totalPages === "number"
  );
}

function isAdminOverviewResponse(value: unknown): value is AdminOverviewResponse {
  if (!isObjectRecord(value)) {
    return false;
  }
  return (
    isObjectRecord(value.users) &&
    isObjectRecord(value.catalogVehicles) &&
    isObjectRecord(value.userVehicles) &&
    isObjectRecord(value.catalogServices) &&
    typeof value.generatedAt === "string"
  );
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    if (!text.trim()) {
      return null;
    }
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function extractFields(value: unknown): Record<string, string> | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    ([, item]) => typeof item === "string"
  ) as [string, string][];

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function defaultStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return "Dados inválidos. Verifique os campos informados.";
    case 401:
      return "Sessão expirada. Faça login novamente.";
    case 403:
      return "Permissão insuficiente para acessar o painel administrativo.";
    case 404:
      return "Item não encontrado no catálogo.";
    case 405:
      return "Operação não permitida neste recurso administrativo.";
    case 409:
      return "Conflito: já existe um registro equivalente no catálogo.";
    case 503:
      return "Serviço temporariamente indisponível. Tente novamente em instantes.";
    default:
      return "Não foi possível concluir a operação administrativa. Tente novamente.";
  }
}

async function parseErrorResponse(
  response: Response
): Promise<AdminClientError> {
  const payload = await parseJsonSafely(response);
  const record = isObjectRecord(payload) ? payload : null;

  const message =
    record && typeof record.error === "string" && record.error.trim().length > 0
      ? record.error.trim()
      : defaultStatusMessage(response.status);

  const fields = record ? extractFields(record.fields) : undefined;

  return new AdminClientError(response.status, message, { fields });
}

function toAdminError(error: unknown, timedOut: boolean): AdminClientError {
  if (timedOut) {
    return new AdminClientError(408, ADMIN_TIMEOUT_MESSAGE, {
      isTimeout: true,
    });
  }
  if (error instanceof AdminClientError) {
    return error;
  }
  if (error instanceof AuthClientError) {
    return new AdminClientError(error.status, error.message, {
      fields: error.fields,
      isTimeout: error.isTimeout,
      isNetworkError: error.isNetworkError,
    });
  }
  return new AdminClientError(0, NETWORK_ERROR_MESSAGE, {
    isNetworkError: true,
  });
}

function encodeId(id: string): string {
  const trimmed = typeof id === "string" ? id.trim() : "";
  if (!trimmed) {
    throw new AdminClientError(400, "Identificador de item inválido.");
  }
  return encodeURIComponent(trimmed);
}

function appendNumberParam(
  params: URLSearchParams,
  key: string,
  value: number | undefined
): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    params.set(key, String(value));
  }
}

function appendStringParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined
): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      params.set(key, trimmed);
    }
  }
}

export function createAdminClient(
  authClient: Pick<AuthClient, "authenticatedFetch">,
  options: AdminClientOptions = {}
): AdminClient {
  const timeoutMs =
    typeof options.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_ADMIN_TIMEOUT_MS;

  async function requestJson(
    path: string,
    init: RequestInit = {}
  ): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;

    const externalSignal = init.signal;
    const handleExternalAbort = () => {
      controller.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener("abort", handleExternalAbort, {
          once: true,
        });
      }
    }

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await authClient.authenticatedFetch(path, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(init.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(init.headers &&
          !(init.headers instanceof Headers) &&
          !Array.isArray(init.headers)
            ? init.headers
            : {}),
        },
      });
    } catch (error) {
      throw toAdminError(error, timedOut);
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", handleExternalAbort);
      }
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return parseJsonSafely(response);
  }

  async function getOverview(): Promise<AdminOverviewResponse> {
    const payload = await requestJson("/api/admin/overview", { method: "GET" });
    if (!isAdminOverviewResponse(payload)) {
      throw new AdminClientError(
        500,
        "Resposta inválida ao carregar os indicadores administrativos."
      );
    }
    return payload;
  }

  async function listUserVehicles(
    query: AdminUserVehiclesQuery = {}
  ): Promise<AdminUserVehiclesResponse> {
    const params = new URLSearchParams();
    appendNumberParam(params, "page", query.page);
    appendNumberParam(params, "limit", query.limit);
    appendStringParam(params, "search", query.search);
    appendStringParam(params, "brand", query.brand);
    appendStringParam(params, "category", query.category);
    appendNumberParam(params, "kmMin", query.kmMin);
    appendNumberParam(params, "kmMax", query.kmMax);

    const qs = params.toString();
    const path = qs ? `/api/admin/user-vehicles?${qs}` : "/api/admin/user-vehicles";
    const payload = await requestJson(path, { method: "GET" });

    if (
      !isObjectRecord(payload) ||
      !Array.isArray(payload.items) ||
      !isPaginationMeta(payload.pagination) ||
      !Array.isArray(payload.topModels)
    ) {
      throw new AdminClientError(
        500,
        "Resposta inválida ao carregar os veículos dos usuários."
      );
    }

    return payload as AdminUserVehiclesResponse;
  }

  async function listCatalogVehicles(
    query: AdminCatalogVehiclesQuery = {}
  ): Promise<AdminCatalogVehiclesResponse> {
    const params = new URLSearchParams();
    appendNumberParam(params, "page", query.page);
    appendNumberParam(params, "limit", query.limit);
    appendStringParam(params, "search", query.search);
    appendStringParam(params, "brand", query.brand);
    appendStringParam(params, "category", query.category);
    appendStringParam(params, "status", query.status);

    const qs = params.toString();
    const path = qs
      ? `/api/admin/catalog/vehicles?${qs}`
      : "/api/admin/catalog/vehicles";
    const payload = await requestJson(path, { method: "GET" });

    if (
      !isObjectRecord(payload) ||
      !Array.isArray(payload.items) ||
      !isPaginationMeta(payload.pagination)
    ) {
      throw new AdminClientError(
        500,
        "Resposta inválida ao carregar o catálogo de veículos."
      );
    }

    return payload as AdminCatalogVehiclesResponse;
  }

  async function createCatalogVehicle(
    payload: CreateCatalogVehiclePayload
  ): Promise<AdminCatalogVehicle> {
    const data = await requestJson("/api/admin/catalog/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!isObjectRecord(data) || !isObjectRecord(data.vehicle)) {
      throw new AdminClientError(
        500,
        "Resposta inválida ao cadastrar o veículo no catálogo."
      );
    }

    return data.vehicle as AdminCatalogVehicle;
  }

  async function updateCatalogVehicle(
    id: string,
    payload: UpdateCatalogVehiclePayload
  ): Promise<AdminCatalogVehicle> {
    const data = await requestJson(`/api/admin/catalog/vehicles/${encodeId(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (!isObjectRecord(data) || !isObjectRecord(data.vehicle)) {
      throw new AdminClientError(
        500,
        "Resposta inválida ao atualizar o veículo no catálogo."
      );
    }

    return data.vehicle as AdminCatalogVehicle;
  }

  async function listCatalogServices(
    query: AdminCatalogServicesQuery = {}
  ): Promise<AdminCatalogServicesResponse> {
    const params = new URLSearchParams();
    appendNumberParam(params, "page", query.page);
    appendNumberParam(params, "limit", query.limit);
    appendStringParam(params, "search", query.search);
    appendStringParam(params, "category", query.category);
    if (typeof query.combustionOnly === "boolean") {
      params.set("combustionOnly", query.combustionOnly ? "true" : "false");
    }
    appendStringParam(params, "status", query.status);

    const qs = params.toString();
    const path = qs
      ? `/api/admin/catalog/services?${qs}`
      : "/api/admin/catalog/services";
    const payload = await requestJson(path, { method: "GET" });

    if (
      !isObjectRecord(payload) ||
      !Array.isArray(payload.items) ||
      !isPaginationMeta(payload.pagination)
    ) {
      throw new AdminClientError(
        500,
        "Resposta inválida ao carregar o catálogo de manutenções."
      );
    }

    return payload as AdminCatalogServicesResponse;
  }

  async function createCatalogService(
    payload: CreateCatalogServicePayload
  ): Promise<AdminCatalogService> {
    const data = await requestJson("/api/admin/catalog/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!isObjectRecord(data) || !isObjectRecord(data.service)) {
      throw new AdminClientError(
        500,
        "Resposta inválida ao cadastrar o serviço no catálogo."
      );
    }

    return data.service as AdminCatalogService;
  }

  async function updateCatalogService(
    id: string,
    payload: UpdateCatalogServicePayload
  ): Promise<AdminCatalogService> {
    const data = await requestJson(`/api/admin/catalog/services/${encodeId(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (!isObjectRecord(data) || !isObjectRecord(data.service)) {
      throw new AdminClientError(
        500,
        "Resposta inválida ao atualizar o serviço no catálogo."
      );
    }

    return data.service as AdminCatalogService;
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
