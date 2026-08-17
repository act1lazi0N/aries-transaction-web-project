import { RegisterForm } from "@/features/auth/components/register-form";
import { resolveAuthenticatedRoute } from "@/features/auth/routes";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const returnTo = resolveAuthenticatedRoute((await searchParams).returnTo);
  return <main className="grid min-h-screen place-items-center bg-background px-6 py-12"><section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm"><div className="mb-8"><div className="mb-5 grid size-10 place-items-center rounded-xl bg-accent font-bold text-accent-foreground">A</div><p className="text-sm font-medium text-accent">Aries operations</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your workspace account</h1><p className="mt-2 text-sm leading-6 text-muted">Register securely, then continue to the workspace page you requested.</p></div><RegisterForm returnTo={returnTo} /></section></main>;
}
