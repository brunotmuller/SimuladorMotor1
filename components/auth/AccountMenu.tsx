import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth/AuthContext";

export default function AccountMenu() {
  const {
    status,
    user,
    activePortal,
    signOut,
    exitGuestMode,
    switchAdminPortal,
  } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  if (status === "guest") {
    return (
      <View style={menuStyles.shell}>
        <View style={menuStyles.guestBadge}>
          <Ionicons name="eye-outline" size={13} color="#fcd34d" />
          <Text style={menuStyles.guestBadgeText}>Modo Visitante</Text>
        </View>

        <TouchableOpacity
          onPress={exitGuestMode}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={menuStyles.loginCtaBtn}
        >
          <Ionicons name="log-in-outline" size={14} color="#ffffff" />
          <Text style={menuStyles.loginCtaText}>Entrar / Criar conta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status !== "authenticated" || !user) {
    return null;
  }

  const isAdmin = user.role === "admin";
  const nextPortal = activePortal === "admin" ? "user" : "admin";

  return (
    <View style={menuStyles.shell}>
      <View style={menuStyles.identityWrap}>
        <View style={menuStyles.avatarCircle}>
          <Ionicons
            name={isAdmin ? "shield-checkmark" : "person"}
            size={14}
            color={isAdmin ? "#ff8c9b" : "#d8ccd1"}
          />
        </View>

        <Text style={menuStyles.userName} numberOfLines={1}>
          {user.name}
        </Text>

        <View
          style={[
            menuStyles.roleBadge,
            isAdmin ? menuStyles.roleBadgeAdmin : menuStyles.roleBadgeUser,
          ]}
        >
          <Text
            style={[
              menuStyles.roleBadgeText,
              isAdmin
                ? menuStyles.roleBadgeTextAdmin
                : menuStyles.roleBadgeTextUser,
            ]}
          >
            {isAdmin ? "Admin" : "Usuário"}
          </Text>
        </View>
      </View>

      <View style={menuStyles.actionsRow}>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => switchAdminPortal(nextPortal)}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={menuStyles.portalBtn}
          >
            <Ionicons
              name={
                activePortal === "admin"
                  ? "car-sport-outline"
                  : "shield-outline"
              }
              size={14}
              color="#ff8c9b"
            />
            <Text style={menuStyles.portalBtnText}>
              {activePortal === "admin" ? "Minha Garagem" : "Painel Admin"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={[menuStyles.logoutBtn, signingOut && menuStyles.btnDisabled]}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color="#d8ccd1" />
          ) : (
            <Ionicons name="log-out-outline" size={14} color="#d8ccd1" />
          )}
          <Text style={menuStyles.logoutBtnText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const menuStyles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  identityWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    maxWidth: 220,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#1b1824",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  roleBadge: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeAdmin: {
    backgroundColor: "rgba(228, 59, 85, 0.16)",
    borderColor: "rgba(228, 59, 85, 0.45)",
  },
  roleBadgeUser: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  roleBadgeTextAdmin: {
    color: "#ff8c9b",
  },
  roleBadgeTextUser: {
    color: "#cbbec3",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  portalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(228, 59, 85, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.38)",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  portalBtnText: {
    color: "#ff9aa7",
    fontSize: 12,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1a1824",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutBtnText: {
    color: "#e2d8dc",
    fontSize: 12,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  guestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.36)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  guestBadgeText: {
    color: "#fcd34d",
    fontSize: 11,
    fontWeight: "800",
  },
  loginCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e43b55",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  loginCtaText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
});
