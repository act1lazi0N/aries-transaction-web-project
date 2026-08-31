import { AppShell } from "@/components/app-shell";
import { AccountCreationWorkspace } from "@/features/accounts/components/account-creation-workspace";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";

export default function NewAccountPage() {
  return <ProtectedWorkspace capability={workspaceRoutes.newAccount.capability}><AppShell><AccountCreationWorkspace mode="additional" /></AppShell></ProtectedWorkspace>;
}
