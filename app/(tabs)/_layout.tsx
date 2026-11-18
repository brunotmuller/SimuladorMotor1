import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import WebPolish from "../components/WebPolish";

export default function RootLayout() {
  return (
    <>
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
    </>
  );
}
