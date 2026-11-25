import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AboutSection from "../components/AboutSection";
import CarGuide, { ExemploVeiculo } from "../components/CarGuide";
import Header from "../components/Header";
import MaintenanceAdvisor from "../components/MaintenanceAdvisor";
import ProgressSteps from "../components/ProgressSteps";
import ResultCard from "../components/ResultCard";
import SavedAnalyses from "../components/SavedAnalyses";
import SeletorModal from "../components/SeletorModal";
import TripCalculator from "../components/TripCalculator";
import VehicleForm from "../components/VehicleForm";
import VehicleSelector from "../components/VehicleSelector";

import AccountMenu from "@/components/auth/AccountMenu";
import AdminPortalShell from "@/components/auth/AdminPortalShell";
import AuthScreen from "@/components/auth/AuthScreen";
import RoleGuard from "@/components/auth/RoleGuard";
import PreventiveDashboard from "@/components/preventive/PreventiveDashboard";
import ServiceHistorySection from "@/components/preventive/ServiceHistorySection";
import VehicleRegistrationModal from "@/components/preventive/VehicleRegistrationModal";
import { pStyles } from "@/components/preventive/styles";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  formatKm,
  recordMaintenanceCompletion,
} from "@/lib/preventive/engine";
import {
  loadPreventiveStore,
  savePreventiveStore,
} from "@/lib/preventive/storage";
import {
  CustomIntervalOverride,
  MaintenanceItemId,
  PreventiveStoreState,
  PreventiveVehicle,
  TirePressureSpec,
} from "@/lib/preventive/types";

import {
  buscarAnos,
  buscarDadosFipe,
  buscarMarcas,
  buscarModelos,
} from "./services/fipeApi";
import { carregarAnalises, gravarAnalises } from "./services/savedAnalyses";

import { AnaliseSalva } from "./types/savedAnalysis";
import {
  CondicaoPneu,
  DadosAtuais,
  DadosFipe,
  ItemAPI,
  Resultado,
  TipoPneu,
  TipoUso,
} from "./types/vehicle";

import { styles } from "./styles/styles";
import { analisarVeiculo } from "./utils/analyzer";
import { validarDados } from "./utils/validators";

const webAttr = (attrs: Record<string, string>) =>
  Platform.OS === "web" ? (attrs as object) : {};

type AppSection = "dashboard" | "history" | "simulator";

