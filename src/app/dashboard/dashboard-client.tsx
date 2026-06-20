"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Radar,
  Mail,
  Calendar as CalendarIcon,
  ExternalLink,
  RefreshCw,
  Plus,
  Check,
  Inbox,
  AlertCircle,
  ArchiveX,
  CalendarCheck,
  ArrowLeft,
  LogOut,
} from "lucide-react";

import { type EmailActionItem, type ScannedEmail, type Status } from "@/lib/interview-radar";
import { linkGoogleAccount } from "@/app/actions/auth";

type Filter = "all" | Status;

type GmailAccount = {
  providerAccountId: string;
  email: string | null;
  connected: boolean;
};

type Connections = {
  gmail: boolean;
  accounts: GmailAccount[];
};

const STATUS_META: Record<Status, { label: string; chipClass: string }> = {
  ready: {
    label: "Ready to Add",
    chipClass: "bg-[var(--success)]/12 text-[var(--success)] border-[var(--success)]/30",
  },
  review: {
    label: "Needs Review",
    chipClass: "bg-[var(--warning)]/15 text-[var(--warning-foreground)] border-[var(--warning)]/40",
  },
  ignored: {
    label: "Ignored",
    chipClass: "bg-muted text-muted-foreground border-border",
  },
  added: {
    label: "Added to Calendar",
    chipClass: "bg-[var(--info)]/12 text-[var(--info)] border-[var(--info)]/30",
  },
};

