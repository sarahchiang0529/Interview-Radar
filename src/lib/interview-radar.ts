export type Provider = "gmail" | "outlook";
export type Status = "ready" | "review" | "ignored" | "added";

export type EmailActionItem = {
  label: string;
  description?: string;
  linkText?: string;
  url?: string;
  deadlineNote?: string;
};

export interface ScannedEmail {
  id: string;
  provider: Provider;
  providerAccountId?: string;
  accountEmail?: string;
  subject: string;
  sender: string;
  senderEmail: string;
  receivedAt: string; // ISO
  body: string;
  bodyHtml?: string;
  company?: string;
  role?: string;
  interviewType?: string;
  dateTime?: string; // human-readable detected
  dateTimeISO?: string; // for calendar
  meetingLink?: string;
  actionItems: EmailActionItem[];
  reviewNotes: string[];
  confidence: number; // 0-1
  status: Status;
  reason: string;
  evidence: string[];
  sourceUrl: string;
  calendarEventUrl?: string;
}

const STRONG_INTERVIEW = [
  "final interview",
  "technical interview",
  "behavioral interview",
  "recruiter screen",
  "phone screen",
  "onsite interview",
  "on-site interview",
  "virtual interview",
  "video interview",
  "interview invitation",
  "interview invite",
  "interview scheduled",
  "confirm your interview",
  "schedule your interview",
  "schedule an interview",
  "schedule a recruiter screen",
  "meet with the hiring manager",
];

const SCHEDULING_SIGNALS = [
  "schedule a call",
  "schedule a chat",
  "schedule time",
  "select a time",
  "choose a time",
  "send over your availability",
  "share your availability",
  "provide your availability",
  "are you available",
  "next steps for",
];

const WEAK_INTERVIEW = [
  "interview",
  "recruiter",
  "hiring manager",
  "talent acquisition",
  "recruiting coordinator",
  "candidate",
];

const MEETING_SIGNALS = ["google meet", "zoom", "microsoft teams", "teams meeting", "calendly"];

const NEGATIVE = [
  // Application confirmations
  "application received",
  "thank you for applying",
  "we received your application",
  "application submitted",
  "submission confirmed",
  "your application has been received",

  // Rejections
  "unfortunately",
  "not moving forward",
  "no longer under consideration",
  "we've decided to move forward with other",
  "we have decided to move forward with other",

  // Job-search noise
  "job alert",
  "new jobs",
  "jobs matching",
  "newsletter",
  "unsubscribe",

  // Platform / non-interview emails
  "devpost",
  "hackathon",
  "project submission",
  "portfolio review",

  // Account / finance / product notifications
  "fee schedule",
  "trade accounts",
  "no action required",
  "account update",
  "terms of service",
  "privacy policy",
  "statement",
  "invoice",
  "receipt",
  "payment",
  "billing",
  "service fee",
  "annual service fee",
  "futures trading",
  "automated investing",
  "direct indexes",
  "regulatory fees",
  "this email address is not monitored",
  "replies to this email address are not monitored",
];

const NON_RECRUITER_SENDER_HINTS = [
  "no-reply",
  "noreply",
  "notification",
  "notifications",
  "newsletter",
  "support",
  "billing",
  "updates",
  "marketing",
  "hello@",
];

const NON_RECRUITER_DOMAINS = [
  "devpost.com",
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "beehiiv.com",
  "substack.com",
  "github.com",
];

const DATE_REGEXES = [
  /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\b/,
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\b/,
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\s+at\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\b/,
  /\b\d{4}-\d{2}-\d{2}\s+at\s+\d{1,2}:\d{2}\b/,
];

