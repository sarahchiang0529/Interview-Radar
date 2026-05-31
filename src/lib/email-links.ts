export type EmailActionItem = {
  label: string;
  description?: string;
  linkText?: string;
  url?: string;
  deadlineNote?: string;
};

export type ExtractedLink = {
  anchorText: string;
  url: string;
};

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtml(text: string) {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function isSkippableLink(anchorText: string, url: string) {
  const combined = `${anchorText} ${url}`.toLowerCase();
  if (!url || url === "#" || url.startsWith("javascript:")) return true;
  if (
    /unsubscribe|manage preferences|privacy policy|terms of service|view in browser|email preferences|powered by|font-family|tracking|pixel|linkedin\.com\/in\//i.test(
      combined,
    )
  ) {
    return true;
  }
  return false;
}

export function extractLinks(body: string, bodyHtml?: string | null): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  const add = (anchorText: string, url: string) => {
    const trimmedUrl = url.trim();
    const cleanText = stripHtml(anchorText);
    if (isSkippableLink(cleanText, trimmedUrl) || seen.has(trimmedUrl)) return;
    seen.add(trimmedUrl);
    links.push({ anchorText: cleanText || trimmedUrl, url: trimmedUrl });
  };

  if (bodyHtml) {
    const anchorRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = anchorRegex.exec(bodyHtml)) !== null) {
      add(match[2], match[1]);
    }
  }

  for (const url of body.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? []) {
    add(url.replace(/[.,;:!?)]+$/, ""), url.replace(/[.,;:!?)]+$/, ""));
  }

  for (const mailto of body.match(/mailto:[^\s<>"']+/gi) ?? []) {
    add(mailto.replace(/^mailto:/i, "").split("?")[0], mailto);
  }

  return links;
}

function findLink(
  links: ExtractedLink[],
  matchers: Array<(link: ExtractedLink) => boolean>,
): ExtractedLink | undefined {
  for (const matcher of matchers) {
    const found = links.find(matcher);
    if (found) return found;
  }
  return undefined;
}


type ActionPattern = {
  id: string;
  scheduling: boolean;
  test: RegExp;
  label: string | ((text: string) => string);
  linkMatchers: Array<(link: ExtractedLink) => boolean>;
};

const ACTION_PATTERNS: ActionPattern[] = [
  {
    id: "find-time",
    scheduling: true,
    test: /find a time|select at least \d+ dates and times|select.*dates and times|choose at least \d+ times/i,
    label: (text) => {
      const match = text.match(/select at least (\d+) dates and times/i);
      return match ? `Select at least ${match[1]} dates and times` : "Select availability times";
    },
    linkMatchers: [
      (l) => /find a time/i.test(l.anchorText),
      (l) => /goodtime|calendly|schedule|book|availability|youcanbookme/i.test(`${l.anchorText} ${l.url}`),
    ],
  },
  {
    id: "send-availability",
    scheduling: true,
    test: /send (over )?your availability|share your availability|provide your availability|send us your availability/i,
    label: "Send your availability",
    linkMatchers: [
      (l) => /availability|find a time|schedule|calendly|goodtime/i.test(`${l.anchorText} ${l.url}`),
    ],
  },
  {
    id: "schedule-call",
    scheduling: true,
    test: /schedule a (call|chat|meeting|interview)|book a time|pick a time to meet|schedule your interview/i,
    label: (text) => {
      if (/schedule a call/i.test(text)) return "Schedule a call";
      if (/schedule (?:an interview|your interview)/i.test(text)) return "Schedule your interview";
      return "Schedule a meeting";
    },
    linkMatchers: [
      (l) => /schedule|calendly|goodtime|book|find a time/i.test(`${l.anchorText} ${l.url}`),
    ],
  },
  {
    id: "preferred-language",
    scheduling: false,
    test: /preferred language to code|submit your preferred language/i,
    label: "Submit preferred coding language",
    linkMatchers: [
      (l) => /^here$/i.test(l.anchorText),
      (l) => /language|coderpad|form|survey|typeform|forms\.gle/i.test(`${l.anchorText} ${l.url}`),
    ],
  },
];


const SCHEDULING_LINK_MATCHERS: Array<(link: ExtractedLink) => boolean> = [
  (l) => /find a time/i.test(l.anchorText),
  (l) => /goodtime|calendly|schedule|book|availability|youcanbookme/i.test(`${l.anchorText} ${l.url}`),
];

function hasSchedulingSignals(text: string) {
  return ACTION_PATTERNS.some((pattern) => pattern.scheduling && pattern.test.test(text));
}

function buildPrimarySchedulingLabel(text: string) {
  if (/schedule a call/i.test(text)) return "Schedule a call";
  if (
    /send (over )?your availability|share your availability|provide your availability/i.test(text) &&
    !/find a time|select.*dates and times/i.test(text)
  ) {
    return "Send your availability";
  }
  if (/interview|recruiter screen|phone screen/i.test(text)) return "Schedule your interview";
  return "Schedule a meeting";
}

function buildPrimarySchedulingAction(text: string, links: ExtractedLink[]): EmailActionItem | null {
  if (!hasSchedulingSignals(text)) return null;

  const link = findLink(links, SCHEDULING_LINK_MATCHERS);

  return {
    label: buildPrimarySchedulingLabel(text),
    linkText: link?.anchorText,
    url: link?.url,
  };
}

function buildLanguageAction(text: string, links: ExtractedLink[]): EmailActionItem | null {
  const pattern = ACTION_PATTERNS.find((entry) => entry.id === "preferred-language");
  if (!pattern?.test.test(text)) return null;

  const link = findLink(links, pattern.linkMatchers);
  return {
    label: typeof pattern.label === "function" ? pattern.label(text) : pattern.label,
    linkText: link?.anchorText,
    url: link?.url,
  };
}


export function extractReviewNotes(body: string): string[] {
  const text = normalizeText(body);
  const notes: string[] = [];

  const dateSelection = text.match(/select at least \d+ dates and times/i)?.[0];
  if (dateSelection) {
    notes.push(`${dateSelection.charAt(0).toUpperCase()}${dateSelection.slice(1)}.`);
  }

  const deadline =
    text.match(/complete (?:the above steps |these steps )?within the next \d+ hours?/i)?.[0] ??
    text.match(/please complete (?:the above|these) steps within the next \d+ hours?/i)?.[0] ??
    text.match(/complete (?:the above steps |these steps )?within \d+ (?:business )?days?/i)?.[0];

  if (deadline) {
    notes.push(`${deadline.charAt(0).toUpperCase()}${deadline.slice(1)}.`);
  }

  const timeWindow = text.match(
    /select times between \d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*-\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:EST|PST|ET|PT|CST|CDT)?/i,
  )?.[0];
  if (timeWindow) {
    notes.push(`${timeWindow.charAt(0).toUpperCase()}${timeWindow.slice(1)}.`);
  }

  if (/coderpad/i.test(text)) {
    notes.push("The technical interview uses CoderPad.");
  } else if (/coding challenge/i.test(text)) {
    notes.push("The interview includes a coding challenge.");
  } else if (/pair programming interview/i.test(text)) {
    notes.push("This is a pair programming interview.");
  }

  if (/technical remote interview/i.test(text)) {
    notes.push("This is a technical remote interview.");
  }

  return [...new Set(notes)];
}

