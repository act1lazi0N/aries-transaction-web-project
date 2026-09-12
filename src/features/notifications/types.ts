export type NotificationReadStatus = "ALL" | "UNREAD" | "READ";

export type NotificationType =
  | "TRANSFER_COMPLETED"
  | "REVERSAL_COMPLETED"
  | "REFUND_COMPLETED"
  | "WEBHOOK_ENDPOINT_DISABLED"
  | "WEBHOOK_DELIVERY_DEAD_LETTERED";

export type NotificationDirection = "INCOMING" | "OUTGOING" | "OWN_ACCOUNTS";

export type TransactionNotificationData = {
  kind: "transaction";
  transactionId: string;
  originalTransactionId: string | null;
  operation: "TRANSFER" | "REVERSAL" | "REFUND";
  amount: string;
  currency: string;
  direction: NotificationDirection;
  fromAccountDisplay: string;
  toAccountDisplay: string;
  occurredAt: string;
};

export type WebhookEndpointNotificationData = {
  kind: "webhook-endpoint";
  endpointName: string;
  host: string;
};

export type WebhookDeliveryNotificationData = {
  kind: "webhook-delivery";
  endpointName: string;
  host: string;
  eventType: string;
  attemptCount: number;
  errorCode: string | null;
};

export type NotificationData =
  | TransactionNotificationData
  | WebhookEndpointNotificationData
  | WebhookDeliveryNotificationData;

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData | null;
  occurredAt: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationFilters = {
  status: NotificationReadStatus;
  page: number;
  size: number;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type NotificationPreferences = {
  transactionEmailEnabled: boolean;
  webhookAlertEmailEnabled: boolean;
  emailVerified: boolean;
  version: number;
};

export type UpdateNotificationPreferences = Pick<NotificationPreferences, "transactionEmailEnabled" | "webhookAlertEmailEnabled"> & {
  expectedVersion: number;
};

export type EmailVerificationStatus = { emailVerified: boolean };
export type MarkAllReadResult = { updatedCount: number; readThrough: string };

export type EmailDeliveryStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED" | "DEAD_LETTERED" | "CANCELLED";
export type EmailDeliveryPurpose = "TRANSACTION_NOTIFICATION" | "WEBHOOK_ALERT" | "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "PASSWORD_CHANGED";

export type EmailDelivery = {
  id: string;
  purpose: EmailDeliveryPurpose;
  status: EmailDeliveryStatus;
  attemptCount: number;
  cycleAttemptCount: number;
  redriveCount: number;
  lastErrorCode: string | null;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailDeliveryFilters = {
  status: EmailDeliveryStatus;
  page: number;
  size: number;
};
