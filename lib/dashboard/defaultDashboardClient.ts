import { defaultAuthClient } from "../auth/defaultAuthClient";
import {
  createDashboardClient,
  type DashboardClient,
} from "./dashboardClient";

export const defaultDashboardClient: DashboardClient =
  createDashboardClient(defaultAuthClient);
