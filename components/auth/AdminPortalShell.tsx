import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthClientError } from "@/lib/auth/authClient";
import { useAuth } from "@/lib/auth/AuthContext";
import { defaultAuthClient } from "@/lib/auth/defaultAuthClient";
import RoleGuard from "./RoleGuard";

type HealthState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

const ADMIN_MODULES: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  badge: string;
  description: string;
  metricsHint: string;
}[] = [
  {
    id: "users",
    icon: "people-outline",
    title: "Usuários cadastrados",
    badge: "RBAC",
    description:
      "Listagem de contas, controle de papéis (user/admin), bloqueio de acessos e auditoria de atividade.",
    metricsHint: "Pronto para specs/admin-dashboard.md",
  },
  {
    id: "catalog-cars",
    icon: "car-sport-outline",
    title: "Carros no catálogo",
    badge: "Catálogo",
    description:
      "Curadoria de marcas, modelos, versões, motorizações e especificações padrão exibidas na plataforma.",
    metricsHint: "Base oficial de veículos TorqueLab",
  },
  {
    id: "user-cars",
    icon: "speedometer-outline",
    title: "Carros de usuários",
    badge: "Frota",
    description:
      "Visão agregada dos veículos cadastrados pelos motoristas, faixas de quilometragem e saúde preventiva.",
    metricsHint: "Monitoramento consolidado",
  },
  {
    id: "maintenance-catalog",
    icon: "construct-outline",
    title: "Catálogo de manutenções e serviços",
    badge: "Preventiva",
    description:
      "Gestão dos intervalos preventivos, planos de revisão, alertas de calibragem e custos de referência.",
    metricsHint: "Regras e referências técnicas",
  },
];

