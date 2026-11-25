CREATE TABLE "houses" (
    "id" UUID PRIMARY KEY,
    "name" TEXT NOT NULL,
    "primary_warden_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "house_wardens" (
    "house_id" UUID NOT NULL REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "house_wardens_pkey" PRIMARY KEY ("house_id", "user_id")
);

CREATE TABLE "rooms" (
    "id" UUID PRIMARY KEY,
    "house_id" UUID NOT NULL REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "room_number" TEXT NOT NULL,
    "block" TEXT,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL CHECK ("capacity" > 0),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "room_residents" (
    "id" UUID PRIMARY KEY,
    "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "assigned_at" TIMESTAMP(3) NOT NULL,
    "assigned_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "ended_at" TIMESTAMP(3),
    "ended_by" UUID REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "previous_id" UUID REFERENCES "room_residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "change_type" TEXT NOT NULL,
    CONSTRAINT "room_residents_valid_interval" CHECK ("ended_at" IS NULL OR "ended_at" >= "assigned_at")
);

CREATE UNIQUE INDEX "houses_name_key" ON "houses"("name");
CREATE INDEX "houses_primary_warden_id_idx" ON "houses"("primary_warden_id");
CREATE INDEX "house_wardens_user_id_idx" ON "house_wardens"("user_id");
CREATE UNIQUE INDEX "rooms_room_number_key" ON "rooms"("room_number");
CREATE INDEX "rooms_house_id_idx" ON "rooms"("house_id");
CREATE UNIQUE INDEX "room_residents_previous_id_key" ON "room_residents"("previous_id");
CREATE INDEX "room_residents_room_id_ended_at_idx" ON "room_residents"("room_id", "ended_at");
CREATE INDEX "room_residents_user_id_idx" ON "room_residents"("user_id");
CREATE UNIQUE INDEX "room_residents_one_current_membership"
  ON "room_residents"("user_id") WHERE "ended_at" IS NULL;
