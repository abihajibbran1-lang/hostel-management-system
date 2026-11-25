CREATE TYPE "ComplaintCategory" AS ENUM ('Water', 'Hygiene', 'Pests', 'Electricity', 'Facilities');
CREATE TYPE "ComplaintStatus" AS ENUM ('Pending', 'In Progress', 'Resolved', 'Escalated');

CREATE TABLE "complaints" (
    "id" UUID NOT NULL,
    "submitted_by" UUID NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "room_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "urgency_flag" BOOLEAN NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'Pending',
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "complaints_submitted_by_fkey" FOREIGN KEY ("submitted_by")
      REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "complaint_status_history" (
    "id" UUID NOT NULL,
    "complaint_id" UUID NOT NULL,
    "old_status" "ComplaintStatus",
    "new_status" "ComplaintStatus" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "complaint_status_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "complaint_status_history_complaint_id_fkey" FOREIGN KEY ("complaint_id")
      REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "complaint_status_history_changed_by_fkey" FOREIGN KEY ("changed_by")
      REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "complaints_submitted_by_submitted_at_idx" ON "complaints"("submitted_by", "submitted_at");
CREATE INDEX "complaint_status_history_complaint_id_changed_at_idx"
  ON "complaint_status_history"("complaint_id", "changed_at");
