import {
    DadosFipe,
    ItemAPI,
  } from "../types/vehicle";
  
  type ValidacaoProps = {
    marca: ItemAPI | null;
    modelo: ItemAPI | null;
    ano: ItemAPI | null;
    dadosFipe: DadosFipe | null;
  
    km: string;
    peso: string;
    calibragem: string;
  
    tipoPneu: string;
    tipoUso: string;
    condicaoPneu: string;
    mesesUltimaRevisao: string;
  };
  
  export function apenasNumero(texto: string) {
    return texto.replace(/[^0-9]/g, "");
  }
  
  export function validarDados({
    marca,
    modelo,
    ano,
    dadosFipe,
    km,
    peso,
    calibragem,
    tipoPneu,
    tipoUso,
    condicaoPneu,
    mesesUltimaRevisao,
  }: ValidacaoProps): string | null {
    if (!marca) {
      return "Selecione a marca do veículo.";
    }
  
    if (!modelo) {
      return "Selecione o modelo do veículo.";
    }
  
    if (!ano) {
      return "Selecione o ano do veículo.";
    }
  
    if (!dadosFipe) {
      return "Os dados FIPE ainda não foram carregados.";
    }
  
    if (!km.trim()) {
      return "Informe a quilometragem.";
    }
  
    if (!peso.trim()) {
      return "Informe o peso aproximado.";
    }
  
    if (!calibragem.trim()) {
      return "Informe a calibragem.";
    }
  
    if (!tipoPneu) {
      return "Selecione o tipo de pneu.";
    }
  
    if (!tipoUso) {
      return "Selecione o tipo de uso.";
    }
  
    if (!condicaoPneu) {
      return "Selecione a condição dos pneus.";
    }
  
    if (!mesesUltimaRevisao.trim()) {
      return "Informe há quantos meses ocorreu a última revisão.";
    }
  
    const kmNumero = Number(km);
    const pesoNumero = Number(peso);
    const calibragemNumero = Number(calibragem);
    const revisaoNumero = Number(mesesUltimaRevisao);
  
    if (
      !Number.isFinite(kmNumero) ||
      kmNumero < 0 ||
      kmNumero > 2_000_000
    ) {
      return "Digite uma quilometragem válida.";
    }
  
    if (
      !Number.isFinite(pesoNumero) ||
      pesoNumero < 500 ||
      pesoNumero > 5000
    ) {
      return "Informe um peso entre 500 e 5000 kg.";
    }
  
    if (
      !Number.isFinite(calibragemNumero) ||
      calibragemNumero < 10 ||
      calibragemNumero > 60
    ) {
      return "Informe uma calibragem entre 10 e 60 PSI.";
    }
  
    if (
      !Number.isFinite(revisaoNumero) ||
      revisaoNumero < 0 ||
      revisaoNumero > 120
    ) {
      return "Informe um período de revisão válido.";
    }
  
    return null;
  }