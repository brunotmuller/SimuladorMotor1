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
  AdminCatalogVehicle,
  CreateCatalogVehiclePayload,
  UpdateCatalogVehiclePayload,
} from "@/lib/admin/types";
import type { VehicleCategory } from "@/lib/dashboard/types";

export type CatalogVehicleModalProps = {
  visible: boolean;
  vehicle?: AdminCatalogVehicle | null;
  onClose: () => void;
  onSaved: (saved: AdminCatalogVehicle) => void;
  adminClient?: AdminClient;
};

type FieldErrors = Partial<
  Record<
    | "brand"
    | "model"
    | "year"
    | "fuel"
    | "category"
    | "costFactor"
    | "referenceConsumption"
    | "fipePrice"
    | "active",
    string
  >
>;

const MIN_YEAR = 1950;
const MIN_COST_FACTOR = 0.5;
const MAX_COST_FACTOR = 5.0;
const MAX_CONSUMPTION = 100;

const FUEL_SUGGESTIONS = [
  "Flex",
  "Gasolina",
  "Etanol",
  "Diesel",
  "Híbrido",
  "Elétrico",
] as const;

const CATEGORY_OPTIONS: {
  value: VehicleCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  suggestedFactor: string;
  suggestedConsumption: string;
}[] = [
  {
    value: "compact",
    label: "Compacto",
    icon: "car-outline",
    suggestedFactor: "1,00",
    suggestedConsumption: "11,5",
  },
  {
    value: "medium_suv",
    label: "Médio / SUV",
    icon: "car-sport-outline",
    suggestedFactor: "1,22",
    suggestedConsumption: "11,5",
  },
  {
    value: "diesel_pickup",
    label: "Picape Diesel",
    icon: "trail-sign-outline",
    suggestedFactor: "1,45",
    suggestedConsumption: "10,0",
  },
  {
    value: "premium",
    label: "Premium",
    icon: "diamond-outline",
    suggestedFactor: "1,85",
    suggestedConsumption: "10,5",
  },
  {
    value: "electric",
    label: "Elétrico",
    icon: "flash-outline",
    suggestedFactor: "0,95",
    suggestedConsumption: "6,0",
  },
];

function parseStrictInt(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(/\s+/g, "");
  if (!/^-?\d+$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s+/g, "");
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

function formatDecimalForInput(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits).replace(".", ",");
}

