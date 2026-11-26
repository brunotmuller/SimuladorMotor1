import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ItemAPI } from "@/app/(tabs)/types/vehicle";
import { pStyles, webAttr } from "@/components/preventive/styles";
import {
  loadCachedDashboard,
  saveCachedDashboard,
} from "@/lib/dashboard/dashboardCache";
import { DashboardClientError } from "@/lib/dashboard/dashboardClient";
import { defaultDashboardClient } from "@/lib/dashboard/defaultDashboardClient";
import type {
  CreateMaintenanceLogPayload,
  CreateVehiclePayload,
  DashboardMaintenanceItem,
  DashboardResponse,
  MaintenanceUrgency,
  UpdateVehiclePayload,
  UserVehicle,
  VehicleCategory,
} from "@/lib/dashboard/types";
import { formatDateBR, formatKm } from "@/lib/preventive/engine";
import LogMaintenanceModal from "./LogMaintenanceModal";
import QuickKmModal from "./QuickKmModal";
import UserVehicleModal from "./UserVehicleModal";

export type UserDashboardViewProps = {
  ownerId: string;
  marcasFipe: ItemAPI[];
  carregandoMarcasFipe: boolean;
  onOpenFullSimulator: (vehicle: UserVehicle) => void;
  refreshToken?: number;
  onActiveVehicleChange?: (vehicle: UserVehicle | null) => void;
  onDashboardSnapshotChange?: (snapshot: DashboardResponse | null) => void;
};

type MaintenanceFilter = "all" | "due" | "urgent" | "upcoming";

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  compact: "Compacto",
  medium_suv: "Médio / SUV",
  diesel_pickup: "Diesel / Picape",
  premium: "Premium",
  electric: "Elétrico",
};

const URGENCY_THEME: Record<
  MaintenanceUrgency,
  {
    label: string;
    color: string;
    softBg: string;
    border: string;
    text: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  urgent: {
    label: "Atrasada / Urgente",
    color: "#ef4444",
    softBg: "rgba(239, 68, 68, 0.14)",
    border: "rgba(239, 68, 68, 0.44)",
    text: "#fca5a5",
    icon: "warning",
  },
  recommended: {
    label: "Recomendada agora",
    color: "#f59e0b",
    softBg: "rgba(245, 158, 11, 0.14)",
    border: "rgba(245, 158, 11, 0.42)",
    text: "#fcd34d",
    icon: "alert-circle",
  },
  upcoming: {
    label: "Próxima revisão",
    color: "#22c55e",
    softBg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.36)",
    text: "#86efac",
    icon: "checkmark-circle",
  },
};

function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getScorePalette(score: number) {
  if (score >= 80) {
    return {
      color: "#4ade80",
      bg: "rgba(34, 197, 94, 0.14)",
      border: "rgba(34, 197, 94, 0.38)",
      label: "Saudável",
    };
  }
  if (score >= 60) {
    return {
      color: "#fcd34d",
      bg: "rgba(245, 158, 11, 0.14)",
      border: "rgba(245, 158, 11, 0.38)",
      label: "Atenção",
    };
  }
  return {
    color: "#fca5a5",
    bg: "rgba(239, 68, 68, 0.14)",
    border: "rgba(239, 68, 68, 0.42)",
    label: "Crítico",
  };
}

function buildInitialSelection(
  items: DashboardMaintenanceItem[]
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const item of items) {
    if (item.dueNow) {
      next[item.serviceId] = true;
    }
  }
  return next;
}

