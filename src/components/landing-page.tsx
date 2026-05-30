import Link from "next/link";
import {
  Radar,
  ArrowRight,
  Inbox,
  CalendarCheck,
  ShieldCheck,
  Filter,
  Sparkles,
  Mail,
  Clock,
  Check,
  Github,
} from "lucide-react";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
              <Radar className="h-4 w-4" />
            </span>
            InterviewRadar
          </Link>
          <div className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#privacy" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </div>
          <Link
            href="/signin"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--foreground) 6%, transparent), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" /> For job seekers in active interview loops
            </span>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Never miss an interview email again.
            </h1>
            <p className="mt-5 text-pretty text-base text-muted-foreground sm:text-lg">
              InterviewRadar quietly scans your Gmail and Outlook, surfaces the interview
              invitations buried in noise, and helps you add confirmed interviews to your calendar
              in one click.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Sign in, connect Gmail or Outlook, then scan your private inbox
            </p>
          </div>

          {/* Preview card */}
          <div className="mx-auto mt-14 max-w-4xl">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="ml-3 text-[11px] text-muted-foreground">
                  interviewradar.app / dashboard
                </span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                <PreviewStat label="Emails scanned" value="142" />
                <PreviewStat label="Ready to add" value="3" highlight />
                <PreviewStat label="Needs review" value="5" />
                <div className="sm:col-span-3 space-y-2.5">
                  <PreviewEmail
                    chip="Ready"
                    chipTone="success"
                    title="Final interview invitation — Software Engineer"
                    sender="Shopify Talent"
                    meta="Fri, May 29 · 2:00 PM · Google Meet"
                  />
                  <PreviewEmail
                    chip="Needs review"
                    chipTone="warning"
                    title="Next steps for Product Engineering Intern"
                    sender="Wealthsimple Recruiting"
                    meta="Awaiting availability"
                  />
                  <PreviewEmail
                    chip="Ignored"
                    chipTone="muted"
                    title="Your application was received"
                    sender="Google Careers"
                    meta="Generic confirmation"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                The problem
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your interview emails are drowning in noise.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Application confirmations, job alerts, rejections, recruiter outreach, and actual
                interview invitations all land in the same inbox. It's easy to miss the one email
                that actually matters — and embarrassing to ask a recruiter to resend.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Interview invites buried under 50+ job alerts a day",
                "Two inboxes to check — personal Gmail and school/work Outlook",
                "Manually copying dates and times into your calendar",
                "Missing follow-ups because nothing is flagged",
              ].map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
                >
                  <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-destructive/10 text-destructive">
                    ×
                  </span>
                  <span className="text-foreground/90">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              A focused tool that does one thing well.
            </h2>
            <p className="mt-4 text-muted-foreground">
              No CRM. No AI agents acting on your behalf. Just a calm dashboard that helps you stay
              on top of interview logistics.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Inbox className="h-5 w-5" />}
              title="Unified inbox scan"
              body="Pull interview-related emails from Gmail and Outlook in a single view."
            />
            <Feature
              icon={<Filter className="h-5 w-5" />}
              title="Smart classification"
              body="Each email is labeled Ready, Needs Review, or Ignored — with the reasoning shown. Results persist in your account."
            />
            <Feature
              icon={<CalendarCheck className="h-5 w-5" />}
              title="One-click calendar"
              body="Add confirmed interviews to Google Calendar or Outlook Calendar with one click."
            />
            <Feature
              icon={<Clock className="h-5 w-5" />}
              title="Date & time detection"
              body="Detects scheduling details directly from the email body so you don't retype them."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Privacy first"
              body="Emails are scanned to detect scheduling details and stored as classification results in your account — not shared with third parties."
            />
            <Feature
              icon={<Mail className="h-5 w-5" />}
              title="Quick mailbox access"
              body="Jump straight to the source email in Gmail or Outlook from any card."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From inbox chaos to calendar-ready in three steps.
            </h2>
          </div>

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Connect your inboxes",
                body: "Link Gmail, Outlook, or both. Connect in seconds — disconnect anytime.",
              },
              {
                n: "02",
                title: "Scan and review",
                body: "Click Scan. Each email is classified with a confidence score and reasoning.",
              },
              {
                n: "03",
                title: "Add to calendar",
                body: "Confirm the interview and add it to your calendar with one tap.",
              },
            ].map((s) => (
              <li key={s.n} className="rounded-xl border border-border bg-card p-6">
                <span className="text-xs font-mono text-muted-foreground">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <ul className="order-2 space-y-3 md:order-1">
              {[
                "Stop reading every job-alert email to find real interviews",
                "Always know what's confirmed, what's pending, and what's noise",
                "Spend minutes on inbox triage instead of hours",
                "Show up to interviews on time, with the right context loaded",
              ].map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
                >
                  <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground/90">{p}</span>
                </li>
              ))}
            </ul>
            <div className="order-1 md:order-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Why it matters
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Built for the busiest part of your job hunt.
              </h2>
              <p className="mt-4 text-muted-foreground">
                When you're in active interview loops at five companies, every missed email is a
                missed opportunity. InterviewRadar makes sure the right ones stay in front of you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <ShieldCheck className="mx-auto h-8 w-8 text-foreground" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your inbox stays yours.
          </h2>
          <p className="mt-4 text-muted-foreground">
            InterviewRadar reads email content to detect scheduling details and stores
            classification results in your account. Calendar events are only created when you
            explicitly click <em>Add to Calendar</em>. Disconnect at any time to revoke API access.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            {[
              {
                q: "Does InterviewRadar store my emails?",
                a: "Scanned results are stored in your account so you can review them across sessions. Calendar events are created only when you click Add to Calendar.",
              },
              {
                q: "Which providers are supported?",
                a: "Gmail and Outlook (personal and Microsoft 365 accounts).",
              },
              {
                q: "Will it auto-create calendar events for me?",
                a: "No. Events are created only when you explicitly click Add to Calendar — you stay in control.",
              },
              {
                q: "How do I get started?",
                a: "Sign in, connect Gmail or Outlook, and run a scan to pull your interview-related mail.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-border bg-card px-4 py-3 open:bg-accent/40"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                  {f.q}
                  <span className="text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Get your interview inbox under control.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sign in to connect your inbox and see what&apos;s actually waiting for you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <Radar className="h-3.5 w-3.5" />
            <span>InterviewRadar · Not affiliated with Google or Microsoft</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" /> Source
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- Small landing components ---------- */

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition hover:border-foreground/20">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 " +
        (highlight
          ? "border-[var(--success)]/30 bg-[var(--success)]/10"
          : "border-border bg-background")
      }
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PreviewEmail({
  chip,
  chipTone,
  title,
  sender,
  meta,
}: {
  chip: string;
  chipTone: "success" | "warning" | "muted";
  title: string;
  sender: string;
  meta: string;
}) {
  const tone =
    chipTone === "success"
      ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
      : chipTone === "warning"
        ? "border-[var(--warning)]/40 bg-[var(--warning)]/15 text-[var(--warning-foreground)]"
        : "border-border bg-muted text-muted-foreground";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
              tone
            }
          >
            {chip}
          </span>
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {sender} · {meta}
        </div>
      </div>
    </div>
  );
}
