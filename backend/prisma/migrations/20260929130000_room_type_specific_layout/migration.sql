-- Optional, per-room-category facts. Existing imported categories remain
-- unverified until an administrator explicitly fills them in.
ALTER TABLE "room_types"
  ADD COLUMN "unit_kind" TEXT,
  ADD COLUMN "bedroom_count" INTEGER,
  ADD COLUMN "bathroom_count" INTEGER;

ALTER TABLE "room_types"
  ADD CONSTRAINT "room_types_bedroom_count_check" CHECK ("bedroom_count" IS NULL OR "bedroom_count" BETWEEN 0 AND 30),
  ADD CONSTRAINT "room_types_bathroom_count_check" CHECK ("bathroom_count" IS NULL OR "bathroom_count" BETWEEN 0 AND 30);
