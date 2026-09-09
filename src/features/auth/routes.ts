import { capabilityForPathname, defaultRouteForRole, hasCapability } from "@/features/auth/capabilities";

export const authenticatedLandingRoute = "/overview" as const;

type ReturnToValue = string | string[] | undefined;

const applicationOrigin = "https://aries.local";
const publicRoutePrefixes = ["/login", "/register", "/verify-email"] as const;

function firstValue(value: ReturnToValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveAuthenticatedRoute(value: ReturnToValue): string {
  return safeWorkspaceDestination(value) ?? authenticatedLandingRoute;
}

export function resolveAuthorizedRouteForRole(value: ReturnToValue, role?: string | null): string {
  const destination = safeWorkspaceDestination(value);
  if (!destination) return defaultRouteForRole(role);
  const pathname = new URL(destination, applicationOrigin).pathname;
  const capability = capabilityForPathname(pathname);
  return capability && hasCapability(role, capability) ? destination : defaultRouteForRole(role);
}

function safeWorkspaceDestination(value: ReturnToValue): string | null {
  const candidate = firstValue(value);
  if (!candidate?.startsWith("/")) return null;

  try {
    const url = new URL(candidate, applicationOrigin);
    const isInternal = url.origin === applicationOrigin;
    const isPublicRoute = url.pathname === "/" || publicRoutePrefixes.some((route) => url.pathname === route || url.pathname.startsWith(`${route}/`));
    const isProtectedRoute = capabilityForPathname(url.pathname) !== null;

    if (!isInternal || isPublicRoute || !isProtectedRoute) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function loginRouteFor(returnTo: ReturnToValue): string {
  const destination = resolveAuthenticatedRoute(returnTo);
  return `/login?returnTo=${encodeURIComponent(destination)}`;
}

export function authRouteWithReturnTo(route: "/login" | "/register", returnTo: ReturnToValue): string {
  const destination = resolveAuthenticatedRoute(returnTo);
  return `${route}?returnTo=${encodeURIComponent(destination)}`;
}
