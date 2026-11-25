import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { buscarModelos } from "../(tabs)/services/fipeApi";
import { styles } from "../(tabs)/styles/styles";
import { ItemAPI } from "../(tabs)/types/vehicle";
import SeletorModal from "./SeletorModal";

type Props = {
  marcas?: ItemAPI[];
  carregandoMarcas?: boolean;
  veiculoAtual?: {
    marca: ItemAPI;
    modelo: ItemAPI;
  } | null;
};

type MaintenanceEstimate = {
  id: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  description: string;
};

type VehicleCondition = "new" | "used" | "";

type MaintenanceRecord = {
  lastKm: string;
  lastDate: string;
  intervalKm: string;
  intervalMonths: string;
  unknown: boolean;
};

function createInitialRecords(condition: VehicleCondition): Record<string, MaintenanceRecord> {
  return Object.fromEntries(ESTIMATES.map((item) => [item.id, {
    lastKm: condition === "new" ? "0" : "",
    lastDate: "",
    intervalKm: "",
    intervalMonths: "",
    unknown: condition !== "new",
  }]));
}

function parseBrazilianDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

const ESTIMATES: MaintenanceEstimate[] = [
  {
    id: "oil",
    name: "Troca de óleo do motor",
    minPrice: 150,
    maxPrice: 350,
    description: "O óleo correto e o intervalo devem seguir o manual do veículo.",
  },
  {
    id: "air-filter",
    name: "Filtro de ar do motor",
    minPrice: 50,
    maxPrice: 120,
    description: "A necessidade depende da inspeção e das condições de uso.",
  },
  {
    id: "fuel-filter",
    name: "Filtro de combustível",
    minPrice: 60,
    maxPrice: 150,
    description: "Aplicável conforme o sistema e a recomendação do fabricante.",
  },
  {
    id: "brake-pads",
    name: "Pastilhas de freio",
    minPrice: 150,
    maxPrice: 400,
    description: "A troca depende da espessura e do estado das pastilhas.",
  },
  {
    id: "tires",
    name: "Jogo de 4 pneus",
    minPrice: 800,
    maxPrice: 2000,
    description: "O valor varia bastante conforme medida, marca e categoria.",
  },
  {
    id: "general-review",
    name: "Revisão preventiva geral",
    minPrice: 300,
    maxPrice: 800,
    description: "Valor de referência; o orçamento depende dos itens necessários.",
  },
];

const MODEL_TO_BRAND: { keywords: string[]; brandHint: string }[] = [
  { keywords: ["corolla", "hilux", "yaris", "sw4", "etios"], brandHint: "toyota" },
  { keywords: ["civic", "hr-v", "hrv", "city", "fit", "cr-v"], brandHint: "honda" },
  { keywords: ["onix", "tracker", "cruze", "s10", "spin", "celta", "prisma", "corsa"], brandHint: "chevrolet" },
  { keywords: ["polo", "gol", "golf", "t-cross", "tcross", "nivus", "virtus", "jetta", "saveiro", "amarok", "fox", "voyage"], brandHint: "volkswagen" },
  { keywords: ["hb20", "creta", "tucson", "ix35"], brandHint: "hyundai" },
  { keywords: ["strada", "argo", "mobi", "toro", "uno", "palio", "pulse", "fastback", "cronos"], brandHint: "fiat" },
  { keywords: ["compass", "renegade", "commander"], brandHint: "jeep" },
  { keywords: ["kwid", "sandero", "duster", "logan", "kardian", "oroch"], brandHint: "renault" },
  { keywords: ["kicks", "versa", "frontier", "sentra"], brandHint: "nissan" },
  { keywords: ["ka", "ecosport", "ranger", "mustang", "territory", "fiesta"], brandHint: "ford" },
  { keywords: ["dolphin", "song", "yuan", "seal", "king"], brandHint: "byd" },
  { keywords: ["320i", "x1", "x3", "x5"], brandHint: "bmw" },
];

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const formatKm = (value: number) => `${value.toLocaleString("pt-BR")} km`;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "");
}

