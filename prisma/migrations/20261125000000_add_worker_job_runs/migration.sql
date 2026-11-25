CREATE TYPE "WorkerJobStatus" AS ENUM ('Pending', 'Processing', 'Succeeded', 'Failed');

CREATE TABLE "worker_job_runs" (
    "id" UUID NOT NULL,
    "job_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "WorkerJobStatus" NOT NULL DEFAULT 'Pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 4,
    "next_attempt_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "last_error" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "worker_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worker_job_runs_idempotency_key_key" ON "worker_job_runs"("idempotency_key");
CREATE INDEX "worker_job_runs_job_type_status_next_attempt_at_idx"
  ON "worker_job_runs"("job_type", "status", "next_attempt_at");
CREATE INDEX "worker_job_runs_job_type_status_locked_at_idx"
  ON "worker_job_runs"("job_type", "status", "locked_at");
CREATE INDEX "personal_schedules_start_at_idx" ON "personal_schedules"("start_at");
