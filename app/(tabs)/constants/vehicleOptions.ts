import {
  CondicaoPneu,
  TipoPneu,
  TipoUso,
} from "../types/vehicle";

export const TIPOS_PNEU: TipoPneu[] = ["Comum", "Esportivo"];

/** Texto curto explicando cada opção de pneu */
export const EXPLICACAO_PNEU: Record<TipoPneu, string> = {
  Comum: "Pneu de dia a dia — o mais usado nos carros de passeio.",
  Esportivo:
    "Mais aderência em curvas; o consumo pode ficar um pouco maior.",
};

export const TIPOS_USO: TipoUso[] = ["Cidade", "Estrada", "Misto"];

export const EXPLICACAO_USO: Record<TipoUso, string> = {
  Cidade: "Trânsito, semáforos e percursos curtos.",
  Estrada: "Viagens e velocidade mais constante.",
  Misto: "Um pouco de cidade e um pouco de estrada.",
};

export const CONDICOES_PNEU: CondicaoPneu[] = ["Novo", "Bom", "Desgastado"];

export const EXPLICACAO_CONDICAO: Record<CondicaoPneu, string> = {
  Novo: "Pouco uso, sulco alto.",
  Bom: "Ainda em boas condições.",
  Desgastado: "Sulco baixo — vale ficar de olho na troca.",
};
