import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DEMO_VEHICLES,
  MONTHLY_USAGE_OPTIONS,
} from "@/lib/preventive/catalog";
import {
  createCustomVehicle,
  createVehicleFromDemo,
} from "@/lib/preventive/engine";
import {
  DemoVehicleTemplate,
  MonthlyUsageLevel,
  PreventiveVehicle,
} from "@/lib/preventive/types";
import {
  buscarAnos,
  buscarModelos,
} from "@/app/(tabs)/services/fipeApi";
import { ItemAPI } from "@/app/(tabs)/types/vehicle";
import SeletorModal from "@/app/components/SeletorModal";
import { pStyles, webAttr } from "./styles";

type Props = {
  visible: boolean;
  editingVehicle?: PreventiveVehicle | null;
  marcasFipe: ItemAPI[];
  carregandoMarcasFipe: boolean;
  onClose: () => void;
  onSaveVehicle: (vehicle: PreventiveVehicle, isEdit: boolean) => void;
};

type Mode = "demo" | "custom";

export default function VehicleRegistrationModal({
  visible,
  editingVehicle = null,
  marcasFipe,
  carregandoMarcasFipe,
  onClose,
  onSaveVehicle,
}: Props) {
  const [mode, setMode] = useState<Mode>("demo");
  const [selectedDemoId, setSelectedDemoId] = useState<string>(DEMO_VEHICLES[0].id);

  // Campos do formulário completo
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [yearText, setYearText] = useState("");
  const [version, setVersion] = useState("");
  const [kmText, setKmText] = useState("");
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsageLevel>("normal");
  const [error, setError] = useState("");

  // Reaproveitamento da API FIPE existente
  const [fipeBrand, setFipeBrand] = useState<ItemAPI | null>(null);
  const [fipeModels, setFipeModels] = useState<ItemAPI[]>([]);
  const [fipeYears, setFipeYears] = useState<ItemAPI[]>([]);
  const [loadingFipeModels, setLoadingFipeModels] = useState(false);
  const [loadingFipeYears, setLoadingFipeYears] = useState(false);
  const [modalFipeBrand, setModalFipeBrand] = useState(false);
  const [modalFipeModel, setModalFipeModel] = useState(false);
  const [modalFipeYear, setModalFipeYear] = useState(false);
  const [fipeError, setFipeError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setError("");
    setFipeError("");
    if (editingVehicle) {
      setMode("custom");
      setBrand(editingVehicle.brand);
      setModel(editingVehicle.model);
      setYearText(String(editingVehicle.year));
      setVersion(editingVehicle.version ?? "");
      setKmText(String(editingVehicle.currentKm));
      setMonthlyUsage(editingVehicle.monthlyUsage);
    } else {
      setMode("demo");
      const first = DEMO_VEHICLES[0];
      setSelectedDemoId(first.id);
      setBrand("");
      setModel("");
      setYearText(String(new Date().getFullYear() - 3));
      setVersion("");
      setKmText("");
      setMonthlyUsage("normal");
      setFipeBrand(null);
      setFipeModels([]);
      setFipeYears([]);
    }
  }, [visible, editingVehicle]);

  async function handleSelectFipeBrand(item: ItemAPI) {
    setFipeBrand(item);
    setBrand(item.name);
    setModel("");
    setFipeModels([]);
    setFipeYears([]);
    setFipeError("");
    try {
      setLoadingFipeModels(true);
      const list = await buscarModelos(item.code);
      setFipeModels(list);
    } catch {
      setFipeError("Não foi possível carregar modelos da FIPE agora. Você pode digitar manualmente.");
    } finally {
      setLoadingFipeModels(false);
    }
  }

  async function handleSelectFipeModel(item: ItemAPI) {
    setModel(item.name);
    setFipeYears([]);
    setFipeError("");
    if (!fipeBrand) return;
    try {
      setLoadingFipeYears(true);
      const list = await buscarAnos(fipeBrand.code, item.code);
      setFipeYears(list);
    } catch {
      setFipeError("Não foi possível carregar os anos na FIPE. Digite o ano abaixo.");
    } finally {
      setLoadingFipeYears(false);
    }
  }

  function handleSelectFipeYear(item: ItemAPI) {
    const match = /(\d{4})/.exec(item.name);
    if (match) setYearText(match[1]);
  }

  function handleSelectDemoTemplate(tpl: DemoVehicleTemplate) {
    setSelectedDemoId(tpl.id);
    setMonthlyUsage(tpl.suggestedUsage);
    setKmText(String(tpl.suggestedKm));
    setError("");
  }

  function handleSubmitDemo() {
    const template =
      DEMO_VEHICLES.find((d) => d.id === selectedDemoId) ?? DEMO_VEHICLES[0];
    const kmParsed = kmText.trim()
      ? Number(kmText.replace(/[^\d]/g, ""))
      : template.suggestedKm;

    if (!Number.isFinite(kmParsed) || kmParsed < 0 || kmParsed > 2_000_000) {
      setError("Informe uma quilometragem válida entre 0 e 2.000.000 km.");
      return;
    }

    const vehicle = createVehicleFromDemo(template, {
      currentKm: kmParsed,
      monthlyUsage,
    });
    onSaveVehicle(vehicle, false);
    onClose();
  }

  function handleSubmitCustom() {
    const cleanBrand = brand.trim();
    const cleanModel = model.trim();
    const year = Number(yearText.replace(/[^\d]/g, ""));
    const km = Number(kmText.replace(/[^\d]/g, ""));
    const maxYear = new Date().getFullYear() + 2;

    if (cleanBrand.length < 2) {
      setError("Informe a marca do veículo.");
      return;
    }
    if (cleanModel.length < 2) {
      setError("Informe o modelo do veículo.");
      return;
    }
    if (!Number.isFinite(year) || year < 1970 || year > maxYear) {
      setError(`Informe um ano válido entre 1970 e ${maxYear}.`);
      return;
    }
    if (!kmText.trim() || !Number.isFinite(km) || km < 0 || km > 2_000_000) {
      setError("Informe a quilometragem atual do veículo.");
      return;
    }

    if (editingVehicle) {
      if (km < editingVehicle.currentKm) {
        setError(
          `A quilometragem não pode ser menor que o último registro (${editingVehicle.currentKm.toLocaleString(
            "pt-BR"
          )} km).`
        );
        return;
      }
      const updated: PreventiveVehicle = {
        ...editingVehicle,
        brand: cleanBrand,
        model: cleanModel,
        year,
        version: version.trim() || undefined,
        currentKm: km,
        monthlyUsage,
        updatedAt: new Date().toISOString(),
      };
      onSaveVehicle(updated, true);
      onClose();
      return;
    }

    const created = createCustomVehicle({
      brand: cleanBrand,
      model: cleanModel,
      year,
      version: version.trim() || undefined,
      currentKm: km,
      monthlyUsage,
    });
    onSaveVehicle(created, false);
    onClose();
  }

  const selectedDemo =
    DEMO_VEHICLES.find((d) => d.id === selectedDemoId) ?? DEMO_VEHICLES[0];

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={pStyles.modalBackdrop}>
          <View style={[pStyles.modalSheet, { maxWidth: 660 }]}>
            <View style={pStyles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.sectionEyebrow}>
                  {editingVehicle ? "EDITAR VEÍCULO" : "CADASTRO DO VEÍCULO"}
                </Text>
                <Text style={pStyles.modalTitle}>
                  {editingVehicle
                    ? `${editingVehicle.brand} ${editingVehicle.model}`
                    : "Cadastre seu carro"}
                </Text>
                <Text style={pStyles.modalSubtitle}>
                  Escolha um modelo popular brasileiro para demonstração ou
                  cadastre seu veículo completo via FIPE / manual.
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={pStyles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Fechar cadastro de veículo"
              >
                <Ionicons name="close" size={18} color="#d9cdd2" />
              </TouchableOpacity>
            </View>

            {!editingVehicle && (
              <View style={pStyles.loadToggleRow}>
                <TouchableOpacity
                  onPress={() => {
                    setMode("demo");
                    setError("");
                  }}
                  style={[
                    pStyles.loadToggleBtn,
                    mode === "demo" && pStyles.loadToggleBtnActive,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={15}
                    color={mode === "demo" ? "#fff" : "#b7aab0"}
                  />
                  <Text
                    style={[
                      pStyles.loadToggleText,
                      mode === "demo" && pStyles.loadToggleTextActive,
                    ]}
                  >
                    Modelos populares (demo)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setMode("custom");
                    setError("");
                  }}
                  style={[
                    pStyles.loadToggleBtn,
                    mode === "custom" && pStyles.loadToggleBtnActive,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="car-sport-outline"
                    size={15}
                    color={mode === "custom" ? "#fff" : "#b7aab0"}
                  />
                  <Text
                    style={[
                      pStyles.loadToggleText,
                      mode === "custom" && pStyles.loadToggleTextActive,
                    ]}
                  >
                    Meu carro (FIPE ou manual)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 460 }}
            >
              {mode === "demo" && !editingVehicle ? (
                <View>
                  <View
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(245, 158, 11, 0.3)",
                      borderRadius: 12,
                      padding: 11,
                      marginBottom: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="information-circle" size={18} color="#fbbf24" />
                    <Text style={{ flex: 1, color: "#fde68a", fontSize: 12, lineHeight: 17 }}>
                      Dados demonstrativos: os 10 modelos populares vêm com
                      datas/km ilustrativos para você ver o semáforo funcionando
                      na hora. Você pode ajustar tudo depois.
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {DEMO_VEHICLES.map((tpl) => {
                      const active = tpl.id === selectedDemoId;
                      return (
                        <TouchableOpacity
                          key={tpl.id}
                          onPress={() => handleSelectDemoTemplate(tpl)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          style={{
                            width: "48.5%",
                            minWidth: 145,
                            backgroundColor: active
                              ? "rgba(228, 59, 85, 0.16)"
                              : "#181621",
                            borderWidth: 1,
                            borderColor: active
                              ? "#e43b55"
                              : "rgba(255,255,255,0.09)",
                            borderRadius: 14,
                            padding: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: "#ffffff",
                              fontSize: 13,
                              fontWeight: "800",
                            }}
                          >
                            {tpl.brand} {tpl.model}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: "#a99ca2",
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            {tpl.year} · {tpl.version}
                          </Text>
                          <Text
                            style={{
                              color: active ? "#ff8c9b" : "#877a80",
                              fontSize: 11,
                              fontWeight: "700",
                              marginTop: 5,
                            }}
                          >
                            {tpl.suggestedKm.toLocaleString("pt-BR")} km ·{" "}
                            {tpl.categoryLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={pStyles.fieldLabel}>
                    Quilometragem atual (ajuste se quiser)
                  </Text>
                  <TextInput
                    style={pStyles.input}
                    value={kmText || String(selectedDemo.suggestedKm)}
                    onChangeText={(t) => {
                      setKmText(t.replace(/[^\d]/g, ""));
                      setError("");
                    }}
                    keyboardType="numeric"
                    placeholder={String(selectedDemo.suggestedKm)}
                    placeholderTextColor="#665d62"
                  />
                </View>
              ) : (
                <View>
                  {/* Busca opcional pela Tabela FIPE existente */}
                  {!editingVehicle && (
                    <View
                      style={{
                        backgroundColor: "#171521",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.08)",
                        borderRadius: 14,
                        padding: 13,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: "#ff8c9b",
                          fontSize: 11,
                          fontWeight: "800",
                          letterSpacing: 0.8,
                          marginBottom: 8,
                        }}
                      >
                        PREENCHIMENTO RÁPIDO VIA TABELA FIPE (OPCIONAL)
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => setModalFipeBrand(true)}
                          disabled={carregandoMarcasFipe || marcasFipe.length === 0}
                          style={[pStyles.secondaryBtn, { flex: 1, minWidth: 120 }]}
                          accessibilityRole="button"
                        >
                          {carregandoMarcasFipe ? (
                            <ActivityIndicator size="small" color="#e43b55" />
                          ) : (
                            <Text
                              numberOfLines={1}
                              style={pStyles.secondaryBtnText}
                            >
                              {fipeBrand ? fipeBrand.name : "Buscar marca FIPE"}
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setModalFipeModel(true)}
                          disabled={loadingFipeModels || fipeModels.length === 0}
                          style={[
                            pStyles.secondaryBtn,
                            {
                              flex: 1,
                              minWidth: 120,
                              opacity: fipeModels.length === 0 ? 0.5 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                        >
                          {loadingFipeModels ? (
                            <ActivityIndicator size="small" color="#e43b55" />
                          ) : (
                            <Text
                              numberOfLines={1}
                              style={pStyles.secondaryBtnText}
                            >
                              {model || "Modelo FIPE"}
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setModalFipeYear(true)}
                          disabled={loadingFipeYears || fipeYears.length === 0}
                          style={[
                            pStyles.secondaryBtn,
                            {
                              minWidth: 96,
                              opacity: fipeYears.length === 0 ? 0.5 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                        >
                          {loadingFipeYears ? (
                            <ActivityIndicator size="small" color="#e43b55" />
                          ) : (
                            <Text style={pStyles.secondaryBtnText}>
                              {yearText || "Ano"}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                      {fipeError !== "" && (
                        <Text
                          style={{ color: "#fcd34d", fontSize: 11, marginTop: 8 }}
                        >
                          {fipeError}
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={pStyles.fieldLabel}>Marca *</Text>
                      <TextInput
                        style={pStyles.input}
                        value={brand}
                        onChangeText={(t) => {
                          setBrand(t);
                          setError("");
                        }}
                        placeholder="Ex.: Chevrolet"
                        placeholderTextColor="#665d62"
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={pStyles.fieldLabel}>Modelo *</Text>
                      <TextInput
                        style={pStyles.input}
                        value={model}
                        onChangeText={(t) => {
                          setModel(t);
                          setError("");
                        }}
                        placeholder="Ex.: Onix"
                        placeholderTextColor="#665d62"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <View style={{ flex: 0.7, minWidth: 110 }}>
                      <Text style={pStyles.fieldLabel}>Ano *</Text>
                      <TextInput
                        style={pStyles.input}
                        value={yearText}
                        onChangeText={(t) => {
                          setYearText(t.replace(/[^\d]/g, "").slice(0, 4));
                          setError("");
                        }}
                        keyboardType="numeric"
                        placeholder="2022"
                        placeholderTextColor="#665d62"
                      />
                    </View>
                    <View style={{ flex: 1.5, minWidth: 160 }}>
                      <Text style={pStyles.fieldLabel}>
                        Versão ou motorização (opcional)
                      </Text>
                      <TextInput
                        style={pStyles.input}
                        value={version}
                        onChangeText={setVersion}
                        placeholder="Ex.: 1.0 Turbo LTZ"
                        placeholderTextColor="#665d62"
                      />
                    </View>
                  </View>

                  <Text style={pStyles.fieldLabel}>Quilometragem atual (km) *</Text>
                  <TextInput
                    style={pStyles.input}
                    value={kmText}
                    onChangeText={(t) => {
                      setKmText(t.replace(/[^\d]/g, ""));
                      setError("");
                    }}
                    keyboardType="numeric"
                    placeholder="Ex.: 45000"
                    placeholderTextColor="#665d62"
                  />
                </View>
              )}

              {/* Estimativa de uso mensal (sempre presente!) */}
              <Text style={pStyles.fieldLabel}>
                Estimativa de uso mensal *
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {MONTHLY_USAGE_OPTIONS.map((opt) => {
                  const selected = monthlyUsage === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setMonthlyUsage(opt.id)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      style={{
                        width: "48.5%",
                        minWidth: 145,
                        backgroundColor: selected
                          ? "rgba(228, 59, 85, 0.16)"
                          : "#181621",
                        borderWidth: 1,
                        borderColor: selected
                          ? "#e43b55"
                          : "rgba(255,255,255,0.09)",
                        borderRadius: 13,
                        padding: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: "800",
                        }}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={{
                          color: selected ? "#ff8c9b" : "#a99ca2",
                          fontSize: 11,
                          fontWeight: "700",
                          marginTop: 2,
                        }}
                      >
                        {opt.rangeLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {error !== "" && (
                <View style={pStyles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                  <Text style={pStyles.errorText}>{error}</Text>
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={onClose}
                style={[pStyles.secondaryBtn, { flex: 1 }]}
                accessibilityRole="button"
              >
                <Text style={pStyles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={
                  mode === "demo" && !editingVehicle
                    ? handleSubmitDemo
                    : handleSubmitCustom
                }
                style={[pStyles.primaryCtaBtn, { flex: 1.6 }]}
                activeOpacity={0.85}
                accessibilityRole="button"
                {...webAttr({ "data-torque-cta": "1" })}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={pStyles.primaryCtaText}>
                  {editingVehicle
                    ? "Salvar alterações"
                    : mode === "demo"
                      ? `Usar ${selectedDemo.brand} ${selectedDemo.model}`
                      : "Cadastrar veículo"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SeletorModal
        visible={modalFipeBrand}
        titulo="Selecionar marca (FIPE)"
        itens={marcasFipe}
        carregando={carregandoMarcasFipe}
        onClose={() => setModalFipeBrand(false)}
        onSelect={handleSelectFipeBrand}
      />

      <SeletorModal
        visible={modalFipeModel}
        titulo="Selecionar modelo (FIPE)"
        itens={fipeModels}
        carregando={loadingFipeModels}
        onClose={() => setModalFipeModel(false)}
        onSelect={handleSelectFipeModel}
      />

      <SeletorModal
        visible={modalFipeYear}
        titulo="Selecionar ano (FIPE)"
        itens={fipeYears}
        carregando={loadingFipeYears}
        onClose={() => setModalFipeYear(false)}
        onSelect={handleSelectFipeYear}
      />
    </>
  );
}
