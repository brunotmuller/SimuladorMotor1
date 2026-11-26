import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { DashboardResponse } from "./types";

export const DASHBOARD_CACHE_KEY_PREFIX = "torquelab-dashboard-cache-v1:";

export function getDashboardCacheKey(ownerId: string): string {
  return `${DASHBOARD_CACHE_KEY_PREFIX}${ownerId.trim()}`;
}

function isSsrWebEnvironment(): boolean {
  return Platform.OS === "web" && typeof window === "undefined";
}

function isValidCachedDashboard(value: unknown): value is DashboardResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.empty === "boolean" &&
    Array.isArray(record.vehicles) &&
    Array.isArray(record.maintenances) &&
    Array.isArray(record.history) &&
    (record.activeVehicle === null ||
      (typeof record.activeVehicle === "object" &&
        !Array.isArray(record.activeVehicle))) &&
    (record.summary === null ||
      (typeof record.summary === "object" && !Array.isArray(record.summary)))
  );
}

export async function loadCachedDashboard(
  ownerId: string
): Promise<DashboardResponse | null> {
  const normalizedOwnerId = typeof ownerId === "string" ? ownerId.trim() : "";
  if (!normalizedOwnerId || isSsrWebEnvironment()) {
    return null;
  }

  try {
    const raw = await AsyncStorage.getItem(
      getDashboardCacheKey(normalizedOwnerId)
    );
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isValidCachedDashboard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCachedDashboard(
  ownerId: string,
  data: DashboardResponse
): Promise<boolean> {
  const normalizedOwnerId = typeof ownerId === "string" ? ownerId.trim() : "";
  if (!normalizedOwnerId || isSsrWebEnvironment()) {
    return false;
  }

  try {
    await AsyncStorage.setItem(
      getDashboardCacheKey(normalizedOwnerId),
      JSON.stringify(data)
    );
    return true;
  } catch {
    return false;
  }
}

export async function clearCachedDashboard(ownerId: string): Promise<void> {
  const normalizedOwnerId = typeof ownerId === "string" ? ownerId.trim() : "";
  if (!normalizedOwnerId || isSsrWebEnvironment()) {
    return;
  }

  try {
    await AsyncStorage.removeItem(getDashboardCacheKey(normalizedOwnerId));
  } catch {
    // Ignore cache clear failures during graceful degradation.
  }
}
