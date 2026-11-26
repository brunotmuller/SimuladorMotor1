import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
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
  AdminCatalogServicesQuery,
  AdminCatalogServicesResponse,
  AdminCatalogVehicle,
  AdminCatalogVehiclesQuery,
  AdminCatalogVehiclesResponse,
  AdminOverviewResponse,
  AdminStatusFilter,
  AdminTopModelItem,
  AdminUserVehiclesQuery,
  AdminUserVehiclesResponse,
  PaginationMeta,
} from "@/lib/admin/types";
import { useAuth } from "@/lib/auth/AuthContext";
import type { VehicleCategory } from "@/lib/dashboard/types";
import { formatKm } from "@/lib/preventive/engine";
import CatalogServiceModal from "./CatalogServiceModal";
import CatalogVehicleModal from "./CatalogVehicleModal";

export type AdminDashboardViewProps = {
  adminClient?: AdminClient;
};

type AdminTab =
  | "overview"
  | "catalog_vehicles"
  | "user_vehicles"
  | "catalog_services";

const DEFAULT_PAGE_LIMIT = 20;

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  compact: "Compacto",
  medium_suv: "Médio / SUV",
  diesel_pickup: "Picape Diesel",
  premium: "Premium",
  electric: "Elétrico",
};

const VEHICLE_CATEGORY_FILTERS: {
  value: VehicleCategory | "";
  label: string;
}[] = [
  { value: "", label: "Todas" },
  { value: "compact", label: "Compacto" },
  { value: "medium_suv", label: "Médio / SUV" },
  { value: "diesel_pickup", label: "Picape Diesel" },
  { value: "premium", label: "Premium" },
  { value: "electric", label: "Elétrico" },
];

const SERVICE_CATEGORY_FILTERS = [
  { value: "", label: "Todas" },
  { value: "motor", label: "Motor" },
  { value: "freios", label: "Freios" },
  { value: "pneus", label: "Pneus" },
  { value: "fluidos", label: "Fluidos" },
  { value: "elétrica", label: "Elétrica" },
  { value: "filtros", label: "Filtros" },
] as const;