export default function MaintenanceAdvisor({
  marcas = [],
  carregandoMarcas = false,
  veiculoAtual = null,
}: Props) {
  const [marca, setMarca] = useState<ItemAPI | null>(null);
  const [modelo, setModelo] = useState<ItemAPI | null>(null);
  const [modelos, setModelos] = useState<ItemAPI[]>([]);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const [erroFipe, setErroFipe] = useState("");
  const [modalMarca, setModalMarca] = useState(false);
  const [modalModelo, setModalModelo] = useState(false);
  const [carroDigitado, setCarroDigitado] = useState("");
  const [currentKm, setCurrentKm] = useState("");
  const [vehicleCondition, setVehicleCondition] = useState<VehicleCondition>("");
  const [records, setRecords] = useState<Record<string, MaintenanceRecord>>(() => createInitialRecords(""));
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (veiculoAtual) {
      setMarca(veiculoAtual.marca);
      setModelo(veiculoAtual.modelo);
      setCarroDigitado("");
    }
  }, [veiculoAtual]);

  // Recupera o último preenchimento salvo neste navegador.
  useEffect(() => {
    if (Platform.OS !== "web") {
      setStorageReady(true);
      return;
    }
    try {
      const saved = window.localStorage.getItem("torquelab:maintenance:v1");
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.currentKm === "string") setCurrentKm(data.currentKm);
        if (data.vehicleCondition === "new" || data.vehicleCondition === "used") {
          setVehicleCondition(data.vehicleCondition);
        }
        if (data.records && typeof data.records === "object") {
          setRecords({ ...createInitialRecords(""), ...data.records });
        }
        if (Array.isArray(data.excludedIds)) setExcludedIds(data.excludedIds);
      }
    } catch {
      setSaveError("Não foi possível recuperar os dados salvos neste navegador.");
    } finally {
      setStorageReady(true);
    }
  }, []);

  // Salva automaticamente a cada alteração, sem botão.
  useEffect(() => {
    if (!storageReady || Platform.OS !== "web") return;
    try {
      window.localStorage.setItem("torquelab:maintenance:v1", JSON.stringify({
        currentKm,
        vehicleCondition,
        records,
        excludedIds,
      }));
      setSaveError("");
    } catch {
      setSaveError("Não foi possível salvar. Verifique o espaço disponível no navegador.");
    }
  }, [storageReady, currentKm, vehicleCondition, records, excludedIds]);

  async function selecionarMarcaFipe(item: ItemAPI, abrirModelosDepois = false) {
    setMarca(item);
    setModelo(null);
    setModelos([]);
    setErroFipe("");

    try {
      setCarregandoModelos(true);
      const lista = await buscarModelos(item.code);
      setModelos(lista);
      if (abrirModelosDepois) setModalModelo(true);
    } catch {
      setErroFipe("Não foi possível carregar os modelos desta marca na FIPE.");
    } finally {
      setCarregandoModelos(false);
    }
  }

  function selecionarModeloFipe(item: ItemAPI) {
    setModelo(item);
    setCarroDigitado("");
    setErroFipe("");
  }

  const marcaSugerida = useMemo(() => {
    const termo = normalizeText(carroDigitado.trim());
    if (termo.length < 2 || marcas.length === 0) return null;
    const direto = marcas.find((m) => normalizeText(m.name).includes(termo));
    if (direto) return direto;
    const matchModelo = MODEL_TO_BRAND.find((entry) =>
      entry.keywords.some((kw) => termo.includes(kw))
    );
    if (!matchModelo) return null;
    return marcas.find((m) => normalizeText(m.name).includes(matchModelo.brandHint)) ?? null;
  }, [carroDigitado, marcas]);

  const activeVehicleLabel = useMemo(() => {
    const typed = carroDigitado.trim();
    if (typed) return typed;
    if (marca && modelo) return `${marca.name} ${modelo.name}`;
    if (marca) return marca.name;
    return "Veículo não identificado";
  }, [carroDigitado, marca, modelo]);

  const kmNumber = Number(currentKm);
  const validKm = currentKm.trim() !== "" && Number.isFinite(kmNumber) && kmNumber >= 0;

  const selectedItems = ESTIMATES.filter((item) => !excludedIds.includes(item.id));
  const totalMin = selectedItems.reduce((sum, item) => sum + item.minPrice, 0);
  const totalMax = selectedItems.reduce((sum, item) => sum + item.maxPrice, 0);

  function toggleItem(id: string) {
    setExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function changeVehicleCondition(condition: VehicleCondition) {
    setVehicleCondition(condition);
    setRecords(createInitialRecords(condition));
  }

  function updateRecord(id: string, field: keyof MaintenanceRecord, value: string | boolean) {
    setRecords((previous) => ({
      ...previous,
      [id]: { ...previous[id], [field]: value },
    }));
  }

  function getMaintenanceStatus(item: MaintenanceEstimate) {
    const record = records[item.id];
    if (!record || record.unknown) return "Histórico não informado";
    const lastKm = Number(record.lastKm);
    const intervalKm = Number(record.intervalKm);
    const intervalMonths = Number(record.intervalMonths);
    const hasKmData = record.lastKm.trim() !== "" && Number.isFinite(lastKm) && lastKm >= 0 && intervalKm > 0;
    const lastDate = parseBrazilianDate(record.lastDate);
    const hasDateData = Boolean(lastDate && intervalMonths > 0);
    if (!hasKmData && !hasDateData) return "Preencha o histórico e o intervalo do manual";

    const kmRemaining = hasKmData ? lastKm + intervalKm - kmNumber : null;
    const nextDate = hasDateData && lastDate
      ? new Date(lastDate.getFullYear(), lastDate.getMonth() + intervalMonths, lastDate.getDate())
      : null;
    const dateDue = Boolean(nextDate && new Date() >= nextDate);
    const kmDue = kmRemaining !== null && kmRemaining <= 0;
    if (dateDue || kmDue) return "Intervalo atingido: confira a manutenção";
    if (kmRemaining !== null && kmRemaining <= 1000) {
      return `Próxima em aproximadamente ${formatKm(Math.max(0, kmRemaining))}`;
    }
    if (kmRemaining !== null) return `Próxima em ${formatKm(kmRemaining)}`;
    if (nextDate) return `Próxima até ${nextDate.toLocaleDateString("pt-BR")}`;
    return "Dados insuficientes";
  }

  return (
    <View
      nativeID="maintenance-section"
      style={[styles.card, { marginTop: 18 }]}
      {...(Platform.OS === "web" ? ({ "data-torque-card": "1" } as object) : {})}
    >
      <View style={styles.sectionKicker}>
        <Text style={styles.sectionKickerText}>03 / REVISÃO & CUSTOS</Text>
      </View>
      <Text style={styles.tituloSecao}>Planejador de manutenção</Text>
      <Text style={styles.descricaoSecao}>
        Registre o histórico do veículo e informe os intervalos indicados no manual. O sistema só calcula a próxima manutenção quando há dados suficientes.
      </Text>

      <View {...(Platform.OS === "web" ? ({ "data-torque-columns": "1" } as object) : {})}>
        <View>
          {veiculoAtual && (
            <View style={{ alignSelf: "flex-start", backgroundColor: "#1a1f1a", borderWidth: 1, borderColor: "#2a4a2a", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 14 }}>
              <Text style={{ color: "#7ec67e", fontSize: 11, fontWeight: "600" }}>
                ✓ Veículo do simulador: {veiculoAtual.marca.name} {veiculoAtual.modelo.name}
              </Text>
            </View>
          )}

          <Text style={styles.label}>1. Identifique seu veículo (opcional)</Text>
          <View style={styles.linha}>
            <View style={[styles.campoMetade, styles.campoEsquerda]}>
              <TouchableOpacity
                style={[styles.seletor, (carregandoMarcas || marcas.length === 0) && styles.desativado]}
                disabled={carregandoMarcas || marcas.length === 0}
                activeOpacity={0.8}
                onPress={() => setModalMarca(true)}
                accessibilityRole="button"
              >
                <Text numberOfLines={1} style={[styles.seletorTexto, !marca && styles.placeholder]}>
                  {carregandoMarcas ? "Carregando..." : marca?.name || "Selecionar marca"}
                </Text>
                {carregandoMarcas ? <ActivityIndicator size="small" color="#ef3340" /> : <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.campoMetade}>
              <TouchableOpacity
                style={[styles.seletor, (!marca || carregandoModelos || modelos.length === 0) && styles.desativado]}
                disabled={!marca || carregandoModelos || modelos.length === 0}
                activeOpacity={0.8}
                onPress={() => setModalModelo(true)}
                accessibilityRole="button"
              >
                <Text numberOfLines={1} style={[styles.seletorTexto, !modelo && styles.placeholder]}>
                  {carregandoModelos ? "Carregando..." : modelo?.name || (marca ? "Selecionar modelo" : "Escolha a marca")}
                </Text>
                {carregandoModelos ? <ActivityIndicator size="small" color="#ef3340" /> : <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {erroFipe !== "" && <Text style={{ color: "#ff8797", fontSize: 11, marginBottom: 10 }}>{erroFipe}</Text>}

          <Text style={styles.label}>Ou digite o nome do carro</Text>
          <TextInput
            value={carroDigitado}
            onChangeText={(texto) => {
              setCarroDigitado(texto);
              if (texto.trim()) setErroFipe("");
            }}
            placeholder="Ex.: Honda Civic, Hilux, BYD Dolphin..."
            placeholderTextColor="#6f6267"
            style={[styles.input, { marginBottom: marcaSugerida ? 8 : 14 }]}
          />

          {marcaSugerida && carroDigitado.trim().length >= 2 && (
            <TouchableOpacity
              onPress={() => selecionarMarcaFipe(marcaSugerida, true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={{ alignSelf: "flex-start", backgroundColor: "#1d1419", borderWidth: 1, borderColor: "#57313b", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7, marginBottom: 14 }}
            >
              <Text style={{ color: "#ff8797", fontSize: 11, fontWeight: "700" }}>
                Ver modelos de {marcaSugerida.name} na FIPE →
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>2. O veículo é novo ou usado?</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {(["new", "used"] as const).map((condition) => {
              const active = vehicleCondition === condition;
              return (
                <TouchableOpacity
                  key={condition}
                  onPress={() => changeVehicleCondition(condition)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: active ? "#e43b55" : "#3a2d33", backgroundColor: active ? "#2b161d" : "#151218", alignItems: "center" }}
                >
                  <Text style={{ color: active ? "#ff8797" : "#d1c4c8", fontSize: 13, fontWeight: "800" }}>
                    {condition === "new" ? "Zero km" : "Usado"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {vehicleCondition !== "" && (
            <Text style={{ color: "#9d8e93", fontSize: 11, lineHeight: 16, marginBottom: 12 }}>
              {vehicleCondition === "new"
                ? "O histórico começa em 0 km. Informe a data de entrega se quiser acompanhar também os prazos por tempo."
                : "Para carro usado, cada item começa sem histórico. Se não souber quando foi feita a manutenção, mantenha essa opção sem registro."}
            </Text>
          )}

          <Text style={styles.label}>3. Quilometragem atual</Text>
          <TextInput
            value={currentKm}
            onChangeText={(value) => setCurrentKm(value.replace(/[^0-9]/g, "").slice(0, 7))}
            keyboardType="numeric"
            placeholder="Informe a quilometragem atual"
            placeholderTextColor="#6f6267"
            style={[styles.input, { marginBottom: 14 }]}
          />

          <Text style={styles.label}>4. Histórico e intervalos de manutenção</Text>
          <Text style={{ color: "#9d8e93", fontSize: 11, lineHeight: 16, marginBottom: 10 }}>
            Para cada serviço, informe a última manutenção e o intervalo recomendado no manual da versão exata do carro. Use km e/ou meses.
          </Text>
          {vehicleCondition === "" ? (
            <Text style={{ color: "#ffb7c1", fontSize: 12, lineHeight: 18, marginBottom: 14 }}>
              Selecione primeiro se o veículo é zero km ou usado para preencher o histórico.
            </Text>
          ) : (
            ESTIMATES.map((item) => {
              const record = records[item.id];
              return (
                <View key={item.id} style={{ backgroundColor: "#100e13", borderWidth: 1, borderColor: "#34252d", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800", marginBottom: 8 }}>{item.name}</Text>
                  <TouchableOpacity
                    onPress={() => updateRecord(item.id, "unknown", !record.unknown)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: record.unknown }}
                    style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}
                  >
                    <View style={{ width: 17, height: 17, borderRadius: 4, borderWidth: 1, borderColor: record.unknown ? "#e43b55" : "#66545b", backgroundColor: record.unknown ? "#e43b55" : "transparent", alignItems: "center", justifyContent: "center" }}>
                      {record.unknown && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>✓</Text>}
                    </View>
                    <Text style={{ color: "#c6b8bd", fontSize: 11 }}>Não sei / não tenho esse histórico</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#a8999e", fontSize: 10, marginBottom: 5 }}>Última manutenção (km)</Text>
                      <TextInput
                        value={record.lastKm}
                        editable={!record.unknown}
                        onChangeText={(value) => updateRecord(item.id, "lastKm", value.replace(/[^0-9]/g, "").slice(0, 7))}
                        keyboardType="numeric"
                        placeholder="Ex.: 50000"
                        placeholderTextColor="#6f6267"
                        style={[styles.input, { opacity: record.unknown ? 0.45 : 1, marginBottom: 9 }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#a8999e", fontSize: 10, marginBottom: 5 }}>Data (DD/MM/AAAA)</Text>
                      <TextInput
                        value={record.lastDate}
                        editable={!record.unknown}
                        onChangeText={(value) => updateRecord(item.id, "lastDate", value.slice(0, 10))}
                        keyboardType="numbers-and-punctuation"
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor="#6f6267"
                        style={[styles.input, { opacity: record.unknown ? 0.45 : 1, marginBottom: 9 }]}
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#a8999e", fontSize: 10, marginBottom: 5 }}>Intervalo do manual (km)</Text>
                      <TextInput
                        value={record.intervalKm}
                        onChangeText={(value) => updateRecord(item.id, "intervalKm", value.replace(/[^0-9]/g, "").slice(0, 7))}
                        keyboardType="numeric"
                        placeholder="Ex.: 10000"
                        placeholderTextColor="#6f6267"
                        style={[styles.input, { marginBottom: 8 }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#a8999e", fontSize: 10, marginBottom: 5 }}>Intervalo do manual (meses)</Text>
                      <TextInput
                        value={record.intervalMonths}
                        onChangeText={(value) => updateRecord(item.id, "intervalMonths", value.replace(/[^0-9]/g, "").slice(0, 3))}
                        keyboardType="numeric"
                        placeholder="Ex.: 12"
                        placeholderTextColor="#6f6267"
                        style={[styles.input, { marginBottom: 8 }]}
                      />
                    </View>
                  </View>
                  <Text style={{ color: "#ffb2be", fontSize: 11, lineHeight: 16 }}>
                    {validKm ? getMaintenanceStatus(item) : "Informe a quilometragem atual para calcular."}
                  </Text>
                </View>
              );
            })
          )}

          <Text style={{ color: "#9d8e93", fontSize: 11, lineHeight: 17 }}>
            Veículo selecionado: <Text style={{ color: "#e8dde0", fontWeight: "700" }}>{activeVehicleLabel}</Text>
          </Text>
          <Text style={{ color: saveError ? "#ff8797" : "#78c99a", fontSize: 10, marginTop: 8 }}>
            {saveError || (storageReady ? "✓ Salvamento automático ativado neste navegador" : "Carregando dados salvos...")}
          </Text>
        </View>

        <View style={{ backgroundColor: "#0c0b10", borderWidth: 1, borderColor: "#3e2b34", borderRadius: 16, padding: 18 }}>
          {!validKm ? (
            <Text style={{ color: "#b8a9ae", fontSize: 13, lineHeight: 20 }}>
              Informe uma quilometragem válida para registrar o contexto da sua estimativa.
            </Text>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#261d22", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: "#ff8797", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }}>
                    {activeVehicleLabel.toUpperCase()} • {formatKm(kmNumber)}
                  </Text>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 3 }}>
                    Estimativa de custos
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: "#a8999e", fontSize: 10, fontWeight: "700" }}>TOTAL DOS ITENS MARCADOS</Text>
                  <Text style={{ color: "#43c977", fontSize: 18, fontWeight: "900", marginTop: 1 }}>
                    {brl.format(totalMin)} – {brl.format(totalMax)}
                  </Text>
                </View>
              </View>

              {ESTIMATES.map((item) => {
                const checked = !excludedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#1f181c", gap: 10, opacity: checked ? 1 : 0.45 }}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: checked ? "#e43b55" : "#56434a", backgroundColor: checked ? "#e43b55" : "transparent", alignItems: "center", justifyContent: "center" }}>
                      {checked && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", textDecorationLine: checked ? "none" : "line-through" }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: "#9f9095", fontSize: 11, marginTop: 3, lineHeight: 16 }}>
                        {item.description}
                      </Text>
                    </View>
                    <Text style={{ color: checked ? "#fff" : "#8b7c81", fontSize: 12, fontWeight: "800" }}>
                      {brl.format(item.minPrice)}–{brl.format(item.maxPrice)}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={{ backgroundColor: "#1a1216", borderWidth: 1, borderColor: "#63323e", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 }}>
                <Text style={{ color: "#ff8797", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }}>PREVISÃO DOS ITENS SELECIONADOS</Text>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4 }}>
                  {brl.format(totalMin)} – {brl.format(totalMax)}
                </Text>
                <Text style={{ color: "#bdaeb3", fontSize: 11, marginTop: 4 }}>
                  {selectedItems.length} {selectedItems.length === 1 ? "serviço marcado" : "serviços marcados"}. Desmarque o que não deseja incluir na simulação.
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={{ marginTop: 14, padding: 12, backgroundColor: "#171217", borderWidth: 1, borderColor: "#46313a", borderRadius: 10 }}>
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800", marginBottom: 5 }}>Importante: os intervalos precisam vir do manual</Text>
        <Text style={{ color: "#b8a9ae", fontSize: 11, lineHeight: 17 }}>
          A FIPE identifica marca e modelo, mas não fornece o plano de manutenção. Por isso, o TorqueLab não inventa intervalos: preencha os campos com os valores do manual da motorização e ano exatos. O cálculo considera o que ocorrer primeiro entre quilometragem e tempo, quando ambos forem informados. Se o histórico for desconhecido, o sistema não presume que a peça foi trocada nem que está vencida; procure registros ou peça uma inspeção profissional. Em caso de uso severo, siga a orientação específica do fabricante.
        </Text>
        <Text style={{ color: "#9f9095", fontSize: 10, lineHeight: 15, marginTop: 8 }}>
          Os valores de serviços exibidos são faixas aproximadas para planejamento, não uma média estatística de todos os veículos nem uma cotação atual. Solicite orçamento para o modelo e a região.
        </Text>
        <Text style={{ color: "#9f9095", fontSize: 10, lineHeight: 15, marginTop: 4 }}>
          Consulte a fonte: https://www.ipiranga.com.br/wps/portal/pt-br/ipiranga/blog-ipiranga/categorias/dicas-para-motoristas/carro-quanto-custa-manter
        </Text>
      </View>

      <SeletorModal
        visible={modalMarca}
        titulo="Selecionar marca (manutenção)"
        itens={marcas}
        carregando={carregandoMarcas}
        onClose={() => setModalMarca(false)}
        onSelect={(item) => selecionarMarcaFipe(item, false)}
      />

      <SeletorModal
        visible={modalModelo}
        titulo={`Modelo${marca ? ` · ${marca.name}` : ""}`}
        itens={modelos}
        carregando={carregandoModelos}
        onClose={() => setModalModelo(false)}
        onSelect={selecionarModeloFipe}
      />
    </View>
  );
}
