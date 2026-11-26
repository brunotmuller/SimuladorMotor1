import React from "react";
import AdminDashboardView from "@/components/admin/AdminDashboardView";
import RoleGuard from "./RoleGuard";

export default function AdminPortalShell() {
  return (
    <RoleGuard requiredRole="admin">
      <AdminDashboardView />
    </RoleGuard>
  );
}
