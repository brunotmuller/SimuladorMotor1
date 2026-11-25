import { PreventiveStoreState, PreventiveVehicle } from "./types";

const STORAGE_VERSION = 1;

export const DEFAULT_LOCAL_OWNER_ID = "local-driver";

export function getPreventiveStorageKey(
  ownerId: string = DEFAULT_LOCAL_OWNER_ID
) {
  return `torquelab-preventive-v${STORAGE_VERSION}:${ownerId}`;
}

export interface KeyValueStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function isValidVehicle(item: unknown): item is PreventiveVehicle {
  if (!item || typeof item !== "object") return false;
  const v = item as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.brand === "string" &&
    typeof v.model === "string" &&
    typeof v.year === "number" &&
    typeof v.currentKm === "number" &&
    typeof v.monthlyUsage === "string" &&
    !!v.maintenanceRecords &&
    typeof v.maintenanceRecords === "object" &&
    Array.isArray(v.history)
  );
}

export async function loadPreventiveStoreWithAdapter(
  ownerId: string,
  adapter: KeyValueStorageAdapter
): Promise<PreventiveStoreState> {
  const empty: PreventiveStoreState = {
    version: STORAGE_VERSION,
    ownerId,
    activeVehicleId: null,
    vehicles: [],
  };

  try {
    const raw = await adapter.getItem(getPreventiveStorageKey(ownerId));
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return empty;

    const record = parsed as Record<string, unknown>;
    const rawVehicles = Array.isArray(record.vehicles) ? record.vehicles : [];
    const vehicles = rawVehicles.filter(isValidVehicle).map((v) => ({
      ...v,
      ownerId: v.ownerId || ownerId,
      customIntervals: v.customIntervals ?? {},
      tirePressure: v.tirePressure ?? null,
    }));

    const requestedActive =
      typeof record.activeVehicleId === "string" ? record.activeVehicleId : null;
    const activeVehicleId = vehicles.some((v) => v.id === requestedActive)
      ? requestedActive
      : vehicles[0]?.id ?? null;

    return {
      version: STORAGE_VERSION,
      ownerId,
      activeVehicleId,
      vehicles,
    };
  } catch {
    return empty;
  }
}

export async function savePreventiveStoreWithAdapter(
  state: PreventiveStoreState,
  adapter: KeyValueStorageAdapter
): Promise<boolean> {
  try {
    const ownerId = state.ownerId || DEFAULT_LOCAL_OWNER_ID;
    const payload: PreventiveStoreState = {
      version: STORAGE_VERSION,
      ownerId,
      activeVehicleId: state.activeVehicleId,
      vehicles: state.vehicles,
    };
    await adapter.setItem(
      getPreventiveStorageKey(ownerId),
      JSON.stringify(payload)
    );
    return true;
  } catch {
    return false;
  }
}

export async function clearPreventiveStoreWithAdapter(
  ownerId: string,
  adapter: KeyValueStorageAdapter
): Promise<void> {
  try {
    await adapter.removeItem(getPreventiveStorageKey(ownerId));
  } catch {
    // ignore clear error
  }
}
