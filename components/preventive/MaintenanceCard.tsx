import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaintenanceEvaluation } from "@/lib/preventive/types";
import { formatDateBR, formatKm } from "@/lib/preventive/engine";
import { STATUS_THEME, pStyles, webAttr } from "./styles";

type Props = {
  evaluation: MaintenanceEvaluation;
  onOpenDetails: (evaluation: MaintenanceEvaluation) => void;
  onMarkDone: (evaluation: MaintenanceEvaluation) => void;
};

export default function MaintenanceCard({
  evaluation,
  onOpenDetails,
  onMarkDone,
}: Props) {
  const theme = STATUS_THEME[evaluation.status];
  const progressAnim = useRef(new Animated.Value(evaluation.progressPercent)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: evaluation.progressPercent,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [evaluation.progressPercent, progressAnim]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const intervalCaption = evaluation.isCustomInterval
    ? "Intervalo ajustado pelo seu manual"
    : `${evaluation.definition.intervalSummary} · ref. demonstrativa`;

  return (
    <View
      style={[
        pStyles.maintCard,
        {
          borderColor:
            evaluation.status === "green"
              ? "rgba(255,255,255,0.09)"
              : theme.border,
        },
      ]}
      {...webAttr({ "data-torque-card": "1" })}
    >
      {/* Cabeçalho clicável abre Modal Sem Mecaniquês */}
      <TouchableOpacity
        onPress={() => onOpenDetails(evaluation)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Abrir detalhes de ${evaluation.definition.name}`}
      >
        <View style={pStyles.maintCardTop}>
          <View style={pStyles.maintTitleRow}>
            <View
              style={[
                pStyles.maintIconBox,
                {
                  backgroundColor: theme.softBg,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name={evaluation.definition.iconName}
                size={20}
                color={theme.color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pStyles.maintTitle}>
                {evaluation.definition.name}
              </Text>
              <Text style={pStyles.maintIntervalSub}>{intervalCaption}</Text>
            </View>
          </View>

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
              {theme.label}
            </Text>
          </View>
        </View>

        {/* Barra de progresso + restante */}
        <View style={[pStyles.progressWrap, { marginTop: 14 }]}>
          <View style={pStyles.progressLabelRow}>
            <Text
              style={[
                pStyles.progressRemaining,
                { color: evaluation.status === "green" ? "#e8dde1" : theme.text },
              ]}
            >
              {evaluation.remainingLabel}
            </Text>
            <Text style={pStyles.progressPct}>
              {evaluation.progressPercent}% do ciclo
            </Text>
          </View>
          <View style={[pStyles.progressTrack, { backgroundColor: theme.track }]}>
            <Animated.View
              style={[
                pStyles.progressFill,
                {
                  backgroundColor: theme.color,
                  width: widthInterpolated,
                },
              ]}
            />
          </View>
          {evaluation.overdueReason && (
            <Text style={{ color: "#fca5a5", fontSize: 11, fontWeight: "700" }}>
              {evaluation.overdueReason}
            </Text>
          )}
        </View>

        {/* Metadados obrigatórios: data última, km última, próxima previsão */}
        <View style={[pStyles.maintFactsGrid, { marginTop: 14 }]}>
          <View style={pStyles.maintFact}>
            <Text style={pStyles.maintFactLabel}>ÚLTIMA DATA</Text>
            <Text style={pStyles.maintFactValue}>
              {formatDateBR(evaluation.lastDoneDate)}
            </Text>
          </View>
          <View style={pStyles.maintFact}>
            <Text style={pStyles.maintFactLabel}>ÚLTIMA KM</Text>
            <Text style={pStyles.maintFactValue}>
              {formatKm(evaluation.lastDoneKm)}
            </Text>
          </View>
          <View style={[pStyles.maintFact, { minWidth: 160 }]}>
            <Text style={pStyles.maintFactLabel}>PRÓXIMA PREVISÃO</Text>
            <Text style={pStyles.maintFactValue}>
              {evaluation.nextForecastLabel}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Ações obrigatórias */}
      <View style={pStyles.maintActionsRow}>
        <TouchableOpacity
          onPress={() => onOpenDetails(evaluation)}
          style={pStyles.maintDetailBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Ionicons name="book-outline" size={15} color="#efe5e8" />
          <Text style={pStyles.maintDetailBtnText}>Ver detalhes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onMarkDone(evaluation)}
          style={pStyles.maintDoneBtn}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-done" size={15} color="#86efac" />
          <Text style={pStyles.maintDoneBtnText}>Já fiz essa troca</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
