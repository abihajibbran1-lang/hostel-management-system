ALTER TABLE "complaints"
  ADD COLUMN "original_complaint_id" UUID REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN "disagreement_reason" TEXT,
  ADD COLUMN "assigned_manager_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN "manual_escalation_eligible_at" TIMESTAMP(3),
  ADD COLUMN "manual_escalation_requested_at" TIMESTAMP(3),
  ADD COLUMN "auto_escalated_at" TIMESTAMP(3),
  ADD CONSTRAINT "complaints_disagreement_requires_original"
    CHECK ("disagreement_reason" IS NULL OR ("original_complaint_id" IS NOT NULL AND length(btrim("disagreement_reason")) > 0));

CREATE INDEX "complaints_status_submitted_at_idx" ON "complaints" ("status", "submitted_at");
CREATE INDEX "complaints_assigned_manager_id_submitted_at_idx" ON "complaints" ("assigned_manager_id", "submitted_at");
CREATE INDEX "complaints_original_complaint_id_idx" ON "complaints" ("original_complaint_id");
