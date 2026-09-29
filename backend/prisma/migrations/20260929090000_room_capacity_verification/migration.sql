-- Imported room names may be real while the required numeric capacity is a
-- technical sentinel. Keep those drafts unverified. Preserve already-sellable
-- active rooms, which had explicit capacity, units and a rate before this gate.
ALTER TABLE "room_types" ADD COLUMN "capacity_verified" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "room_types" AS room
SET "capacity_verified" = TRUE
WHERE room."status" = 'active'
  AND room."max_adults" > 0
  AND EXISTS (
    SELECT 1 FROM "room_units" AS unit
    WHERE unit."room_type_id" = room."id" AND unit."active" = TRUE
  )
  AND EXISTS (
    SELECT 1 FROM "rate_plans" AS rate
    WHERE rate."room_type_id" = room."id" AND rate."active" = TRUE
  );
