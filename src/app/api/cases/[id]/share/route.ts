import { NextResponse } from "next/server";
import { z } from "zod";
import { createNotification, getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  lawyerProfileId: z.string()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user.role !== "CLIENT") {
    return NextResponse.json({ error: "Only clients can request a lawyer." }, { status: 403 });
  }

  const { legalCase } = await getAccessibleCase(params.id);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const body = schema.parse(await request.json());
  const lawyer = await prisma.lawyerProfile.findUnique({
    where: { id: body.lawyerProfileId },
    include: { user: true }
  });
  if (!lawyer || !lawyer.isPublic) {
    return NextResponse.json({ error: "Lawyer profile not found." }, { status: 404 });
  }

  const assignment = await prisma.caseAssignment.upsert({
    where: {
      caseId_lawyerProfileId: {
        caseId: params.id,
        lawyerProfileId: body.lawyerProfileId
      }
    },
    update: {
      status: "PENDING"
    },
    create: {
      caseId: params.id,
      lawyerProfileId: body.lawyerProfileId,
      status: "PENDING"
    },
    include: { lawyer: { include: { user: true } } }
  });

  await prisma.case.update({
    where: { id: params.id },
    data: {
      lawyerRequestedAt: new Date(),
      stage: "Lawyer review requested"
    }
  });

  await prisma.timelineEvent.create({
    data: {
      caseId: params.id,
      title: `Lawyer requested: ${lawyer.user.name}`,
      description: "Client shared the case for proposal review.",
      eventDate: new Date(),
      confidence: 1,
      sourceLabel: "system",
      isAiGenerated: false
    }
  });

  await logActivity(params.id, user.id, "LAWYER_REQUESTED", `Requested ${lawyer.user.name} for this case.`);
  await createNotification(
    lawyer.userId,
    "New case request",
    `${legalCase.client.user.name} requested your review for ${legalCase.title}.`,
    "case_request",
    `/lawyer/cases/${params.id}`
  );

  return NextResponse.json({ assignment });
}
