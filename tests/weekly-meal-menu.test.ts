import assert from "node:assert/strict";
import test from "node:test";
import { createMenuSchema, editMenuSchema, menuDateSchema, menuWeekDates, menuWeekStart, toMenuDate } from "../src/business/modules/meals/menu-contract.ts";
import { validateMenuSlots } from "../src/business/modules/meals/menu-service.ts";
import { kitchenMenu, mutateMenu, studentMenu } from "../src/app/api/meals/menu-handlers.ts";

const monday = "2026-12-28";
const slot = { date: monday, mealType: "BREAKFAST" as const, name: "Omelette" };
const base = "http://localhost";
const id = "10000000-0000-4000-8000-000000000001";
const headers = (role: string) => ({ "x-auth-user-id": id, "x-auth-role": role, origin: base });

test("menu dates use Monday to Sunday across year boundaries and reject impossible dates", () => {
  assert.equal(menuWeekStart(toMenuDate("2027-01-03")).toISOString(), "2026-12-28T00:00:00.000Z");
  assert.equal(menuWeekDates(monday).at(-1), "2027-01-03");
  assert.ok(createMenuSchema.safeParse({ weekStart: monday }).success);
  assert.ok(!createMenuSchema.safeParse({ weekStart: "2027-01-03" }).success);
  assert.ok(!menuDateSchema.safeParse("2026-02-29").success);
});

test("menu edits reject blank names, invalid meal types, duplicate slots and out-of-week items", () => {
  assert.ok(editMenuSchema.safeParse({ items: [slot] }).success);
  assert.ok(!editMenuSchema.safeParse({ items: [{ ...slot, name: "  " }] }).success);
  assert.ok(!editMenuSchema.safeParse({ items: [{ ...slot, mealType: "SNACK" }] }).success);
  assert.ok(!editMenuSchema.safeParse({ items: [slot, { ...slot, name: "Paratha" }] }).success);
  assert.throws(() => validateMenuSlots(monday, [{ ...slot, date: "2027-01-04" }]), /selected week/);
});

test("Students cannot read kitchen drafts, create menus, edit or publish", async () => {
  const context = { headers: headers("STUDENT") };
  assert.equal((await kitchenMenu(new Request(`${base}/api/meals/menus?weekStart=${monday}`, context))).status, 403);
  assert.equal((await kitchenMenu(new Request(`${base}/api/meals/menus`, { ...context, method: "POST" }))).status, 403);
  for (const [method, action] of [["PATCH", "edit"], ["POST", "publish"]] as const) {
    const response = await mutateMenu(new Request(`${base}/api/meals/menus/${id}`, { ...context, method }), id, action);
    assert.equal(response.status, 403);
  }
});

test("menu handlers reject anonymous student reads, other roles, cross-origin and forged creator writes", async () => {
  const url = `${base}/api/meals/menu?date=${monday}`;
  assert.equal((await studentMenu(new Request(url))).status, 401);
  for (const role of ["WARDEN", "MANAGER", "KITCHEN_STAFF"]) {
    assert.equal((await studentMenu(new Request(url, { headers: headers(role) }))).status, 403);
  }
  const create = `${base}/api/meals/menus`;
  assert.equal((await kitchenMenu(new Request(create, {
    method: "POST", headers: { ...headers("KITCHEN_STAFF"), origin: "https://unrelated.example" },
  }))).status, 403);
  assert.equal((await kitchenMenu(new Request(create, {
    method: "POST", headers: headers("KITCHEN_STAFF"), body: JSON.stringify({ weekStart: monday, createdBy: id }),
  }))).status, 400);
});
