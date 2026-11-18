import type { NextResponse } from "next/server.js";

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

export function getAuthenticationCookieOptions(
  isProduction = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  };
}

export function setAuthenticationCookie(
  response: NextResponse,
  token: string,
  isProduction?: boolean,
) {
  response.cookies.set(AUTH_COOKIE_NAME, token, getAuthenticationCookieOptions(isProduction));
}

export function clearAuthenticationCookie(response: NextResponse, isProduction?: boolean) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getAuthenticationCookieOptions(isProduction),
    maxAge: 0,
    expires: new Date(0),
  });
}
