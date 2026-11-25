import { UserRole } from "@prisma/client";
import type { NextResponse } from "next/server.js";
import { z } from "zod";

import { requireAuthorizedRole } from "../auth/auth-authorization.ts";
import type { AuthenticatedIdentity } from "../auth/jwt-service.ts";
import { RoomService } from "../schedules/room-service.ts";
import {
  apiAuthenticationFailed,
  apiNotFound,
  apiValidationError,
} from "../../../shared/api/response.ts";
import {
  complaintIdSchema,
  resolveComplaintSchema,
  updateUrgencySchema,
  wardenComplaintQueueQuerySchema,
  type WardenComplaintQueueQuery,
} from "./warden-complaint-contract.ts";
import {
  ComplaintRepository,
  type ComplaintListPage,
  type ComplaintRecord,
  type ComplaintScope,
} from "../../../data/repositories/complaints/complaint-repository.ts";

export type WardenComplaintStore = {
  listForWarden(query: WardenComplaintQueueQuery, scope: ComplaintScope): Promise<ComplaintListPage>;
  findForWarden(id: string, scope: ComplaintScope): Promise<ComplaintRecord | null>;
  transitionToInProgress(
    id: string,
    actorUserId: string,
    changedAt: Date,
    scope: ComplaintScope,
  ): Promise<ComplaintRecord | null>;
  resolveComplaint(
    id: string,
    actorUserId: string,
    outcome: string,
    changedAt: Date,
    scope: ComplaintScope,
  ): Promise<ComplaintRecord | null>;
  correctUrgency(
    id: string,
    actorUserId: string,
    urgencyFlag: boolean,
    reason: string,
    changedAt: Date,
    scope: ComplaintScope,
  ): Promise<ComplaintRecord | null>;
};

export type WardenComplaintResult<T> = T | NextResponse;

type AuthorizedWarden =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

function validationError(message: string): NextResponse {
  return apiValidationError(
    new z.ZodError([{ code: z.ZodIssueCode.custom, message, path: [] }]),
  );
}

function isTerminalStatus(status: string) {
  return status === "Resolved" || status === "Escalated";
}

async function getWardenScope(userId: string): Promise<ComplaintScope> {
  const intakeWardenId = process.env.COMPLAINT_INTAKE_WARDEN_ID?.trim().toLowerCase();
  return {
    houseIds: await new RoomService().listAssignedHouseIds(userId),
    intake: userId.toLowerCase() === intakeWardenId,
  };
}

export class WardenComplaintService {
  private readonly complaints: WardenComplaintStore;
  private readonly clock: () => Date;
  private readonly scopeFor: (userId: string) => Promise<ComplaintScope>;

  constructor(
    complaints: WardenComplaintStore = new ComplaintRepository(),
    clock: () => Date = () => new Date(),
    scopeFor: (userId: string) => Promise<ComplaintScope> = getWardenScope,
  ) {
    this.complaints = complaints;
    this.clock = clock;
    this.scopeFor = scopeFor;
  }

  private authorize(identity: AuthenticatedIdentity | null): AuthorizedWarden {
    if (!identity) {
      return { ok: false, response: apiAuthenticationFailed() };
    }

    const forbidden = requireAuthorizedRole(identity, [UserRole.WARDEN]);
    return forbidden
      ? { ok: false, response: forbidden }
      : { ok: true, userId: identity.userId };
  }

  async list(
    identity: AuthenticatedIdentity | null,
    query: unknown,
  ): Promise<WardenComplaintResult<ComplaintListPage>> {
    const warden = this.authorize(identity);
    if (!warden.ok) {
      return warden.response;
    }

    const parsed = wardenComplaintQueueQuerySchema.safeParse(query);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    return this.complaints.listForWarden(parsed.data, await this.scopeFor(warden.userId));
  }

