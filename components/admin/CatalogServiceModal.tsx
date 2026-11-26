import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pStyles, webAttr } from "@/components/preventive/styles";
import { AdminClientError, type AdminClient } from "@/lib/admin/adminClient";
import { defaultAdminClient } from "@/lib/admin/defaultAdminClient";
import type {
  AdminCatalogService,
  CreateCatalogServicePayload,
  UpdateCatalogServicePayload,
} from "@/lib/admin/types";

export type CatalogServiceModalProps = {
  visible: boolean;
  service?: AdminCatalogService | null;
  onClose: () => void;
  onSaved: (saved: AdminCatalogService) => void;
  adminClient?: AdminClient;
};

type FieldErrors = Partial<
  Record<
    | "name"
    | "category"
    | "intervalKm"
    | "intervalMonths"
    | "baseCost"
    | "combustionOnly"
    | "notes"
    | "active",
    string
  >
>;

const MIN_INTERVAL_KM = 1_000;
const MAX_INTERVAL_KM = 300_000;
const MIN_INTERVAL_MONTHS = 1;
const MAX_INTERVAL_MONTHS = 120;
const MAX_BASE_COST = 100_000;
const MAX_NOTES_LENGTH = 240;

const SERVICE_CATEGORIES = [
  { value: "motor", label: "Motor" },
  { value: "freios", label: "Freios" },
  { value: "pneus", label: "Pneus" },
  { value: "fluidos", label: "Fluidos" },
  { value: "elétrica", label: "Elétrica" },
  { value: "filtros", label: "Filtros" },
] as const;

