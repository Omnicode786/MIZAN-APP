import type { CaseCategory } from "@prisma/client";

const ROADMAPS: Record<string, Array<{ title: string; description: string; offsetDays: number }>> = {
  BUSINESS_VENDOR: [
    {
      title: "Next step: consolidate invoice and delivery proof",
      description: "Attach invoices, delivery records, and demand messages so the payment trail is complete.",
      offsetDays: 0
    },
    {
      title: "Next step: send legal notice",
      description: "Issue a formal notice that reserves contractual rights and defines a cure period.",
      offsetDays: 2
    },
    {
      title: "Next step: prepare escalation bundle",
      description: "If payment is still withheld, organize notice proof, contract terms, and damages material for escalation.",
      offsetDays: 5
    }
  ],
  RENTAL_TENANCY: [
    {
      title: "Next step: gather tenancy documents",
      description: "Collect rent agreement, payment receipts, notices, and possession-related messages.",
      offsetDays: 0
    },
    {
      title: "Next step: record breaches clearly",
      description: "Map the missed payment, eviction threat, or repair issue into dated evidence.",
      offsetDays: 1
    },
    {
      title: "Next step: prepare notice or complaint path",
      description: "Choose whether the matter should move through notice, settlement, or formal complaint based on proof strength.",
      offsetDays: 4
    }
  ],
  EMPLOYMENT: [
    {
      title: "Next step: secure employment record",
      description: "Keep offer letter, salary proofs, warnings, and resignation or termination messages together.",
      offsetDays: 0
    },
    {
      title: "Next step: document unpaid dues or misconduct",
      description: "Create a dated list of salary issues, harassment, or wrongful action.",
      offsetDays: 1
    },
    {
      title: "Next step: draft representation",
      description: "Prepare a structured representation or legal notice based on the employment record.",
      offsetDays: 3
    }
  ],
  CYBER_COMPLAINT: [
    {
      title: "Next step: preserve screenshots and URLs",
      description: "Save messages, account links, numbers, and platform references before they disappear.",
      offsetDays: 0
    },
    {
      title: "Next step: identify incident timeline",
      description: "Pin down the first abusive or fraudulent act, the platform involved, and follow-up threats.",
      offsetDays: 1
    },
    {
      title: "Next step: prepare complaint packet",
      description: "Bundle screenshots, IDs, dates, and narrative summary for complaint submission.",
      offsetDays: 2
    }
  ],
  HARASSMENT: [
    {
      title: "Next step: preserve direct evidence",
      description: "Store messages, audio, witness notes, and prior complaint history in one place.",
      offsetDays: 0
    },
    {
      title: "Next step: identify reporting channel",
      description: "Determine whether the matter should move through workplace, educational, or police complaint routes.",
      offsetDays: 1
    },
    {
      title: "Next step: draft formal complaint",
      description: "Use a calm factual chronology with specific dates, acts, and supporting evidence.",
      offsetDays: 2
    }
  ]
};

export function getRoadmapForCase(category: CaseCategory | string, anchor = new Date()) {
  const base = ROADMAPS[category] || [
    {
      title: "Next step: organize core evidence",
      description: "Keep the main documents, messages, and timeline in one structured file set.",
      offsetDays: 0
    },
    {
      title: "Next step: identify legal issue",
      description: "Clarify the dispute category, parties involved, and the immediate relief sought.",
      offsetDays: 1
    },
    {
      title: "Next step: draft response or notice",
      description: "Prepare the most appropriate document once facts and deadlines are clear.",
      offsetDays: 3
    }
  ];

  return base.map((item, index) => {
    const eventDate = new Date(anchor);
    eventDate.setDate(anchor.getDate() + item.offsetDays + index);
    return {
      ...item,
      eventDate,
      sourceLabel: "roadmap",
      confidence: 0.76,
      isAiGenerated: true
    };
  });
}
