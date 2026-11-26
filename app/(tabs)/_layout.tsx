import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "@/lib/auth/AuthContext";
import WebPolish from "../components/WebPolish";

export default function RootLayout() {
  return (
    <AuthProvider>
      <WebPolish />
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#09090b",
          },
        }}
      />
    </AuthProvider>
  );
}
