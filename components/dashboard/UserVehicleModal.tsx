import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  buscarAnos,
  buscarDadosFipe,
  buscarModelos,
} from "@/app/(tabs)/services/fipeApi";
import type { ItemAPI } from "@/app/(tabs)/types/vehicle";
import SeletorModal from "@/app/components/SeletorModal";
import { pStyles, webAttr } from "@/components/preventive/styles";
import { DashboardClientError } from "@/lib/dashboard/dashboardClient";
import { defaultDashboardClient } from "@/lib/dashboard/defaultDashboardClient";
import type {
  CatalogVehicle,
  CreateVehiclePayload,
  UpdateVehiclePayload,
  UserVehicle,
  VehicleCategory,
} from "@/lib/dashboard/types";
import { formatKm } from "@/lib/preventive/engine";

export type UserVehicleModalProps = {
  visible: boolean;
  editingVehicle: UserVehicle | null;
  marcasFipe: ItemAPI[];
  carregandoMarcasFipe: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateVehiclePayload | UpdateVehiclePayload,
    editingId: string | null
  ) => Promise<void>;
};

type QuickFillTab = "catalog" | "fipe";

type FieldErrors = Partial<
  Record<
    | "brand"
    | "model"
    | "year"
    | "nickname"
    | "version"
    | "fuel"
    | "category"
    | "currentKm"
    | "lastRevisionMonths"
    | "lastRevisionKm"
    | "plate"
    | "fipePrice",
    string
  >
>;

const MAX_KM = 2_000_000;
const MAX_REVISION_MONTHS = 120;
const MIN_YEAR = 1950;

const FUEL_OPTIONS = [
  "Flex",
  "Gasolina",
  "Etanol",
  "Diesel",
  "Elétrico",
  "Híbrido",
] as const;

const CATEGORY_OPTIONS: {
  value: VehicleCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "compact", label: "Compacto", icon: "car-outline" },
  { value: "medium_suv", label: "Médio / SUV", icon: "car-sport-outline" },
  { value: "diesel_pickup", label: "Diesel / Picape", icon: "trail-sign-outline" },
  { value: "premium", label: "Premium", icon: "diamond-outline" },
  { value: "electric", label: "Elétrico", icon: "flash-outline" },
];

const CATEGORY_LABEL_MAP: Record<VehicleCategory, string> = {
  compact: "Compacto",
  medium_suv: "Médio / SUV",
  diesel_pickup: "Diesel / Picape",
  premium: "Premium",
  electric: "Elétrico",
};

function inferCategoryClient(
  fuel: string,
  brand: string,
  model: string
): VehicleCategory {
  const combined = `${fuel} ${brand} ${model}`.toLowerCase();
  if (
    combined.includes("elétrico") ||
    combined.includes("eletrico") ||
    combined.includes("electric") ||
    combined.includes("dolphin") ||
    combined.includes("byd")
  ) {
    return "electric";
  }
  if (
    /\b(bmw|mercedes|audi|volvo|porsche|lexus|jaguar|land rover|mini)\b/.test(
      combined
    )
  ) {
    return "premium";
  }
  if (
    combined.includes("diesel") ||
    /\b(hilux|ranger|s10|amarok|frontier|triton|toro|strada|saveiro|rampage)\b/.test(
      combined
    )
  ) {
    return "diesel_pickup";
  }
  if (
    /\b(corolla|civic|compass|hr-v|hrv|t-cross|tcross|tracker|creta|kicks|renegade|nivus|taos|tiggo|rav4|cr-v|pulse|fastback|cruze|sentra|virtus|jetta)\b/.test(
      combined
    )
  ) {
    return "medium_suv";
  }
  return "compact";
}

function normalizeFuelOption(rawFuel: string | undefined | null): string {
  const value = (rawFuel ?? "").trim().toLowerCase();
  if (value.includes("elétr") || value.includes("eletr") || value.includes("electr")) {
    return "Elétrico";
  }
  if (value.includes("híbr") || value.includes("hibr") || value.includes("hybrid")) {
    return "Híbrido";
  }
  if (value.includes("diesel")) {
    return "Diesel";
  }
  if (value.includes("etanol") || value.includes("álcool") || value.includes("alcool")) {
    return "Etanol";
  }
  if (value.includes("gasol")) {
    return "Gasolina";
  }
  return "Flex";
}

