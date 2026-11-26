import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_DB_PATH } from "../auth/config.mjs";

const SQLITE_ERROR_CODE_PREFIXES = ["SQLITE_CONSTRAINT", "SQLITE_ERROR", "SQLITE_MISMATCH"];
const SQLITE_ERROR_MESSAGE_RE =
  /constraint failed|syntax error|no such table|no such column|cannot start a transaction/i;

const CONNECTION_ERROR_CODE_RE =
  /^(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|EPIPE|EHOSTUNREACH|UND_ERR_|FETCH_ERROR|HTTP_ERROR|SERVER_ERROR|CLIENT_CLOSED|CONNECTION_ERROR|HRANA_|WEBSOCKET_|URL_INVALID)/i;
const CONNECTION_ERROR_MESSAGE_RE =
  /fetch failed|network|timeout|timed out|socket hang up|econnrefused|enotfound|etimedout|econnreset|unavailable|connection/i;

/**
 * Erro padronizado para falhas de configuração, driver ou conexão no adaptador de banco.
 */
export class DatabaseAdapterError extends Error {
  constructor(code, message, { status = 503, cause } = {}) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "DatabaseAdapterError";
    this.code = code;
    this.status = status;
  }
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeParams(params) {
  if (params === undefined || params === null) {
    return [];
  }
  return Array.isArray(params) ? params : [params];
}

function normalizeRow(row) {
  return row ? { ...row } : undefined;
}

function isSqlDomainError(err) {
  const code = typeof err?.code === "string" ? err.code : "";
  if (SQLITE_ERROR_CODE_PREFIXES.some((prefix) => code.startsWith(prefix))) {
    return true;
  }
  const message = typeof err?.message === "string" ? err.message : "";
  return SQLITE_ERROR_MESSAGE_RE.test(message);
}

function isConnectionError(err) {
  if (!err || isSqlDomainError(err)) {
    return false;
  }
  const code = typeof err?.code === "string" ? err.code : "";
  if (CONNECTION_ERROR_CODE_RE.test(code)) {
    return true;
  }
  const message = typeof err?.message === "string" ? err.message : "";
  if (CONNECTION_ERROR_MESSAGE_RE.test(message)) {
    return true;
  }
  const status = Number(err?.status ?? err?.statusCode ?? 0);
  return status >= 500;
}

function mapLibsqlError(err) {
  if (err instanceof DatabaseAdapterError) {
    return err;
  }
  if (isSqlDomainError(err)) {
    return err;
  }
  if (isConnectionError(err) || err instanceof TypeError) {
    return new DatabaseAdapterError(
      "TURSO_CONNECTION_ERROR",
      "Serviço temporariamente indisponível. Tente novamente em instantes.",
      { status: 503, cause: err },
    );
  }
  return err;
}

/**
 * Resolve a configuração de driver de banco (`libsql` ou `sqlite`) a partir do ambiente.
 */
export function resolveDatabaseDriverConfig(env = process.env) {
  const source = env ?? {};
  const tursoUrl = normalizeString(source.TURSO_DATABASE_URL);
  const tursoAuthToken = normalizeString(source.TURSO_AUTH_TOKEN);
  const vercel = normalizeString(source.VERCEL);
  const nodeEnv = normalizeString(source.NODE_ENV);
  const authDbPath = normalizeString(source.AUTH_DB_PATH);

  if (tursoUrl) {
    const lowerUrl = tursoUrl.toLowerCase();
    if (
      (lowerUrl.startsWith("libsql://") || lowerUrl.startsWith("https://")) &&
      !tursoAuthToken
    ) {
      throw new DatabaseAdapterError(
        "TURSO_AUTH_TOKEN_MISSING",
        "TURSO_AUTH_TOKEN é obrigatório quando TURSO_DATABASE_URL usa libsql:// ou https://.",
        { status: 503 },
      );
    }
    return {
      driver: "libsql",
      url: tursoUrl,
      authToken: tursoAuthToken || undefined,
    };
  }

  if (vercel === "1" && nodeEnv === "production") {
    throw new DatabaseAdapterError(
      "TURSO_CONFIG_MISSING",
      "TURSO_DATABASE_URL é obrigatória em produção na Vercel para evitar perda de dados em disco efêmero.",
      { status: 503 },
    );
  }

  const targetPath =
    nodeEnv === "test" && !authDbPath
      ? ":memory:"
      : authDbPath || DEFAULT_DB_PATH;

  return {
    driver: "sqlite",
    path: targetPath,
  };
}

/**
 * Envolve uma instância `DatabaseSync` (`node:sqlite`) na interface assíncrona unificada.
 */
