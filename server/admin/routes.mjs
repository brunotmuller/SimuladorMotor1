import { AuthError } from "../auth/authService.mjs";
import { authenticateRequest, requireRole } from "../auth/middleware.mjs";
import { isDatabaseError, readJsonBody } from "../auth/routes.mjs";
import { AdminError, createAdminService } from "./adminService.mjs";
import { parsePagination } from "./validators.mjs";

const CATALOG_VEHICLE_ITEM_RE = /^\/api\/admin\/catalog\/vehicles\/([^/]+)$/;
const CATALOG_SERVICE_ITEM_RE = /^\/api\/admin\/catalog\/services\/([^/]+)$/;

const PHYSICAL_DELETE_MESSAGE =
  "Exclusão física não permitida no catálogo. Utilize PATCH com active: false para desativar.";

function decodePathId(segment) {
  try {
    const decoded = decodeURIComponent(segment).trim();
    if (!decoded) {
      throw new Error("empty");
    }
    return decoded;
  } catch {
    throw new AdminError(400, "Identificador de item inválido.");
  }
}

function parseOptionalNonNegativeIntParam(rawValue, fieldName) {
  if (rawValue === null || rawValue === undefined) {
    return { ok: true, value: null };
  }
  const trimmed = String(rawValue).trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      error: `${fieldName} deve ser um número inteiro maior ou igual a 0.`,
    };
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return {
      ok: false,
      error: `${fieldName} deve ser um número inteiro maior ou igual a 0.`,
    };
  }
  return { ok: true, value: parsed };
}

function sendAdminError(response, error, sendJson) {
  if (response.headersSent) {
    return;
  }

  if (error instanceof AdminError) {
    const body = { error: error.message };
    if (error.fields !== undefined) {
      body.fields = error.fields;
    }
    sendJson(response, error.status, body);
    return;
  }

  if (error instanceof AuthError) {
    sendJson(response, error.status, { error: error.message });
    return;
  }

  if (isDatabaseError(error)) {
    console.error("[TorqueLab DB]", error.code ?? error.name, error.message);
    sendJson(response, 503, {
      error: "Serviço temporariamente indisponível. Tente novamente em instantes.",
    });
    return;
  }

  sendJson(response, 500, {
    error: "Erro interno ao processar a solicitação.",
  });
}

