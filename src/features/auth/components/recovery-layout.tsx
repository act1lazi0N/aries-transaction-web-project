import Link from "next/link";
import type { Route } from "next";
import { LockKeyhole } from "lucide-react";

export function RecoveryLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="min-h-dvh bg-background px-5 py-8 sm:px-6 sm:py-12">
    <div className="mx-auto w-full max-w-md">
      <Link href={"/login" as Route} className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-muted hover:text-foreground">Back to sign in</Link>
      <section aria-labelledby="recovery-title" className="mt-5 space-y-6 sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:p-8">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><LockKeyhole size={20} aria-hidden="true" /></span><span className="font-semibold">Aries</span></div>
        <header><h1 id="recovery-title" className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-3 text-sm leading-6 text-muted">{description}</p></header>
        {children}
      </section>
    </div>
  </main>;
}
