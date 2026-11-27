-- CreateEnum
CREATE TYPE "MealReservationStatus" AS ENUM ('Reserved', 'Cancelled', 'Fulfilled');

-- CreateTable
CREATE TABLE "meal_approvals" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "approved_by" UUID NOT NULL,
    "meal_date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_reservations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "submitted_house_id" UUID,
    "meal_date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "status" "MealReservationStatus" NOT NULL DEFAULT 'Reserved',
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_allocation_snapshots" (
    "id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "menu_item_id" UUID,
    "item_name_snapshot" TEXT NOT NULL,
    "meal_date_snapshot" DATE NOT NULL,
    "meal_type_snapshot" "MealType" NOT NULL,
    "portion_count" INTEGER NOT NULL CHECK ("portion_count" > 0),
    "snapshot_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_allocation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_collection_notices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "submitted_house_id" UUID,
    "reservation_id" UUID,
    "request_id" UUID NOT NULL,
    "meal_date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "explanation" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_collection_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_approvals_student_id_meal_date_meal_type_key" ON "meal_approvals"("student_id", "meal_date", "meal_type");

-- CreateIndex
CREATE INDEX "meal_reservations_submitted_house_id_reserved_at_idx" ON "meal_reservations"("submitted_house_id", "reserved_at");

-- CreateIndex
CREATE UNIQUE INDEX "meal_reservations_user_id_meal_date_meal_type_key" ON "meal_reservations"("user_id", "meal_date", "meal_type");

-- CreateIndex
CREATE INDEX "meal_allocation_snapshots_reservation_id_idx" ON "meal_allocation_snapshots"("reservation_id");

-- CreateIndex
CREATE INDEX "meal_collection_notices_submitted_house_id_submitted_at_idx" ON "meal_collection_notices"("submitted_house_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "meal_collection_notices_user_id_request_id_key" ON "meal_collection_notices"("user_id", "request_id");

-- AddForeignKey
ALTER TABLE "meal_approvals" ADD CONSTRAINT "meal_approvals_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_approvals" ADD CONSTRAINT "meal_approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_reservations" ADD CONSTRAINT "meal_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_reservations" ADD CONSTRAINT "meal_reservations_submitted_house_id_fkey" FOREIGN KEY ("submitted_house_id") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_allocation_snapshots" ADD CONSTRAINT "meal_allocation_snapshots_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "meal_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_allocation_snapshots" ADD CONSTRAINT "meal_allocation_snapshots_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_collection_notices" ADD CONSTRAINT "meal_collection_notices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_collection_notices" ADD CONSTRAINT "meal_collection_notices_submitted_house_id_fkey" FOREIGN KEY ("submitted_house_id") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_collection_notices" ADD CONSTRAINT "meal_collection_notices_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "meal_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
