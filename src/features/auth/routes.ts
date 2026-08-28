export const authenticatedLandingRoute = "/overview" as const;

type ReturnToValue = string | string[] | undefined;

const applicationOrigin = "https://aries.local";
const publicRoutePrefixes = ["/login", "/register"] as const;
const protectedRoutePrefixes = ["/overview", "/transactions", "/transfers", "/controls", "/settlements", "/settings"] as const;

function firstValue(value: ReturnToValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveAuthenticatedRoute(value: ReturnToValue): string {
  const candidate = firstValue(value);
  if (!candidate?.startsWith("/")) return authenticatedLandingRoute;

  try {
    const url = new URL(candidate, applicationOrigin);
    const isInternal = url.origin === applicationOrigin;
    const isPublicRoute = url.pathname === "/" || publicRoutePrefixes.some((route) => url.pathname === route || url.pathname.startsWith(`${route}/`));
    const isProtectedRoute = protectedRoutePrefixes.some((route) => url.pathname === route || url.pathname.startsWith(`${route}/`));

    if (!isInternal || isPublicRoute || !isProtectedRoute) return authenticatedLandingRoute;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return authenticatedLandingRoute;
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
