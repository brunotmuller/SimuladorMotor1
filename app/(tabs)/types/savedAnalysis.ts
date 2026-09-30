import { DadosAtuais, DadosFipe, ItemAPI, Resultado } from "./vehicle";

export type AnaliseSalva = {
  id: string;
  salvaEm: string;
  fipe: DadosFipe;
  dados: DadosAtuais;
  resultado: Resultado;
  selecao: { marca: ItemAPI; modelo: ItemAPI; ano: ItemAPI };
};