const STATUS_FILTERS: { value: AdminStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const COMBUSTION_FILTERS: {
  value: "all" | boolean;
  label: string;
}[] = [
  { value: "all", label: "Todos" },
  { value: true, label: "Só combustão" },
  { value: false, label: "Todos os motores" },
];

function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSyncTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} às ${hh}:${min}:${ss}`;
}

function formatIsoDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof AdminClientError && err.message) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

function parseOptionalNonNegInt(raw: string): number | undefined | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const cleaned = trimmed.replace(/\./g, "");
  if (!/^\d+$/.test(cleaned)) return "invalid";
  const value = Number(cleaned);
  return Number.isSafeInteger(value) && value >= 0 ? value : "invalid";
}

function PaginationBar({
  pagination,
  loading,
  onPageChange,
}: {
  pagination: PaginationMeta;
  loading: boolean;
  onPageChange: (nextPage: number) => void;
}) {
  const canPrev = pagination.page > 1 && !loading;
  const canNext = pagination.page < pagination.totalPages && !loading;

  return (
    <View style={aStyles.paginationBar}>
      <Text style={aStyles.paginationText}>
        Página {pagination.page} de {Math.max(1, pagination.totalPages)} ·{" "}
        {pagination.total}{" "}
        {pagination.total === 1 ? "registro" : "registros"}
      </Text>
      <View style={aStyles.paginationActions}>
        <TouchableOpacity
          onPress={() => onPageChange(pagination.page - 1)}
          disabled={!canPrev}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={[aStyles.pageBtn, !canPrev && aStyles.pageBtnDisabled]}
        >
          <Ionicons name="chevron-back" size={14} color="#efe5e8" />
          <Text style={aStyles.pageBtnText}>Anterior</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onPageChange(pagination.page + 1)}
          disabled={!canNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={[aStyles.pageBtn, !canNext && aStyles.pageBtnDisabled]}
        >
          <Text style={aStyles.pageBtnText}>Próxima</Text>
          <Ionicons name="chevron-forward" size={14} color="#efe5e8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminDashboardView({
  adminClient = defaultAdminClient,
}: AdminDashboardViewProps) {
  const { user, switchAdminPortal } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [refreshingAll, setRefreshingAll] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bloco 1: KPIs (Overview)
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Bloco 2: Ranking de modelos (Visão Geral)
  const [overviewTopModels, setOverviewTopModels] = useState<
    AdminTopModelItem[]
  >([]);
  const [overviewTopModelsLoading, setOverviewTopModelsLoading] =
    useState(true);
  const [overviewTopModelsError, setOverviewTopModelsError] = useState<
    string | null
  >(null);

  // Bloco 3: Catálogo de Carros
  const [catalogVehiclesData, setCatalogVehiclesData] =
    useState<AdminCatalogVehiclesResponse | null>(null);
  const [catalogVehiclesLoading, setCatalogVehiclesLoading] = useState(false);
  const [catalogVehiclesError, setCatalogVehiclesError] = useState<
    string | null
  >(null);
  const [catalogVehiclesActionError, setCatalogVehiclesActionError] = useState<
    string | null
  >(null);
  const [togglingVehicleId, setTogglingVehicleId] = useState<string | null>(
    null
  );
  const [cvSearchDraft, setCvSearchDraft] = useState("");
  const [cvCategoryDraft, setCvCategoryDraft] = useState<VehicleCategory | "">(
    ""
  );
  const [cvStatusDraft, setCvStatusDraft] = useState<AdminStatusFilter>("all");
  const [cvAppliedQuery, setCvAppliedQuery] =
    useState<AdminCatalogVehiclesQuery>({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      status: "all",
    });

  // Bloco 4: Carros de Usuários (somente leitura)
  const [userVehiclesData, setUserVehiclesData] =
    useState<AdminUserVehiclesResponse | null>(null);
  const [userVehiclesLoading, setUserVehiclesLoading] = useState(false);
  const [userVehiclesError, setUserVehiclesError] = useState<string | null>(
    null
  );
  const [uvSearchDraft, setUvSearchDraft] = useState("");
  const [uvBrandDraft, setUvBrandDraft] = useState("");
  const [uvCategoryDraft, setUvCategoryDraft] = useState<VehicleCategory | "">(
    ""
  );
  const [uvKmMinDraft, setUvKmMinDraft] = useState("");
  const [uvKmMaxDraft, setUvKmMaxDraft] = useState("");
  const [uvFilterError, setUvFilterError] = useState<string | null>(null);
  const [uvAppliedQuery, setUvAppliedQuery] = useState<AdminUserVehiclesQuery>({
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
  });

  // Bloco 5: Catálogo de Manutenções
  const [catalogServicesData, setCatalogServicesData] =
    useState<AdminCatalogServicesResponse | null>(null);
  const [catalogServicesLoading, setCatalogServicesLoading] = useState(false);
  const [catalogServicesError, setCatalogServicesError] = useState<
    string | null
  >(null);
  const [catalogServicesActionError, setCatalogServicesActionError] = useState<
    string | null
  >(null);
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(
    null
  );
  const [csSearchDraft, setCsSearchDraft] = useState("");
  const [csCategoryDraft, setCsCategoryDraft] = useState("");
  const [csCombustionDraft, setCsCombustionDraft] = useState<"all" | boolean>(
    "all"
  );
  const [csStatusDraft, setCsStatusDraft] = useState<AdminStatusFilter>("all");
  const [csAppliedQuery, setCsAppliedQuery] =
    useState<AdminCatalogServicesQuery>({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      combustionOnly: "all",
      status: "all",
    });

  // Modais CRUD
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] =
    useState<AdminCatalogVehicle | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<AdminCatalogService | null>(null);

  const loadedTabsRef = useRef<Record<AdminTab, boolean>>({
    overview: false,
    catalog_vehicles: false,
    user_vehicles: false,
    catalog_services: false,
  });

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

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await adminClient.getOverview();
      setOverview(data);
    } catch (err) {
      setOverviewError(
        formatError(err, "Não foi possível carregar os indicadores do painel.")
      );
    } finally {
      setOverviewLoading(false);
    }
  }, [adminClient]);

  const fetchOverviewTopModels = useCallback(async () => {
    setOverviewTopModelsLoading(true);
    setOverviewTopModelsError(null);
    try {
      const data = await adminClient.listUserVehicles({ page: 1, limit: 5 });
      setOverviewTopModels(data.topModels);
    } catch (err) {
      setOverviewTopModelsError(
        formatError(
          err,
          "Não foi possível carregar o ranking de modelos mais cadastrados."
        )
      );
    } finally {
      setOverviewTopModelsLoading(false);
    }
  }, [adminClient]);

  const fetchCatalogVehicles = useCallback(
    async (query: AdminCatalogVehiclesQuery) => {
      setCatalogVehiclesLoading(true);
      setCatalogVehiclesError(null);
      try {
        const data = await adminClient.listCatalogVehicles(query);
        setCatalogVehiclesData(data);
      } catch (err) {
        setCatalogVehiclesError(
          formatError(err, "Não foi possível carregar o catálogo de carros.")
        );
      } finally {
        setCatalogVehiclesLoading(false);
      }
    },
    [adminClient]
  );

  const fetchUserVehicles = useCallback(
    async (query: AdminUserVehiclesQuery) => {
      setUserVehiclesLoading(true);
      setUserVehiclesError(null);
      try {
        const data = await adminClient.listUserVehicles(query);
        setUserVehiclesData(data);
      } catch (err) {
        setUserVehiclesError(
          formatError(err, "Não foi possível carregar os carros de usuários.")
        );
      } finally {
        setUserVehiclesLoading(false);
      }
    },
    [adminClient]
  );

  const fetchCatalogServices = useCallback(
    async (query: AdminCatalogServicesQuery) => {
      setCatalogServicesLoading(true);
      setCatalogServicesError(null);
      try {
        const data = await adminClient.listCatalogServices(query);
        setCatalogServicesData(data);
      } catch (err) {
        setCatalogServicesError(
          formatError(
            err,
            "Não foi possível carregar o catálogo de manutenções."
          )
        );
      } finally {
        setCatalogServicesLoading(false);
      }
    },
    [adminClient]
  );

  // Carga inicial independente de KPIs e Top Models
  useEffect(() => {
    loadedTabsRef.current.overview = true;
    void fetchOverview();
    void fetchOverviewTopModels();
  }, [fetchOverview, fetchOverviewTopModels]);

  // Carga sob demanda ao alternar de aba pela 1ª vez
  useEffect(() => {
    if (activeTab === "catalog_vehicles" && !loadedTabsRef.current.catalog_vehicles) {
      loadedTabsRef.current.catalog_vehicles = true;
      void fetchCatalogVehicles(cvAppliedQuery);
    } else if (
      activeTab === "user_vehicles" &&
      !loadedTabsRef.current.user_vehicles
    ) {
      loadedTabsRef.current.user_vehicles = true;
      void fetchUserVehicles(uvAppliedQuery);
    } else if (
      activeTab === "catalog_services" &&
      !loadedTabsRef.current.catalog_services
    ) {
      loadedTabsRef.current.catalog_services = true;
      void fetchCatalogServices(csAppliedQuery);
    }
  }, [
    activeTab,
    csAppliedQuery,
    cvAppliedQuery,
    fetchCatalogServices,
    fetchCatalogVehicles,
    fetchUserVehicles,
    uvAppliedQuery,
  ]);

  const handleRefreshAll = useCallback(async () => {
    if (refreshingAll) return;
    setRefreshingAll(true);
    try {
      const tasks: Promise<void>[] = [fetchOverview()];
      if (activeTab === "overview") {
        tasks.push(fetchOverviewTopModels());
      } else if (activeTab === "catalog_vehicles") {
        tasks.push(fetchCatalogVehicles(cvAppliedQuery));
      } else if (activeTab === "user_vehicles") {
        tasks.push(fetchUserVehicles(uvAppliedQuery));
      } else if (activeTab === "catalog_services") {
        tasks.push(fetchCatalogServices(csAppliedQuery));
      }
      await Promise.allSettled(tasks);
    } finally {
      setRefreshingAll(false);
    }
  }, [
    activeTab,
    csAppliedQuery,
    cvAppliedQuery,
    fetchCatalogServices,
    fetchCatalogVehicles,
    fetchOverview,
    fetchOverviewTopModels,
    fetchUserVehicles,
    refreshingAll,
    uvAppliedQuery,
  ]);

  // ===== Handlers Catálogo de Carros =====
  function handleApplyCatalogVehicleFilters() {
    const nextQuery: AdminCatalogVehiclesQuery = {
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      search: cvSearchDraft.trim() || undefined,
      category: cvCategoryDraft || undefined,
      status: cvStatusDraft,
    };
    setCvAppliedQuery(nextQuery);
    loadedTabsRef.current.catalog_vehicles = true;
    void fetchCatalogVehicles(nextQuery);
  }

  function handleClearCatalogVehicleFilters() {
    setCvSearchDraft("");
    setCvCategoryDraft("");
    setCvStatusDraft("all");
    const nextQuery: AdminCatalogVehiclesQuery = {
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      status: "all",
    };
    setCvAppliedQuery(nextQuery);
    loadedTabsRef.current.catalog_vehicles = true;
    void fetchCatalogVehicles(nextQuery);
  }

  function handleCatalogVehiclesPage(nextPage: number) {
    const nextQuery: AdminCatalogVehiclesQuery = {
      ...cvAppliedQuery,
      page: nextPage,
    };
    setCvAppliedQuery(nextQuery);
    void fetchCatalogVehicles(nextQuery);
  }

  async function handleToggleCatalogVehicleActive(item: AdminCatalogVehicle) {
    if (togglingVehicleId) return;
    setTogglingVehicleId(item.id);
    setCatalogVehiclesActionError(null);
    try {
      const updated = await adminClient.updateCatalogVehicle(item.id, {
        active: !item.active,
      });
      showToast(
        updated.active
          ? `${updated.brand} ${updated.model} ${updated.year} reativado no catálogo.`
          : `${updated.brand} ${updated.model} ${updated.year} desativado no catálogo (veículos de usuários permanecem íntegros).`
      );
      await Promise.allSettled([
        fetchCatalogVehicles(cvAppliedQuery),
        fetchOverview(),
      ]);
    } catch (err) {
      setCatalogVehiclesActionError(
        formatError(
          err,
          "Não foi possível alterar o status do veículo no catálogo."
        )
      );
    } finally {
      setTogglingVehicleId(null);
    }
  }

  function handleCatalogVehicleSaved(saved: AdminCatalogVehicle) {
    const isEdit = Boolean(editingVehicle);
    showToast(
      isEdit
        ? `${saved.brand} ${saved.model} ${saved.year} atualizado no catálogo.`
        : `${saved.brand} ${saved.model} ${saved.year} adicionado ao catálogo oficial!`
    );
    void fetchOverview();
    if (loadedTabsRef.current.catalog_vehicles) {
      void fetchCatalogVehicles(cvAppliedQuery);
    }
  }

  // ===== Handlers Carros de Usuários =====
  function handleApplyUserVehicleFilters() {
    const kmMin = parseOptionalNonNegInt(uvKmMinDraft);
    const kmMax = parseOptionalNonNegInt(uvKmMaxDraft);

    if (kmMin === "invalid" || kmMax === "invalid") {
      setUvFilterError(
        "Informe quilometragem mínima e máxima como inteiros maiores ou iguais a 0."
      );
      return;
    }
    if (kmMin !== undefined && kmMax !== undefined && kmMin > kmMax) {
      setUvFilterError(
        "A quilometragem máxima deve ser maior ou igual à mínima."
      );
      return;
    }

    setUvFilterError(null);
    const nextQuery: AdminUserVehiclesQuery = {
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      search: uvSearchDraft.trim() || undefined,
      brand: uvBrandDraft.trim() || undefined,
      category: uvCategoryDraft || undefined,
      kmMin,
      kmMax,
    };
    setUvAppliedQuery(nextQuery);
    loadedTabsRef.current.user_vehicles = true;
    void fetchUserVehicles(nextQuery);
  }

  function handleClearUserVehicleFilters() {
    setUvSearchDraft("");
    setUvBrandDraft("");
    setUvCategoryDraft("");
    setUvKmMinDraft("");
    setUvKmMaxDraft("");
    setUvFilterError(null);
    const nextQuery: AdminUserVehiclesQuery = {
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
    };
    setUvAppliedQuery(nextQuery);
    loadedTabsRef.current.user_vehicles = true;
    void fetchUserVehicles(nextQuery);
  }

  function handleUserVehiclesPage(nextPage: number) {
    const nextQuery: AdminUserVehiclesQuery = {
      ...uvAppliedQuery,
      page: nextPage,
    };
    setUvAppliedQuery(nextQuery);
    void fetchUserVehicles(nextQuery);
  }

  // ===== Handlers Catálogo de Manutenções =====
  function handleApplyCatalogServiceFilters() {
    const nextQuery: AdminCatalogServicesQuery = {
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      search: csSearchDraft.trim() || undefined,
      category: csCategoryDraft || undefined,
      combustionOnly: csCombustionDraft,
      status: csStatusDraft,
    };
    setCsAppliedQuery(nextQuery);
    loadedTabsRef.current.catalog_services = true;
    void fetchCatalogServices(nextQuery);
  }

  function handleClearCatalogServiceFilters() {
    setCsSearchDraft("");
    setCsCategoryDraft("");
    setCsCombustionDraft("all");
    setCsStatusDraft("all");
    const nextQuery: AdminCatalogServicesQuery = {
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      combustionOnly: "all",
      status: "all",
    };
    setCsAppliedQuery(nextQuery);
    loadedTabsRef.current.catalog_services = true;
    void fetchCatalogServices(nextQuery);
  }

  function handleCatalogServicesPage(nextPage: number) {
    const nextQuery: AdminCatalogServicesQuery = {
      ...csAppliedQuery,
      page: nextPage,
    };
    setCsAppliedQuery(nextQuery);
    void fetchCatalogServices(nextQuery);
  }

  async function handleToggleCatalogServiceActive(item: AdminCatalogService) {
    if (togglingServiceId) return;
    setTogglingServiceId(item.id);
    setCatalogServicesActionError(null);
    try {
      const updated = await adminClient.updateCatalogService(item.id, {
        active: !item.active,
      });
      showToast(
        updated.active
          ? `Serviço “${updated.name}” reativado no catálogo.`
          : `Serviço “${updated.name}” desativado (registros históricos permanecem preservados).`
      );
      await Promise.allSettled([
        fetchCatalogServices(csAppliedQuery),
        fetchOverview(),
      ]);
    } catch (err) {
      setCatalogServicesActionError(
        formatError(
          err,
          "Não foi possível alterar o status do serviço no catálogo."
        )
      );
    } finally {
      setTogglingServiceId(null);
    }
  }

  function handleCatalogServiceSaved(saved: AdminCatalogService) {
    const isEdit = Boolean(editingService);
    showToast(
      isEdit
        ? `Serviço “${saved.name}” atualizado no catálogo.`
        : `Serviço “${saved.name}” adicionado ao catálogo de manutenções!`
    );
    void fetchOverview();
    if (loadedTabsRef.current.catalog_services) {
      void fetchCatalogServices(csAppliedQuery);
    }
  }

  const maxTopModelCount = Math.max(
    1,
    ...overviewTopModels.map((item) => item.count)
  );

  return (
    <View style={aStyles.container}>
      {/* CABEÇALHO DO ADMINISTRADOR (RF-05) */}
      <View style={aStyles.heroCard}>
        <View style={aStyles.heroTopRow}>
          <View style={aStyles.heroTextWrap}>
            <View style={aStyles.eyebrowRow}>
              <Text style={aStyles.eyebrow}>PAINEL DO ADMINISTRADOR</Text>
              <View style={aStyles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#ff8c9b" />
                <Text style={aStyles.adminBadgeText}>Acesso Admin</Text>
              </View>
            </View>

            <Text style={aStyles.heroTitle}>
              Olá, {user?.name ?? "Administrador"}
            </Text>
            <Text style={aStyles.heroSubtitle}>
              Acompanhe métricas em tempo real e gerencie o catálogo oficial de
              carros e manutenções do TorqueLab.
            </Text>

            <View style={aStyles.metaRow}>
              {user?.email && (
                <View style={aStyles.metaChip}>
                  <Ionicons name="mail-outline" size={13} color="#ff8c9b" />
                  <Text style={aStyles.metaChipText}>{user.email}</Text>
                </View>
              )}
              {user?.status && (
                <View style={aStyles.metaChip}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={13}
                    color="#86efac"
                  />
                  <Text style={aStyles.metaChipText}>
                    Status: {user.status === "active" ? "Ativo" : user.status}
                  </Text>
                </View>
              )}
              {overview?.generatedAt && (
                <View style={aStyles.metaChip}>
                  <Ionicons name="time-outline" size={13} color="#fcd34d" />
                  <Text style={aStyles.metaChipText}>
                    Última atualização:{" "}
                    {formatSyncTimestamp(overview.generatedAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={aStyles.heroActions}>
            <TouchableOpacity
              onPress={() => void handleRefreshAll()}
              disabled={refreshingAll}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[
                pStyles.secondaryBtn,
                refreshingAll && { opacity: 0.7 },
              ]}
            >
              {refreshingAll ? (
                <ActivityIndicator color="#efe5e8" size="small" />
              ) : (
                <Ionicons name="refresh-outline" size={16} color="#efe5e8" />
              )}
              <Text style={pStyles.secondaryBtnText}>
                {refreshingAll ? "Atualizando..." : "Atualizar dados"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => switchAdminPortal("user")}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={pStyles.primaryCtaBtn}
              {...webAttr({ "data-torque-cta": "1" })}
            >
              <Ionicons name="car-sport-outline" size={16} color="#ffffff" />
              <Text style={pStyles.primaryCtaText}>Abrir Minha Garagem</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Toast de feedback */}
      {toastMessage && (
        <View style={pStyles.toastBanner} accessibilityRole="alert">
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <Text style={pStyles.toastText}>{toastMessage}</Text>
          <TouchableOpacity
            onPress={() => setToastMessage(null)}
            accessibilityRole="button"
            accessibilityLabel="Fechar notificação"
          >
            <Ionicons name="close" size={18} color="#dcfce7" />
          </TouchableOpacity>
        </View>
      )}

      {/* 4 CARDS DE KPIs EM TEMPO REAL (RF-01, Cenário 1, fallback isolado RN-04) */}
      <View style={aStyles.kpiSection}>
        {overviewError && (
          <View style={aStyles.blockErrorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={18} color="#fca5a5" />
            <View style={{ flex: 1, minWidth: 180 }}>
              <Text style={aStyles.blockErrorTitle}>
                Erro ao carregar os indicadores (KPIs)
              </Text>
              <Text style={aStyles.blockErrorText}>{overviewError}</Text>
            </View>
            <TouchableOpacity
              onPress={() => void fetchOverview()}
              disabled={overviewLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={aStyles.retryBtn}
            >
              <Text style={aStyles.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {overviewLoading && !overview ? (
          <View style={aStyles.kpiGrid}>
            {[0, 1, 2, 3].map((idx) => (
              <View key={idx} style={aStyles.kpiSkeletonCard}>
                <ActivityIndicator color="#e43b55" size="small" />
                <Text style={aStyles.skeletonText}>Carregando KPI...</Text>
              </View>
            ))}
          </View>
        ) : overview ? (
          <View style={aStyles.kpiGrid}>
            {/* KPI 1: Usuários cadastrados */}
            <View style={aStyles.kpiCard}>
              <View style={aStyles.kpiTopRow}>
                <Text style={aStyles.kpiEyebrow}>USUÁRIOS CADASTRADOS</Text>
                <Ionicons name="people-outline" size={17} color="#ff8c9b" />
              </View>
              <Text style={aStyles.kpiNumber}>{overview.users.total}</Text>
              <Text style={aStyles.kpiSub}>
                {overview.users.active} ativos · +{overview.users.newLast30Days}{" "}
                nos últimos 30 dias
              </Text>
              <View style={aStyles.kpiFootBadge}>
                <Text style={aStyles.kpiFootBadgeText}>
                  {overview.users.adminCount} admin(s) separados
                </Text>
              </View>
            </View>

            {/* KPI 2: Carros no catálogo */}
            <TouchableOpacity
              onPress={() => setActiveTab("catalog_vehicles")}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={aStyles.kpiCard}
            >
              <View style={aStyles.kpiTopRow}>
                <Text style={aStyles.kpiEyebrow}>CARROS NO CATÁLOGO</Text>
                <Ionicons name="car-sport-outline" size={17} color="#ff8c9b" />
              </View>
              <Text style={aStyles.kpiNumber}>
                {overview.catalogVehicles.total}
              </Text>
              <Text style={aStyles.kpiSub}>
                {overview.catalogVehicles.active} ativos ·{" "}
                {overview.catalogVehicles.inactive} inativos
              </Text>
              <Text style={aStyles.kpiLinkHint}>Gerenciar catálogo →</Text>
            </TouchableOpacity>

            {/* KPI 3: Carros de usuários */}
            <TouchableOpacity
              onPress={() => setActiveTab("user_vehicles")}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={aStyles.kpiCard}
            >
              <View style={aStyles.kpiTopRow}>
                <Text style={aStyles.kpiEyebrow}>CARROS DE USUÁRIOS</Text>
                <Ionicons
                  name="speedometer-outline"
                  size={17}
                  color="#ff8c9b"
                />
              </View>
              <Text style={aStyles.kpiNumber}>
                {overview.userVehicles.total}
              </Text>
              <Text style={aStyles.kpiSub}>
                Média de{" "}
                {overview.userVehicles.averagePerActiveUser
                  .toFixed(2)
                  .replace(".", ",")}{" "}
                por usuário ativo
              </Text>
              <Text style={aStyles.kpiLinkHint}>Explorar frota →</Text>
            </TouchableOpacity>

            {/* KPI 4: Catálogo de manutenções e serviços */}
            <TouchableOpacity
              onPress={() => setActiveTab("catalog_services")}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[aStyles.kpiCard, aStyles.kpiHighlightCard]}
            >
              <View style={aStyles.kpiTopRow}>
                <Text style={aStyles.kpiEyebrow}>
                  CATÁLOGO DE MANUTENÇÕES
                </Text>
                <Ionicons name="construct-outline" size={17} color="#ff8c9b" />
              </View>
              <View style={aStyles.kpiValueRow}>
                <Text style={aStyles.kpiNumber}>
                  {overview.catalogServices.active}
                </Text>
                <Text style={aStyles.kpiUnit}>ativos</Text>
              </View>
              <Text style={aStyles.kpiSub}>
                {overview.catalogServices.total} total ·{" "}
                {overview.catalogServices.inactive} inativos
              </Text>
              <Text style={aStyles.kpiLinkHint}>Gerenciar serviços →</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* NAVEGAÇÃO EM 4 ABAS (RF-05) */}
      <View style={aStyles.tabsBar}>
        {(
          [
            { id: "overview", label: "Visão Geral", icon: "grid-outline" },
            {
              id: "catalog_vehicles",
              label: "Catálogo de Carros",
              icon: "car-sport-outline",
            },
            {
              id: "user_vehicles",
              label: "Carros de Usuários",
              icon: "speedometer-outline",
            },
            {
              id: "catalog_services",
              label: "Catálogo de Manutenções",
              icon: "construct-outline",
            },
          ] as {
            id: AdminTab;
            label: string;
            icon: keyof typeof Ionicons.glyphMap;
          }[]
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[aStyles.tabBtn, active && aStyles.tabBtnActive]}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? "#ffffff" : "#b9adb2"}
              />
              <Text style={[aStyles.tabText, active && aStyles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === "overview" && (
        <View style={aStyles.tabBody}>
          <View style={aStyles.panelCard}>
            <Text style={pStyles.sectionEyebrow}>AÇÕES RÁPIDAS</Text>
            <Text style={aStyles.panelTitle}>
              Gestão imediata de catálogos
            </Text>
            <Text style={aStyles.panelSubtitle}>
              Adicione veículos de referência ou novos serviços preventivos com
              auditoria automática (`updatedBy`).
            </Text>

            <View style={aStyles.quickActionsRow}>
              <TouchableOpacity
                onPress={() => {
                  setEditingVehicle(null);
                  setVehicleModalOpen(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={pStyles.primaryCtaBtn}
              >
                <Ionicons name="add-circle-outline" size={17} color="#ffffff" />
                <Text style={pStyles.primaryCtaText}>
                  + Novo carro no catálogo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setEditingService(null);
                  setServiceModalOpen(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={aStyles.accentOutlineBtn}
              >
                <Ionicons name="construct-outline" size={16} color="#ff8c9b" />
                <Text style={aStyles.accentOutlineBtnText}>
                  + Novo serviço de manutenção
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("user_vehicles")}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={pStyles.secondaryBtn}
              >
                <Ionicons
                  name="speedometer-outline"
                  size={15}
                  color="#efe5e8"
                />
                <Text style={pStyles.secondaryBtnText}>
                  Ver Carros de Usuários
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={aStyles.panelCard}>
            <View style={aStyles.panelHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.sectionEyebrow}>RANKING DA PLATAFORMA</Text>
                <Text style={aStyles.panelTitle}>
                  Modelos mais cadastrados pelos usuários
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab("user_vehicles")}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={pStyles.secondaryBtn}
              >
                <Text style={pStyles.secondaryBtnText}>Ver listagem completa</Text>
              </TouchableOpacity>
            </View>

            {overviewTopModelsError ? (
              <View style={aStyles.blockErrorBanner} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                <Text style={[aStyles.blockErrorText, { flex: 1 }]}>
                  {overviewTopModelsError}
                </Text>
                <TouchableOpacity
                  onPress={() => void fetchOverviewTopModels()}
                  style={aStyles.retryBtn}
                  accessibilityRole="button"
                >
                  <Text style={aStyles.retryBtnText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : overviewTopModelsLoading ? (
              <View style={aStyles.centerLoading}>
                <ActivityIndicator color="#e43b55" size="small" />
                <Text style={aStyles.mutedText}>Carregando ranking...</Text>
              </View>
            ) : overviewTopModels.length === 0 ? (
              <Text style={aStyles.mutedText}>
                Ainda não há veículos cadastrados nas garagens dos usuários.
              </Text>
            ) : (
              <View style={aStyles.rankingList}>
                {overviewTopModels.map((item, idx) => {
                  const pct = Math.max(
                    8,
                    Math.round((item.count / maxTopModelCount) * 100)
                  );
                  return (
                    <View
                      key={`${item.brand}-${item.model}`}
                      style={aStyles.rankingItem}
                    >
                      <View style={aStyles.rankingTop}>
                        <Text style={aStyles.rankingLabel}>
                          #{idx + 1} · {item.brand} {item.model}
                        </Text>
                        <Text style={aStyles.rankingCount}>
                          {item.count}{" "}
                          {item.count === 1 ? "veículo" : "veículos"}
                        </Text>
                      </View>
                      <View style={aStyles.rankingTrack}>
                        <View
                          style={[aStyles.rankingFill, { width: `${pct}%` }]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* ABA 2: CATÁLOGO DE CARROS (RF-03, Cenário 3) */}
      {activeTab === "catalog_vehicles" && (
        <View style={aStyles.tabBody}>
          <View style={aStyles.panelCard}>
            <View style={aStyles.panelHeaderRow}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={pStyles.sectionEyebrow}>CRUD DO CATÁLOGO</Text>
                <Text style={aStyles.panelTitle}>Catálogo de Carros</Text>
                <Text style={aStyles.panelSubtitle}>
                  Desativar um modelo impede novos cadastros sem afetar carros
                  já salvos nas garagens dos usuários.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditingVehicle(null);
                  setVehicleModalOpen(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={pStyles.primaryCtaBtn}
              >
                <Ionicons name="add-circle-outline" size={17} color="#ffffff" />
                <Text style={pStyles.primaryCtaText}>+ Novo carro</Text>
              </TouchableOpacity>
            </View>

            {/* Filtros */}
            <View style={aStyles.filterBox}>
              <View style={aStyles.filterInputRow}>
                <TextInput
                  style={[pStyles.input, aStyles.filterSearchInput]}
                  value={cvSearchDraft}
                  onChangeText={setCvSearchDraft}
                  placeholder="Buscar marca, modelo ou combustível..."
                  placeholderTextColor="#6d6268"
                  onSubmitEditing={handleApplyCatalogVehicleFilters}
                />
                <TouchableOpacity
                  onPress={handleApplyCatalogVehicleFilters}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={aStyles.applyBtn}
                >
                  <Ionicons name="search" size={15} color="#ffffff" />
                  <Text style={aStyles.applyBtnText}>Aplicar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearCatalogVehicleFilters}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={pStyles.secondaryBtn}
                >
                  <Text style={pStyles.secondaryBtnText}>Limpar</Text>
                </TouchableOpacity>
              </View>

              <View style={aStyles.filterGroup}>
                <Text style={aStyles.filterGroupLabel}>Categoria:</Text>
                <View style={pStyles.filterRow}>
                  {VEHICLE_CATEGORY_FILTERS.map((opt) => {
                    const active = cvCategoryDraft === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value || "all"}
                        onPress={() => setCvCategoryDraft(opt.value)}
                        style={[
                          pStyles.filterPill,
                          active && pStyles.filterPillActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            pStyles.filterPillText,
                            active && pStyles.filterPillTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={aStyles.filterGroup}>
                <Text style={aStyles.filterGroupLabel}>Status:</Text>
                <View style={pStyles.filterRow}>
                  {STATUS_FILTERS.map((opt) => {
                    const active = cvStatusDraft === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setCvStatusDraft(opt.value)}
                        style={[
                          pStyles.filterPill,
                          active && pStyles.filterPillActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            pStyles.filterPillText,
                            active && pStyles.filterPillTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {catalogVehiclesActionError && (
              <View style={aStyles.blockErrorBanner} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={17} color="#fca5a5" />
                <Text style={[aStyles.blockErrorText, { flex: 1 }]}>
                  {catalogVehiclesActionError}
                </Text>
              </View>
            )}

            {catalogVehiclesError ? (
              <View style={aStyles.blockErrorBanner} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                <View style={{ flex: 1, minWidth: 180 }}>
                  <Text style={aStyles.blockErrorTitle}>
                    Falha ao carregar catálogo de carros
                  </Text>
                  <Text style={aStyles.blockErrorText}>
                    {catalogVehiclesError}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void fetchCatalogVehicles(cvAppliedQuery)}
                  style={aStyles.retryBtn}
                  accessibilityRole="button"
                >
                  <Text style={aStyles.retryBtnText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : catalogVehiclesLoading && !catalogVehiclesData ? (
              <View style={aStyles.centerLoading}>
                <ActivityIndicator color="#e43b55" size="large" />
                <Text style={aStyles.mutedText}>
                  Carregando catálogo de carros...
                </Text>
              </View>
            ) : !catalogVehiclesData ||
              catalogVehiclesData.items.length === 0 ? (
              <View style={aStyles.emptyBox}>
                <Text style={aStyles.mutedText}>
                  Nenhum veículo encontrado no catálogo com os filtros atuais.
                </Text>
              </View>
            ) : (
              <>
                <View style={aStyles.itemsList}>
                  {catalogVehiclesData.items.map((item) => {
                    const toggling = togglingVehicleId === item.id;
                    const unit =
                      item.category === "electric" ? "km/kWh" : "km/L";
                    return (
                      <View
                        key={item.id}
                        style={[
                          aStyles.rowCard,
                          !item.active && aStyles.rowCardInactive,
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 210 }}>
                          <View style={aStyles.rowTitleLine}>
                            <Text style={aStyles.rowTitle}>
                              {item.brand} {item.model} {item.year}
                            </Text>
                            <View
                              style={[
                                aStyles.statusPill,
                                item.active
                                  ? aStyles.statusPillActive
                                  : aStyles.statusPillInactive,
                              ]}
                            >
                              <Text
                                style={[
                                  aStyles.statusPillText,
                                  item.active
                                    ? aStyles.statusPillTextActive
                                    : aStyles.statusPillTextInactive,
                                ]}
                              >
                                {item.active ? "Ativo" : "Inativo"}
                              </Text>
                            </View>
                          </View>

                          <View style={aStyles.rowMetaWrap}>
                            <Text style={aStyles.rowMetaChip}>
                              {CATEGORY_LABELS[item.category]}
                            </Text>
                            <Text style={aStyles.rowMetaChip}>{item.fuel}</Text>
                            <Text style={aStyles.rowMetaChip}>
                              Fator{" "}
                              {item.costFactor.toFixed(2).replace(".", ",")}x
                            </Text>
                            <Text style={aStyles.rowMetaChip}>
                              Ref.{" "}
                              {item.referenceConsumption
                                .toFixed(1)
                                .replace(".", ",")}{" "}
                              {unit}
                            </Text>
                            {item.fipePrice && (
                              <Text style={aStyles.rowMetaChip}>
                                FIPE {item.fipePrice}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View style={aStyles.rowActions}>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingVehicle(item);
                              setVehicleModalOpen(true);
                            }}
                            disabled={Boolean(togglingVehicleId)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            style={aStyles.editBtn}
                          >
                            <Ionicons
                              name="create-outline"
                              size={14}
                              color="#efe5e8"
                            />
                            <Text style={aStyles.editBtnText}>Editar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              void handleToggleCatalogVehicleActive(item)
                            }
                            disabled={Boolean(togglingVehicleId)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            style={[
                              aStyles.toggleBtn,
                              item.active
                                ? aStyles.deactivateBtn
                                : aStyles.reactivateBtn,
                              toggling && { opacity: 0.65 },
                            ]}
                          >
                            {toggling ? (
                              <ActivityIndicator
                                size="small"
                                color={item.active ? "#fca5a5" : "#86efac"}
                              />
                            ) : (
                              <Ionicons
                                name={
                                  item.active
                                    ? "pause-circle-outline"
                                    : "play-circle-outline"
                                }
                                size={15}
                                color={item.active ? "#fca5a5" : "#86efac"}
                              />
                            )}
                            <Text
                              style={[
                                aStyles.toggleBtnText,
                                item.active
                                  ? { color: "#fca5a5" }
                                  : { color: "#86efac" },
                              ]}
                            >
                              {item.active ? "Desativar" : "Reativar"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <PaginationBar
                  pagination={catalogVehiclesData.pagination}
                  loading={catalogVehiclesLoading}
                  onPageChange={handleCatalogVehiclesPage}
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* ABA 3: CARROS DE USUÁRIOS — SOMENTE LEITURA (RF-02, Cenário 4) */}
      {activeTab === "user_vehicles" && (
        <View style={aStyles.tabBody}>
          <View style={aStyles.panelCard}>
            <View style={aStyles.panelHeaderRow}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <View style={aStyles.eyebrowRow}>
                  <Text style={pStyles.sectionEyebrow}>
                    VISÃO ANALÍTICA DA FROTA
                  </Text>
                  <View style={aStyles.readOnlyBadge}>
                    <Ionicons name="eye-outline" size={12} color="#7dd3fc" />
                    <Text style={aStyles.readOnlyBadgeText}>
                      Somente leitura
                    </Text>
                  </View>
                </View>
                <Text style={aStyles.panelTitle}>Carros de Usuários</Text>
                <Text style={aStyles.panelSubtitle}>
                  Explore os veículos cadastrados nas garagens dos usuários com
                  privacidade (e-mails mascarados).
                </Text>
              </View>
            </View>

            {/* Filtros */}
            <View style={aStyles.filterBox}>
              <View style={aStyles.filterInputRow}>
                <TextInput
                  style={[pStyles.input, aStyles.filterSearchInput]}
                  value={uvSearchDraft}
                  onChangeText={setUvSearchDraft}
                  placeholder="Busca geral (modelo, apelido, proprietário)..."
                  placeholderTextColor="#6d6268"
                  onSubmitEditing={handleApplyUserVehicleFilters}
                />
                <TextInput
                  style={[pStyles.input, aStyles.filterBrandInput]}
                  value={uvBrandDraft}
                  onChangeText={setUvBrandDraft}
                  placeholder="Marca (ex.: Toyota)"
                  placeholderTextColor="#6d6268"
                  onSubmitEditing={handleApplyUserVehicleFilters}
                />
              </View>

              <View style={aStyles.filterInputRow}>
                <TextInput
                  style={[pStyles.input, aStyles.filterKmInput]}
                  value={uvKmMinDraft}
                  onChangeText={(text) => {
                    setUvKmMinDraft(text.replace(/[^\d]/g, ""));
                    setUvFilterError(null);
                  }}
                  keyboardType="numeric"
                  placeholder="KM mínimo (ex.: 10000)"
                  placeholderTextColor="#6d6268"
                />
                <TextInput
                  style={[pStyles.input, aStyles.filterKmInput]}
                  value={uvKmMaxDraft}
                  onChangeText={(text) => {
                    setUvKmMaxDraft(text.replace(/[^\d]/g, ""));
                    setUvFilterError(null);
                  }}
                  keyboardType="numeric"
                  placeholder="KM máximo (ex.: 100000)"
                  placeholderTextColor="#6d6268"
                />
                <TouchableOpacity
                  onPress={handleApplyUserVehicleFilters}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={aStyles.applyBtn}
                >
                  <Ionicons name="funnel-outline" size={14} color="#ffffff" />
                  <Text style={aStyles.applyBtnText}>Aplicar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearUserVehicleFilters}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={pStyles.secondaryBtn}
                >
                  <Text style={pStyles.secondaryBtnText}>Limpar</Text>
                </TouchableOpacity>
              </View>

              <View style={aStyles.filterGroup}>
                <Text style={aStyles.filterGroupLabel}>Categoria:</Text>
                <View style={pStyles.filterRow}>
                  {VEHICLE_CATEGORY_FILTERS.map((opt) => {
                    const active = uvCategoryDraft === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value || "all"}
                        onPress={() => setUvCategoryDraft(opt.value)}
                        style={[
                          pStyles.filterPill,
                          active && pStyles.filterPillActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            pStyles.filterPillText,
                            active && pStyles.filterPillTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {uvFilterError && (
                <Text style={aStyles.inlineFilterError}>{uvFilterError}</Text>
              )}
            </View>

            {userVehiclesError ? (
              <View style={aStyles.blockErrorBanner} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                <View style={{ flex: 1, minWidth: 180 }}>
                  <Text style={aStyles.blockErrorTitle}>
                    Falha ao carregar carros de usuários
                  </Text>
                  <Text style={aStyles.blockErrorText}>
                    {userVehiclesError}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void fetchUserVehicles(uvAppliedQuery)}
                  style={aStyles.retryBtn}
                  accessibilityRole="button"
                >
                  <Text style={aStyles.retryBtnText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : userVehiclesLoading && !userVehiclesData ? (
              <View style={aStyles.centerLoading}>
                <ActivityIndicator color="#e43b55" size="large" />
                <Text style={aStyles.mutedText}>
                  Carregando veículos cadastrados...
                </Text>
              </View>
            ) : !userVehiclesData || userVehiclesData.items.length === 0 ? (
              <View style={aStyles.emptyBox}>
                <Text style={aStyles.mutedText}>
                  Nenhum veículo de usuário encontrado para os filtros
                  informados.
                </Text>
              </View>
            ) : (
              <>
                {userVehiclesData.topModels.length > 0 && (
                  <View style={aStyles.topModelsStrip}>
                    <Text style={aStyles.topModelsStripTitle}>
                      Top modelos no recorte:
                    </Text>
                    <View style={aStyles.topModelsChips}>
                      {userVehiclesData.topModels.map((top) => (
                        <View
                          key={`${top.brand}-${top.model}`}
                          style={aStyles.topModelChip}
                        >
                          <Text style={aStyles.topModelChipText}>
                            {top.brand} {top.model} ({top.count})
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={aStyles.itemsList}>
                  {userVehiclesData.items.map((item) => (
                    <View key={item.id} style={aStyles.rowCard}>
                      <View style={{ flex: 1, minWidth: 210 }}>
                        <View style={aStyles.rowTitleLine}>
                          <Text style={aStyles.rowTitle}>
                            {item.brand} {item.model} {item.year}
                          </Text>
                          <View style={aStyles.kmPill}>
                            <Ionicons
                              name="speedometer-outline"
                              size={12}
                              color="#ff8c9b"
                            />
                            <Text style={aStyles.kmPillText}>
                              {formatKm(item.currentKm)}
                            </Text>
                          </View>
                        </View>

                        {(item.nickname || item.version) && (
                          <Text style={aStyles.rowSubline}>
                            {[item.nickname, item.version]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        )}

                        <View style={aStyles.rowMetaWrap}>
                          <Text style={aStyles.rowMetaChip}>
                            {CATEGORY_LABELS[item.category]}
                          </Text>
                          <Text style={aStyles.rowMetaChip}>{item.fuel}</Text>
                          <Text style={aStyles.rowMetaChip}>
                            Cadastrado em {formatIsoDateShort(item.createdAt)}
                          </Text>
                        </View>
                      </View>

                      <View style={aStyles.ownerBox}>
                        <View style={aStyles.ownerRow}>
                          <Ionicons
                            name="person-outline"
                            size={13}
                            color="#ff8c9b"
                          />
                          <Text style={aStyles.ownerName} numberOfLines={1}>
                            {item.ownerName}
                          </Text>
                        </View>
                        <Text style={aStyles.ownerEmail} numberOfLines={1}>
                          {item.ownerEmailMasked}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <PaginationBar
                  pagination={userVehiclesData.pagination}
                  loading={userVehiclesLoading}
                  onPageChange={handleUserVehiclesPage}
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* ABA 4: CATÁLOGO DE MANUTENÇÕES (RF-04, Cenários 2 e 5) */}
      {activeTab === "catalog_services" && (
        <View style={aStyles.tabBody}>
          <View style={aStyles.panelCard}>
            <View style={aStyles.panelHeaderRow}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={pStyles.sectionEyebrow}>CRUD DE SERVIÇOS</Text>
                <Text style={aStyles.panelTitle}>
                  Catálogo de Manutenções e Serviços
                </Text>
                <Text style={aStyles.panelSubtitle}>
                  Serviços ativos alimentam imediatamente o cálculo do Dashboard
                  do Usuário sem alterar históricos concluídos.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditingService(null);
                  setServiceModalOpen(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={pStyles.primaryCtaBtn}
              >
                <Ionicons name="add-circle-outline" size={17} color="#ffffff" />
                <Text style={pStyles.primaryCtaText}>+ Novo serviço</Text>
              </TouchableOpacity>
            </View>

            {/* Filtros */}
            <View style={aStyles.filterBox}>
              <View style={aStyles.filterInputRow}>
                <TextInput
                  style={[pStyles.input, aStyles.filterSearchInput]}
                  value={csSearchDraft}
                  onChangeText={setCsSearchDraft}
                  placeholder="Buscar por nome do serviço ou observação..."
                  placeholderTextColor="#6d6268"
                  onSubmitEditing={handleApplyCatalogServiceFilters}
                />
                <TouchableOpacity
                  onPress={handleApplyCatalogServiceFilters}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={aStyles.applyBtn}
                >
                  <Ionicons name="search" size={15} color="#ffffff" />
                  <Text style={aStyles.applyBtnText}>Aplicar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearCatalogServiceFilters}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={pStyles.secondaryBtn}
                >
                  <Text style={pStyles.secondaryBtnText}>Limpar</Text>
                </TouchableOpacity>
              </View>

              <View style={aStyles.filterGroup}>
                <Text style={aStyles.filterGroupLabel}>Categoria:</Text>
                <View style={pStyles.filterRow}>
                  {SERVICE_CATEGORY_FILTERS.map((opt) => {
                    const active = csCategoryDraft === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value || "all"}
                        onPress={() => setCsCategoryDraft(opt.value)}
                        style={[
                          pStyles.filterPill,
                          active && pStyles.filterPillActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            pStyles.filterPillText,
                            active && pStyles.filterPillTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={aStyles.filterGroup}>
                <Text style={aStyles.filterGroupLabel}>Motorização:</Text>
                <View style={pStyles.filterRow}>
                  {COMBUSTION_FILTERS.map((opt) => {
                    const active = csCombustionDraft === opt.value;
                    return (
                      <TouchableOpacity
                        key={String(opt.value)}
                        onPress={() => setCsCombustionDraft(opt.value)}
                        style={[
                          pStyles.filterPill,
                          active && pStyles.filterPillActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            pStyles.filterPillText,
                            active && pStyles.filterPillTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={aStyles.filterGroup}>
                <Text style={aStyles.filterGroupLabel}>Status:</Text>
                <View style={pStyles.filterRow}>
                  {STATUS_FILTERS.map((opt) => {
                    const active = csStatusDraft === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setCsStatusDraft(opt.value)}
                        style={[
                          pStyles.filterPill,
                          active && pStyles.filterPillActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            pStyles.filterPillText,
                            active && pStyles.filterPillTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {catalogServicesActionError && (
              <View style={aStyles.blockErrorBanner} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={17} color="#fca5a5" />
                <Text style={[aStyles.blockErrorText, { flex: 1 }]}>
                  {catalogServicesActionError}
                </Text>
              </View>
            )}

            {catalogServicesError ? (
              <View style={aStyles.blockErrorBanner} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                <View style={{ flex: 1, minWidth: 180 }}>
                  <Text style={aStyles.blockErrorTitle}>
                    Falha ao carregar catálogo de manutenções
                  </Text>
                  <Text style={aStyles.blockErrorText}>
                    {catalogServicesError}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void fetchCatalogServices(csAppliedQuery)}
                  style={aStyles.retryBtn}
                  accessibilityRole="button"
                >
                  <Text style={aStyles.retryBtnText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : catalogServicesLoading && !catalogServicesData ? (
              <View style={aStyles.centerLoading}>
                <ActivityIndicator color="#e43b55" size="large" />
                <Text style={aStyles.mutedText}>
                  Carregando catálogo de manutenções...
                </Text>
              </View>
            ) : !catalogServicesData ||
              catalogServicesData.items.length === 0 ? (
              <View style={aStyles.emptyBox}>
                <Text style={aStyles.mutedText}>
                  Nenhum serviço encontrado com os filtros atuais.
                </Text>
              </View>
            ) : (
              <>
                <View style={aStyles.itemsList}>
                  {catalogServicesData.items.map((item) => {
                    const toggling = togglingServiceId === item.id;
                    return (
                      <View
                        key={item.id}
                        style={[
                          aStyles.rowCard,
                          !item.active && aStyles.rowCardInactive,
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 210 }}>
                          <View style={aStyles.rowTitleLine}>
                            <Text style={aStyles.rowTitle}>{item.name}</Text>
                            <View
                              style={[
                                aStyles.statusPill,
                                item.active
                                  ? aStyles.statusPillActive
                                  : aStyles.statusPillInactive,
                              ]}
                            >
                              <Text
                                style={[
                                  aStyles.statusPillText,
                                  item.active
                                    ? aStyles.statusPillTextActive
                                    : aStyles.statusPillTextInactive,
                                ]}
                              >
                                {item.active ? "Ativo" : "Inativo"}
                              </Text>
                            </View>
                            <View
                              style={[
                                aStyles.motorBadge,
                                item.combustionOnly
                                  ? aStyles.motorBadgeCombustion
                                  : aStyles.motorBadgeUniversal,
                              ]}
                            >
                              <Ionicons
                                name={
                                  item.combustionOnly
                                    ? "flame-outline"
                                    : "flash-outline"
                                }
                                size={11}
                                color={
                                  item.combustionOnly ? "#fcd34d" : "#7dd3fc"
                                }
                              />
                              <Text
                                style={[
                                  aStyles.motorBadgeText,
                                  item.combustionOnly
                                    ? { color: "#fcd34d" }
                                    : { color: "#7dd3fc" },
                                ]}
                              >
                                {item.combustionOnly
                                  ? "Combustão"
                                  : "Universal / EV"}
                              </Text>
                            </View>
                          </View>

                          <View style={aStyles.rowMetaWrap}>
                            <Text style={aStyles.rowMetaChip}>
                              {item.category}
                            </Text>
                            <Text style={aStyles.rowMetaChip}>
                              A cada {formatKm(item.intervalKm)}
                            </Text>
                            {item.intervalMonths !== null && (
                              <Text style={aStyles.rowMetaChip}>
                                ou {item.intervalMonths}{" "}
                                {item.intervalMonths === 1 ? "mês" : "meses"}
                              </Text>
                            )}
                            <Text style={aStyles.priceChip}>
                              Base {formatCurrencyBRL(item.baseCost)}
                            </Text>
                          </View>

                          {item.notes && (
                            <Text style={aStyles.serviceNotes}>
                              {item.notes}
                            </Text>
                          )}
                        </View>

                        <View style={aStyles.rowActions}>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingService(item);
                              setServiceModalOpen(true);
                            }}
                            disabled={Boolean(togglingServiceId)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            style={aStyles.editBtn}
                          >
                            <Ionicons
                              name="create-outline"
                              size={14}
                              color="#efe5e8"
                            />
                            <Text style={aStyles.editBtnText}>Editar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              void handleToggleCatalogServiceActive(item)
                            }
                            disabled={Boolean(togglingServiceId)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            style={[
                              aStyles.toggleBtn,
                              item.active
                                ? aStyles.deactivateBtn
                                : aStyles.reactivateBtn,
                              toggling && { opacity: 0.65 },
                            ]}
                          >
                            {toggling ? (
                              <ActivityIndicator
                                size="small"
                                color={item.active ? "#fca5a5" : "#86efac"}
                              />
                            ) : (
                              <Ionicons
                                name={
                                  item.active
                                    ? "pause-circle-outline"
                                    : "play-circle-outline"
                                }
                                size={15}
                                color={item.active ? "#fca5a5" : "#86efac"}
                              />
                            )}
                            <Text
                              style={[
                                aStyles.toggleBtnText,
                                item.active
                                  ? { color: "#fca5a5" }
                                  : { color: "#86efac" },
                              ]}
                            >
                              {item.active ? "Desativar" : "Reativar"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <PaginationBar
                  pagination={catalogServicesData.pagination}
                  loading={catalogServicesLoading}
                  onPageChange={handleCatalogServicesPage}
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* MODAIS DE CRUD */}
      <CatalogVehicleModal
        visible={vehicleModalOpen}
        vehicle={editingVehicle}
        onClose={() => {
          setVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSaved={handleCatalogVehicleSaved}
        adminClient={adminClient}
      />

      <CatalogServiceModal
        visible={serviceModalOpen}
        service={editingService}
        onClose={() => {
          setServiceModalOpen(false);
          setEditingService(null);
        }}
        onSaved={handleCatalogServiceSaved}
        adminClient={adminClient}
      />
    </View>
  );
}

const aStyles = StyleSheet.create({
  container: {
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.34)",
    borderRadius: 22,
    padding: 22,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  heroTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 230,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  eyebrow: {
    color: "#ff6b7f",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(228, 59, 85, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.42)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  adminBadgeText: {
    color: "#ff8c9b",
    fontSize: 10,
    fontWeight: "800",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    color: "#b7aab0",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#191721",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: {
    color: "#e2d8dc",
    fontSize: 12,
    fontWeight: "700",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  kpiSection: {
    gap: 10,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 185,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  kpiHighlightCard: {
    borderColor: "rgba(228, 59, 85, 0.34)",
    backgroundColor: "#16121b",
  },
  kpiSkeletonCard: {
    flex: 1,
    minWidth: 185,
    minHeight: 118,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  skeletonText: {
    color: "#8f8288",
    fontSize: 12,
    fontWeight: "700",
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  kpiEyebrow: {
    color: "#9c8f95",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  kpiValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  kpiNumber: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  kpiUnit: {
    color: "#ff8c9b",
    fontSize: 12,
    fontWeight: "800",
  },
  kpiSub: {
    color: "#b7aab0",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  kpiFootBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1a1824",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  kpiFootBadgeText: {
    color: "#cbbec3",
    fontSize: 10,
    fontWeight: "700",
  },
  kpiLinkHint: {
    color: "#ff8c9b",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  tabsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 5,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: "#e43b55",
  },
  tabText: {
    color: "#b9adb2",
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  tabBody: {
    gap: 14,
  },
  panelCard: {
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  panelTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  panelSubtitle: {
    color: "#a799a0",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  quickActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  accentOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(228, 59, 85, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.4)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  accentOutlineBtnText: {
    color: "#ff9aa7",
    fontSize: 13,
    fontWeight: "800",
  },
  rankingList: {
    gap: 12,
  },
  rankingItem: {
    gap: 6,
  },
  rankingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rankingLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  rankingCount: {
    color: "#ff8c9b",
    fontSize: 12,
    fontWeight: "800",
  },
  rankingTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: "#1d1a26",
    overflow: "hidden",
  },
  rankingFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: "#e43b55",
  },
  blockErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.42)",
    borderRadius: 14,
    padding: 13,
  },
  blockErrorTitle: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "800",
  },
  blockErrorText: {
    color: "#fee2e2",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  retryBtn: {
    backgroundColor: "#e43b55",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  centerLoading: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: {
    color: "#a99ca2",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  filterBox: {
    backgroundColor: "#171520",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 13,
    gap: 10,
  },
  filterInputRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  filterSearchInput: {
    flex: 1,
    minWidth: 200,
    paddingVertical: 10,
    fontSize: 13,
  },
  filterBrandInput: {
    flex: 0.7,
    minWidth: 150,
    paddingVertical: 10,
    fontSize: 13,
  },
  filterKmInput: {
    flex: 1,
    minWidth: 135,
    paddingVertical: 10,
    fontSize: 13,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#e43b55",
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  applyBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  filterGroup: {
    gap: 6,
  },
  filterGroupLabel: {
    color: "#9c8f95",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  inlineFilterError: {
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "700",
  },
  itemsList: {
    gap: 10,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "#171520",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 15,
    padding: 14,
  },
  rowCardInactive: {
    opacity: 0.74,
    borderColor: "rgba(255,255,255,0.05)",
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  rowTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  rowSubline: {
    color: "#cbbec3",
    fontSize: 12,
    marginTop: 3,
    fontWeight: "600",
  },
  rowMetaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 7,
  },
  rowMetaChip: {
    color: "#b7aab0",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  priceChip: {
    color: "#86efac",
    fontSize: 11,
    fontWeight: "800",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  serviceNotes: {
    color: "#968a90",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  statusPill: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillActive: {
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    borderColor: "rgba(34, 197, 94, 0.38)",
  },
  statusPillInactive: {
    backgroundColor: "rgba(156, 143, 149, 0.14)",
    borderColor: "rgba(156, 143, 149, 0.32)",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusPillTextActive: {
    color: "#86efac",
  },
  statusPillTextInactive: {
    color: "#b7aab0",
  },
  motorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  motorBadgeCombustion: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.36)",
  },
  motorBadgeUniversal: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.36)",
  },
  motorBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1f1c29",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  editBtnText: {
    color: "#efe5e8",
    fontSize: 12,
    fontWeight: "700",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  deactivateBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.11)",
    borderColor: "rgba(239, 68, 68, 0.34)",
  },
  reactivateBtn: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.36)",
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.36)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  readOnlyBadgeText: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "800",
  },
  topModelsStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#15121c",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.24)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topModelsStripTitle: {
    color: "#cbbec3",
    fontSize: 11,
    fontWeight: "800",
  },
  topModelsChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  topModelChip: {
    backgroundColor: "rgba(228, 59, 85, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.34)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  topModelChipText: {
    color: "#ff9aa7",
    fontSize: 11,
    fontWeight: "800",
  },
  kmPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(228, 59, 85, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.32)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  kmPillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  ownerBox: {
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 185,
    maxWidth: 260,
    gap: 2,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ownerName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
  },
  ownerEmail: {
    color: "#9c8f95",
    fontSize: 11,
    fontWeight: "600",
  },
  paginationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  paginationText: {
    color: "#b7aab0",
    fontSize: 12,
    fontWeight: "700",
  },
  paginationActions: {
    flexDirection: "row",
    gap: 8,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1a1722",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    color: "#efe5e8",
    fontSize: 12,
    fontWeight: "700",
  },
});
