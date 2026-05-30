export type Provider = "gmail" | "outlook";
export type Status = "ready" | "review" | "ignored" | "added";

export interface ScannedEmail {
  id: string;
  provider: Provider;
  subject: string;
  sender: string;
  senderEmail: string;
  receivedAt: string; // ISO
  body: string;
  company?: string;
  role?: string;
  interviewType?: string;
  dateTime?: string; // human-readable detected
  dateTimeISO?: string; // for calendar
  meetingLink?: string;
  confidence: number; // 0-1
  status: Status;
  reason: string;
  evidence: string[];
  sourceUrl: string;
  calendarEventUrl?: string;
}

const POSITIVE = [
  "final interview",
  "technical interview",
  "behavioral interview",
  "recruiter screen",
  "phone screen",
  "onsite",
  "virtual interview",
  "schedule a call",
  "schedule your interview",
  "schedule a recruiter screen",
  "availability",
  "next steps",
  "hiring manager",
  "recruiter",
  "interview",
  "google meet",
  "zoom",
  "microsoft teams",
  "calendly",
];

const NEGATIVE = [
  "application received",
  "thank you for applying",
  "we received your application",
  "application submitted",
  "job alert",
  "newsletter",
  "unfortunately",
  "not moving forward",
  "no longer under consideration",
];

// Very simple date detector for demo purposes
const DATE_REGEX =
  /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\b/;

export function classify(
  email: Omit<
    ScannedEmail,
    "status" | "confidence" | "reason" | "evidence" | "dateTime" | "dateTimeISO" | "meetingLink"
  >,
): {
  status: Status;
  confidence: number;
  reason: string;
  evidence: string[];
  dateTime?: string;
  dateTimeISO?: string;
  meetingLink?: string;
} {
  const haystack = `${email.subject}\n${email.body}`.toLowerCase();
  const evidence: string[] = [];

  const negHits = NEGATIVE.filter((n) => haystack.includes(n));
  const posHits = POSITIVE.filter((p) => haystack.includes(p));

  // detect date/time
  const dateMatch = email.body.match(DATE_REGEX);
  const dateTime = dateMatch ? dateMatch[0] : undefined;
  let dateTimeISO: string | undefined;
  if (dateTime) {
    const parsed = Date.parse(dateTime.replace(" at ", " "));
    if (!isNaN(parsed)) dateTimeISO = new Date(parsed).toISOString();
  }

  // detect meeting link keywords
  const meetingKw = ["google meet", "zoom", "microsoft teams", "calendly"].find((k) =>
    haystack.includes(k),
  );

  if (dateTime) evidence.push(dateTime);
  if (meetingKw) evidence.push(meetingKw.replace(/\b\w/g, (c) => c.toUpperCase()));
  posHits.slice(0, 3).forEach((p) => {
    if (!evidence.some((e) => e.toLowerCase() === p)) evidence.push(p);
  });

  // Strong negative wins (unless overridden by strong positive + date)
  if (negHits.length > 0 && !dateTime && posHits.filter((p) => p !== "recruiter").length === 0) {
    return {
      status: "ignored",
      confidence: 0.9,
      reason: "Generic application confirmation or unrelated email.",
      evidence: negHits.slice(0, 2),
    };
  }

  if (posHits.length === 0) {
    return {
      status: "ignored",
      confidence: 0.7,
      reason: "No interview-related signals detected.",
      evidence: [],
    };
  }

  if (dateTime) {
    return {
      status: "ready",
      confidence: 0.95,
      reason: "Interview email with a clear date and time.",
      evidence,
      dateTime,
      dateTimeISO,
      meetingLink: meetingKw,
    };
  }

  return {
    status: "review",
    confidence: 0.7,
    reason: "Interview-related but missing exact date/time or scheduling details.",
    evidence,
    meetingLink: meetingKw,
  };
}

export function buildSourceUrl(provider: Provider, id: string, webLink?: string): string {
  if (provider === "gmail") {
    return `https://mail.google.com/mail/u/0/#inbox/${id}`;
  }
  return webLink ?? `https://outlook.office.com/mail/inbox/id/${id}`;
}
