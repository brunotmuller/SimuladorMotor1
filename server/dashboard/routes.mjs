import { AuthError } from "../auth/authService.mjs";
import { authenticateRequest } from "../auth/middleware.mjs";
import { isDatabaseError, readJsonBody } from "../auth/routes.mjs";
import { createDashboardService, DashboardError } from "./dashboardService.mjs";

const VEHICLE_SELECT_RE = /^\/api\/user\/vehicles\/([^/]+)\/select$/;
const VEHICLE_ITEM_RE = /^\/api\/user\/vehicles\/([^/]+)$/;

function decodePathParam(segment) {
  try {
    const decoded = decodeURIComponent(segment).trim();
    if (!decoded) {
      throw new Error("empty");
    }
    return decoded;
  } catch {
    throw new DashboardError(400, "Identificador de veículo inválido.");
  }
}

function sendDashboardError(response, error, sendJson) {
  if (response.headersSent) {
    return;
  }

  if (error instanceof DashboardError) {
    const body = { error: error.message };
    if (error.fields !== undefined) {
      body.fields = error.fields;
    }
    if (error.requiresKmRegressionConfirmation !== undefined) {
      body.requiresKmRegressionConfirmation =
        error.requiresKmRegressionConfirmation;
    }
    sendJson(response, error.status, body);
    return;
  }

  if (error instanceof AuthError) {
    sendJson(response, error.status, { error: error.message });
    return;
  }

  if (isDatabaseError(error)) {
    sendJson(response, 503, {
      error: "Serviço temporariamente indisponível. Tente novamente em instantes.",
    });
    return;
  }

  sendJson(response, 500, {
    error: "Erro interno ao processar a solicitação.",
  });
}

function isDashboardPath(pathname) {
  return (
    pathname === "/api/dashboard" ||
    pathname.startsWith("/api/dashboard/") ||
    pathname === "/api/catalog/vehicles" ||
    pathname === "/api/user/vehicles" ||
    pathname.startsWith("/api/user/vehicles/") ||
    pathname === "/api/user/maintenance-logs" ||
    pathname.startsWith("/api/user/maintenance-logs/")
  );
}

export function createDashboardRouter({
  db = null,
  getDb = null,
  config,
  now = () => Date.now(),
}) {
  let cachedDb = db;
  let cachedDashboardService = db
    ? createDashboardService({ db, now })
    : null;

  function resolveContext() {
    if (!cachedDb) {
      if (typeof getDb !== "function") {
        throw new Error("SQLITE_UNAVAILABLE: banco de dados indisponível.");
      }
      cachedDb = getDb();
    }
    if (!cachedDashboardService) {
      cachedDashboardService = createDashboardService({ db: cachedDb, now });
    }
    return { db: cachedDb, dashboardService: cachedDashboardService };
  }

  return async function handleDashboardRoute(
    request,
    response,
    urlOrPathname,
    sendJson,
  ) {
    const urlObj =
      urlOrPathname instanceof URL
        ? urlOrPathname
        : new URL(request.url ?? "/", "http://localhost");
    const pathname =
      typeof urlOrPathname === "string" ? urlOrPathname : urlObj.pathname;

    if (!isDashboardPath(pathname)) {
      return false;
    }

    try {
      const { db: activeDb, dashboardService } = resolveContext();

      // Todas as rotas do Dashboard exigem usuário autenticado (RN-03)
      const authUser = authenticateRequest(request, {
        db: activeDb,
        config,
        now,
      });

      if (pathname === "/api/dashboard") {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Método não permitido." });
          return true;
        }
        const vehicleId = urlObj.searchParams.get("vehicleId")?.trim() || null;
        const dashboard = dashboardService.getDashboard(authUser.id, {
          vehicleId,
        });
        sendJson(response, 200, dashboard);
        return true;
      }

      if (pathname === "/api/catalog/vehicles") {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Método não permitido." });
          return true;
        }
        const search = urlObj.searchParams.get("search") ?? "";
        const category = urlObj.searchParams.get("category") ?? "";
        const vehicles = dashboardService.listCatalogVehicles({
          search,
          category,
        });
        sendJson(response, 200, { vehicles });
        return true;
      }

      if (pathname === "/api/user/vehicles") {
        if (request.method === "GET") {
          const vehicles = dashboardService.listUserVehicles(authUser.id);
          sendJson(response, 200, { vehicles });
          return true;
        }
        if (request.method === "POST") {
          const body = await readJsonBody(request);
          const result = dashboardService.createVehicle(authUser.id, body);
          sendJson(response, 201, result);
          return true;
        }
        sendJson(response, 405, { error: "Método não permitido." });
        return true;
      }

      const selectMatch = VEHICLE_SELECT_RE.exec(pathname);
      if (selectMatch) {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Método não permitido." });
          return true;
        }
        const vehicleId = decodePathParam(selectMatch[1]);
        const dashboard = dashboardService.selectActiveVehicle(
          authUser.id,
          vehicleId,
        );
        sendJson(response, 200, dashboard);
        return true;
      }

      const itemMatch = VEHICLE_ITEM_RE.exec(pathname);
      if (itemMatch) {
        const vehicleId = decodePathParam(itemMatch[1]);
        if (request.method === "PATCH") {
          const body = await readJsonBody(request);
          const result = dashboardService.updateVehicle(
            authUser.id,
            vehicleId,
            body,
          );
          sendJson(response, 200, result);
          return true;
        }
        if (request.method === "DELETE") {
          const result = dashboardService.deleteVehicle(authUser.id, vehicleId);
          sendJson(response, 200, result);
          return true;
        }
        sendJson(response, 405, { error: "Método não permitido." });
        return true;
      }

      if (pathname === "/api/user/maintenance-logs") {
        if (request.method === "GET") {
          const vehicleId = urlObj.searchParams.get("vehicleId")?.trim() || null;
          const logs = dashboardService.listMaintenanceLogs(
            authUser.id,
            vehicleId,
          );
          sendJson(response, 200, { logs });
          return true;
        }
        if (request.method === "POST") {
          const body = await readJsonBody(request);
          const result = dashboardService.createMaintenanceLog(
            authUser.id,
            body,
          );
          sendJson(response, 201, result);
          return true;
        }
        sendJson(response, 405, { error: "Método não permitido." });
        return true;
      }

      sendJson(response, 404, { error: "Rota do dashboard não encontrada." });
      return true;
    } catch (error) {
      sendDashboardError(response, error, sendJson);
      return true;
    }
  };
}
