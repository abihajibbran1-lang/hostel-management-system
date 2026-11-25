import { randomUUID } from "node:crypto";
import type { Prisma, WorkerJobRun } from "@prisma/client";
import { prisma } from "../database/prisma.ts";

const LOCK_LEASE_MS = 5 * 60_000;
const RETRY_MINUTES = [1, 5, 15];

export async function ensureWorkerJobs(jobs: Prisma.WorkerJobRunCreateManyInput[]) {
  if (jobs.length) await prisma.workerJobRun.createMany({ data: jobs, skipDuplicates: true });
}

export async function claimWorkerJob(jobType: string, now: Date) {
  const expired = new Date(now.getTime() - LOCK_LEASE_MS);
  const eligible = {
    jobType,
    OR: [
      { status: "PENDING", scheduledFor: { lte: now }, nextAttemptAt: null },
      { status: "PENDING", nextAttemptAt: { lte: now } },
      { status: "PROCESSING", lockedAt: { lte: expired } },
    ],
  } satisfies Prisma.WorkerJobRunWhereInput;
  const candidate = await prisma.workerJobRun.findFirst({
    where: eligible,
    orderBy: [{ scheduledFor: "asc" }, { id: "asc" }],
  });
  if (!candidate) return null;

  const where = { ...eligible, id: candidate.id, attemptCount: candidate.attemptCount };
  if (candidate.attemptCount >= candidate.maxAttempts) {
    await prisma.workerJobRun.updateMany({
      where,
      data: {
        status: "FAILED", lockedAt: null, lockedBy: null, completedAt: now,
        lastError: "The final worker attempt was interrupted.",
      },
    });
    return undefined;
  }

  const lockedBy = randomUUID();
  const { count } = await prisma.workerJobRun.updateMany({
    where,
    data: { status: "PROCESSING", lockedAt: now, lockedBy, attemptCount: { increment: 1 } },
  });
  return count === 1
    ? { ...candidate, lockedBy, attemptCount: candidate.attemptCount + 1 }
    : undefined;
}

export async function processWorkerJob(
  job: WorkerJobRun,
  run: (client: Prisma.TransactionClient) => Promise<void>,
) {
  const where = { id: job.id, status: "PROCESSING" as const, lockedBy: job.lockedBy };
  try {
    await prisma.$transaction(async (client) => {
      // Take the job row lock before executing domain work. The post-claim
      // ownership check also protects against a previous claim whose lease expired.
      const lock = await client.workerJobRun.updateMany({ where, data: { lockedAt: new Date() } });
      if (!lock.count) return;
      await run(client);
      await client.workerJobRun.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", completedAt: new Date(), lockedAt: null, lockedBy: null,
          nextAttemptAt: null, lastError: null },
      });
    });
  } catch {
    const delay = RETRY_MINUTES[job.attemptCount - 1];
    const retry = job.attemptCount < job.maxAttempts && delay !== undefined;
    const now = new Date();
    await prisma.workerJobRun.updateMany({
      where,
      data: {
        status: retry ? "PENDING" : "FAILED",
        nextAttemptAt: retry ? new Date(now.getTime() + delay * 60_000) : null,
        completedAt: retry ? null : now,
        lockedAt: null,
        lockedBy: null,
        lastError: "The job handler could not complete the operation.",
      },
    });
  }
}
