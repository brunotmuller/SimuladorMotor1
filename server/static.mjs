import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function normalizeBasePath(rawBasePath) {
  const trimmed = String(rawBasePath ?? "/SimuladorMotor1").trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function isInsideRoot(rootDir, candidatePath) {
  return (
    candidatePath === rootDir || candidatePath.startsWith(`${rootDir}${sep}`)
  );
}

/**
 * Cria um handler HTTP para servir o bundle estático do Expo Web (dist/)
 * no mesmo servidor da API, evitando problemas de CORS no Docker.
 */
export function createStaticWebHandler({
  distDir,
  basePath = "/SimuladorMotor1",
} = {}) {
  const rootDir = resolve(distDir);
  const prefix = normalizeBasePath(basePath);
  const indexHtmlPath = join(rootDir, "index.html");

  return function handleStaticRequest(request, response, pathname) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return false;
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return false;
    }

    if (!existsSync(indexHtmlPath)) {
      return false;
    }

    if (prefix && (pathname === "/" || pathname === prefix)) {
      response.writeHead(302, { Location: `${prefix}/` });
      response.end();
      return true;
    }

    let relativePath = pathname;
    if (prefix && pathname.startsWith(`${prefix}/`)) {
      relativePath = pathname.slice(prefix.length);
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(relativePath);
    } catch {
      return false;
    }

    const sanitized = decodedPath.replace(/^\/+/, "");
    let filePath = sanitized ? resolve(rootDir, sanitized) : indexHtmlPath;

    if (!isInsideRoot(rootDir, filePath)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Acesso negado.");
      return true;
    }

    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      const dirIndex = join(filePath, "index.html");
      filePath = existsSync(dirIndex) ? dirIndex : indexHtmlPath;
    } else if (!existsSync(filePath)) {
      const htmlCandidate = `${filePath}.html`;
      if (isInsideRoot(rootDir, htmlCandidate) && existsSync(htmlCandidate)) {
        filePath = htmlCandidate;
      } else {
        filePath = indexHtmlPath;
      }
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    const isImmutableAsset =
      filePath.includes(`${sep}_expo${sep}static${sep}`) ||
      filePath.includes(`${sep}assets${sep}`);
    const cacheControl =
      ext === ".html"
        ? "no-cache"
        : isImmutableAsset
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600";

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    });

    if (request.method === "HEAD") {
      response.end();
      return true;
    }

    const stream = createReadStream(filePath);
    stream.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      }
      response.end("Erro ao carregar arquivo estático.");
    });
    stream.pipe(response);
    return true;
  };
}
