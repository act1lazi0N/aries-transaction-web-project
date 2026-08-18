export function mayRefreshAfterUnauthorized(method: string, financialMutation = false) {
  const normalizedMethod = method.toUpperCase();
  return !financialMutation && (normalizedMethod === "GET" || normalizedMethod === "HEAD");
}
