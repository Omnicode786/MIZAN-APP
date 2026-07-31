import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAccessibleCaseWhereForUser,
  canDeleteCaseForUser,
  canPermanentlyRemoveDocumentForUser
} from "@/lib/permission-rules";

const clientUser = {
  id: "user_client",
  role: "CLIENT",
  clientProfile: { id: "client_profile_1" },
  lawyerProfile: null
} as any;

const lawyerUser = {
  id: "user_lawyer",
  role: "LAWYER",
  clientProfile: null,
  lawyerProfile: { id: "lawyer_profile_1" }
} as any;

test("client case access is limited to owned client profile cases", () => {
  assert.deepEqual(buildAccessibleCaseWhereForUser(clientUser, "case_1"), {
    AND: [{ clientProfileId: "client_profile_1" }, { id: "case_1" }]
  });
});

test("lawyer case access includes accepted assignments and lawyer-owned private cases", () => {
  assert.deepEqual(buildAccessibleCaseWhereForUser(lawyerUser, "case_1"), {
    AND: [
      {
        OR: [
          { lawyerOwnerProfileId: "lawyer_profile_1" },
          {
            assignments: {
              some: {
                lawyerProfileId: "lawyer_profile_1",
                status: "ACCEPTED"
              }
            }
          }
        ]
      },
      { id: "case_1" }
    ]
  });
});

test("lawyers cannot delete client-submitted cases but can delete their own private cases", () => {
  assert.equal(
    canDeleteCaseForUser(lawyerUser, {
      clientProfileId: "client_profile_1",
      lawyerOwnerProfileId: null,
      origin: "CLIENT_SUBMITTED"
    }),
    false
  );

  assert.equal(
    canDeleteCaseForUser(lawyerUser, {
      clientProfileId: null,
      lawyerOwnerProfileId: "lawyer_profile_1",
      origin: "LAWYER_CREATED"
    }),
    true
  );
});

test("lawyers cannot permanently remove client evidence they did not upload", () => {
  assert.equal(
    canPermanentlyRemoveDocumentForUser(lawyerUser, {
      uploadedById: "client_user",
      sourceType: "USER_UPLOAD",
      case: {
        clientProfileId: "client_profile_1",
        lawyerOwnerProfileId: null,
        origin: "CLIENT_SUBMITTED"
      }
    }),
    false
  );

  assert.equal(
    canPermanentlyRemoveDocumentForUser(lawyerUser, {
      uploadedById: "user_lawyer",
      sourceType: "LAWYER_UPLOAD",
      case: {
        clientProfileId: "client_profile_1",
        lawyerOwnerProfileId: null,
        origin: "CLIENT_SUBMITTED"
      }
    }),
    true
  );
});
