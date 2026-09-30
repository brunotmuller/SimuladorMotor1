export function calcularViagem(distanciaKm: number, precoLitro: number, consumoKmLitro: number) {
  if (![distanciaKm, precoLitro, consumoKmLitro].every(Number.isFinite) ||
      distanciaKm <= 0 || precoLitro <= 0 || consumoKmLitro <= 0) return null;
  const litros = distanciaKm / consumoKmLitro;
  return { litros, custo: litros * precoLitro };
}
