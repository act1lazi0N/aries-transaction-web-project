import { RegisterForm } from "@/features/auth/components/register-form";
import { resolveAuthenticatedRoute } from "@/features/auth/routes";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const returnTo = resolveAuthenticatedRoute((await searchParams).returnTo);
  return <main className="min-h-dvh bg-background px-5 py-6 sm:grid sm:place-items-center sm:px-6 sm:py-12"><section className="w-full max-w-md border-0 bg-transparent p-0 shadow-none sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:p-8 sm:shadow-sm"><div className="mb-8"><div className="mb-8 flex items-center gap-3 sm:mb-5 sm:block"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent font-bold text-accent-foreground">A</div><div className="sm:mt-5"><p className="font-semibold tracking-tight sm:text-sm sm:font-medium sm:text-accent">Aries</p><p className="text-xs text-muted sm:hidden">Workspace registration</p></div></div><h1 className="text-3xl font-semibold tracking-tight sm:text-2xl">Create your workspace account</h1><p className="mt-2 text-sm leading-6 text-muted">Enter your details to create an account and continue.</p></div><RegisterForm returnTo={returnTo} /></section></main>;
}
