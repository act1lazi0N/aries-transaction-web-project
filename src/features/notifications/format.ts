import type { EmailDeliveryPurpose, EmailDeliveryStatus, NotificationDirection } from "@/features/notifications/types";

export function formatNotificationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function directionLabel(direction: NotificationDirection) {
  if (direction === "INCOMING") return "Incoming";
  if (direction === "OUTGOING") return "Outgoing";
  return "Between your accounts";
}

export function deliveryStatusLabel(status: EmailDeliveryStatus) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
}

export function deliveryPurposeLabel(purpose: EmailDeliveryPurpose) {
  const labels = {
    TRANSACTION_NOTIFICATION: "Transaction notification",
    WEBHOOK_ALERT: "Webhook alert",
    EMAIL_VERIFICATION: "Email verification",
    PASSWORD_RESET: "Password reset",
    PASSWORD_CHANGED: "Password changed",
  } satisfies Record<EmailDeliveryPurpose, string>;
  return labels[purpose];
}
