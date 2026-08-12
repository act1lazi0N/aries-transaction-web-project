import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return <main className="grid min-h-screen place-items-center bg-background px-6 py-12"><section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm"><div className="mb-8"><div className="mb-5 grid size-10 place-items-center rounded-xl bg-accent font-bold text-accent-foreground">A</div><p className="text-sm font-medium text-accent">Aries operations</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to your workspace</h1><p className="mt-2 text-sm leading-6 text-muted">Use your authorized account to review backend-confirmed financial operations.</p></div><LoginForm /></section></main>;
}
