import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { fetchFalconImage, fetchFalconPlate } from "./falcon.mjs";

const token = process.env.FALCON_API_TOKEN?.trim();
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS ?? "http://localhost:8081,http://127.0.0.1:8081")
  .split(",").map((value) => value.trim()).filter(Boolean));
const port = Number(process.env.API_PORT || 3001);
const attempts = new Map();

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function limited(address) {
  const now = Date.now();
  const previous = attempts.get(address);
  const entry = !previous || now - previous.since > 60_000 ? { since: now, count: 0 } : previous;
  entry.count += 1;
  attempts.set(address, entry);
  return entry.count > 30;
}

export const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) return json(response, 403, { error: "Origem não permitida." });
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  }
  if (request.method === "OPTIONS") return response.writeHead(204).end();
  if (request.method !== "GET") return json(response, 405, { error: "Método não permitido." });

  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const match = /^\/api\/vehicles\/([^/]+)(\/image)?$/.exec(path);
  if (!match) return json(response, 404, { error: "Rota não encontrada." });
  if (limited(request.socket.remoteAddress ?? "unknown")) return json(response, 429, { error: "Muitas consultas. Tente novamente em um minuto." });
  let plate;
  try { plate = decodeURIComponent(match[1]); }
  catch { return json(response, 400, { error: "Placa inválida." }); }

  if (match[2]) {
    const result = await fetchFalconImage(plate, token);
    if (result.status !== 200) return json(response, result.status, { error: "Imagem indisponível." });
    response.writeHead(200, { "Content-Type": result.contentType, "Cache-Control": "private, max-age=60" });
    return response.end(result.bytes);
  }
  const result = await fetchFalconPlate(plate, token);
  return json(response, result.status, result.body);
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(port, () => console.log(`API de placas em http://localhost:${port}`));
}
