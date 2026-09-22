import type { Metadata } from "next";
import { RecoveryLayout } from "@/features/auth/components/recovery-layout";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password | Aries", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <RecoveryLayout title="Choose a new password" description="Use the one-time link from your password reset email."><ResetPasswordForm /></RecoveryLayout>;
}