export default function CatalogVehicleModal({
  visible,
  vehicle = null,
  onClose,
  onSaved,
  adminClient = defaultAdminClient,
}: CatalogVehicleModalProps) {
  const isEditing = Boolean(vehicle);
  const maxYear = new Date().getFullYear() + 2;

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [yearText, setYearText] = useState("");
  const [fuel, setFuel] = useState("Flex");
  const [category, setCategory] = useState<VehicleCategory>("compact");
  const [costFactorText, setCostFactorText] = useState("1,00");
  const [consumptionText, setConsumptionText] = useState("11,5");
  const [fipePrice, setFipePrice] = useState("");
  const [active, setActive] = useState(true);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wasVisibleRef = useRef(false);
  const prevVehicleIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentId = vehicle?.id ?? null;
    const justOpened = !wasVisibleRef.current && visible;
    const switchedTarget = visible && currentId !== prevVehicleIdRef.current;

    wasVisibleRef.current = visible;
    if (!visible) {
      return;
    }

    if (justOpened || switchedTarget) {
      prevVehicleIdRef.current = currentId;
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);

      if (vehicle) {
        setBrand(vehicle.brand);
        setModel(vehicle.model);
        setYearText(String(vehicle.year));
        setFuel(vehicle.fuel);
        setCategory(vehicle.category);
        setCostFactorText(formatDecimalForInput(vehicle.costFactor, 2));
        setConsumptionText(
          formatDecimalForInput(vehicle.referenceConsumption, 1)
        );
        setFipePrice(vehicle.fipePrice ?? "");
        setActive(vehicle.active);
      } else {
        setBrand("");
        setModel("");
        setYearText(String(new Date().getFullYear()));
        setFuel("Flex");
        setCategory("compact");
        setCostFactorText("1,00");
        setConsumptionText("11,5");
        setFipePrice("");
        setActive(true);
      }
    }
  }, [visible, vehicle]);

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

  function handleSelectCategory(nextCategory: VehicleCategory) {
    const prevCategory = category;
    setCategory(nextCategory);
    clearField("category");

    if (!isEditing) {
      const option = CATEGORY_OPTIONS.find((item) => item.value === nextCategory);
      if (option) {
        const prevOption = CATEGORY_OPTIONS.find(
          (item) => item.value === prevCategory
        );
        if (!prevOption || costFactorText === prevOption.suggestedFactor) {
          setCostFactorText(option.suggestedFactor);
        }
        if (
          !prevOption ||
          consumptionText === prevOption.suggestedConsumption
        ) {
          setConsumptionText(option.suggestedConsumption);
        }
      }
      if (nextCategory === "electric") {
        setFuel("Elétrico");
      } else if (nextCategory === "diesel_pickup" && fuel === "Elétrico") {
        setFuel("Diesel");
      } else if (fuel === "Elétrico") {
        setFuel("Flex");
      }
    }
  }

  async function handleSubmit() {
    if (submitting) return;

    const errors: FieldErrors = {};
    const trimmedBrand = brand.trim();
    const trimmedModel = model.trim();
    const trimmedFuel = fuel.trim();
    const trimmedFipe = fipePrice.trim();

    if (trimmedBrand.length === 0) {
      errors.brand = "Informe a marca do veículo.";
    } else if (trimmedBrand.length < 2 || trimmedBrand.length > 80) {
      errors.brand = "A marca deve ter entre 2 e 80 caracteres.";
    }

    if (trimmedModel.length === 0) {
      errors.model = "Informe o modelo do veículo.";
    } else if (trimmedModel.length < 2 || trimmedModel.length > 80) {
      errors.model = "O modelo deve ter entre 2 e 80 caracteres.";
    }

    const parsedYear = parseStrictInt(yearText);
    if (parsedYear === null || parsedYear < MIN_YEAR || parsedYear > maxYear) {
      errors.year = `O ano deve ser um inteiro entre ${MIN_YEAR} e ${maxYear}.`;
    }

    if (trimmedFuel.length === 0) {
      errors.fuel = "Informe o tipo de combustível.";
    } else if (trimmedFuel.length < 2 || trimmedFuel.length > 40) {
      errors.fuel = "O combustível deve ter entre 2 e 40 caracteres.";
    }

    const parsedCostFactor = parseDecimalInput(costFactorText);
    if (
      parsedCostFactor === null ||
      parsedCostFactor < MIN_COST_FACTOR ||
      parsedCostFactor > MAX_COST_FACTOR
    ) {
      errors.costFactor =
        "O fator de custo deve ser um número entre 0,50 e 5,00.";
    }

    const defaultConsumption = category === "electric" ? 6.0 : 11.5;
    const parsedConsumption =
      consumptionText.trim() === ""
        ? defaultConsumption
        : parseDecimalInput(consumptionText);
    if (
      parsedConsumption === null ||
      parsedConsumption <= 0 ||
      parsedConsumption > MAX_CONSUMPTION
    ) {
      errors.referenceConsumption =
        "O consumo de referência deve ser maior que 0 e até 100.";
    }

    if (trimmedFipe.length > 40) {
      errors.fipePrice = "O valor FIPE deve ter no máximo 40 caracteres.";
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
      const normalizedCostFactor = Number(parsedCostFactor!.toFixed(2));
      const normalizedConsumption = Number(parsedConsumption!.toFixed(2));

      let saved: AdminCatalogVehicle;
      if (vehicle) {
        const payload: UpdateCatalogVehiclePayload = {
          brand: trimmedBrand,
          model: trimmedModel,
          year: parsedYear!,
          fuel: trimmedFuel,
          category,
          costFactor: normalizedCostFactor,
          referenceConsumption: normalizedConsumption,
          fipePrice: trimmedFipe.length > 0 ? trimmedFipe : null,
          active,
        };
        saved = await adminClient.updateCatalogVehicle(vehicle.id, payload);
      } else {
        const payload: CreateCatalogVehiclePayload = {
          brand: trimmedBrand,
          model: trimmedModel,
          year: parsedYear!,
          fuel: trimmedFuel,
          category,
          costFactor: normalizedCostFactor,
          referenceConsumption: normalizedConsumption,
          fipePrice: trimmedFipe.length > 0 ? trimmedFipe : null,
          active,
        };
        saved = await adminClient.createCatalogVehicle(payload);
      }

      onSaved(saved);
      onClose();
    } catch (err) {
      // RN-04: mantém o modal aberto e todos os dados digitados intactos em caso de erro
      if (err instanceof AdminClientError) {
        if (err.fields) {
          setFieldErrors(err.fields as FieldErrors);
        } else if (err.status === 409) {
          setFieldErrors({
            model: err.message,
          });
        }
        setFormError(err.message);
      } else {
        setFormError(
          "Não foi possível salvar o veículo no catálogo. Tente novamente."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const consumptionUnit = category === "electric" ? "km/kWh" : "km/L";

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
                  CATÁLOGO OFICIAL DE VEÍCULOS
                </Text>
                <Text style={pStyles.modalTitle}>
                  {isEditing
                    ? "Editar veículo do catálogo"
                    : "Novo veículo no catálogo"}
                </Text>
                <Text style={pStyles.modalSubtitle}>
                  {isEditing
                    ? "Atualize fator de custo, consumo de referência, FIPE ou status ativo sem afetar garagens já salvas."
                    : "Cadastre um modelo de referência para cálculo de manutenções e cadastro rápido pelos usuários."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={pStyles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal de veículo do catálogo"
              >
                <Ionicons name="close" size={18} color="#d9cdd2" />
              </TouchableOpacity>
            </View>

            <View style={mStyles.gridRow}>
              <View style={mStyles.gridCol}>
                <Text style={pStyles.fieldLabel}>Marca *</Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.brand && mStyles.inputError,
                  ]}
                  value={brand}
                  onChangeText={(text) => {
                    setBrand(text);
                    clearField("brand");
                  }}
                  placeholder="Ex.: Toyota"
                  placeholderTextColor="#665d62"
                  maxLength={80}
                  editable={!submitting}
                  accessibilityLabel="Marca do veículo"
                />
                {fieldErrors.brand && (
                  <Text style={mStyles.fieldError}>{fieldErrors.brand}</Text>
                )}
              </View>

              <View style={mStyles.gridCol}>
                <Text style={pStyles.fieldLabel}>Modelo *</Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.model && mStyles.inputError,
                  ]}
                  value={model}
                  onChangeText={(text) => {
                    setModel(text);
                    clearField("model");
                  }}
                  placeholder="Ex.: Corolla XEi"
                  placeholderTextColor="#665d62"
                  maxLength={80}
                  editable={!submitting}
                  accessibilityLabel="Modelo do veículo"
                />
                {fieldErrors.model && (
                  <Text style={mStyles.fieldError}>{fieldErrors.model}</Text>
                )}
              </View>
            </View>

            <View style={mStyles.gridRow}>
              <View style={mStyles.gridColSmall}>
                <Text style={pStyles.fieldLabel}>Ano *</Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.year && mStyles.inputError,
                  ]}
                  value={yearText}
                  onChangeText={(text) => {
                    setYearText(text.replace(/[^\d]/g, ""));
                    clearField("year");
                  }}
                  keyboardType="numeric"
                  placeholder="2024"
                  placeholderTextColor="#665d62"
                  maxLength={4}
                  editable={!submitting}
                  accessibilityLabel="Ano de referência"
                />
                {fieldErrors.year && (
                  <Text style={mStyles.fieldError}>{fieldErrors.year}</Text>
                )}
              </View>

              <View style={mStyles.gridCol}>
                <Text style={pStyles.fieldLabel}>Combustível *</Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.fuel && mStyles.inputError,
                  ]}
                  value={fuel}
                  onChangeText={(text) => {
                    setFuel(text);
                    clearField("fuel");
                  }}
                  placeholder="Ex.: Flex, Diesel, Elétrico"
                  placeholderTextColor="#665d62"
                  maxLength={40}
                  editable={!submitting}
                  accessibilityLabel="Tipo de combustível"
                />
                {fieldErrors.fuel && (
                  <Text style={mStyles.fieldError}>{fieldErrors.fuel}</Text>
                )}
              </View>
            </View>

            <View style={mStyles.chipsRow}>
              {FUEL_SUGGESTIONS.map((option) => {
                const selected =
                  fuel.trim().toLowerCase() === option.toLowerCase();
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setFuel(option);
                      clearField("fuel");
                      if (option === "Elétrico") {
                        handleSelectCategory("electric");
                      } else if (option === "Diesel") {
                        handleSelectCategory("diesel_pickup");
                      }
                    }}
                    disabled={submitting}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    style={[mStyles.chip, selected && mStyles.chipActive]}
                  >
                    <Text
                      style={[
                        mStyles.chipText,
                        selected && mStyles.chipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={pStyles.fieldLabel}>Categoria / Tier *</Text>
            <View style={mStyles.chipsRow}>
              {CATEGORY_OPTIONS.map((opt) => {
                const selected = category === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleSelectCategory(opt.value)}
                    disabled={submitting}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    style={[mStyles.chip, selected && mStyles.chipActive]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={13}
                      color={selected ? "#ffffff" : "#b9adb2"}
                    />
                    <Text
                      style={[
                        mStyles.chipText,
                        selected && mStyles.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {fieldErrors.category && (
              <Text style={mStyles.fieldError}>{fieldErrors.category}</Text>
            )}

            <View style={mStyles.gridRow}>
              <View style={mStyles.gridCol}>
                <Text style={pStyles.fieldLabel}>
                  Fator de custo (0,50 a 5,00) *
                </Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.costFactor && mStyles.inputError,
                  ]}
                  value={costFactorText}
                  onChangeText={(text) => {
                    setCostFactorText(text.replace(/[^\d.,-]/g, ""));
                    clearField("costFactor");
                  }}
                  keyboardType="decimal-pad"
                  placeholder="1,00"
                  placeholderTextColor="#665d62"
                  editable={!submitting}
                  accessibilityLabel="Fator multiplicador de custo"
                />
                {fieldErrors.costFactor ? (
                  <Text style={mStyles.fieldError}>
                    {fieldErrors.costFactor}
                  </Text>
                ) : (
                  <Text style={mStyles.hintText}>
                    Multiplica o custo-base dos serviços (ex.: 1,22 para SUV).
                  </Text>
                )}
              </View>

              <View style={mStyles.gridCol}>
                <Text style={pStyles.fieldLabel}>
                  Consumo ref. ({consumptionUnit})
                </Text>
                <TextInput
                  style={[
                    pStyles.input,
                    fieldErrors.referenceConsumption && mStyles.inputError,
                  ]}
                  value={consumptionText}
                  onChangeText={(text) => {
                    setConsumptionText(text.replace(/[^\d.,-]/g, ""));
                    clearField("referenceConsumption");
                  }}
                  keyboardType="decimal-pad"
                  placeholder={category === "electric" ? "6,0" : "11,5"}
                  placeholderTextColor="#665d62"
                  editable={!submitting}
                  accessibilityLabel="Consumo de referência"
                />
                {fieldErrors.referenceConsumption ? (
                  <Text style={mStyles.fieldError}>
                    {fieldErrors.referenceConsumption}
                  </Text>
                ) : (
                  <Text style={mStyles.hintText}>
                    Padrão sugerido: {category === "electric" ? "6,0" : "11,5"}{" "}
                    {consumptionUnit}.
                  </Text>
                )}
              </View>
            </View>

            <Text style={pStyles.fieldLabel}>
              Valor FIPE de referência (opcional)
            </Text>
            <TextInput
              style={[
                pStyles.input,
                fieldErrors.fipePrice && mStyles.inputError,
              ]}
              value={fipePrice}
              onChangeText={(text) => {
                setFipePrice(text);
                clearField("fipePrice");
              }}
              placeholder="Ex.: R$ 135.000"
              placeholderTextColor="#665d62"
              maxLength={40}
              editable={!submitting}
              accessibilityLabel="Valor FIPE de referência"
            />
            {fieldErrors.fipePrice && (
              <Text style={mStyles.fieldError}>{fieldErrors.fipePrice}</Text>
            )}

            <View style={mStyles.switchCard}>
              <View style={{ flex: 1 }}>
                <Text style={mStyles.switchTitle}>Ativo no catálogo</Text>
                <Text style={mStyles.switchDesc}>
                  {active
                    ? "Disponível para novos cadastros de usuários no TorqueLab."
                    : "Oculto para novos cadastros; veículos já salvos por usuários permanecem íntegros."}
                </Text>
              </View>
              <Switch
                value={active}
                onValueChange={(value) => {
                  setActive(value);
                  clearField("active");
                }}
                disabled={submitting}
                trackColor={{ false: "#2c2836", true: "rgba(228, 59, 85, 0.55)" }}
                thumbColor={active ? "#e43b55" : "#9c8f95"}
                accessibilityLabel="Status ativo no catálogo"
              />
            </View>

            {formError && (
              <View style={pStyles.errorBox} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                <Text style={pStyles.errorText}>{formError}</Text>
              </View>
            )}

            <View style={mStyles.actionsRow}>
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
                      : "Cadastrar veículo"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCol: {
    flex: 1,
    minWidth: 190,
  },
  gridColSmall: {
    flex: 0.55,
    minWidth: 115,
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
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
