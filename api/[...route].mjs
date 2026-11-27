import { createRequestHandler } from "../server/index.mjs";

let cachedHandler = null;

function getRequestHandler() {
  if (!cachedHandler) {
    cachedHandler = createRequestHandler({
      serveWebDist: false,
    });
  }
  return cachedHandler;
}

export default async function handler(request, response) {
  try {
    const requestHandler = getRequestHandler();
    await requestHandler(request, response);
  } catch (error) {
    console.error(
      "[TorqueLab Vercel]",
      error?.code ?? error?.name ?? "ERROR",
      error?.message ?? error,
    );
    if (!response.headersSent) {
      response.writeHead(503, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(
        JSON.stringify({
          error:
            "Serviço temporariamente indisponível. Tente novamente em instantes.",
        }),
      );
    }
  }
}
