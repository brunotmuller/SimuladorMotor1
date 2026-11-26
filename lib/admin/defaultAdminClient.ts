import { createDefaultAuthClient } from "../auth/defaultAuthClient";
import {
  createAdminClient,
  DEFAULT_ADMIN_TIMEOUT_MS,
  type AdminClient,
} from "./adminClient";

export const defaultAdminClient: AdminClient = createAdminClient(
  createDefaultAuthClient({ timeoutMs: DEFAULT_ADMIN_TIMEOUT_MS })
);
