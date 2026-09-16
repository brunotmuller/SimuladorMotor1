export type ItemAPI = {
    code: string | number;
    name: string;
  };
  
  export type DadosFipe = {
    vehicleType?: number;
    price: string;
    brand: string;
    model: string;
    modelYear: number;
    fuel: string;
    codeFipe: string;
    referenceMonth?: string;
  };
  
  export type TipoPneu =
    | "Convencional"
    | "Esportivo"
    | "Off-road"
    | "Econômico";
  
  export type TipoUso =
    | "Cidade"
    | "Estrada"
    | "Misto";
  
  export type CondicaoPneu =
    | "Novo"
    | "Bom"
    | "Desgastado";
  
  export type DadosAtuais = {
    km: number;
    peso: number;
    calibragem: number;
    pneu: TipoPneu;
    tipoUso: TipoUso;
    condicaoPneu: CondicaoPneu;
    mesesUltimaRevisao: number;
  };
  
  export type AjusteNota = {
    descricao: string;
    pontos: number;
  };
  
  export type Resultado = {
    desempenho: string;
    saude: number;
    consumo: number;
    categoria: string;
    nota: number;
    classificacao: string;
    alertas: string[];
    ajustes: AjusteNota[];
  };