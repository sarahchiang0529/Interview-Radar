import { buildSourceUrl, classify, type Provider, type ScannedEmail } from "@/lib/interview-radar";
import type { ScannedEmailRow } from "@/lib/db/schema";
import {
  buildActionEvidence,
  extractActionItems,
  extractLinks,
  extractReviewNotes,
  requiresInterviewScheduling,
} from "@/lib/email-links";

function deriveActionItems(row: ScannedEmailRow) {
  if (row.actionItems && row.actionItems.length > 0) {
    return row.actionItems;
  }
  return extractActionItems(row.body, row.bodyHtml);
}

function deriveReviewNotes(row: ScannedEmailRow) {
  if (row.reviewNotes && row.reviewNotes.length > 0) {
    return row.reviewNotes;
  }
  return extractReviewNotes(row.body);
}

export function rowToScannedEmail(
  row: ScannedEmailRow,
  accountEmail?: string | null,
): ScannedEmail {
  const actionItems = deriveActionItems(row);
  const reviewNotes = deriveReviewNotes(row);
  const evidence =
    row.evidence.length > 0
      ? row.evidence
      : buildActionEvidence(row.body, actionItems, reviewNotes);

  return {
    id: row.id,
    provider: row.provider,
    providerAccountId: row.providerAccountId || undefined,
    accountEmail: accountEmail ?? undefined,
    subject: row.subject,
    sender: row.sender,
    senderEmail: row.senderEmail,
    receivedAt: row.receivedAt.toISOString(),
    body: row.body,
    bodyHtml: row.bodyHtml ?? undefined,
    company: row.company ?? undefined,
    role: row.role ?? undefined,
    interviewType: row.interviewType ?? undefined,
    dateTime: row.dateTime ?? undefined,
    dateTimeISO: row.dateTimeISO ?? undefined,
    meetingLink: row.meetingLink ?? undefined,
    actionItems,
    reviewNotes,
    confidence: Number(row.confidence),
    status: row.status,
    reason: row.reason,
    evidence,
    sourceUrl: row.sourceUrl,
    calendarEventUrl: row.calendarEventUrl ?? undefined,
  };
}

export function classifyRawEmail(input: {
  id: string;
  provider: Provider;
  providerAccountId: string;
  accountEmail?: string;
  subject: string;
  sender: string;
  senderEmail: string;
  receivedAt: string;
  body: string;
  bodyHtml?: string;
  company?: string;
  role?: string;
  interviewType?: string;
  webLink?: string;
}): Omit<ScannedEmail, "id" | "providerAccountId"> & {
  externalId: string;
  providerAccountId: string;
} {
  const actionItems = extractActionItems(input.body, input.bodyHtml);
  const reviewNotes = extractReviewNotes(input.body);
  const requiresScheduling = requiresInterviewScheduling(input.body, actionItems);

  const cls = classify(
    {
      id: input.id,
      provider: input.provider,
      subject: input.subject,
      sender: input.sender,
      senderEmail: input.senderEmail,
      receivedAt: input.receivedAt,
      body: input.body,
      company: input.company,
      role: input.role,
      interviewType: input.interviewType,
      sourceUrl: "",
    },
    { actionItems, reviewNotes, requiresScheduling },
  );

  const evidence = cls.status === "review"
    ? [...new Set([...cls.evidence, ...buildActionEvidence(input.body, actionItems, reviewNotes)])].slice(0, 8)
    : cls.evidence;

  return {
    externalId: input.id,
    providerAccountId: input.providerAccountId,
    provider: input.provider,
    subject: input.subject,
    sender: input.sender,
    senderEmail: input.senderEmail,
    receivedAt: input.receivedAt,
    body: input.body,
    bodyHtml: input.bodyHtml,
    company: input.company,
    role: input.role,
    interviewType: input.interviewType,
    actionItems,
    reviewNotes,
    ...cls,
    evidence,
    sourceUrl: buildSourceUrl(input.provider, input.id, input.webLink, input.accountEmail),
  };
}

export function getDetectedLinks(row: Pick<ScannedEmailRow, "body" | "bodyHtml">) {
  return extractLinks(row.body, row.bodyHtml);
}