export default function HomeScreen() {
  const {
    status: authStatus,
    activePortal,
    ownerId,
    permissionNotice,
    clearPermissionNotice,
  } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const entrada = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevAuthStatusRef = useRef(authStatus);

  // Navegação principal em abas limpas (Painel do Carro é a tela principal para autenticados)
  const [activeSection, setActiveSection] = useState<AppSection>("simulator");

  // Estado persistido do Assistente Preventivo particionado por ownerId
  const [preventiveStore, setPreventiveStore] = useState<PreventiveStoreState>({
    version: 1,
    ownerId,
    activeVehicleId: null,
    vehicles: [],
  });
  const [storeReady, setStoreReady] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<PreventiveVehicle | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState("");

  // Estado do Simulador FIPE existente (preservado integralmente)
  const [marcas, setMarcas] = useState<ItemAPI[]>([]);
  const [modelos, setModelos] = useState<ItemAPI[]>([]);
  const [anos, setAnos] = useState<ItemAPI[]>([]);

  const [marca, setMarca] = useState<ItemAPI | null>(null);
  const [modelo, setModelo] = useState<ItemAPI | null>(null);
  const [ano, setAno] = useState<ItemAPI | null>(null);

  const [dadosFipe, setDadosFipe] = useState<DadosFipe | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [modoDemonstracao, setModoDemonstracao] = useState(false);
  const [dadosAnalisados, setDadosAnalisados] = useState<DadosAtuais | null>(
    null
  );
  const [analisesSalvas, setAnalisesSalvas] = useState<AnaliseSalva[]>([]);
  const [avisoSalvamento, setAvisoSalvamento] = useState("");
  const [analiseSalvaId, setAnaliseSalvaId] = useState<string | null>(null);

  const [km, setKm] = useState("");
  const [peso, setPeso] = useState("");
  const [calibragem, setCalibragem] = useState("");
  const [mesesUltimaRevisao, setMesesUltimaRevisao] = useState("");
  const [tipoPneu, setTipoPneu] = useState<TipoPneu | null>(null);
  const [tipoUso, setTipoUso] = useState<TipoUso | null>(null);
  const [condicaoPneu, setCondicaoPneu] = useState<CondicaoPneu | null>(null);

  const [mensagem, setMensagem] = useState("");
  const [carregandoMarcas, setCarregandoMarcas] = useState(false);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const [carregandoAnos, setCarregandoAnos] = useState(false);
  const [carregandoFipe, setCarregandoFipe] = useState(false);
  const [analisando, setAnalisando] = useState(false);

  const [modalMarca, setModalMarca] = useState(false);
  const [modalModelo, setModalModelo] = useState(false);
  const [modalAno, setModalAno] = useState(false);

  function showToast(message: string) {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage("");
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    carregarMarcas();
    Animated.timing(entrada, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrada]);

  useEffect(() => {
    let ativo = true;
    carregarAnalises().then((analises) => {
      if (ativo) setAnalisesSalvas(analises);
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Ajusta a aba inicial ao entrar como usuário autenticado ou visitante
  useEffect(() => {
    const previous = prevAuthStatusRef.current;
    prevAuthStatusRef.current = authStatus;

    if (authStatus === "authenticated" && previous !== "authenticated") {
      setActiveSection("dashboard");
    } else if (authStatus === "guest" && previous !== "guest") {
      setActiveSection("simulator");
    }
  }, [authStatus]);

  // Carrega persistência do Assistente Preventivo sempre que ownerId mudar
  useEffect(() => {
    let ativo = true;
    setStoreReady(false);
    loadPreventiveStore(ownerId).then((loaded) => {
      if (!ativo) return;
      setPreventiveStore(loaded);
      setStoreReady(true);
    });
    return () => {
      ativo = false;
    };
  }, [ownerId]);

  const activeVehicle = useMemo(() => {
    if (preventiveStore.vehicles.length === 0) return null;
    return (
      preventiveStore.vehicles.find(
        (v) => v.id === preventiveStore.activeVehicleId
      ) ?? preventiveStore.vehicles[0]
    );
  }, [preventiveStore]);

  function persistStore(next: PreventiveStoreState) {
    const scopedNext: PreventiveStoreState = {
      ...next,
      ownerId,
    };
    setPreventiveStore(scopedNext);
    void savePreventiveStore(scopedNext);
  }

  function handleSaveVehicle(vehicle: PreventiveVehicle, isEdit: boolean) {
    const ownedVehicle: PreventiveVehicle = {
      ...vehicle,
      ownerId,
    };

    if (isEdit) {
      const nextVehicles = preventiveStore.vehicles.map((v) =>
        v.id === ownedVehicle.id ? ownedVehicle : v
      );
      persistStore({
        ...preventiveStore,
        activeVehicleId: ownedVehicle.id,
        vehicles: nextVehicles,
      });
      showToast(
        `Veículo ${ownedVehicle.brand} ${ownedVehicle.model} atualizado com sucesso.`
      );
    } else {
      const nextVehicles = [ownedVehicle, ...preventiveStore.vehicles];
      persistStore({
        ...preventiveStore,
        activeVehicleId: ownedVehicle.id,
        vehicles: nextVehicles,
      });
      showToast(
        `${ownedVehicle.brand} ${ownedVehicle.model} ${ownedVehicle.year} cadastrado! Painel atualizado.`
      );
    }
    setEditingVehicle(null);
  }

  function handleSelectVehicle(id: string) {
    persistStore({
      ...preventiveStore,
      activeVehicleId: id,
    });
  }

  function handleUpdateKm(newKm: number) {
    if (!activeVehicle) return;
    const updatedVehicle: PreventiveVehicle = {
      ...activeVehicle,
      currentKm: newKm,
      updatedAt: new Date().toISOString(),
    };
    const nextVehicles = preventiveStore.vehicles.map((v) =>
      v.id === activeVehicle.id ? updatedVehicle : v
    );
    persistStore({
      ...preventiveStore,
      vehicles: nextVehicles,
    });
    showToast(
      `Quilometragem atualizada para ${formatKm(newKm)}. Todos os cálculos foram atualizados.`
    );
  }

  function handleCompleteMaintenance(params: {
    itemId: MaintenanceItemId;
    performedDate: string;
    performedKm: number;
    notes?: string;
  }) {
    if (!activeVehicle) return;
    const { vehicle: updatedVehicle, historyEntry } =
      recordMaintenanceCompletion(activeVehicle, params.itemId, params);

    const nextVehicles = preventiveStore.vehicles.map((v) =>
      v.id === activeVehicle.id ? updatedVehicle : v
    );
    persistStore({
      ...preventiveStore,
      vehicles: nextVehicles,
    });
    showToast(
      `“${historyEntry.serviceName}” registrada em ${formatKm(
        historyEntry.performedKm
      )}! Status atualizado para Verde e salvo no histórico.`
    );
  }

  function handleSaveCustomInterval(
    itemId: MaintenanceItemId,
    override: CustomIntervalOverride | null
  ) {
    if (!activeVehicle) return;
    const nextCustom = { ...activeVehicle.customIntervals };
    if (override === null) {
      delete nextCustom[itemId];
    } else {
      nextCustom[itemId] = override;
    }
    const updatedVehicle: PreventiveVehicle = {
      ...activeVehicle,
      customIntervals: nextCustom,
      updatedAt: new Date().toISOString(),
    };
    const nextVehicles = preventiveStore.vehicles.map((v) =>
      v.id === activeVehicle.id ? updatedVehicle : v
    );
    persistStore({
      ...preventiveStore,
      vehicles: nextVehicles,
    });
    showToast(
      override === null
        ? "Intervalo restaurado para a referência demonstrativa."
        : "Intervalo ajustado conforme o manual do seu veículo."
    );
  }

  function handleSaveTirePressure(spec: TirePressureSpec) {
    if (!activeVehicle) return;
    const updatedVehicle: PreventiveVehicle = {
      ...activeVehicle,
      tirePressure: spec,
      updatedAt: new Date().toISOString(),
    };
    const nextVehicles = preventiveStore.vehicles.map((v) =>
      v.id === activeVehicle.id ? updatedVehicle : v
    );
    persistStore({
      ...preventiveStore,
      vehicles: nextVehicles,
    });
    showToast("Pressões de calibragem (PSI) da etiqueta salvas no seu guia.");
  }

  function switchSection(section: AppSection) {
    setActiveSection(section);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  // ===== Funções originais do Simulador FIPE (preservadas) =====
  const passo: 1 | 2 | 3 = resultado ? 3 : dadosFipe ? 2 : 1;

  function rolarParaResultado() {
    setTimeout(() => {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const el = document.querySelector("#result-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }

  async function carregarMarcas() {
    try {
      setMensagem("");
      setCarregandoMarcas(true);
      const dados = await buscarMarcas();
      setMarcas(dados);
    } catch (erro) {
      console.log(erro);
      setMensagem(
        "Sem conexão com a tabela FIPE no momento. Verifique a internet e toque em Tentar novamente."
      );
    } finally {
      setCarregandoMarcas(false);
    }
  }

  async function selecionarMarca(item: ItemAPI) {
    setModoDemonstracao(false);
    setMarca(item);
    setModelo(null);
    setAno(null);
    setDadosFipe(null);
    setResultado(null);
    setModelos([]);
    setAnos([]);

    try {
      setMensagem("");
      setCarregandoModelos(true);
      const dados = await buscarModelos(item.code);
      setModelos(dados);
    } catch {
      setMensagem(
        "Não foi possível carregar os modelos desta marca. Tente outra marca ou aguarde e tente de novo."
      );
    } finally {
      setCarregandoModelos(false);
    }
  }

  async function selecionarModelo(item: ItemAPI) {
    if (!marca) return;

    setModelo(item);
    setAno(null);
    setDadosFipe(null);
    setResultado(null);
    setAnos([]);

    try {
      setMensagem("");
      setCarregandoAnos(true);
      const dados = await buscarAnos(marca.code, item.code);
      setAnos(dados);
    } catch {
      setMensagem(
        "Não foi possível carregar os anos deste modelo. Tente novamente em instantes."
      );
    } finally {
      setCarregandoAnos(false);
    }
  }

  async function selecionarAno(item: ItemAPI) {
    if (!marca || !modelo) return;

    setAno(item);
    setDadosFipe(null);
    setResultado(null);

    try {
      setMensagem("");
      setCarregandoFipe(true);
      const dados = await buscarDadosFipe(marca.code, modelo.code, item.code);
      setDadosFipe(dados);
    } catch {
      setMensagem(
        "Não foi possível obter o valor FIPE deste veículo. Confira a seleção ou tente de novo."
      );
    } finally {
      setCarregandoFipe(false);
    }
  }

  function aplicarExemplo(exemplo: ExemploVeiculo) {
    setKm(exemplo.km);
    setPeso(exemplo.peso);
    setCalibragem(exemplo.calibragem);
    setMesesUltimaRevisao(exemplo.mesesUltimaRevisao);
    setTipoPneu(exemplo.tipoPneu);
    setTipoUso(exemplo.tipoUso);
    setCondicaoPneu(exemplo.condicaoPneu);
    setMensagem("");
    setAvisoSalvamento(
      `Formulário preenchido com o exemplo “${exemplo.titulo}”. Ajuste os valores ou clique em Analisar veículo.`
    );
  }

  function analisar() {
    const ehDemo = dadosFipe?.codeFipe === "DEMONSTRACAO";
    setModoDemonstracao(ehDemo);

    const erro = validarDados({
      marca,
      modelo,
      ano,
      dadosFipe,
      km,
      peso,
      calibragem,
      tipoPneu: tipoPneu ?? "",
      tipoUso: tipoUso ?? "",
      condicaoPneu: condicaoPneu ?? "",
      mesesUltimaRevisao,
    });

    if (erro) {
      setMensagem(erro);
      return;
    }

    if (!dadosFipe || !tipoPneu || !tipoUso || !condicaoPneu) {
      return;
    }

    setMensagem("");
    setAnalisando(true);

    const dadosAtuais: DadosAtuais = {
      km: Number(km),
      peso: Number(peso),
      calibragem: Number(calibragem),
      pneu: tipoPneu,
      tipoUso,
      condicaoPneu,
      mesesUltimaRevisao: Number(mesesUltimaRevisao),
    };
    const novoResultado = analisarVeiculo(dadosFipe, dadosAtuais);

    setResultado(novoResultado);
    setDadosAnalisados(dadosAtuais);
    setAvisoSalvamento("");
    setAnaliseSalvaId(null);

    setTimeout(() => {
      setAnalisando(false);
      rolarParaResultado();
    }, 350);
  }

  function limpar() {
    setModoDemonstracao(false);
    setMarca(null);
    setModelo(null);
    setAno(null);
    setModelos([]);
    setAnos([]);
    setDadosFipe(null);
    setResultado(null);
    setDadosAnalisados(null);
    setAvisoSalvamento("");
    setAnaliseSalvaId(null);
    setKm("");
    setPeso("");
    setCalibragem("");
    setMesesUltimaRevisao("");
    setTipoPneu(null);
    setTipoUso(null);
    setCondicaoPneu(null);
    setMensagem("");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function salvarAnalise() {
    if (
      !resultado ||
      !dadosFipe ||
      !dadosAnalisados ||
      !marca ||
      !modelo ||
      !ano ||
      analiseSalvaId
    ) {
      return;
    }
    const nova: AnaliseSalva = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      salvaEm: new Date().toISOString(),
      nome: `${dadosFipe.brand} ${dadosFipe.model} · ${dadosFipe.modelYear}`,
      fipe: dadosFipe,
      dados: dadosAnalisados,
      resultado,
      selecao: { marca, modelo, ano },
    };
    const atualizadas = [nova, ...analisesSalvas];
    if (await gravarAnalises(atualizadas)) {
      setAnalisesSalvas(atualizadas);
      setAnaliseSalvaId(nova.id);
      setAvisoSalvamento("Análise salva neste dispositivo.");
    } else {
      setAvisoSalvamento("Não foi possível salvar neste dispositivo.");
    }
  }

  async function excluirAnalise(id: string) {
    const atualizadas = analisesSalvas.filter((item) => item.id !== id);
    if (await gravarAnalises(atualizadas)) {
      setAnalisesSalvas(atualizadas);
      if (analiseSalvaId === id) {
        setAnaliseSalvaId(null);
        setAvisoSalvamento("");
      }
    }
  }

  async function renomearAnalise(id: string, nome: string) {
    const atualizadas = analisesSalvas.map((item) =>
      item.id === id ? { ...item, nome } : item
    );
    if (await gravarAnalises(atualizadas)) {
      setAnalisesSalvas(atualizadas);
    }
  }

  function abrirAnalise(analise: AnaliseSalva) {
    setModoDemonstracao(false);
    setMarca(analise.selecao.marca);
    setModelo(analise.selecao.modelo);
    setAno(analise.selecao.ano);
    setDadosFipe(analise.fipe);
    setResultado(analise.resultado);
    setDadosAnalisados(analise.dados);
    setKm(String(analise.dados.km));
    setPeso(String(analise.dados.peso));
    setCalibragem(String(analise.dados.calibragem));
    setMesesUltimaRevisao(String(analise.dados.mesesUltimaRevisao));
    setTipoPneu(analise.dados.pneu);
    setTipoUso(analise.dados.tipoUso);
    setCondicaoPneu(analise.dados.condicaoPneu);
    setAvisoSalvamento("");
    setAnaliseSalvaId(analise.id);
    rolarParaResultado();
  }

  const entradaY = entrada.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  const advisorVehicle =
    marca && modelo && !modoDemonstracao
      ? { marca, modelo }
      : activeVehicle
        ? {
            marca: { code: `veh-${activeVehicle.id}`, name: activeVehicle.brand },
            modelo: {
              code: `mod-${activeVehicle.id}`,
              name: `${activeVehicle.model}${
                activeVehicle.version ? ` ${activeVehicle.version}` : ""
              }`,
            },
          }
        : null;

  const historyCount = activeVehicle?.history.length ?? 0;

  if (authStatus === "loading") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#09090c",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Image
          source={require("../../assets/images/torquelab-logo.png")}
          style={{ height: 56, width: 156, marginBottom: 20 }}
          resizeMode="contain"
          accessibilityLabel="TorqueLab"
        />
        <ActivityIndicator color="#e43b55" size="large" />
        <Text
          style={{
            color: "#b7aab0",
            fontSize: 13,
            fontWeight: "600",
            marginTop: 14,
          }}
        >
          Verificando sua sessão...
        </Text>
      </View>
    );
  }

  if (authStatus === "unauthenticated") {
    return <AuthScreen />;
  }

  if (authStatus === "authenticated" && activePortal === "admin") {
    return (
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={pStyles.navShell}
          {...webAttr({ "data-torque-mode-topbar": "1" })}
        >
          <View style={pStyles.navBrandRow}>
            <Image
              source={require("../../assets/images/torquelab-logo.png")}
              style={[styles.logoImagem, { height: 52, width: 138 }]}
              resizeMode="contain"
              accessibilityLabel="TorqueLab"
            />
          </View>

          <AccountMenu />
        </View>

        <RoleGuard requiredRole="admin">
          <AdminPortalShell />
        </RoleGuard>

        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/torquelab-logo.png")}
            style={styles.footerLogoImagem}
            resizeMode="contain"
            accessibilityLabel="TorqueLab"
          />
          <Text style={styles.footerTexto}>
            TorqueLab · Painel Administrativo • {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: entrada,
            transform: [{ translateY: entradaY }],
          }}
        >
          {/* Barra superior moderna do TorqueLab com navegação limpa entre seções */}
          <View
            style={pStyles.navShell}
            {...webAttr({ "data-torque-mode-topbar": "1" })}
          >
            <View style={pStyles.navBrandRow}>
              <Image
                source={require("../../assets/images/torquelab-logo.png")}
                style={[styles.logoImagem, { height: 52, width: 138 }]}
                resizeMode="contain"
                accessibilityLabel="TorqueLab"
              />
            </View>

            <View
              style={pStyles.navTabs}
              {...webAttr({ "data-torque-mode-nav": "1" })}
            >
              <TouchableOpacity
                onPress={() => switchSection("simulator")}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeSection === "simulator" }}
                style={[
                  pStyles.navTabBtn,
                  activeSection === "simulator" && pStyles.navTabBtnActive,
                ]}
              >
                <Ionicons
                  name="calculator-outline"
                  size={15}
                  color={activeSection === "simulator" ? "#fff" : "#b9adb2"}
                />
                <Text
                  style={[
                    pStyles.navTabText,
                    activeSection === "simulator" && pStyles.navTabTextActive,
                  ]}
                >
                  Simulador & Custos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => switchSection("history")}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeSection === "history" }}
                style={[
                  pStyles.navTabBtn,
                  activeSection === "history" && pStyles.navTabBtnActive,
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={activeSection === "history" ? "#fff" : "#b9adb2"}
                />
                <Text
                  style={[
                    pStyles.navTabText,
                    activeSection === "history" && pStyles.navTabTextActive,
                  ]}
                >
                  Histórico
                </Text>
                {historyCount > 0 && (
                  <View style={pStyles.navBadgeCount}>
                    <Text style={pStyles.navBadgeCountText}>{historyCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => switchSection("dashboard")}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeSection === "dashboard" }}
                style={[
                  pStyles.navTabBtn,
                  activeSection === "dashboard" && pStyles.navTabBtnActive,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={activeSection === "dashboard" ? "#fff" : "#b9adb2"}
                />
                <Text
                  style={[
                    pStyles.navTabText,
                    activeSection === "dashboard" && pStyles.navTabTextActive,
                  ]}
                >
                  Painel do Carro
                </Text>
              </TouchableOpacity>
            </View>

            <AccountMenu />
          </View>

          {permissionNotice && (
            <View
              accessibilityRole="alert"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(239, 68, 68, 0.14)",
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.42)",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 16,
              }}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#fca5a5" />
              <Text
                style={{
                  flex: 1,
                  color: "#fecaca",
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 19,
                }}
              >
                {permissionNotice}
              </Text>
              <TouchableOpacity
                onPress={clearPermissionNotice}
                accessibilityRole="button"
                accessibilityLabel="Fechar aviso de permissão"
                style={{
                  padding: 4,
                  borderRadius: 8,
                }}
              >
                <Ionicons name="close" size={18} color="#fecaca" />
              </TouchableOpacity>
            </View>
          )}

          {/* ABA 1: DASHBOARD PRINCIPAL DE MANUTENÇÃO PREVENTIVA */}
          {activeSection === "dashboard" && (
            <>
              {!storeReady ? (
                <View style={[pStyles.summaryCard, { alignItems: "center", padding: 36 }]}>
                  <ActivityIndicator color="#e43b55" size="large" />
                  <Text style={{ color: "#b7aab0", marginTop: 12, fontSize: 13 }}>
                    Carregando painel do seu veículo...
                  </Text>
                </View>
              ) : (
                <PreventiveDashboard
                  vehicles={preventiveStore.vehicles}
                  activeVehicle={activeVehicle}
                  toastMessage={toastMessage}
                  onDismissToast={() => setToastMessage("")}
                  onSelectVehicle={handleSelectVehicle}
                  onOpenNewVehicle={() => {
                    setEditingVehicle(null);
                    setRegistrationOpen(true);
                  }}
                  onOpenEditVehicle={(veh) => {
                    setEditingVehicle(veh);
                    setRegistrationOpen(true);
                  }}
                  onUpdateKm={handleUpdateKm}
                  onCompleteMaintenance={handleCompleteMaintenance}
                  onSaveCustomInterval={handleSaveCustomInterval}
                  onSaveTirePressure={handleSaveTirePressure}
                  onOpenFullHistory={() => switchSection("history")}
                  onOpenSimulator={() => switchSection("simulator")}
                />
              )}
            </>
          )}

          {/* ABA 2: PÁGINA DEDICADA DE HISTÓRICO DE SERVIÇOS */}
          {activeSection === "history" && (
            <View>
              {activeVehicle && (
                <View style={pStyles.vehicleSwitcherRow}>
                  {preventiveStore.vehicles.map((veh) => {
                    const isCurrent = veh.id === activeVehicle.id;
                    return (
                      <TouchableOpacity
                        key={veh.id}
                        onPress={() => handleSelectVehicle(veh.id)}
                        style={[
                          pStyles.vehiclePill,
                          isCurrent && pStyles.vehiclePillActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name="car-outline"
                          size={14}
                          color={isCurrent ? "#ff8c9b" : "#9c8f95"}
                        />
                        <Text
                          style={[
                            pStyles.vehiclePillText,
                            isCurrent && pStyles.vehiclePillTextActive,
                          ]}
                        >
                          {veh.brand} {veh.model} {veh.year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <ServiceHistorySection
                vehicleLabel={
                  activeVehicle
                    ? `${activeVehicle.brand} ${activeVehicle.model} ${activeVehicle.year}`
                    : "Nenhum veículo"
                }
                history={activeVehicle?.history ?? []}
                compact={false}
              />

              <TouchableOpacity
                onPress={() => switchSection("dashboard")}
                style={[pStyles.secondaryBtn, { alignSelf: "flex-start", marginTop: 14 }]}
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={16} color="#efe5e8" />
                <Text style={pStyles.secondaryBtnText}>
                  Voltar ao Painel do Carro
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ABA 3: SIMULADOR FIPE, VIAGEM, GARAGEM SALVA E CALCULADORA DE CUSTOS (RECURSOS EXISTENTES PRESERVADOS) */}
          {activeSection === "simulator" && (
            <View>
              <Header
                online={marcas.length > 0}
                carregando={carregandoMarcas}
              />

              <ProgressSteps passo={passo} />

              {mensagem !== "" && (
                <View style={styles.mensagemErro}>
                  <Text style={styles.erroTitulo}>Atenção</Text>
                  <Text style={styles.erroTexto}>{mensagem}</Text>
                  {marcas.length === 0 && !carregandoMarcas && (
                    <TouchableOpacity
                      style={styles.tentarNovamente}
                      onPress={carregarMarcas}
                    >
                      <Text style={styles.tentarNovamenteTexto}>
                        Tentar novamente
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View nativeID="simulator-section" style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionEyebrow}>01 / SIMULADOR PRINCIPAL</Text>
                <Text style={styles.sectionHeading}>
                  Configure e analise seu veículo
                </Text>
                <Text style={styles.sectionLead}>
                  Escolha marca, modelo e ano pela Tabela FIPE, informe as
                  condições atuais e gere o relatório completo.
                </Text>
              </View>

              <View
                style={styles.desktopColumns}
                {...webAttr({ "data-torque-columns": "1" })}
              >
                <View style={styles.desktopColumn}>
                  <VehicleSelector
                    marca={marca}
                    modelo={modelo}
                    ano={ano}
                    dadosFipe={dadosFipe}
                    carregandoMarcas={carregandoMarcas}
                    carregandoModelos={carregandoModelos}
                    carregandoAnos={carregandoAnos}
                    carregandoFipe={carregandoFipe}
                    marcasDisponiveis={marcas.length > 0}
                    modelosDisponiveis={modelos.length > 0}
                    anosDisponiveis={anos.length > 0}
                    abrirMarca={() => setModalMarca(true)}
                    abrirModelo={() => setModalModelo(true)}
                    abrirAno={() => setModalAno(true)}
                  />

                  <CarGuide onUsarExemplo={aplicarExemplo} />
                </View>

                <View style={styles.desktopColumn}>
                  <VehicleForm
                    km={km}
                    setKm={setKm}
                    peso={peso}
                    setPeso={setPeso}
                    calibragem={calibragem}
                    setCalibragem={setCalibragem}
                    mesesUltimaRevisao={mesesUltimaRevisao}
                    setMesesUltimaRevisao={setMesesUltimaRevisao}
                    tipoPneu={tipoPneu}
                    setTipoPneu={setTipoPneu}
                    tipoUso={tipoUso}
                    setTipoUso={setTipoUso}
                    condicaoPneu={condicaoPneu}
                    setCondicaoPneu={setCondicaoPneu}
                  />

                  {!!avisoSalvamento && !resultado && (
                    <Text style={styles.textoAjuda}>{avisoSalvamento}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.botao}
                    onPress={analisar}
                    disabled={analisando}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    {...webAttr({ "data-torque-cta": "1" })}
                  >
                    {analisando ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text
                          style={[styles.botaoTexto, styles.botaoTextoCarregando]}
                        >
                          Analisando...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.botaoTexto}>Analisar veículo</Text>
                        <Text style={styles.botaoSeta}>→</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {resultado && dadosFipe && dadosAnalisados && (
                <View nativeID="result-section">
                  <View style={styles.sectionHeaderWrap}>
                    <Text style={styles.sectionEyebrow}>DIAGNÓSTICO GERADO</Text>
                    <Text style={styles.sectionHeading}>
                      Resultado e simulador de viagem
                    </Text>
                  </View>
                  <View
                    style={styles.desktopColumns}
                    {...webAttr({ "data-torque-columns": "1" })}
                  >
                    <View style={styles.desktopColumn}>
                      <ResultCard
                        resultado={resultado}
                        dadosFipe={dadosFipe}
                        dadosAtuais={dadosAnalisados}
                        salvar={salvarAnalise}
                        avisoSalvamento={avisoSalvamento}
                        salvo={!!analiseSalvaId}
                        modoDemonstracao={modoDemonstracao}
                        limpar={limpar}
                      />
                    </View>
                    <View style={styles.desktopColumn}>
                      <TripCalculator consumo={resultado.consumo} />
                    </View>
                  </View>
                </View>
              )}

              <SavedAnalyses
                analises={analisesSalvas}
                abrir={abrirAnalise}
                excluir={excluirAnalise}
                renomear={renomearAnalise}
              />

              <MaintenanceAdvisor
                marcas={marcas}
                carregandoMarcas={carregandoMarcas}
                veiculoAtual={advisorVehicle}
              />

              <AboutSection />
            </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/torquelab-logo.png")}
            style={styles.footerLogoImagem}
            resizeMode="contain"
            accessibilityLabel="TorqueLab"
          />
          <Text style={styles.footerTexto}>
            TorqueLab · Assistente de Manutenção Preventiva •{" "}
            {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Cadastro / Edição Completa do Veículo */}
      <VehicleRegistrationModal
        visible={registrationOpen}
        editingVehicle={editingVehicle}
        marcasFipe={marcas}
        carregandoMarcasFipe={carregandoMarcas}
        onClose={() => {
          setRegistrationOpen(false);
          setEditingVehicle(null);
        }}
        onSaveVehicle={handleSaveVehicle}
      />

      {/* Modais originais do Simulador FIPE */}
      <SeletorModal
        visible={modalMarca}
        titulo="Selecionar marca"
        itens={marcas}
        carregando={carregandoMarcas}
        onClose={() => setModalMarca(false)}
        onSelect={selecionarMarca}
      />

      <SeletorModal
        visible={modalModelo}
        titulo="Selecionar modelo"
        itens={modelos}
        carregando={carregandoModelos}
        onClose={() => setModalModelo(false)}
        onSelect={selecionarModelo}
      />

      <SeletorModal
        visible={modalAno}
        titulo="Selecionar ano"
        itens={anos}
        carregando={carregandoAnos}
        onClose={() => setModalAno(false)}
        onSelect={selecionarAno}
      />
    </>
  );
}
