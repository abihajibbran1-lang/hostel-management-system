import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode = "VALIDATION_ERROR" | "INTERNAL_ERROR";

export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiValidationError(error: ZodError) {
  const body: ApiError = {
    error: {
      code: "VALIDATION_ERROR",
      message: "Request validation failed.",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
  };

  return NextResponse.json(body, { status: 400 });
}

export function apiInternalError() {
  const body: ApiError = {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    },
  };

  return NextResponse.json(body, { status: 500 });
}
