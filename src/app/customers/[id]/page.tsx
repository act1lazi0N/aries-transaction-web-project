import { AppShell } from "@/components/app-shell";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { CustomerDetailWorkspace } from "@/features/operations/components/customer-detail-workspace";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProtectedWorkspace capability={workspaceRoutes.customers.capability}><AppShell><CustomerDetailWorkspace customerId={id} /></AppShell></ProtectedWorkspace>;
}