export function wrapSqliteDatabase(sqliteDb) {
  if (!sqliteDb) {
    throw new TypeError("sqliteDb é obrigatório para wrapSqliteDatabase.");
  }

  const adapter = {
    driver: "sqlite",
    async exec(sql) {
      sqliteDb.exec(sql);
    },
    async get(sql, params = []) {
      const row = sqliteDb.prepare(sql).get(...normalizeParams(params));
      return normalizeRow(row);
    },
    async all(sql, params = []) {
      const rows = sqliteDb.prepare(sql).all(...normalizeParams(params));
      return rows.map((row) => ({ ...row }));
    },
    async run(sql, params = []) {
      const res = sqliteDb.prepare(sql).run(...normalizeParams(params));
      return {
        changes: Number(res?.changes ?? 0),
        lastInsertRowid: res?.lastInsertRowid ?? null,
      };
    },
    async transaction(fn) {
      sqliteDb.exec("BEGIN");
      try {
        const result = await fn(adapter);
        sqliteDb.exec("COMMIT");
        return result;
      } catch (err) {
        try {
          sqliteDb.exec("ROLLBACK");
        } catch {
          // Ignora falha de rollback para preservar o erro original.
        }
        throw err;
      }
    },
    async close() {
      if (typeof sqliteDb.close === "function") {
        sqliteDb.close();
      }
    },
  };

  return adapter;
}

function createLibsqlQueryMethods(executor) {
  return {
    async get(sql, params = []) {
      try {
        const res = await executor.execute({
          sql,
          args: normalizeParams(params),
        });
        return normalizeRow(res?.rows?.[0]);
      } catch (err) {
        throw mapLibsqlError(err);
      }
    },
    async all(sql, params = []) {
      try {
        const res = await executor.execute({
          sql,
          args: normalizeParams(params),
        });
        return Array.isArray(res?.rows)
          ? res.rows.map((row) => ({ ...row }))
          : [];
      } catch (err) {
        throw mapLibsqlError(err);
      }
    },
    async run(sql, params = []) {
      try {
        const res = await executor.execute({
          sql,
          args: normalizeParams(params),
        });
        return {
          changes: Number(res?.rowsAffected ?? 0),
          lastInsertRowid: res?.lastInsertRowid ?? null,
        };
      } catch (err) {
        throw mapLibsqlError(err);
      }
    },
  };
}

function wrapLibsqlClient(client) {
  const queryMethods = createLibsqlQueryMethods(client);

  return {
    driver: "libsql",
    async exec(sql) {
      try {
        await client.executeMultiple(sql);
      } catch (err) {
        throw mapLibsqlError(err);
      }
    },
    ...queryMethods,
    async transaction(fn) {
      let tx;
      try {
        tx = await client.transaction("write");
      } catch (err) {
        throw mapLibsqlError(err);
      }

      const txQueryMethods = createLibsqlQueryMethods(tx);
      const txAdapter = {
        driver: "libsql",
        async exec(sql) {
          try {
            await tx.execute(sql);
          } catch (err) {
            throw mapLibsqlError(err);
          }
        },
        ...txQueryMethods,
      };

      try {
        const result = await fn(txAdapter);
        await tx.commit();
        return result;
      } catch (err) {
        try {
          await tx.rollback();
        } catch {
          // Ignora falha de rollback para preservar o erro original.
        }
        throw mapLibsqlError(err);
      } finally {
        if (typeof tx.close === "function") {
          try {
            await tx.close();
          } catch {
            // Ignora falha ao fechar transação.
          }
        }
      }
    },
    async close() {
      if (typeof client.close === "function") {
        await client.close();
      }
    },
  };
}

async function resolveLibsqlFactory(createLibsqlClient) {
  if (typeof createLibsqlClient === "function") {
    return createLibsqlClient;
  }

  let mod;
  try {
    mod = await import("@libsql/client");
  } catch (cause) {
    throw new DatabaseAdapterError(
      "TURSO_DRIVER_MISSING",
      "Pacote @libsql/client não instalado.",
      { status: 503, cause },
    );
  }

  if (typeof mod?.createClient !== "function") {
    throw new DatabaseAdapterError(
      "TURSO_DRIVER_MISSING",
      "Pacote @libsql/client não instalado.",
      { status: 503 },
    );
  }

  return mod.createClient;
}

/**
 * Abre o adaptador de banco assíncrono adequado (`sqlite` local ou `libsql` Turso).
 */
export async function openDatabaseAdapter({
  env = process.env,
  dbPath,
  createLibsqlClient,
} = {}) {
  const config = resolveDatabaseDriverConfig(env);

  if (config.driver === "libsql") {
    const clientFactory = await resolveLibsqlFactory(createLibsqlClient);
    let client;
    try {
      client = clientFactory({
        url: config.url,
        ...(config.authToken ? { authToken: config.authToken } : {}),
      });
    } catch (err) {
      throw mapLibsqlError(err);
    }
    return wrapLibsqlClient(client);
  }

  const targetPath =
    typeof dbPath === "string" && dbPath.trim() !== ""
      ? dbPath.trim()
      : config.path;

  if (targetPath !== ":memory:") {
    mkdirSync(dirname(targetPath), { recursive: true });
  }

  const sqliteDb = new DatabaseSync(targetPath);
  sqliteDb.exec("PRAGMA foreign_keys = ON;");
  if (targetPath !== ":memory:") {
    sqliteDb.exec("PRAGMA journal_mode = WAL;");
  }

  return wrapSqliteDatabase(sqliteDb);
}
