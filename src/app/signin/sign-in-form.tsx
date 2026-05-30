import Link from "next/link";
import { ArrowLeft, Radar, ShieldCheck } from "lucide-react";

import { signInWithGoogle, signInWithMicrosoft } from "@/app/actions/auth";
import { authProviders } from "@/lib/auth";

export function SignInForm() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--foreground) 6%, transparent), transparent 70%)",
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to home
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-foreground text-background">
              <Radar className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
              <p className="text-xs text-muted-foreground">InterviewRadar</p>
            </div>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Sign in to access your private inbox dashboard. Connect Gmail or Outlook after signing
            in to scan for interview emails.
          </p>

          <div className="mt-6 space-y-3">
            {authProviders.google ? (
              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </form>
            ) : (
              <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Google sign-in is not configured yet.
              </p>
            )}

            {authProviders.microsoft ? (
              <form action={signInWithMicrosoft}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent"
                >
                  <MicrosoftIcon />
                  Continue with Outlook
                </button>
              </form>
            ) : (
              <div>
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium text-muted-foreground opacity-60"
                >
                  <MicrosoftIcon />
                  Continue with Outlook
                </button>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Outlook sign-in requires Microsoft OAuth keys in{" "}
                  <code className="rounded bg-muted px-1">.env.local</code>.
                </p>
              </div>
            )}
          </div>

          <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none" />
            Your inbox stays private. We only read email to detect interview scheduling details.
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}
