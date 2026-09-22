import Link from "next/link";
import type { Route } from "next";
import type { SecurityFailure } from "@/features/auth/security-errors";

export function SecurityFeedback({ failure, id, recoveryLink = true }: { failure: SecurityFailure | null; id: string; recoveryLink?: boolean }) {
  if (!failure) return null;
  return <div id={id} role="alert" className="space-y-3 text-sm leading-6">
    <p className={failure.kind === "unknown" || failure.kind === "disabled" ? "text-[var(--aries-warning)]" : "text-[var(--aries-danger)]"}>{failure.message}</p>
    {recoveryLink && (failure.kind === "unknown" || failure.kind === "invalid-token") && <Link href={"/forgot-password" as Route} className="inline-flex min-h-10 items-center rounded font-semibold text-accent hover:underline">Request a new reset link</Link>}
  </div>;
}
