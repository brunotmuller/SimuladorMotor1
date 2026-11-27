import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_DB_PATH } from "../auth/config.mjs";

const SQLITE_ERROR_CODE_PREFIXES = ["SQLITE_CONSTRAINT", "SQLITE_ERROR", "SQLITE_MISMATCH"];
const SQLITE_ERROR_MESSAGE_RE =
  /constraint failed|syntax error|no such table|no such column|cannot start a transaction/i;

const POSTGRES_DOMAIN_ERROR_CODES = new Set(["23505", "23503", "23502", "23514", "22P02"]);

const POSTGRES_CONNECTION_ERROR_CODE_RE =
  /^(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|EPIPE|EHOSTUNREACH|08\w*|57P\w*)$/i;
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

export function isDatabaseAdapterError(err) {
  return err instanceof DatabaseAdapterError || err?.name === "DatabaseAdapterError";
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
  if (POSTGRES_DOMAIN_ERROR_CODES.has(code) || code.startsWith("42")) {
    return true;
  }
  const message = typeof err?.message === "string" ? err.message : "";
  return SQLITE_ERROR_MESSAGE_RE.test(message);
}

function isPostgresConnectionError(err) {
  if (!err || isSqlDomainError(err)) {
    return false;
  }
  const code = typeof err?.code === "string" ? err.code : "";
  if (POSTGRES_CONNECTION_ERROR_CODE_RE.test(code)) {
    return true;
  }
  const message = typeof err?.message === "string" ? err.message : "";
  if (CONNECTION_ERROR_MESSAGE_RE.test(message)) {
    return true;
  }
  const status = Number(err?.status ?? err?.statusCode ?? 0);
  return status >= 500;
}

function mapPostgresError(err) {
  if (isDatabaseAdapterError(err)) {
    return err;
  }
  if (isSqlDomainError(err)) {
    return err;
  }
  if (isPostgresConnectionError(err) || err instanceof TypeError) {
    return new DatabaseAdapterError(
      "POSTGRES_CONNECTION_ERROR",
      "Serviço temporariamente indisponível. Tente novamente em instantes.",
      { status: 503, cause: err },
    );
  }
  return err;
}

/**
 * Converte placeholders posicional `?` do SQLite para `$1, $2, ...` do PostgreSQL,
 * preservando literais string entre aspas simples `'...'` (incluindo escape `''`).
 */
