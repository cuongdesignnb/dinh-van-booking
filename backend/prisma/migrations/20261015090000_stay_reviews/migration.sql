-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "guest_session_id" UUID,
ADD COLUMN     "ip_hash" TEXT,
ADD COLUMN     "moderated_at" TIMESTAMPTZ(3),
ADD COLUMN     "moderated_by_id" UUID,
ADD COLUMN     "owner_reply" TEXT,
ADD COLUMN     "owner_reply_at" TIMESTAMPTZ(3),
ADD COLUMN     "owner_reply_by_id" UUID,
ADD COLUMN     "reject_reason" TEXT,
ADD COLUMN     "reviewer_phone" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'website',
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "review_media" (
    "review_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "review_media_pkey" PRIMARY KEY ("review_id","media_id")
);

-- CreateIndex
CREATE INDEX "review_media_media_id_idx" ON "review_media"("media_id");

-- CreateIndex
CREATE INDEX "reviews_moderation_created_at_idx" ON "reviews"("moderation", "created_at");

-- CreateIndex
CREATE INDEX "reviews_content_id_reviewer_phone_idx" ON "reviews"("content_id", "reviewer_phone");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_owner_reply_by_id_fkey" FOREIGN KEY ("owner_reply_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Review moderation permissions. Production never runs the seed, so the migration grants them.
INSERT INTO "permissions" ("id", "code", "description", "module")
VALUES
  (gen_random_uuid(), 'review.read', 'Xem đánh giá của khách', 'review'),
  (gen_random_uuid(), 'review.write', 'Duyệt, từ chối, trả lời và xoá đánh giá', 'review')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN ('review.read', 'review.write')
WHERE r."code" IN ('owner', 'operator', 'editor')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" = 'review.read'
WHERE r."code" = 'viewer'
ON CONFLICT DO NOTHING;
