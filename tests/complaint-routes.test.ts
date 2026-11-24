import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";

import * as complaintItemRoutes from "../src/app/api/complaints/[id]/route.ts";
import * as complaintRoutes from "../src/app/api/complaints/route.ts";
import {
  createComplaintCreateHandler,
  createComplaintListHandler,
} from "../src/app/api/complaints/complaint-collection-handler.ts";
import { createComplaintGetHandler } from "../src/app/api/complaints/[id]/complaint-item-handler.ts";
import type { ComplaintService } from "../src/business/modules/complaints/complaint-service.ts";
import type { ComplaintRecord } from "../src/data/repositories/complaints/complaint-repository.ts";

const userA = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const userB = "9cf1f1b8-89a3-49d3-9e1d-e1e5c9b938f1";
const complaintId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";
const routeContext = { params: Promise.resolve({ id: complaintId }) };

function makeRecord(): ComplaintRecord {
  return {
    id: complaintId,
    submittedBy: userA,
    category: "Water",
    roomNumber: "A-12",
    description: "Leaking tap",
    urgencyFlag: true,
    status: "Pending",
    outcome: null,
    submittedAt: new Date("2026-11-24T10:00:00.000Z"),
    createdAt: new Date("2026-11-24T10:00:00.000Z"),
    updatedAt: new Date("2026-11-24T10:00:00.000Z"),
  };
}

function request(
  path: string,
  options: {
    method?: string;
    userId?: string;
    role?: string;
    body?: unknown;
    origin?: string;
  } = {},
) {
  const { method = "GET", userId = userA, role = UserRole.STUDENT, body, origin } = options;
  return new Request(`https://hostel.example.test${path}`, {
    method,
    headers: {
      ...(userId ? { "x-auth-user-id": userId } : {}),
      ...(role ? { "x-auth-role": role } : {}),
      ...(origin ? { origin } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const validBody = {
  category: "Water",
  roomNumber: " A-12 ",
  description: "Leaking tap",
  urgencyFlag: true,
};

test("list returns only the verified owner's complaints using opaque cursors", async () => {
  let receivedOwner: string | undefined;
  const handler = createComplaintListHandler({
    listForOwner: async (ownerId) => {
      receivedOwner = ownerId;
      return { complaints: [makeRecord()], nextCursor: "id-2" };
    },
    create: async () => makeRecord(),
  } as Pick<ComplaintService, "listForOwner" | "create">);

  const response = await handler(request("/api/complaints?limit=5"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedOwner, userA);
  assert.equal(body.data.complaints[0].status, "Pending");
  assert.equal(body.data.complaints[0].trackingReference, complaintId);
  assert.equal(typeof body.data.nextCursor, "string");
});

test("list rejects unauthenticated, non-Student and invalid query requests", async () => {
  let calls = 0;
  const handler = createComplaintListHandler({
    listForOwner: async () => {
      calls += 1;
      return { complaints: [] };
    },
    create: async () => makeRecord(),
  } as Pick<ComplaintService, "listForOwner" | "create">);

  const unauthenticated = await handler(request("/api/complaints", { userId: "" }));
  const wrongRole = await handler(request("/api/complaints", { role: UserRole.WARDEN }));
  const invalidQuery = await handler(request("/api/complaints?limit=0"));

  assert.equal(unauthenticated.status, 401);
  assert.equal(wrongRole.status, 403);
  assert.equal(invalidQuery.status, 400);
  assert.equal(calls, 0);
});

test("create uses verified identity and returns a tracking reference", async () => {
  let receivedUserId: string | undefined;
  let receivedBody: unknown;
  const handler = createComplaintCreateHandler({
    create: async (userId, input) => {
      receivedUserId = userId;
      receivedBody = input;
      return makeRecord();
    },
    listForOwner: async () => ({ complaints: [] }),
  } as Pick<ComplaintService, "create" | "listForOwner">);

  const response = await handler(
    request("/api/complaints", {
      method: "POST",
      origin: "https://hostel.example.test",
      body: validBody,
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(receivedUserId, userA);
  assert.deepEqual(receivedBody, {
    category: "Water",
    roomNumber: "A-12",
    description: "Leaking tap",
    urgencyFlag: true,
  });
  assert.equal(body.data.trackingReference, complaintId);
  assert.equal(body.data.complaint.status, "Pending");
});

test("create rejects missing Origin, invalid fields and forged owner fields", async () => {
  let calls = 0;
  const handler = createComplaintCreateHandler({
    create: async () => {
      calls += 1;
      return makeRecord();
    },
    listForOwner: async () => ({ complaints: [] }),
  } as Pick<ComplaintService, "create" | "listForOwner">);

  const missingOrigin = await handler(
    request("/api/complaints", { method: "POST", body: validBody }),
  );
  const invalidBody = await handler(
    request("/api/complaints", {
      method: "POST",
      origin: "https://hostel.example.test",
      body: { ...validBody, category: "Fire" },
    }),
  );
  const forgedOwner = await handler(
    request("/api/complaints", {
      method: "POST",
      origin: "https://hostel.example.test",
      body: { ...validBody, submittedBy: userB },
    }),
  );

  assert.equal(missingOrigin.status, 403);
  assert.equal(invalidBody.status, 400);
  assert.equal(forgedOwner.status, 400);
  assert.equal(calls, 0);
});

test("detail returns the owner's record and hides foreign or invalid IDs", async () => {
  const handler = createComplaintGetHandler({
    getOwned: async (userId, id) =>
      userId === userA && id === complaintId ? makeRecord() : null,
  } as Pick<ComplaintService, "getOwned">);

  const ownerResponse = await handler(request(`/api/complaints/${complaintId}`), routeContext);
  const foreignResponse = await handler(request(`/api/complaints/${complaintId}`, { userId: userB }), routeContext);
  const invalidResponse = await handler(
    request("/api/complaints/not-a-uuid"),
    { params: Promise.resolve({ id: "not-a-uuid" }) },
  );

  assert.equal(ownerResponse.status, 200);
  assert.equal((await ownerResponse.json()).data.complaint.id, complaintId);
  assert.equal(foreignResponse.status, 404);
  assert.equal(invalidResponse.status, 400);
});

test("complaint routes expose only the approved HTTP methods", () => {
  assert.deepEqual(Object.keys(complaintRoutes).sort(), ["GET", "POST"]);
  assert.deepEqual(Object.keys(complaintItemRoutes).sort(), ["GET"]);
});
