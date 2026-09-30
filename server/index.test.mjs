import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";

test("rota HTTP normaliza a placa e mantém o token fora da resposta", async () => {
  process.env.FALCON_API_TOKEN = "TOKEN_TESTE";
  process.env.ALLOWED_ORIGINS = "http://localhost:8081";
  const { server } = await import("./index.mjs");
  const originalFetch = globalThis.fetch;
  let upstreamUrl;
  globalThis.fetch = async (url, options) => {
    upstreamUrl = url;
    assert.equal(options.headers.Authorization, "Bearer TOKEN_TESTE");
    return new Response(JSON.stringify({ data: { placa: "ABC1D23", marca: "VW", modelo: "GOL" } }), { status: 200 });
  };
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    const result = await new Promise((resolve, reject) => {
      const req = request({ hostname: "127.0.0.1", port, path: "/api/vehicles/abc-1d23", headers: { Origin: "http://localhost:8081" } }, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
      req.on("error", reject);
      req.end();
    });
    assert.equal(result.status, 200);
    assert.equal(result.headers["access-control-allow-origin"], "http://localhost:8081");
    assert.equal(upstreamUrl, "https://beta.falcon-server.com.br/data-hub/private/v1/vehicles/ABC1D23/search");
    assert.deepEqual(JSON.parse(result.body), { data: { plate: "ABC1D23", brand: "VW", model: "GOL" } });
    assert.equal(result.body.includes("TOKEN_TESTE"), false);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
  }
});
