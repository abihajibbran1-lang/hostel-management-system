CREATE TABLE "personal_schedules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "recurrence_rule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "personal_schedules_user_id_start_at_idx"
    ON "personal_schedules"("user_id", "start_at");

ALTER TABLE "personal_schedules"
    ADD CONSTRAINT "personal_schedules_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
