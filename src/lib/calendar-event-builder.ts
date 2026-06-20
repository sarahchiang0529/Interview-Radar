import { extractLinks } from "@/lib/email-links";

export type CalendarEmailInput = {
  subject: string;
  body: string;
  bodyHtml?: string | null;
  company?: string | null;
  role?: string | null;
  interviewType?: string | null;
  dateTime?: string | null;
  dateTimeISO?: string | null;
  meetingLink?: string | null;
  sourceUrl?: string | null;
  reviewNotes?: string[];
};

const INTERVIEW_TYPES = [
  "pair programming interview",
  "technical interview",
  "behavioral interview",
  "phone screen",
  "recruiter screen",
  "onsite interview",
  "on-site interview",
  "virtual interview",
  "video interview",
  "final interview",
  "hiring manager interview",
];

const TIMEZONE_MAP: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  ET: "America/New_York",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  PT: "America/Los_Angeles",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  CT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  MT: "America/Denver",
};

const DATE_TIME_REGEXES = [
  /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}[^.\n]{0,120}/i,
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}[^.\n]{0,120}/i,
];

const INTERVIEWER_REGEX =
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)\s+\(([^)]+)\)/;

const ICON_URL_REGEX =
  /fonts\.gstatic|cdnjs\.cloudflare|googleusercontent|material-icons|icon/i;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_REGEX = /^https?:\/\//i;

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function titleCase(text: string) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferCompany(subject: string, body: string, existing?: string | null) {
  if (existing?.trim()) return existing.trim();

  const text = `${subject}\n${body}`;
  const patterns = [
    /interview with ([A-Z][A-Za-z0-9&.'-]+)/i,
    /(?:attend|join):\s*[^:\n]{0,80}?with ([A-Z][A-Za-z0-9&.'-]+)/i,
    /(?:with|at) ([A-Z][A-Za-z0-9&.'-]+)\s*(?:🚀|!|\.|,|\)|$)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (
      candidate &&
      candidate.length > 2 &&
      !/^(Sarah|Your|You|Candidate|Pair|Programming|Technical|Phone|Final)$/i.test(candidate)
    ) {
      return candidate;
    }
  }

  return undefined;
}

function inferInterviewType(subject: string, body: string, existing?: string | null) {
  if (existing?.trim()) return existing.trim();

  const text = `${subject}\n${body}`.toLowerCase();
  const match = INTERVIEW_TYPES.find((type) => text.includes(type));
  return match ? titleCase(match) : "Interview";
}

function extractInterviewer(body: string) {
  const matches = [...body.matchAll(new RegExp(INTERVIEWER_REGEX.source, "g"))];
  for (const match of matches) {
    const name = match[1]?.trim();
    const title = match[2]?.trim();
    if (!name || !title) continue;
    if (/logo|wealthsimple|goodtime|material/i.test(name)) continue;
    if (/developer|engineer|manager|recruiter|coordinator|designer|director/i.test(title)) {
      return `${name} (${title})`;
    }
  }
  return undefined;
}

function extractRecruiter(body: string, fallbackEmail?: string | null) {
  const matches = [...body.matchAll(new RegExp(INTERVIEWER_REGEX.source, "g"))];
  let recruiterLine: string | undefined;

  for (const match of matches) {
    const name = match[1]?.trim();
    const title = match[2]?.trim();
    if (!name || !title) continue;
    if (/recruit|talent acquisition|coordinator|sourcer/i.test(title)) {
      recruiterLine = `${name}, ${title}`;
      break;
    }
  }

  const emails = [...new Set(body.match(EMAIL_REGEX) ?? [])].filter(
    (email) => !/noreply|no-reply/i.test(email),
  );
  const recruiterEmail = emails.find((email) => /recruit|talent|hr|wealthsimple/i.test(email));

  return {
    recruiterLine,
    recruiterEmail: recruiterEmail ?? fallbackEmail ?? undefined,
  };
}

function detectCodingLanguage(subject: string, body: string) {
  const haystack = `${subject}\n${body}`.toLowerCase();
  const languages = ["java", "python", "javascript", "typescript", "c++", "c#", "go", "ruby"];
  for (const language of languages) {
    const regex = new RegExp(`\\b${language.replace(/[+#]/g, "\\$&")}\\b`, "i");
    if (regex.test(haystack)) {
      return language === "javascript" || language === "typescript"
        ? language[0].toUpperCase() + language.slice(1)
        : language.toUpperCase() === "JAVA"
          ? "Java"
          : language;
    }
  }
  return undefined;
}

function detectRoleHint(body: string, existing?: string | null) {
  if (existing?.trim()) return existing.trim();
  const match = body.match(
    /\b(Intern[^,\n]{0,40},\s*[A-Za-z][A-Za-z\s-]{2,60}(?:Developer|Development|Engineer|Engineering))/i,
  );
  return match?.[1]?.trim();
}

function detectDateTimeText(subject: string, body: string, existing?: string | null) {
  if (existing?.trim()) return existing.trim();

  const text = `${subject}\n${body}`;
  for (const regex of DATE_TIME_REGEXES) {
    const match = text.match(regex);
    if (match?.[0]) return normalizeText(match[0]);
  }

  return undefined;
}

function parseClockTime(value: string) {
  const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/i);
  if (!match) return undefined;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

function detectTimezone(text: string) {
  const match = text.match(/\((EST|EDT|ET|PST|PDT|PT|CST|CDT|CT|MST|MDT|MT)\)/i);
  return match?.[1]?.toUpperCase();
}

function formatGoogleDateTime(year: number, month: number, day: number, hours: number, minutes: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function parseInterviewWindow(dateTimeText: string) {
  const rangeMatch = dateTimeText.match(
    /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\s*(?:\([A-Z]{2,4}\))?\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i,
  );

  const dateMatch = dateTimeText.match(
    /(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i,
  );

  const datePart = dateMatch?.[1];
  const timezoneLabel = detectTimezone(dateTimeText);
  const timezone = timezoneLabel ? TIMEZONE_MAP[timezoneLabel] : undefined;

  const startClock = rangeMatch?.[1] ?? dateTimeText.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i)?.[1];
  const endClock = rangeMatch?.[2];

  if (!datePart || !startClock) return undefined;

  const startParts = parseClockTime(startClock);
  if (!startParts) return undefined;

  let parseable = `${datePart} ${startParts.hours}:${String(startParts.minutes).padStart(2, "0")}`;
  const parsedDate = new Date(parseable);
  if (Number.isNaN(parsedDate.getTime())) return undefined;

  const startDate = formatGoogleDateTime(
    parsedDate.getFullYear(),
    parsedDate.getMonth() + 1,
    parsedDate.getDate(),
    startParts.hours,
    startParts.minutes,
  );

  let endDate: string;
  if (endClock) {
    const endParts = parseClockTime(endClock);
    if (endParts) {
      endDate = formatGoogleDateTime(
        parsedDate.getFullYear(),
        parsedDate.getMonth() + 1,
        parsedDate.getDate(),
        endParts.hours,
        endParts.minutes,
      );
    } else {
      const end = new Date(parsedDate);
      end.setHours(startParts.hours + 1, startParts.minutes, 0, 0);
      endDate = formatGoogleDateTime(
        end.getFullYear(),
        end.getMonth() + 1,
        end.getDate(),
        end.getHours(),
        end.getMinutes(),
      );
    }
  } else {
    const end = new Date(parsedDate);
    end.setHours(startParts.hours + 1, startParts.minutes, 0, 0);
    endDate = formatGoogleDateTime(
      end.getFullYear(),
      end.getMonth() + 1,
      end.getDate(),
      end.getHours(),
      end.getMinutes(),
    );
  }

  return {
    start: timezone ? { dateTime: startDate, timeZone: timezone } : { dateTime: new Date(parsedDate.setHours(startParts.hours, startParts.minutes, 0, 0)).toISOString() },
    end: timezone ? { dateTime: endDate, timeZone: timezone } : { dateTime: new Date(new Date(parsedDate).getTime() + 60 * 60 * 1000).toISOString() },
  };
}

function resolveEventTimes(email: CalendarEmailInput) {
  const dateTimeText = detectDateTimeText(email.subject, email.body, email.dateTime);

  if (dateTimeText) {
    const parsed = parseInterviewWindow(dateTimeText);
    if (parsed) return parsed;
  }

  if (email.dateTimeISO) {
    const start = new Date(email.dateTimeISO);
    if (!Number.isNaN(start.getTime())) {
      return {
        start: { dateTime: start.toISOString() },
        end: { dateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString() },
      };
    }
  }

  const fallbackStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    start: { dateTime: fallbackStart.toISOString() },
    end: { dateTime: new Date(fallbackStart.getTime() + 60 * 60 * 1000).toISOString() },
  };
}

function buildUsefulLinks(email: CalendarEmailInput) {
  const links = extractLinks(email.body, email.bodyHtml);
  const useful = links.filter((link) => {
    if (ICON_URL_REGEX.test(link.url)) return false;
    if (email.meetingLink && link.url === email.meetingLink) return false;
    return /goodtime|calendly|coderpad|zoom|meet\.google|teams\.microsoft|schedule|book|forms\.gle|typeform/i.test(
      `${link.anchorText} ${link.url}`,
    );
  });

  return useful.slice(0, 4);
}

function pickFirstMatchingUrl(urls: string[], pattern: RegExp) {
  return urls.find((url) => pattern.test(url));
}

function formatTitleLine(email: CalendarEmailInput, company: string, interviewType: string) {
  const role = detectRoleHint(email.body, email.role);
  const normalizedType = interviewType.toLowerCase().includes("technical")
    ? interviewType.toLowerCase()
    : `Technical ${interviewType.toLowerCase()}`;
  const roleSuffix = role ? ` ${role} role` : " role";
  return `${titleCase(normalizedType)} for ${company}${roleSuffix}.`;
}

export function buildCalendarEventPayload(email: CalendarEmailInput) {
  const company = inferCompany(email.subject, email.body, email.company) ?? "Interview";
  const interviewType = inferInterviewType(email.subject, email.body, email.interviewType);
  const interviewer = extractInterviewer(email.body);
  const { recruiterLine, recruiterEmail } = extractRecruiter(email.body, null);
  const codingLanguage = detectCodingLanguage(email.subject, email.body);
  const { start, end } = resolveEventTimes(email);
  const usefulLinks = buildUsefulLinks(email);
  const allUrls = usefulLinks.map((link) => link.url);
  const googleMeet = email.meetingLink && URL_REGEX.test(email.meetingLink)
    ? email.meetingLink
    : pickFirstMatchingUrl(allUrls, /meet\.google|zoom\.us|teams\.microsoft/i);
  const coderpad = pickFirstMatchingUrl(allUrls, /coderpad|codesignal|hackerrank/i);

  const summary = `${company}: ${interviewType}`;

  const descriptionParts = [
    formatTitleLine(email, company, interviewType),
    interviewer ? `Interviewer:\n${interviewer.replace(/\s+\(/, ", ").replace(/\)$/, "")}` : undefined,
    recruiterLine || recruiterEmail
      ? `Recruiter:\n${[recruiterLine, recruiterEmail]
          .filter(Boolean)
          .join("\n")}`
      : undefined,
    `Coding language:\n${codingLanguage ?? "Not specified"}`,
    `Links:\nGoogle Meet: ${googleMeet ?? "[paste link when received]"}\nCoderPad: ${coderpad ?? "[paste link when received]"}`,
    email.sourceUrl ? `Source email:\n${email.sourceUrl}` : undefined,
  ].filter(Boolean);

  return {
    summary,
    description: descriptionParts.join("\n\n"),
    start,
    end,
  };
}