function AdminPortalContent() {
  const { user, switchAdminPortal } = useAuth();
  const [health, setHealth] = useState<HealthState>({ status: "idle" });

  const checkAdminHealth = useCallback(async () => {
    setHealth({ status: "checking" });
    try {
      const response = await defaultAuthClient.authenticatedFetch(
        "/api/admin/health",
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        setHealth({
          status: "error",
          message: `Resposta HTTP ${response.status} ao validar /api/admin/health.`,
        });
        return;
      }

      setHealth({
        status: "ok",
        message: "Sessão administrativa validada via GET /api/admin/health.",
      });
    } catch (error) {
      const message =
        error instanceof AuthClientError
          ? error.message
          : "Não foi possível consultar o servidor administrativo.";
      setHealth({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void checkAdminHealth();
  }, [checkAdminHealth]);

  return (
    <View style={adminStyles.container}>
      <View style={adminStyles.heroCard}>
        <View style={adminStyles.heroTopRow}>
          <View style={adminStyles.heroTextWrap}>
            <View style={adminStyles.eyebrowRow}>
              <Text style={adminStyles.eyebrow}>PAINEL DO ADMINISTRADOR</Text>
              <View style={adminStyles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#ff8c9b" />
                <Text style={adminStyles.adminBadgeText}>Acesso Admin</Text>
              </View>
            </View>

            <Text style={adminStyles.heroTitle}>
              Olá, {user?.name ?? "Administrador"}
            </Text>
            <Text style={adminStyles.heroSubtitle}>
              Gerencie usuários, catálogo de veículos, frota cadastrada e planos
              de manutenção do TorqueLab em um só lugar.
            </Text>

            {user?.email && (
              <View style={adminStyles.metaRow}>
                <View style={adminStyles.metaChip}>
                  <Ionicons name="mail-outline" size={13} color="#ff8c9b" />
                  <Text style={adminStyles.metaChipText}>{user.email}</Text>
                </View>
                <View style={adminStyles.metaChip}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={13}
                    color="#86efac"
                  />
                  <Text style={adminStyles.metaChipText}>
                    Status: {user.status === "active" ? "Ativo" : user.status}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={adminStyles.heroActions}>
            <TouchableOpacity
              onPress={() => switchAdminPortal("user")}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={adminStyles.primaryBtn}
            >
              <Ionicons name="car-sport-outline" size={16} color="#ffffff" />
              <Text style={adminStyles.primaryBtnText}>
                Abrir Minha Garagem
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={adminStyles.healthCard}>
        <View style={adminStyles.healthLeft}>
          <View
            style={[
              adminStyles.healthIconBox,
              health.status === "ok" && adminStyles.healthIconOk,
              health.status === "error" && adminStyles.healthIconErr,
            ]}
          >
            {health.status === "checking" ? (
              <ActivityIndicator size="small" color="#ff8c9b" />
            ) : (
              <Ionicons
                name={
                  health.status === "ok"
                    ? "shield-checkmark"
                    : health.status === "error"
                      ? "warning-outline"
                      : "pulse-outline"
                }
                size={18}
                color={
                  health.status === "ok"
                    ? "#86efac"
                    : health.status === "error"
                      ? "#fca5a5"
                      : "#ff8c9b"
                }
              />
            )}
          </View>

          <View style={adminStyles.healthTextWrap}>
            <Text style={adminStyles.healthTitle}>
              Status da sessão administrativa (RBAC)
            </Text>
            <Text style={adminStyles.healthDesc}>
              {health.status === "checking"
                ? "Verificando permissão no endpoint /api/admin/health..."
                : health.status === "ok" || health.status === "error"
                  ? health.message
                  : "Clique em verificar para testar a rota protegida /api/admin/health."}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={checkAdminHealth}
          disabled={health.status === "checking"}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={adminStyles.secondaryBtn}
        >
          <Ionicons name="refresh-outline" size={15} color="#efe5e8" />
          <Text style={adminStyles.secondaryBtnText}>Verificar acesso</Text>
        </TouchableOpacity>
      </View>

      <View style={adminStyles.sectionHeader}>
        <Text style={adminStyles.sectionEyebrow}>MÓDULOS ADMINISTRATIVOS</Text>
        <Text style={adminStyles.sectionTitle}>
          Visão estruturada da plataforma
        </Text>
        <Text style={adminStyles.sectionSubtitle}>
          Estes blocos serão populados pelos indicadores e CRUDs definidos em{" "}
          specs/admin-dashboard.md.
        </Text>
      </View>

      <View style={adminStyles.cardsGrid}>
        {ADMIN_MODULES.map((mod) => (
          <View key={mod.id} style={adminStyles.moduleCard}>
            <View style={adminStyles.moduleTop}>
              <View style={adminStyles.moduleIconWrap}>
                <Ionicons name={mod.icon} size={20} color="#ff8c9b" />
              </View>
              <View style={adminStyles.moduleBadge}>
                <Text style={adminStyles.moduleBadgeText}>{mod.badge}</Text>
              </View>
            </View>

            <Text style={adminStyles.moduleTitle}>{mod.title}</Text>
            <Text style={adminStyles.moduleDesc}>{mod.description}</Text>

            <View style={adminStyles.moduleFooter}>
              <Ionicons name="layers-outline" size={13} color="#8f8288" />
              <Text style={adminStyles.moduleFooterText}>
                {mod.metricsHint}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AdminPortalShell() {
  return (
    <RoleGuard requiredRole="admin">
      <AdminPortalContent />
    </RoleGuard>
  );
}

const adminStyles = StyleSheet.create({
  container: {
    gap: 18,
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
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    color: "#b7aab0",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
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
    justifyContent: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#e43b55",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  healthCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 18,
    padding: 16,
  },
  healthLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 220,
  },
  healthIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(228, 59, 85, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  healthIconOk: {
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    borderColor: "rgba(34, 197, 94, 0.38)",
  },
  healthIconErr: {
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  healthTextWrap: {
    flex: 1,
  },
  healthTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  healthDesc: {
    color: "#b7aab0",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1a1722",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    color: "#efe5e8",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionEyebrow: {
    color: "#ff6b7f",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    color: "#a799a0",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  moduleCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  moduleTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moduleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(228, 59, 85, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  moduleBadge: {
    backgroundColor: "#1a1824",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  moduleBadgeText: {
    color: "#cbbec3",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  moduleTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  moduleDesc: {
    color: "#b7aab0",
    fontSize: 13,
    lineHeight: 19,
  },
  moduleFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  moduleFooterText: {
    color: "#9c8f95",
    fontSize: 11,
    fontWeight: "700",
  },
});
