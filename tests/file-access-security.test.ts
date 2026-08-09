import assert from "node:assert/strict";
import {
  canReadDocumentFileRecord,
  canReadExportBundleRecord,
  isInactiveFileMetadata,
  resolveStoredLocalPath
} from "@/lib/secure-file-core";

const clientA = { id: "user-client-a", role: "CLIENT", clientProfile: { id: "client-a" }, lawyerProfile: null };
const clientB = { id: "user-client-b", role: "CLIENT", clientProfile: { id: "client-b" }, lawyerProfile: null };
const lawyerA = { id: "user-lawyer-a", role: "LAWYER", clientProfile: null, lawyerProfile: { id: "lawyer-a" } };
const lawyerB = { id: "user-lawyer-b", role: "LAWYER", clientProfile: null, lawyerProfile: { id: "lawyer-b" } };
const admin = { id: "user-admin", role: "ADMIN", clientProfile: null, lawyerProfile: null };

const clientCase = {
  id: "case-client-a",
  clientProfileId: "client-a",
  lawyerOwnerProfileId: null,
  origin: "CLIENT_SUBMITTED",
  acceptedLawyerProfileIds: ["lawyer-a"]
};

const lawyerPrivateCase = {
  id: "case-lawyer-private",
  clientProfileId: null,
  lawyerOwnerProfileId: "lawyer-a",
  origin: "LAWYER_CREATED"
};

const baseDocument = {
  uploadedById: "user-client-a",
  sourceType: "USER_UPLOAD",
  metadata: null,
  case: clientCase
};

function test(name: string, run: () => void) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("client cannot access another client's document", () => {
  assert.equal(canReadDocumentFileRecord(clientB, baseDocument), false);
});

test("owning client can access active document", () => {
  assert.equal(canReadDocumentFileRecord(clientA, baseDocument), true);
});

test("accepted lawyer can access assigned case document", () => {
  assert.equal(canReadDocumentFileRecord(lawyerA, baseDocument), true);
});

test("unassigned lawyer cannot access client case document", () => {
  assert.equal(canReadDocumentFileRecord(lawyerB, baseDocument), false);
});

test("lawyer can access own private lawyer-created case", () => {
  assert.equal(
    canReadDocumentFileRecord(lawyerA, {
      ...baseDocument,
      uploadedById: lawyerA.id,
      sourceType: "LAWYER_UPLOAD",
      case: lawyerPrivateCase
    }),
    true
  );
});

test("client cannot access lawyer-private document metadata", () => {
  assert.equal(
    canReadDocumentFileRecord(clientA, {
      ...baseDocument,
      metadata: { visibility: "LAWYER_PRIVATE" }
    }),
    false
  );
});

test("archived or deleted metadata blocks document access", () => {
  assert.equal(isInactiveFileMetadata({ archivedAt: new Date().toISOString() }), true);
  assert.equal(canReadDocumentFileRecord(admin, { ...baseDocument, metadata: { status: "DELETED" } }), false);
});

test("client cannot read export bundle that includes private notes", () => {
  assert.equal(
    canReadExportBundleRecord(clientA, {
      createdById: lawyerA.id,
      includePrivateNotes: true,
      metadata: null,
      case: clientCase
    }),
    false
  );
});

test("accepted lawyer can read active export bundle", () => {
  assert.equal(
    canReadExportBundleRecord(lawyerA, {
      createdById: clientA.id,
      includePrivateNotes: false,
      metadata: null,
      case: clientCase
    }),
    true
  );
});

test("path resolver rejects traversal and arbitrary absolute paths", () => {
  assert.throws(() => resolveStoredLocalPath("/uploads/../secret.txt"), /Forbidden/);
  assert.throws(() => resolveStoredLocalPath("C:/Windows/win.ini"), /Forbidden/);
});
