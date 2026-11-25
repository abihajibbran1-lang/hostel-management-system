import type { Prisma } from "@prisma/client";
import type { AuthenticatedIdentity } from "../auth/jwt-service.ts";
import { AuthUserRepository } from "../../../data/repositories/auth/auth-user-repository.ts";
import { AuthService } from "../auth/auth-service.ts";
import { NotificationService } from "../../notifications/notification-service.ts";
import { RoomRepository } from "../../../data/repositories/schedules/room-repository.ts";
import { RoomService } from "./room-service.ts";
import {
  type Duty, listDuties, lockDuty, withDutyTransaction, findReminderCandidates, findAssignmentDutyId, findUnfinishedTransferDuties,
  findIncompleteTimeoutCandidates,
} from "../../../data/repositories/schedules/responsibility-repository.ts";
import type { ResponsibilityCommand, ResponsibilityCreate } from "./responsibility-contract.ts";

export class DutyError extends Error {
  readonly status: 400 | 403 | 404;
  constructor(status: DutyError["status"], message: string) {
    super(message);
    this.status = status;
  }
}

function requireDuty(condition: unknown, message: string, status: DutyError["status"] = 400): asserts condition {
  if (!condition) throw new DutyError(status, message);
}

function roomService(client?: Prisma.TransactionClient) {
  const rooms = new RoomRepository(client);
  return new RoomService(rooms, new AuthService(new AuthUserRepository(client)));
}

const terminal = (duty: Duty) => duty.status === "CANCELLED" || duty.status === "COMPLETED";
const currentAssignments = (duty: Duty) => duty.assignments.filter(({ status }) => status !== "WITHDRAWN");
const participants = (duty: Duty) => [...new Set([duty.createdByUserId, ...currentAssignments(duty).map(({ studentUserId }) => studentUserId)])];

async function notify(
  client: Prisma.TransactionClient, dutyId: string, recipients: string[], event: string,
  title: string, type = "responsibility_update",
) {
  const inbox = new NotificationService();
  for (const recipientUserId of new Set(recipients)) {
    await inbox.dispatchInTransaction(client, {
      recipientUserId, type, title, message: "Open Shared Responsibilities for details.",
      relatedModule: "schedules", relatedEntityId: dutyId,
      deduplicationKey: `responsibility:${dutyId}:${event}:${recipientUserId}`,
    });
  }
}

async function dutyRecipients(client: Prisma.TransactionClient, houseId: string) {
  // Read the authoritative house/primary assignment through the Room service.
  const primary = await roomService(client).getActivePrimaryWarden(houseId);
  return primary ? [primary] : new AuthUserRepository(client).listActiveManagerIds();
}

function present(duty: Duty, actor: AuthenticatedIdentity, writable: boolean) {
  return {
    id: duty.id, roomId: duty.roomId, title: duty.title, description: duty.description,
    dueAt: duty.dueAt, acceptanceDeadline: duty.acceptanceDeadline, status: duty.status,
    distributed: Boolean(duty.distributedAt), needsRedistribution: duty.needsRedistribution,
    writable, isCreator: duty.createdByUserId === actor.userId,
    assignments: duty.assignments
      .filter((part) => actor.role !== "STUDENT" || part.studentUserId === actor.userId)
      .map(({ id, studentUserId, status, lastReminderAt }) => ({ id, studentUserId, status, lastReminderAt })),
    reviews: duty.requests.filter((request) => actor.role !== "STUDENT" || request.requestedBy === actor.userId)
      .map(({ id, kind, note, reviewedAt, approved }) => ({ id, kind, note, reviewedAt, approved })),
    assistance: duty.assistanceRequests.map(({ id, createdAt }) => ({ id, createdAt })),
  };
}

