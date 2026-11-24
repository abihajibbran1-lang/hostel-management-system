import assert from "node:assert/strict";
import test from "node:test";

import {
  complaintCursorQuerySchema,
  complaintIdSchema,
  createComplaintSchema,
  decodeComplaintCursor,
  encodeComplaintCursor,
} from "../src/business/modules/complaints/complaint-contract.ts";

const validComplaint = {
  category: "Water",
  roomNumber: " A-12 ",
  description: "  Leaking tap  ",
  urgencyFlag: true,
};

test("valid complaint trims text and rejects unexpected fields", () => {
  const parsed = createComplaintSchema.parse(validComplaint);

  assert.equal(parsed.category, "Water");
  assert.equal(parsed.roomNumber, "A-12");
  assert.equal(parsed.description, "Leaking tap");
  assert.equal(parsed.urgencyFlag, true);
  assert.equal(
    createComplaintSchema.safeParse({ ...validComplaint, status: "Resolved" }).success,
    false,
  );
});

test("invalid category, room number, description or urgency is rejected", () => {
  assert.equal(createComplaintSchema.safeParse({ ...validComplaint, category: "Fire" }).success, false);
  assert.equal(createComplaintSchema.safeParse({ ...validComplaint, roomNumber: "A_12" }).success, false);
  assert.equal(createComplaintSchema.safeParse({ ...validComplaint, roomNumber: "   " }).success, false);
  assert.equal(createComplaintSchema.safeParse({ ...validComplaint, roomNumber: "A".repeat(31) }).success, false);
  assert.equal(createComplaintSchema.safeParse({ ...validComplaint, description: "" }).success, false);
  assert.equal(
    createComplaintSchema.safeParse({
      category: "Water",
      roomNumber: "A-1",
      description: "Leak",
    }).success,
    false,
  );
});

test("opaque cursor round trips and invalid cursors are rejected", () => {
  const id = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";
  const cursor = encodeComplaintCursor(id);

  assert.equal(decodeComplaintCursor(cursor), id);
  assert.equal(decodeComplaintCursor("not-a-cursor"), undefined);
  assert.equal(complaintIdSchema.safeParse(id).success, true);

  const parsed = complaintCursorQuerySchema.safeParse({ limit: "5", cursor });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.limit, 5);
    assert.equal(parsed.data.cursor, id);
  }

  assert.equal(complaintCursorQuerySchema.safeParse({ limit: "0" }).success, false);
  assert.equal(complaintCursorQuerySchema.safeParse({ cursor: "bad" }).success, false);
});
