-- Additive SEO publication metadata. Existing records are deliberately left NULL:
-- created_at/updated_at do not prove when a page was first published or changed publicly.
ALTER TABLE "content_nodes"
  ADD COLUMN "first_published_at" TIMESTAMPTZ(3),
  ADD COLUMN "last_public_changed_at" TIMESTAMPTZ(3);

ALTER TABLE "content_revisions"
  ADD COLUMN "content_snapshot" JSONB;