export function convertPlaceholdersToPostgres(sql) {
  if (typeof sql !== "string") {
    return sql;
  }

  let out = "";
  let inSingleQuote = false;
  let paramIndex = 0;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];

    if (ch === "'") {
      if (!inSingleQuote) {
        inSingleQuote = true;
        out += ch;
      } else if (sql[i + 1] === "'") {
        out += "''";
        i += 1;
      } else {
        inSingleQuote = false;
        out += ch;
      }
      continue;
    }

    if (ch === "?" && !inSingleQuote) {
      paramIndex += 1;
      out += `$${paramIndex}`;
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Resolve a configuração de driver de banco (`postgres` ou `sqlite`) a partir do ambiente.
 */
export function resolveDatabaseDriverConfig(env = process.env) {
  const source = env ?? {};
  const postgresUrl = normalizeString(source.POSTGRES_URL);
  const databaseUrl = normalizeString(source.DATABASE_URL);
  const vercel = normalizeString(source.VERCEL);
  const nodeEnv = normalizeString(source.NODE_ENV);
  const authDbPath = normalizeString(source.AUTH_DB_PATH);

  const connectionString = postgresUrl || databaseUrl;
  if (connectionString) {
    return {
      driver: "postgres",
      connectionString,
    };
  }

  if (vercel === "1" && nodeEnv === "production") {
    throw new DatabaseAdapterError(
      "POSTGRES_CONFIG_MISSING",
      "POSTGRES_URL (ou DATABASE_URL) é obrigatória em produção na Vercel para evitar perda de dados em disco efêmero.",
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

function createPostgresQueryMethods(executor) {
  return {
    async get(sql, params = []) {
      try {
        const res = await executor.query(
          convertPlaceholdersToPostgres(sql),
          normalizeParams(params),
        );
        return normalizeRow(res?.rows?.[0]);
      } catch (err) {
        throw mapPostgresError(err);
      }
    },
    async all(sql, params = []) {
      try {
        const res = await executor.query(
          convertPlaceholdersToPostgres(sql),
          normalizeParams(params),
        );
        return Array.isArray(res?.rows)
          ? res.rows.map((row) => ({ ...row }))
          : [];
      } catch (err) {
        throw mapPostgresError(err);
      }
    },
    async run(sql, params = []) {
      try {
        const res = await executor.query(
          convertPlaceholdersToPostgres(sql),
          normalizeParams(params),
        );
        return {
          changes: Number(res?.rowCount ?? 0),
          lastInsertRowid: null,
        };
      } catch (err) {
        throw mapPostgresError(err);
      }
    },
  };
}

/**
 * Envolve uma instância `pg.Pool` na interface assíncrona unificada.
 */
export function wrapPostgresPool(pool) {
  if (!pool) {
    throw new TypeError("pool é obrigatório para wrapPostgresPool.");
  }

  const queryMethods = createPostgresQueryMethods(pool);

  return {
    driver: "postgres",
    async exec(sql) {
      try {
        await pool.query(sql);
      } catch (err) {
        throw mapPostgresError(err);
      }
    },
    ...queryMethods,
    async transaction(fn) {
      let client;
      try {
        client = await pool.connect();
      } catch (err) {
        throw mapPostgresError(err);
      }

      const txQueryMethods = createPostgresQueryMethods(client);
      const txAdapter = {
        driver: "postgres",
        async exec(sql) {
          try {
            await client.query(sql);
          } catch (err) {
            throw mapPostgresError(err);
          }
        },
        ...txQueryMethods,
      };

      try {
        await client.query("BEGIN");
        const result = await fn(txAdapter);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Ignora falha de rollback para preservar o erro original.
        }
        throw mapPostgresError(err);
      } finally {
        if (typeof client.release === "function") {
          client.release();
        }
      }
    },
    async close() {
      if (typeof pool.end === "function") {
        await pool.end();
      }
    },
  };
}

function resolvePostgresSslConfig(connectionString) {
  const lower = connectionString.toLowerCase();
  if (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("sslmode=disable")
  ) {
    return false;
  }
  return { rejectUnauthorized: false };
}

async function resolvePgPoolFactory(createPgPool) {
  if (typeof createPgPool === "function") {
    return createPgPool;
  }

  let mod;
  try {
    mod = await import("pg");
  } catch (cause) {
    throw new DatabaseAdapterError(
      "POSTGRES_DRIVER_MISSING",
      "Pacote pg não instalado.",
      { status: 503, cause },
    );
  }

  const PoolCtor = mod?.Pool ?? mod?.default?.Pool;
  if (typeof PoolCtor !== "function") {
    throw new DatabaseAdapterError(
      "POSTGRES_DRIVER_MISSING",
      "Pacote pg não instalado.",
      { status: 503 },
    );
  }

  return (poolConfig) => new PoolCtor(poolConfig);
}

/**
 * Abre o adaptador de banco assíncrono adequado (`sqlite` local ou `postgres`).
 */
export async function openDatabaseAdapter({
  env = process.env,
  dbPath,
  createPgPool,
} = {}) {
  const config = resolveDatabaseDriverConfig(env);

  if (config.driver === "postgres") {
    const poolFactory = await resolvePgPoolFactory(createPgPool);
    let pool;
    try {
      pool = poolFactory({
        connectionString: config.connectionString,
        ssl: resolvePostgresSslConfig(config.connectionString),
        max: 5,
      });
    } catch (err) {
      throw mapPostgresError(err);
    }
    return wrapPostgresPool(pool);
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

/**
 * Garante que a instância de banco fornecida exponha a interface assíncrona unificada.
 */
export function ensureDatabaseAdapter(db) {
  if (!db || typeof db !== "object") {
    throw new TypeError("Instância de banco de dados (db) inválida.");
  }
  if (
    typeof db.exec === "function" &&
    typeof db.get === "function" &&
    typeof db.all === "function" &&
    typeof db.run === "function" &&
    typeof db.transaction === "function"
  ) {
    return db;
  }
  if (typeof db.prepare === "function") {
    return wrapSqliteDatabase(db);
  }
  throw new TypeError(
    "Instância de banco de dados incompatível com o adaptador assíncrono.",
  );
}
