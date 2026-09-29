-- A contact request may name a specific public room category and desired
-- number of rooms. Keep both nullable so older/general inquiries remain valid.
ALTER TABLE "inquiries"
  ADD COLUMN "related_room_type_id" UUID,
  ADD COLUMN "requested_rooms" INTEGER;

ALTER TABLE "inquiries"
  ADD CONSTRAINT "inquiries_requested_rooms_check"
    CHECK ("requested_rooms" IS NULL OR "requested_rooms" BETWEEN 1 AND 5),
  ADD CONSTRAINT "inquiries_related_room_type_id_fkey"
    FOREIGN KEY ("related_room_type_id") REFERENCES "room_types"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "inquiries_related_room_type_id_idx" ON "inquiries"("related_room_type_id");
