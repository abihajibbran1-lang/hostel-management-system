export type OriginValidationResult = "same-origin" | "cross-origin" | "missing-origin";

export function validateRequestOrigin(request: Request): OriginValidationResult {
  const origin = request.headers.get("origin");

  if (!origin) {
    return "missing-origin";
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin
      ? "same-origin"
      : "cross-origin";
  } catch {
    return "cross-origin";
  }
}
