import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMonthlyUsageOption } from "@/lib/preventive/catalog";
import { evaluateVehicleHealth, formatKm } from "@/lib/preventive/engine";
import {
  CustomIntervalOverride,
  MaintenanceEvaluation,
  MaintenanceItemId,
  MaintenanceStatus,
  PreventiveVehicle,
  TirePressureSpec,
} from "@/lib/preventive/types";
import CalibrationGuideCard from "./CalibrationGuideCard";
import ConfirmServiceModal from "./ConfirmServiceModal";
import MaintenanceCard from "./MaintenanceCard";
import MaintenanceDetailModal from "./MaintenanceDetailModal";
import ServiceHistorySection from "./ServiceHistorySection";
import UpdateKmModal from "./UpdateKmModal";
import { STATUS_THEME, pStyles, webAttr } from "./styles";

type Props = {
  vehicles: PreventiveVehicle[];
  activeVehicle: PreventiveVehicle | null;
  toastMessage: string;
  onDismissToast: () => void;
  onSelectVehicle: (id: string) => void;
  onOpenNewVehicle: () => void;
  onOpenEditVehicle: (vehicle: PreventiveVehicle) => void;
  onUpdateKm: (newKm: number) => void;
  onCompleteMaintenance: (params: {
    itemId: MaintenanceItemId;
    performedDate: string;
    performedKm: number;
    notes?: string;
  }) => void;
  onSaveCustomInterval: (
    itemId: MaintenanceItemId,
    override: CustomIntervalOverride | null
  ) => void;
  onSaveTirePressure: (spec: TirePressureSpec) => void;
  onOpenFullHistory: () => void;
  onOpenSimulator: () => void;
};

type FilterType = "all" | MaintenanceStatus;

