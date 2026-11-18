import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@prisma/client";

const JWT_ALGORITHM = "HS256";
const JWT_EXPIRY = "8h";
const JWT_SECRET_ENVIRONMENT_VARIABLE = "JWT_SECRET";
const MIN_JWT_SECRET_UTF8_BYTES = 32;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const userRoles = new Set(Object.values(UserRole));

export type AuthenticatedIdentity = {
  userId: string;
  role: UserRole;
};

function getConfiguredSigningSecret() {
  const secret = process.env[JWT_SECRET_ENVIRONMENT_VARIABLE];

  if (!secret) {
    throw new Error(`${JWT_SECRET_ENVIRONMENT_VARIABLE} must be configured.`);
  }

  return new TextEncoder().encode(secret);
}

function validateSigningSecret(signingSecret: Uint8Array) {
  if (signingSecret.byteLength < MIN_JWT_SECRET_UTF8_BYTES) {
    throw new Error(
      `${JWT_SECRET_ENVIRONMENT_VARIABLE} must be at least ${MIN_JWT_SECRET_UTF8_BYTES} UTF-8 bytes.`,
    );
  }

  return signingSecret;
}

function isCanonicalUserId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.has(value as UserRole);
}

export class JwtService {
  private readonly signingSecret: Uint8Array;

  constructor(signingSecret: Uint8Array = getConfiguredSigningSecret()) {
    this.signingSecret = validateSigningSecret(signingSecret);
  }

  async issue(identity: AuthenticatedIdentity) {
    if (!isCanonicalUserId(identity.userId)) {
      throw new Error("JWT identity userId must be a canonical UUID.");
    }

    if (!isUserRole(identity.role)) {
      throw new Error("JWT identity role must be an approved UserRole value.");
    }

    return new SignJWT({ role: identity.role })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setSubject(identity.userId)
      .setExpirationTime(JWT_EXPIRY)
      .sign(this.signingSecret);
  }

  async verify(token: string): Promise<AuthenticatedIdentity | null> {
    try {
      const { payload } = await jwtVerify(token, this.signingSecret, {
        algorithms: [JWT_ALGORITHM],
      });

      if (
        !isCanonicalUserId(payload.sub) ||
        !isUserRole(payload.role) ||
        typeof payload.exp !== "number"
      ) {
        return null;
      }

      return {
        userId: payload.sub,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }
}