export function extractActionItems(body: string, bodyHtml?: string | null): EmailActionItem[] {
  const text = normalizeText(body);
  const links = extractLinks(body, bodyHtml);
  const items: EmailActionItem[] = [];

  const schedulingAction = buildPrimarySchedulingAction(text, links);
  if (schedulingAction) {
    items.push(schedulingAction);
  }

  const languageAction = buildLanguageAction(text, links);
  if (languageAction && schedulingAction) {
    items.push(languageAction);
  }

  return items;
}

export function buildActionEvidence(
  body: string,
  actionItems: EmailActionItem[],
  reviewNotes: string[],
): string[] {
  const text = body.toLowerCase();
  const evidence: string[] = [];

  if (/technical remote interview/i.test(text)) evidence.push("technical remote interview");
  if (/coding challenge/i.test(text)) evidence.push("coding challenge");
  if (/coderpad/i.test(text)) evidence.push("CoderPad");
  if (/find a time/i.test(text)) evidence.push("Find A Time");
  if (/next 24 hours/i.test(text)) evidence.push("next 24 hours");
  if (/pair programming interview/i.test(text)) evidence.push("pair programming interview");

  for (const item of actionItems) {
    if (item.linkText && item.linkText.length <= 40 && !/^email\s/i.test(item.linkText)) {
      evidence.push(item.linkText);
    }
  }

  for (const note of reviewNotes) {
    if (/24 hours/i.test(note)) evidence.push("next 24 hours");
  }

  return [...new Set(evidence)].slice(0, 8);
}

export function requiresInterviewScheduling(body: string, actionItems: EmailActionItem[]) {
  const text = body.toLowerCase();
  if (actionItems.some((item) => /schedule your interview|send your availability|schedule a call/i.test(item.label))) {
    return true;
  }
  return /find a time|select at least \d+ dates|share your availability|next steps you need to complete|goodtime/i.test(
    text,
  );
}

export function sanitizeEmailHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:[^"']*/gi, "#");
}

export function previewEmailBody(body: string, maxLength = 480) {
  const preview = normalizeText(body);
  if (preview.length <= maxLength) return preview;
  return `${preview.slice(0, maxLength).trim()}…`;
}
