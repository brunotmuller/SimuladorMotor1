import {
    DadosAtuais,
    DadosFipe,
    Resultado,
  } from "../types/vehicle";
  
  export function analisarVeiculo(
    fipe: DadosFipe,
    dados: DadosAtuais
  ): Resultado {
    let nota = 100;
    let saude = 100;
  
    let consumo = 12;
    let desempenho = "Bom";
    let categoria = "Uso urbano";
  
    const alertas: string[] = [];
    const ajustes: Resultado["ajustes"] = [];
  
    const descontar = (
      pontos: number,
      descricao: string
    ) => {
      nota -= pontos;
  
      ajustes.push({
        descricao,
        pontos: -pontos,
      });
    };
  
    /*
     * COMBUSTÍVEL
     * Valores educacionais aproximados.
     */
  
    const combustivel =
      fipe.fuel?.toLowerCase() ?? "";
  
    if (
      combustivel.includes("etanol") ||
      combustivel.includes("alcool") ||
      combustivel.includes("álcool")
    ) {
      consumo = 8;
    } else if (combustivel.includes("diesel")) {
      consumo = 14;
    } else if (
      combustivel.includes("hibrido") ||
      combustivel.includes("híbrido")
    ) {
      consumo = 17;
    } else if (combustivel.includes("flex")) {
      consumo = 11;
    } else if (combustivel.includes("gasolina")) {
      consumo = 12;
    }
  
    /*
     * PESO
     */
  
    if (dados.peso > 2200) {
      consumo -= 3;
      descontar(10, "Peso elevado do veículo");
  
      desempenho = "Moderado";
      categoria = "Veículo pesado";
    } else if (dados.peso > 1600) {
      consumo -= 2;
      descontar(5, "Peso acima de 1600 kg");
  
      categoria = "SUV / Utilitário";
    } else if (dados.peso < 1100) {
      consumo += 1;
      desempenho = "Muito bom";
      categoria = "Compacto";
    }
  
    /*
     * QUILOMETRAGEM
     */
  
    if (dados.km >= 200000) {
      saude -= 35;
  
      descontar(
        20,
        "Quilometragem acima de 200 mil km"
      );
  
      alertas.push(
        "Quilometragem elevada. Mantenha as revisões em dia."
      );
    } else if (dados.km >= 100000) {
      saude -= 20;
  
      descontar(
        10,
        "Quilometragem acima de 100 mil km"
      );
  
      alertas.push(
        "Quilometragem acima de 100 mil km."
      );
    } else if (dados.km >= 50000) {
      saude -= 8;
  
      descontar(
        4,
        "Quilometragem acima de 50 mil km"
      );
    }
  
    /*
     * IDADE
     */
  
    const anoAtual = new Date().getFullYear();
    const anoModelo = Number(fipe.modelYear);
  
    if (Number.isFinite(anoModelo)) {
      const idade = Math.max(
        anoAtual - anoModelo,
        0
      );
  
      if (idade >= 20) {
        saude -= 20;
  
        descontar(
          12,
          "Veículo com 20 anos ou mais"
        );
  
        alertas.push(
          "Veículo mais antigo. A manutenção preventiva é ainda mais importante."
        );
      } else if (idade >= 10) {
        saude -= 10;
  
        descontar(
          5,
          "Veículo com 10 anos ou mais"
        );
      }
    }
  
    /*
     * CALIBRAGEM
     */
  
    if (dados.calibragem < 28) {
      consumo -= 1.5;
  
      descontar(
        10,
        "Calibragem abaixo da faixa genérica"
      );
  
      alertas.push(
        "A calibragem informada está abaixo da faixa genérica usada pelo simulador. Consulte o manual do veículo."
      );
    } else if (dados.calibragem > 40) {
      descontar(
        6,
        "Calibragem acima da faixa genérica"
      );
  
      alertas.push(
        "A calibragem informada está acima da faixa genérica usada pelo simulador. Consulte o manual do veículo."
      );
    }
  
    /*
     * TIPO DE PNEU
     */
  
    if (dados.pneu === "Esportivo") {
      desempenho = "Muito bom";
      consumo -= 0.5;
    }
  
    if (dados.pneu === "Off-road") {
      categoria = "Off-road";
      consumo -= 1;
    }
  
    if (dados.pneu === "Econômico") {
      consumo += 0.5;
    }
  
    /*
     * CONDIÇÃO DO PNEU
     */
  
    if (dados.condicaoPneu === "Desgastado") {
      saude -= 8;
  
      descontar(
        8,
        "Pneus informados como desgastados"
      );
  
      alertas.push(
        "Pneus desgastados podem comprometer a segurança e o desempenho."
      );
    }
  
    /*
     * ÚLTIMA REVISÃO
     */
  
    if (dados.mesesUltimaRevisao >= 24) {
      saude -= 20;
  
      descontar(
        15,
        "Revisão realizada há 24 meses ou mais"
      );
  
      alertas.push(
        "O período informado desde a última revisão é elevado."
      );
    } else if (dados.mesesUltimaRevisao >= 12) {
      saude -= 10;
  
      descontar(
        8,
        "Revisão realizada há 12 meses ou mais"
      );
  
      alertas.push(
        "Considere verificar se está próximo do momento de realizar uma nova revisão."
      );
    }
  
    /*
     * TIPO DE USO
     */
  
    if (dados.tipoUso === "Cidade") {
      consumo -= 1;
      categoria = "Uso urbano";
    }
  
    if (dados.tipoUso === "Estrada") {
      consumo += 1;
      categoria = "Uso rodoviário";
    }
  
    if (dados.tipoUso === "Misto") {
      categoria = "Uso misto";
    }
  
    /*
     * LIMITES
     */
  
    consumo = Math.max(
      3,
      Math.min(consumo, 25)
    );
  
    saude = Math.round(
      Math.max(30, Math.min(saude, 100))
    );
  
    nota = Math.round(
      Math.max(0, Math.min(nota, 100))
    );
  
    let classificacao = "Requer atenção";
  
    if (nota >= 90) {
      classificacao = "Excelente";
    } else if (nota >= 75) {
      classificacao = "Bom";
    } else if (nota >= 60) {
      classificacao = "Regular";
    }
  
    return {
      desempenho,
      saude,
      consumo: Number(consumo.toFixed(1)),
      categoria,
      nota,
      classificacao,
      alertas,
      ajustes,
    };
  }