export async function getResponsibilityDirectory(actor: AuthenticatedIdentity, assistanceOnly = false, dutyId?: string) {
  const rooms = roomService();
  if (actor.role === "STUDENT" && !assistanceOnly) {
    const room = await rooms.getVerifiedMembership(actor.userId);
    const duties = await listDuties({
      id: dutyId,
      OR: [{ createdByUserId: actor.userId }, { assignments: { some: { studentUserId: actor.userId } } }],
    });
    return { role: actor.role, rooms: [], duties: duties.map((duty) =>
      present(duty, actor, room?.id === duty.roomId &&
        (duty.createdByUserId === actor.userId || currentAssignments(duty).some((part) => part.studentUserId === actor.userId)))) };
  }
  requireDuty(actor.role === "WARDEN" || (actor.role === "MANAGER" && !assistanceOnly), "Access denied.", 403);
  const directory = await rooms.getDirectory(actor);
  const houses = directory.houses;
  const duties = await listDuties({
    id: dutyId,
    houseId: { in: houses.map(({ id }) => id) },
    ...(assistanceOnly ? { assistanceRequests: { some: { status: "ACTIVE" } } } : {}),
  });
  const options = assistanceOnly || actor.role !== "WARDEN" ? [] : await Promise.all(houses.flatMap((house) =>
    house.rooms.map(async (room) => ({
      id: room.id, label: `${house.name} · ${room.roomNumber}`, residents: await rooms.verifiedResidents(room.id),
    })),
  ));
  return { role: actor.role, rooms: options, duties: await Promise.all(duties.map(async (duty) => ({
    ...present(duty, actor, actor.role === "WARDEN" && !assistanceOnly),
    ...(assistanceOnly ? { assignments: [], reviews: [] } : {}),
    ...(duty.assistanceRequests.length ? {
      assistanceRecipientId: await rooms.getActivePrimaryWarden(duty.houseId),
    } : {}),
  }))) };
}

// End the transferred student's unfinished part and hold the duty for Warden
// redistribution. The history and any existing assistance request stay intact.
export async function flagTransferredAssignments(
  client: Prisma.TransactionClient, studentId: string, formerRoomId: string, now: Date,
) {
  const candidates = await findUnfinishedTransferDuties(client, studentId, formerRoomId);
  for (const { id } of candidates) {
    const duty = await lockDuty(client, id);
    if (!duty || terminal(duty)) continue;
    const current = currentAssignments(duty);
    const part = current.find((item) => item.studentUserId === studentId && item.status !== "COMPLETED");
    if (!part) continue;
    await client.responsibilityAssignment.update({
      where: { id: part.id }, data: { status: "WITHDRAWN", withdrawnAt: now },
    });
    await client.responsibility.update({
      where: { id }, data: { status: "PENDING_ACCEPTANCE", needsRedistribution: true, revision: { increment: 1 } },
    });
    await notify(client, id, [
      ...current.filter((item) => item.id !== part.id).map((item) => item.studentUserId),
      ...await dutyRecipients(client, duty.houseId),
    ], `transfer:${part.id}`, "Shared duty needs redistribution after a room transfer");
  }
}

async function distribute(
  client: Prisma.TransactionClient, duty: Duty,
  input: Extract<ResponsibilityCommand, { action: "distribute" }>,
) {
  const now = new Date();
  const dueAt = new Date(input.dueAt);
  const deadline = new Date(input.acceptanceDeadline);
  requireDuty(deadline > now && dueAt > deadline, "Set a future acceptance deadline before the duty is due.");
  const residents = await roomService(client).verifiedResidents(duty.roomId);
  const residentIds = new Set(residents.map(({ userId }) => userId));
  requireDuty(input.assignees.every((id) => residentIds.has(id)), "Choose verified residents of this room.");
  const existing = currentAssignments(duty);
  const oldIds = new Set(existing.map(({ studentUserId }) => studentUserId));
  const revisedTerms = duty.description !== input.description || duty.dueAt.getTime() !== dueAt.getTime();
  const newIds = new Set(input.assignees);
  const revision = duty.revision + 1;
  for (const assignment of existing) {
    const included = newIds.has(assignment.studentUserId);
    if (!included || revisedTerms || assignment.status === "REJECTED") {
      await client.responsibilityAssignment.update({
        where: { id: assignment.id },
        data: included ? {
          status: "PENDING", acceptedAt: null, completedAt: null, rejectedAt: null,
          reminderVersion: { increment: 1 }, reminderEligibleAt: null, lastReminderAt: null,
          incompleteConfirmedAt: null, incompleteConfirmationSource: null,
        } : { status: "WITHDRAWN", withdrawnAt: now },
      });
    }
  }
  for (const studentUserId of input.assignees.filter((id) => !oldIds.has(id))) {
    await client.responsibilityAssignment.create({ data: { responsibilityId: duty.id, studentUserId } });
  }
  const parts = await client.responsibilityAssignment.findMany({ where: { responsibilityId: duty.id, status: { not: "WITHDRAWN" } } });
  const pending = parts.some(({ status }) => status === "PENDING");
  const completed = parts.every(({ status }) => status === "COMPLETED");
  await client.responsibility.update({
    where: { id: duty.id }, data: {
      title: input.title, description: input.description, dueAt, acceptanceDeadline: deadline,
      distributedAt: duty.distributedAt ?? now, revision, needsRedistribution: false,
      status: pending ? "PENDING_ACCEPTANCE" : duty.assistanceRequests.length ? "ASSISTANCE_REQUESTED" : "ACTIVE",
    },
  });
  if (completed) await finishDuty(client, { ...duty, assignments: parts, revision }, "COMPLETED", now);
  if (!pending && !completed) {
    await client.responsibilityAssignment.updateMany({
      where: { responsibilityId: duty.id, status: "ACCEPTED", reminderEligibleAt: null },
      data: { reminderEligibleAt: now },
    });
  }
  await notify(client, duty.id, [...oldIds, ...newIds], `distribution:${revision}`, "Shared duty assignment updated");
}

