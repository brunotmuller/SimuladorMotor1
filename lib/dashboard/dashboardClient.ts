import { AuthClientError, type AuthClient } from "../auth/authClient";
import type {
  CatalogVehicle,
  CreateMaintenanceLogPayload,
  CreateVehiclePayload,
  DashboardResponse,
  MaintenanceLogItem,
  UpdateVehiclePayload,
  UserVehicle,
} from "./types";

const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

export type DashboardClientErrorOptions = {
  fields?: Record<string, string>;
  requiresKmRegressionConfirmation?: boolean;
  isTimeout?: boolean;
  isNetworkError?: boolean;
};

export class DashboardClientError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly requiresKmRegressionConfirmation?: boolean;
  readonly isTimeout?: boolean;
  readonly isNetworkError?: boolean;

  constructor(
    status: number,
    message: string,
    options: DashboardClientErrorOptions = {}
  ) {
    super(message);
    this.name = "DashboardClientError";
    this.status = status;
    if (options.fields !== undefined) {
      this.fields = options.fields;
    }
    if (options.requiresKmRegressionConfirmation !== undefined) {
      this.requiresKmRegressionConfirmation =
        options.requiresKmRegressionConfirmation;
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

export type CatalogVehiclesQuery =
  | string
  | {
      search?: string;
      category?: string;
    };

export type CreateVehicleResult = {
  vehicle: UserVehicle;
  dashboard: DashboardResponse;
};

export type UpdateVehicleResult = {
  vehicle: UserVehicle;
  dashboard: DashboardResponse;
};

export type DeleteVehicleResult = {
  deletedId: string;
  nextActiveVehicleId: string | null;
  dashboard: DashboardResponse;
};

export type CreateMaintenanceLogResult = {
  log: MaintenanceLogItem;
  dashboard: DashboardResponse;
};

export interface DashboardClient {
  getDashboard(vehicleId?: string): Promise<DashboardResponse>;
  listCatalogVehicles(params?: CatalogVehiclesQuery): Promise<CatalogVehicle[]>;
  listUserVehicles(): Promise<UserVehicle[]>;
  createVehicle(payload: CreateVehiclePayload): Promise<CreateVehicleResult>;
  updateVehicle(
    id: string,
    payload: UpdateVehiclePayload
  ): Promise<UpdateVehicleResult>;
  selectVehicle(id: string): Promise<DashboardResponse>;
  deleteVehicle(id: string): Promise<DeleteVehicleResult>;
  createMaintenanceLog(
    payload: CreateMaintenanceLogPayload
  ): Promise<CreateMaintenanceLogResult>;
  listMaintenanceLogs(vehicleId?: string): Promise<MaintenanceLogItem[]>;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDashboardResponse(value: unknown): value is DashboardResponse {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.empty === "boolean" &&
    Array.isArray(value.vehicles) &&
    Array.isArray(value.maintenances) &&
    Array.isArray(value.history) &&
    (value.activeVehicle === null || isObjectRecord(value.activeVehicle)) &&
    (value.summary === null || isObjectRecord(value.summary))
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
      return "Permissão insuficiente para esta operação.";
    case 404:
      return "Registro não encontrado.";
    case 409:
      return "Conflito ao atualizar os dados. Confirme a operação.";
    case 422:
      return "Operação não permitida para o estado atual da conta.";
    case 503:
      return "Serviço temporariamente indisponível. Tente novamente em instantes.";
    default:
      return "Não foi possível concluir a solicitação. Tente novamente.";
  }
}

async function parseErrorResponse(
  response: Response
): Promise<DashboardClientError> {
  const payload = await parseJsonSafely(response);
  const record = isObjectRecord(payload) ? payload : null;

  const message =
    record && typeof record.error === "string" && record.error.trim().length > 0
      ? record.error.trim()
      : defaultStatusMessage(response.status);

  const fields = record ? extractFields(record.fields) : undefined;
  const requiresKmRegressionConfirmation =
    record && typeof record.requiresKmRegressionConfirmation === "boolean"
      ? record.requiresKmRegressionConfirmation
      : undefined;

  return new DashboardClientError(response.status, message, {
    fields,
    requiresKmRegressionConfirmation,
  });
}

function toDashboardError(error: unknown): DashboardClientError {
  if (error instanceof DashboardClientError) {
    return error;
  }
  if (error instanceof AuthClientError) {
    return new DashboardClientError(error.status, error.message, {
      fields: error.fields,
      isTimeout: error.isTimeout,
      isNetworkError: error.isNetworkError,
    });
  }
  return new DashboardClientError(0, NETWORK_ERROR_MESSAGE, {
    isNetworkError: true,
  });
}

function encodeId(id: string): string {
  const trimmed = typeof id === "string" ? id.trim() : "";
  if (!trimmed) {
    throw new DashboardClientError(400, "Identificador de veículo inválido.");
  }
  return encodeURIComponent(trimmed);
}

export function createDashboardClient(
  authClient: Pick<AuthClient, "authenticatedFetch">
): DashboardClient {
  async function requestJson(
    path: string,
    init: RequestInit = {}
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await authClient.authenticatedFetch(path, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(init.headers && !(init.headers instanceof Headers) && !Array.isArray(init.headers)
            ? init.headers
            : {}),
        },
      });
    } catch (error) {
      throw toDashboardError(error);
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return parseJsonSafely(response);
  }

  async function getDashboard(vehicleId?: string): Promise<DashboardResponse> {
    const trimmedId = typeof vehicleId === "string" ? vehicleId.trim() : "";
    const path = trimmedId
      ? `/api/dashboard?vehicleId=${encodeURIComponent(trimmedId)}`
      : "/api/dashboard";

    const payload = await requestJson(path, { method: "GET" });
    if (!isDashboardResponse(payload)) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao carregar o painel do usuário."
      );
    }
    return payload;
  }

  async function listCatalogVehicles(
    params?: CatalogVehiclesQuery
  ): Promise<CatalogVehicle[]> {
    const query = new URLSearchParams();

    if (typeof params === "string") {
      const search = params.trim();
      if (search) {
        query.set("search", search);
      }
    } else if (params) {
      const search = typeof params.search === "string" ? params.search.trim() : "";
      const category =
        typeof params.category === "string" ? params.category.trim() : "";
      if (search) {
        query.set("search", search);
      }
      if (category) {
        query.set("category", category);
      }
    }

    const qs = query.toString();
    const path = qs ? `/api/catalog/vehicles?${qs}` : "/api/catalog/vehicles";
    const payload = await requestJson(path, { method: "GET" });

    if (!isObjectRecord(payload) || !Array.isArray(payload.vehicles)) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao carregar o catálogo de veículos."
      );
    }

    return payload.vehicles as CatalogVehicle[];
  }

  async function listUserVehicles(): Promise<UserVehicle[]> {
    const payload = await requestJson("/api/user/vehicles", { method: "GET" });
    if (!isObjectRecord(payload) || !Array.isArray(payload.vehicles)) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao carregar os veículos da garagem."
      );
    }
    return payload.vehicles as UserVehicle[];
  }

  async function createVehicle(
    payload: CreateVehiclePayload
  ): Promise<CreateVehicleResult> {
    const data = await requestJson("/api/user/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (
      !isObjectRecord(data) ||
      !isObjectRecord(data.vehicle) ||
      !isDashboardResponse(data.dashboard)
    ) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao cadastrar o veículo."
      );
    }

    return {
      vehicle: data.vehicle as UserVehicle,
      dashboard: data.dashboard,
    };
  }

  async function updateVehicle(
    id: string,
    payload: UpdateVehiclePayload
  ): Promise<UpdateVehicleResult> {
    const data = await requestJson(`/api/user/vehicles/${encodeId(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (
      !isObjectRecord(data) ||
      !isObjectRecord(data.vehicle) ||
      !isDashboardResponse(data.dashboard)
    ) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao atualizar o veículo."
      );
    }

    return {
      vehicle: data.vehicle as UserVehicle,
      dashboard: data.dashboard,
    };
  }

  async function selectVehicle(id: string): Promise<DashboardResponse> {
    const data = await requestJson(
      `/api/user/vehicles/${encodeId(id)}/select`,
      { method: "POST" }
    );

    if (!isDashboardResponse(data)) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao alternar o veículo ativo."
      );
    }

    return data;
  }

  async function deleteVehicle(id: string): Promise<DeleteVehicleResult> {
    const data = await requestJson(`/api/user/vehicles/${encodeId(id)}`, {
      method: "DELETE",
    });

    if (
      !isObjectRecord(data) ||
      typeof data.deletedId !== "string" ||
      (data.nextActiveVehicleId !== null &&
        typeof data.nextActiveVehicleId !== "string") ||
      !isDashboardResponse(data.dashboard)
    ) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao excluir o veículo."
      );
    }

    return {
      deletedId: data.deletedId,
      nextActiveVehicleId: data.nextActiveVehicleId,
      dashboard: data.dashboard,
    };
  }

  async function createMaintenanceLog(
    payload: CreateMaintenanceLogPayload
  ): Promise<CreateMaintenanceLogResult> {
    const data = await requestJson("/api/user/maintenance-logs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (
      !isObjectRecord(data) ||
      !isObjectRecord(data.log) ||
      !isDashboardResponse(data.dashboard)
    ) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao registrar a manutenção."
      );
    }

    return {
      log: data.log as MaintenanceLogItem,
      dashboard: data.dashboard,
    };
  }

  async function listMaintenanceLogs(
    vehicleId?: string
  ): Promise<MaintenanceLogItem[]> {
    const trimmedId = typeof vehicleId === "string" ? vehicleId.trim() : "";
    const path = trimmedId
      ? `/api/user/maintenance-logs?vehicleId=${encodeURIComponent(trimmedId)}`
      : "/api/user/maintenance-logs";

    const data = await requestJson(path, { method: "GET" });
    if (!isObjectRecord(data) || !Array.isArray(data.logs)) {
      throw new DashboardClientError(
        500,
        "Resposta inválida ao carregar o histórico de manutenções."
      );
    }

    return data.logs as MaintenanceLogItem[];
  }

  return {
    getDashboard,
    listCatalogVehicles,
    listUserVehicles,
    createVehicle,
    updateVehicle,
    selectVehicle,
    deleteVehicle,
    createMaintenanceLog,
    listMaintenanceLogs,
  };
}
