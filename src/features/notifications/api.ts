import type { AuthRequest } from "@/features/auth/request-types";
import { apiRequest } from "@/lib/api/client";
import { exactDecimalString } from "@/lib/api/decimal";
import { ApiError } from "@/lib/api/errors";
import type {
  EmailDelivery,
  EmailDeliveryFilters,
  EmailDeliveryPurpose,
  EmailDeliveryStatus,
  EmailVerificationStatus,
  MarkAllReadResult,
  NotificationData,
  NotificationDirection,
  NotificationFilters,
  NotificationPreferences,
  NotificationRecord,
  NotificationType,
  PageResponse,
  UpdateNotificationPreferences,
} from "@/features/notifications/types";

const notificationTypes = new Set<NotificationType>([
  "TRANSFER_COMPLETED",
  "REVERSAL_COMPLETED",
  "REFUND_COMPLETED",
  "WEBHOOK_ENDPOINT_DISABLED",
  "WEBHOOK_DELIVERY_DEAD_LETTERED",
]);
const directions = new Set<NotificationDirection>(["INCOMING", "OUTGOING", "OWN_ACCOUNTS"]);
const deliveryStatuses = new Set<EmailDeliveryStatus>(["PENDING", "PROCESSING", "DELIVERED", "FAILED", "DEAD_LETTERED", "CANCELLED"]);
const deliveryPurposes = new Set<EmailDeliveryPurpose>(["TRANSACTION_NOTIFICATION", "WEBHOOK_ALERT", "EMAIL_VERIFICATION"]);

export function getNotifications(filters: NotificationFilters, request: AuthRequest): Promise<PageResponse<NotificationRecord>> {
  return request<unknown>(`/api/v1/notifications?${parameters(filters)}`).then(value => parsePage(value, parseNotification));
}

export function getUnreadNotificationCount(request: AuthRequest): Promise<number> {
  return request<unknown>("/api/v1/notifications/unread-count").then(value => {
    const source = record(value, "unread notification count");
    return nonNegativeNumber(source.unreadCount, "unread notification count");
  });
}