export async function createResponsibility(actor: AuthenticatedIdentity, input: ResponsibilityCreate) {
  return withDutyTransaction(async (client) => {
    const rooms = roomService(client);
    const room = input.action === "propose" && actor.role === "STUDENT"
      ? await rooms.getVerifiedMembership(actor.userId)
      : input.action === "create" && actor.role === "WARDEN"
        ? await rooms.findRoom(input.roomId) : null;
    requireDuty(room && (actor.role !== "WARDEN" || await rooms.wardenManagesHouse(actor.userId, room.houseId)), "Access denied.", 403);
    const dueAt = new Date(input.dueAt);
    requireDuty(dueAt > new Date(), "Set a future due date.");
    const created = await client.responsibility.create({
      data: { roomId: room.id, houseId: room.houseId, createdByUserId: actor.userId,
        title: input.title, description: input.description, dueAt },
    });
    if (input.action === "create") {
      const duty = await lockDuty(client, created.id);
      if (duty) await distribute(client, duty, { ...input, action: "distribute" });
    } else {
      await notify(client, created.id, await dutyRecipients(client, room.houseId), "proposal", "New shared duty proposal");
    }
    return { id: created.id };
  });
}

async function finishDuty(client: Prisma.TransactionClient, duty: Duty, status: "COMPLETED" | "CANCELLED", now: Date) {
  await client.responsibility.update({
    where: { id: duty.id }, data: {
      status, revision: { increment: 1 },
      ...(status === "COMPLETED" ? { completedAt: now } : { cancelledAt: now }),
    },
  });
  await client.assistanceRequest.updateMany({
    where: { responsibilityId: duty.id, status: "ACTIVE" }, data: { status: "CLOSED", closedAt: now },
  });
  await notify(client, duty.id, participants(duty), `${status}:${duty.revision + 1}`,
    status === "COMPLETED" ? "Shared duty completed" : "Shared duty cancelled");
}

function canConfirmIncomplete(duty: Duty, part: Duty["assignments"][number], now: Date) {
  return part.status === "ACCEPTED" && part.lastReminderAt !== null &&
    part.lastReminderAt <= now && part.incompleteConfirmedAt === null && !duty.needsRedistribution &&
    (duty.status === "ACTIVE" || duty.status === "ASSISTANCE_REQUESTED") &&
    currentAssignments(duty).every(({ status }) => status === "ACCEPTED" || status === "COMPLETED");
}

