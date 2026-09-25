import { buildLinkedInDirectUrl } from "@/lib/buildQuery";

export interface Source {
  id: string;
  name: string;
  group: SourceGroup;
  sites: string[];
  suffix?: string;
  customUrl?: (ctx: { title: string; timeFilterId: string }) => string;
  custom?: boolean;
}

export type SourceGroup =
  | "ATS platforms"
  | "Other ATS"
  | "Job boards"
  | "Company career pages"
  | "My boards";

export const SOURCE_GROUPS: readonly SourceGroup[] = [
  "ATS platforms",
  "Other ATS",
  "Job boards",
  "Company career pages",
  "My boards",
] as const;

export const sources: readonly Source[] = [
  // ── ATS platforms ──────────────────────────────────────────────
  { id: "greenhouse", name: "Greenhouse", group: "ATS platforms", sites: ["greenhouse.io"] },
  { id: "lever", name: "Lever", group: "ATS platforms", sites: ["lever.co"], suffix: "-jobgether" },
  { id: "ashby", name: "Ashby", group: "ATS platforms", sites: ["ashbyhq.com"] },
  { id: "pinpoint", name: "Pinpoint", group: "ATS platforms", sites: ["pinpointhq.com"] },
  { id: "paylocity", name: "Paylocity", group: "ATS platforms", sites: ["recruiting.paylocity.com"] },
  { id: "keka", name: "Keka", group: "ATS platforms", sites: ["keka.com"] },
  { id: "workable", name: "Workable", group: "ATS platforms", sites: ["jobs.workable.com"] },
  { id: "breezyhr", name: "BreezyHR", group: "ATS platforms", sites: ["breezy.hr"] },
  { id: "zoho", name: "Zoho Recruit", group: "ATS platforms", sites: ["zohorecruit.com"] },
  { id: "oracle", name: "Oracle Cloud", group: "ATS platforms", sites: ["oraclecloud.com"] },
  { id: "workday", name: "Workday", group: "ATS platforms", sites: ["myworkdayjobs.com"] },
  { id: "recruitee", name: "Recruitee", group: "ATS platforms", sites: ["recruitee.com", "tellent.com"] },
  { id: "rippling", name: "Rippling", group: "ATS platforms", sites: ["rippling.com", "rippling-ats.com"] },
  { id: "gusto", name: "Gusto", group: "ATS platforms", sites: ["jobs.gusto.com"] },
  { id: "careerpuck", name: "CareerPuck", group: "ATS platforms", sites: ["careerpuck.com"] },
  { id: "teamtailor", name: "Teamtailor", group: "ATS platforms", sites: ["teamtailor.com"] },
  { id: "smartrecruiters", name: "SmartRecruiters", group: "ATS platforms", sites: ["jobs.smartrecruiters.com"] },
  { id: "talentreef", name: "TalentReef", group: "ATS platforms", sites: ["jobappnetwork.com"] },
  { id: "homerun", name: "Homerun", group: "ATS platforms", sites: ["homerun.co"] },
  { id: "gem", name: "Gem", group: "ATS platforms", sites: ["gem.com"] },
  { id: "trakstar", name: "Trakstar", group: "ATS platforms", sites: ["trakstar.com"] },
  { id: "cats", name: "Cats", group: "ATS platforms", sites: ["catsone.com"] },
  { id: "jazzhr", name: "JazzHR", group: "ATS platforms", sites: ["applytojob.com"] },
  { id: "jobvite", name: "Jobvite", group: "ATS platforms", sites: ["jobvite.com"] },
  { id: "icims", name: "iCIMS", group: "ATS platforms", sites: ["icims.com"] },
  { id: "dover", name: "Dover", group: "ATS platforms", sites: ["dover.io", "dover.com"] },
  { id: "notion", name: "Notion", group: "ATS platforms", sites: ["notion.site"] },
  { id: "adp", name: "ADP", group: "ATS platforms", sites: ["workforcenow.adp.com", "myjobs.adp.com"] },
  { id: "factorial", name: "Factorial", group: "ATS platforms", sites: ["factorialhr.com"] },
  { id: "trinet", name: "TriNet Hire", group: "ATS platforms", sites: ["trinethire.com"] },
  { id: "join", name: "Join", group: "ATS platforms", sites: ["join.com"] },
  { id: "personio", name: "Personio", group: "ATS platforms", sites: ["personio.com", "personio.de"] },
  { id: "dayforce", name: "Dayforce", group: "ATS platforms", sites: ["dayforcehcm.com"] },
  { id: "avature", name: "Avature", group: "ATS platforms", sites: ["avature.net"] },

  // ── Other ATS ─────────────────────────────────────────────────
  {
    id: "other-ats",
    name: "Other ATS",
    group: "Other ATS",
    sites: [
      "bamboohr.com",
      "recruiting.ultipro.com",
      "careerplug.com",
      "paycomonline.net",
      "successfactors.com",
      "taleo.net",
      "brassring.com",
      "csod.com",
      "freshteam.com",
      "comeet.com",
      "careers-page.com",
      "jobscore.com",
      "applicantpro.com",
      "applicantstack.com",
      "careers.hireology.com",
      "pageuppeople.com",
      "work.fountain.com",
      "workstream.us",
      "recruitingbypaycor.com",
    ],
  },

  // ── Job boards ────────────────────────────────────────────────
  { id: "wellfound", name: "Wellfound", group: "Job boards", sites: ["wellfound.com"] },
  { id: "workatastartup", name: "Work at a Startup", group: "Job boards", sites: ["workatastartup.com"] },
  { id: "builtin", name: "Built In", group: "Job boards", sites: ["builtin.com/job/"] },
  { id: "glassdoor", name: "Glassdoor", group: "Job boards", sites: ["glassdoor.com/job-listing/"] },
  {
    id: "linkedin-google",
    name: "LinkedIn (via Google)",
    group: "Job boards",
    sites: ["linkedin.com/jobs"],
    suffix: '-"No longer accepting applications" "apply"',
  },
  {
    id: "linkedin-direct",
    name: "LinkedIn (direct)",
    group: "Job boards",
    sites: [],
    customUrl: (ctx) => buildLinkedInDirectUrl(ctx.title, ctx.timeFilterId),
  },

  // ── Company career pages ──────────────────────────────────────
  {
    id: "career-pages",
    name: "Company career pages",
    group: "Company career pages",
    sites: [
      "jobs.*",
      "people.*",
      "talent.*",
      "careers.*",
      "*/careers/*",
      "*/career/*",
      "*/employment/*",
      "*/vacancies/*",
      "*/opportunities/*",
      "*/openings/*",
      "*/join-us/*",
      "*/work-with-us/*",
    ],
  },
] as const;
