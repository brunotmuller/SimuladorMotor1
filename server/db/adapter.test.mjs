import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  convertPlaceholdersToPostgres,
  DatabaseAdapterError,
  openDatabaseAdapter,
  resolveDatabaseDriverConfig,
  wrapPostgresPool,
  wrapSqliteDatabase,
} from "./adapter.mjs";

test("resolveDatabaseDriverConfig: seleciona sqlite :memory: em NODE_ENV=test sem AUTH_DB_PATH", () => {
  const cfg = resolveDatabaseDriverConfig({ NODE_ENV: "test" });
  assert.deepEqual(cfg, { driver: "sqlite", path: ":memory:" });
});

test("resolveDatabaseDriverConfig: respeita AUTH_DB_PATH em ambiente local", () => {
  const cfg = resolveDatabaseDriverConfig({
    NODE_ENV: "development",
    AUTH_DB_PATH: "  ./tmp/custom.sqlite  ",
  });
  assert.deepEqual(cfg, { driver: "sqlite", path: "./tmp/custom.sqlite" });
});

test("resolveDatabaseDriverConfig: usa padrão ./data/torquelab.sqlite sem env", () => {
  const cfg = resolveDatabaseDriverConfig({});
  assert.deepEqual(cfg, { driver: "sqlite", path: "./data/torquelab.sqlite" });
});

test("resolveDatabaseDriverConfig: prioriza POSTGRES_URL sobre DATABASE_URL e retorna driver postgres", () => {
  const cfg = resolveDatabaseDriverConfig({
    POSTGRES_URL: "  postgres://user:pass@ep-123.neon.tech/neondb?sslmode=require  ",
    DATABASE_URL: "postgres://other:pass@localhost:5432/other",
  });
  assert.deepEqual(cfg, {
    driver: "postgres",
    connectionString:
      "postgres://user:pass@ep-123.neon.tech/neondb?sslmode=require",
  });
});

test("resolveDatabaseDriverConfig: aceita DATABASE_URL quando POSTGRES_URL está vazia", () => {
  const cfg = resolveDatabaseDriverConfig({
    POSTGRES_URL: "   ",
    DATABASE_URL: "  postgres://user:pass@localhost:5432/torquelab  ",
  });
  assert.deepEqual(cfg, {
    driver: "postgres",
    connectionString: "postgres://user:pass@localhost:5432/torquelab",
  });
});

test("resolveDatabaseDriverConfig: lança 503 POSTGRES_CONFIG_MISSING em VERCEL=1 + NODE_ENV=production sem Postgres", () => {
  assert.throws(
    () =>
      resolveDatabaseDriverConfig({
        VERCEL: "1",
        NODE_ENV: "production",
      }),
    (err) => {
      assert.ok(err instanceof DatabaseAdapterError);
      assert.equal(err.code, "POSTGRES_CONFIG_MISSING");
      assert.equal(err.status, 503);
      return true;
    },
  );
});

test("convertPlaceholdersToPostgres: converte ? fora de literais string e preserva 'texto com ?' e escape ''", () => {
  const sql =
    "SELECT 'texto com ?' AS q, 'O''Brien? ainda ?' AS escaped FROM users WHERE email = ? AND role = ? AND status != 'ativo?'";
  const converted = convertPlaceholdersToPostgres(sql);
  assert.equal(
    converted,
    "SELECT 'texto com ?' AS q, 'O''Brien? ainda ?' AS escaped FROM users WHERE email = $1 AND role = $2 AND status != 'ativo?'",
  );
});

