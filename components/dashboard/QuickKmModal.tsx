import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pStyles, webAttr } from "@/components/preventive/styles";
import { DashboardClientError } from "@/lib/dashboard/dashboardClient";
import type { UserVehicle } from "@/lib/dashboard/types";
import { formatKm } from "@/lib/preventive/engine";

export type QuickKmModalProps = {
  visible: boolean;
  vehicle: UserVehicle | null;
  onClose: () => void;
  onSubmit: (
    vehicleId: string,
    newKm: number,
    confirmKmRegression: boolean
  ) => Promise<void>;
};

const QUICK_DELTAS = [100, 500, 1000, 2500];
const MAX_KM = 2_000_000;

function parseKmInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(/\s+/g, "");
  if (!/^-?\d+$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

export default function QuickKmModal({
  visible,
  vehicle,
  onClose,
  onSubmit,
}: QuickKmModalProps) {
  const [kmInput, setKmInput] = useState("");
  const [confirmRegression, setConfirmRegression] = useState(false);
  const [needsServerRegressionConfirm, setNeedsServerRegressionConfirm] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && vehicle) {
      setKmInput(String(vehicle.currentKm));
      setConfirmRegression(false);
      setNeedsServerRegressionConfirm(false);
      setError(null);
      setSubmitting(false);
    }
  }, [visible, vehicle]);

  if (!vehicle) {
    return null;
  }

  const parsedKm = parseKmInput(kmInput);
  const isRegression =
    (parsedKm !== null && parsedKm >= 0 && parsedKm < vehicle.currentKm) ||
    needsServerRegressionConfirm;

  const vehicleLabel = vehicle.nickname
    ? `${vehicle.nickname} · ${vehicle.brand} ${vehicle.model} ${vehicle.year}`
    : `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;

  function handleQuickAdd(delta: number) {
    if (!vehicle) return;
    const base = parsedKm !== null && parsedKm >= 0 ? parsedKm : vehicle.currentKm;
    const next = Math.min(MAX_KM, Math.max(vehicle.currentKm, base) + delta);
    setKmInput(String(next));
    setConfirmRegression(false);
    setNeedsServerRegressionConfirm(false);
    setError(null);
  }

  async function handleSave() {
    if (!vehicle || submitting) return;

    const km = parseKmInput(kmInput);
    if (km === null || km < 0 || km > MAX_KM) {
      setError("Informe uma quilometragem inteira entre 0 e 2.000.000 km.");
      return;
    }

    const reducingKm = km < vehicle.currentKm;
    if ((reducingKm || needsServerRegressionConfirm) && !confirmRegression) {
      setError(
        "Confirme a correção de digitação abaixo antes de reduzir a quilometragem."
      );
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await onSubmit(vehicle.id, km, reducingKm ? confirmRegression : false);
      onClose();
    } catch (err) {
      if (err instanceof DashboardClientError) {
        if (err.requiresKmRegressionConfirmation) {
          setNeedsServerRegressionConfirm(true);
        }
        setError(err.fields?.currentKm ?? err.message);
      } else {
        setError("Não foi possível atualizar a quilometragem. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={pStyles.modalBackdrop}>
        <View style={[pStyles.modalSheet, { maxWidth: 470 }]}>
          <View style={pStyles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={pStyles.sectionEyebrow}>HODÔMETRO DO VEÍCULO</Text>
              <Text style={pStyles.modalTitle}>Atualizar quilometragem</Text>
              <Text style={pStyles.modalSubtitle}>{vehicleLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={pStyles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar modal de quilometragem"
            >
              <Ionicons name="close" size={18} color="#d9cdd2" />
            </TouchableOpacity>
          </View>

          <View style={kmStyles.currentBox}>
            <Text style={kmStyles.currentLabel}>Quilometragem atual</Text>
            <Text style={kmStyles.currentValue}>
              {formatKm(vehicle.currentKm)}
            </Text>
          </View>

          <Text style={pStyles.fieldLabel}>Nova quilometragem (km)</Text>
          <TextInput
            style={[pStyles.input, kmStyles.kmInput]}
            value={kmInput}
            onChangeText={(text) => {
              setKmInput(text.replace(/[^\d-]/g, ""));
              setConfirmRegression(false);
              setNeedsServerRegressionConfirm(false);
              setError(null);
            }}
            keyboardType="numeric"
            placeholder={String(vehicle.currentKm)}
            placeholderTextColor="#665d62"
            editable={!submitting}
            accessibilityLabel="Nova quilometragem em quilômetros"
          />

          <View style={kmStyles.deltasRow}>
            {QUICK_DELTAS.map((delta) => (
              <TouchableOpacity
                key={delta}
                onPress={() => handleQuickAdd(delta)}
                disabled={submitting}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={kmStyles.deltaPill}
              >
                <Text style={kmStyles.deltaText}>
                  +{delta.toLocaleString("pt-BR")} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isRegression && (
            <View style={kmStyles.regressionBox} accessibilityRole="alert">
              <View style={kmStyles.regressionHeader}>
                <Ionicons name="warning" size={18} color="#fcd34d" />
                <Text style={kmStyles.regressionTitle}>
                  Quilometragem menor que a atual
                </Text>
              </View>
              <Text style={kmStyles.regressionDesc}>
                O valor informado ({parsedKm !== null ? formatKm(parsedKm) : kmInput})
                é menor que o hodômetro atual ({formatKm(vehicle.currentKm)}).
                Marque a confirmação abaixo apenas se estiver corrigindo um erro
                de digitação.
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setConfirmRegression((prev) => !prev);
                  setError(null);
                }}
                disabled={submitting}
                activeOpacity={0.85}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmRegression }}
                style={kmStyles.checkboxRow}
              >
                <View
                  style={[
                    kmStyles.checkboxBox,
                    confirmRegression && kmStyles.checkboxBoxChecked,
                  ]}
                >
                  {confirmRegression && (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  )}
                </View>
                <Text style={kmStyles.checkboxLabel}>
                  Confirmar correção de hodômetro
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={pStyles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color="#fca5a5" />
              <Text style={pStyles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={kmStyles.helperText}>
            As manutenções necessárias, urgências e custos estimados do
            Dashboard são recalculados imediatamente ao salvar.
          </Text>

          <View style={kmStyles.actionsRow}>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={[pStyles.secondaryBtn, { flex: 1 }]}
              accessibilityRole="button"
            >
              <Text style={pStyles.secondaryBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={submitting}
              style={[
                pStyles.primaryCtaBtn,
                { flex: 1.5 },
                submitting && { opacity: 0.7 },
              ]}
              activeOpacity={0.85}
              accessibilityRole="button"
              {...webAttr({ "data-torque-cta": "1" })}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#ffffff"
                />
              )}
              <Text style={pStyles.primaryCtaText}>
                {submitting
                  ? "Salvando..."
                  : isRegression
                    ? "Confirmar correção de hodômetro"
                    : "Salvar KM"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const kmStyles = StyleSheet.create({
  currentBox: {
    backgroundColor: "#181622",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentLabel: {
    color: "#a99ca2",
    fontSize: 12,
    fontWeight: "700",
  },
  currentValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  kmInput: {
    fontSize: 20,
    fontWeight: "800",
  },
  deltasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  deltaPill: {
    backgroundColor: "#1c1926",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  deltaText: {
    color: "#dfd4d8",
    fontSize: 12,
    fontWeight: "700",
  },
  regressionBox: {
    marginTop: 14,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.42)",
    borderRadius: 14,
    padding: 13,
    gap: 8,
  },
  regressionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  regressionTitle: {
    color: "#fde68a",
    fontSize: 13,
    fontWeight: "800",
  },
  regressionDesc: {
    color: "#fef3c7",
    fontSize: 12,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(252, 211, 77, 0.7)",
    backgroundColor: "rgba(9, 9, 12, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: {
    backgroundColor: "#e43b55",
    borderColor: "#e43b55",
  },
  checkboxLabel: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  helperText: {
    color: "#998c92",
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
});