function parseStrictInt(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(/\s+/g, "");
  if (!/^-?\d+$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/[R$\s]/g, "");
  if (!trimmed) {
    return null;
  }
  let normalized = trimmed;
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export default function CatalogServiceModal({
  visible,
  service = null,
  onClose,
  onSaved,
  adminClient = defaultAdminClient,
}: CatalogServiceModalProps) {
  const isEditing = Boolean(service);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("motor");
  const [intervalKmText, setIntervalKmText] = useState("");
  const [intervalMonthsText, setIntervalMonthsText] = useState("");
  const [baseCostText, setBaseCostText] = useState("");
  const [combustionOnly, setCombustionOnly] = useState(false);
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wasVisibleRef = useRef(false);
  const prevServiceIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentId = service?.id ?? null;
    const justOpened = !wasVisibleRef.current && visible;
    const switchedTarget = visible && currentId !== prevServiceIdRef.current;

    wasVisibleRef.current = visible;
    if (!visible) {
      return;
    }

    if (justOpened || switchedTarget) {
      prevServiceIdRef.current = currentId;
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);

      if (service) {
        setName(service.name);
        setCategory(service.category);
        setIntervalKmText(String(service.intervalKm));
        setIntervalMonthsText(
          service.intervalMonths !== null ? String(service.intervalMonths) : ""
        );
        setBaseCostText(service.baseCost.toFixed(2).replace(".", ","));
        setCombustionOnly(service.combustionOnly);
        setNotes(service.notes ?? "");
        setActive(service.active);
      } else {
        setName("");
        setCategory("motor");
        setIntervalKmText("");
        setIntervalMonthsText("");
        setBaseCostText("");
        setCombustionOnly(false);
        setNotes("");
        setActive(true);
      }
    }
  }, [visible, service]);

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

  async function handleSubmit() {
    if (submitting) return;

    const errors: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedNotes = notes.trim();

    if (trimmedName.length === 0) {
      errors.name = "Informe o nome do serviço.";
    } else if (trimmedName.length < 3 || trimmedName.length > 100) {
      errors.name = "O nome do serviço deve ter entre 3 e 100 caracteres.";
    }

    if (trimmedCategory.length === 0) {
      errors.category = "Informe a categoria do serviço.";
    } else if (trimmedCategory.length < 2 || trimmedCategory.length > 40) {
      errors.category = "A categoria deve ter entre 2 e 40 caracteres.";
    }

    const parsedIntervalKm = parseStrictInt(intervalKmText);
    if (
      parsedIntervalKm === null ||
      parsedIntervalKm < MIN_INTERVAL_KM ||
      parsedIntervalKm > MAX_INTERVAL_KM
    ) {
      errors.intervalKm =
        "O intervalo em km deve ser um número inteiro entre 1.000 e 300.000.";
    }

    let parsedIntervalMonths: number | null = null;
    if (intervalMonthsText.trim() !== "") {
      const candidate = parseStrictInt(intervalMonthsText);
      if (
        candidate === null ||
        candidate < MIN_INTERVAL_MONTHS ||
        candidate > MAX_INTERVAL_MONTHS
      ) {
        errors.intervalMonths =
          "O prazo em meses deve ser um número inteiro entre 1 e 120.";
      } else {
        parsedIntervalMonths = candidate;
      }
    }

    const parsedBaseCost = parseDecimalInput(baseCostText);
    if (
      parsedBaseCost === null ||
      parsedBaseCost < 0 ||
      parsedBaseCost > MAX_BASE_COST
    ) {
      errors.baseCost = "O custo-base deve ser um número entre 0 e 100.000.";
    }

    if (trimmedNotes.length > MAX_NOTES_LENGTH) {
      errors.notes = `As observações técnicas devem ter no máximo ${MAX_NOTES_LENGTH} caracteres.`;
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
      const normalizedCost = Number(parsedBaseCost!.toFixed(2));
      let saved: AdminCatalogService;

      if (service) {
        const payload: UpdateCatalogServicePayload = {
          name: trimmedName,
          category: trimmedCategory,
          intervalKm: parsedIntervalKm!,
          intervalMonths: parsedIntervalMonths,
          baseCost: normalizedCost,
          combustionOnly,
          notes: trimmedNotes.length > 0 ? trimmedNotes : null,
          active,
        };
        saved = await adminClient.updateCatalogService(service.id, payload);
      } else {
        const payload: CreateCatalogServicePayload = {
          name: trimmedName,
          category: trimmedCategory,
          intervalKm: parsedIntervalKm!,
          intervalMonths: parsedIntervalMonths,
          baseCost: normalizedCost,
          combustionOnly,
          notes: trimmedNotes.length > 0 ? trimmedNotes : null,
          active,
        };
        saved = await adminClient.createCatalogService(payload);
      }

      onSaved(saved);
      onClose();
    } catch (err) {
      // RN-04 / Cenário 5: nunca fecha o modal nem limpa o formulário em erro
      if (err instanceof AdminClientError) {
        if (err.fields) {
          setFieldErrors(err.fields as FieldErrors);
        } else if (err.status === 409) {
          setFieldErrors({ name: err.message });
        }
        setFormError(err.message);
      } else {
        setFormError(
          "Não foi possível salvar o serviço no catálogo. Tente novamente."
        );
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
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
    >
      <View style={pStyles.modalBackdrop}>
        <View style={[pStyles.modalSheet, { maxWidth: 620 }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={pStyles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.sectionEyebrow}>
                  CATÁLOGO DE MANUTENÇÕES E SERVIÇOS
                </Text>
                <Text style={pStyles.modalTitle}>
                  {isEditing
                    ? "Editar serviço de manutenção"
                    : "Novo serviço de manutenção"}
                </Text>
                <Text style={pStyles.modalSubtitle}>
                  {isEditing
                    ? "Alterações de preço-base e intervalos valem para cálculos futuros sem sobrescrever históricos concluídos."
                    : "Defina periodicidade, custo-base em R$ e se o serviço aplica-se apenas a veículos a combustão."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={pStyles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal de serviço do catálogo"
              >
                <Ionicons name="close" size={18} color="#d9cdd2" />
              </TouchableOpacity>
            </View>

            <Text style={pStyles.fieldLabel}>Nome do serviço *</Text>
            <TextInput
              style={[pStyles.input, sStyles.fullInput, fieldErrors.name && sStyles.inputError]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearField("name");
              }}
              placeholder="Ex.: Troca de fluido de arrefecimento"
              placeholderTextColor="#665d62"
              maxLength={100}
              editable={!submitting}
              accessibilityLabel="Nome do serviço"
            />
            {fieldErrors.name && (
              <Text style={sStyles.fieldError}>{fieldErrors.name}</Text>
            )}

            <Text style={pStyles.fieldLabel}>Categoria *</Text>
            <View style={sStyles.chipsRow}>
              {SERVICE_CATEGORIES.map((opt) => {
                const selected =
                  category.trim().toLowerCase() === opt.value.toLowerCase();
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setCategory(opt.value);
                      clearField("category");
                    }}
                    disabled={submitting}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    style={[sStyles.chip, selected && sStyles.chipActive]}
                  >
                    <Text
                      style={[
                        sStyles.chipText,
                        selected && sStyles.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[
                pStyles.input,
                { marginTop: 8 },
                fieldErrors.category && sStyles.inputError,
              ]}
              value={category}
              onChangeText={(text) => {
                setCategory(text);
                clearField("category");
              }}
              placeholder="Ex.: motor, freios, pneus, fluidos, elétrica, filtros"
              placeholderTextColor="#665d62"
              maxLength={40}
              editable={!submitting}
              accessibilityLabel="Categoria do serviço"
            />
            {fieldErrors.category && (
              <Text style={sStyles.fieldError}>{fieldErrors.category}</Text>
            )}

            <View style={sStyles.gridRow}>
              <View style={sStyles.gridCol}>
                <Text style={pStyles.fieldLabel}>Intervalo em KM *</Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.intervalKm && sStyles.inputError,
                  ]}
                  value={intervalKmText}
                  onChangeText={(text) => {
                    setIntervalKmText(text.replace(/[^\d-]/g, ""));
                    clearField("intervalKm");
                  }}
                  keyboardType="numeric"
                  placeholder="Ex.: 40000"
                  placeholderTextColor="#665d62"
                  editable={!submitting}
                  accessibilityLabel="Intervalo em quilômetros"
                />
                {fieldErrors.intervalKm ? (
                  <Text style={sStyles.fieldError}>
                    {fieldErrors.intervalKm}
                  </Text>
                ) : (
                  <Text style={sStyles.hintText}>Entre 1.000 e 300.000 km.</Text>
                )}
              </View>

              <View style={sStyles.gridCol}>
                <Text style={pStyles.fieldLabel}>
                  Prazo em meses (opcional)
                </Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.intervalMonths && sStyles.inputError,
                  ]}
                  value={intervalMonthsText}
                  onChangeText={(text) => {
                    setIntervalMonthsText(text.replace(/[^\d-]/g, ""));
                    clearField("intervalMonths");
                  }}
                  keyboardType="numeric"
                  placeholder="Ex.: 24 (ou deixe vazio)"
                  placeholderTextColor="#665d62"
                  editable={!submitting}
                  accessibilityLabel="Prazo em meses"
                />
                {fieldErrors.intervalMonths ? (
                  <Text style={sStyles.fieldError}>
                    {fieldErrors.intervalMonths}
                  </Text>
                ) : (
                  <Text style={sStyles.hintText}>
                    Opcional (1 a 120 meses).
                  </Text>
                )}
              </View>
            </View>

            <Text style={pStyles.fieldLabel}>Custo-base em R$ *</Text>
            <TextInput
              style={[
                pStyles.input,
                fieldErrors.baseCost && sStyles.inputError,
              ]}
              value={baseCostText}
              onChangeText={(text) => {
                setBaseCostText(text.replace(/[^\d.,-]/g, ""));
                clearField("baseCost");
              }}
              keyboardType="decimal-pad"
              placeholder="Ex.: 260,00"
              placeholderTextColor="#665d62"
              editable={!submitting}
              accessibilityLabel="Custo base em reais"
            />
            {fieldErrors.baseCost ? (
              <Text style={sStyles.fieldError}>{fieldErrors.baseCost}</Text>
            ) : (
              <Text style={sStyles.hintText}>
                Multiplicado pelo fator da categoria do veículo e arredondado
                para múltiplo de R$ 5 no Dashboard do Usuário.
              </Text>
            )}

            <View style={sStyles.switchCard}>
              <View style={{ flex: 1 }}>
                <Text style={sStyles.switchTitle}>
                  Apenas veículos a combustão
                </Text>
                <Text style={sStyles.switchDesc}>
                  {combustionOnly
                    ? "Ocultado automaticamente para veículos 100% elétricos (ex.: óleo, velas, correia)."
                    : "Aplicável a todos os veículos, incluindo elétricos e híbridos."}
                </Text>
              </View>
              <Switch
                value={combustionOnly}
                onValueChange={(value) => {
                  setCombustionOnly(value);
                  clearField("combustionOnly");
                }}
                disabled={submitting}
                trackColor={{
                  false: "#2c2836",
                  true: "rgba(245, 158, 11, 0.5)",
                }}
                thumbColor={combustionOnly ? "#f59e0b" : "#9c8f95"}
                accessibilityLabel="Apenas veículos a combustão"
              />
            </View>

            <View style={sStyles.notesHeader}>
              <Text style={pStyles.fieldLabel}>
                Observação técnica (opcional)
              </Text>
              <Text style={sStyles.notesCounter}>
                {notes.length}/{MAX_NOTES_LENGTH}
              </Text>
            </View>
            <TextInput
              style={[
                pStyles.input,
                sStyles.notesInput,
                fieldErrors.notes && sStyles.inputError,
              ]}
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
                clearField("notes");
              }}
              placeholder="Ex.: Verificar especificação do manual e drenar circuito completo."
              placeholderTextColor="#665d62"
              maxLength={MAX_NOTES_LENGTH}
              multiline
              numberOfLines={3}
              editable={!submitting}
              accessibilityLabel="Observação técnica do serviço"
            />
            {fieldErrors.notes && (
              <Text style={sStyles.fieldError}>{fieldErrors.notes}</Text>
            )}

            <View style={sStyles.switchCard}>
              <View style={{ flex: 1 }}>
                <Text style={sStyles.switchTitle}>Ativo no catálogo</Text>
                <Text style={sStyles.switchDesc}>
                  {active
                    ? "Considerado nos cálculos de manutenções pendentes dos usuários."
                    : "Inativo para novas recomendações; registros históricos já concluídos permanecem intactos."}
                </Text>
              </View>
              <Switch
                value={active}
                onValueChange={(value) => {
                  setActive(value);
                  clearField("active");
                }}
                disabled={submitting}
                trackColor={{
                  false: "#2c2836",
                  true: "rgba(228, 59, 85, 0.55)",
                }}
                thumbColor={active ? "#e43b55" : "#9c8f95"}
                accessibilityLabel="Status ativo do serviço no catálogo"
              />
            </View>

            {formError && (
              <View style={pStyles.errorBox} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                <Text style={pStyles.errorText}>{formError}</Text>
              </View>
            )}

            <View style={sStyles.actionsRow}>
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={[pStyles.secondaryBtn, { flex: 1 }]}
                accessibilityRole="button"
              >
                <Text style={pStyles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleSubmit()}
                disabled={submitting}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[
                  pStyles.primaryCtaBtn,
                  { flex: 1.5 },
                  submitting && { opacity: 0.7 },
                ]}
                {...webAttr({ "data-torque-cta": "1" })}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons
                    name={isEditing ? "save-outline" : "add-circle-outline"}
                    size={18}
                    color="#ffffff"
                  />
                )}
                <Text style={pStyles.primaryCtaText}>
                  {submitting
                    ? "Salvando..."
                    : isEditing
                      ? "Salvar alterações"
                      : "Cadastrar serviço"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const sStyles = StyleSheet.create({
  fullInput: {
    width: "100%",
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCol: {
    flex: 1,
    minWidth: 185,
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
    lineHeight: 16,
  },
  hintText: {
    color: "#998c92",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    backgroundColor: "#191721",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#e43b55",
    borderColor: "#e43b55",
  },
  chipText: {
    color: "#cbbec3",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#ffffff",
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
    minHeight: 74,
    textAlignVertical: "top",
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#191721",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },
  switchTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  switchDesc: {
    color: "#a99ca2",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
});
