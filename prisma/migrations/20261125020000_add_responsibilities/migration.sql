-- CreateEnum
CREATE TYPE "ResponsibilityStatus" AS ENUM ('Pending Acceptance', 'Active', 'Assistance Requested', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "ResponsibilityAssignmentStatus" AS ENUM ('Pending', 'Accepted', 'Rejected', 'Completed', 'Withdrawn');

-- CreateEnum
CREATE TYPE "AssistanceRequestStatus" AS ENUM ('Active', 'Closed');

-- CreateTable
CREATE TABLE "responsibilities" (
    "id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "acceptance_deadline" TIMESTAMPTZ(3),
    "room_id" UUID NOT NULL,
    "house_id" UUID NOT NULL,
    "status" "ResponsibilityStatus" NOT NULL DEFAULT 'Pending Acceptance',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "distributed_at" TIMESTAMPTZ(3),
    "needs_redistribution" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibility_assignments" (
    "id" UUID NOT NULL,
    "responsibility_id" UUID NOT NULL,
    "student_user_id" UUID NOT NULL,
    "status" "ResponsibilityAssignmentStatus" NOT NULL DEFAULT 'Pending',
    "accepted_at" TIMESTAMPTZ(3),
    "rejected_at" TIMESTAMPTZ(3),
    "withdrawn_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "reminder_version" INTEGER NOT NULL DEFAULT 0,
    "reminder_eligible_at" TIMESTAMPTZ(3),
    "last_reminder_at" TIMESTAMPTZ(3),

    CONSTRAINT "responsibility_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistance_requests" (
    "id" UUID NOT NULL,
    "responsibility_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "status" "AssistanceRequestStatus" NOT NULL DEFAULT 'Active',
    "deduplication_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "assistance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibility_reviews" (
    "id" UUID NOT NULL,
    "responsibility_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "approved" BOOLEAN,

    CONSTRAINT "responsibility_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "responsibilities_room_id_status_due_at_idx" ON "responsibilities"("room_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "responsibilities_house_id_status_created_at_idx" ON "responsibilities"("house_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "responsibility_assignments_responsibility_id_student_user_i_idx" ON "responsibility_assignments"("responsibility_id", "student_user_id");

-- CreateIndex
CREATE INDEX "responsibility_assignments_student_user_id_status_created_a_idx" ON "responsibility_assignments"("student_user_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assistance_requests_deduplication_key_key" ON "assistance_requests"("deduplication_key");

-- CreateIndex
CREATE INDEX "assistance_requests_responsibility_id_status_created_at_idx" ON "assistance_requests"("responsibility_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "responsibility_reviews_responsibility_id_reviewed_at_idx" ON "responsibility_reviews"("responsibility_id", "reviewed_at");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_id_house_id_key" ON "rooms"("id", "house_id");

-- AddForeignKey
ALTER TABLE "responsibilities" ADD CONSTRAINT "responsibilities_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibilities" ADD CONSTRAINT "responsibilities_room_id_house_id_fkey" FOREIGN KEY ("room_id", "house_id") REFERENCES "rooms"("id", "house_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_assignments" ADD CONSTRAINT "responsibility_assignments_responsibility_id_fkey" FOREIGN KEY ("responsibility_id") REFERENCES "responsibilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_assignments" ADD CONSTRAINT "responsibility_assignments_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistance_requests" ADD CONSTRAINT "assistance_requests_responsibility_id_fkey" FOREIGN KEY ("responsibility_id") REFERENCES "responsibilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistance_requests" ADD CONSTRAINT "assistance_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_reviews" ADD CONSTRAINT "responsibility_reviews_responsibility_id_fkey" FOREIGN KEY ("responsibility_id") REFERENCES "responsibilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "responsibility_assignments_one_current_part"
  ON "responsibility_assignments" ("responsibility_id", "student_user_id") WHERE "status" <> 'Withdrawn';

CREATE UNIQUE INDEX "assistance_requests_one_active"
  ON "assistance_requests" ("responsibility_id") WHERE "status" = 'Active';