async function confirmIncomplete(
  client: Prisma.TransactionClient, duty: Duty, part: Duty["assignments"][number],
  now: Date, source: "student" | "timeout",
) {
  // The caller holds the duty row lock. The alert marker is shared by both paths
  // and survives revisions and recipient changes.
  await client.responsibilityAssignment.update({
    where: { id: part.id },
    data: { incompleteConfirmedAt: now, incompleteConfirmationSource: source },
  });
  if (duty.requests.some(({ kind }) => kind === "incomplete")) return;

  const recipients = await dutyRecipients(client, duty.houseId);
  requireDuty(recipients.length, "No active staff recipient is available. Contact hostel staff.");
  const marker = await client.responsibilityReview.createMany({
    data: {
      responsibilityId: duty.id, requestedBy: part.studentUserId, kind: "incomplete",
      note: source === "student" ? "Confirmed by the assigned student." : "Confirmed by the deadline timeout.",
      requestedAt: now, reviewedAt: now,
    },
    skipDuplicates: true,
  });
  if (!marker.count) return;
  await notify(client, duty.id, recipients, "confirmed-noncompletion", "Shared duty confirmed incomplete", "responsibility_incomplete");
}

export async function changeResponsibility(actor: AuthenticatedIdentity, id: string, command: ResponsibilityCommand) {
  return withDutyTransaction(async (client) => {
    const duty = await lockDuty(client, id);
    requireDuty(duty, "Shared duty not found.", 404);
    const rooms = roomService(client);
    const warden = actor.role === "WARDEN" && await rooms.wardenManagesHouse(actor.userId, duty.houseId);
    const parts = currentAssignments(duty);
    const part = parts.find(({ studentUserId }) => studentUserId === actor.userId);
    const student = actor.role === "STUDENT" &&
      (await rooms.getVerifiedMembership(actor.userId))?.id === duty.roomId &&
      (part || duty.createdByUserId === actor.userId);
    requireDuty(warden || student, "Shared duty not found.", 404);
    const now = new Date();
    const updateDuty = (data: Prisma.ResponsibilityUpdateInput) =>
      client.responsibility.update({ where: { id }, data });
    switch (command.action) {
      case "distribute":
        requireDuty(warden && !terminal(duty), "This duty cannot be distributed.", 403);
        await distribute(client, duty, command);
        break;
      case "copyEdit":
        requireDuty(warden && !terminal(duty), "This duty cannot be edited.", 403);
        await updateDuty({ title: command.title, description: command.description, revision: { increment: 1 } });
        break;
      case "accept":
      case "reject": {
        requireDuty(student && part?.status === "PENDING" && !terminal(duty) &&
          duty.acceptanceDeadline && now < duty.acceptanceDeadline, "This assignment is no longer awaiting your response.");
        const accept = command.action === "accept";
        await client.responsibilityAssignment.update({
          where: { id: part.id }, data: accept ? { status: "ACCEPTED", acceptedAt: now } : { status: "REJECTED", rejectedAt: now },
        });
        if (accept && !duty.needsRedistribution && parts.every((item) => item.id === part.id || item.status === "ACCEPTED" || item.status === "COMPLETED")) {
          await updateDuty({ status: duty.assistanceRequests.length ? "ASSISTANCE_REQUESTED" : "ACTIVE" });
          await client.responsibilityAssignment.updateMany({
            where: { responsibilityId: id, status: "ACCEPTED", reminderEligibleAt: null },
            data: { reminderEligibleAt: now },
          });
        }
        if (!accept) await notify(client, id, await dutyRecipients(client, duty.houseId), `rejection:${part.id}:${duty.revision}`, "Shared duty assignment declined");
        break;
      }
      case "complete":
        requireDuty(student && part?.status === "ACCEPTED" && parts.every(({ status }) => status === "ACCEPTED" || status === "COMPLETED") &&
          !terminal(duty) && !duty.needsRedistribution, "This assignment cannot be completed.");
        await client.responsibilityAssignment.update({ where: { id: part.id }, data: { status: "COMPLETED", completedAt: now } });
        if (parts.every((item) => item.id === part.id || item.status === "COMPLETED")) await finishDuty(client, duty, "COMPLETED", now);
        break;
      case "assistance": {
        requireDuty(student && part && !terminal(duty), "Assistance requires a current assignment.");
        if (duty.assistanceRequests.length) break;
        const request = await client.assistanceRequest.create({
          data: { responsibilityId: id, requestedByUserId: actor.userId, deduplicationKey: `assistance:${id}:${duty.revision}` },
        });
        await updateDuty({ status: "ASSISTANCE_REQUESTED", revision: { increment: 1 } });
        const recipients = await dutyRecipients(client, duty.houseId);
        await notify(client, id, recipients, request.id, "Warden assistance requested", "responsibility_assistance");
        break;
      }
      case "cancel":
        requireDuty(warden && !terminal(duty), "This duty cannot be cancelled.", 403);
        await finishDuty(client, duty, "CANCELLED", now);
        break;
      case "reportIncomplete": {
        requireDuty(student && part, "A current assignment with a delivered reminder is required.");
        if (part.incompleteConfirmedAt) break;
        requireDuty(canConfirmIncomplete(duty, part, now), "A current assignment with a delivered reminder is required.");
        await confirmIncomplete(client, duty, part, now, "student");
        break;
      }
      case "requestReview": {
        requireDuty(student && (command.kind === "reopen"
          ? part?.status === "COMPLETED" && duty.status === "COMPLETED"
          : !terminal(duty) && (command.kind === "cancel" || part) &&
            (command.kind !== "withdraw" || part?.status === "ACCEPTED")), "This review request is not available.");
        if (duty.requests.some((item) => item.requestedBy === actor.userId && item.kind === command.kind && !item.reviewedAt)) break;
        const review = await client.responsibilityReview.create({ data: {
          responsibilityId: id, kind: command.kind, requestedBy: actor.userId, note: command.note,
        } });
        await notify(client, id, await dutyRecipients(client, duty.houseId), review.id, "Shared duty review requested");
        break;
      }
      case "review": {
        requireDuty(warden, "Only an assigned Warden can review this request.", 403);
        const review = duty.requests.find((item) => item.id === command.reviewId && !item.reviewedAt);
        requireDuty(review, "Review request not found.", 404);
        const assignee = parts.find(({ studentUserId }) => studentUserId === review.requestedBy);
        if (command.approve) {
          if (review.kind === "cancel") {
            requireDuty(!terminal(duty), "This duty has already ended.");
            await finishDuty(client, duty, "CANCELLED", now);
          } else if (review.kind === "reopen") {
            requireDuty(assignee?.status === "COMPLETED" && duty.status === "COMPLETED" &&
              (await rooms.getVerifiedMembership(review.requestedBy))?.id === duty.roomId, "This part cannot be reopened.");
            await client.responsibilityAssignment.update({
              where: { id: assignee.id }, data: { status: "ACCEPTED", completedAt: null, reminderEligibleAt: now,
                reminderVersion: { increment: 1 }, lastReminderAt: null,
                incompleteConfirmedAt: null, incompleteConfirmationSource: null },
            });
            await updateDuty({ status: "ACTIVE", completedAt: null, revision: { increment: 1 } });
            await notify(client, id, participants(duty), `reopen:${review.id}`, "Shared duty reopened");
          } else if (review.kind === "withdraw") {
            requireDuty(assignee && !terminal(duty), "This assignment cannot be withdrawn.");
            await client.responsibilityAssignment.update({ where: { id: assignee.id }, data: { status: "WITHDRAWN", withdrawnAt: now } });
            await updateDuty({ status: "PENDING_ACCEPTANCE", needsRedistribution: true, revision: { increment: 1 } });
            await notify(client, id, participants(duty), `withdraw:${review.id}`, "Shared duty withdrawal approved");
          }
        }
        await client.responsibilityReview.update({
          where: { id: review.id }, data: { reviewedAt: now, reviewedBy: actor.userId, approved: command.approve },
        });
        await notify(client, id, [review.requestedBy], `review:${review.id}`, "Shared duty review completed");
        break;
      }
    }
    return { id };
  });
}