export function createAdminRouter({
  db = null,
  getDb = null,
  config,
  now = () => Date.now(),
}) {
  let cachedDb = db;
  let cachedAdminService = db ? createAdminService({ db, now }) : null;

  async function resolveContext() {
    if (!cachedDb) {
      if (typeof getDb !== "function") {
        throw new Error("SQLITE_UNAVAILABLE: banco de dados indisponível.");
      }
      cachedDb = await getDb();
    }
    if (!cachedAdminService) {
      cachedAdminService = createAdminService({ db: cachedDb, now });
    }
    return { db: cachedDb, adminService: cachedAdminService };
  }

  return async function handleAdminRoute(
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

    if (pathname !== "/api/admin" && !pathname.startsWith("/api/admin/")) {
      return false;
    }

    try {
      const { db: activeDb, adminService } = await resolveContext();

      // Todas as rotas /api/admin/* exigem JWT válido + role === "admin" (RN-03, Cenário 6)
      const authUser = await authenticateRequest(request, {
        db: activeDb,
        config,
        now,
      });
      requireRole(authUser, "admin");

      if (pathname === "/api/admin/health") {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Método não permitido." });
          return true;
        }
        sendJson(response, 200, {
          status: "ok",
          role: "admin",
          user: authUser,
        });
        return true;
      }

      if (pathname === "/api/admin/overview") {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Método não permitido." });
          return true;
        }
        sendJson(response, 200, await adminService.getOverview());
        return true;
      }

      if (pathname === "/api/admin/user-vehicles") {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Método não permitido." });
          return true;
        }

        const pagination = parsePagination(urlObj.searchParams);
        const filterFields = pagination.valid ? {} : { ...pagination.fields };

        const kmMinRes = parseOptionalNonNegativeIntParam(
          urlObj.searchParams.get("kmMin"),
          "kmMin",
        );
        if (!kmMinRes.ok) {
          filterFields.kmMin = kmMinRes.error;
        }

        const kmMaxRes = parseOptionalNonNegativeIntParam(
          urlObj.searchParams.get("kmMax"),
          "kmMax",
        );
        if (!kmMaxRes.ok) {
          filterFields.kmMax = kmMaxRes.error;
        }

        if (
          kmMinRes.ok &&
          kmMaxRes.ok &&
          kmMinRes.value !== null &&
          kmMaxRes.value !== null &&
          kmMinRes.value > kmMaxRes.value
        ) {
          filterFields.kmMax =
            "A quilometragem máxima deve ser maior ou igual à mínima.";
        }

        if (Object.keys(filterFields).length > 0) {
          throw new AdminError(400, "Parâmetros de consulta inválidos.", {
            fields: filterFields,
          });
        }

        const result = await adminService.listUserVehicles({
          page: pagination.data.page,
          limit: pagination.data.limit,
          search: urlObj.searchParams.get("search") ?? "",
          brand: urlObj.searchParams.get("brand") ?? "",
          category: urlObj.searchParams.get("category") ?? "",
          kmMin: kmMinRes.value,
          kmMax: kmMaxRes.value,
        });

        sendJson(response, 200, result);
        return true;
      }

      if (pathname === "/api/admin/catalog/vehicles") {
        if (request.method === "GET") {
          const pagination = parsePagination(urlObj.searchParams);
          if (!pagination.valid) {
            throw new AdminError(400, "Parâmetros de paginação inválidos.", {
              fields: pagination.fields,
            });
          }

          const result = await adminService.listCatalogVehicles({
            page: pagination.data.page,
            limit: pagination.data.limit,
            search: urlObj.searchParams.get("search") ?? "",
            brand: urlObj.searchParams.get("brand") ?? "",
            category: urlObj.searchParams.get("category") ?? "",
            status: urlObj.searchParams.get("status") ?? "all",
          });

          sendJson(response, 200, result);
          return true;
        }

        if (request.method === "POST") {
          const body = await readJsonBody(request);
          const vehicle = await adminService.createCatalogVehicle(authUser.id, body);
          sendJson(response, 201, { vehicle });
          return true;
        }

        if (request.method === "DELETE") {
          sendJson(response, 405, { error: PHYSICAL_DELETE_MESSAGE });
          return true;
        }

        sendJson(response, 405, { error: "Método não permitido." });
        return true;
      }

      const catalogVehicleMatch = CATALOG_VEHICLE_ITEM_RE.exec(pathname);
      if (catalogVehicleMatch) {
        const vehicleId = decodePathId(catalogVehicleMatch[1]);
        if (request.method === "PATCH") {
          const body = await readJsonBody(request);
          const vehicle = await adminService.updateCatalogVehicle(
            authUser.id,
            vehicleId,
            body,
          );
          sendJson(response, 200, { vehicle });
          return true;
        }

        if (request.method === "DELETE") {
          sendJson(response, 405, { error: PHYSICAL_DELETE_MESSAGE });
          return true;
        }

        sendJson(response, 405, { error: "Método não permitido." });
        return true;
      }

      if (pathname === "/api/admin/catalog/services") {
        if (request.method === "GET") {
          const pagination = parsePagination(urlObj.searchParams);
          if (!pagination.valid) {
            throw new AdminError(400, "Parâmetros de paginação inválidos.", {
              fields: pagination.fields,
            });
          }

          const rawCombustion = urlObj.searchParams.get("combustionOnly");
          const combustionOnly =
            rawCombustion === "true"
              ? true
              : rawCombustion === "false"
                ? false
                : "all";

          const result = await adminService.listCatalogServices({
            page: pagination.data.page,
            limit: pagination.data.limit,
            search: urlObj.searchParams.get("search") ?? "",
            category: urlObj.searchParams.get("category") ?? "",
            combustionOnly,
            status: urlObj.searchParams.get("status") ?? "all",
          });

          sendJson(response, 200, result);
          return true;
        }

        if (request.method === "POST") {
          const body = await readJsonBody(request);
          const service = await adminService.createCatalogService(authUser.id, body);
          sendJson(response, 201, { service });
          return true;
        }

        if (request.method === "DELETE") {
          sendJson(response, 405, { error: PHYSICAL_DELETE_MESSAGE });
          return true;
        }

        sendJson(response, 405, { error: "Método não permitido." });
        return true;
      }

      const catalogServiceMatch = CATALOG_SERVICE_ITEM_RE.exec(pathname);
      if (catalogServiceMatch) {
        const serviceId = decodePathId(catalogServiceMatch[1]);
        if (request.method === "PATCH") {
          const body = await readJsonBody(request);
          const service = await adminService.updateCatalogService(
            authUser.id,
            serviceId,
            body,
          );
          sendJson(response, 200, { service });
          return true;
        }

        if (request.method === "DELETE") {
          sendJson(response, 405, { error: PHYSICAL_DELETE_MESSAGE });
          return true;
        }

        sendJson(response, 405, { error: "Método não permitido." });
        return true;
      }

      if (
        request.method === "DELETE" &&
        pathname.startsWith("/api/admin/catalog/")
      ) {
        sendJson(response, 405, { error: PHYSICAL_DELETE_MESSAGE });
        return true;
      }

      sendJson(response, 404, { error: "Rota administrativa não encontrada." });
      return true;
    } catch (error) {
      sendAdminError(response, error, sendJson);
      return true;
    }
  };
}
