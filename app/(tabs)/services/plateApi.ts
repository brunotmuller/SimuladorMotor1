export type VeiculoPorPlaca = {
  plate?: string;
  brand?: string;
  model?: string;
  year?: string;
  modelYear?: string;
  color?: string;
  fuel?: string;
  chassis?: string;
  imported?: boolean;
  city?: string;
  state?: string;
  theftIndicators?: boolean;
  theftCheckedAt?: string;
  imageUrl?: string;
  imageAvailable?: boolean;
  ipvaByState?: { state?: string; taxableValue?: string; rate?: string; tax?: string }[];
};

const DEV_WEB_PORTS = new Set(["8081", "8082", "19006"]);

/** Resolve o endpoint de consulta de placas com suporte a same-origin e caminho relativo. */
export function resolvePlateApiEndpoint(envUrl?: string): string {
  const raw =
    envUrl !== undefined
      ? envUrl
      : typeof process !== "undefined" && process.env
        ? process.env.EXPO_PUBLIC_PLATE_API_URL
        : undefined;
  const trimmed = typeof raw === "string" ? raw.trim() : "";

  const hasBrowserOrigin = typeof window !== "undefined" && Boolean(window.location?.origin);
  const browserOrigin = hasBrowserOrigin ? window.location.origin.replace(/\/+$/, "") : "";
  const browserPort = typeof window !== "undefined" ? (window.location?.port ?? "") : "";

  if (trimmed.toLowerCase() === "same-origin") {
    return browserOrigin ? `${browserOrigin}/api/vehicles` : "/api/vehicles";
  }

  if (trimmed.startsWith("/")) {
    const normalizedPath = trimmed.replace(/\/+$/, "");
    return browserOrigin ? `${browserOrigin}${normalizedPath}` : normalizedPath;
  }

  if (trimmed.length > 0) {
    return trimmed.replace(/\/+$/, "");
  }

  if (browserOrigin && !DEV_WEB_PORTS.has(browserPort)) {
    return `${browserOrigin}/api/vehicles`;
  }

  return "";
}

const endpoint = resolvePlateApiEndpoint();
export const consultaPlacaConfigurada = Boolean(endpoint);

export class PlacaNaoEncontradaError extends Error {}

export function normalizarPlaca(valor: string) {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function formatarPlaca(valor: string) {
  const normalizada = normalizarPlaca(valor);
  return normalizada.length > 3
    ? `${normalizada.slice(0, 3)}-${normalizada.slice(3)}`
    : normalizada;
}

export function placaValida(placa: string) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizarPlaca(placa));
}

export async function consultarPlaca(placa: string): Promise<VeiculoPorPlaca> {
  const resolvedEndpoint = resolvePlateApiEndpoint();
  if (!resolvedEndpoint) throw new Error("A consulta por placa ainda não foi configurada.");
  if (!placaValida(placa)) throw new Error("Informe uma placa válida, como ABC1D23 ou ABC1234.");
  const normalizada = normalizarPlaca(placa);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const resposta = await fetch(`${resolvedEndpoint}/${encodeURIComponent(normalizada)}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (resposta.status === 404) throw new PlacaNaoEncontradaError("Placa não encontrada.");
    const retorno: { data?: VeiculoPorPlaca; error?: string } = await resposta.json();
    if (!resposta.ok) throw new Error(retorno.error || "Não foi possível consultar a placa.");
    if (!retorno.data) throw new Error("A resposta da consulta está vazia.");
    return {
      ...retorno.data,
      ...(retorno.data.imageAvailable && { imageUrl: `${resolvedEndpoint}/${encodeURIComponent(normalizada)}/image` }),
    };
  } catch (erro) {
    if (erro instanceof PlacaNaoEncontradaError) throw erro;
    if (erro instanceof Error && erro.name === "AbortError") throw new Error("A consulta demorou demais. Tente novamente.");
    throw erro;
  } finally {
    clearTimeout(timeout);
  }
}
