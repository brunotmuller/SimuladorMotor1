import { createAuthClient, type AuthClient } from "./authClient";
import { defaultTokenStorage } from "./tokenStorage";

type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function subscribeSessionExpired(
  listener: SessionExpiredListener
): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export const defaultAuthClient: AuthClient = createAuthClient({
  tokenStorage: defaultTokenStorage,
  onSessionExpired: () => {
    for (const listener of sessionExpiredListeners) {
      listener();
    }
  },
});
