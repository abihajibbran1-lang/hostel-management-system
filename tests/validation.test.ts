import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { apiValidationError } from "../src/shared/api/response.ts";
import { parseJsonBody } from "../src/shared/validation/parse-request.ts";

test("parseJsonBody rejects an invalid request body through Zod", async () => {
  const request = new Request("http://localhost/test", {
    method: "POST",
    body: JSON.stringify({ name: "" }),
    headers: { "content-type": "application/json" },
  });
  const schema = z.object({ name: z.string().min(1) });

  const result = await parseJsonBody(request, schema);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.path.join("."), "name");
  }
});

test("parseJsonBody rejects malformed JSON through Zod", async () => {
  const request = new Request("http://localhost/test", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" },
  });
  const schema = z.object({ name: z.string().min(1) });

  const result = await parseJsonBody(request, schema);

  assert.equal(result.success, false);
});

test("apiValidationError returns the standardized Zod validation response", async () => {
  const schema = z.object({ name: z.string().min(1) });
  const result = schema.safeParse({ name: "" });

  assert.equal(result.success, false);
  if (!result.success) {
    const response = apiValidationError(result.error);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body, {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }
});
