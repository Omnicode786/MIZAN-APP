import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  caseId: z.string(),
  title: z.string().min(2),
  dueDate: z.string(),
  notes: z.string().optional(),
  importance: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM")
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(2).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  importance: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["UPCOMING", "OVERDUE", "COMPLETED"]).optional()
});

const deleteSchema = z.object({ id: z.string() });

export async function POST(request: Request) {
  const user = await requireUser();
  const body = createSchema.parse(await request.json());
  const { legalCase } = await getAccessibleCase(body.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const deadline = await prisma.deadline.create({
    data: {
      caseId: body.caseId,
      title: body.title,
      dueDate: new Date(body.dueDate),
      notes: body.notes,
      isAiDetected: false,
      importance: body.importance
    }
  });

  await prisma.timelineEvent.create({
    data: {
      caseId: body.caseId,
      title: `Deadline added: ${body.title}`,
      description: body.notes || "Manual deadline added to the case.",
      eventDate: new Date(body.dueDate),
      confidence: 1,
      sourceLabel: "system",
      isAiGenerated: false
    }
  });

  await logActivity(body.caseId, user.id, "DEADLINE_ADDED", `Added deadline ${body.title}.`);
  return NextResponse.json({ deadline });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  const body = updateSchema.parse(await request.json());
  const existing = await prisma.deadline.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ error: "Deadline not found." }, { status: 404 });
  const { legalCase } = await getAccessibleCase(existing.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const deadline = await prisma.deadline.update({
    where: { id: body.id },
    data: {
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      notes: body.notes,
      importance: body.importance,
      status: body.status
    }
  });
  await logActivity(existing.caseId, user.id, "DEADLINE_UPDATED", `Updated deadline ${deadline.title}.`);
  return NextResponse.json({ deadline });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = deleteSchema.parse(await request.json());
  const existing = await prisma.deadline.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ error: "Deadline not found." }, { status: 404 });
  const { legalCase } = await getAccessibleCase(existing.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  await prisma.deadline.delete({ where: { id: body.id } });
  await logActivity(existing.caseId, user.id, "DEADLINE_DELETED", `Deleted deadline ${existing.title}.`);
  return NextResponse.json({ ok: true });
}
