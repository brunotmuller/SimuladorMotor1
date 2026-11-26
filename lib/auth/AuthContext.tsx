import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCAL_OWNER_ID } from "@/lib/preventive/storage";
import { AuthClientError, type AuthClient } from "./authClient";
import {
  defaultAuthClient,
  subscribeSessionExpired,
} from "./defaultAuthClient";
import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "./types";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "guest";

export type ActivePortal = "user" | "admin";

export const INSUFFICIENT_PERMISSION_NOTICE =
  "Permissão insuficiente para acessar o painel administrativo.";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  activePortal: ActivePortal;
  ownerId: string;
  bootError: string | null;
  authError: string | null;
  permissionNotice: string | null;
  signIn: (payload: LoginPayload) => Promise<AuthSession>;
  signUp: (payload: RegisterPayload) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  retryRestoreSession: () => Promise<void>;
  switchAdminPortal: (portal: ActivePortal) => boolean;
  clearPermissionNotice: () => void;
}

export interface AuthProviderProps {
  children: ReactNode;
  client?: AuthClient;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  client = defaultAuthClient,
}: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activePortal, setActivePortal] = useState<ActivePortal>("user");
  const [bootError, setBootError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applyAuthenticatedUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    setStatus("authenticated");
    setActivePortal(nextUser.role === "admin" ? "admin" : "user");
    setBootError(null);
    setActionError(null);
    setPermissionNotice(null);
  }, []);

  const restoreSession = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setStatus("loading");
    setBootError(null);
    setActionError(null);

    // Evita manter a tela de inicialização presa caso o armazenamento local
    // ou a restauração da sessão não conclua no navegador publicado.
    const restoreWatchdog = setTimeout(() => {
      if (!isMountedRef.current || seq !== requestSeqRef.current) {
        return;
      }

      requestSeqRef.current += 1;
      setUser(null);
      setActivePortal("user");
      setBootError(
        "A verificação da sessão demorou mais que o esperado. Entre novamente ou continue como visitante."
      );
      setStatus("unauthenticated");
    }, 12_000);

    try {
      const storedTokens = await client.getStoredTokens();
      if (!isMountedRef.current || seq !== requestSeqRef.current) {
        return;
      }

      const hasAnyToken = Boolean(
        storedTokens &&
          (storedTokens.accessToken.trim().length > 0 ||
            storedTokens.refreshToken.trim().length > 0)
      );

      if (!hasAnyToken) {
        setUser(null);
        setActivePortal("user");
        setBootError(null);
        setStatus("unauthenticated");
        return;
      }

      const loadedUser = await client.getMe();
      if (!isMountedRef.current || seq !== requestSeqRef.current) {
        return;
      }

      applyAuthenticatedUser(loadedUser);
    } catch (error) {
      if (!isMountedRef.current || seq !== requestSeqRef.current) {
        return;
      }

      if (
        error instanceof AuthClientError &&
        (error.isTimeout || error.isNetworkError)
      ) {
        setUser(null);
        setActivePortal("user");
        setBootError(error.message);
        setStatus("unauthenticated");
        return;
      }

      if (
        error instanceof AuthClientError &&
        (error.status === 401 || error.status === 403)
      ) {
        if (error.status === 403) {
          void client.logout().catch(() => {});
        }
        setUser(null);
        setActivePortal("user");
        setBootError(null);
        setStatus("unauthenticated");
        return;
      }

      const fallbackMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Não foi possível restaurar a sessão. Tente novamente.";
      setUser(null);
      setActivePortal("user");
      setBootError(fallbackMessage);
      setStatus("unauthenticated");
    } finally {
      clearTimeout(restoreWatchdog);
    }
  }, [applyAuthenticatedUser, client]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (client !== defaultAuthClient) {
      return;
    }

    return subscribeSessionExpired(() => {
      if (!isMountedRef.current) {
        return;
      }
      setUser(null);
      setActivePortal("user");
      setPermissionNotice(null);
      setStatus("unauthenticated");
    });
  }, [client]);

  const signIn = useCallback(
    async (payload: LoginPayload): Promise<AuthSession> => {
      requestSeqRef.current += 1;
      setBootError(null);
      setActionError(null);
      setPermissionNotice(null);

      try {
        const session = await client.login(payload);
        if (isMountedRef.current) {
          applyAuthenticatedUser(session.user);
        }
        return session;
      } catch (error) {
        if (isMountedRef.current) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Não foi possível entrar na conta."
          );
        }
        throw error;
      }
    },
    [applyAuthenticatedUser, client]
  );

  const signUp = useCallback(
    async (payload: RegisterPayload): Promise<AuthSession> => {
      requestSeqRef.current += 1;
      setBootError(null);
      setActionError(null);
      setPermissionNotice(null);

      try {
        const session = await client.register(payload);
        if (isMountedRef.current) {
          applyAuthenticatedUser(session.user);
        }
        return session;
      } catch (error) {
        if (isMountedRef.current) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Não foi possível criar a conta."
          );
        }
        throw error;
      }
    },
    [applyAuthenticatedUser, client]
  );

  const signOut = useCallback(async (): Promise<void> => {
    requestSeqRef.current += 1;
    try {
      await client.logout();
    } finally {
      if (isMountedRef.current) {
        setUser(null);
        setActivePortal("user");
        setBootError(null);
        setActionError(null);
        setPermissionNotice(null);
        setStatus("unauthenticated");
      }
    }
  }, [client]);

  const enterGuestMode = useCallback(() => {
    requestSeqRef.current += 1;
    setUser(null);
    setActivePortal("user");
    setBootError(null);
    setActionError(null);
    setPermissionNotice(null);
    setStatus("guest");
  }, []);

  const exitGuestMode = useCallback(() => {
    requestSeqRef.current += 1;
    setUser(null);
    setActivePortal("user");
    setBootError(null);
    setActionError(null);
    setPermissionNotice(null);
    setStatus("unauthenticated");
  }, []);

  const retryRestoreSession = useCallback(async (): Promise<void> => {
    await restoreSession();
  }, [restoreSession]);

  const switchAdminPortal = useCallback(
    (portal: ActivePortal): boolean => {
      if (user?.role === "admin") {
        setActivePortal(portal);
        setPermissionNotice(null);
        return true;
      }

      if (portal === "admin") {
        setActivePortal("user");
        setPermissionNotice(INSUFFICIENT_PERMISSION_NOTICE);
        return false;
      }

      setActivePortal("user");
      return true;
    },
    [user]
  );

  const clearPermissionNotice = useCallback(() => {
    setPermissionNotice(null);
  }, []);

  const ownerId = user ? user.id : DEFAULT_LOCAL_OWNER_ID;
  const authError = bootError ?? actionError;

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      activePortal,
      ownerId,
      bootError,
      authError,
      permissionNotice,
      signIn,
      signUp,
      signOut,
      enterGuestMode,
      exitGuestMode,
      retryRestoreSession,
      switchAdminPortal,
      clearPermissionNotice,
    }),
    [
      status,
      user,
      activePortal,
      ownerId,
      bootError,
      authError,
      permissionNotice,
      signIn,
      signUp,
      signOut,
      enterGuestMode,
      exitGuestMode,
      retryRestoreSession,
      switchAdminPortal,
      clearPermissionNotice,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider.");
  }
  return context;
}
