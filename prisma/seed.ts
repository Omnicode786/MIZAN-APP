import {
  AssignmentStatus,
  AssistantScope,
  CaseCategory,
  CaseStatus,
  CommentVisibility,
  DeadlineStatus,
  DebateStatus,
  DocumentType,
  DraftType,
  MessageRole,
  PrismaClient,
  Priority,
  Role,
  UploadSource,
  VerificationStatus
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 10);

  await prisma.debateTurn.deleteMany();
  await prisma.debateSession.deleteMany();
  await prisma.assistantMessage.deleteMany();
  await prisma.assistantThread.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.redactionJob.deleteMany();
  await prisma.exportBundle.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.internalNote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.draftVersion.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.evidenceItem.deleteMany();
  await prisma.document.deleteMany();
  await prisma.caseAssignment.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.case.deleteMany();
  await prisma.lawyerProfile.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  const clientUser = await prisma.user.create({
    data: {
      email: "client@mizan.dev",
      passwordHash,
      name: "Ayesha Khan",
      role: Role.CLIENT,
      clientProfile: {
        create: {
          phone: "+92 300 1234567",
          region: "Lahore",
          simpleLanguageMode: true
        }
      }
    },
    include: { clientProfile: true }
  });

  const lawyerUser = await prisma.user.create({
    data: {
      email: "lawyer@mizan.dev",
      passwordHash,
      name: "Muneeb Qureshi",
      role: Role.LAWYER,
      lawyerProfile: {
        create: {
          publicSlug: "muneeb-qureshi",
          firmName: "Qureshi Legal Advisory",
          bio: "Commercial and civil disputes lawyer focused on contracts, notices, and evidence-led case strategy in Pakistan.",
          specialties: ["Contract review", "Cyber complaints", "Tenancy disputes"],
          yearsExperience: 7,
          hourlyRate: 12000,
          fixedFeeFrom: 45000,
          isPublic: true,
          verifiedBadge: true,
          rating: 4.8,
          city: "Lahore"
        }
      }
    },
    include: { lawyerProfile: true }
  });

  const secondLawyer = await prisma.user.create({
    data: {
      email: "lawyer2@mizan.dev",
      passwordHash,
      name: "Sara Ahmed",
      role: Role.LAWYER,
      lawyerProfile: {
        create: {
          publicSlug: "sara-ahmed",
          firmName: "Ahmed Chambers",
          bio: "Handles employment disputes, harassment complaints, and legal notices with a strong negotiation-first approach.",
          specialties: ["Employment", "Harassment", "Legal notices"],
          yearsExperience: 5,
          hourlyRate: 9000,
          fixedFeeFrom: 30000,
          isPublic: true,
          verifiedBadge: true,
          rating: 4.7,
          city: "Karachi"
        }
      }
    },
    include: { lawyerProfile: true }
  });

  const legalCase = await prisma.case.create({
    data: {
      title: "Vendor contract payment dispute",
      category: CaseCategory.BUSINESS_VENDOR,
      status: CaseStatus.ACTIVE,
      priority: Priority.HIGH,
      stage: "Lawyer proposal received",
      description:
        "A payment dispute involving delayed vendor obligations, unclear termination terms, and proof of partial delivery.",
      creatorId: clientUser.id,
      clientProfileId: clientUser.clientProfile!.id,
      lawyerRequestedAt: new Date("2026-04-17T10:00:00Z"),
      sharedWithLawyerAt: new Date("2026-04-18T10:00:00Z"),
      caseHealthScore: 82,
      evidenceCompleteness: 74,
      evidenceStrength: 71,
      deadlineRisk: 39,
      contractFairness: 58,
      draftReadiness: 88,
      escalationReadiness: 63
    }
  });

  const contractDoc = await prisma.document.create({
    data: {
      caseId: legalCase.id,
      uploadedById: clientUser.id,
      fileName: "vendor-agreement.pdf",
      filePath: "/uploads/demo/vendor-agreement.pdf",
      mimeType: "application/pdf",
      sizeBytes: 431221,
      fileType: DocumentType.PDF,
      sourceType: UploadSource.USER_UPLOAD,
      probableCategory: "business/vendor dispute",
      extractedText:
        "Termination requires 30 days written notice. Payment due within 14 days of invoice. Penalty can be imposed for delayed performance. IP ownership clause is silent.",
      aiSummary:
        "Agreement shows a commercial payment structure but weak IP clarity and supplier-friendly delay penalty language.",
      tags: ["contract", "payment", "termination", "vendor"],
      confidence: 0.92,
      verificationStatus: VerificationStatus.VERIFIED,
      metadata: {
        entities: ["Ayesha Khan", "Nova Supplies", "Rs. 1,850,000"],
        detectedDates: ["2026-02-01", "2026-03-18"]
      }
    }
  });

  const screenshotDoc = await prisma.document.create({
    data: {
      caseId: legalCase.id,
      uploadedById: clientUser.id,
      fileName: "whatsapp-demand.png",
      filePath: "/uploads/demo/whatsapp-demand.png",
      mimeType: "image/png",
      sizeBytes: 211004,
      fileType: DocumentType.SCREENSHOT,
      sourceType: UploadSource.SCREEN_CAPTURE,
      probableCategory: "payment dispute evidence",
      extractedText:
        "Please release remaining payment by 28 March or we will stop support.",
      aiSummary:
        "Message captures a payment demand and a threat of service suspension if dues remain unpaid.",
      tags: ["screenshot", "payment demand", "threat"],
      confidence: 0.81,
      verificationStatus: VerificationStatus.UNREVIEWED
    }
  });

  await prisma.evidenceItem.createMany({
    data: [
      {
        caseId: legalCase.id,
        documentId: contractDoc.id,
        label: "Payment clause",
        summary: "Invoice payable within 14 days.",
        sourceType: "contract",
        searchableText:
          "payment invoice payable within 14 days delayed performance penalty",
        evidenceStrength: 86,
        extractedEntities: {
          dates: ["2026-02-01"],
          amounts: ["1850000"],
          parties: ["Nova Supplies", "Ayesha Khan"]
        }
      },
      {
        caseId: legalCase.id,
        documentId: screenshotDoc.id,
        label: "Demand message",
        summary: "Threat of support suspension over unpaid amount.",
        sourceType: "screenshot",
        searchableText: "remaining payment stop support threat 28 march",
        evidenceStrength: 72,
        extractedEntities: {
          dates: ["2026-03-28"],
          actions: ["stop support"],
          issue: "payment default"
        }
      }
    ]
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        caseId: legalCase.id,
        sourceDocumentId: contractDoc.id,
        title: "Agreement signed",
        description: "Vendor agreement executed.",
        eventDate: new Date("2026-02-01T00:00:00Z"),
        confidence: 0.95,
        sourceLabel: "evidence"
      },
      {
        caseId: legalCase.id,
        sourceDocumentId: screenshotDoc.id,
        title: "Payment demand sent",
        description: "Vendor demanded release of balance payment.",
        eventDate: new Date("2026-03-18T00:00:00Z"),
        confidence: 0.81,
        sourceLabel: "evidence"
      },
      {
        caseId: legalCase.id,
        title: "Next step: send legal notice",
        description: "Prepare a notice that reserves contractual remedies and asks for cure within a defined period.",
        eventDate: new Date("2026-04-24T00:00:00Z"),
        confidence: 0.74,
        sourceLabel: "roadmap"
      }
    ]
  });

  await prisma.deadline.createMany({
    data: [
      {
        caseId: legalCase.id,
        sourceDocumentId: contractDoc.id,
        title: "Notice window before termination",
        dueDate: new Date("2026-04-28T00:00:00Z"),
        notes: "Contract suggests 30 days written notice before termination action.",
        status: DeadlineStatus.UPCOMING,
        importance: Priority.HIGH
      },
      {
        caseId: legalCase.id,
        title: "Lawyer draft finalization",
        dueDate: new Date("2026-04-25T00:00:00Z"),
        notes: "Finalize legal notice and evidence bundle.",
        status: DeadlineStatus.UPCOMING,
        importance: Priority.MEDIUM,
        isAiDetected: false
      }
    ]
  });

  const draft = await prisma.draft.create({
    data: {
      caseId: legalCase.id,
      createdById: clientUser.id,
      verifiedById: lawyerUser.id,
      type: DraftType.LEGAL_NOTICE,
      title: "Legal notice for unpaid vendor obligations",
      currentContent:
        "This notice is issued regarding delayed payment obligations under the vendor agreement dated 1 February 2026. You are called upon to cure the breach within 7 days.",
      verificationStatus: VerificationStatus.VERIFIED
    }
  });

  await prisma.draftVersion.createMany({
    data: [
      {
        draftId: draft.id,
        createdById: clientUser.id,
        versionNumber: 1,
        content: "Initial AI-generated notice.",
        changeSummary: "System-generated initial draft"
      },
      {
        draftId: draft.id,
        createdById: lawyerUser.id,
        versionNumber: 2,
        content:
          "This notice is issued regarding delayed payment obligations under the vendor agreement dated 1 February 2026. You are called upon to cure the breach within 7 days.",
        changeSummary: "Lawyer refined remedies and deadline language"
      }
    ]
  });

  await prisma.comment.createMany({
    data: [
      {
        caseId: legalCase.id,
        authorId: lawyerUser.id,
        documentId: contractDoc.id,
        body: "Termination clause is usable, but the IP silence needs mention in the notice.",
        visibility: CommentVisibility.SHARED
      },
      {
        caseId: legalCase.id,
        authorId: clientUser.id,
        body: "I also have email proof of partial delivery and can upload it today.",
        visibility: CommentVisibility.SHARED
      }
    ]
  });

  await prisma.internalNote.create({
    data: {
      caseId: legalCase.id,
      authorId: lawyerUser.id,
      body:
        "Potential leverage point: combine delayed payment with service continuity risk and documented demand notice."
    }
  });

  await prisma.caseAssignment.create({
    data: {
      caseId: legalCase.id,
      lawyerProfileId: lawyerUser.lawyerProfile!.id,
      status: AssignmentStatus.PENDING,
      feeProposal: 45000,
      probability: 0.68,
      proposalNotes:
        "Good evidence quality. Strong notice-first strategy before escalation. Awaiting client approval to exchange contact details."
    }
  });

  await prisma.riskScore.createMany({
    data: [
      {
        caseId: legalCase.id,
        dimension: "evidence_strength",
        score: 71,
        label: "Moderately strong",
        rationale: "Contract and screenshot support the dispute narrative.",
        confidence: 0.81
      },
      {
        caseId: legalCase.id,
        dimension: "case_completeness",
        score: 74,
        label: "Mostly organized",
        rationale: "Core documents exist but invoice chain can still be improved.",
        confidence: 0.78
      }
    ]
  });

  const thread = await prisma.assistantThread.create({
    data: {
      createdById: clientUser.id,
      caseId: legalCase.id,
      title: "Vendor dispute guidance",
      scope: AssistantScope.CASE
    }
  });

  await prisma.assistantMessage.createMany({
    data: [
      {
        threadId: thread.id,
        role: MessageRole.USER,
        content: "Can I send a notice before filing a complaint?"
      },
      {
        threadId: thread.id,
        role: MessageRole.AI,
        content:
          "Based on the uploaded contract, a notice-first approach looks commercially sensible. The agreement contains a written notice structure, so preserving that sequence may strengthen your record before escalation.",
        confidence: 0.78,
        sources: ["Contract Act, 1872", "vendor-agreement.pdf"]
      }
    ]
  });

  const debate = await prisma.debateSession.create({
    data: {
      caseId: legalCase.id,
      lawyerId: lawyerUser.id,
      title: "Notice versus immediate complaint",
      status: DebateStatus.COMPLETED,
      startedAt: new Date("2026-04-20T09:00:00Z"),
      endsAt: new Date("2026-04-20T09:10:00Z"),
      outcomeProbability: 0.62,
      outcomeLabel: "Lawyer slightly ahead",
      evaluation:
        "The lawyer made the stronger procedural case by anchoring the argument in the contract's notice mechanism and evidentiary posture. The opposition raised urgency concerns but did not overcome the contractual notice structure."
    }
  });

  await prisma.debateTurn.createMany({
    data: [
      {
        sessionId: debate.id,
        speaker: MessageRole.USER,
        content: "The contract expressly allows notice before termination, so immediate escalation is premature.",
        roundNumber: 1
      },
      {
        sessionId: debate.id,
        speaker: MessageRole.AI,
        content: "The other side can argue repeated default and commercial loss justify faster escalation if prejudice is ongoing.",
        roundNumber: 1
      }
    ]
  });

  await prisma.activityLog.createMany({
    data: [
      {
        caseId: legalCase.id,
        actorId: clientUser.id,
        action: "CASE_CREATED",
        detail: "Client opened a new matter."
      },
      {
        caseId: legalCase.id,
        actorId: clientUser.id,
        action: "DOCUMENT_UPLOADED",
        detail: "Uploaded vendor-agreement.pdf"
      },
      {
        caseId: legalCase.id,
        actorId: clientUser.id,
        action: "LAWYER_REQUESTED",
        detail: "Client sent a request to Muneeb Qureshi."
      },
      {
        caseId: legalCase.id,
        actorId: lawyerUser.id,
        action: "PROPOSAL_SENT",
        detail: "Lawyer submitted fee and case assessment."
      }
    ]
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: clientUser.id,
        title: "Proposal received",
        body: "Muneeb Qureshi sent a proposal for your vendor dispute case.",
        kind: "proposal",
        link: `/client/cases/${legalCase.id}`
      },
      {
        userId: lawyerUser.id,
        title: "New case request",
        body: "Ayesha Khan shared a case for review.",
        kind: "request",
        link: `/lawyer/cases/${legalCase.id}`
      }
    ]
  });

  console.log("Seeded demo accounts:");
  console.log("Client  -> client@mizan.dev / demo12345");
  console.log("Lawyer  -> lawyer@mizan.dev / demo12345");
  console.log("Lawyer2 -> lawyer2@mizan.dev / demo12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