export default function UserDashboardView({
  ownerId,
  marcasFipe,
  carregandoMarcasFipe,
  onOpenFullSimulator,
  refreshToken = 0,
  onActiveVehicleChange,
  onDashboardSnapshotChange,
}: UserDashboardViewProps) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingVehicleId, setSwitchingVehicleId] = useState<string | null>(
    null
  );
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filter, setFilter] = useState<MaintenanceFilter>("all");
  const [selectedServices, setSelectedServices] = useState<
    Record<string, boolean>
  >({});

  // Modais
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<UserVehicle | null>(null);
  const [kmModalOpen, setKmModalOpen] = useState(false);
  const [logModalItem, setLogModalItem] =
    useState<DashboardMaintenanceItem | null>(null);

  // Confirmação explícita de exclusão (RN-04)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dashboardRef = useRef<DashboardResponse | null>(null);
  dashboardRef.current = dashboard;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const applyDashboardData = useCallback(
    (data: DashboardResponse, options?: { fromCache?: boolean }) => {
      setDashboard(data);
      setSelectedServices(buildInitialSelection(data.maintenances));
      setUsingCachedData(Boolean(options?.fromCache));
      onActiveVehicleChange?.(data.activeVehicle);
      onDashboardSnapshotChange?.(data);
      if (!options?.fromCache) {
        void saveCachedDashboard(ownerId, data);
      }
    },
    [onActiveVehicleChange, onDashboardSnapshotChange, ownerId]
  );

  const loadDashboard = useCallback(
    async (options?: { silent?: boolean }) => {
      const hasCurrent = Boolean(dashboardRef.current);
      if (!hasCurrent && !options?.silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setLoadError(null);

      try {
        const data = await defaultDashboardClient.getDashboard();
        applyDashboardData(data, { fromCache: false });
      } catch (err) {
        const message =
          err instanceof DashboardClientError
            ? err.message
            : "Não foi possível carregar o painel agora. Tente novamente.";
        setLoadError(message);

        if (!dashboardRef.current) {
          const cached = await loadCachedDashboard(ownerId);
          if (cached) {
            applyDashboardData(cached, { fromCache: true });
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyDashboardData, ownerId]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, refreshToken]);

  const handleSelectVehicle = useCallback(
    async (vehicleId: string) => {
      if (
        switchingVehicleId ||
        dashboard?.activeVehicle?.id === vehicleId
      ) {
        return;
      }

      setSwitchingVehicleId(vehicleId);
      setLoadError(null);
      try {
        const nextDashboard =
          await defaultDashboardClient.selectVehicle(vehicleId);
        applyDashboardData(nextDashboard, { fromCache: false });
        setFilter("all");
      } catch (err) {
        const message =
          err instanceof DashboardClientError
            ? err.message
            : "Não foi possível alternar o veículo ativo.";
        setLoadError(message);
      } finally {
        setSwitchingVehicleId(null);
      }
    },
    [applyDashboardData, dashboard?.activeVehicle?.id, switchingVehicleId]
  );

  const handleVehicleModalSubmit = useCallback(
    async (
      payload: CreateVehiclePayload | UpdateVehiclePayload,
      editingId: string | null
    ) => {
      if (editingId) {
        const result = await defaultDashboardClient.updateVehicle(
          editingId,
          payload as UpdateVehiclePayload
        );
        applyDashboardData(result.dashboard, { fromCache: false });
        showToast(
          `${result.vehicle.brand} ${result.vehicle.model} atualizado com sucesso.`
        );
      } else {
        const result = await defaultDashboardClient.createVehicle(
          payload as CreateVehiclePayload
        );
        applyDashboardData(result.dashboard, { fromCache: false });
        setFilter("all");
        showToast(
          `${result.vehicle.brand} ${result.vehicle.model} ${result.vehicle.year} adicionado à sua garagem!`
        );
      }
    },
    [applyDashboardData, showToast]
  );

  const handleCreateDemoVehicle = useCallback(async () => {
    if (creatingDemo) return;
    setCreatingDemo(true);
    setLoadError(null);
    try {
      const result = await defaultDashboardClient.createVehicle({
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        version: "XEi 2.0 Flex",
        fuel: "Flex",
        category: "medium_suv",
        currentKm: 60000,
        lastRevisionMonths: 14,
        fipePrice: "R$ 138.500",
        isDemo: true,
      });
      applyDashboardData(result.dashboard, { fromCache: false });
      showToast(
        "Carro de demonstração (Toyota Corolla 2022 · 60.000 km) pronto para teste!"
      );
    } catch (err) {
      const message =
        err instanceof DashboardClientError
          ? err.message
          : "Não foi possível criar o carro de demonstração.";
      setLoadError(message);
    } finally {
      setCreatingDemo(false);
    }
  }, [applyDashboardData, creatingDemo, showToast]);

  const handleQuickKmSubmit = useCallback(
    async (
      vehicleId: string,
      newKm: number,
      confirmKmRegression: boolean
    ) => {
      const result = await defaultDashboardClient.updateVehicle(vehicleId, {
        currentKm: newKm,
        ...(confirmKmRegression ? { confirmKmRegression: true } : {}),
      });
      applyDashboardData(result.dashboard, { fromCache: false });
      showToast(
        `Hodômetro atualizado para ${formatKm(result.vehicle.currentKm)}. Manutenções recalculadas!`
      );
    },
    [applyDashboardData, showToast]
  );

  const handleLogMaintenanceSubmit = useCallback(
    async (payload: CreateMaintenanceLogPayload) => {
      const result = await defaultDashboardClient.createMaintenanceLog(payload);
      applyDashboardData(result.dashboard, { fromCache: false });
      showToast(
        `“${result.log.serviceName}” registrada em ${formatKm(
          result.log.performedKm
        )}! Próximo vencimento e custos atualizados.`
      );
    },
    [applyDashboardData, showToast]
  );

  const handleConfirmDeleteVehicle = useCallback(async () => {
    const active = dashboard?.activeVehicle;
    if (!active || deletingVehicle) return;

    setDeletingVehicle(true);
    setDeleteError(null);
    try {
      const result = await defaultDashboardClient.deleteVehicle(active.id);
      applyDashboardData(result.dashboard, { fromCache: false });
      setDeleteConfirmOpen(false);
      showToast(
        `${active.brand} ${active.model} removido da garagem.${
          result.nextActiveVehicleId
            ? " Próximo veículo selecionado automaticamente."
            : ""
        }`
      );
    } catch (err) {
      const message =
        err instanceof DashboardClientError
          ? err.message
          : "Não foi possível excluir o veículo.";
      setDeleteError(message);
    } finally {
      setDeletingVehicle(false);
    }
  }, [applyDashboardData, dashboard?.activeVehicle, deletingVehicle, showToast]);

  const toggleServiceSelection = useCallback((serviceId: string) => {
    setSelectedServices((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  }, []);

  const maintenances = useMemo(
    () => dashboard?.maintenances ?? [],
    [dashboard?.maintenances]
  );

  const filteredMaintenances = useMemo(() => {
    switch (filter) {
      case "due":
        return maintenances.filter((item) => item.dueNow);
      case "urgent":
        return maintenances.filter((item) => item.urgency === "urgent");
      case "upcoming":
        return maintenances.filter((item) => item.urgency === "upcoming");
      default:
        return maintenances;
    }
  }, [filter, maintenances]);

  const { selectedCount, selectedTotalCost } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const item of maintenances) {
      if (selectedServices[item.serviceId]) {
        count += 1;
        total += item.estimatedCost;
      }
    }
    return { selectedCount: count, selectedTotalCost: total };
  }, [maintenances, selectedServices]);

  function selectAllDue() {
    setSelectedServices(buildInitialSelection(maintenances));
  }

  function clearAllSelection() {
    setSelectedServices({});
  }

  if (loading && !dashboard) {
    return (
      <View style={dStyles.loadingCard}>
        <ActivityIndicator color="#e43b55" size="large" />
        <Text style={dStyles.loadingText}>
          Carregando painel do seu veículo...
        </Text>
      </View>
    );
  }

  if (!dashboard && loadError) {
    return (
      <View style={dStyles.emptyCard} accessibilityRole="alert">
        <View style={dStyles.errorIconCircle}>
          <Ionicons name="cloud-offline-outline" size={28} color="#fca5a5" />
        </View>
        <Text style={dStyles.emptyTitle}>
          Não foi possível carregar seu Dashboard
        </Text>
        <Text style={dStyles.emptyDesc}>{loadError}</Text>
        <TouchableOpacity
          onPress={() => void loadDashboard()}
          disabled={refreshing}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={pStyles.primaryCtaBtn}
        >
          {refreshing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Ionicons name="refresh-outline" size={18} color="#ffffff" />
          )}
          <Text style={pStyles.primaryCtaText}>Recarregar painel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeVehicle = dashboard?.activeVehicle ?? null;
  const summary = dashboard?.summary ?? null;
  const history = dashboard?.history ?? [];
  const scorePalette = summary ? getScorePalette(summary.healthScore) : null;

  return (
    <View style={dStyles.container}>
      {/* Banner de erro não destrutivo preservando cache local (RN-04) */}
      {loadError && (
        <View style={dStyles.errorBanner} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={19} color="#fcd34d" />
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={dStyles.errorBannerTitle}>
              {usingCachedData
                ? "Exibindo último painel salvo em cache local"
                : "Falha ao sincronizar com o servidor"}
            </Text>
            <Text style={dStyles.errorBannerText}>{loadError}</Text>
          </View>
          <TouchableOpacity
            onPress={() => void loadDashboard()}
            disabled={refreshing}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={dStyles.reloadSmallBtn}
          >
            {refreshing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="refresh-outline" size={14} color="#ffffff" />
            )}
            <Text style={dStyles.reloadSmallBtnText}>Recarregar painel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toast de feedback positivo */}
      {toastMessage && (
        <View style={pStyles.toastBanner} accessibilityRole="alert">
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <Text style={pStyles.toastText}>{toastMessage}</Text>
          <TouchableOpacity
            onPress={() => setToastMessage(null)}
            accessibilityRole="button"
            accessibilityLabel="Fechar aviso"
          >
            <Ionicons name="close" size={18} color="#dcfce7" />
          </TouchableOpacity>
        </View>
      )}

      {/* ESTADO VAZIO (RF-05, Cenário 5) */}
      {!dashboard || dashboard.empty || !activeVehicle || !summary ? (
        <View style={dStyles.emptyCard}>
          <View style={dStyles.emptyIconCircle}>
            <Ionicons name="car-sport-outline" size={32} color="#ff8c9b" />
          </View>
          <Text style={pStyles.sectionEyebrow}>GARAGEM TORQUELAB</Text>
          <Text style={dStyles.emptyTitle}>Sua garagem ainda está vazia</Text>
          <Text style={dStyles.emptyDesc}>
            Cadastre seu primeiro carro para acompanhar quilometragem, alertas de
            manutenção preventiva, custos estimados por categoria e histórico
            completo de revisões.
          </Text>

          <View style={dStyles.emptyActions}>
            <TouchableOpacity
              onPress={() => {
                setEditingVehicle(null);
                setVehicleModalOpen(true);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={pStyles.primaryCtaBtn}
              {...webAttr({ "data-torque-cta": "1" })}
            >
              <Ionicons name="add-circle-outline" size={19} color="#ffffff" />
              <Text style={pStyles.primaryCtaText}>
                Cadastrar meu primeiro carro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreateDemoVehicle}
              disabled={creatingDemo}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[pStyles.secondaryBtn, creatingDemo && { opacity: 0.65 }]}
            >
              {creatingDemo ? (
                <ActivityIndicator color="#efe5e8" size="small" />
              ) : (
                <Ionicons name="sparkles-outline" size={16} color="#ff8c9b" />
              )}
              <Text style={pStyles.secondaryBtnText}>
                {creatingDemo
                  ? "Criando demonstração..."
                  : "Testar carro de demonstração"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* SELETOR DE VEÍCULOS DA GARAGEM (RF-01, Cenário 2) */}
          <View style={pStyles.vehicleSwitcherRow}>
            {dashboard.vehicles.map((veh) => {
              const isCurrent = veh.id === activeVehicle.id;
              const isSwitchingThis = switchingVehicleId === veh.id;
              const pillName = veh.nickname
                ? `${veh.nickname} · ${veh.brand} ${veh.model}`
                : `${veh.brand} ${veh.model} ${veh.year}`;

              return (
                <TouchableOpacity
                  key={veh.id}
                  onPress={() => void handleSelectVehicle(veh.id)}
                  disabled={Boolean(switchingVehicleId)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  style={[
                    pStyles.vehiclePill,
                    isCurrent && pStyles.vehiclePillActive,
                  ]}
                >
                  {isSwitchingThis ? (
                    <ActivityIndicator size="small" color="#ff8c9b" />
                  ) : (
                    <Ionicons
                      name={
                        veh.category === "electric"
                          ? "flash-outline"
                          : "car-outline"
                      }
                      size={14}
                      color={
                        isCurrent
                          ? "#ff8c9b"
                          : veh.category === "electric"
                            ? "#7dd3fc"
                            : "#9c8f95"
                      }
                    />
                  )}
                  <Text
                    style={[
                      pStyles.vehiclePillText,
                      isCurrent && pStyles.vehiclePillTextActive,
                    ]}
                  >
                    {pillName}
                  </Text>
                  <Text style={dStyles.pillKmText}>
                    {formatKm(veh.currentKm)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => {
                setEditingVehicle(null);
                setVehicleModalOpen(true);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={pStyles.addCarPill}
            >
              <Ionicons name="add" size={15} color="#ff8c9b" />
              <Text style={pStyles.addCarPillText}>+ Adicionar carro</Text>
            </TouchableOpacity>
          </View>

          {/* HERO / IDENTIFICAÇÃO + AÇÕES DO VEÍCULO ATIVO (RF-02, Cenário 1) */}
          <View style={pStyles.vehicleHeroCard}>
            <View style={pStyles.vehicleTopMain}>
              <View style={pStyles.vehicleIdentity}>
                <View style={pStyles.eyebrowRow}>
                  <Text style={pStyles.eyebrowTag}>VEÍCULO ATIVO</Text>
                  {activeVehicle.isDemo && (
                    <View style={pStyles.demoBadge}>
                      <Text style={pStyles.demoBadgeText}>Demonstração</Text>
                    </View>
                  )}
                  {activeVehicle.category === "electric" && (
                    <View style={dStyles.electricBadge}>
                      <Ionicons name="flash" size={11} color="#7dd3fc" />
                      <Text style={dStyles.electricBadgeText}>
                        100% Elétrico
                      </Text>
                    </View>
                  )}
                  {activeVehicle.fipeCached && (
                    <View style={dStyles.cachedBadge}>
                      <Ionicons
                        name="time-outline"
                        size={11}
                        color="#fcd34d"
                      />
                      <Text style={dStyles.cachedBadgeText}>FIPE em cache</Text>
                    </View>
                  )}
                </View>

                <Text style={pStyles.vehicleTitle}>
                  {activeVehicle.brand} {activeVehicle.model}{" "}
                  {activeVehicle.year}
                </Text>

                {(activeVehicle.nickname || activeVehicle.version) && (
                  <Text style={pStyles.vehicleSubtitle}>
                    {[activeVehicle.nickname, activeVehicle.version]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                )}

                <View style={pStyles.vehicleMetaRow}>
                  <View style={pStyles.metaChip}>
                    <Ionicons
                      name={
                        activeVehicle.category === "electric"
                          ? "flash-outline"
                          : "flame-outline"
                      }
                      size={13}
                      color="#ff8c9b"
                    />
                    <Text style={pStyles.metaChipText}>
                      {activeVehicle.fuel}
                    </Text>
                  </View>

                  <View style={pStyles.metaChip}>
                    <Ionicons
                      name="layers-outline"
                      size={13}
                      color="#ff8c9b"
                    />
                    <Text style={pStyles.metaChipText}>
                      {CATEGORY_LABELS[activeVehicle.category]}
                    </Text>
                  </View>

                  {activeVehicle.plate && (
                    <View style={pStyles.metaChip}>
                      <Ionicons
                        name="card-outline"
                        size={13}
                        color="#ff8c9b"
                      />
                      <Text style={pStyles.metaChipText}>
                        Placa {activeVehicle.plate}
                      </Text>
                    </View>
                  )}

                  {activeVehicle.fipePrice && (
                    <View style={pStyles.metaChip}>
                      <Ionicons
                        name="pricetag-outline"
                        size={13}
                        color="#86efac"
                      />
                      <Text style={pStyles.metaChipText}>
                        FIPE {activeVehicle.fipePrice}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={pStyles.odometerBox}>
                <View>
                  <Text style={pStyles.odometerLabel}>QUILOMETRAGEM ATUAL</Text>
                  <Text style={pStyles.odometerValue}>
                    {formatKm(activeVehicle.currentKm)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setKmModalOpen(true)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={pStyles.primaryCtaBtn}
                  {...webAttr({ "data-torque-cta": "1" })}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={17}
                    color="#ffffff"
                  />
                  <Text style={pStyles.primaryCtaText}>Atualizar KM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={dStyles.heroActionsRow}>
              <TouchableOpacity
                onPress={() => onOpenFullSimulator(activeVehicle)}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={dStyles.simulatorBtn}
              >
                <Ionicons
                  name="calculator-outline"
                  size={15}
                  color="#ff8c9b"
                />
                <Text style={dStyles.simulatorBtnText}>
                  Abrir simulador completo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setEditingVehicle(activeVehicle);
                  setVehicleModalOpen(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={pStyles.secondaryBtn}
              >
                <Ionicons name="create-outline" size={15} color="#efe5e8" />
                <Text style={pStyles.secondaryBtnText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setDeleteError(null);
                  setDeleteConfirmOpen(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={dStyles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={15} color="#fca5a5" />
                <Text style={dStyles.deleteBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* GRID DE 4 KPIs DO VEÍCULO ATIVO (RF-02) */}
          <View style={dStyles.kpiCardsGrid}>
            <View
              style={[
                dStyles.kpiCard,
                scorePalette && {
                  borderColor: scorePalette.border,
                  backgroundColor: scorePalette.bg,
                },
              ]}
            >
              <Text style={dStyles.kpiEyebrow}>NOTA DE SAÚDE</Text>
              <View style={dStyles.kpiMainRow}>
                <Text
                  style={[
                    dStyles.kpiBigValue,
                    scorePalette && { color: scorePalette.color },
                  ]}
                >
                  {summary.healthScore}
                </Text>
                <Text style={dStyles.kpiUnit}>/ 100</Text>
              </View>
              <Text style={dStyles.kpiSub}>
                {scorePalette?.label ?? "Avaliado"}
              </Text>
            </View>

            <View style={dStyles.kpiCard}>
              <Text style={dStyles.kpiEyebrow}>CONSUMO ESTIMADO</Text>
              <View style={dStyles.kpiMainRow}>
                <Text style={dStyles.kpiBigValue}>
                  {summary.estimatedConsumption.toFixed(1).replace(".", ",")}
                </Text>
                <Text style={dStyles.kpiUnit}>{summary.consumptionUnit}</Text>
              </View>
              <Text style={dStyles.kpiSub}>
                {activeVehicle.category === "electric"
                  ? "Eficiência elétrica"
                  : "Média de referência"}
              </Text>
            </View>

            <View style={dStyles.kpiCard}>
              <Text style={dStyles.kpiEyebrow}>MANUTENÇÕES</Text>
              <View style={dStyles.kpiMainRow}>
                <Text
                  style={[
                    dStyles.kpiBigValue,
                    {
                      color:
                        summary.urgentCount > 0
                          ? "#fca5a5"
                          : summary.recommendedCount > 0
                            ? "#fcd34d"
                            : "#86efac",
                    },
                  ]}
                >
                  {summary.dueCount}
                </Text>
                <Text style={dStyles.kpiUnit}>
                  {summary.dueCount === 1 ? "pendente" : "pendentes"}
                </Text>
              </View>
              <Text style={dStyles.kpiSub}>
                {summary.urgentCount} urgente · {summary.recommendedCount} agora
                · {summary.upcomingCount} próximas
              </Text>
            </View>

            <View style={[dStyles.kpiCard, dStyles.kpiCostCard]}>
              <Text style={dStyles.kpiEyebrow}>CUSTO SELECIONADO</Text>
              <Text style={dStyles.kpiCostValue}>
                {formatCurrencyBRL(selectedTotalCost)}
              </Text>
              <Text style={dStyles.kpiSub}>
                {summary.nextMilestoneKm !== null
                  ? `Próximo marco: ${formatKm(summary.nextMilestoneKm)}`
                  : "Sem marco pendente"}
              </Text>
            </View>
          </View>

          {/* PAINEL DE MANUTENÇÕES NECESSÁRIAS (RF-03, RN-02, Cenários 1, 2, 3) */}
          <View style={pStyles.sectionHeader}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Text style={pStyles.sectionEyebrow}>
                MANUTENÇÕES APLICÁVEIS
              </Text>
              <Text style={pStyles.sectionTitle}>
                Plano preventivo para {formatKm(activeVehicle.currentKm)}
              </Text>
              <Text style={pStyles.sectionSubtitle}>
                {activeVehicle.category === "electric"
                  ? "Serviços exclusivos de combustão (óleo, velas e correia) são ocultados automaticamente."
                  : "Marque ou desmarque serviços para simular seu orçamento total e registre cada troca realizada."}
              </Text>
            </View>

            <View style={pStyles.filterRow}>
              {(
                [
                  { id: "all", label: `Todas (${maintenances.length})` },
                  { id: "due", label: `Pendentes agora (${summary.dueCount})` },
                  { id: "urgent", label: `Urgentes (${summary.urgentCount})` },
                  {
                    id: "upcoming",
                    label: `Próximas (${summary.upcomingCount})`,
                  },
                ] as { id: MaintenanceFilter; label: string }[]
              ).map((tab) => {
                const active = filter === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setFilter(tab.id)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    style={[
                      pStyles.filterPill,
                      active && pStyles.filterPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        pStyles.filterPillText,
                        active && pStyles.filterPillTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Barra dinâmica de valor total somado */}
          <View style={dStyles.totalBar}>
            <View style={{ flex: 1, minWidth: 190 }}>
              <Text style={dStyles.totalBarLabel}>
                Valor total estimado ({selectedCount}{" "}
                {selectedCount === 1
                  ? "item selecionado"
                  : "itens selecionados"}
                )
              </Text>
              <Text style={dStyles.totalBarAmount}>
                {formatCurrencyBRL(selectedTotalCost)}
              </Text>
            </View>

            <View style={dStyles.totalBarActions}>
              <TouchableOpacity
                onPress={selectAllDue}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={dStyles.tinyActionBtn}
              >
                <Text style={dStyles.tinyActionText}>Marcar pendentes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearAllSelection}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={dStyles.tinyActionBtn}
              >
                <Text style={dStyles.tinyActionText}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredMaintenances.length === 0 ? (
            <View style={pStyles.summaryCard}>
              <Text style={dStyles.emptyFilterText}>
                Nenhum serviço encontrado neste filtro para o veículo atual.
              </Text>
            </View>
          ) : (
            <View style={dStyles.maintList}>
              {filteredMaintenances.map((item) => {
                const theme = URGENCY_THEME[item.urgency];
                const isSelected = Boolean(selectedServices[item.serviceId]);
                const intervalDesc = item.intervalMonths
                  ? `A cada ${formatKm(item.intervalKm)} ou ${item.intervalMonths} meses`
                  : `A cada ${formatKm(item.intervalKm)}`;

                return (
                  <View
                    key={item.serviceId}
                    style={[
                      dStyles.maintRowCard,
                      {
                        borderColor: isSelected
                          ? theme.border
                          : "rgba(255,255,255,0.08)",
                      },
                    ]}
                  >
                    <View style={dStyles.maintRowTop}>
                      <TouchableOpacity
                        onPress={() => toggleServiceSelection(item.serviceId)}
                        activeOpacity={0.8}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`Incluir ${item.name} no valor total`}
                        style={[
                          dStyles.checkbox,
                          isSelected && dStyles.checkboxChecked,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color="#ffffff"
                          />
                        )}
                      </TouchableOpacity>

                      <View style={{ flex: 1, minWidth: 180 }}>
                        <View style={dStyles.maintTitleLine}>
                          <Text style={dStyles.maintName}>{item.name}</Text>
                          <View
                            style={[
                              pStyles.statusBadge,
                              {
                                backgroundColor: theme.softBg,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name={theme.icon}
                              size={12}
                              color={theme.color}
                            />
                            <Text
                              style={[
                                pStyles.statusBadgeText,
                                { color: theme.text },
                              ]}
                            >
                              {theme.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={dStyles.maintReason}>{item.reason}</Text>

                        <View style={dStyles.maintMetaRow}>
                          <Text style={dStyles.maintMetaItem}>
                            {item.category} · {intervalDesc}
                          </Text>
                          <Text style={dStyles.maintMetaItem}>
                            Próximo: {formatKm(item.nextDueKm)}
                            {item.nextDueDate
                              ? ` (${formatDateBR(item.nextDueDate)})`
                              : ""}
                          </Text>
                          {item.lastDoneKm !== null && (
                            <Text style={dStyles.maintMetaItem}>
                              Última feita em {formatKm(item.lastDoneKm)}
                              {item.lastDoneAt
                                ? ` · ${formatDateBR(item.lastDoneAt)}`
                                : ""}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={dStyles.maintRightCol}>
                        <Text style={dStyles.maintPriceLabel}>Estimado</Text>
                        <Text style={dStyles.maintPrice}>
                          {formatCurrencyBRL(item.estimatedCost)}
                        </Text>

                        <TouchableOpacity
                          onPress={() => setLogModalItem(item)}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          style={dStyles.doneBtn}
                        >
                          <Ionicons
                            name="checkmark-done-outline"
                            size={15}
                            color="#86efac"
                          />
                          <Text style={dStyles.doneBtnText}>
                            Marcar como realizada
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* HISTÓRICO DE MANUTENÇÕES REALIZADAS (RF-03, RN-02) */}
          <View style={pStyles.sectionHeader}>
            <View>
              <Text style={pStyles.sectionEyebrow}>HISTÓRICO DO VEÍCULO</Text>
              <Text style={pStyles.sectionTitle}>
                Manutenções realizadas ({history.length})
              </Text>
              <Text style={pStyles.sectionSubtitle}>
                Registros concluídos de {activeVehicle.brand}{" "}
                {activeVehicle.model} com data, quilometragem e valor pago.
              </Text>
            </View>
          </View>

          {history.length === 0 ? (
            <View style={pStyles.summaryCard}>
              <Text style={dStyles.emptyFilterText}>
                Nenhuma manutenção registrada ainda para este veículo. Use o
                botão “Marcar como realizada” acima para criar seu histórico.
              </Text>
            </View>
          ) : (
            <View style={dStyles.historyList}>
              {history.map((log) => (
                <View key={log.id} style={dStyles.historyRow}>
                  <View style={dStyles.historyIconCircle}>
                    <Ionicons
                      name="checkmark-done"
                      size={16}
                      color="#86efac"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={dStyles.historyTitle}>{log.serviceName}</Text>
                    <Text style={dStyles.historyMeta}>
                      {formatDateBR(log.performedAt)} ·{" "}
                      {formatKm(log.performedKm)}
                    </Text>
                    {log.notes && (
                      <Text style={dStyles.historyNotes}>{log.notes}</Text>
                    )}
                  </View>
                  <View style={dStyles.historyCostBox}>
                    <Text style={dStyles.historyCostLabel}>
                      {log.paidCost !== null ? "Valor pago" : "Estimado"}
                    </Text>
                    <Text style={dStyles.historyCostValue}>
                      {formatCurrencyBRL(
                        log.paidCost !== null ? log.paidCost : log.estimatedCost
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Modal de Cadastro / Edição de Veículo */}
      <UserVehicleModal
        visible={vehicleModalOpen}
        editingVehicle={editingVehicle}
        marcasFipe={marcasFipe}
        carregandoMarcasFipe={carregandoMarcasFipe}
        onClose={() => {
          setVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSubmit={handleVehicleModalSubmit}
      />

      {/* Modal de Atualização Rápida de KM */}
      <QuickKmModal
        visible={kmModalOpen}
        vehicle={activeVehicle}
        onClose={() => setKmModalOpen(false)}
        onSubmit={handleQuickKmSubmit}
      />

      {/* Modal de Registrar Manutenção Realizada */}
      <LogMaintenanceModal
        visible={Boolean(logModalItem)}
        vehicle={activeVehicle}
        item={logModalItem}
        onClose={() => setLogModalItem(null)}
        onSubmit={handleLogMaintenanceSubmit}
      />

      {/* Modal de Confirmação Explícita de Exclusão (RN-04) */}
      <Modal
        visible={deleteConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingVehicle) setDeleteConfirmOpen(false);
        }}
      >
        <View style={pStyles.modalBackdrop}>
          <View style={[pStyles.modalSheet, { maxWidth: 440 }]}>
            <View style={pStyles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.sectionEyebrow}>CONFIRMAR EXCLUSÃO</Text>
                <Text style={pStyles.modalTitle}>Excluir veículo?</Text>
                <Text style={pStyles.modalSubtitle}>
                  {activeVehicle
                    ? `${activeVehicle.brand} ${activeVehicle.model} ${activeVehicle.year}`
                    : ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDeleteConfirmOpen(false)}
                disabled={deletingVehicle}
                style={pStyles.modalCloseBtn}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color="#d9cdd2" />
              </TouchableOpacity>
            </View>

            <Text style={dStyles.deleteWarnText}>
              Esta ação remove o veículo da sua garagem ativa. Se houver outro
              carro cadastrado, ele será selecionado automaticamente como o
              veículo ativo.
            </Text>

            {deleteError && (
              <View style={pStyles.errorBox} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={17} color="#fca5a5" />
                <Text style={pStyles.errorText}>{deleteError}</Text>
              </View>
            )}

            <View style={dStyles.deleteModalActions}>
              <TouchableOpacity
                onPress={() => setDeleteConfirmOpen(false)}
                disabled={deletingVehicle}
                style={[pStyles.secondaryBtn, { flex: 1 }]}
                accessibilityRole="button"
              >
                <Text style={pStyles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmDeleteVehicle}
                disabled={deletingVehicle}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[
                  pStyles.primaryCtaBtn,
                  { flex: 1.3, backgroundColor: "#dc2626" },
                  deletingVehicle && { opacity: 0.7 },
                ]}
              >
                {deletingVehicle ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons name="trash-outline" size={16} color="#ffffff" />
                )}
                <Text style={pStyles.primaryCtaText}>
                  {deletingVehicle ? "Excluindo..." : "Confirmar exclusão"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const dStyles = StyleSheet.create({
  container: {
    gap: 14,
  },
  loadingCard: {
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#b7aab0",
    fontSize: 13,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.38)",
    borderRadius: 14,
    padding: 13,
  },
  errorBannerTitle: {
    color: "#fde68a",
    fontSize: 12,
    fontWeight: "800",
  },
  errorBannerText: {
    color: "#fef3c7",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  reloadSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e43b55",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reloadSmallBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.3)",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(228, 59, 85, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.38)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  emptyDesc: {
    color: "#b7aab0",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 480,
  },
  emptyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  pillKmText: {
    color: "#9c8f95",
    fontSize: 11,
    fontWeight: "700",
  },
  electricBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 189, 248, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.38)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  electricBadgeText: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "800",
  },
  cachedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.36)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  cachedBadgeText: {
    color: "#fcd34d",
    fontSize: 10,
    fontWeight: "800",
  },
  heroActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  simulatorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(228, 59, 85, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.4)",
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  simulatorBtnText: {
    color: "#ff9aa7",
    fontSize: 13,
    fontWeight: "800",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.32)",
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  deleteBtnText: {
    color: "#fca5a5",
    fontSize: 13,
    fontWeight: "700",
  },
  kpiCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 6,
  },
  kpiCard: {
    flex: 1,
    minWidth: 170,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  kpiCostCard: {
    borderColor: "rgba(228, 59, 85, 0.32)",
    backgroundColor: "#16121b",
  },
  kpiEyebrow: {
    color: "#9c8f95",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  kpiMainRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginTop: 2,
  },
  kpiBigValue: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  kpiUnit: {
    color: "#b7aab0",
    fontSize: 12,
    fontWeight: "700",
  },
  kpiCostValue: {
    color: "#ff8c9b",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 3,
  },
  kpiSub: {
    color: "#a99ca2",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  totalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "#15121c",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.34)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  totalBarLabel: {
    color: "#cbbec3",
    fontSize: 12,
    fontWeight: "700",
  },
  totalBarAmount: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  totalBarActions: {
    flexDirection: "row",
    gap: 8,
  },
  tinyActionBtn: {
    backgroundColor: "#1d1927",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tinyActionText: {
    color: "#e2d8dc",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyFilterText: {
    color: "#b7aab0",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  maintList: {
    gap: 10,
    marginBottom: 10,
  },
  maintRowCard: {
    backgroundColor: "#121118",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
  },
  maintRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "#191722",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#e43b55",
    borderColor: "#e43b55",
  },
  maintTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  maintName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  maintReason: {
    color: "#d5c7cc",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: "600",
  },
  maintMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  maintMetaItem: {
    color: "#9c8f95",
    fontSize: 11,
    fontWeight: "600",
  },
  maintRightCol: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 160,
  },
  maintPriceLabel: {
    color: "#9c8f95",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  maintPrice: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.42)",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  doneBtnText: {
    color: "#86efac",
    fontSize: 12,
    fontWeight: "800",
  },
  historyList: {
    gap: 10,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 15,
    padding: 14,
  },
  historyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.36)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  historyMeta: {
    color: "#b7aab0",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  historyNotes: {
    color: "#968a90",
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  historyCostBox: {
    alignItems: "flex-end",
  },
  historyCostLabel: {
    color: "#9c8f95",
    fontSize: 10,
    fontWeight: "700",
  },
  historyCostValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 1,
  },
  deleteWarnText: {
    color: "#cbbec3",
    fontSize: 13,
    lineHeight: 20,
  },
  deleteModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
});
