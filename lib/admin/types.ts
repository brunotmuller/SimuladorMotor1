import type { VehicleCategory } from "../dashboard/types";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminOverviewResponse = {
  users: {
    total: number;
    active: number;
    newLast30Days: number;
    adminCount: number;
  };
  catalogVehicles: {
    total: number;
    active: number;
    inactive: number;
  };
  userVehicles: {
    total: number;
    averagePerActiveUser: number;
  };
  catalogServices: {
    total: number;
    active: number;
    inactive: number;
  };
  generatedAt: string;
};

export type AdminUserVehicleItem = {
  id: string;
  brand: string;
  model: string;
  year: number;
  version: string | null;
  nickname: string | null;
  currentKm: number;
  category: VehicleCategory;
  fuel: string;
  ownerName: string;
  ownerEmailMasked: string;
  createdAt: string;
};

export type AdminTopModelItem = {
  brand: string;
  model: string;
  count: number;
};

export type AdminUserVehiclesResponse = {
  items: AdminUserVehicleItem[];
  pagination: PaginationMeta;
  topModels: AdminTopModelItem[];
};

export type AdminCatalogVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  fuel: string;
  category: VehicleCategory;
  costFactor: number;
  referenceConsumption: number;
  fipePrice: string | null;
  active: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminCatalogVehiclesResponse = {
  items: AdminCatalogVehicle[];
  pagination: PaginationMeta;
};

export type AdminCatalogService = {
  id: string;
  name: string;
  category: string;
  intervalKm: number;
  intervalMonths: number | null;
  baseCost: number;
  combustionOnly: boolean;
  notes: string | null;
  active: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminCatalogServicesResponse = {
  items: AdminCatalogService[];
  pagination: PaginationMeta;
};

export type CreateCatalogVehiclePayload = {
  brand: string;
  model: string;
  year: number;
  fuel: string;
  category: VehicleCategory;
  costFactor: number;
  referenceConsumption?: number;
  fipePrice?: string | null;
  active?: boolean;
};

export type UpdateCatalogVehiclePayload = {
  brand?: string;
  model?: string;
  year?: number;
  fuel?: string;
  category?: VehicleCategory;
  costFactor?: number;
  referenceConsumption?: number;
  fipePrice?: string | null;
  active?: boolean;
};

export type CreateCatalogServicePayload = {
  name: string;
  category: string;
  intervalKm: number;
  intervalMonths?: number | null;
  baseCost: number;
  combustionOnly?: boolean;
  notes?: string | null;
  active?: boolean;
};

export type UpdateCatalogServicePayload = {
  name?: string;
  category?: string;
  intervalKm?: number;
  intervalMonths?: number | null;
  baseCost?: number;
  combustionOnly?: boolean;
  notes?: string | null;
  active?: boolean;
};

export type AdminStatusFilter = "all" | "active" | "inactive";

export type AdminUserVehiclesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
  category?: VehicleCategory | "";
  kmMin?: number;
  kmMax?: number;
};

export type AdminCatalogVehiclesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
  category?: VehicleCategory | "";
  status?: AdminStatusFilter;
};

export type AdminCatalogServicesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  combustionOnly?: boolean | "all";
  status?: AdminStatusFilter;
};
