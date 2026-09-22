import type { Metadata } from "next";
import { RecoveryLayout } from "@/features/auth/components/recovery-layout";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password | Aries", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <RecoveryLayout title="Forgot your password?" description="Request a one-time link to choose a new password."><ForgotPasswordForm /></RecoveryLayout>;
}
