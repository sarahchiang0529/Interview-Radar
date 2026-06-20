import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const emailStatusEnum = pgEnum("email_status", ["ready", "review", "ignored", "added"]);

export const emailProviderEnum = pgEnum("email_provider", ["gmail", "outlook"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
    accountEmail: text("account_email"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const scannedEmails = pgTable(
  "scanned_emails",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull().default(""),
    externalId: text("external_id").notNull(),
    provider: emailProviderEnum("provider").notNull(),
    subject: text("subject").notNull(),
    sender: text("sender").notNull(),
    senderEmail: text("sender_email").notNull(),
    receivedAt: timestamp("received_at", { mode: "date" }).notNull(),
    body: text("body").notNull(),
    company: text("company"),
    role: text("role"),
    interviewType: text("interview_type"),
    dateTime: text("date_time"),
    dateTimeISO: text("date_time_iso"),
    meetingLink: text("meeting_link"),
    confidence: text("confidence").notNull(),
    status: emailStatusEnum("status").notNull(),
    reason: text("reason").notNull(),
    evidence: jsonb("evidence").$type<string[]>().notNull().default([]),
    actionItems: jsonb("action_items")
      .$type<
        Array<{
          label: string;
          description?: string;
          linkText?: string;
          url?: string;
          deadlineNote?: string;
        }>
      >()
      .notNull()
      .default([]),
    reviewNotes: jsonb("review_notes").$type<string[]>().notNull().default([]),
    bodyHtml: text("body_html"),
    sourceUrl: text("source_url").notNull(),
    calendarEventId: text("calendar_event_id"),
    calendarEventUrl: text("calendar_event_url"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("scanned_emails_user_account_external_idx").on(
      table.userId,
      table.provider,
      table.providerAccountId,
      table.externalId,
    ),
  ],
);

export type ScannedEmailRow = typeof scannedEmails.$inferSelect;