test("node:sqlite (:memory:): exec, run, get, all e transaction (commit e rollback)", async () => {
  const db = await openDatabaseAdapter({ env: { NODE_ENV: "test" } });
  assert.equal(db.driver, "sqlite");

  await db.exec(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  const inserted = await db.run("INSERT INTO items (name) VALUES (?)", [
    "Filtro de Óleo",
  ]);
  assert.equal(inserted.changes, 1);
  assert.equal(Number(inserted.lastInsertRowid), 1);

  const row = await db.get("SELECT id, name FROM items WHERE id = ?", [1]);
  assert.deepEqual(row, { id: 1, name: "Filtro de Óleo" });
  assert.equal(Object.getPrototypeOf(row), Object.prototype);

  const missing = await db.get("SELECT id FROM items WHERE id = ?", [999]);
  assert.equal(missing, undefined);

  // Transaction commit
  const txResult = await db.transaction(async (tx) => {
    await tx.run("INSERT INTO items (name) VALUES (?)", ["Vela de Ignição"]);
    return "ok";
  });
  assert.equal(txResult, "ok");

  // Transaction rollback
  await assert.rejects(
    () =>
      db.transaction(async (tx) => {
        await tx.run("INSERT INTO items (name) VALUES (?)", ["Correia"]);
        throw new Error("falha proposital");
      }),
    /falha proposital/,
  );

  const allRows = await db.all("SELECT id, name FROM items ORDER BY id ASC");
  assert.deepEqual(allRows, [
    { id: 1, name: "Filtro de Óleo" },
    { id: 2, name: "Vela de Ignição" },
  ]);

  await db.close();
});

test("wrapSqliteDatabase: envolve DatabaseSync existente com interface assíncrona", async () => {
  const raw = new DatabaseSync(":memory:");
  const db = wrapSqliteDatabase(raw);

  await db.exec("CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT);");
  await db.run("INSERT INTO kv (k, v) VALUES (?, ?)", ["a", "1"]);
  const found = await db.get("SELECT k, v FROM kv WHERE k = ?", ["a"]);
  assert.deepEqual(found, { k: "a", v: "1" });
  await db.close();
});

test("postgres mock: exec, run, get, all, ssl config e transaction (commit, rollback e release)", async () => {
  const calls = {
    poolConfig: null,
    queries: [],
    txQueries: [],
    releases: 0,
    poolEnds: 0,
  };

  const mockPoolFactory = (opts) => {
    calls.poolConfig = opts;
    return {
      async query(sql, params) {
        calls.queries.push({ sql, params });
        if (sql.startsWith("INSERT")) {
          return { rows: [], rowCount: 1 };
        }
        if (sql.includes("WHERE id = $1")) {
          return { rows: [{ id: 42, name: "Pastilha" }], rowCount: 1 };
        }
        if (sql.startsWith("SELECT id, name FROM a")) {
          return {
            rows: [
              { id: 1, name: "Óleo" },
              { id: 42, name: "Pastilha" },
            ],
            rowCount: 2,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      async connect() {
        return {
          async query(sql, params) {
            calls.txQueries.push({ sql, params });
            if (sql.startsWith("INSERT")) {
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          },
          release() {
            calls.releases += 1;
          },
        };
      },
      async end() {
        calls.poolEnds += 1;
      },
    };
  };

  const db = await openDatabaseAdapter({
    env: {
      POSTGRES_URL: "postgres://user:pass@ep-123.neon.tech/torquelab?sslmode=require",
    },
    createPgPool: mockPoolFactory,
  });

  assert.equal(db.driver, "postgres");
  assert.deepEqual(calls.poolConfig, {
    connectionString: "postgres://user:pass@ep-123.neon.tech/torquelab?sslmode=require",
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  await db.exec("CREATE TABLE a (id INT); CREATE TABLE b (id INT);");
  assert.equal(calls.queries[0].sql, "CREATE TABLE a (id INT); CREATE TABLE b (id INT);");
  assert.equal(calls.queries[0].params, undefined);

  const runRes = await db.run("INSERT INTO a (id, tag) VALUES (?, '?')", [42]);
  assert.deepEqual(runRes, { changes: 1, lastInsertRowid: null });
  assert.equal(calls.queries[1].sql, "INSERT INTO a (id, tag) VALUES ($1, '?')");
  assert.deepEqual(calls.queries[1].params, [42]);

  const one = await db.get("SELECT id, name FROM a WHERE id = ?", [42]);
  assert.deepEqual(one, { id: 42, name: "Pastilha" });
  assert.equal(calls.queries[2].sql, "SELECT id, name FROM a WHERE id = $1");

  const many = await db.all("SELECT id, name FROM a");
  assert.equal(many.length, 2);

  // Commit
  const committed = await db.transaction(async (tx) => {
    await tx.exec("SAVEPOINT sp1");
    const r = await tx.run("INSERT INTO a (id) VALUES (?)", [43]);
    return r.changes;
  });
  assert.equal(committed, 1);
  assert.deepEqual(
    calls.txQueries.map((q) => q.sql),
    ["BEGIN", "SAVEPOINT sp1", "INSERT INTO a (id) VALUES ($1)", "COMMIT"],
  );
  assert.equal(calls.releases, 1);

  // Rollback
  await assert.rejects(
    () =>
      db.transaction(async (tx) => {
        await tx.run("INSERT INTO a (id) VALUES (?)", [44]);
        throw new Error("erro na transação");
      }),
    /erro na transação/,
  );
  assert.deepEqual(
    calls.txQueries.slice(4).map((q) => q.sql),
    ["BEGIN", "INSERT INTO a (id) VALUES ($1)", "ROLLBACK"],
  );
  assert.equal(calls.releases, 2);

  await db.close();
  assert.equal(calls.poolEnds, 1);
});

test("postgres mock: desativa SSL para localhost / 127.0.0.1 / sslmode=disable", async () => {
  for (const url of [
    "postgres://postgres:postgres@localhost:5432/torquelab",
    "postgres://postgres:postgres@127.0.0.1:5432/torquelab",
    "postgres://user:pass@remote.host:5432/torquelab?sslmode=disable",
  ]) {
    let capturedConfig = null;
    await openDatabaseAdapter({
      env: { DATABASE_URL: url },
      createPgPool: (cfg) => {
        capturedConfig = cfg;
        return { async query() { return { rows: [], rowCount: 0 }; } };
      },
    });
    assert.equal(capturedConfig.ssl, false);
    assert.equal(capturedConfig.max, 5);
  }
});

test("postgres mock: mapeia ECONNREFUSED/08*/57P* para 503 POSTGRES_CONNECTION_ERROR e preserva erro 23505", async () => {
  const pool = wrapPostgresPool({
    async query(sql) {
      if (sql.includes("UNIQUE_VIOLATION")) {
        const err = new Error('duplicate key value violates unique constraint "idx_users_email_lower"');
        err.code = "23505";
        throw err;
      }
      if (sql.includes("ADMIN_SHUTDOWN")) {
        const err = new Error("terminating connection due to administrator command");
        err.code = "57P01";
        throw err;
      }
      const err = new Error("connect ECONNREFUSED 127.0.0.1:5432");
      err.code = "ECONNREFUSED";
      throw err;
    },
    async connect() {
      const err = new Error("connect ECONNREFUSED 127.0.0.1:5432");
      err.code = "ECONNREFUSED";
      throw err;
    },
  });

  await assert.rejects(
    () => pool.exec("SELECT 1"),
    (err) => {
      assert.ok(err instanceof DatabaseAdapterError);
      assert.equal(err.code, "POSTGRES_CONNECTION_ERROR");
      assert.equal(err.status, 503);
      assert.equal(
        err.message,
        "Serviço temporariamente indisponível. Tente novamente em instantes.",
      );
      return true;
    },
  );

  await assert.rejects(
    () => pool.get("SELECT ADMIN_SHUTDOWN"),
    (err) => {
      assert.ok(err instanceof DatabaseAdapterError);
      assert.equal(err.code, "POSTGRES_CONNECTION_ERROR");
      assert.equal(err.status, 503);
      return true;
    },
  );

  await assert.rejects(
    () => pool.transaction(async () => {}),
    (err) => {
      assert.ok(err instanceof DatabaseAdapterError);
      assert.equal(err.code, "POSTGRES_CONNECTION_ERROR");
      assert.equal(err.status, 503);
      return true;
    },
  );

  await assert.rejects(
    () => pool.run("INSERT UNIQUE_VIOLATION"),
    (err) => {
      assert.equal(err.code, "23505");
      assert.equal(err instanceof DatabaseAdapterError, false);
      return true;
    },
  );
});
