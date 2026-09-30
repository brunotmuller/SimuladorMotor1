import test from "node:test";
import assert from "node:assert/strict";
import { fetchFalconPlate, isValidPlate, mapFalconVehicle, normalizePlate } from "./falcon.mjs";

test("normaliza placas antigas e Mercosul e rejeita entradas inválidas", () => {
  assert.equal(normalizePlate(" abc-1d23 "), "ABC1D23");
  assert.equal(isValidPlate("ABC1D23"), true);
  assert.equal(isValidPlate("ABC1234"), true);
  assert.equal(isValidPlate("ABC12D4"), false);
});

test("consulta a Falcon no servidor e mapeia somente dados recebidos", async () => {
  let url;
  let authorization;
  const mockFetch = async (target, options) => {
    url = target;
    authorization = options.headers.Authorization;
    return new Response(JSON.stringify({ data: {
      placa: "ABC1D23", marca: "VW", modelo: "GOL 1.0", ano: "2020",
      ano_modelo: "2021", importado: false, indicios_roubo: false,
      ipva_por_estado: [{ uf: "SP", valor_ipva: "R$ 1.800,00" }],
    } }), { status: 200 });
  };
  const result = await fetchFalconPlate(" abc-1d23 ", "TOKEN_TESTE", mockFetch);
  assert.equal(url, "https://beta.falcon-server.com.br/data-hub/private/v1/vehicles/ABC1D23/search");
  assert.equal(authorization, "Bearer TOKEN_TESTE");
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data, {
    plate: "ABC1D23", brand: "VW", model: "GOL 1.0", year: "2020",
    modelYear: "2021", imported: false, theftIndicators: false,
    ipvaByState: [{ state: "SP", tax: "R$ 1.800,00" }],
  });
  assert.equal(JSON.stringify(result).includes("TOKEN_TESTE"), false);
});

test("404 e resposta sem dados são placas não encontradas", async () => {
  const missing = await fetchFalconPlate("ABC1234", "TOKEN_TESTE", async () => new Response(null, { status: 404 }));
  const empty = await fetchFalconPlate("ABC1234", "TOKEN_TESTE", async () => new Response(JSON.stringify({ data: null }), { status: 200 }));
  assert.equal(missing.status, 404);
  assert.equal(empty.status, 404);
  assert.equal(mapFalconVehicle({ data: null }), null);
});

test("falha upstream não revela mensagem nem token da Falcon", async () => {
  const result = await fetchFalconPlate("ABC1234", "TOKEN_TESTE", async () => new Response("falha privada", { status: 401 }));
  assert.equal(result.status, 502);
  assert.equal(JSON.stringify(result).includes("TOKEN_TESTE"), false);
  assert.equal(JSON.stringify(result).includes("falha privada"), false);
});
