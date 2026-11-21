import assert from "node:assert/strict";
import test from "node:test";

import {
  getKarachiDayBounds,
  karachiDateTimeToUtc,
  utcToKarachiDateTime,
} from "../src/business/modules/schedules/personal-schedule-time.ts";

test("converts an Asia/Karachi date to the correct half-open UTC day interval", () => {
  const bounds = getKarachiDayBounds("2026-02-01");

  assert.equal(bounds.startAt.toISOString(), "2026-01-31T19:00:00.000Z");
  assert.equal(bounds.endAt.toISOString(), "2026-02-01T19:00:00.000Z");
});

test("uses the next local calendar midnight for leap day boundaries", () => {
  const bounds = getKarachiDayBounds("2024-02-29");

  assert.equal(bounds.startAt.toISOString(), "2024-02-28T19:00:00.000Z");
  assert.equal(bounds.endAt.toISOString(), "2024-02-29T19:00:00.000Z");
});

test("finds the first valid local instant when Karachi skips midnight", () => {
  const bounds = getKarachiDayBounds("2008-06-01");

  assert.equal(bounds.startAt.toISOString(), "2008-05-31T19:00:00.000Z");
  assert.equal(bounds.endAt.toISOString(), "2008-06-01T18:00:00.000Z");
  assert.equal(bounds.endAt.getTime() - bounds.startAt.getTime(), 23 * 60 * 60 * 1_000);
});

test("preserves a 25-hour half-open interval across Karachi's historical clock rollback", () => {
  const bounds = getKarachiDayBounds("2002-10-05");

  assert.equal(bounds.startAt.toISOString(), "2002-10-04T18:00:00.000Z");
  assert.equal(bounds.endAt.toISOString(), "2002-10-05T19:00:00.000Z");
  assert.equal(bounds.endAt.getTime() - bounds.startAt.getTime(), 25 * 60 * 60 * 1_000);
});

test("converts Karachi-local input to UTC and displays the same local time", () => {
  const instant = karachiDateTimeToUtc("2026-02-01T09:30");

  assert.equal(instant?.toISOString(), "2026-02-01T04:30:00.000Z");
  assert.equal(utcToKarachiDateTime(instant!), "2026-02-01T09:30");
});

test("handles local midnight and rejects impossible local date-time values", () => {
  assert.equal(
    karachiDateTimeToUtc("2026-02-01T00:00")?.toISOString(),
    "2026-01-31T19:00:00.000Z",
  );
  assert.equal(karachiDateTimeToUtc("2026-02-30T10:00"), null);
  assert.equal(karachiDateTimeToUtc("2026-02-01T24:00"), null);
});
