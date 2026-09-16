import {
    CondicaoPneu,
    TipoPneu,
    TipoUso,
  } from "../types/vehicle";
  
  export const TIPOS_PNEU: TipoPneu[] = [
    "Convencional",
    "Esportivo",
    "Off-road",
    "Econômico",
  ];
  
  export const TIPOS_USO: TipoUso[] = [
    "Cidade",
    "Estrada",
    "Misto",
  ];
  
  export const CONDICOES_PNEU: CondicaoPneu[] = [
    "Novo",
    "Bom",
    "Desgastado",
  ];