import { AppShell } from "@/components/app-shell";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { CustomerListWorkspace } from "@/features/operations/components/customer-list-workspace";
import type { CustomerFilters } from "@/features/operations/types";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const get = (key: string) => Array.isArray(raw[key]) ? raw[key]?.[0] : raw[key]; const page = Number.parseInt(get("page") ?? "0", 10); const size = Number.parseInt(get("size") ?? "20", 10); const role = get("role"); const status = get("status");
  const filters: CustomerFilters = { search: get("search") || undefined, role: role === "USER" || role === "MERCHANT" ? role : undefined, status: status === "ACTIVE" || status === "SUSPENDED" ? status : undefined, page: Number.isInteger(page) && page >= 0 ? page : 0, size: Number.isInteger(size) && size > 0 && size <= 100 ? size : 20, sort: get("sort") || "createdAt", direction: get("direction") === "asc" ? "asc" : "desc" };
  return <ProtectedWorkspace capability={workspaceRoutes.customers.capability}><AppShell><CustomerListWorkspace initialFilters={filters} /></AppShell></ProtectedWorkspace>;
}
