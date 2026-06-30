"use client";

import { useActionState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="relative grid min-h-screen place-items-center bg-[var(--color-bg)] px-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            <Activity size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div className="font-display text-lg font-bold leading-none tracking-tight text-[var(--color-fg)]">
              Vital<span className="text-[var(--color-brand)]">Chain</span>
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Provenra · Enterprise
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h1 className="text-base font-semibold text-[var(--color-fg)]">Sign in to continue</h1>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            The dashboard is gated for enterprise evaluation.
          </p>

          <form action={action} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[var(--color-muted)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue="admin@provenra.app"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-brand)]"
              />
              {state?.errors?.email && (
                <p className="mt-1 text-xs text-[var(--color-critical)]">{state.errors.email[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--color-muted)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-brand)]"
              />
              {state?.errors?.password && (
                <p className="mt-1 text-xs text-[var(--color-critical)]">{state.errors.password[0]}</p>
              )}
            </div>

            {state?.errors?._form && (
              <div className="rounded-lg bg-[var(--color-critical)]/10 p-3 text-xs text-[var(--color-critical)]">
                {state.errors._form[0]}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[var(--color-faint)]">
          Set <code className="rounded bg-[var(--color-surface)] px-1 py-0.5">DEMO_USER_PASSWORD</code> in{" "}
          <code className="rounded bg-[var(--color-surface)] px-1 py-0.5">.env.local</code> to enable access.
        </p>
      </div>
    </main>
  );
}