export function markNotificationRead(notificationId: string, request: AuthRequest): Promise<NotificationRecord> {
  return request<unknown>(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" }).then(parseNotification);
}

export function markAllNotificationsRead(request: AuthRequest): Promise<MarkAllReadResult> {
  return request<unknown>("/api/v1/notifications/read-all", { method: "POST" }).then(value => {
    const source = record(value, "mark all notifications response");
    return { updatedCount: nonNegativeNumber(source.updatedCount, "updated notification count"), readThrough: string(source.readThrough, "read boundary") };
  });
}

export function getNotificationPreferences(request: AuthRequest): Promise<NotificationPreferences> {
  return request<unknown>("/api/v1/notifications/preferences").then(parsePreferences);
}

export function updateNotificationPreferences(input: UpdateNotificationPreferences, request: AuthRequest): Promise<NotificationPreferences> {
  return request<unknown>("/api/v1/notifications/preferences", { method: "PUT", body: JSON.stringify(input) }).then(parsePreferences);
}

export function requestEmailVerification(request: AuthRequest): Promise<EmailVerificationStatus> {
  return request<unknown>("/api/v1/auth/email-verification/request", { method: "POST" }).then(parseVerificationStatus);
}

export function confirmEmailVerification(token: string): Promise<EmailVerificationStatus> {
  return apiRequest<unknown>("/api/v1/auth/email-verification/confirm", { method: "POST", body: JSON.stringify({ token }) }).then(parseVerificationStatus);
}

export function getEmailDeliveries(filters: EmailDeliveryFilters, request: AuthRequest): Promise<PageResponse<EmailDelivery>> {
  return request<unknown>(`/api/v1/operations/notification-email-deliveries?${parameters(filters)}`).then(value => parsePage(value, parseEmailDelivery));
}

export function redriveEmailDelivery(deliveryId: string, request: AuthRequest): Promise<EmailDelivery> {
  return request<unknown>(`/api/v1/operations/notification-email-deliveries/${encodeURIComponent(deliveryId)}/retry`, { method: "POST" }).then(parseEmailDelivery);
}

function parseNotification(value: unknown): NotificationRecord {
  const source = record(value, "notification");
  const type = enumValue(source.type, notificationTypes, "notification type");
  return {
    id: string(source.id, "notification id"),
    type,
    title: string(source.title, "notification title"),
    message: string(source.message, "notification message"),
    data: parseNotificationData(type, source.data),
    occurredAt: string(source.occurredAt, "notification occurrence time"),
    readAt: nullableString(source.readAt, "notification read time"),
    createdAt: string(source.createdAt, "notification created time"),
  };
}

function parseNotificationData(type: NotificationType, value: unknown): NotificationData | null {
  try {
    const source = record(value, "notification details");
    if (type === "TRANSFER_COMPLETED" || type === "REVERSAL_COMPLETED" || type === "REFUND_COMPLETED") {
      const operation = string(source.operation, "transaction operation");
      if (operation !== "TRANSFER" && operation !== "REVERSAL" && operation !== "REFUND") throw invalid("transaction operation");
      const amountValue = source.amount;
      const amount = typeof amountValue === "string" ? exactDecimalString(amountValue) : null;
      if (amount === null) throw invalid("notification amount");
      return {
        kind: "transaction",
        transactionId: string(source.transactionId, "transaction id"),
        originalTransactionId: nullableString(source.originalTransactionId, "original transaction id"),
        operation,
        amount,
        currency: string(source.currency, "notification currency"),
        direction: enumValue(source.direction, directions, "notification direction"),
        fromAccountDisplay: string(source.fromAccountDisplay, "source account display"),
        toAccountDisplay: string(source.toAccountDisplay, "destination account display"),
        occurredAt: string(source.occurredAt, "detail occurrence time"),
      };
    }
    if (type === "WEBHOOK_ENDPOINT_DISABLED") {
      return { kind: "webhook-endpoint", endpointName: string(source.endpointName, "endpoint name"), host: string(source.host, "endpoint host") };
    }
    return {
      kind: "webhook-delivery",
      endpointName: string(source.endpointName, "endpoint name"),
      host: string(source.host, "endpoint host"),
      eventType: string(source.eventType, "webhook event type"),
      attemptCount: nonNegativeNumber(source.attemptCount, "webhook attempt count"),
      errorCode: optionalString(source.errorCode, "webhook error code"),
    };
  } catch {
    return null;
  }
}

function parsePreferences(value: unknown): NotificationPreferences {
  const source = record(value, "notification preferences");
  return {
    transactionEmailEnabled: boolean(source.transactionEmailEnabled, "transaction email preference"),
    webhookAlertEmailEnabled: boolean(source.webhookAlertEmailEnabled, "webhook alert preference"),
    emailVerified: boolean(source.emailVerified, "email verification status"),
    version: nonNegativeNumber(source.version, "notification preference version"),
  };
}

function parseVerificationStatus(value: unknown): EmailVerificationStatus {
  return { emailVerified: boolean(record(value, "email verification status").emailVerified, "email verification status") };
}

function parseEmailDelivery(value: unknown): EmailDelivery {
  const source = record(value, "email delivery");
  return {
    id: string(source.id, "email delivery id"),
    purpose: enumValue(source.purpose, deliveryPurposes, "email delivery purpose"),
    status: enumValue(source.status, deliveryStatuses, "email delivery status"),
    attemptCount: nonNegativeNumber(source.attemptCount, "email delivery attempt count"),
    cycleAttemptCount: nonNegativeNumber(source.cycleAttemptCount, "email delivery cycle attempt count"),
    redriveCount: nonNegativeNumber(source.redriveCount, "email delivery redrive count"),
    lastErrorCode: nullableString(source.lastErrorCode, "email delivery error code"),
    nextAttemptAt: nullableString(source.nextAttemptAt, "email delivery next attempt time"),
    deliveredAt: nullableString(source.deliveredAt, "email delivery completion time"),
    createdAt: string(source.createdAt, "email delivery created time"),
    updatedAt: string(source.updatedAt, "email delivery updated time"),
  };
}

function parsePage<T>(value: unknown, itemParser: (item: unknown) => T): PageResponse<T> {
  const source = record(value, "page");
  if (!Array.isArray(source.content)) throw invalid("page content");
  return {
    content: source.content.map(itemParser),
    page: nonNegativeNumber(source.page, "page number"),
    size: nonNegativeNumber(source.size, "page size"),
    totalElements: nonNegativeNumber(source.totalElements, "total elements"),
    totalPages: nonNegativeNumber(source.totalPages, "total pages"),
    first: boolean(source.first, "first page"),
    last: boolean(source.last, "last page"),
  };
}

function parameters(value: Record<string, unknown>) {
  const result = new URLSearchParams();
  Object.entries(value).forEach(([key, item]) => result.set(key, String(item)));
  return result.toString();
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw invalid(label);
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string) {
  if (typeof value !== "string" || value.length === 0) throw invalid(label);
  return value;
}

function nullableString(value: unknown, label: string) {
  if (value === null) return null;
  return string(value, label);
}

function optionalString(value: unknown, label: string) {
  if (value === undefined || value === null) return null;
  return string(value, label);
}

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw invalid(label);
  return value;
}

function nonNegativeNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw invalid(label);
  return value;
}

function enumValue<T extends string>(value: unknown, values: ReadonlySet<T>, label: string): T {
  if (typeof value !== "string" || !values.has(value as T)) throw invalid(label);
  return value as T;
}

function invalid(label: string) {
  return new ApiError(`The service returned an invalid ${label}`, { kind: "unknown" });
}
