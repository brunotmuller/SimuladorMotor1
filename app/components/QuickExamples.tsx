import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";
import { EXEMPLOS, ExemploVeiculo } from "./CarGuide";

type Props = {
  exemploAtivoId?: string | null;
  onSimularExemplo: (exemplo: ExemploVeiculo) => void;
};

const webAttr = (attrs: Record<string, string>) =>
  Platform.OS === "web" ? (attrs as object) : {};

export default function QuickExamples({
  exemploAtivoId,
  onSimularExemplo,
}: Props) {
  return (
    <View nativeID="examples-section" style={styles.examplesWrap}>
      <View style={styles.sectionHeaderWrap}>
        <Text style={styles.sectionEyebrow}>EXEMPLOS PRONTOS</Text>
        <Text style={styles.sectionHeading}>Teste em 1 clique</Text>
        <Text style={styles.sectionLead}>
          Escolha um cenário ilustrativo para ver o diagnóstico completo na hora
          — ou preencha seu próprio carro logo abaixo.
        </Text>
      </View>

      <View {...webAttr({ "data-torque-examples-grid": "1" })}>
        {EXEMPLOS.map((item) => {
          const ativo = exemploAtivoId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => onSimularExemplo(item)}
              style={[styles.exampleCard, ativo && styles.exampleCardActive]}
              accessibilityRole="button"
              accessibilityLabel={`Simular exemplo ${item.marca} ${item.modelo}`}
              {...webAttr({ "data-torque-example-card": "1" })}
            >
              <View>
                <View style={styles.exampleBadgeRow}>
                  <View style={styles.exampleBadge}>
                    <Text style={styles.exampleBadgeText}>
                      {item.badge.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.exampleNotePill}>
                    {item.ano} · {item.combustivel}
                  </Text>
                </View>

                <Text style={styles.exampleTitle}>
                  {item.marca} {item.modelo}
                </Text>
                <Text style={styles.exampleSubtitle}>{item.descricao}</Text>
              </View>

              <View>
                <Text style={styles.exampleSpecs}>
                  {Number(item.km).toLocaleString("pt-BR")} km ·{" "}
                  {Number(item.peso).toLocaleString("pt-BR")} kg ·{" "}
                  {item.calibragem} PSI · Rev. {item.mesesUltimaRevisao}m
                </Text>
                <Text style={styles.exampleCta}>
                  {ativo ? "Exemplo ativo ✓" : "Simular este exemplo →"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