export function DashboardClient({ userName }: { userName?: string | null }) {
  const [emails, setEmails] = useState<ScannedEmail[]>([]);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [connections, setConnections] = useState<Connections>({
    gmail: false,
    accounts: [],
  });
  const [showAccountList, setShowAccountList] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadState = useCallback(async () => {
    try {
      setError(null);
      const [connectionsRes, emailsRes] = await Promise.all([
        fetch("/api/connections"),
        fetch("/api/scan"),
      ]);

      if (connectionsRes.ok) {
        setConnections(await connectionsRes.json());
      }

      if (emailsRes.ok) {
        const data = (await emailsRes.json()) as { emails: ScannedEmail[] };
        setEmails(data.emails);
        setScanned(data.emails.length > 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const addGmailAccount = () => {
    void linkGoogleAccount();
  };

  const disconnectGmail = async (providerAccountId: string) => {
    setError(null);
    const response = await fetch(
      `/api/connections?providerAccountId=${encodeURIComponent(providerAccountId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to disconnect");
      return;
    }
    await loadState();
  };

  const runScan = async (providerAccountId?: string) => {
    setScanning(true);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "gmail", providerAccountId }),
      });
      const data = (await response.json()) as {
        emails?: ScannedEmail[];
        warnings?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Scan failed");
      }

      setEmails(data.emails ?? []);
      setScanned(true);
      if (data.warnings?.length) {
        setError(data.warnings.join(" · "));
      }
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      await loadState();
    } finally {
      setScanning(false);
    }
  };

  const addToCalendar = async (id: string) => {
    setError(null);
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: id }),
      });
      const data = (await response.json()) as { email?: ScannedEmail; error?: string };
      if (!response.ok || !data.email) {
        throw new Error(data.error ?? "Failed to add to calendar");
      }
      setEmails((prev) => prev.map((e) => (e.id === id ? data.email! : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to calendar");
    }
  };

  const openCalendarEvent = async (id: string) => {
    setError(null);
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: id }),
      });
      const data = (await response.json()) as {
        eventUrl?: string;
        recreated?: boolean;
        email?: ScannedEmail;
        error?: string;
      };
      if (!response.ok || !data.eventUrl) {
        throw new Error(data.error ?? "Failed to open calendar event");
      }
      if (data.email) {
        setEmails((prev) => prev.map((e) => (e.id === id ? data.email! : e)));
      }
      window.open(data.eventUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open calendar event");
    }
  };

  const connectedAccounts = useMemo(
    () => connections.accounts.filter((account) => account.connected),
    [connections.accounts],
  );

  const counts = useMemo(
    () => ({
      total: emails.length,
      ready: emails.filter((e) => e.status === "ready").length,
      review: emails.filter((e) => e.status === "review").length,
      ignored: emails.filter((e) => e.status === "ignored").length,
      added: emails.filter((e) => e.status === "added").length,
    }),
    [emails],
  );

  const visible = useMemo(() => {
    if (filter === "all") return emails;
    return emails.filter((e) => e.status === filter);
  }, [emails, filter]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Home
            </Link>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              <Radar className="h-6 w-6" />
              InterviewRadar
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Find interview emails in Gmail and add them to your calendar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userName && (
              <span className="hidden text-xs text-muted-foreground sm:inline">{userName}</span>
            )}
            <a
              href="/api/auth/signout?callbackUrl=/signin"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </a>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {loading && <div className="mt-4 text-xs text-muted-foreground">Loading dashboard…</div>}

        <section className="mt-6">
          <h2 className="text-xs font-medium text-muted-foreground">
            Quick access
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <QuickLink href="https://mail.google.com" label="Open Gmail" />
              <QuickLink href="https://calendar.google.com" label="Open Google Calendar" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={addGmailAccount}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <Plus className="h-3 w-3" />
                Add Gmail
              </button>
              <ScanButton
                label="Scan all"
                loading={scanning}
                disabled={connectedAccounts.length === 0}
                variant="primary"
                onClick={() => void runScan()}
              />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Gmail accounts</span>
            <span className="text-xs text-muted-foreground">
              {connectedAccounts.length} connected
            </span>
            <button
              onClick={() => setShowAccountList((prev) => !prev)}
              className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium hover:bg-accent"
            >
              {showAccountList ? "Collapse" : "Expand"}
            </button>
          </div>
          {showAccountList && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              {connections.accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No linked accounts yet.</p>
              ) : (
                connections.accounts.map((account) => (
                  <ConnectionRow
                    key={account.providerAccountId}
                    label={account.email ?? "Google account"}
                    connected={account.connected}
                    onDisconnect={() => void disconnectGmail(account.providerAccountId)}
                  />
                ))
              )}
            </div>
          )}
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat icon={<Inbox className="h-4 w-4" />} label="Emails scanned" value={counts.total} />
          <Stat icon={<Check className="h-4 w-4" />} label="Ready to add" value={counts.ready} />
          <Stat
            icon={<AlertCircle className="h-4 w-4" />}
            label="Needs review"
            value={counts.review}
          />
          <Stat icon={<ArchiveX className="h-4 w-4" />} label="Ignored" value={counts.ignored} />
          <Stat
            icon={<CalendarCheck className="h-4 w-4" />}
            label="Added to calendar"
            value={counts.added}
          />
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "ready", "review", "ignored", "added"] as const).map((value) => (
              <FilterChip key={value} active={filter === value} onClick={() => setFilter(value)}>
                {value === "all" ? "All" : (STATUS_META[value as Status]?.label ?? value)}
              </FilterChip>
            ))}
          </div>
        </section>

        <section className="mt-4 space-y-3">
          {!scanned && (
            <EmptyState
              title="No scans yet"
              body="Add a Gmail account, then scan to pull interview-related emails."
            />
          )}
          {scanned && visible.length === 0 && (
            <EmptyState title="Nothing here" body="No emails match this filter." />
          )}
          {visible.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onAdd={() => void addToCalendar(email.id)}
              onOpenCalendar={() => void openCalendarEvent(email.id)}
            />
          ))}
        </section>

        <section className="mt-10">
          <Panel title="Privacy">
            <p className="text-xs text-muted-foreground">
              Scanned email metadata and classification results are stored in your account so you
              can review them across sessions. Calendar events are created only when you click Add
              to Calendar. Disconnect anytime to revoke API access.
            </p>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  );
}

function ConnectionRow({
  label,
  connected,
  onDisconnect,
}: {
  label: string;
  connected: boolean;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{label}</span>
      </div>
      <span
        className={
          "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] " +
          (connected
            ? "border-[var(--success)]/30 bg-[var(--success)]/12 text-[var(--success)]"
            : "border-border bg-muted text-muted-foreground")
        }
      >
        {connected ? "Connected" : "Reconnect"}
      </span>
      <button
        onClick={onDisconnect}
        className="ml-2 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        Remove
      </button>
    </div>
  );
}

function ScanButton({
  label,
  onClick,
  loading,
  disabled,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "primary";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border bg-card text-foreground hover:bg-accent";
  return (
    <button onClick={onClick} disabled={loading || disabled} className={`${base} ${styles}`}>
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md border px-2.5 py-1 text-xs font-medium transition " +
        (active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground hover:bg-accent")
      }
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function EmailCard({
  email,
  onAdd,
  onOpenCalendar,
}: {
  email: ScannedEmail;
  onAdd: () => void;
  onOpenCalendar: () => void;
}) {
  const meta = STATUS_META[email.status];
  const received = new Date(email.receivedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {email.accountEmail ?? "Gmail"}
            </span>
            <span
              className={
                "inline-flex items-center rounded-full border px-2 py-0.5 font-medium " +
                meta.chipClass
              }
            >
              {meta.label}
            </span>
            <span className="text-muted-foreground">{received}</span>
            <span className="text-muted-foreground">
              · confidence {Math.round(email.confidence * 100)}%
            </span>
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold text-foreground">{email.subject}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {email.sender} &lt;{email.senderEmail}&gt;
          </p>
        </div>
      </div>

      {(email.company || email.role || email.interviewType || email.dateTime) && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          {email.company && <Field label="Company" value={email.company} />}
          {email.role && <Field label="Role" value={email.role} />}
          {email.interviewType && <Field label="Type" value={email.interviewType} />}
          {email.dateTime && <Field label="When" value={email.dateTime} />}
        </dl>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Reason: </span>
        {email.reason}
      </div>

      {email.status === "review" && email.actionItems.length > 0 && (
        <ActionItemsSection items={email.actionItems} />
      )}

      {email.status === "review" && email.reviewNotes.length > 0 && (
        <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-foreground">
            {email.reviewNotes.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={email.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <ExternalLink className="h-3 w-3" />
          Open Source Email
        </a>

        {email.status === "ready" && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3 w-3" />
            Add to Google Calendar
          </button>
        )}

        {email.status === "added" && email.calendarEventUrl && (
          <button
            onClick={onOpenCalendar}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--info)]/30 bg-[var(--info)]/10 px-3 py-1.5 text-xs font-medium text-[var(--info)] hover:opacity-90"
          >
            <CalendarIcon className="h-3 w-3" />
            Open Calendar Event
          </button>
        )}
      </div>
    </article>
  );
}

function ActionItemsSection({ items }: { items: EmailActionItem[] }) {
  return (
    <div className="mt-3 rounded-md border border-[var(--warning)]/25 bg-[var(--warning)]/5 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Action items from email
      </p>
      <ol className="mt-2 space-y-3">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="text-xs">
            <p className="font-medium text-foreground">
              {index + 1}. {item.label}
            </p>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium hover:bg-accent"
              >
                {item.linkText ?? "Open link"}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : item.linkText ? (
              <p className="mt-1 text-muted-foreground">Link: {item.linkText}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}