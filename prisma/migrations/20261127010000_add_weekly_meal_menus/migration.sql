CREATE TYPE "WeeklyMenuStatus" AS ENUM ('Draft', 'Published', 'Archived');
CREATE TYPE "MealType" AS ENUM ('Breakfast', 'Lunch', 'Dinner');

CREATE TABLE "weekly_menus" (
  "id" UUID PRIMARY KEY,
  "week_start_date" DATE NOT NULL CHECK (EXTRACT(ISODOW FROM "week_start_date") = 1),
  "status" "WeeklyMenuStatus" NOT NULL DEFAULT 'Draft',
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weekly_menus_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "menu_items" (
  "id" UUID PRIMARY KEY,
  "weekly_menu_id" UUID NOT NULL,
  "meal_date" DATE NOT NULL,
  "meal_type" "MealType" NOT NULL,
  "item_name" TEXT NOT NULL CHECK (length(btrim("item_name")) > 0),
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "menu_items_weekly_menu_id_fkey" FOREIGN KEY ("weekly_menu_id") REFERENCES "weekly_menus"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "weekly_menus_week_start_date_key" ON "weekly_menus" ("week_start_date");
CREATE UNIQUE INDEX "menu_items_weekly_menu_id_meal_date_meal_type_key"
  ON "menu_items" ("weekly_menu_id", "meal_date", "meal_type");
