import { z } from "zod";

export const HOSTEL_TIME_ZONE = "Asia/Karachi";

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const millisecondsPerHour = 60 * 60 * 1_000;

const karachiDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: HOSTEL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getDateTimeParts(date: Date): DateTimeParts {
  const parts = karachiDateTimeFormatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second")),
  };
}

function isCalendarDate(value: string) {
  if (!localDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getKarachiCalendarDate(epochMilliseconds: number) {
  const parts = getDateTimeParts(new Date(epochMilliseconds));

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

function findFirstUtcMillisecondOfKarachiDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const nominalUtcMidnight = Date.UTC(year, month - 1, day);
  let lowerBound = nominalUtcMidnight - 48 * millisecondsPerHour;
  let upperBound = nominalUtcMidnight + 48 * millisecondsPerHour;

  if (getKarachiCalendarDate(lowerBound) >= value || getKarachiCalendarDate(upperBound) < value) {
    throw new RangeError("Could not find the Karachi calendar-date boundary.");
  }

  // The local calendar date is monotonic across Karachi's clock changes. Searching
  // epoch milliseconds finds the first instant even when the clock jumps over 00:00.
  while (lowerBound < upperBound) {
    const midpoint = lowerBound + Math.floor((upperBound - lowerBound) / 2);

    if (getKarachiCalendarDate(midpoint) >= value) {
      upperBound = midpoint;
    } else {
      lowerBound = midpoint + 1;
    }
  }

  if (getKarachiCalendarDate(lowerBound) !== value) {
    throw new RangeError(`The Karachi calendar date ${value} does not exist.`);
  }

  return new Date(lowerBound);
}

export const karachiLocalDateSchema = z
  .string()
  .refine(isCalendarDate, "Date must be a valid YYYY-MM-DD calendar date.");

function localDateTimeToUtc(value: string) {
  if (!localDateTimePattern.test(value)) {
    return null;
  }

  const [datePart, timePart] = value.split("T");
  if (!isCalendarDate(datePart)) {
    return null;
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if (hour > 23 || minute > 59) {
    return null;
  }

  const targetWallTime = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetWallTime;

  // Resolve the IANA zone offset for this date instead of assuming a fixed UTC offset.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getDateTimeParts(new Date(candidate));
    const observedWallTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const adjusted = targetWallTime - (observedWallTime - candidate);

    if (adjusted === candidate) {
      return new Date(candidate);
    }

    candidate = adjusted;
  }

  const resolved = getDateTimeParts(new Date(candidate));
  return resolved.year === year &&
    resolved.month === month &&
    resolved.day === day &&
    resolved.hour === hour &&
    resolved.minute === minute
    ? new Date(candidate)
    : null;
}

export function karachiDateTimeToUtc(value: string) {
  return localDateTimeToUtc(value);
}

export function utcToKarachiDateTime(value: string | Date) {
  const parts = getDateTimeParts(value instanceof Date ? value : new Date(value));

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function formatKarachiDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: HOSTEL_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value instanceof Date ? value : new Date(value));
}

function nextCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));

  return `${String(next.getUTCFullYear()).padStart(4, "0")}-${String(next.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function getKarachiDayBounds(value: string) {
  const date = karachiLocalDateSchema.parse(value);
  const startAt = findFirstUtcMillisecondOfKarachiDate(date);
  const endAt = findFirstUtcMillisecondOfKarachiDate(nextCalendarDate(date));

  return { startAt, endAt };
}
