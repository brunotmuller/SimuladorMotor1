import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_LOCAL_OWNER_ID,
  KeyValueStorageAdapter,
  clearPreventiveStoreWithAdapter,
  getPreventiveStorageKey,
  loadPreventiveStoreWithAdapter,
  savePreventiveStoreWithAdapter,
} from "./storageCore";
import { PreventiveStoreState } from "./types";

export { DEFAULT_LOCAL_OWNER_ID, getPreventiveStorageKey };
export type { KeyValueStorageAdapter };

const asyncStorageAdapter: KeyValueStorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export async function loadPreventiveStore(
  ownerId: string = DEFAULT_LOCAL_OWNER_ID,
  adapter: KeyValueStorageAdapter = asyncStorageAdapter
): Promise<PreventiveStoreState> {
  return loadPreventiveStoreWithAdapter(ownerId, adapter);
}

export async function savePreventiveStore(
  state: PreventiveStoreState,
  adapter: KeyValueStorageAdapter = asyncStorageAdapter
): Promise<boolean> {
  return savePreventiveStoreWithAdapter(state, adapter);
}

export async function clearPreventiveStore(
  ownerId: string = DEFAULT_LOCAL_OWNER_ID,
  adapter: KeyValueStorageAdapter = asyncStorageAdapter
): Promise<void> {
  return clearPreventiveStoreWithAdapter(ownerId, adapter);
}
