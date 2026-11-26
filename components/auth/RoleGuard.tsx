import React, { useEffect, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  INSUFFICIENT_PERMISSION_NOTICE,
  useAuth,
} from "@/lib/auth/AuthContext";
import type { UserRole } from "@/lib/auth/types";

export interface RoleGuardProps {
  requiredRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGuard({
  requiredRole,
  children,
  fallback,
}: RoleGuardProps) {
  const { user, permissionNotice, switchAdminPortal } = useAuth();

  const hasPermission = Boolean(user && user.role === requiredRole);

  useEffect(() => {
    if (requiredRole === "admin" && !hasPermission) {
      switchAdminPortal("admin");
    }
  }, [hasPermission, requiredRole, switchAdminPortal]);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <View style={guardStyles.container} accessibilityRole="alert">
      <View style={guardStyles.iconWrap}>
        <Ionicons name="lock-closed-outline" size={24} color="#ff8c9b" />
      </View>
      <Text style={guardStyles.title}>Acesso restrito</Text>
      <Text style={guardStyles.message}>
        {permissionNotice ?? INSUFFICIENT_PERMISSION_NOTICE}
      </Text>
      <TouchableOpacity
        style={guardStyles.button}
        activeOpacity={0.85}
        accessibilityRole="button"
        onPress={() => switchAdminPortal("user")}
      >
        <Ionicons name="car-sport-outline" size={16} color="#ffffff" />
        <Text style={guardStyles.buttonText}>Ir para o Dashboard do Usuário</Text>
      </TouchableOpacity>
    </View>
  );
}

const guardStyles = StyleSheet.create({
  container: {
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.38)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    marginVertical: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(228, 59, 85, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  message: {
    color: "#cbbec3",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 420,
  },
  button: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#e43b55",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
