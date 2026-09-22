import type { EmailDeliveryFilters, EmailDeliveryStatus, NotificationFilters, NotificationReadStatus } from "@/features/notifications/types";

type SearchParams = URLSearchParams | Record<string, string | string[] | undefined>;

const notificationStatuses = new Set<NotificationReadStatus>(["ALL", "UNREAD", "READ"]);
const deliveryStatuses = new Set<EmailDeliveryStatus>(["PENDING", "PROCESSING", "DELIVERED", "FAILED", "DEAD_LETTERED", "CANCELLED"]);

export function parseNotificationSearchParams(searchParams: SearchParams): NotificationFilters {
  const status = first(searchParams, "status");
  return {
    status: notificationStatuses.has(status as NotificationReadStatus) ? status as NotificationReadStatus : "ALL",
    page: boundedInteger(first(searchParams, "page"), 0, Number.MAX_SAFE_INTEGER, 0),
    size: boundedInteger(first(searchParams, "size"), 1, 100, 20),
  };
}

export function parseEmailDeliverySearchParams(searchParams: SearchParams): EmailDeliveryFilters {
  const status = first(searchParams, "status");
  return {
    status: deliveryStatuses.has(status as EmailDeliveryStatus) ? status as EmailDeliveryStatus : "DEAD_LETTERED",
    page: boundedInteger(first(searchParams, "page"), 0, Number.MAX_SAFE_INTEGER, 0),
    size: boundedInteger(first(searchParams, "size"), 1, 100, 20),
  };
}

function first(searchParams: SearchParams, key: string): string | undefined {
  if (searchParams instanceof URLSearchParams) return searchParams.get(key) ?? undefined;
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function boundedInteger(value: string | undefined, min: number, max: number, fallback: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}
