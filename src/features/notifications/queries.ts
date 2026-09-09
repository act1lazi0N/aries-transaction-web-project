"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import {
  getEmailDeliveries,
  getNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  redriveEmailDelivery,
  requestEmailVerification,
  updateNotificationPreferences,
} from "@/features/notifications/api";
import type { EmailDeliveryFilters, NotificationFilters, UpdateNotificationPreferences } from "@/features/notifications/types";

export const notificationKeys = {
  user: (userId: string) => ["notifications", userId] as const,
  lists: (userId: string) => [...notificationKeys.user(userId), "list"] as const,
  list: (userId: string, filters: NotificationFilters) => [...notificationKeys.lists(userId), filters] as const,
  unread: (userId: string) => [...notificationKeys.user(userId), "unread-count"] as const,
  preferences: (userId: string) => [...notificationKeys.user(userId), "preferences"] as const,
};

export const emailDeliveryKeys = {
  all: ["operations", "notification-email-deliveries"] as const,
  user: (userId: string) => [...emailDeliveryKeys.all, userId] as const,
  list: (userId: string, filters: EmailDeliveryFilters) => [...emailDeliveryKeys.user(userId), filters] as const,
};

export function useNotifications(filters: NotificationFilters) {
  const session = useAuthSession();
  const userId = session.user?.id ?? "anonymous";
  return useQuery({
    queryKey: notificationKeys.list(userId, filters),
    queryFn: () => getNotifications(filters, session.request),
    enabled: session.status === "authenticated" && Boolean(session.user?.id),
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useUnreadNotificationCount() {
  const session = useAuthSession();
  const userId = session.user?.id ?? "anonymous";
  return useQuery({
    queryKey: notificationKeys.unread(userId),
    queryFn: () => getUnreadNotificationCount(session.request),
    enabled: session.status === "authenticated" && Boolean(session.user?.id),
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useNotificationPreferences() {
  const session = useAuthSession();
  const userId = session.user?.id ?? "anonymous";
  return useQuery({
    queryKey: notificationKeys.preferences(userId),
    queryFn: () => getNotificationPreferences(session.request),
    enabled: session.status === "authenticated" && Boolean(session.user?.id),
    retry: false,
  });
}

export function useMarkNotificationRead() {
  const session = useAuthSession();
  const client = useQueryClient();
  const userId = session.user?.id ?? "anonymous";
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId, session.request),
    retry: false,
    onSuccess: async () => Promise.all([
      client.invalidateQueries({ queryKey: notificationKeys.lists(userId) }),
      client.invalidateQueries({ queryKey: notificationKeys.unread(userId) }),
    ]),
  });
}

export function useMarkAllNotificationsRead() {
  const session = useAuthSession();
  const client = useQueryClient();
  const userId = session.user?.id ?? "anonymous";
  return useMutation({
    mutationFn: () => markAllNotificationsRead(session.request),
    retry: false,
    onSuccess: async () => Promise.all([
      client.invalidateQueries({ queryKey: notificationKeys.lists(userId) }),
      client.invalidateQueries({ queryKey: notificationKeys.unread(userId) }),
    ]),
  });
}

export function useUpdateNotificationPreferences() {
  const session = useAuthSession();
  const client = useQueryClient();
  const userId = session.user?.id ?? "anonymous";
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferences) => updateNotificationPreferences(input, session.request),
    retry: false,
    onSuccess: preferences => client.setQueryData(notificationKeys.preferences(userId), preferences),
  });
}

export function useRequestEmailVerification() {
  const session = useAuthSession();
  const client = useQueryClient();
  const userId = session.user?.id ?? "anonymous";
  return useMutation({
    mutationFn: () => requestEmailVerification(session.request),
    retry: false,
    onSuccess: result => {
      if (!result.emailVerified) return;
      client.setQueryData(notificationKeys.preferences(userId), (current: unknown) =>
        typeof current === "object" && current !== null ? { ...current, emailVerified: true } : current);
    },
  });
}

export function useEmailDeliveries(filters: EmailDeliveryFilters) {
  const session = useAuthSession();
  const userId = session.user?.id ?? "anonymous";
  return useQuery({
    queryKey: emailDeliveryKeys.list(userId, filters),
    queryFn: () => getEmailDeliveries(filters, session.request),
    enabled: session.status === "authenticated",
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useRedriveEmailDelivery() {
  const session = useAuthSession();
  const client = useQueryClient();
  const userId = session.user?.id ?? "anonymous";
  return useMutation({
    mutationFn: (deliveryId: string) => redriveEmailDelivery(deliveryId, session.request),
    retry: false,
    onSuccess: async () => client.invalidateQueries({ queryKey: emailDeliveryKeys.user(userId) }),
  });
}
