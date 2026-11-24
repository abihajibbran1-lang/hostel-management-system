import { UserRole } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server.js";

import type { AuthenticatedIdentity } from "../src/business/modules/auth/jwt-service.ts";
import type { WardenComplaintService } from "../src/business/modules/complaints/warden-complaint-service.ts";
import { decodeComplaintCursor } from "../src/business/modules/complaints/complaint-contract.ts";
import { apiNotFound } from "../src/shared/api/response.ts";
import * as collectionRoute from "../src/app/api/warden/complaints/route.ts";
import * as detailRoute from "../src/app/api/warden/complaints/[id]/route.ts";
import * as startRoute from "../src/app/api/warden/complaints/[id]/start/route.ts";
import * as resolveRoute from "../src/app/api/warden/complaints/[id]/resolve/route.ts";
import * as urgencyRoute from "../src/app/api/warden/complaints/[id]/urgency/route.ts";
import { createWardenComplaintListHandler } from "../src/app/api/warden/complaints/warden-complaint-collection-handler.ts";
import { createWardenComplaintGetHandler } from "../src/app/api/warden/complaints/[id]/warden-complaint-item-handler.ts";
import { createStartComplaintHandler } from "../src/app/api/warden/complaints/[id]/start/start-complaint-handler.ts";
import { createResolveComplaintHandler } from "../src/app/api/warden/complaints/[id]/resolve/resolve-complaint-handler.ts";
import { createCorrectUrgencyHandler } from "../src/app/api/warden/complaints/[id]/urgency/urgency-complaint-handler.ts";
import type { ComplaintRecord } from "../src/data/repositories/complaints/complaint-repository.ts";

const complaintId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";
const nextCursorId = "b1e6c2d4-3f5a-4c7b-9d21-6e8f0a1b2c3d";
const wardenId = "c4f2a5c9-7a6b-4e0d-9f31-2a8b5c6d7e90";
const origin = "https://hostel.example.test";
const wardenIdentity: AuthenticatedIdentity = { userId: wardenId, role: UserRole.WARDEN };

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

function makeRecord(overrides: Partial<ComplaintRecord> = {}): ComplaintRecord {
  return {
    id: complaintId,
    submittedBy: "2f8855bb-05bb-4f8e-aee1-7c6cab541748",
    category: "Water",
    roomNumber: "A-12",
    description: "Leaking tap",
    urgencyFlag: true,
    status: "Pending",
    outcome: null,
    submittedAt: new Date("2026-11-24T10:00:00.000Z"),
    createdAt: new Date("2026-11-24T10:00:00.000Z"),
    updatedAt: new Date("2026-11-24T10:00:00.000Z"),
    ...overrides,
  };
}

