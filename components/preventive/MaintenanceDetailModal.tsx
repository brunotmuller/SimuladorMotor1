import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CustomIntervalOverride,
  MaintenanceEvaluation,
} from "@/lib/preventive/types";
import { formatDateBR, formatKm } from "@/lib/preventive/engine";
import { STATUS_THEME, pStyles, webAttr } from "./styles";

type Props = {
  evaluation: MaintenanceEvaluation | null;
  onClose: () => void;
  onMarkDone: (evaluation: MaintenanceEvaluation) => void;
  onSaveInterval: (
    itemId: MaintenanceEvaluation["definition"]["id"],
    override: CustomIntervalOverride | null
  ) => void;
};

export default function MaintenanceDetailModal({
  evaluation,
  onClose,
  onMarkDone,
  onSaveInterval,
}: Props) {
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalKmText, setIntervalKmText] = useState("");
  const [intervalDaysText, setIntervalDaysText] = useState("");
  const [intervalMonthsText, setIntervalMonthsText] = useState("");
  const [intervalError, setIntervalError] = useState("");

  useEffect(() => {
    if (evaluation) {
      setEditingInterval(false);
      setIntervalError("");
      setIntervalKmText(
        evaluation.effectiveIntervalKm ? String(evaluation.effectiveIntervalKm) : ""
      );
      setIntervalDaysText(
        evaluation.effectiveIntervalDays
          ? String(evaluation.effectiveIntervalDays)
          : ""
      );
      setIntervalMonthsText(
        evaluation.effectiveIntervalMonths
          ? String(evaluation.effectiveIntervalMonths)
          : ""
      );
    }
  }, [evaluation]);

  if (!evaluation) return null;

  const theme = STATUS_THEME[evaluation.status];
  const { definition } = evaluation;

  function handleSaveCustomInterval() {
    if (!evaluation) return;
    const km = intervalKmText.trim() ? Number(intervalKmText) : null;
    const days = intervalDaysText.trim() ? Number(intervalDaysText) : null;
    const months = intervalMonthsText.trim() ? Number(intervalMonthsText) : null;

    if (km !== null && (!Number.isFinite(km) || km < 500 || km > 200000)) {
      setIntervalError("Informe um intervalo em KM entre 500 e 200.000.");
      return;
    }
    if (days !== null && (!Number.isFinite(days) || days < 1 || days > 365)) {
      setIntervalError("Informe um intervalo em dias entre 1 e 365.");
      return;
    }
    if (months !== null && (!Number.isFinite(months) || months < 1 || months > 60)) {
      setIntervalError("Informe um intervalo em meses entre 1 e 60.");
      return;
    }
    if (km === null && days === null && months === null) {
      setIntervalError("Mantenha ao menos um limite (KM, dias ou meses).");
      return;
    }

    onSaveInterval(evaluation.definition.id, {
      intervalKm: km,
      intervalDays: days,
      intervalMonths: months,
    });
    setEditingInterval(false);
    setIntervalError("");
  }

  return (
    <Modal
      visible={!!evaluation}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={pStyles.modalBackdrop}>
        <View style={[pStyles.modalSheet, { maxWidth: 640 }]}>
          <View style={pStyles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={pStyles.eyebrowRow}>
                <Text style={pStyles.sectionEyebrow}>MODO SEM MECANIQUÊS</Text>
                <View
                  style={[
                    pStyles.statusBadge,
                    {
                      backgroundColor: theme.softBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name={theme.icon} size={13} color={theme.color} />
                  <Text style={[pStyles.statusBadgeText, { color: theme.text }]}>
                    {evaluation.statusLabel}
                  </Text>
                </View>
              </View>
              <Text style={pStyles.modalTitle}>{definition.name}</Text>
              <Text style={pStyles.modalSubtitle}>
                {evaluation.remainingLabel} · Próxima previsão:{" "}
                {evaluation.nextForecastLabel}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={pStyles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes da manutenção"
            >
              <Ionicons name="close" size={18} color="#d9cdd2" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 470 }}
          >
            {/* Status snapshot */}
            <View
              style={[
                pStyles.maintFactsGrid,
                { marginBottom: 14, borderColor: theme.border },
              ]}
            >
              <View style={pStyles.maintFact}>
                <Text style={pStyles.maintFactLabel}>ÚLTIMA VEZ</Text>
                <Text style={pStyles.maintFactValue}>
                  {formatDateBR(evaluation.lastDoneDate)} ·{" "}
                  {formatKm(evaluation.lastDoneKm)}
                </Text>
              </View>
              <View style={pStyles.maintFact}>
                <Text style={pStyles.maintFactLabel}>PRÓXIMA PREVISÃO</Text>
                <Text style={pStyles.maintFactValue}>
                  {evaluation.nextForecastLabel}
                </Text>
              </View>
              <View style={pStyles.maintFact}>
                <Text style={pStyles.maintFactLabel}>INTERVALO EM USO</Text>
                <Text style={pStyles.maintFactValue}>
                  {evaluation.isCustomInterval
                    ? "Personalizado (seu manual)"
                    : `${definition.intervalSummary} (ref. demonstrativa)`}
                </Text>
              </View>
            </View>

            {/* 1. O que é e para que serve */}
            <View style={pStyles.guideBlock}>
              <View style={pStyles.guideBlockHeader}>
                <Ionicons name="help-circle-outline" size={19} color="#ff6b7f" />
                <Text style={pStyles.guideBlockTitle}>
                  O que é e para que serve?
                </Text>
              </View>
              <Text style={pStyles.guideBody}>{definition.guide.whatIsIt}</Text>
            </View>

            {/* 2. Onde resolvo isso */}
            <View style={pStyles.guideBlock}>
              <View style={pStyles.guideBlockHeader}>
                <Ionicons name="location-outline" size={19} color="#60a5fa" />
                <Text style={pStyles.guideBlockTitle}>Onde resolvo isso?</Text>
              </View>
              {definition.guide.whereToResolve.map((place) => (
                <View key={place} style={pStyles.bulletRow}>
                  <Text style={[pStyles.bulletDot, { color: "#60a5fa" }]}>•</Text>
                  <Text style={[pStyles.guideBody, { flex: 1 }]}>{place}</Text>
                </View>
              ))}
            </View>

            {/* 3. Como evitar ser enganado */}
            <View
              style={[
                pStyles.guideBlock,
                {
                  borderColor: "rgba(34, 197, 94, 0.28)",
                  backgroundColor: "rgba(34, 197, 94, 0.06)",
                },
              ]}
            >
              <View style={pStyles.guideBlockHeader}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color="#4ade80"
                />
                <Text style={pStyles.guideBlockTitle}>
                  Como evitar ser enganado?
                </Text>
              </View>
              {definition.guide.avoidScams.map((tip) => (
                <View key={tip} style={pStyles.bulletRow}>
                  <Text style={[pStyles.bulletDot, { color: "#4ade80" }]}>✓</Text>
                  <Text style={[pStyles.guideBody, { flex: 1 }]}>{tip}</Text>
                </View>
              ))}
            </View>

            {/* 4. Quando devo me preocupar */}
            <View
              style={[
                pStyles.guideBlock,
                {
                  borderColor: "rgba(245, 158, 11, 0.3)",
                  backgroundColor: "rgba(245, 158, 11, 0.06)",
                },
              ]}
            >
              <View style={pStyles.guideBlockHeader}>
                <Ionicons name="warning-outline" size={19} color="#fbbf24" />
                <Text style={pStyles.guideBlockTitle}>
                  Quando devo me preocupar?
                </Text>
              </View>
              {definition.guide.whenToWorry.map((sign) => (
                <View key={sign} style={pStyles.bulletRow}>
                  <Text style={[pStyles.bulletDot, { color: "#fbbf24" }]}>•</Text>
                  <Text style={[pStyles.guideBody, { flex: 1 }]}>{sign}</Text>
                </View>
              ))}
            </View>

            {/* Ajuste de intervalo conforme o manual */}
            <View style={pStyles.guideBlock}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.guideBlockTitle}>
                    Ajustar intervalo conforme o manual
                  </Text>
                  <Text style={{ color: "#9c8f95", fontSize: 12, marginTop: 2 }}>
                    Os prazos padrão são referências demonstrativas. Adapte para
                    o que está no manual do seu carro.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditingInterval((v) => !v)}
                  style={pStyles.secondaryBtn}
                  accessibilityRole="button"
                >
                  <Text style={pStyles.secondaryBtnText}>
                    {editingInterval ? "Fechar" : "Ajustar"}
                  </Text>
                </TouchableOpacity>
              </View>

              {editingInterval && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {definition.defaultIntervalKm !== null && (
                      <View style={{ flex: 1, minWidth: 130 }}>
                        <Text style={pStyles.fieldLabel}>Intervalo (KM)</Text>
                        <TextInput
                          style={pStyles.input}
                          value={intervalKmText}
                          onChangeText={(t) =>
                            setIntervalKmText(t.replace(/[^\d]/g, ""))
                          }
                          keyboardType="numeric"
                          placeholder="10000"
                          placeholderTextColor="#665d62"
                        />
                      </View>
                    )}

                    {definition.defaultIntervalDays !== null && (
                      <View style={{ flex: 1, minWidth: 130 }}>
                        <Text style={pStyles.fieldLabel}>Intervalo (dias)</Text>
                        <TextInput
                          style={pStyles.input}
                          value={intervalDaysText}
                          onChangeText={(t) =>
                            setIntervalDaysText(t.replace(/[^\d]/g, ""))
                          }
                          keyboardType="numeric"
                          placeholder="15"
                          placeholderTextColor="#665d62"
                        />
                      </View>
                    )}

                    {definition.defaultIntervalMonths !== null && (
                      <View style={{ flex: 1, minWidth: 130 }}>
                        <Text style={pStyles.fieldLabel}>Intervalo (meses)</Text>
                        <TextInput
                          style={pStyles.input}
                          value={intervalMonthsText}
                          onChangeText={(t) =>
                            setIntervalMonthsText(t.replace(/[^\d]/g, ""))
                          }
                          keyboardType="numeric"
                          placeholder="12"
                          placeholderTextColor="#665d62"
                        />
                      </View>
                    )}
                  </View>

                  {intervalError !== "" && (
                    <View style={pStyles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color="#fca5a5" />
                      <Text style={pStyles.errorText}>{intervalError}</Text>
                    </View>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <TouchableOpacity
                      onPress={handleSaveCustomInterval}
                      style={[pStyles.primaryCtaBtn, { flex: 1 }]}
                      accessibilityRole="button"
                    >
                      <Text style={pStyles.primaryCtaText}>Salvar intervalo</Text>
                    </TouchableOpacity>
                    {evaluation.isCustomInterval && (
                      <TouchableOpacity
                        onPress={() => {
                          onSaveInterval(definition.id, null);
                          setEditingInterval(false);
                        }}
                        style={pStyles.secondaryBtn}
                        accessibilityRole="button"
                      >
                        <Text style={pStyles.secondaryBtnText}>
                          Restaurar padrão
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              onPress={onClose}
              style={[pStyles.secondaryBtn, { flex: 1 }]}
              accessibilityRole="button"
            >
              <Text style={pStyles.secondaryBtnText}>Fechar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onClose();
                onMarkDone(evaluation);
              }}
              style={[
                pStyles.primaryCtaBtn,
                { flex: 1.5, backgroundColor: "#16a34a" },
              ]}
              activeOpacity={0.85}
              accessibilityRole="button"
              {...webAttr({ "data-torque-cta": "1" })}
            >
              <Ionicons name="checkmark-done" size={18} color="#fff" />
              <Text style={pStyles.primaryCtaText}>Já fiz essa troca</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
