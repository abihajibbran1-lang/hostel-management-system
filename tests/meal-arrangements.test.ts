import assert from "node:assert/strict";
import test from "node:test";
import { mealApprovalSchema, mealNoticeSchema, mealSlotSchema, mealWindowSchema, noticeDeadline, reservationDeadline } from "../src/business/modules/meals/arrangement-contract.ts";
import { mealArrangement } from "../src/app/api/meals/arrangement-handlers.ts";

const id = "10000000-0000-4000-8000-000000000001";
const slot = { date: "2027-01-01", mealType: "BREAKFAST" };
const base = "http://localhost";

test("reservation and notice cutoffs use Karachi time, including a year boundary", () => {
  assert.equal(reservationDeadline(slot.date)?.toISOString(), "2026-12-31T16:00:00.000Z");
  assert.equal(noticeDeadline(slot.date, "08:00")?.toISOString(), "2027-01-01T02:00:00.000Z");
  assert.equal(noticeDeadline(slot.date, "09:00")?.toISOString(), "2027-01-01T03:00:00.000Z");
  assert.equal(noticeDeadline(slot.date, "25:00"), null);
});

test("reservation, approval, notice and window contracts reject forged fields and malformed input", () => {
  assert.ok(!mealSlotSchema.safeParse({ ...slot, studentId: id, portionCount: 3 }).success);
  assert.ok(mealApprovalSchema.safeParse({ ...slot, studentId: id }).success);
  assert.ok(!mealApprovalSchema.safeParse({ ...slot, studentId: id, approvedBy: id }).success);
  assert.ok(!mealNoticeSchema.safeParse({ ...slot, requestId: id, explanation: "  " }).success);
  assert.ok(mealNoticeSchema.safeParse({ ...slot, requestId: id, explanation: "Class overlaps collection." }).success);
  assert.ok(!mealWindowSchema.safeParse({ mealType: "BREAKFAST", opensAt: "09:00", closesAt: "08:00" }).success);
  assert.ok(!mealWindowSchema.safeParse({ mealType: "LUNCH", opensAt: "25:00", closesAt: "26:00" }).success);
});

test("server rejects unauthenticated, wrong-role and cross-origin arrangement requests", async () => {
  const make = (role?: string, method = "POST", origin = base) => new Request(base + "/api/meals/reservations", {
    method, headers: { origin, ...(role ? { "x-auth-user-id": id, "x-auth-role": role } : {}) },
  });
  assert.equal((await mealArrangement(make(), "reservation")).status, 401);
  assert.equal((await mealArrangement(make("WARDEN"), "reservation")).status, 403);
  assert.equal((await mealArrangement(make("STUDENT"), "approval")).status, 403);
  assert.equal((await mealArrangement(make("STUDENT", "GET"), "KITCHEN_STAFF")).status, 403);
  assert.equal((await mealArrangement(make("WARDEN", "PATCH"), "window")).status, 403);
  assert.equal((await mealArrangement(make("MANAGER", "PATCH", "https://unrelated.example"), "window")).status, 403);
});
