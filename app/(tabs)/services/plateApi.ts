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

const endpoint = process.env.EXPO_PUBLIC_PLATE_API_URL?.trim().replace(/\/$/, "");
export const consultaPlacaConfigurada = !!endpoint;

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
  if (!endpoint) throw new Error("A consulta por placa ainda não foi configurada.");
  if (!placaValida(placa)) throw new Error("Informe uma placa válida, como ABC1D23 ou ABC1234.");
  const normalizada = normalizarPlaca(placa);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const resposta = await fetch(`${endpoint}/${encodeURIComponent(normalizada)}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (resposta.status === 404) throw new PlacaNaoEncontradaError("Placa não encontrada.");
    const retorno: { data?: VeiculoPorPlaca; error?: string } = await resposta.json();
    if (!resposta.ok) throw new Error(retorno.error || "Não foi possível consultar a placa.");
    if (!retorno.data) throw new Error("A resposta da consulta está vazia.");
    return {
      ...retorno.data,
      ...(retorno.data.imageAvailable && { imageUrl: `${endpoint}/${encodeURIComponent(normalizada)}/image` }),
    };
  } catch (erro) {
    if (erro instanceof PlacaNaoEncontradaError) throw erro;
    if (erro instanceof Error && erro.name === "AbortError") throw new Error("A consulta demorou demais. Tente novamente.");
    throw erro;
  } finally {
    clearTimeout(timeout);
  }
}
