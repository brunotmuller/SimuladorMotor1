import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  DatabaseAdapterError,
  openDatabaseAdapter,
  resolveDatabaseDriverConfig,
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

test("resolveDatabaseDriverConfig: seleciona libsql quando TURSO_DATABASE_URL e TURSO_AUTH_TOKEN estão definidos", () => {
  const cfg = resolveDatabaseDriverConfig({
    TURSO_DATABASE_URL: "  libsql://torquelab-db.turso.io  ",
    TURSO_AUTH_TOKEN: "  secret-token  ",
  });
  assert.deepEqual(cfg, {
    driver: "libsql",
    url: "libsql://torquelab-db.turso.io",
    authToken: "secret-token",
  });
});

test("resolveDatabaseDriverConfig: lança 503 TURSO_AUTH_TOKEN_MISSING quando libsql:// ou https:// sem token", () => {
  for (const url of [
    "libsql://torquelab-db.turso.io",
    "https://torquelab-db.turso.io",
  ]) {
    assert.throws(
      () =>
        resolveDatabaseDriverConfig({
          TURSO_DATABASE_URL: url,
          TURSO_AUTH_TOKEN: "   ",
        }),
      (err) => {
        assert.ok(err instanceof DatabaseAdapterError);
        assert.equal(err.code, "TURSO_AUTH_TOKEN_MISSING");
        assert.equal(err.status, 503);
        return true;
      },
    );
  }
});

test("resolveDatabaseDriverConfig: lança 503 TURSO_CONFIG_MISSING em VERCEL=1 + NODE_ENV=production sem TURSO_DATABASE_URL", () => {
  assert.throws(
    () =>
      resolveDatabaseDriverConfig({
        VERCEL: "1",
        NODE_ENV: "production",
      }),
    (err) => {
      assert.ok(err instanceof DatabaseAdapterError);
      assert.equal(err.code, "TURSO_CONFIG_MISSING");
      assert.equal(err.status, 503);
      return true;
    },
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

test("libsql mock: exec (executeMultiple), run, get, all e transaction (commit e rollback)", async () => {
  const calls = {
    executeMultiple: [],
    execute: [],
    txExecute: [],
    commits: 0,
    rollbacks: 0,
    txCloses: 0,
    clientCloses: 0,
  };

  const mockClientFactory = (opts) => {
    assert.equal(opts.url, "libsql://mock.turso.io");
    assert.equal(opts.authToken, "mock-token");

    return {
      async executeMultiple(sql) {
        calls.executeMultiple.push(sql);
      },
      async execute(stmt) {
        calls.execute.push(stmt);
        if (stmt.sql.startsWith("INSERT")) {
          return { rows: [], rowsAffected: 1, lastInsertRowid: 42n };
        }
        if (stmt.sql.includes("WHERE id = ?")) {
          return {
            rows: [{ id: 42, name: "Pastilha" }],
            rowsAffected: 0,
          };
        }
        return {
          rows: [
            { id: 1, name: "Óleo" },
            { id: 42, name: "Pastilha" },
          ],
          rowsAffected: 0,
        };
      },
      async transaction(mode) {
        assert.equal(mode, "write");
        return {
          async execute(stmt) {
            calls.txExecute.push(stmt);
            return { rows: [], rowsAffected: 1, lastInsertRowid: 43n };
          },
          async commit() {
            calls.commits += 1;
          },
          async rollback() {
            calls.rollbacks += 1;
          },
          async close() {
            calls.txCloses += 1;
          },
        };
      },
      async close() {
        calls.clientCloses += 1;
      },
    };
  };

  const db = await openDatabaseAdapter({
    env: {
      TURSO_DATABASE_URL: "libsql://mock.turso.io",
      TURSO_AUTH_TOKEN: "mock-token",
    },
    createLibsqlClient: mockClientFactory,
  });

  assert.equal(db.driver, "libsql");

  await db.exec("CREATE TABLE a (id INT); CREATE TABLE b (id INT);");
  assert.equal(calls.executeMultiple.length, 1);

  const runRes = await db.run("INSERT INTO a (id) VALUES (?)", [42]);
  assert.deepEqual(runRes, { changes: 1, lastInsertRowid: 42n });

  const one = await db.get("SELECT id, name FROM a WHERE id = ?", [42]);
  assert.deepEqual(one, { id: 42, name: "Pastilha" });

  const many = await db.all("SELECT id, name FROM a");
  assert.equal(many.length, 2);

  // Commit
  const committed = await db.transaction(async (tx) => {
    await tx.exec("SAVEPOINT sp1");
    const r = await tx.run("INSERT INTO a (id) VALUES (?)", [43]);
    return r.changes;
  });
  assert.equal(committed, 1);
  assert.equal(calls.commits, 1);
  assert.equal(calls.rollbacks, 0);
  assert.equal(calls.txCloses, 1);

  // Rollback
  await assert.rejects(
    () =>
      db.transaction(async (tx) => {
        await tx.run("INSERT INTO a (id) VALUES (?)", [44]);
        throw new Error("erro na transação");
      }),
    /erro na transação/,
  );
  assert.equal(calls.commits, 1);
  assert.equal(calls.rollbacks, 1);
  assert.equal(calls.txCloses, 2);

  await db.close();
  assert.equal(calls.clientCloses, 1);
});

test("libsql mock: mapeia falha de rede/conexão para 503 TURSO_CONNECTION_ERROR e preserva erro de constraint SQL", async () => {
  const failingClientFactory = () => ({
    async executeMultiple() {
      const err = new Error("connect ECONNREFUSED 127.0.0.1:443");
      err.code = "ECONNREFUSED";
      throw err;
    },
    async execute(stmt) {
      if (stmt.sql.includes("CONSTRAINT")) {
        const err = new Error("UNIQUE constraint failed: users.email");
        err.code = "SQLITE_CONSTRAINT_UNIQUE";
        throw err;
      }
      throw new TypeError("fetch failed");
    },
  });

  const db = await openDatabaseAdapter({
    env: {
      TURSO_DATABASE_URL: "libsql://mock.turso.io",
      TURSO_AUTH_TOKEN: "mock-token",
    },
    createLibsqlClient: failingClientFactory,
  });

  await assert.rejects(
    () => db.exec("SELECT 1"),
    (err) => {
      assert.ok(err instanceof DatabaseAdapterError);
      assert.equal(err.code, "TURSO_CONNECTION_ERROR");
      assert.equal(err.status, 503);
      assert.equal(
        err.message,
        "Serviço temporariamente indisponível. Tente novamente em instantes.",
      );
      return true;
    },
  );

  await assert.rejects(
    () => db.get("SELECT 1"),
    (err) => {
      assert.ok(err instanceof DatabaseAdapterError);
      assert.equal(err.code, "TURSO_CONNECTION_ERROR");
      assert.equal(err.status, 503);
      return true;
    },
  );

  await assert.rejects(
    () => db.run("INSERT CONSTRAINT"),
    (err) => {
      assert.equal(err.code, "SQLITE_CONSTRAINT_UNIQUE");
      assert.equal(err instanceof DatabaseAdapterError, false);
      return true;
    },
  );
});