const MEETING_LINK_REGEX =
  /(https?:\/\/[^\s<>"']*(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|calendly\.com)[^\s<>"']*)/i;

function includesPhrase(text: string, phrase: string) {
  return text.includes(phrase.toLowerCase());
}

function titleCase(text: string) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function detectDateTime(text: string) {
  for (const regex of DATE_REGEXES) {
    const match = text.match(regex);
    if (match?.[0]) return match[0];
  }

  return undefined;
}

function parseDateTime(dateTime: string) {
  let parseable = dateTime.replace(" at ", " ");

  const hasYear = /\b\d{4}\b/.test(parseable);
  if (!hasYear) {
    parseable = `${parseable}, ${new Date().getFullYear()}`;
  }

  const parsed = Date.parse(parseable);
  if (Number.isNaN(parsed)) return undefined;

  return new Date(parsed).toISOString();
}

function detectMeeting(text: string) {
  const linkMatch = text.match(MEETING_LINK_REGEX);
  if (linkMatch?.[0]) return linkMatch[0];

  const lowered = text.toLowerCase();
  const keyword = MEETING_SIGNALS.find((k) => lowered.includes(k));

  return keyword ? titleCase(keyword) : undefined;
}

function isLikelyAutomatedSender(senderEmail: string) {
  const email = senderEmail.toLowerCase();

  const hasAutomatedLocalPart = NON_RECRUITER_SENDER_HINTS.some((hint) =>
    email.includes(hint),
  );

  const hasNonRecruiterDomain = NON_RECRUITER_DOMAINS.some((domain) =>
    email.includes(domain),
  );

  return hasAutomatedLocalPart || hasNonRecruiterDomain;
}

function hasCareerContext(text: string) {
  return [
    "role",
    "position",
    "intern",
    "internship",
    "software developer",
    "engineer",
    "candidate",
    "application",
    "recruiter",
    "hiring manager",
    "talent",
    "interview",
  ].some((phrase) => text.includes(phrase));
}

export function classify(
  email: Omit<
    ScannedEmail,
    | "status"
    | "confidence"
    | "reason"
    | "evidence"
    | "dateTime"
    | "dateTimeISO"
    | "meetingLink"
    | "actionItems"
    | "reviewNotes"
    | "bodyHtml"
  >,
  options?: {
    actionItems?: EmailActionItem[];
    reviewNotes?: string[];
    requiresScheduling?: boolean;
  },
): {
  status: Status;
  confidence: number;
  reason: string;
  evidence: string[];
  dateTime?: string;
  dateTimeISO?: string;
  meetingLink?: string;
} {
  const rawText = `${email.subject}\n${email.sender}\n${email.senderEmail}\n${email.body}`;
  const haystack = rawText.toLowerCase();

  const negativeHits = NEGATIVE.filter((phrase) => includesPhrase(haystack, phrase));
  const strongHits = STRONG_INTERVIEW.filter((phrase) => includesPhrase(haystack, phrase));
  const schedulingHits = SCHEDULING_SIGNALS.filter((phrase) => includesPhrase(haystack, phrase));
  const weakHits = WEAK_INTERVIEW.filter((phrase) => includesPhrase(haystack, phrase));

  const dateTime = detectDateTime(rawText);
  const dateTimeISO = dateTime ? parseDateTime(dateTime) : undefined;
  const meetingLink = detectMeeting(rawText);

  const hasDateTime = Boolean(dateTime && dateTimeISO);
  const automatedSender = isLikelyAutomatedSender(email.senderEmail);
  const careerContext = hasCareerContext(haystack);
  const requiresScheduling = options?.requiresScheduling ?? false;
  const actionEvidence = options?.actionItems?.flatMap((item) =>
    item.linkText && item.linkText.length <= 40 ? [item.linkText] : [],
  ) ?? [];

  const evidence = dedupe([
    ...(dateTime && !requiresScheduling ? [dateTime] : []),
    ...(meetingLink ? [meetingLink] : []),
    ...strongHits.slice(0, 3),
    ...schedulingHits.slice(0, 2),
    ...weakHits.slice(0, 2),
    ...actionEvidence,
  ]);

  const schedulingReviewReason =
    "Needs review because this email asks you to schedule an interview, but no final interview time has been selected yet.";

  // 1. Account/product/finance/platform notifications should be ignored.
  // This catches emails like Wealthsimple fee schedule updates.
  if (negativeHits.length > 0 && strongHits.length === 0 && schedulingHits.length === 0) {
    return {
      status: "ignored",
      confidence: 0.94,
      reason: `Ignored because this looks like an account update, platform notification, rejection, newsletter, or generic application email.`,
      evidence: negativeHits.slice(0, 3),
    };
  }

  // 2. Automated sender + no clear interview signal = ignored.
  if (automatedSender && strongHits.length === 0 && schedulingHits.length === 0 && !requiresScheduling) {
    return {
      status: "ignored",
      confidence: 0.9,
      reason: "Ignored because this appears to be an automated notification, not a recruiter interview email.",
      evidence: [email.senderEmail],
    };
  }

  // 3. Meeting links alone are not enough. Lots of non-interview emails mention calls/support.
  if (!careerContext && strongHits.length === 0 && schedulingHits.length === 0) {
    return {
      status: "ignored",
      confidence: 0.86,
      reason: "Ignored because no career or interview scheduling context was detected.",
      evidence: [],
    };
  }

  // 4. Ready requires a strong interview signal, exact date/time, and no pending scheduling tasks.
  if (strongHits.length > 0 && hasDateTime && !requiresScheduling) {
    return {
      status: "ready",
      confidence: Math.min(0.98, 0.9 + strongHits.length * 0.02 + (meetingLink ? 0.03 : 0)),
      reason: "Ready to add because this email includes a clear interview signal and a confirmed date/time.",
      evidence,
      dateTime,
      dateTimeISO,
      meetingLink,
    };
  }

  // 5. Interview signal or pending scheduling tasks without a confirmed time = review.
  if (strongHits.length > 0 || requiresScheduling) {
    return {
      status: "review",
      confidence: Math.min(0.86, 0.72 + strongHits.length * 0.04 + (requiresScheduling ? 0.06 : 0)),
      reason: requiresScheduling
        ? schedulingReviewReason
        : "Needs review because this email mentions an interview, but no exact date/time was detected.",
      evidence,
      meetingLink,
    };
  }

  // 6. Scheduling language with career context = review.
  if (schedulingHits.length > 0 && careerContext) {
    return {
      status: "review",
      confidence: 0.68,
      reason: "Needs review because this email may be about scheduling, but it does not include a confirmed interview date/time.",
      evidence,
      meetingLink,
    };
  }

  // 7. Weak recruiter/interview wording alone is not enough.
  return {
    status: "ignored",
    confidence: 0.76,
    reason: "Ignored because it does not clearly describe an interview or ask you to schedule one.",
    evidence: weakHits.slice(0, 2),
  };
}

export function buildSourceUrl(
  provider: Provider,
  id: string,
  webLink?: string,
  accountEmail?: string,
): string {
  if (provider === "gmail") {
    const authUser = accountEmail ? `?authuser=${encodeURIComponent(accountEmail)}` : "";
    return `https://mail.google.com/mail/${authUser}#inbox/${id}`;
  }

  return webLink ?? `https://outlook.office.com/mail/inbox/id/${id}`;
}