import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  AUTH_TOKENS_STORAGE_KEY,
  createKeyValueTokenStorage,
  createMemoryTokenStorage,
  parseAuthTokens,
  serializeAuthTokens,
  type KeyValueTokenAdapter,
  type TokenStorage,
} from "./tokenStorageCore";
import type { AuthTokens } from "./types";

export {
  AUTH_TOKENS_STORAGE_KEY,
  createKeyValueTokenStorage,
  createMemoryTokenStorage,
};
export type { KeyValueTokenAdapter, TokenStorage };

/**
 * Interface compatível com `expo-secure-store` para armazenamento criptografado
 * no Keychain (iOS) e Keystore (Android) quando o app é compilado com Dev Client nativo.
 *
 * Exemplo de uso com `expo-secure-store` em build nativo:
 * ```ts
 * import * as SecureStore from "expo-secure-store";
 * import { configureNativeSecureStore } from "@/lib/auth/tokenStorage";
 *
 * configureNativeSecureStore({
 *   getItemAsync: (key) => SecureStore.getItemAsync(key),
 *   setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
 *   deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
 * });
 * ```
 */
export interface NativeSecureStoreAdapter {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

let registeredNativeSecureStore: NativeSecureStoreAdapter | null = null;

export function configureNativeSecureStore(
  adapter: NativeSecureStoreAdapter | null
): void {
  registeredNativeSecureStore = adapter;
}

function getSafeWebSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storage = window.sessionStorage;
    if (!storage) {
      return null;
    }
    return storage;
  } catch {
    return null;
  }
}

export function createWebTokenStorage(
  storageKey: string = AUTH_TOKENS_STORAGE_KEY
): TokenStorage {
  const memoryFallback = createMemoryTokenStorage();

  return {
    async getTokens(): Promise<AuthTokens | null> {
      const storage = getSafeWebSessionStorage();
      if (!storage) {
        return memoryFallback.getTokens();
      }

      try {
        return parseAuthTokens(storage.getItem(storageKey));
      } catch {
        return memoryFallback.getTokens();
      }
    },

    async saveTokens(tokens: AuthTokens): Promise<void> {
      const storage = getSafeWebSessionStorage();
      if (!storage) {
        await memoryFallback.saveTokens(tokens);
        return;
      }

      try {
        storage.setItem(storageKey, serializeAuthTokens(tokens));
      } catch {
        await memoryFallback.saveTokens(tokens);
      }
    },

    async clearTokens(): Promise<void> {
      await memoryFallback.clearTokens();

      const storage = getSafeWebSessionStorage();
      if (!storage) {
        return;
      }

      try {
        storage.removeItem(storageKey);
      } catch {
        // Ignore removal errors on restricted web storage contexts.
      }
    },
  };
}

export function createNativeTokenStorage(
  options: {
    storageKey?: string;
    secureStore?: NativeSecureStoreAdapter | null;
  } = {}
): TokenStorage {
  const storageKey = options.storageKey ?? AUTH_TOKENS_STORAGE_KEY;

  const adapter: KeyValueTokenAdapter = {
    getItem: (key) => {
      const secureStore = options.secureStore ?? registeredNativeSecureStore;
      if (secureStore) {
        return secureStore.getItemAsync(key);
      }
      return AsyncStorage.getItem(key);
    },
    setItem: (key, value) => {
      const secureStore = options.secureStore ?? registeredNativeSecureStore;
      if (secureStore) {
        return secureStore.setItemAsync(key, value);
      }
      return AsyncStorage.setItem(key, value);
    },
    removeItem: (key) => {
      const secureStore = options.secureStore ?? registeredNativeSecureStore;
      if (secureStore) {
        return secureStore.deleteItemAsync(key);
      }
      return AsyncStorage.removeItem(key);
    },
  };

  return createKeyValueTokenStorage(adapter, storageKey);
}

export function createPlatformTokenStorage(
  options: {
    storageKey?: string;
    secureStore?: NativeSecureStoreAdapter | null;
  } = {}
): TokenStorage {
  if (Platform.OS === "web") {
    return createWebTokenStorage(options.storageKey);
  }

  return createNativeTokenStorage(options);
}

export const defaultTokenStorage: TokenStorage = createPlatformTokenStorage();
