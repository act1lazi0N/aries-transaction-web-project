export function parseSettlementSearchParams(value: Record<string, string | string[] | undefined>): { batchId?: string } {
  const batchId = Array.isArray(value.batchId) ? value.batchId[0] : value.batchId;
  const normalized = batchId?.trim();
  return normalized && normalized.length <= 100 ? { batchId: normalized } : {};
}
