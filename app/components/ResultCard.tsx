import React from "react";

import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { styles } from "../(tabs)/styles/styles";

import {
  DadosAtuais,
  DadosFipe,
  Resultado,
} from "../(tabs)/types/vehicle";
import { analisarVeiculo } from "../(tabs)/utils/analyzer";

type Props = {
  resultado: Resultado;
  dadosFipe: DadosFipe;
  dadosAtuais: DadosAtuais;
  salvar: () => void;
  avisoSalvamento: string;
  salvo: boolean;
  limpar: () => void;
};

export default function ResultCard({
  resultado,
  dadosFipe,
  dadosAtuais,
  salvar,
  avisoSalvamento,
  salvo,
  limpar,
}: Props) {
  const larguraNota = `${Math.max(
    0,
    Math.min(resultado.nota, 100)
  )}%` as `${number}%`;
  const cenarios = [
    ...(dadosAtuais.condicaoPneu === "Desgastado" ? [{
      titulo: "Pneus em bom estado",
      dados: { ...dadosAtuais, condicaoPneu: "Bom" as const },
    }] : []),
    ...(dadosAtuais.mesesUltimaRevisao >= 12 ? [{
      titulo: "Revisão em dia",
      dados: { ...dadosAtuais, mesesUltimaRevisao: 0 },
    }] : []),
  ].map((cenario) => ({ ...cenario, nota: analisarVeiculo(dadosFipe, cenario.dados).nota }));

  return (
    <View style={styles.resultado}>
      <View style={styles.sectionKicker}><Text style={styles.sectionKickerText}>03  /  SEU RESULTADO</Text></View>
      <Text style={styles.resultadoPequeno}>
        RESULTADO DA ANÁLISE
      </Text>

      <Text style={styles.resultadoTitulo}>
        {dadosFipe.brand}
      </Text>

      <Text style={styles.nomeCarro}>
        {dadosFipe.model}
      </Text>

      <Text style={styles.infoCarro}>
        {dadosFipe.modelYear} • {dadosFipe.fuel}
      </Text>

      <View style={styles.valorFipe}>
        <Text style={styles.valorFipeLabel}>
          VALOR FIPE
        </Text>

        <Text style={styles.valorFipeNumero}>
          {dadosFipe.price}
        </Text>
      </View>

      <View style={styles.notaArea}>
        <View style={styles.notaTopo}>
          <View>
            <Text style={styles.notaLabel}>
              NOTA GERAL
            </Text>

            <Text style={styles.nota}>
              {resultado.nota}
              <Text style={styles.notaDe}>
                /100
              </Text>
            </Text>
          </View>

          <View style={styles.classificacaoBox}>
            <Text style={styles.classificacao}>
              {resultado.classificacao}
            </Text>
          </View>
        </View>

        <View style={styles.barraFundo}>
          <View
            style={[
              styles.barra,
              {
                width: larguraNota,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.metricas}>
        <View
          style={[
            styles.metrica,
            styles.metricaEsquerda,
          ]}
        >
          <Text style={styles.metricaLabel}>
            Consumo estimado
          </Text>

          <Text style={styles.metricaValor}>
            {resultado.consumo} km/L
          </Text>
        </View>

        <View style={styles.metrica}>
          <Text style={styles.metricaLabel}>
            Saúde estimada
          </Text>

          <Text style={styles.metricaValor}>
            {resultado.saude}%
          </Text>
        </View>

        <View
          style={[
            styles.metrica,
            styles.metricaEsquerda,
            styles.metricaBaixo,
          ]}
        >
          <Text style={styles.metricaLabel}>
            Desempenho
          </Text>

          <Text style={styles.metricaValor}>
            {resultado.desempenho}
          </Text>
        </View>

        <View
          style={[
            styles.metrica,
            styles.metricaBaixo,
          ]}
        >
          <Text style={styles.metricaLabel}>
            Categoria
          </Text>

          <Text style={styles.metricaValor}>
            {resultado.categoria}
          </Text>
        </View>
      </View>

      {resultado.ajustes.length > 0 && (
        <View style={styles.detalhesNota}>
          <Text style={styles.detalhesTitulo}>
            Como a nota foi calculada
          </Text>
          <Text style={styles.simulacaoDetalhe}>A nota começa em 100. Os fatores abaixo reduzem esse valor conforme os dados informados.</Text>

          {resultado.ajustes.map(
            (ajuste, index) => (
              <View
                key={`${ajuste.descricao}-${index}`}
                style={styles.detalheLinha}
              >
                <Text style={styles.detalheTexto}>
                  {ajuste.descricao}
                </Text>

                <Text style={styles.detalhePontos}>
                  {ajuste.pontos > 0
                    ? `+${ajuste.pontos}`
                    : ajuste.pontos}
                </Text>
              </View>
            )
          )}
        </View>
      )}

      {cenarios.length > 0 && (
        <View style={styles.simulacaoBox}>
          <Text style={styles.detalhesTitulo}>E se você mudasse algo?</Text>
          {cenarios.map((cenario) => (
            <View key={cenario.titulo} style={styles.detalheLinha}>
              <Text style={styles.detalheTexto}>{cenario.titulo}</Text>
              <Text style={styles.detalhePontos}>{cenario.nota}/100</Text>
            </View>
          ))}
          <Text style={styles.textoAjuda}>Simulação isolada: cada cenário altera apenas o item indicado.</Text>
        </View>
      )}

      {resultado.alertas.length > 0 && (
        <View style={styles.alertas}>
          <Text style={styles.alertasTitulo}>
            Pontos de atenção
          </Text>

          {resultado.alertas.map(
            (alerta, index) => (
              <View
                key={`${alerta}-${index}`}
                style={styles.alertaLinha}
              >
                <View style={styles.alertaBolinha} />

                <Text style={styles.alertaTexto}>
                  {alerta}
                </Text>
              </View>
            )
          )}
        </View>
      )}

      <View style={styles.sustentabilidade}>
        <Text style={styles.sustentabilidadeTitulo}>
          Uso consciente
        </Text>

        <Text style={styles.sustentabilidadeTexto}>
          Manter os pneus calibrados e realizar
          revisões periódicas pode ajudar a evitar
          consumo desnecessário de combustível.
        </Text>
      </View>

      <Text style={styles.aviso}>
        O valor FIPE é consultado em uma base
        externa. Consumo, saúde, desempenho e nota
        são estimativas educacionais do TorqueLab e
        não substituem uma avaliação mecânica.
      </Text>

      <TouchableOpacity style={[styles.botao, salvo && styles.desativado]} activeOpacity={0.8} onPress={salvar} disabled={salvo} accessibilityRole="button">
        <Text style={styles.botaoTexto}>{salvo ? "Análise salva" : "Salvar análise"}</Text>
        <Text style={styles.botaoSeta}>{salvo ? "✓" : "+"}</Text>
      </TouchableOpacity>
      {!!avisoSalvamento && <Text style={styles.textoAjuda}>{avisoSalvamento}</Text>}

      <TouchableOpacity
        style={styles.botaoSecundario}
        activeOpacity={0.8}
        onPress={limpar}
      >
        <Text style={styles.botaoSecundarioTexto}>
          Fazer nova análise
        </Text>
      </TouchableOpacity>
    </View>
  );
}
