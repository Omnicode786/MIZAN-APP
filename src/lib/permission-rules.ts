import type { Prisma } from "@prisma/client";

type PermissionUser = {
  id?: string;
  role: "CLIENT" | "LAWYER" | "ADMIN" | string;
  clientProfile?: { id: string } | null;
  lawyerProfile?: { id: string } | null;
};

export function buildAccessibleCaseWhereForUser(user: PermissionUser, caseId?: string): Prisma.CaseWhereInput {
  const baseWhere: Prisma.CaseWhereInput =
    user.role === "ADMIN"
      ? {}
      : user.role === "LAWYER"
        ? {
            OR: [
              {
                lawyerOwnerProfileId: user.lawyerProfile?.id || "__NO_LAWYER_PROFILE__"
              },
              {
                assignments: {
                  some: {
                    lawyerProfileId: user.lawyerProfile?.id || "__NO_LAWYER_PROFILE__",
                    status: "ACCEPTED" as const
                  }
                }
              }
            ]
          }
        : {
            clientProfileId: user.clientProfile?.id || "__NO_CLIENT_PROFILE__"
          };

  if (!caseId) {
    return baseWhere;
  }

  return {
    AND: [baseWhere, { id: caseId }]
  };
}

export function canDeleteCaseForUser(
  user: PermissionUser,
  legalCase: {
    clientProfileId: string | null;
    lawyerOwnerProfileId?: string | null;
    origin?: string | null;
  }
) {
  if (user.role === "ADMIN") return true;
  if (user.role === "CLIENT") {
    return Boolean(user.clientProfile && legalCase.clientProfileId === user.clientProfile.id);
  }
  if (user.role === "LAWYER") {
    return Boolean(
      user.lawyerProfile &&
        legalCase.origin === "LAWYER_CREATED" &&
        legalCase.lawyerOwnerProfileId === user.lawyerProfile.id
    );
  }
  return false;
}

export function canPermanentlyRemoveDocumentForUser(
  user: PermissionUser,
  document: {
    uploadedById: string;
    sourceType: string;
    case: {
      clientProfileId: string | null;
      lawyerOwnerProfileId?: string | null;
      origin?: string | null;
    };
  }
) {
  if (user.role === "ADMIN") return true;
  if (user.role === "CLIENT") {
    return Boolean(user.clientProfile && document.case.clientProfileId === user.clientProfile.id);
  }
  if (user.role === "LAWYER") {
    const ownsPrivateCase =
      user.lawyerProfile &&
      document.case.origin === "LAWYER_CREATED" &&
      document.case.lawyerOwnerProfileId === user.lawyerProfile.id;
    const ownsLawyerUpload = document.uploadedById === user.id && document.sourceType === "LAWYER_UPLOAD";
    return Boolean(ownsPrivateCase || ownsLawyerUpload);
  }
  return false;
}
