import assert from "node:assert/strict";
import test from "node:test";

import { encodeComplaintCursor } from "../src/business/modules/complaints/complaint-contract.ts";
import {
  complaintIdSchema,
  resolveComplaintSchema,
  updateUrgencySchema,
  wardenComplaintQueueQuerySchema,
} from "../src/business/modules/complaints/warden-complaint-contract.ts";

const complaintId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";

test("warden queue query uses S06 defaults and accepts approved filters", () => {
  const defaults = wardenComplaintQueueQuerySchema.parse({});
  assert.equal(defaults.limit, 20);
  assert.equal(defaults.cursor, undefined);
  assert.equal(defaults.status, undefined);
  assert.equal(defaults.urgencyFlag, undefined);

  const parsed = wardenComplaintQueueQuerySchema.parse({
    status: "In Progress",
    urgencyFlag: "false",
    limit: "5",
    cursor: encodeComplaintCursor(complaintId),
  });

  assert.equal(parsed.status, "In Progress");
  assert.equal(parsed.urgencyFlag, false);
  assert.equal(parsed.limit, 5);
  assert.equal(parsed.cursor, complaintId);
});

test("warden queue query rejects invalid filters, limits and cursors", () => {
  assert.equal(wardenComplaintQueueQuerySchema.safeParse({ status: "Closed" }).success, false);
  assert.equal(wardenComplaintQueueQuerySchema.safeParse({ status: "Fire" }).success, false);
  assert.equal(wardenComplaintQueueQuerySchema.safeParse({ urgencyFlag: "yes" }).success, false);
  assert.equal(wardenComplaintQueueQuerySchema.safeParse({ urgencyFlag: "False" }).success, false);
  assert.equal(wardenComplaintQueueQuerySchema.safeParse({ limit: "0" }).success, false);
  assert.equal(wardenComplaintQueueQuerySchema.safeParse({ limit: "101" }).success, false);
  assert.equal(wardenComplaintQueueQuerySchema.safeParse({ cursor: "bad" }).success, false);
});

test("warden complaint ID uses the S06 UUID convention", () => {
  assert.equal(complaintIdSchema.safeParse(complaintId).success, true);
  assert.equal(complaintIdSchema.safeParse("not-a-uuid").success, false);
});

test("resolve input requires a trimmed non-empty outcome without inventing a length limit", () => {
  const parsed = resolveComplaintSchema.parse({ outcome: "  Leaking tap repaired.  " });
  assert.equal(parsed.outcome, "Leaking tap repaired.");

  const longOutcome = "x".repeat(5_000);
  assert.equal(resolveComplaintSchema.parse({ outcome: longOutcome }).outcome, longOutcome);

  assert.equal(resolveComplaintSchema.safeParse({ outcome: "   " }).success, false);
  assert.equal(resolveComplaintSchema.safeParse({}).success, false);
  assert.equal(
    resolveComplaintSchema.safeParse({ outcome: "Done", changedBy: "someone" }).success,
    false,
  );
});

test("urgency correction requires a boolean and trimmed non-empty reason", () => {
  const parsed = updateUrgencySchema.parse({
    urgencyFlag: false,
    reason: "  Downgraded after recheck.  ",
  });
  assert.equal(parsed.urgencyFlag, false);
  assert.equal(parsed.reason, "Downgraded after recheck.");

  assert.equal(updateUrgencySchema.safeParse({ urgencyFlag: true, reason: " " }).success, false);
  assert.equal(updateUrgencySchema.safeParse({ urgencyFlag: "true", reason: "Rechecked" }).success, false);
  assert.equal(updateUrgencySchema.safeParse({ reason: "Rechecked" }).success, false);
  assert.equal(
    updateUrgencySchema.safeParse({ urgencyFlag: true, reason: "Rechecked", status: "Resolved" }).success,
    false,
  );
});
