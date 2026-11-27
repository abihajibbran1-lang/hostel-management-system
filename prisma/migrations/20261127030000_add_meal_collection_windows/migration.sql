CREATE TABLE "meal_collection_windows" (
  "meal_type" "MealType" PRIMARY KEY,
  "opens_at" TEXT NOT NULL,
  "closes_at" TEXT NOT NULL,
  CONSTRAINT "meal_collection_windows_valid_time" CHECK (
    "opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "opens_at" < "closes_at"
  )
);

INSERT INTO "meal_collection_windows" ("meal_type", "opens_at", "closes_at")
VALUES ('Breakfast', '08:00', '09:00'), ('Lunch', '14:00', '15:00'), ('Dinner', '20:00', '21:00');