  async get(
    identity: AuthenticatedIdentity | null,
    id: unknown,
  ): Promise<WardenComplaintResult<ComplaintRecord>> {
    const warden = this.authorize(identity);
    if (!warden.ok) {
      return warden.response;
    }

    const parsedId = complaintIdSchema.safeParse(id);
    if (!parsedId.success) {
      return apiValidationError(parsedId.error);
    }

    const complaint = await this.complaints.findForWarden(parsedId.data, await this.scopeFor(warden.userId));
    return complaint ?? apiNotFound();
  }

  async start(
    identity: AuthenticatedIdentity | null,
    id: unknown,
  ): Promise<WardenComplaintResult<ComplaintRecord>> {
    const warden = this.authorize(identity);
    if (!warden.ok) {
      return warden.response;
    }

    const parsedId = complaintIdSchema.safeParse(id);
    if (!parsedId.success) {
      return apiValidationError(parsedId.error);
    }

    const scope = await this.scopeFor(warden.userId);
    const current = await this.complaints.findForWarden(parsedId.data, scope);
    if (!current) {
      return apiNotFound();
    }
    if (current.status !== "Pending") {
      return validationError("Only a Pending complaint can be started.");
    }

    const updated = await this.complaints.transitionToInProgress(
      parsedId.data,
      warden.userId,
      this.clock(),
      scope,
    );

    return updated ?? validationError("The complaint changed before it could be started.");
  }

  async resolve(
    identity: AuthenticatedIdentity | null,
    id: unknown,
    input: unknown,
  ): Promise<WardenComplaintResult<ComplaintRecord>> {
    const warden = this.authorize(identity);
    if (!warden.ok) {
      return warden.response;
    }

    const parsedId = complaintIdSchema.safeParse(id);
    if (!parsedId.success) {
      return apiValidationError(parsedId.error);
    }

    const parsedInput = resolveComplaintSchema.safeParse(input);
    if (!parsedInput.success) {
      return apiValidationError(parsedInput.error);
    }

    const scope = await this.scopeFor(warden.userId);
    const current = await this.complaints.findForWarden(parsedId.data, scope);
    if (!current) {
      return apiNotFound();
    }
    if (current.status !== "In Progress") {
      return validationError(
        isTerminalStatus(current.status)
          ? "A resolved or escalated complaint cannot be changed."
          : "Only an In Progress complaint can be resolved.",
      );
    }

    const updated = await this.complaints.resolveComplaint(
      parsedId.data,
      warden.userId,
      parsedInput.data.outcome,
      this.clock(),
      scope,
    );

    return updated ?? validationError("The complaint changed before it could be resolved.");
  }

  async correctUrgency(
    identity: AuthenticatedIdentity | null,
    id: unknown,
    input: unknown,
  ): Promise<WardenComplaintResult<ComplaintRecord>> {
    const warden = this.authorize(identity);
    if (!warden.ok) {
      return warden.response;
    }

    const parsedId = complaintIdSchema.safeParse(id);
    if (!parsedId.success) {
      return apiValidationError(parsedId.error);
    }

    const parsedInput = updateUrgencySchema.safeParse(input);
    if (!parsedInput.success) {
      return apiValidationError(parsedInput.error);
    }

    const scope = await this.scopeFor(warden.userId);
    const current = await this.complaints.findForWarden(parsedId.data, scope);
    if (!current) {
      return apiNotFound();
    }
    if (isTerminalStatus(current.status)) {
      return validationError("A resolved or escalated complaint cannot be changed.");
    }
    if (current.urgencyFlag === parsedInput.data.urgencyFlag) {
      return validationError("The urgency flag already has the requested value.");
    }

    const updated = await this.complaints.correctUrgency(
      parsedId.data,
      warden.userId,
      parsedInput.data.urgencyFlag,
      parsedInput.data.reason,
      this.clock(),
      scope,
    );

    return updated ?? validationError("The complaint changed before urgency could be corrected.");
  }
}
