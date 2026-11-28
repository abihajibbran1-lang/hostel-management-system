-- CreateTable
CREATE TABLE "meal_portion_logs" (
    "id" UUID NOT NULL,
    "meal_date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "menu_item_id" UUID,
    "item_name_snapshot" TEXT NOT NULL,
    "portion_count" INTEGER NOT NULL,
    "logged_by" UUID NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_id" UUID NOT NULL,

    CONSTRAINT "meal_portion_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meal_portion_logs_count_check" CHECK ("portion_count" > 0)
);

-- CreateTable
CREATE TABLE "meal_portion_audits" (
    "portion_log_id" UUID NOT NULL,
    "recorded_by" UUID NOT NULL,
    "expected_portions" INTEGER NOT NULL,
    "observed_portions" INTEGER NOT NULL,
    "description" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_portion_audits_pkey" PRIMARY KEY ("portion_log_id"),
    CONSTRAINT "meal_portion_audits_count_check" CHECK ("expected_portions" > 0 AND "observed_portions" >= 0)
);

-- CreateTable
CREATE TABLE "meal_portion_discrepancies" (
    "id" UUID NOT NULL,
    "portion_log_id" UUID NOT NULL,
    "recorded_by" UUID NOT NULL,
    "expected_portions" INTEGER NOT NULL,
    "observed_portions" INTEGER NOT NULL,
    "description" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_portion_discrepancies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meal_portion_discrepancies_count_check" CHECK (
      "expected_portions" > 0 AND "observed_portions" >= 0 AND "expected_portions" <> "observed_portions"
    )
);

-- CreateIndex
CREATE INDEX "meal_portion_logs_meal_date_logged_at_idx" ON "meal_portion_logs"("meal_date", "logged_at");

-- CreateIndex
CREATE UNIQUE INDEX "meal_portion_logs_logged_by_request_id_key" ON "meal_portion_logs"("logged_by", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_portion_discrepancies_portion_log_id_key" ON "meal_portion_discrepancies"("portion_log_id");

-- AddForeignKey
ALTER TABLE "meal_portion_logs" ADD CONSTRAINT "meal_portion_logs_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_portion_logs" ADD CONSTRAINT "meal_portion_logs_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_portion_audits" ADD CONSTRAINT "meal_portion_audits_portion_log_id_fkey" FOREIGN KEY ("portion_log_id") REFERENCES "meal_portion_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_portion_audits" ADD CONSTRAINT "meal_portion_audits_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_portion_discrepancies" ADD CONSTRAINT "meal_portion_discrepancies_portion_log_id_fkey" FOREIGN KEY ("portion_log_id") REFERENCES "meal_portion_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_portion_discrepancies" ADD CONSTRAINT "meal_portion_discrepancies_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
