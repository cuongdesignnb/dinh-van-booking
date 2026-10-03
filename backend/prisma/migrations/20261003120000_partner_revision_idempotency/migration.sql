ALTER TABLE partner_profile_revisions
  ADD COLUMN idempotency_key text,
  ADD COLUMN request_hash text;

CREATE UNIQUE INDEX partner_profile_revisions_idempotency_scope_key
  ON partner_profile_revisions (organization_id, submitted_by_id, idempotency_key);
