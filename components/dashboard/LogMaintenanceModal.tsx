import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pStyles, webAttr } from "@/components/preventive/styles";
import { DashboardClientError } from "@/lib/dashboard/dashboardClient";
import type {
  CreateMaintenanceLogPayload,
  DashboardMaintenanceItem,
  UserVehicle,
} from "@/lib/dashboard/types";
import { formatDateBR, formatKm, toIsoDate } from "@/lib/preventive/engine";

export type LogMaintenanceModalProps = {
  visible: boolean;
  vehicle: UserVehicle | null;
  item: DashboardMaintenanceItem | null;
  onClose: () => void;
  onSubmit: (payload: CreateMaintenanceLogPayload) => Promise<void>;
};

type FieldErrors = {
  performedAt?: string;
  performedKm?: string;
  paidCost?: string;
  notes?: string;
};

const MAX_KM = 2_000_000;
const MAX_COST = 100_000;
const MAX_NOTES_LENGTH = 200;

function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseDateBrToIso(raw: string): string | null {
  const trimmed = raw.trim();
  let year: number;
  let month: number;
  let day: number;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (brMatch) {
    day = Number(brMatch[1]);
    month = Number(brMatch[2]);
    year = Number(brMatch[3]);
  } else {
    return null;
  }

  if (year < 1950 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function parseCurrencyInput(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let normalized = trimmed.replace(/[R$\s]/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    return "invalid";
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_COST) {
    return "invalid";
  }

  return Math.round(parsed * 100) / 100;
}

export default function LogMaintenanceModal({
  visible,
  vehicle,
  item,
  onClose,
  onSubmit,
}: LogMaintenanceModalProps) {
  const [dateBr, setDateBr] = useState("");
  const [kmText, setKmText] = useState("");
  const [paidCostText, setPaidCostText] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && vehicle && item) {
      setDateBr(formatDateBR(toIsoDate(new Date())));
      setKmText(String(vehicle.currentKm));
      setPaidCostText(item.estimatedCost.toFixed(2).replace(".", ","));
      setNotes("");
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }, [visible, vehicle, item]);

  if (!vehicle || !item) {
    return null;
  }

  function clearField(field: keyof FieldErrors) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formError) {
      setFormError(null);
    }
  }

  async function handleConfirm() {
    if (!vehicle || !item || submitting) return;

    const errors: FieldErrors = {};
    const isoDate = parseDateBrToIso(dateBr);
    if (!isoDate) {
      errors.performedAt = "Informe uma data válida no formato DD/MM/AAAA.";
    }

    const cleanedKm = kmText.trim().replace(/\./g, "");
    const parsedKm = /^-?\d+$/.test(cleanedKm) ? Number(cleanedKm) : NaN;
    if (!Number.isSafeInteger(parsedKm) || parsedKm < 0 || parsedKm > MAX_KM) {
      errors.performedKm = "Informe uma quilometragem entre 0 e 2.000.000 km.";
    }

    const parsedCost = parseCurrencyInput(paidCostText);
    if (parsedCost === "invalid") {
      errors.paidCost = "Informe um valor válido entre R$ 0,00 e R$ 100.000,00.";
    }

    const trimmedNotes = notes.trim();
    if (trimmedNotes.length > MAX_NOTES_LENGTH) {
      errors.notes = `A observação deve ter no máximo ${MAX_NOTES_LENGTH} caracteres.`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revise os campos destacados antes de salvar.");
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      await onSubmit({
        vehicleId: vehicle.id,
        serviceId: item.serviceId,
        performedAt: isoDate!,
        performedKm: parsedKm,
        paidCost: parsedCost === "invalid" ? null : parsedCost,
        notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      });
      onClose();
    } catch (err) {
      if (err instanceof DashboardClientError) {
        if (err.fields) {
          setFieldErrors({
            performedAt: err.fields.performedAt,
            performedKm: err.fields.performedKm,
            paidCost: err.fields.paidCost,
            notes: err.fields.notes,
          });
        }
        setFormError(err.message);
      } else {
        setFormError(
          "Não foi possível registrar a manutenção. Tente novamente."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const intervalLabel = item.intervalMonths
    ? `A cada ${formatKm(item.intervalKm)} ou ${item.intervalMonths} meses`
    : `A cada ${formatKm(item.intervalKm)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={pStyles.modalBackdrop}>
        <View style={[pStyles.modalSheet, { maxWidth: 500 }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={pStyles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.sectionEyebrow}>MARCAR COMO REALIZADA</Text>
                <Text style={pStyles.modalTitle}>{item.name}</Text>
                <Text style={pStyles.modalSubtitle}>
                  {vehicle.brand} {vehicle.model} {vehicle.year} · {intervalLabel}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={pStyles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Fechar registro de manutenção"
              >
                <Ionicons name="close" size={18} color="#d9cdd2" />
              </TouchableOpacity>
            </View>

            <View style={logStyles.summaryStrip}>
              <View style={logStyles.summaryCol}>
                <Text style={logStyles.summaryLabel}>Valor estimado sugerido</Text>
                <Text style={logStyles.summaryValue}>
                  {formatCurrencyBRL(item.estimatedCost)}
                </Text>
              </View>
              <View style={logStyles.summaryCol}>
                <Text style={logStyles.summaryLabel}>Hodômetro atual</Text>
                <Text style={logStyles.summaryValue}>
                  {formatKm(vehicle.currentKm)}
                </Text>
              </View>
            </View>

            <View style={logStyles.row}>
              <View style={logStyles.col}>
                <Text style={pStyles.fieldLabel}>Data realizada (DD/MM/AAAA)</Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.performedAt && logStyles.inputError,
                  ]}
                  value={dateBr}
                  onChangeText={(text) => {
                    setDateBr(text);
                    clearField("performedAt");
                  }}
                  placeholder="25/11/2026"
                  placeholderTextColor="#665d62"
                  editable={!submitting}
                  accessibilityLabel="Data em que a manutenção foi realizada"
                />
                {fieldErrors.performedAt && (
                  <Text style={logStyles.fieldError}>
                    {fieldErrors.performedAt}
                  </Text>
                )}
              </View>

              <View style={logStyles.col}>
                <Text style={pStyles.fieldLabel}>Quilometragem (km)</Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.performedKm && logStyles.inputError,
                  ]}
                  value={kmText}
                  onChangeText={(text) => {
                    setKmText(text.replace(/[^\d-]/g, ""));
                    clearField("performedKm");
                  }}
                  keyboardType="numeric"
                  placeholder={String(vehicle.currentKm)}
                  placeholderTextColor="#665d62"
                  editable={!submitting}
                  accessibilityLabel="Quilometragem na realização do serviço"
                />
                {fieldErrors.performedKm && (
                  <Text style={logStyles.fieldError}>
                    {fieldErrors.performedKm}
                  </Text>
                )}
              </View>
            </View>

            <Text style={pStyles.fieldLabel}>Valor pago em R$ (opcional)</Text>
            <TextInput
              style={[
                pStyles.input,
                fieldErrors.paidCost && logStyles.inputError,
              ]}
              value={paidCostText}
              onChangeText={(text) => {
                setPaidCostText(text.replace(/[^\d.,]/g, ""));
                clearField("paidCost");
              }}
              keyboardType="decimal-pad"
              placeholder={item.estimatedCost.toFixed(2).replace(".", ",")}
              placeholderTextColor="#665d62"
              editable={!submitting}
              accessibilityLabel="Valor pago em reais"
            />
            {fieldErrors.paidCost ? (
              <Text style={logStyles.fieldError}>{fieldErrors.paidCost}</Text>
            ) : (
              <Text style={logStyles.hintText}>
                Você pode editar para registrar o valor real pago no seu
                histórico sem alterar os preços-base do catálogo.
              </Text>
            )}

            <View style={logStyles.notesHeader}>
              <Text style={pStyles.fieldLabel}>Observação (opcional)</Text>
              <Text style={logStyles.notesCounter}>
                {notes.length}/{MAX_NOTES_LENGTH}
              </Text>
            </View>
            <TextInput
              style={[
                pStyles.input,
                logStyles.notesInput,
                fieldErrors.notes && logStyles.inputError,
              ]}
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
                clearField("notes");
              }}
              placeholder="Ex.: Oficina do bairro, óleo 5W30 sintético, nota fiscal guardada"
              placeholderTextColor="#665d62"
              maxLength={MAX_NOTES_LENGTH}
              multiline
              numberOfLines={2}
              editable={!submitting}
              accessibilityLabel="Observação opcional da manutenção"
            />
            {fieldErrors.notes && (
              <Text style={logStyles.fieldError}>{fieldErrors.notes}</Text>
            )}

            {formError && (
              <View style={pStyles.errorBox} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                <Text style={pStyles.errorText}>{formError}</Text>
              </View>
            )}

            <View style={logStyles.actionsRow}>
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={[pStyles.secondaryBtn, { flex: 1 }]}
                accessibilityRole="button"
              >
                <Text style={pStyles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={submitting}
                style={[
                  pStyles.primaryCtaBtn,
                  logStyles.confirmBtn,
                  submitting && { opacity: 0.7 },
                ]}
                activeOpacity={0.85}
                accessibilityRole="button"
                {...webAttr({ "data-torque-cta": "1" })}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                )}
                <Text style={pStyles.primaryCtaText}>
                  {submitting ? "Salvando..." : "Confirmar manutenção"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const logStyles = StyleSheet.create({
  summaryStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "#181622",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.28)",
    padding: 13,
  },
  summaryCol: {
    flex: 1,
    minWidth: 150,
  },
  summaryLabel: {
    color: "#a99ca2",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  col: {
    flex: 1,
    minWidth: 170,
  },
  inputError: {
    borderColor: "rgba(239, 68, 68, 0.72)",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
  },
  fieldError: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  hintText: {
    color: "#998c92",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  notesCounter: {
    color: "#8f8288",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 7,
  },
  notesInput: {
    minHeight: 68,
    textAlignVertical: "top",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  confirmBtn: {
    flex: 1.5,
    backgroundColor: "#16a34a",
  },
});