function parseStrictInt(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(/\s+/g, "");
  if (!/^-?\d+$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

export default function UserVehicleModal({
  visible,
  editingVehicle,
  marcasFipe,
  carregandoMarcasFipe,
  onClose,
  onSubmit,
}: UserVehicleModalProps) {
  const isEditing = Boolean(editingVehicle);
  const maxYear = new Date().getFullYear() + 2;

  const [quickTab, setQuickTab] = useState<QuickFillTab>("catalog");

  // Catálogo interno TorqueLab
  const [catalogVehicles, setCatalogVehicles] = useState<CatalogVehicle[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(
    null
  );

  // Seletores FIPE
  const [fipeBrand, setFipeBrand] = useState<ItemAPI | null>(null);
  const [fipeModel, setFipeModel] = useState<ItemAPI | null>(null);
  const [fipeYear, setFipeYear] = useState<ItemAPI | null>(null);
  const [fipeModels, setFipeModels] = useState<ItemAPI[]>([]);
  const [fipeYears, setFipeYears] = useState<ItemAPI[]>([]);
  const [loadingFipeModels, setLoadingFipeModels] = useState(false);
  const [loadingFipeYears, setLoadingFipeYears] = useState(false);
  const [loadingFipeDetail, setLoadingFipeDetail] = useState(false);
  const [fipeError, setFipeError] = useState<string | null>(null);
  const [modalFipeBrand, setModalFipeBrand] = useState(false);
  const [modalFipeModel, setModalFipeModel] = useState(false);
  const [modalFipeYear, setModalFipeYear] = useState(false);

  // Campos do formulário
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [yearText, setYearText] = useState("");
  const [nickname, setNickname] = useState("");
  const [version, setVersion] = useState("");
  const [fuel, setFuel] = useState<string>("Flex");
  const [category, setCategory] = useState<VehicleCategory>("compact");
  const [currentKmText, setCurrentKmText] = useState("");
  const [lastRevisionMonthsText, setLastRevisionMonthsText] = useState("0");
  const [revisionHistoryMode, setRevisionHistoryMode] = useState<
    "known" | "unknown"
  >("known");
  const [lastRevisionKmText, setLastRevisionKmText] = useState("");
  const [lastRevisionKmTouched, setLastRevisionKmTouched] = useState(false);
  const [plate, setPlate] = useState("");
  const [fipePrice, setFipePrice] = useState("");
  const [fipeCode, setFipeCode] = useState<string | null>(null);
  const [estimatedConsumption, setEstimatedConsumption] = useState<
    number | undefined
  >(undefined);

  // Confirmação de regressão de KM (modo edição)
  const [confirmKmRegression, setConfirmKmRegression] = useState(false);
  const [needsServerKmConfirm, setNeedsServerKmConfirm] = useState(false);

  // Erros e envio
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const items = await defaultDashboardClient.listCatalogVehicles();
      setCatalogVehicles(items);
    } catch (err) {
      const message =
        err instanceof DashboardClientError
          ? err.message
          : "Não foi possível carregar o catálogo interno.";
      setCatalogError(message);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    setFieldErrors({});
    setFormError(null);
    setIsLimitError(false);
    setSubmitting(false);
    setConfirmKmRegression(false);
    setNeedsServerKmConfirm(false);
    setFipeError(null);
    setFipeBrand(null);
    setFipeModel(null);
    setFipeYear(null);
    setFipeModels([]);
    setFipeYears([]);
    setCatalogSearch("");

    if (editingVehicle) {
      setSelectedCatalogId(editingVehicle.catalogVehicleId);
      setBrand(editingVehicle.brand);
      setModel(editingVehicle.model);
      setYearText(String(editingVehicle.year));
      setNickname(editingVehicle.nickname ?? "");
      setVersion(editingVehicle.version ?? "");
      setFuel(editingVehicle.fuel || "Flex");
      setCategory(editingVehicle.category);
      setCurrentKmText(String(editingVehicle.currentKm));
      setLastRevisionMonthsText(String(editingVehicle.lastRevisionMonths));
      setRevisionHistoryMode(
        editingVehicle.lastRevisionKm !== null ? "known" : "unknown"
      );
      setLastRevisionKmText(
        editingVehicle.lastRevisionKm !== null
          ? String(editingVehicle.lastRevisionKm)
          : ""
      );
      setLastRevisionKmTouched(true);
      setPlate(editingVehicle.plate ?? "");
      setFipePrice(editingVehicle.fipePrice ?? "");
      setFipeCode(editingVehicle.fipeCode);
      setEstimatedConsumption(editingVehicle.estimatedConsumption);
    } else {
      setQuickTab("catalog");
      setSelectedCatalogId(null);
      setBrand("");
      setModel("");
      setYearText(String(new Date().getFullYear()));
      setNickname("");
      setVersion("");
      setFuel("Flex");
      setCategory("compact");
      setCurrentKmText("");
      setLastRevisionMonthsText("0");
      setRevisionHistoryMode("known");
      setLastRevisionKmText("");
      setLastRevisionKmTouched(false);
      setPlate("");
      setFipePrice("");
      setFipeCode(null);
      setEstimatedConsumption(undefined);
      void loadCatalog();
    }
  }, [visible, editingVehicle, loadCatalog]);

  const filteredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    if (!query) return catalogVehicles;
    return catalogVehicles.filter((item) =>
      `${item.brand} ${item.model} ${item.year} ${item.fuel}`
        .toLowerCase()
        .includes(query)
    );
  }, [catalogVehicles, catalogSearch]);

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
      setIsLimitError(false);
    }
  }

  function handleSelectCatalogVehicle(item: CatalogVehicle) {
    setSelectedCatalogId(item.id);
    setBrand(item.brand);
    setModel(item.model);
    setYearText(String(item.year));
    setFuel(normalizeFuelOption(item.fuel));
    setCategory(item.category);
    setFipePrice(item.fipePrice ?? "");
    setFipeCode(null);
    setEstimatedConsumption(item.referenceConsumption);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.brand;
      delete next.model;
      delete next.year;
      delete next.fuel;
      delete next.category;
      return next;
    });
    setFormError(null);
  }

  async function handlePickFipeBrand(item: ItemAPI) {
    setFipeBrand(item);
    setFipeModel(null);
    setFipeYear(null);
    setFipeModels([]);
    setFipeYears([]);
    setFipeError(null);
    setSelectedCatalogId(null);
    setBrand(item.name);
    clearField("brand");

    setLoadingFipeModels(true);
    try {
      const models = await buscarModelos(item.code);
      setFipeModels(models);
    } catch {
      setFipeError(
        "Tabela FIPE temporariamente indisponível. Use o Catálogo TorqueLab ou preencha os campos manualmente."
      );
    } finally {
      setLoadingFipeModels(false);
    }
  }

  async function handlePickFipeModel(item: ItemAPI) {
    if (!fipeBrand) return;
    setFipeModel(item);
    setFipeYear(null);
    setFipeYears([]);
    setFipeError(null);
    setModel(item.name);
    clearField("model");

    setLoadingFipeYears(true);
    try {
      const years = await buscarAnos(fipeBrand.code, item.code);
      setFipeYears(years);
    } catch {
      setFipeError(
        "Não foi possível carregar os anos na FIPE. Você pode usar o Catálogo TorqueLab ou digitar o ano manualmente."
      );
    } finally {
      setLoadingFipeYears(false);
    }
  }

  async function handlePickFipeYear(item: ItemAPI) {
    if (!fipeBrand || !fipeModel) return;
    setFipeYear(item);
    setFipeError(null);

    setLoadingFipeDetail(true);
    try {
      const dados = await buscarDadosFipe(fipeBrand.code, fipeModel.code, item.code);
      const nextFuel = normalizeFuelOption(dados.fuel);
      setBrand(dados.brand);
      setModel(dados.model);
      setYearText(String(dados.modelYear));
      setFuel(nextFuel);
      setCategory(inferCategoryClient(nextFuel, dados.brand, dados.model));
      setFipePrice(dados.price);
      setFipeCode(dados.codeFipe || null);
      setSelectedCatalogId(null);
      setFieldErrors({});
    } catch {
      const extractedYear = /^(\d{4})/.exec(item.name)?.[1];
      if (extractedYear) {
        setYearText(extractedYear);
      }
      setFipeError(
        "Não foi possível consultar o valor FIPE agora. Continue com preenchimento manual ou escolha no Catálogo TorqueLab."
      );
    } finally {
      setLoadingFipeDetail(false);
    }
  }

  const parsedCurrentKm = parseStrictInt(currentKmText);
  const suggestedRevisionKm =
    parsedCurrentKm !== null && parsedCurrentKm >= 10000
      ? Math.floor(parsedCurrentKm / 10000) * 10000
      : null;
  const showRevisionHistoryCard =
    (parsedCurrentKm !== null && parsedCurrentKm >= 10000) ||
    Boolean(editingVehicle && editingVehicle.lastRevisionKm !== null);
  const parsedLastRevisionKmPreview = parseStrictInt(lastRevisionKmText);
  const showEditKmRegression =
    Boolean(editingVehicle) &&
    ((parsedCurrentKm !== null &&
      parsedCurrentKm >= 0 &&
      parsedCurrentKm < (editingVehicle?.currentKm ?? 0)) ||
      needsServerKmConfirm);

  async function handleSubmit() {
    if (submitting) return;

    const errors: FieldErrors = {};
    const trimmedBrand = brand.trim();
    const trimmedModel = model.trim();
    const trimmedNickname = nickname.trim();
    const trimmedVersion = version.trim();
    const trimmedPlate = plate.trim().toUpperCase();
    const trimmedFipePrice = fipePrice.trim();

    if (trimmedBrand.length < 2 || trimmedBrand.length > 80) {
      errors.brand = "Informe a marca (2 a 80 caracteres).";
    }
    if (trimmedModel.length < 2 || trimmedModel.length > 80) {
      errors.model = "Informe o modelo (2 a 80 caracteres).";
    }

    const parsedYear = parseStrictInt(yearText);
    if (parsedYear === null || parsedYear < MIN_YEAR || parsedYear > maxYear) {
      errors.year = `Informe um ano válido entre ${MIN_YEAR} e ${maxYear}.`;
    }

    if (trimmedNickname.length > 40) {
      errors.nickname = "O apelido deve ter no máximo 40 caracteres.";
    }

    if (trimmedVersion.length > 80) {
      errors.version = "A versão deve ter no máximo 80 caracteres.";
    }

    if (
      parsedCurrentKm === null ||
      parsedCurrentKm < 0 ||
      parsedCurrentKm > MAX_KM
    ) {
      errors.currentKm =
        "Informe uma quilometragem inteira entre 0 e 2.000.000 km.";
    }

    const parsedRevisionMonths =
      lastRevisionMonthsText.trim() === ""
        ? 0
        : parseStrictInt(lastRevisionMonthsText);
    if (
      parsedRevisionMonths === null ||
      parsedRevisionMonths < 0 ||
      parsedRevisionMonths > MAX_REVISION_MONTHS
    ) {
      errors.lastRevisionMonths = `Informe um valor inteiro entre 0 e ${MAX_REVISION_MONTHS} meses.`;
    }

    let resolvedLastRevisionKm: number | null = null;
    if (showRevisionHistoryCard && revisionHistoryMode === "known") {
      const parsedLastRevKm = parseStrictInt(lastRevisionKmText);
      if (
        parsedLastRevKm === null ||
        parsedLastRevKm < 0 ||
        parsedLastRevKm > MAX_KM
      ) {
        errors.lastRevisionKm =
          "Informe a KM da última revisão como um inteiro válido (ex.: 70000).";
      } else if (
        parsedCurrentKm !== null &&
        parsedLastRevKm > parsedCurrentKm
      ) {
        errors.lastRevisionKm =
          "A KM da última revisão não pode ser maior que a quilometragem atual.";
      } else {
        resolvedLastRevisionKm = parsedLastRevKm;
      }
    }

    if (trimmedPlate.length > 10) {
      errors.plate = "A placa deve ter no máximo 10 caracteres.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revise os campos destacados antes de salvar.");
      setIsLimitError(false);
      return;
    }

    if (showEditKmRegression && !confirmKmRegression) {
      setFormError(
        "Confirme a redução da quilometragem abaixo antes de salvar."
      );
      setIsLimitError(false);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsLimitError(false);
    setSubmitting(true);

    try {
      if (editingVehicle) {
        const updatePayload: UpdateVehiclePayload = {
          brand: trimmedBrand,
          model: trimmedModel,
          year: parsedYear!,
          nickname: trimmedNickname.length > 0 ? trimmedNickname : null,
          version: trimmedVersion.length > 0 ? trimmedVersion : null,
          fuel,
          category,
          currentKm: parsedCurrentKm!,
          lastRevisionMonths: parsedRevisionMonths!,
          lastRevisionKm: resolvedLastRevisionKm,
          plate: trimmedPlate.length > 0 ? trimmedPlate : null,
          fipePrice: trimmedFipePrice.length > 0 ? trimmedFipePrice : null,
          fipeCode: fipeCode ?? editingVehicle.fipeCode,
          ...(showEditKmRegression ? { confirmKmRegression } : {}),
        };
        await onSubmit(updatePayload, editingVehicle.id);
      } else {
        const createPayload: CreateVehiclePayload = {
          catalogVehicleId: selectedCatalogId,
          brand: trimmedBrand,
          model: trimmedModel,
          year: parsedYear!,
          nickname: trimmedNickname.length > 0 ? trimmedNickname : null,
          version: trimmedVersion.length > 0 ? trimmedVersion : null,
          fuel,
          category,
          currentKm: parsedCurrentKm!,
          lastRevisionMonths: parsedRevisionMonths!,
          lastRevisionKm: resolvedLastRevisionKm,
          plate: trimmedPlate.length > 0 ? trimmedPlate : null,
          fipePrice: trimmedFipePrice.length > 0 ? trimmedFipePrice : null,
          fipeCode,
          fipeCached: false,
          ...(estimatedConsumption !== undefined
            ? { estimatedConsumption }
            : {}),
        };
        await onSubmit(createPayload, null);
      }
      onClose();
    } catch (err) {
      if (err instanceof DashboardClientError) {
        if (err.fields) {
          setFieldErrors(err.fields as FieldErrors);
        }
        if (err.requiresKmRegressionConfirmation) {
          setNeedsServerKmConfirm(true);
        }
        setIsLimitError(err.status === 422);
        setFormError(err.message);
      } else {
        setFormError("Não foi possível salvar o veículo. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fipeUnavailable = !carregandoMarcasFipe && marcasFipe.length === 0;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={pStyles.modalBackdrop}>
          <View style={[pStyles.modalSheet, { maxWidth: 640 }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={pStyles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.sectionEyebrow}>
                    {isEditing ? "EDITAR VEÍCULO" : "GARAGEM TORQUELAB"}
                  </Text>
                  <Text style={pStyles.modalTitle}>
                    {isEditing
                      ? "Editar dados do veículo"
                      : "Cadastrar novo veículo"}
                  </Text>
                  <Text style={pStyles.modalSubtitle}>
                    {isEditing
                      ? "Atualize hodômetro, apelido, categoria ou dados FIPE do seu carro."
                      : "Escolha do Catálogo TorqueLab, consulte a Tabela FIPE ou preencha manualmente."}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  disabled={submitting}
                  style={pStyles.modalCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar modal de veículo"
                >
                  <Ionicons name="close" size={18} color="#d9cdd2" />
                </TouchableOpacity>
              </View>

              {!isEditing && (
                <View style={vStyles.quickSection}>
                  <View style={vStyles.modeTabs}>
                    <TouchableOpacity
                      onPress={() => setQuickTab("catalog")}
                      activeOpacity={0.85}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: quickTab === "catalog" }}
                      style={[
                        vStyles.modeTabBtn,
                        quickTab === "catalog" && vStyles.modeTabBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="albums-outline"
                        size={15}
                        color={quickTab === "catalog" ? "#ffffff" : "#b9adb2"}
                      />
                      <Text
                        style={[
                          vStyles.modeTabText,
                          quickTab === "catalog" && vStyles.modeTabTextActive,
                        ]}
                      >
                        Catálogo TorqueLab
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setQuickTab("fipe")}
                      activeOpacity={0.85}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: quickTab === "fipe" }}
                      style={[
                        vStyles.modeTabBtn,
                        quickTab === "fipe" && vStyles.modeTabBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="pricetag-outline"
                        size={15}
                        color={quickTab === "fipe" ? "#ffffff" : "#b9adb2"}
                      />
                      <Text
                        style={[
                          vStyles.modeTabText,
                          quickTab === "fipe" && vStyles.modeTabTextActive,
                        ]}
                      >
                        Tabela FIPE
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {quickTab === "catalog" && (
                    <View style={vStyles.quickBox}>
                      <View style={vStyles.searchRow}>
                        <Ionicons
                          name="search-outline"
                          size={16}
                          color="#9c8f95"
                        />
                        <TextInput
                          style={vStyles.searchInput}
                          value={catalogSearch}
                          onChangeText={setCatalogSearch}
                          placeholder="Buscar no catálogo (ex.: Corolla, Dolphin, Compass...)"
                          placeholderTextColor="#6d6268"
                          editable={!submitting}
                        />
                        {catalogSearch.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setCatalogSearch("")}
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name="close-circle"
                              size={16}
                              color="#8f8288"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      {loadingCatalog ? (
                        <View style={vStyles.catalogLoadingRow}>
                          <ActivityIndicator color="#e43b55" size="small" />
                          <Text style={vStyles.catalogMutedText}>
                            Carregando catálogo interno...
                          </Text>
                        </View>
                      ) : catalogError ? (
                        <View style={vStyles.warnBanner}>
                          <Ionicons
                            name="warning-outline"
                            size={16}
                            color="#fcd34d"
                          />
                          <Text style={vStyles.warnText}>{catalogError}</Text>
                          <TouchableOpacity
                            onPress={loadCatalog}
                            style={vStyles.warnActionBtn}
                            accessibilityRole="button"
                          >
                            <Text style={vStyles.warnActionText}>Recarregar</Text>
                          </TouchableOpacity>
                        </View>
                      ) : filteredCatalog.length === 0 ? (
                        <Text style={vStyles.catalogMutedText}>
                          Nenhum modelo encontrado no catálogo para essa busca.
                          Você pode preencher os campos manualmente abaixo.
                        </Text>
                      ) : (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={vStyles.catalogStrip}
                        >
                          {filteredCatalog.map((item) => {
                            const selected = selectedCatalogId === item.id;
                            return (
                              <TouchableOpacity
                                key={item.id}
                                onPress={() => handleSelectCatalogVehicle(item)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                style={[
                                  vStyles.catalogCard,
                                  selected && vStyles.catalogCardSelected,
                                ]}
                              >
                                <View style={vStyles.catalogCardTop}>
                                  <Text
                                    style={vStyles.catalogBrand}
                                    numberOfLines={1}
                                  >
                                    {item.brand} · {item.year}
                                  </Text>
                                  {item.category === "electric" && (
                                    <Ionicons
                                      name="flash"
                                      size={13}
                                      color="#38bdf8"
                                    />
                                  )}
                                </View>
                                <Text
                                  style={vStyles.catalogModel}
                                  numberOfLines={1}
                                >
                                  {item.model}
                                </Text>
                                <Text style={vStyles.catalogMeta}>
                                  {item.fuel} ·{" "}
                                  {CATEGORY_LABEL_MAP[item.category]}
                                </Text>
                                {item.fipePrice && (
                                  <Text style={vStyles.catalogPrice}>
                                    {item.fipePrice}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {quickTab === "fipe" && (
                    <View style={vStyles.quickBox}>
                      {(fipeUnavailable || fipeError) && (
                        <View style={vStyles.warnBanner}>
                          <Ionicons
                            name="cloud-offline-outline"
                            size={17}
                            color="#fcd34d"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={vStyles.warnText}>
                              {fipeError ??
                                "A API da Tabela FIPE está indisponível no momento. Use o Catálogo TorqueLab ou preencha manualmente abaixo."}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setQuickTab("catalog")}
                            style={vStyles.warnActionBtn}
                            accessibilityRole="button"
                          >
                            <Text style={vStyles.warnActionText}>
                              Usar catálogo
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={vStyles.fipeRow}>
                        <TouchableOpacity
                          onPress={() => setModalFipeBrand(true)}
                          disabled={carregandoMarcasFipe || marcasFipe.length === 0}
                          style={[
                            vStyles.fipeSelectBtn,
                            (carregandoMarcasFipe || marcasFipe.length === 0) &&
                              vStyles.btnDisabled,
                          ]}
                          accessibilityRole="button"
                        >
                          <Text style={vStyles.fipeSelectLabel}>1. Marca</Text>
                          <Text
                            style={vStyles.fipeSelectValue}
                            numberOfLines={1}
                          >
                            {carregandoMarcasFipe
                              ? "Carregando..."
                              : fipeBrand?.name ?? "Selecionar"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setModalFipeModel(true)}
                          disabled={!fipeBrand || loadingFipeModels || fipeModels.length === 0}
                          style={[
                            vStyles.fipeSelectBtn,
                            (!fipeBrand ||
                              loadingFipeModels ||
                              fipeModels.length === 0) &&
                              vStyles.btnDisabled,
                          ]}
                          accessibilityRole="button"
                        >
                          <Text style={vStyles.fipeSelectLabel}>2. Modelo</Text>
                          <Text
                            style={vStyles.fipeSelectValue}
                            numberOfLines={1}
                          >
                            {loadingFipeModels
                              ? "Buscando..."
                              : fipeModel?.name ?? "Selecionar"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setModalFipeYear(true)}
                          disabled={!fipeModel || loadingFipeYears || fipeYears.length === 0}
                          style={[
                            vStyles.fipeSelectBtn,
                            (!fipeModel ||
                              loadingFipeYears ||
                              fipeYears.length === 0) &&
                              vStyles.btnDisabled,
                          ]}
                          accessibilityRole="button"
                        >
                          <Text style={vStyles.fipeSelectLabel}>3. Ano</Text>
                          <Text
                            style={vStyles.fipeSelectValue}
                            numberOfLines={1}
                          >
                            {loadingFipeYears || loadingFipeDetail
                              ? "Consultando..."
                              : fipeYear?.name ?? "Selecionar"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Campos do formulário */}
              <View style={vStyles.gridRow}>
                <View style={vStyles.gridCol}>
                  <Text style={pStyles.fieldLabel}>Marca *</Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.brand && vStyles.inputError,
                    ]}
                    value={brand}
                    onChangeText={(t) => {
                      setBrand(t);
                      clearField("brand");
                    }}
                    placeholder="Ex.: Toyota"
                    placeholderTextColor="#665d62"
                    maxLength={80}
                    editable={!submitting}
                  />
                  {fieldErrors.brand && (
                    <Text style={vStyles.fieldError}>{fieldErrors.brand}</Text>
                  )}
                </View>

                <View style={vStyles.gridCol}>
                  <Text style={pStyles.fieldLabel}>Modelo *</Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.model && vStyles.inputError,
                    ]}
                    value={model}
                    onChangeText={(t) => {
                      setModel(t);
                      clearField("model");
                    }}
                    placeholder="Ex.: Corolla"
                    placeholderTextColor="#665d62"
                    maxLength={80}
                    editable={!submitting}
                  />
                  {fieldErrors.model && (
                    <Text style={vStyles.fieldError}>{fieldErrors.model}</Text>
                  )}
                </View>
              </View>

              <View style={vStyles.gridRow}>
                <View style={vStyles.gridColSmall}>
                  <Text style={pStyles.fieldLabel}>Ano *</Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.year && vStyles.inputError,
                    ]}
                    value={yearText}
                    onChangeText={(t) => {
                      setYearText(t.replace(/[^\d]/g, ""));
                      clearField("year");
                    }}
                    keyboardType="numeric"
                    placeholder="2022"
                    placeholderTextColor="#665d62"
                    maxLength={4}
                    editable={!submitting}
                  />
                  {fieldErrors.year && (
                    <Text style={vStyles.fieldError}>{fieldErrors.year}</Text>
                  )}
                </View>

                <View style={vStyles.gridCol}>
                  <Text style={pStyles.fieldLabel}>
                    Quilometragem atual (km) *
                  </Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.currentKm && vStyles.inputError,
                    ]}
                    value={currentKmText}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^\d-]/g, "");
                      setCurrentKmText(cleaned);
                      setConfirmKmRegression(false);
                      setNeedsServerKmConfirm(false);
                      clearField("currentKm");
                      clearField("lastRevisionKm");
                      if (!isEditing && !lastRevisionKmTouched) {
                        const nextKm = parseStrictInt(cleaned);
                        if (nextKm !== null && nextKm >= 10000) {
                          setLastRevisionKmText(
                            String(Math.floor(nextKm / 10000) * 10000)
                          );
                        } else {
                          setLastRevisionKmText("");
                        }
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="Ex.: 60000"
                    placeholderTextColor="#665d62"
                    editable={!submitting}
                  />
                  {fieldErrors.currentKm && (
                    <Text style={vStyles.fieldError}>
                      {fieldErrors.currentKm}
                    </Text>
                  )}
                </View>

                <View style={vStyles.gridColSmall}>
                  <Text style={pStyles.fieldLabel}>Últ. revisão (meses)</Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.lastRevisionMonths && vStyles.inputError,
                    ]}
                    value={lastRevisionMonthsText}
                    onChangeText={(t) => {
                      setLastRevisionMonthsText(t.replace(/[^\d]/g, ""));
                      clearField("lastRevisionMonths");
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#665d62"
                    maxLength={3}
                    editable={!submitting}
                  />
                  {fieldErrors.lastRevisionMonths && (
                    <Text style={vStyles.fieldError}>
                      {fieldErrors.lastRevisionMonths}
                    </Text>
                  )}
                </View>
              </View>

              {showRevisionHistoryCard && (
                <View style={vStyles.revisionHistoryBox}>
                  <View style={vStyles.revisionHistoryHead}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color="#ff8c9b"
                    />
                    <Text style={vStyles.revisionHistoryTitle}>
                      As revisões anteriores estão em dia?
                    </Text>
                  </View>
                  <Text style={vStyles.revisionHistoryDesc}>
                    Informe a quilometragem da última revisão feita para não
                    contabilizar revisões antigas como atrasadas.
                  </Text>

                  <View style={vStyles.chipsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setRevisionHistoryMode("known");
                        clearField("lastRevisionKm");
                        if (
                          lastRevisionKmText.trim() === "" &&
                          suggestedRevisionKm !== null
                        ) {
                          setLastRevisionKmText(String(suggestedRevisionKm));
                        }
                      }}
                      disabled={submitting}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      style={[
                        vStyles.chip,
                        revisionHistoryMode === "known" && vStyles.chipActive,
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={13}
                        color={
                          revisionHistoryMode === "known"
                            ? "#ffffff"
                            : "#b9adb2"
                        }
                      />
                      <Text
                        style={[
                          vStyles.chipText,
                          revisionHistoryMode === "known" &&
                            vStyles.chipTextActive,
                        ]}
                      >
                        Sim, sei a KM da última
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setRevisionHistoryMode("unknown");
                        clearField("lastRevisionKm");
                      }}
                      disabled={submitting}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      style={[
                        vStyles.chip,
                        revisionHistoryMode === "unknown" && vStyles.chipActive,
                      ]}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={13}
                        color={
                          revisionHistoryMode === "unknown"
                            ? "#ffffff"
                            : "#b9adb2"
                        }
                      />
                      <Text
                        style={[
                          vStyles.chipText,
                          revisionHistoryMode === "unknown" &&
                            vStyles.chipTextActive,
                        ]}
                      >
                        Não sei o histórico (usado)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {revisionHistoryMode === "known" ? (
                    <View style={{ marginTop: 10 }}>
                      <View style={vStyles.revisionKmHeaderRow}>
                        <Text style={[pStyles.fieldLabel, { marginTop: 0 }]}>
                          KM da última revisão *
                        </Text>
                        {suggestedRevisionKm !== null &&
                          lastRevisionKmText !==
                            String(suggestedRevisionKm) && (
                            <TouchableOpacity
                              onPress={() => {
                                setLastRevisionKmText(
                                  String(suggestedRevisionKm)
                                );
                                setLastRevisionKmTouched(true);
                                clearField("lastRevisionKm");
                              }}
                              disabled={submitting}
                              activeOpacity={0.85}
                              accessibilityRole="button"
                              style={vStyles.suggestKmBtn}
                            >
                              <Text style={vStyles.suggestKmBtnText}>
                                Usar {formatKm(suggestedRevisionKm)}
                              </Text>
                            </TouchableOpacity>
                          )}
                      </View>
                      <TextInput
                        style={[
                          pStyles.input,
                          fieldErrors.lastRevisionKm && vStyles.inputError,
                        ]}
                        value={lastRevisionKmText}
                        onChangeText={(t) => {
                          setLastRevisionKmText(t.replace(/[^\d]/g, ""));
                          setLastRevisionKmTouched(true);
                          clearField("lastRevisionKm");
                        }}
                        keyboardType="numeric"
                        placeholder={
                          suggestedRevisionKm !== null
                            ? `Ex.: ${suggestedRevisionKm}`
                            : "Ex.: 70000"
                        }
                        placeholderTextColor="#665d62"
                        editable={!submitting}
                        accessibilityLabel="Quilometragem da última revisão"
                      />
                      {fieldErrors.lastRevisionKm ? (
                        <Text style={vStyles.fieldError}>
                          {fieldErrors.lastRevisionKm}
                        </Text>
                      ) : parsedCurrentKm !== null &&
                        parsedLastRevisionKmPreview !== null &&
                        parsedLastRevisionKmPreview >= 0 &&
                        parsedLastRevisionKmPreview <= parsedCurrentKm ? (
                        <Text style={vStyles.revisionPreviewHint}>
                          {parsedCurrentKm - parsedLastRevisionKmPreview >=
                          10000
                            ? `Ex.: troca de óleo (10.000 km) mostrará atraso de ${formatKm(
                                parsedCurrentKm -
                                  parsedLastRevisionKmPreview -
                                  10000
                              )} desde ${formatKm(
                                parsedLastRevisionKmPreview + 10000
                              )}.`
                            : `Ex.: próxima troca de óleo prevista em ${formatKm(
                                parsedLastRevisionKmPreview + 10000
                              )} (faltam ${formatKm(
                                parsedLastRevisionKmPreview +
                                  10000 -
                                  parsedCurrentKm
                              )}).`}
                        </Text>
                      ) : (
                        <Text style={vStyles.revisionPreviewHint}>
                          Os serviços preventivos serão calculados a partir
                          dessa quilometragem.
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={vStyles.revisionUnknownHint}>
                      Sem histórico informado: o painel destacará as revisões
                      dos marcos anteriores para conferência preventiva até você
                      marcá-las como concluídas.
                    </Text>
                  )}
                </View>
              )}

              {showEditKmRegression && editingVehicle && (
                <View style={vStyles.regressionBox} accessibilityRole="alert">
                  <View style={vStyles.regressionHead}>
                    <Ionicons name="warning" size={17} color="#fcd34d" />
                    <Text style={vStyles.regressionTitle}>
                      Confirmação de redução de quilometragem
                    </Text>
                  </View>
                  <Text style={vStyles.regressionDesc}>
                    A quilometragem atual salva é{" "}
                    {formatKm(editingVehicle.currentKm)}. Confirme se a redução
                    é uma correção de digitação antes de salvar.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setConfirmKmRegression((prev) => !prev);
                      setFormError(null);
                    }}
                    disabled={submitting}
                    activeOpacity={0.85}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirmKmRegression }}
                    style={vStyles.checkboxRow}
                  >
                    <View
                      style={[
                        vStyles.checkboxBox,
                        confirmKmRegression && vStyles.checkboxBoxChecked,
                      ]}
                    >
                      {confirmKmRegression && (
                        <Ionicons name="checkmark" size={13} color="#ffffff" />
                      )}
                    </View>
                    <Text style={vStyles.checkboxLabel}>
                      Confirmo a correção manual da quilometragem
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={vStyles.gridRow}>
                <View style={vStyles.gridCol}>
                  <Text style={pStyles.fieldLabel}>
                    Apelido na garagem (opcional)
                  </Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.nickname && vStyles.inputError,
                    ]}
                    value={nickname}
                    onChangeText={(t) => {
                      setNickname(t);
                      clearField("nickname");
                    }}
                    placeholder="Ex.: Carro da família"
                    placeholderTextColor="#665d62"
                    maxLength={40}
                    editable={!submitting}
                  />
                  {fieldErrors.nickname && (
                    <Text style={vStyles.fieldError}>
                      {fieldErrors.nickname}
                    </Text>
                  )}
                </View>

                <View style={vStyles.gridCol}>
                  <Text style={pStyles.fieldLabel}>Versão (opcional)</Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.version && vStyles.inputError,
                    ]}
                    value={version}
                    onChangeText={(t) => {
                      setVersion(t);
                      clearField("version");
                    }}
                    placeholder="Ex.: XEi 2.0 Aut."
                    placeholderTextColor="#665d62"
                    maxLength={80}
                    editable={!submitting}
                  />
                  {fieldErrors.version && (
                    <Text style={vStyles.fieldError}>{fieldErrors.version}</Text>
                  )}
                </View>
              </View>

              <Text style={pStyles.fieldLabel}>Combustível</Text>
              <View style={vStyles.chipsRow}>
                {FUEL_OPTIONS.map((option) => {
                  const active = fuel === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setFuel(option);
                        if (option === "Elétrico") {
                          setCategory("electric");
                        } else if (option === "Diesel") {
                          setCategory("diesel_pickup");
                        } else if (category === "electric") {
                          setCategory(inferCategoryClient(option, brand, model));
                        }
                        clearField("fuel");
                      }}
                      disabled={submitting}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      style={[vStyles.chip, active && vStyles.chipActive]}
                    >
                      <Text
                        style={[
                          vStyles.chipText,
                          active && vStyles.chipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={pStyles.fieldLabel}>Perfil / Categoria do veículo</Text>
              <View style={vStyles.chipsRow}>
                {CATEGORY_OPTIONS.map((opt) => {
                  const active = category === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setCategory(opt.value);
                        if (opt.value === "electric") {
                          setFuel("Elétrico");
                        }
                        clearField("category");
                      }}
                      disabled={submitting}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      style={[vStyles.chip, active && vStyles.chipActive]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={13}
                        color={active ? "#ffffff" : "#b9adb2"}
                      />
                      <Text
                        style={[
                          vStyles.chipText,
                          active && vStyles.chipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {category === "electric" && (
                <Text style={vStyles.electricHint}>
                  Veículos elétricos omitem automaticamente itens exclusivos de
                  combustão (óleo do motor, velas, correia e filtro de
                  combustível).
                </Text>
              )}

              <View style={vStyles.gridRow}>
                <View style={vStyles.gridColSmall}>
                  <Text style={pStyles.fieldLabel}>Placa (opcional)</Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.plate && vStyles.inputError,
                    ]}
                    value={plate}
                    onChangeText={(t) => {
                      setPlate(t.toUpperCase());
                      clearField("plate");
                    }}
                    placeholder="ABC1D23"
                    placeholderTextColor="#665d62"
                    autoCapitalize="characters"
                    maxLength={10}
                    editable={!submitting}
                  />
                  {fieldErrors.plate && (
                    <Text style={vStyles.fieldError}>{fieldErrors.plate}</Text>
                  )}
                </View>

                <View style={vStyles.gridCol}>
                  <Text style={pStyles.fieldLabel}>
                    Valor FIPE de referência (opcional)
                  </Text>
                  <TextInput
                    style={[
                      pStyles.input,
                      fieldErrors.fipePrice && vStyles.inputError,
                    ]}
                    value={fipePrice}
                    onChangeText={(t) => {
                      setFipePrice(t);
                      clearField("fipePrice");
                    }}
                    placeholder="Ex.: R$ 135.000,00"
                    placeholderTextColor="#665d62"
                    editable={!submitting}
                  />
                  {fieldErrors.fipePrice && (
                    <Text style={vStyles.fieldError}>
                      {fieldErrors.fipePrice}
                    </Text>
                  )}
                </View>
              </View>

              {formError && (
                <View
                  style={[
                    pStyles.errorBox,
                    isLimitError && vStyles.limitErrorBox,
                  ]}
                  accessibilityRole="alert"
                >
                  <Ionicons
                    name={isLimitError ? "layers-outline" : "alert-circle"}
                    size={18}
                    color={isLimitError ? "#fcd34d" : "#fca5a5"}
                  />
                  <Text
                    style={[
                      pStyles.errorText,
                      isLimitError && { color: "#fef3c7" },
                    ]}
                  >
                    {formError}
                  </Text>
                </View>
              )}

              <View style={vStyles.actionsRow}>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={submitting}
                  style={[pStyles.secondaryBtn, { flex: 1 }]}
                  accessibilityRole="button"
                >
                  <Text style={pStyles.secondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={[
                    pStyles.primaryCtaBtn,
                    { flex: 1.6 },
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

      <SeletorModal
        visible={modalFipeBrand}
        titulo="Selecionar marca (FIPE)"
        itens={marcasFipe}
        carregando={carregandoMarcasFipe}
        onClose={() => setModalFipeBrand(false)}
        onSelect={handlePickFipeBrand}
      />

      <SeletorModal
        visible={modalFipeModel}
        titulo="Selecionar modelo (FIPE)"
        itens={fipeModels}
        carregando={loadingFipeModels}
        onClose={() => setModalFipeModel(false)}
        onSelect={handlePickFipeModel}
      />

      <SeletorModal
        visible={modalFipeYear}
        titulo="Selecionar ano (FIPE)"
        itens={fipeYears}
        carregando={loadingFipeYears}
        onClose={() => setModalFipeYear(false)}
        onSelect={handlePickFipeYear}
      />
    </>
  );
}

const vStyles = StyleSheet.create({
  quickSection: {
    marginBottom: 8,
    gap: 10,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "#191722",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  modeTabBtnActive: {
    backgroundColor: "#e43b55",
  },
  modeTabText: {
    color: "#b9adb2",
    fontSize: 12,
    fontWeight: "800",
  },
  modeTabTextActive: {
    color: "#ffffff",
  },
  quickBox: {
    backgroundColor: "#171520",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    paddingVertical: 9,
  },
  catalogLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  catalogMutedText: {
    color: "#9c8f95",
    fontSize: 12,
    lineHeight: 18,
  },
  catalogStrip: {
    gap: 8,
    paddingVertical: 2,
  },
  catalogCard: {
    width: 174,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 12,
    padding: 11,
    gap: 3,
  },
  catalogCardSelected: {
    borderColor: "#e43b55",
    backgroundColor: "rgba(228, 59, 85, 0.14)",
  },
  catalogCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  catalogBrand: {
    color: "#ff8c9b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  catalogModel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  catalogMeta: {
    color: "#a99ca2",
    fontSize: 11,
    fontWeight: "600",
  },
  catalogPrice: {
    color: "#e2d8dc",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.36)",
    borderRadius: 11,
    padding: 10,
  },
  warnText: {
    flex: 1,
    minWidth: 160,
    color: "#fef3c7",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  warnActionBtn: {
    backgroundColor: "#e43b55",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  warnActionText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  fipeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fipeSelectBtn: {
    flex: 1,
    minWidth: 145,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  fipeSelectLabel: {
    color: "#9c8f95",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  fipeSelectValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCol: {
    flex: 1,
    minWidth: 175,
  },
  gridColSmall: {
    flex: 0.65,
    minWidth: 110,
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
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#191722",
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
  electricHint: {
    color: "#7dd3fc",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    fontWeight: "600",
  },
  revisionHistoryBox: {
    marginTop: 12,
    backgroundColor: "rgba(228, 59, 85, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.28)",
    borderRadius: 14,
    padding: 13,
  },
  revisionHistoryHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  revisionHistoryTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  revisionHistoryDesc: {
    color: "#cbbec3",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  revisionKmHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  suggestKmBtn: {
    backgroundColor: "rgba(228, 59, 85, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.42)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suggestKmBtnText: {
    color: "#ff9aa8",
    fontSize: 11,
    fontWeight: "800",
  },
  revisionPreviewHint: {
    color: "#86efac",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    fontWeight: "600",
  },
  revisionUnknownHint: {
    color: "#fde68a",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
    fontWeight: "600",
  },
  regressionBox: {
    marginTop: 12,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 12,
    padding: 12,
    gap: 7,
  },
  regressionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  regressionTitle: {
    color: "#fde68a",
    fontSize: 12,
    fontWeight: "800",
  },
  regressionDesc: {
    color: "#fef3c7",
    fontSize: 12,
    lineHeight: 17,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 2,
  },
  checkboxBox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(252, 211, 77, 0.7)",
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
    fontSize: 12,
    fontWeight: "800",
  },
  limitErrorBox: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderColor: "rgba(245, 158, 11, 0.45)",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
});
