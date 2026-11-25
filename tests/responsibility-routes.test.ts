import assert from "node:assert/strict";
import test from "node:test";
import { listResponsibilities, patchResponsibility, postResponsibility } from "../src/app/api/responsibilities/handlers.ts";

const endpoint = "http://localhost:3000/api/responsibilities";
const actor = "10000000-0000-4000-8000-000000000001";
const headers = { "x-auth-user-id": actor, "x-auth-role": "STUDENT", origin: "http://localhost:3000" };

test("the Warden assistance queue refuses anonymous and Student requests", async () => {
  assert.equal((await listResponsibilities(new Request(endpoint), true)).status, 401);
  assert.equal((await listResponsibilities(new Request(endpoint, { headers }), true)).status, 403);
});

test("duty creation rejects a client-supplied student ID", async () => {
  const request = new Request(endpoint, {
    method: "POST", headers,
    body: JSON.stringify({ action: "propose", title: "Tidy the room", description: "Wipe desks.",
      dueAt: "2026-12-01T12:00:00Z", studentUserId: actor }),
  });
  assert.equal((await postResponsibility(request)).status, 400);
});

test("duty mutation rejects cross-origin requests and Manager writes", async () => {
  for (const changed of [{ origin: "https://other.example" }, { "x-auth-role": "MANAGER" }]) {
    const request = new Request(endpoint, {
      method: "PATCH", headers: { ...headers, ...changed } as Record<string, string>,
      body: JSON.stringify({ action: "cancel" }),
    });
    assert.equal((await patchResponsibility(request, actor)).status, 403);
  }
});
