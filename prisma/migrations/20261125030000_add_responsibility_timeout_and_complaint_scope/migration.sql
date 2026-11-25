ALTER TABLE "responsibility_assignments"
  ADD COLUMN "incomplete_confirmed_at" TIMESTAMPTZ(3),
  ADD COLUMN "incomplete_confirmation_source" TEXT,
  ADD CONSTRAINT "responsibility_incomplete_confirmation_check" CHECK (
    ("incomplete_confirmed_at" IS NULL AND "incomplete_confirmation_source" IS NULL)
    OR ("incomplete_confirmed_at" IS NOT NULL AND "incomplete_confirmation_source" IS NOT NULL
      AND "incomplete_confirmation_source" IN ('student', 'timeout'))
  );

ALTER TABLE "complaints"
  ADD COLUMN "submitted_house_id" UUID,
  ADD CONSTRAINT "complaints_submitted_house_id_fkey" FOREIGN KEY ("submitted_house_id")
    REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "complaints_submitted_house_id_submitted_at_idx"
  ON "complaints"("submitted_house_id", "submitted_at");

CREATE UNIQUE INDEX "responsibility_reviews_one_incomplete_alert"
  ON "responsibility_reviews"("responsibility_id") WHERE "kind" = 'incomplete';