function request(
  path: string,
  options: {
    method?: string;
    userId?: string;
    role?: string;
    body?: unknown;
    requestOrigin?: string;
  } = {},
) {
  const {
    method = "GET",
    userId = wardenId,
    role = UserRole.WARDEN,
    body,
    requestOrigin,
  } = options;

  return new Request(`https://hostel.example.test${path}`, {
    method,
    headers: {
      ...(userId ? { "x-auth-user-id": userId } : {}),
      ...(role ? { "x-auth-role": role } : {}),
      ...(requestOrigin ? { origin: requestOrigin } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

test("warden list validates filters, passes verified identity and encodes next cursor", async () => {
  let receivedIdentity: AuthenticatedIdentity | null = null;
  let receivedQuery: unknown;
  const handler = createWardenComplaintListHandler({
    list: async (identity, query) => {
      receivedIdentity = identity;
      receivedQuery = query;
      return { complaints: [makeRecord()], nextCursor: nextCursorId };
    },
  } as Pick<WardenComplaintService, "list">);

  const response = await handler(
    request("/api/warden/complaints?status=In%20Progress&urgencyFlag=false&limit=5"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(receivedIdentity, wardenIdentity);
  assert.deepEqual(receivedQuery, {
    status: "In Progress",
    urgencyFlag: false,
    limit: 5,
    cursor: undefined,
  });
  assert.equal(body.data.complaints[0].status, "Pending");
  assert.equal(typeof body.data.nextCursor, "string");
  assert.equal(decodeComplaintCursor(body.data.nextCursor), nextCursorId);
});

test("warden list rejects unauthenticated, wrong-role and invalid requests", async () => {
  let calls = 0;
  const handler = createWardenComplaintListHandler({
    list: async () => {
      calls += 1;
      return { complaints: [] };
    },
  } as Pick<WardenComplaintService, "list">);

  const unauthenticated = await handler(request("/api/warden/complaints", { userId: "" }));
  const wrongRole = await handler(
    request("/api/warden/complaints", { role: UserRole.STUDENT }),
  );
  const invalidRole = await handler(request("/api/warden/complaints", { role: "INVALID" }));
  const invalidQuery = await handler(request("/api/warden/complaints?status=Closed"));

  assert.equal(unauthenticated.status, 401);
  assert.equal(wrongRole.status, 403);
  assert.equal(invalidRole.status, 403);
  assert.equal(invalidQuery.status, 400);
  assert.equal(calls, 0);
});

test("warden detail returns service records and passes service errors through", async () => {
  const successHandler = createWardenComplaintGetHandler({
    get: async (identity, id) => {
      assert.deepEqual(identity, wardenIdentity);
      assert.equal(id, complaintId);
      return makeRecord();
    },
  } as Pick<WardenComplaintService, "get">);
  const missingHandler = createWardenComplaintGetHandler({
    get: async () => apiNotFound(),
  } as Pick<WardenComplaintService, "get">);

  const success = await successHandler(
    request(`/api/warden/complaints/${complaintId}`),
    routeContext(complaintId),
  );
  const missing = await missingHandler(
    request(`/api/warden/complaints/${complaintId}`),
    routeContext(complaintId),
  );
  const invalid = await successHandler(
    request("/api/warden/complaints/not-a-uuid"),
    routeContext("not-a-uuid"),
  );

  assert.equal(success.status, 200);
  assert.equal((await success.json()).data.complaint.id, complaintId);
  assert.equal(missing.status, 404);
  assert.equal(invalid.status, 400);
  assert.equal(isResponse(success), true);
});

test("start route requires same-origin, validates ID and passes service errors", async () => {
  let receivedIdentity: AuthenticatedIdentity | null = null;
  const handler = createStartComplaintHandler({
    start: async (identity, id) => {
      receivedIdentity = identity;
      assert.equal(id, complaintId);
      return makeRecord({ status: "In Progress" });
    },
  } as Pick<WardenComplaintService, "start">);

  const missingOrigin = await handler(
    request(`/api/warden/complaints/${complaintId}/start`, { method: "POST" }),
    routeContext(complaintId),
  );
  const invalidId = await handler(
    request("/api/warden/complaints/bad/start", {
      method: "POST",
      requestOrigin: origin,
    }),
    routeContext("bad"),
  );
  const success = await handler(
    request(`/api/warden/complaints/${complaintId}/start`, {
      method: "POST",
      requestOrigin: origin,
    }),
    routeContext(complaintId),
  );

  assert.equal(missingOrigin.status, 403);
  assert.equal(invalidId.status, 400);
  assert.equal(success.status, 200);
  assert.equal((await success.json()).data.complaint.status, "In Progress");
  assert.deepEqual(receivedIdentity, wardenIdentity);

  const errorHandler = createStartComplaintHandler({
    start: async () => apiNotFound(),
  } as Pick<WardenComplaintService, "start">);
  const serviceError = await errorHandler(
    request(`/api/warden/complaints/${complaintId}/start`, {
      method: "POST",
      requestOrigin: origin,
    }),
    routeContext(complaintId),
  );
  assert.equal(serviceError.status, 404);
});

test("resolve route validates body, passes verified identity and returns service results", async () => {
  let receivedInput: unknown;
  const handler = createResolveComplaintHandler({
    resolve: async (identity, id, input) => {
      assert.deepEqual(identity, wardenIdentity);
      assert.equal(id, complaintId);
      receivedInput = input;
      return makeRecord({ status: "Resolved", outcome: "Tap repaired" });
    },
  } as Pick<WardenComplaintService, "resolve">);

  const success = await handler(
    request(`/api/warden/complaints/${complaintId}/resolve`, {
      method: "POST",
      requestOrigin: origin,
      body: { outcome: "  Tap repaired  " },
    }),
    routeContext(complaintId),
  );
  const invalidBody = await handler(
    request(`/api/warden/complaints/${complaintId}/resolve`, {
      method: "POST",
      requestOrigin: origin,
      body: { outcome: "   " },
    }),
    routeContext(complaintId),
  );
  const wrongRole = await handler(
    request(`/api/warden/complaints/${complaintId}/resolve`, {
      method: "POST",
      requestOrigin: origin,
      role: UserRole.STUDENT,
      body: { outcome: "Tap repaired" },
    }),
    routeContext(complaintId),
  );

  assert.equal(success.status, 200);
  assert.deepEqual(receivedInput, { outcome: "Tap repaired" });
  assert.equal((await success.json()).data.complaint.status, "Resolved");
  assert.equal(invalidBody.status, 400);
  assert.equal(wrongRole.status, 403);
});

test("urgency route validates body, requires same-origin and passes service errors", async () => {
  let receivedInput: unknown;
  const handler = createCorrectUrgencyHandler({
    correctUrgency: async (identity, id, input) => {
      assert.deepEqual(identity, wardenIdentity);
      assert.equal(id, complaintId);
      receivedInput = input;
      return makeRecord({ urgencyFlag: false });
    },
  } as Pick<WardenComplaintService, "correctUrgency">);

  const success = await handler(
    request(`/api/warden/complaints/${complaintId}/urgency`, {
      method: "PATCH",
      requestOrigin: origin,
      body: { urgencyFlag: false, reason: "Rechecked" },
    }),
    routeContext(complaintId),
  );
  const invalidBody = await handler(
    request(`/api/warden/complaints/${complaintId}/urgency`, {
      method: "PATCH",
      requestOrigin: origin,
      body: { urgencyFlag: "false", reason: "Rechecked" },
    }),
    routeContext(complaintId),
  );
  const missingOrigin = await handler(
    request(`/api/warden/complaints/${complaintId}/urgency`, {
      method: "PATCH",
      body: { urgencyFlag: false, reason: "Rechecked" },
    }),
    routeContext(complaintId),
  );

  assert.equal(success.status, 200);
  assert.deepEqual(receivedInput, { urgencyFlag: false, reason: "Rechecked" });
  assert.equal((await success.json()).data.complaint.urgencyFlag, false);
  assert.equal(invalidBody.status, 400);
  assert.equal(missingOrigin.status, 403);

  const errorHandler = createCorrectUrgencyHandler({
    correctUrgency: async () => apiNotFound(),
  } as Pick<WardenComplaintService, "correctUrgency">);
  const serviceError = await errorHandler(
    request(`/api/warden/complaints/${complaintId}/urgency`, {
      method: "PATCH",
      requestOrigin: origin,
      body: { urgencyFlag: false, reason: "Rechecked" },
    }),
    routeContext(complaintId),
  );
  assert.equal(serviceError.status, 404);
});

test("warden route modules expose only the approved HTTP methods", () => {
  assert.deepEqual(Object.keys(collectionRoute).sort(), ["GET"]);
  assert.deepEqual(Object.keys(detailRoute).sort(), ["GET"]);
  assert.deepEqual(Object.keys(startRoute).sort(), ["POST"]);
  assert.deepEqual(Object.keys(resolveRoute).sort(), ["POST"]);
  assert.deepEqual(Object.keys(urgencyRoute).sort(), ["PATCH"]);
});