export default function PreventiveDashboard({
  vehicles,
  activeVehicle,
  toastMessage,
  onDismissToast,
  onSelectVehicle,
  onOpenNewVehicle,
  onOpenEditVehicle,
  onUpdateKm,
  onCompleteMaintenance,
  onSaveCustomInterval,
  onSaveTirePressure,
  onOpenFullHistory,
  onOpenSimulator,
}: Props) {
  const [kmModalOpen, setKmModalOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<MaintenanceItemId | null>(
    null
  );
  const [confirmItemId, setConfirmItemId] = useState<MaintenanceItemId | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<FilterType>("all");

  const health = useMemo(
    () => (activeVehicle ? evaluateVehicleHealth(activeVehicle) : null),
    [activeVehicle]
  );

  const detailEvaluation = useMemo(
    () =>
      health && detailItemId
        ? health.items.find((i) => i.definition.id === detailItemId) ?? null
        : null,
    [health, detailItemId]
  );

  const confirmEvaluation = useMemo(
    () =>
      health && confirmItemId
        ? health.items.find((i) => i.definition.id === confirmItemId) ?? null
        : null,
    [health, confirmItemId]
  );

  const filteredItems = useMemo(() => {
    if (!health) return [];
    if (statusFilter === "all") return health.items;
    return health.items.filter((item) => item.status === statusFilter);
  }, [health, statusFilter]);

  if (!activeVehicle || !health) {
    return (
      <View style={pStyles.vehicleHeroCard}>
        <View style={pStyles.emptyBox}>
          <Ionicons name="car-sport-outline" size={38} color="#ff6b7f" />
          <Text style={[pStyles.vehicleTitle, { textAlign: "center", fontSize: 22 }]}>
            Bem-vindo ao seu Assistente de Manutenção
          </Text>
          <Text style={pStyles.emptySub}>
            Cadastre seu veículo ou escolha um dos 10 modelos populares
            brasileiros para acompanhar a saúde do carro sem precisar entender
            de mecânica.
          </Text>
          <TouchableOpacity
            onPress={onOpenNewVehicle}
            style={[pStyles.primaryCtaBtn, { marginTop: 10 }]}
            accessibilityRole="button"
            {...webAttr({ "data-torque-cta": "1" })}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={pStyles.primaryCtaText}>Cadastrar meu veículo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const usageOption = getMonthlyUsageOption(activeVehicle.monthlyUsage);
  const overallTheme = STATUS_THEME[health.overallStatus];
  const vehicleLabel = `${activeVehicle.brand} ${activeVehicle.model} ${activeVehicle.year}`;

  return (
    <View>
      {/* Confirmação visual de ações */}
      {toastMessage !== "" && (
        <View style={pStyles.toastBanner} accessibilityRole="alert">
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <Text style={pStyles.toastText}>{toastMessage}</Text>
          <TouchableOpacity
            onPress={onDismissToast}
            accessibilityRole="button"
            accessibilityLabel="Fechar aviso"
          >
            <Ionicons name="close" size={18} color="#bbf7d0" />
          </TouchableOpacity>
        </View>
      )}

      {/* 1. IDENTIFICAÇÃO DO VEÍCULO + 2. QUILOMETRAGEM ATUAL + BOTÃO DESTACADO "ATUALIZAR KM" */}
      <View
        style={pStyles.vehicleHeroCard}
        {...webAttr({ "data-torque-hero": "1" })}
      >
        {/* Seletor multi-veículo */}
        <View style={pStyles.vehicleSwitcherRow}>
          {vehicles.map((veh) => {
            const isCurrent = veh.id === activeVehicle.id;
            return (
              <TouchableOpacity
                key={veh.id}
                onPress={() => onSelectVehicle(veh.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={[
                  pStyles.vehiclePill,
                  isCurrent && pStyles.vehiclePillActive,
                ]}
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

          <TouchableOpacity
            onPress={onOpenNewVehicle}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={pStyles.addCarPill}
          >
            <Ionicons name="add" size={15} color="#ff8c9b" />
            <Text style={pStyles.addCarPillText}>Novo carro</Text>
          </TouchableOpacity>
        </View>

        <View style={pStyles.vehicleTopMain}>
          <View style={pStyles.vehicleIdentity}>
            <View style={pStyles.eyebrowRow}>
              <Text style={pStyles.eyebrowTag}>ASSISTENTE PREVENTIVO</Text>
              {activeVehicle.isDemoData && (
                <View style={pStyles.demoBadge}>
                  <Text style={pStyles.demoBadgeText}>DADOS DEMONSTRATIVOS</Text>
                </View>
              )}
            </View>

            <Text style={pStyles.vehicleTitle}>
              {activeVehicle.brand} {activeVehicle.model}
            </Text>
            <Text style={pStyles.vehicleSubtitle}>
              Ano {activeVehicle.year}
              {activeVehicle.version ? ` · ${activeVehicle.version}` : ""}
            </Text>

            <View style={pStyles.vehicleMetaRow}>
              <View style={pStyles.metaChip}>
                <Ionicons name="calendar-outline" size={14} color="#ff8c9b" />
                <Text style={pStyles.metaChipText}>
                  Uso {usageOption.label.toLowerCase()} ({usageOption.rangeLabel})
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onOpenEditVehicle(activeVehicle)}
                style={pStyles.metaChip}
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={14} color="#c9bcc1" />
                <Text style={pStyles.metaChipText}>Editar veículo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenSimulator}
                style={pStyles.metaChip}
                accessibilityRole="button"
              >
                <Ionicons name="analytics-outline" size={14} color="#c9bcc1" />
                <Text style={pStyles.metaChipText}>Simulador FIPE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Caixa destacada de Quilometragem + Botão Atualizar KM */}
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
              <Ionicons name="speedometer-outline" size={18} color="#ffffff" />
              <Text style={pStyles.primaryCtaText}>Atualizar KM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. RESUMO GERAL DA SAÚDE DO VEÍCULO */}
      <View style={pStyles.summaryCard} {...webAttr({ "data-torque-card": "1" })}>
        <View style={pStyles.summaryHeader}>
          <View style={pStyles.summaryTitleWrap}>
            <Text style={pStyles.sectionEyebrow}>SAÚDE GERAL DO VEÍCULO</Text>
            <Text style={pStyles.summaryHeadline}>{health.overallHeadline}</Text>
            <Text style={pStyles.summarySub}>{health.overallDescription}</Text>
          </View>

          <View
            style={[
              pStyles.scoreBadge,
              {
                backgroundColor: overallTheme.softBg,
                borderColor: overallTheme.border,
              },
            ]}
          >
            <Text style={[pStyles.scoreNumber, { color: overallTheme.color }]}>
              {health.healthScore}%
            </Text>
            <Text style={pStyles.scoreCaption}>SAÚDE</Text>
          </View>
        </View>

        <View style={pStyles.kpiGrid}>
          <TouchableOpacity
            onPress={() =>
              setStatusFilter((prev) => (prev === "green" ? "all" : "green"))
            }
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[
              pStyles.kpiItem,
              {
                backgroundColor: STATUS_THEME.green.softBg,
                borderColor: STATUS_THEME.green.border,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={STATUS_THEME.green.color}
              />
              <Text style={[pStyles.kpiCount, { color: STATUS_THEME.green.color }]}>
                {health.greenCount}
              </Text>
            </View>
            <Text style={pStyles.kpiLabel}>Manutenções em dia</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              setStatusFilter((prev) => (prev === "yellow" ? "all" : "yellow"))
            }
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[
              pStyles.kpiItem,
              {
                backgroundColor: STATUS_THEME.yellow.softBg,
                borderColor: STATUS_THEME.yellow.border,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={STATUS_THEME.yellow.color}
              />
              <Text style={[pStyles.kpiCount, { color: STATUS_THEME.yellow.color }]}>
                {health.yellowCount}
              </Text>
            </View>
            <Text style={pStyles.kpiLabel}>Próximas do vencimento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              setStatusFilter((prev) => (prev === "red" ? "all" : "red"))
            }
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[
              pStyles.kpiItem,
              {
                backgroundColor: STATUS_THEME.red.softBg,
                borderColor: STATUS_THEME.red.border,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="warning" size={18} color={STATUS_THEME.red.color} />
              <Text style={[pStyles.kpiCount, { color: STATUS_THEME.red.color }]}>
                {health.redCount}
              </Text>
            </View>
            <Text style={pStyles.kpiLabel}>Vencidas / Atenção</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. SEÇÃO "PRÓXIMAS MANUTENÇÕES" (O QUE MERECE ATENÇÃO PRIMEIRO) */}
      <View
        style={pStyles.priorityStrip}
        {...webAttr({ "data-torque-card": "1" })}
      >
        <View style={[pStyles.sectionHeader, { marginTop: 0 }]}>
          <View>
            <Text style={pStyles.sectionEyebrow}>PRIORIDADE AGORA</Text>
            <Text style={pStyles.sectionTitle}>Próximas manutenções</Text>
            <Text style={pStyles.sectionSubtitle}>
              O que merece sua atenção primeiro, ordenado por urgência de KM ou
              prazo.
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {health.priorityItems.map((item) => {
            const theme = STATUS_THEME[item.status];
            return (
              <TouchableOpacity
                key={item.definition.id}
                onPress={() => setDetailItemId(item.definition.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[
                  pStyles.priorityItemRow,
                  { borderColor: theme.border },
                ]}
              >
                <View
                  style={[
                    pStyles.priorityIconCircle,
                    {
                      backgroundColor: theme.softBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.definition.iconName}
                    size={19}
                    color={theme.color}
                  />
                </View>

                <View style={pStyles.priorityTextWrap}>
                  <Text style={pStyles.priorityName}>
                    {item.definition.name}
                  </Text>
                  <Text style={pStyles.priorityMeta}>
                    <Text style={{ color: theme.text, fontWeight: "800" }}>
                      {item.remainingLabel}
                    </Text>{" "}
                    · Previsão: {item.nextForecastLabel}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setDetailItemId(item.definition.id)}
                    style={[pStyles.secondaryBtn, { paddingVertical: 8, paddingHorizontal: 10 }]}
                    accessibilityRole="button"
                  >
                    <Text style={[pStyles.secondaryBtnText, { fontSize: 12 }]}>
                      Entender
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setConfirmItemId(item.definition.id)}
                    style={[
                      pStyles.maintDoneBtn,
                      { flex: 0, paddingVertical: 8, paddingHorizontal: 11 },
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={pStyles.maintDoneBtnText}>Já fiz</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 5. SEMÁFORO DA SAÚDE DO CARRO (LISTA DE MANUTENÇÕES) */}
      <View style={pStyles.sectionHeader}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={pStyles.sectionEyebrow}>SEMÁFORO DA SAÚDE</Text>
          <Text style={pStyles.sectionTitle}>Lista de manutenções</Text>
          <Text style={pStyles.sectionSubtitle}>
            Toque em qualquer item para ler a explicação sem mecaniquês ou
            ajustar o prazo pelo manual do seu carro.
          </Text>
        </View>

        <View style={pStyles.filterRow}>
          {(
            [
              ["all", `Todas (${health.items.length})`],
              ["red", `Vencidas (${health.redCount})`],
              ["yellow", `Próximas (${health.yellowCount})`],
              ["green", `Em dia (${health.greenCount})`],
            ] as [FilterType, string][]
          ).map(([key, label]) => {
            const active = statusFilter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setStatusFilter(key)}
                style={[pStyles.filterPill, active && pStyles.filterPillActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    pStyles.filterPillText,
                    active && pStyles.filterPillTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {filteredItems.length === 0 ? (
        <View style={[pStyles.emptyBox, { marginBottom: 16 }]}>
          <Ionicons name="checkmark-done-circle-outline" size={28} color="#4ade80" />
          <Text style={pStyles.emptyTitle}>Nenhum item neste filtro</Text>
          <TouchableOpacity
            onPress={() => setStatusFilter("all")}
            style={pStyles.secondaryBtn}
            accessibilityRole="button"
          >
            <Text style={pStyles.secondaryBtnText}>Mostrar todas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View {...webAttr({ "data-torque-grid-2": "1" })} style={{ gap: 14 }}>
          {filteredItems.map((evaluation: MaintenanceEvaluation) => (
            <MaintenanceCard
              key={evaluation.definition.id}
              evaluation={evaluation}
              onOpenDetails={(item) => setDetailItemId(item.definition.id)}
              onMarkDone={(item) => setConfirmItemId(item.definition.id)}
            />
          ))}
        </View>
      )}

      {/* 6. GUIA DE CALIBRAGEM */}
      <CalibrationGuideCard
        vehicle={activeVehicle}
        onSaveTirePressure={onSaveTirePressure}
      />

      {/* 7. HISTÓRICO DE SERVIÇOS (PRÉVIA NO DASHBOARD) */}
      <ServiceHistorySection
        vehicleLabel={vehicleLabel}
        history={activeVehicle.history}
        compact
        onOpenFullHistory={onOpenFullHistory}
      />

      {/* MODAIS */}
      <UpdateKmModal
        visible={kmModalOpen}
        vehicleLabel={vehicleLabel}
        currentKm={activeVehicle.currentKm}
        onClose={() => setKmModalOpen(false)}
        onSave={onUpdateKm}
      />

      <MaintenanceDetailModal
        evaluation={detailEvaluation}
        onClose={() => setDetailItemId(null)}
        onMarkDone={(item) => setConfirmItemId(item.definition.id)}
        onSaveInterval={onSaveCustomInterval}
      />

      <ConfirmServiceModal
        evaluation={confirmEvaluation}
        currentKm={activeVehicle.currentKm}
        onClose={() => setConfirmItemId(null)}
        onConfirm={onCompleteMaintenance}
      />
    </View>
  );
}
