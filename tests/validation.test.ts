import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

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
