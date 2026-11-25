import assert from "node:assert/strict";
import test from "node:test";
import { GET, POST } from "../src/app/api/room-management/route.ts";

const endpoint = "http://localhost:3000/api/room-management";
const actor = "10000000-0000-4000-8000-000000000001";

test("room directory rejects anonymous and student requests before data access", async () => {
  assert.equal((await GET(new Request(endpoint)))?.status, 401);
  const student = new Request(endpoint, {
    headers: { "x-auth-user-id": actor, "x-auth-role": "STUDENT" },
  });
  assert.equal((await GET(student))?.status, 403);
});

test("a Warden cannot create a house, even with a valid request", async () => {
  const response = await POST(new Request(endpoint, {
    method: "POST",
    headers: { origin: new URL(endpoint).origin, "x-auth-user-id": actor, "x-auth-role": "WARDEN" },
    body: JSON.stringify({ action: "createHouse", name: "North" }),
  }));
  assert.equal(response?.status, 403);
});

test("a Manager cannot supply the assignment audit actor or bypass same-origin checks", async () => {
  for (const [origin, status] of [["https://elsewhere.test", 403], [new URL(endpoint).origin, 400]] as const) {
    const response = await POST(new Request(endpoint, {
      method: "POST",
      headers: { origin, "x-auth-user-id": actor, "x-auth-role": "MANAGER" },
      body: JSON.stringify({ action: "placeStudent", roomId: actor, userId: actor, assignedBy: actor }),
    }));
    assert.equal(response?.status, status);
  }
});
