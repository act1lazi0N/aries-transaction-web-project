export type WorkspaceCapability =
  | "overview:view"
  | "operations:view"
  | "notification-deliveries:operate"
  | "notifications:view"
  | "customers:manage"
  | "ledger:view"
  | "transactions:view"
  | "transfers:create"
  | "controls:operate"
  | "settlements:operate"
  | "settings:view"
  | "accounts:create"
  | "transactions:reverse"
  | "transactions:refund";

export type KnownRole = "USER" | "MERCHANT" | "OPERATOR" | "ADMIN";

type WorkspaceRouteDefinition = {
  href: string;
  capability: WorkspaceCapability;
};

export const workspaceRoutes = {
  overview: { href: "/overview", capability: "overview:view" },
  notificationDeliveries: { href: "/operations/notification-email-deliveries", capability: "notification-deliveries:operate" },
  operations: { href: "/operations", capability: "operations:view" },
  notifications: { href: "/notifications", capability: "notifications:view" },
  customers: { href: "/customers", capability: "customers:manage" },
  ledger: { href: "/ledger", capability: "ledger:view" },
  transactions: { href: "/transactions", capability: "transactions:view" },
  transfers: { href: "/transfers", capability: "transfers:create" },
  controls: { href: "/controls", capability: "controls:operate" },
  settlements: { href: "/settlements", capability: "settlements:operate" },
  settings: { href: "/settings", capability: "settings:view" },
  newAccount: { href: "/accounts/new", capability: "accounts:create" },
} as const satisfies Record<string, WorkspaceRouteDefinition>;

const roleCapabilities = {
  USER: ["overview:view", "notifications:view", "transactions:view", "transfers:create", "settings:view", "accounts:create"],
  MERCHANT: ["overview:view", "notifications:view", "transactions:view", "transfers:create", "settings:view", "accounts:create", "transactions:refund"],
  OPERATOR: ["operations:view", "notification-deliveries:operate", "notifications:view", "customers:manage", "transactions:view", "ledger:view", "controls:operate", "settlements:operate", "settings:view", "transactions:reverse", "transactions:refund"],
  ADMIN: ["operations:view", "notification-deliveries:operate", "notifications:view", "customers:manage", "transactions:view", "ledger:view", "controls:operate", "settlements:operate", "settings:view", "transactions:reverse"],
} as const satisfies Record<KnownRole, readonly WorkspaceCapability[]>;

const routeDefinitions = Object.values(workspaceRoutes);

export function normalizeRole(role?: string | null): KnownRole | null {
  const normalized = role?.toUpperCase();
  return normalized === "USER" || normalized === "MERCHANT" || normalized === "OPERATOR" || normalized === "ADMIN" ? normalized : null;
}

export function hasCapability(role: string | null | undefined, capability: WorkspaceCapability): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return capability === "settings:view";
  return (roleCapabilities[normalized] as readonly WorkspaceCapability[]).includes(capability);
}

export function requiresFirstFinancialAccount(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === "USER" || normalized === "MERCHANT";
}

export function defaultRouteForRole(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  if (normalized === "USER" || normalized === "MERCHANT") return workspaceRoutes.overview.href;
  if (normalized === "OPERATOR" || normalized === "ADMIN") return workspaceRoutes.operations.href;
  return workspaceRoutes.settings.href;
}

export function capabilityForPathname(pathname: string): WorkspaceCapability | null {
  const route = routeDefinitions.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  return route?.capability ?? null;
}

export function isKnownWorkspacePath(pathname: string): boolean {
  return capabilityForPathname(pathname) !== null;
}
