import { EmailVerificationWorkspace } from "@/features/notifications/components/email-verification-workspace";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const value = (await searchParams).token;
  const token = Array.isArray(value) ? value[0] : value;
  return <EmailVerificationWorkspace token={token?.trim() || undefined} />;
}