export const RESPONSIBILITY_REMINDER_JOB = "responsibility_reminder";
const reminderLeadHours = [24, 1];
const reminderKey = (id: string, version: number, hours: number) => `assignment:${id}:${version}:reminder:${hours}h`;

export function planResponsibilityReminders(
  candidates: Awaited<ReturnType<typeof findReminderCandidates>>,
  now: Date,
) {
  return candidates.flatMap((candidate) => reminderLeadHours.flatMap((hours) => {
    const scheduledFor = new Date(candidate.responsibility.dueAt.getTime() - hours * 3_600_000);
    if (!candidate.reminderEligibleAt || candidate.responsibility.dueAt <= now ||
      scheduledFor < candidate.reminderEligibleAt || scheduledFor > now) return [];
    return [{
      jobType: RESPONSIBILITY_REMINDER_JOB, targetType: "responsibility_assignment",
      targetId: candidate.id, idempotencyKey: reminderKey(candidate.id, candidate.reminderVersion, hours), scheduledFor,
    }];
  }));
}

export async function findDueResponsibilityReminders(now: Date) {
  return planResponsibilityReminders(await findReminderCandidates(now), now);
}

export async function deliverResponsibilityReminder(
  client: Prisma.TransactionClient, job: { targetId: string; scheduledFor: Date; idempotencyKey: string }, now: Date,
) {
  const target = await findAssignmentDutyId(client, job.targetId);
  const duty = target ? await lockDuty(client, target.responsibilityId) : null;
  if (!duty || duty.needsRedistribution || job.scheduledFor > now || duty.dueAt <= now ||
      (duty.status !== "ACTIVE" && duty.status !== "ASSISTANCE_REQUESTED")) return;
  const assignments = currentAssignments(duty);
  const assignment = assignments.find((part) => part.id === job.targetId);
  if (!assignment || assignment.status !== "ACCEPTED" || !assignment.reminderEligibleAt ||
      assignments.some(({ status }) => status === "PENDING" || status === "REJECTED")) return;
  if (!reminderLeadHours.some((hours) => job.idempotencyKey === reminderKey(assignment.id, assignment.reminderVersion, hours) &&
      job.scheduledFor.getTime() === duty.dueAt.getTime() - hours * 3_600_000)) return;
  const residents = await roomService(client).verifiedResidents(duty.roomId);
  if (!residents.some(({ userId }) => userId === assignment.studentUserId)) return;
  await notify(client, duty.id, [assignment.studentUserId], job.idempotencyKey, "Shared duty due soon", "responsibility_reminder");
  await client.responsibilityAssignment.update({ where: { id: assignment.id }, data: { lastReminderAt: now } });
}

