export interface TimeFilter {
  readonly id: string;
  readonly label: string;
  /** Google tbs qdr parameter. Empty string = omit tbs. */
  readonly qdr: string;
  /** For LinkedIn f_TPR param. undefined = omit. */
  readonly linkedinSeconds?: number;
  /** For "older than" filters: cdr-based tbs value. */
  readonly cdr?: string;
}

function monthsAgoDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export const TIME_FILTERS: readonly TimeFilter[] = [
  { id: "any", label: "Any time", qdr: "" },
  { id: "hour", label: "Past hour", qdr: "qdr:h", linkedinSeconds: 3600 },
  { id: "4h", label: "Past 4 hours", qdr: "qdr:h4" },
  { id: "8h", label: "Past 8 hours", qdr: "qdr:h8" },
  { id: "12h", label: "Past 12 hours", qdr: "qdr:h12" },
  { id: "24h", label: "Past 24 hours", qdr: "qdr:d", linkedinSeconds: 86400 },
  { id: "48h", label: "Past 48 hours", qdr: "qdr:d2" },
  { id: "72h", label: "Past 72 hours", qdr: "qdr:d3" },
  { id: "week", label: "Past week", qdr: "qdr:w", linkedinSeconds: 604800 },
  { id: "month", label: "Past month", qdr: "qdr:m", linkedinSeconds: 2592000 },
  {
    id: "older1m",
    label: "Older than 1 month",
    qdr: "",
    cdr: `cdr:1,cd_max:${monthsAgoDate(1)}`,
  },
  {
    id: "older3m",
    label: "Older than 3 months",
    qdr: "",
    cdr: `cdr:1,cd_max:${monthsAgoDate(3)}`,
  },
  {
    id: "older6m",
    label: "Older than 6 months",
    qdr: "",
    cdr: `cdr:1,cd_max:${monthsAgoDate(6)}`,
  },
] as const;

export function getTimeFilter(id: string): TimeFilter {
  return TIME_FILTERS.find((f) => f.id === id) ?? TIME_FILTERS[0];
}
