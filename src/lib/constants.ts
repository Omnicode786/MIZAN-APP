import type { TranslationKey } from "@/lib/translations";

export const APP_NAME = "MIZAN";

type NavItem = {
  href: string;
  label: string;
  translationKey?: TranslationKey;
};

export const CLIENT_NAV: NavItem[] = [
  { href: "/client/dashboard", label: "Dashboard", translationKey: "dashboard" },
  { href: "/client/cases", label: "My Cases", translationKey: "cases" },
  { href: "/client/assistant", label: "AI Assistant", translationKey: "aiLegalAssistance" },
  { href: "/client/ai-workflows", label: "AI Workflows" },
  { href: "/client/lawyers", label: "Find Lawyers", translationKey: "lawyers" },
  { href: "/client/upload", label: "Upload Center", translationKey: "uploadDocument" },
  { href: "/client/drafts", label: "Drafting Studio", translationKey: "draftingStudio" },
  { href: "/client/deadlines", label: "Deadlines", translationKey: "deadlineTracker" },
  { href: "/client/evidence", label: "Evidence Vault", translationKey: "evidenceSearch" },
  { href: "/client/collaboration", label: "Collaboration", translationKey: "sharedCollaboration" }
];

export const LAWYER_NAV: NavItem[] = [
  { href: "/lawyer/dashboard", label: "Dashboard", translationKey: "dashboard" },
  { href: "/lawyer/cases", label: "Case Queue", translationKey: "cases" },
  { href: "/lawyer/review", label: "Review Workspace", translationKey: "caseAgent" },
  { href: "/lawyer/ai-workflows", label: "AI Workflows" },
  { href: "/lawyer/drafts", label: "Draft Approvals", translationKey: "draftingStudio" },
  { href: "/lawyer/deadlines", label: "Deadline Cockpit", translationKey: "deadlineTracker" },
  { href: "/lawyer/analytics", label: "Analytics", translationKey: "dashboard" },
  { href: "/lawyer/debate", label: "Debate Mode", translationKey: "debateMode" },
  { href: "/lawyer/profile", label: "Public Profile", translationKey: "profile" }
];

export const SHARED_NAV: NavItem[] = [
  { href: "/search", label: "Search", translationKey: "search" },
  { href: "/redaction", label: "Redaction" },
  { href: "/notifications", label: "Notifications", translationKey: "notifications" },
  { href: "/pricing", label: "Plans" }
];

export const CASE_CATEGORIES = [
  "CONTRACT_REVIEW",
  "RENTAL_TENANCY",
  "EMPLOYMENT",
  "CYBER_COMPLAINT",
  "HARASSMENT",
  "PAYMENT_DISPUTE",
  "BUSINESS_VENDOR",
  "LEGAL_NOTICE",
  "EVIDENCE_ORGANIZATION",
  "OTHER"
] as const;
