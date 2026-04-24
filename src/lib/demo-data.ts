export const demoClient = {
  id: "demo-client-user",
  role: "CLIENT",
  name: "Ayesha Khan",
  email: "client@mizan.dev"
};

export const demoLawyer = {
  id: "demo-lawyer-user",
  role: "LAWYER",
  name: "Muneeb Qureshi",
  email: "lawyer@mizan.dev"
  
};

export const demoCase = {
  id: "demo-case-1",
  title: "Vendor contract payment dispute",
  category: "BUSINESS_VENDOR",
  status: "ACTIVE",
  priority: "HIGH",
  stage: "Clause Review & Notice Draft",
  description:
    "Payment dispute tied to delayed obligations, ambiguous termination, and partial delivery evidence.",
  caseHealthScore: 82,
  evidenceCompleteness: 74,
  evidenceStrength: 71,
  deadlineRisk: 39,
  contractFairness: 58,
  draftReadiness: 88,
  escalationReadiness: 63,
  createdAt: "2026-04-17T10:00:00.000Z"
};

export const demoTimeline = [
  {
    id: "t1",
    title: "Agreement signed",
    description: "Vendor agreement executed.",
    eventDate: "2026-02-01T00:00:00.000Z",
    confidence: 0.95,
    sourceLabel: "vendor-agreement.pdf"
  },
  {
    id: "t2",
    title: "Payment demand sent",
    description: "Vendor demanded release of balance payment.",
    eventDate: "2026-03-18T00:00:00.000Z",
    confidence: 0.81,
    sourceLabel: "whatsapp-demand.png"
  },
  {
    id: "t3",
    title: "Lawyer review requested",
    description: "Client requested professional review.",
    eventDate: "2026-04-17T00:00:00.000Z",
    confidence: 1,
    sourceLabel: "system"
  }
];

export const demoDeadlines = [
  {
    id: "d1",
    title: "Notice window before termination",
    dueDate: "2026-04-28T00:00:00.000Z",
    importance: "HIGH",
    status: "UPCOMING",
    notes: "Contract suggests 30 days written notice before termination."
  },
  {
    id: "d2",
    title: "Lawyer draft finalization",
    dueDate: "2026-04-25T00:00:00.000Z",
    importance: "MEDIUM",
    status: "UPCOMING",
    notes: "Finalize legal notice and evidence bundle."
  }
];

export const demoDocuments = [
  {
    id: "doc1",
    fileName: "vendor-agreement.pdf",
    probableCategory: "business/vendor dispute",
    aiSummary:
      "Agreement shows a workable commercial structure but weak IP clarity and supplier-friendly delay penalties.",
    tags: ["contract", "payment", "termination", "vendor"],
    confidence: 0.92,
    createdAt: "2026-04-17T10:00:00.000Z"
  },
  {
    id: "doc2",
    fileName: "whatsapp-demand.png",
    probableCategory: "payment dispute evidence",
    aiSummary:
      "Message captures a payment demand and service suspension threat.",
    tags: ["screenshot", "payment demand", "threat"],
    confidence: 0.81,
    createdAt: "2026-04-17T11:00:00.000Z"
  }
];

export const demoComments = [
  {
    id: "c1",
    authorName: "Muneeb Qureshi",
    body: "Termination clause is usable, but the IP silence needs mention in the notice.",
    visibility: "SHARED",
    createdAt: "2026-04-18T10:00:00.000Z"
  },
  {
    id: "c2",
    authorName: "Ayesha Khan",
    body: "I also have email proof of partial delivery and can upload it today.",
    visibility: "SHARED",
    createdAt: "2026-04-18T12:30:00.000Z"
  }
];

export const demoInternalNotes = [
  {
    id: "n1",
    body: "Potential leverage point: combine delayed payment with service continuity risk and documented demand notice.",
    createdAt: "2026-04-18T10:30:00.000Z"
  }
];

export const demoMetrics = [
  { label: "Case Health", value: 82, change: "+11%" },
  { label: "Evidence Strength", value: 71, change: "+8%" },
  { label: "Draft Readiness", value: 88, change: "+19%" },
  { label: "Deadline Risk", value: 39, change: "-12%" }
];

export const demoStrategy = [
  { step: "Consolidate proof", risk: "Low", effort: "1 day", readiness: 88 },
  { step: "Send legal notice", risk: "Medium", effort: "2 days", readiness: 76 },
  { step: "Request settlement", risk: "Medium", effort: "3 days", readiness: 68 },
  { step: "Escalate to formal complaint", risk: "High", effort: "6 days", readiness: 55 }
];

export const demoHeatmap = [
  {
    clause: "Payment terms",
    severity: "warning",
    excerpt: "Payment due within 14 days of invoice.",
    insight: "Good baseline but no automatic interest for delay."
  },
  {
    clause: "Termination",
    severity: "success",
    excerpt: "30 days written notice before termination.",
    insight: "Usable notice mechanics identified."
  },
  {
    clause: "IP ownership",
    severity: "destructive",
    excerpt: "No explicit ownership or post-termination use language.",
    insight: "Potential future dispute over materials or deliverables."
  }
];
