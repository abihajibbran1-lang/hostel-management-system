import assert from "node:assert/strict";
import test from "node:test";
import { portionAuditSchema, portionLogSchema } from "../src/business/modules/meals/portion-contract.ts";
import { portionRequest } from "../src/app/api/meals/portion-handlers.ts";

const id = "10000000-0000-4000-8000-000000000001";
const allocation = { date: "2026-11-28", mealType: "BREAKFAST", portionCount: 20, requestId: id };

test("allocations require positive whole servings and server-owned attribution", () => {
  assert.ok(portionLogSchema.safeParse(allocation).success);
  for (const portionCount of [0, -1, 1.5, 2_147_483_648]) {
    assert.equal(portionLogSchema.safeParse({ ...allocation, portionCount }).success, false);
  }
  assert.equal(portionLogSchema.safeParse({ ...allocation, loggedBy: id }).success, false);
});

test("audits allow zero observed portions and reject forged expected count and auditor", () => {
  assert.deepEqual(portionAuditSchema.parse({ observedPortions: 0, description: "  None available  " }),
    { observedPortions: 0, description: "None available" });
  assert.equal(portionAuditSchema.safeParse({ observedPortions: -1 }).success, false);
  assert.equal(portionAuditSchema.safeParse({ observedPortions: 0, expectedPortions: 1 }).success, false);
  assert.equal(portionAuditSchema.safeParse({ observedPortions: 0, recordedBy: id }).success, false);
});

test("portion endpoints enforce roles, same-origin writes and strict request schemas", async () => {
  const base = "http://localhost";
  function request(role?: string, body?: object, origin = base) {
    return new Request(base + "/api/meals", {
      method: body ? "POST" : "GET",
      headers: { origin, ...(role ? { "x-auth-user-id": id, "x-auth-role": role } : {}) },
      body: body && JSON.stringify(body),
    });
  }
  assert.equal((await portionRequest(request(), "warden-list")).status, 401);
  assert.equal((await portionRequest(request("STUDENT"), "kitchen-list")).status, 403);
  assert.equal((await portionRequest(request("MANAGER"), "warden-list")).status, 403);
  assert.equal((await portionRequest(request("KITCHEN_STAFF", { observedPortions: 0 }), "audit", id)).status, 403);
  assert.equal((await portionRequest(request("WARDEN", allocation), "log")).status, 403);
  assert.equal((await portionRequest(request("WARDEN", { observedPortions: 0 }, "https://elsewhere.example"), "audit", id)).status, 403);
  assert.equal((await portionRequest(request("WARDEN", { observedPortions: 0, recordedBy: id }), "audit", id)).status, 400);
});
