import React, { useState } from "react";
import { Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AnaliseSalva } from "../(tabs)/types/savedAnalysis";
import { styles } from "../(tabs)/styles/styles";

type Props = {
  analises: AnaliseSalva[];
  abrir: (analise: AnaliseSalva) => void;
  excluir: (id: string) => void;
  renomear: (id: string, nome: string) => void;
};

function nomePadrao(item: AnaliseSalva) {
  return `${item.fipe.brand} ${item.fipe.model} · ${item.fipe.modelYear}`;
}

export default function SavedAnalyses({
  analises,
  abrir,
  excluir,
  renomear,
}: Props) {
  const [comparacao, setComparacao] = useState<string[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");

  const escolhidas = comparacao
    .map((id) => analises.find((item) => item.id === id))
    .filter((item): item is AnaliseSalva => !!item);

  function alternar(id: string) {
    setComparacao((atual) =>
      atual.includes(id)
        ? atual.filter((item) => item !== id)
        : [...atual.slice(-1), id]
    );
  }

  function iniciarRename(item: AnaliseSalva) {
    setEditandoId(item.id);
    setNomeEdit(item.nome ?? nomePadrao(item));
  }

  function salvarRename(id: string) {
    const limpo = nomeEdit.trim();
    if (limpo) renomear(id, limpo);
    setEditandoId(null);
  }

  return (
    <View
      nativeID="garage-section"
      style={styles.card}
      {...(Platform.OS === "web" ? ({ "data-torque-card": "1" } as object) : {})}
    >
      <View style={styles.sectionKicker}>
        <Text style={styles.sectionKickerText}>02 / SUA GARAGEM</Text>
      </View>
      <Text style={styles.tituloSecao}>Análises salvas</Text>
      <Text style={styles.descricaoSecao}>
        Abra, renomeie ou escolha duas análises para comparar. Os dados ficam
        salvos neste dispositivo.
      </Text>

      {analises.length === 0 ? (
        <Text style={styles.textoAjuda}>
          Faça uma análise e use “Salvar análise” para começar sua garagem.
        </Text>
      ) : (
        analises.map((item) => (
          <View key={item.id} style={styles.salvoCard}>
            {editandoId === item.id ? (
              <>
                <TextInput
                  style={styles.input}
                  value={nomeEdit}
                  onChangeText={setNomeEdit}
                  placeholder="Nome da análise"
                  placeholderTextColor="#666"
                  maxLength={48}
                />
                <View style={styles.salvoAcoes}>
                  <TouchableOpacity
                    style={styles.acaoPequena}
                    onPress={() => salvarRename(item.id)}
                  >
                    <Text style={styles.acaoPequenaTexto}>Salvar nome</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acaoPequena}
                    onPress={() => setEditandoId(null)}
                  >
                    <Text style={styles.acaoPequenaTexto}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.salvoNome}>
                  {item.nome?.trim() || nomePadrao(item)}
                </Text>
                <Text style={styles.salvoMeta}>
                  {item.fipe.price} · Nota {item.resultado.nota}/100 ·{" "}
                  {item.resultado.consumo} km/L
                </Text>
                <Text style={styles.salvoMeta}>
                  Salva em {new Date(item.salvaEm).toLocaleDateString("pt-BR")}
                </Text>
                <View style={styles.salvoAcoes}>
                  <TouchableOpacity
                    style={styles.acaoPequena}
                    onPress={() => abrir(item)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.acaoPequenaTexto}>Abrir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acaoPequena}
                    onPress={() => iniciarRename(item)}
                  >
                    <Text style={styles.acaoPequenaTexto}>Renomear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.acaoPequena,
                      comparacao.includes(item.id) && styles.acaoSelecionada,
                    ]}
                    onPress={() => alternar(item.id)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.acaoPequenaTexto}>
                      {comparacao.includes(item.id)
                        ? "Selecionado"
                        : "Comparar"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acaoPequena}
                    onPress={() => {
                      excluir(item.id);
                      setComparacao((atual) =>
                        atual.filter((id) => id !== item.id)
                      );
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.acaoExcluirTexto}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ))
      )}

      {escolhidas.length === 1 && (
        <Text style={styles.textoAjuda}>
          Selecione mais uma análise para comparar lado a lado.
        </Text>
      )}

      {escolhidas.length === 2 && (
        <View style={styles.comparacaoBox}>
          <Text style={styles.detalhesTitulo}>Comparação lado a lado</Text>
          <View style={styles.comparacaoLinha}>
            <Text style={styles.comparacaoRotulo}>Veículo</Text>
            {escolhidas.map((item) => (
              <Text key={item.id} style={styles.comparacaoValor}>
                {item.nome?.trim() || nomePadrao(item)}
              </Text>
            ))}
          </View>
          {(
            [
              ["Valor FIPE", (item: AnaliseSalva) => item.fipe.price],
              ["Nota", (item: AnaliseSalva) => `${item.resultado.nota}/100`],
              [
                "Consumo estimado",
                (item: AnaliseSalva) => `${item.resultado.consumo} km/L`,
              ],
              [
                "Condição estimada",
                (item: AnaliseSalva) => `${item.resultado.saude}%`,
              ],
            ] as const
          ).map(([label, valor]) => (
            <View key={label} style={styles.comparacaoLinha}>
              <Text style={styles.comparacaoRotulo}>{label}</Text>
              {escolhidas.map((item) => (
                <Text key={item.id} style={styles.comparacaoValor}>
                  {valor(item)}
                </Text>
              ))}
            </View>
          ))}
          <Text style={styles.textoAjuda}>
            A nota e o consumo são estimativas educativas; o valor FIPE é apenas
            uma referência de mercado.
          </Text>
        </View>
      )}
    </View>
  );
}