export const RESPONSIBILITY_TIMEOUT_JOB = "responsibility_timeout";
export const RESPONSIBILITY_GRACE_MS = 60 * 60_000;

function timeoutKey(id: string, version: number, dueAt: Date) {
  return `assignment:${id}:${version}:timeout:${dueAt.toISOString()}`;
}

export async function findDueResponsibilityTimeouts(now: Date) {
  const candidates = await findIncompleteTimeoutCandidates(now, RESPONSIBILITY_GRACE_MS);
  return candidates.map(({ id, reminderVersion, responsibility: { dueAt } }) => ({
    jobType: RESPONSIBILITY_TIMEOUT_JOB, targetType: "responsibility_assignment", targetId: id,
    idempotencyKey: timeoutKey(id, reminderVersion, dueAt),
    scheduledFor: new Date(dueAt.getTime() + RESPONSIBILITY_GRACE_MS),
  }));
}

export async function confirmResponsibilityTimeout(
  client: Prisma.TransactionClient, job: { targetId: string; scheduledFor: Date; idempotencyKey: string }, now: Date,
) {
  const target = await findAssignmentDutyId(client, job.targetId);
  const duty = target ? await lockDuty(client, target.responsibilityId) : null;
  const part = duty?.assignments.find(({ id }) => id === job.targetId);
  if (!duty || !part || now.getTime() < duty.dueAt.getTime() + RESPONSIBILITY_GRACE_MS ||
    job.scheduledFor.getTime() !== duty.dueAt.getTime() + RESPONSIBILITY_GRACE_MS ||
    job.idempotencyKey !== timeoutKey(part.id, part.reminderVersion, duty.dueAt) ||
    !canConfirmIncomplete(duty, part, now)) return;

  const rooms = roomService(client);
  const [membership, status] = await Promise.all([
    rooms.getVerifiedMembership(part.studentUserId),
    new AuthService(new AuthUserRepository(client)).getAccountStatus(part.studentUserId),
  ]);
  if (membership?.id !== duty.roomId || !status?.isActive || status.role !== "STUDENT") return;
  await confirmIncomplete(client, duty, part, now, "timeout");
}
