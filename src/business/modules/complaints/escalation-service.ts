import type { Prisma } from "@prisma/client";
import { AuthUserRepository } from "../../../data/repositories/auth/auth-user-repository.ts";
import { NotificationService } from "../../notifications/notification-service.ts";
import {
  escalationCandidates, inComplaintTransaction, lockEscalationTarget, unlockManualEscalation, writeEscalation,
} from "../../../data/repositories/complaints/escalation-repository.ts";
import { ComplaintService } from "./complaint-service.ts";
import { complaintIdSchema, createComplaintSchema } from "./complaint-contract.ts";
import { z } from "zod";

export const COMPLAINT_ELIGIBILITY_JOB = "complaint_manual_eligibility";
export const COMPLAINT_AUTO_JOB = "complaint_auto_escalation";
const HOUR = 3_600_000;
const MANUAL_MS = 18 * HOUR;
const AUTO_MS = 24 * HOUR;

export const followUpSchema = z.discriminatedUnion("kind", [
  createComplaintSchema.extend({ kind: z.literal("recurrence") }),
  createComplaintSchema.extend({ kind: z.literal("disagreement"), reason: z.string().trim().min(1) }),
]);

export async function createComplaintFollowUp(userId: string, parentId: string, input: z.infer<typeof followUpSchema>) {
  const service = new ComplaintService();
  const parent = await service.getOwned(userId, parentId);
  if (!parent) return { result: "missing" } as const;
  if (parent.status !== "Resolved") return { result: "ineligible" } as const;
  const complaint = await service.create(userId, input, {
    originalComplaintId: parentId,
    ...(input.kind === "disagreement" ? { disagreementReason: input.reason } : {}),
  });
  return { result: "created", complaint } as const;
}

type Timing = { submittedAt: Date; statusHistory: { id: string; changedAt: Date }[] };

export function escalationSchedule(complaint: Timing, manual: boolean) {
  const action = manual ? complaint.statusHistory[0] : undefined;
  const base = Math.max(complaint.submittedAt.getTime(), action?.changedAt.getTime() ?? 0);
  return { scheduledFor: new Date(base + (manual ? MANUAL_MS : AUTO_MS)), version: action?.id ?? "submission" };
}

export async function findDueComplaintJobs(now: Date, manual: boolean) {
  const jobType = manual ? COMPLAINT_ELIGIBILITY_JOB : COMPLAINT_AUTO_JOB;
  const candidates = await escalationCandidates(new Date(now.getTime() - (manual ? MANUAL_MS : AUTO_MS)), manual);
  return candidates.flatMap((complaint) => {
    const { scheduledFor, version } = escalationSchedule(complaint, manual);
    return scheduledFor <= now ? [{
      jobType, targetType: "complaint", targetId: complaint.id,
      idempotencyKey: `${jobType}:${complaint.id}:${version}`, scheduledFor,
    }] : [];
  });
}

type Target = NonNullable<Awaited<ReturnType<typeof lockEscalationTarget>>>;
const isActive = (complaint: Target) => complaint.status === "PENDING" || complaint.status === "IN_PROGRESS";

async function escalate(tx: Prisma.TransactionClient, complaint: Target, actorId: string | null, now: Date) {
  const parsed = complaintIdSchema.safeParse(process.env.COMPLAINT_ESCALATION_MANAGER_ID);
  const manager = parsed.success ? await new AuthUserRepository(tx).getAccountStatus(parsed.data) : null;
  if (!manager?.isActive || manager.role !== "MANAGER") return false;

  await writeEscalation(tx, complaint, manager.userId, actorId, now);
  await new NotificationService().dispatchInTransaction(tx, {
    recipientUserId: manager.userId, type: "complaint_escalation",
    title: "Complaint escalated", message: "Open the Manager complaint queue to review the case.",
    relatedModule: "complaints", relatedEntityId: complaint.id,
    deduplicationKey: `complaint:${complaint.id}:escalated`,
  });
  return true;
}

export async function runComplaintEscalationJob(
  tx: Prisma.TransactionClient, job: { targetId: string; scheduledFor: Date; idempotencyKey: string },
  now: Date, manual: boolean,
) {
  const complaint = await lockEscalationTarget(tx, job.targetId);
  if (!complaint || !isActive(complaint)) return;
  const { scheduledFor, version } = escalationSchedule(complaint, manual);
  const jobType = manual ? COMPLAINT_ELIGIBILITY_JOB : COMPLAINT_AUTO_JOB;
  if (scheduledFor > now || scheduledFor.getTime() !== job.scheduledFor.getTime() ||
      job.idempotencyKey !== `${jobType}:${complaint.id}:${version}`) return;
  if (manual) {
    if (!complaint.manualEscalationEligibleAt && !complaint.disagreementReason) await unlockManualEscalation(tx, complaint.id, now);
  } else if (!(await escalate(tx, complaint, null, now))) {
    throw new Error("The designated escalation Manager is unavailable.");
  }
}

export function requestComplaintEscalation(userId: string, id: string, now = new Date()) {
  return inComplaintTransaction(async (tx) => {
    const complaint = await lockEscalationTarget(tx, id);
    if (!complaint || complaint.submittedBy !== userId) return "missing";
    if (complaint.status === "ESCALATED") return "escalated";
    const manualTime = escalationSchedule(complaint, true).scheduledFor;
    const unlocked = complaint.manualEscalationEligibleAt !== null &&
      complaint.manualEscalationEligibleAt >= manualTime && manualTime <= now;
    if (!isActive(complaint) || (!complaint.disagreementReason && !unlocked)) return "ineligible";
    return await escalate(tx, complaint, userId, now) ? "escalated" : "unavailable";
  });
}
