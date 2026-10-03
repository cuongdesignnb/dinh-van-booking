-- Additive partner/inventory/Sheets core. Existing catalog rows and booking
-- commitments are retained; the reconciliation below only records unexplained
-- blocked units and never changes heldCount/reservedCount/capacity.

ALTER TABLE "room_types"
  ADD COLUMN "inventory_scope" TEXT NOT NULL DEFAULT 'ALLOTMENT',
  ADD COLUMN "approved_pool_limit" INTEGER;
ALTER TABLE "room_types"
  ADD CONSTRAINT "room_types_inventory_scope_check" CHECK ("inventory_scope" IN ('ALLOTMENT', 'FULL_PROPERTY')),
  ADD CONSTRAINT "room_types_approved_pool_limit_check" CHECK ("approved_pool_limit" IS NULL OR "approved_pool_limit" >= 0);

ALTER TABLE "inventory_days"
  ADD COLUMN "last_confirmed_at" TIMESTAMPTZ(3),
  ADD COLUMN "last_confirmed_by_id" UUID,
  ADD COLUMN "last_confirmed_source" TEXT;

ALTER TABLE "inventory_blocks"
  ADD COLUMN "owner_organization_id" UUID,
  ADD COLUMN "source_key" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "inventory_blocks_source_key_key" ON "inventory_blocks"("source_key");
CREATE INDEX "inventory_blocks_owner_organization_id_idx" ON "inventory_blocks"("owner_organization_id");

CREATE TABLE "partner_organizations" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "legal_name" TEXT,
  "contact_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT,
  "organization_type" TEXT NOT NULL DEFAULT 'property_owner',
  "status" TEXT NOT NULL DEFAULT 'pending_review',
  "verification_status" TEXT NOT NULL DEFAULT 'manual_review',
  "supplier_id" UUID,
  "created_by_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "partner_organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_organizations_supplier_id_key" ON "partner_organizations"("supplier_id");
CREATE INDEX "partner_organizations_status_created_at_idx" ON "partner_organizations"("status", "created_at");
ALTER TABLE "partner_organizations" ADD CONSTRAINT "partner_organizations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partner_organizations" ADD CONSTRAINT "partner_organizations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD COLUMN "owner_organization_id" UUID, ADD COLUMN "uploaded_by_id" UUID;
CREATE INDEX "media_assets_owner_organization_id_idx" ON "media_assets"("owner_organization_id");
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_organization_id_fkey" FOREIGN KEY ("owner_organization_id") REFERENCES "partner_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "partner_applications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "submitted_name" TEXT NOT NULL,
  "submitted_email" TEXT NOT NULL,
  "submitted_phone" TEXT NOT NULL,
  "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewer_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "review_note" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partner_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "partner_applications_user_id_organization_id_key" ON "partner_applications"("user_id", "organization_id");
CREATE INDEX "partner_applications_status_submitted_at_idx" ON "partner_applications"("status", "submitted_at");

CREATE TABLE "partner_memberships" (
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "status" TEXT NOT NULL DEFAULT 'active',
  "granted_by_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "partner_memberships_pkey" PRIMARY KEY ("organization_id", "user_id"),
  CONSTRAINT "partner_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "partner_memberships_user_id_status_idx" ON "partner_memberships"("user_id", "status");

CREATE TABLE "property_access_claims" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "requested_by_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reason" TEXT,
  "reviewer_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "review_note" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_access_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_access_claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "property_access_claims_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "property_access_claims_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "property_access_claims_one_pending_per_org_property_key" ON "property_access_claims"("organization_id", "property_id") WHERE "status" = 'pending';
CREATE INDEX "property_access_claims_status_created_at_idx" ON "property_access_claims"("status", "created_at");

CREATE TABLE "partner_property_grants" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "claim_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'active',
  "can_read_inventory" BOOLEAN NOT NULL DEFAULT TRUE,
  "can_write_inventory" BOOLEAN NOT NULL DEFAULT FALSE,
  "can_edit_rates" BOOLEAN NOT NULL DEFAULT FALSE,
  "can_edit_profile" BOOLEAN NOT NULL DEFAULT FALSE,
  "can_upload_media" BOOLEAN NOT NULL DEFAULT FALSE,
  "room_type_scope" JSONB NOT NULL DEFAULT '[]',
  "approved_by_id" UUID,
  "approved_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "partner_property_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partner_property_grants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_property_grants_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_property_grants_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "property_access_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "partner_property_grants_claim_id_key" ON "partner_property_grants"("claim_id");
CREATE UNIQUE INDEX "partner_property_grants_organization_id_property_id_key" ON "partner_property_grants"("organization_id", "property_id");
CREATE INDEX "partner_property_grants_property_id_status_idx" ON "partner_property_grants"("property_id", "status");
CREATE INDEX "partner_property_grants_organization_id_status_idx" ON "partner_property_grants"("organization_id", "status");

CREATE TABLE "partner_profile_revisions" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "room_type_id" UUID,
  "target_rate_plan_id" UUID,
  "revision" INTEGER NOT NULL,
  "base_version" INTEGER NOT NULL,
  "content_base_version" INTEGER,
  "proposed" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "submitted_by_id" UUID NOT NULL,
  "reviewed_by_id" UUID,
  "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ(3),
  "review_note" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "partner_profile_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partner_profile_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_profile_revisions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_profile_revisions_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "partner_profile_revisions_target_rate_plan_id_fkey" FOREIGN KEY ("target_rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "partner_profile_revisions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "partner_profile_revisions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "partner_profile_revisions_org_property_revision_key" ON "partner_profile_revisions"("organization_id", "property_id", "revision");
CREATE INDEX "partner_profile_revisions_status_submitted_at_idx" ON "partner_profile_revisions"("status", "submitted_at");

CREATE TABLE "partner_notifications" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "read_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dedupe_key" TEXT,
  CONSTRAINT "partner_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partner_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "partner_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "partner_notifications_user_id_read_at_created_at_idx" ON "partner_notifications"("user_id", "read_at", "created_at");
CREATE UNIQUE INDEX "partner_notifications_dedupe_key_key" ON "partner_notifications"("dedupe_key");

CREATE TABLE "inventory_integrity_incidents" (
  "id" UUID NOT NULL,
  "room_type_id" UUID NOT NULL,
  "stay_date" DATE NOT NULL,
  "kind" TEXT NOT NULL,
  "recorded_blocked_count" INTEGER NOT NULL,
  "ledger_blocked_count" INTEGER NOT NULL,
  "detected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(3),
  "detail" TEXT,
  CONSTRAINT "inventory_integrity_incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_integrity_incidents_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "inventory_integrity_incidents_resolved_at_detected_at_idx" ON "inventory_integrity_incidents"("resolved_at", "detected_at");

-- Report over-counted ledger rows; do not alter those rows or counters.
WITH ledger AS (
  SELECT d.room_type_id, d.stay_date, d.blocked_count,
         COALESCE(SUM(n.quantity) FILTER (WHERE b.status = 'active'), 0)::INTEGER AS ledger_count
  FROM inventory_days d
  LEFT JOIN inventory_block_nights n ON n.room_type_id = d.room_type_id AND n.stay_date = d.stay_date
  LEFT JOIN inventory_blocks b ON b.id = n.block_id
  GROUP BY d.room_type_id, d.stay_date, d.blocked_count
)
INSERT INTO inventory_integrity_incidents (id, room_type_id, stay_date, kind, recorded_blocked_count, ledger_blocked_count, detail)
SELECT gen_random_uuid(), room_type_id, stay_date, 'ledger_exceeds_counter', blocked_count, ledger_count,
       'Existing active inventory block ledger exceeds the stored blocked_count; requires operator review.'
FROM ledger WHERE ledger_count > blocked_count;

-- Only unclassified positive gaps are captured as legacy blocks, preserving the
-- previous counter exactly. No booking or commitment counter is touched.
WITH ledger AS (
  SELECT d.room_type_id, d.stay_date, d.blocked_count,
         COALESCE(SUM(n.quantity) FILTER (WHERE b.status = 'active'), 0)::INTEGER AS ledger_count
  FROM inventory_days d
  LEFT JOIN inventory_block_nights n ON n.room_type_id = d.room_type_id AND n.stay_date = d.stay_date
  LEFT JOIN inventory_blocks b ON b.id = n.block_id
  GROUP BY d.room_type_id, d.stay_date, d.blocked_count
), gaps AS (
  SELECT room_type_id, stay_date, blocked_count - ledger_count AS gap
  FROM ledger WHERE blocked_count > ledger_count
)
INSERT INTO inventory_blocks (id, kind, reason, status, source_key, version)
SELECT gen_random_uuid(), 'legacy_unclassified', 'Preserved from pre-ledger blockedCount; source is not verified', 'active',
       'legacy_unclassified:' || room_type_id::TEXT || ':' || stay_date::TEXT, 1
FROM gaps WHERE gap > 0
ON CONFLICT (source_key) DO NOTHING;
WITH ledger AS (
  SELECT d.room_type_id, d.stay_date, d.blocked_count,
         COALESCE(SUM(n.quantity) FILTER (WHERE b.status = 'active'), 0)::INTEGER AS ledger_count
  FROM inventory_days d
  LEFT JOIN inventory_block_nights n ON n.room_type_id = d.room_type_id AND n.stay_date = d.stay_date
  LEFT JOIN inventory_blocks b ON b.id = n.block_id
  GROUP BY d.room_type_id, d.stay_date, d.blocked_count
), gaps AS (
  SELECT room_type_id, stay_date, blocked_count - ledger_count AS gap
  FROM ledger WHERE blocked_count > ledger_count
)
INSERT INTO inventory_block_nights (block_id, room_type_id, stay_date, quantity)
SELECT b.id, g.room_type_id, g.stay_date, g.gap
FROM gaps g
JOIN inventory_blocks b ON b.source_key = 'legacy_unclassified:' || g.room_type_id::TEXT || ':' || g.stay_date::TEXT
WHERE g.gap > 0
ON CONFLICT (block_id, room_type_id, stay_date) DO NOTHING;

CREATE TABLE "inventory_changes" (
  "id" UUID NOT NULL,
  "organization_id" UUID,
  "room_type_id" UUID NOT NULL,
  "stay_date" DATE NOT NULL,
  "source" TEXT NOT NULL,
  "command" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "from_snapshot" JSONB NOT NULL,
  "to_snapshot" JSONB NOT NULL,
  "actor_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_changes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "inventory_changes_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_changes_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "inventory_changes_source_key_room_date_key" ON "inventory_changes"("source", "idempotency_key", "room_type_id", "stay_date");
CREATE INDEX "inventory_changes_room_type_id_stay_date_created_at_idx" ON "inventory_changes"("room_type_id", "stay_date", "created_at");

CREATE TABLE "partner_rate_limits" (
  "organization_id" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "subject_hash" TEXT NOT NULL,
  "window_started_at" TIMESTAMPTZ(3) NOT NULL,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "blocked_until" TIMESTAMPTZ(3),
  CONSTRAINT "partner_rate_limits_pkey" PRIMARY KEY ("organization_id", "scope", "subject_hash"),
  CONSTRAINT "partner_rate_limits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "auth_rate_limits" (
  "scope" TEXT NOT NULL,
  "subject_hash" TEXT NOT NULL,
  "window_started_at" TIMESTAMPTZ(3) NOT NULL,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "blocked_until" TIMESTAMPTZ(3),
  CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("scope", "subject_hash")
);

CREATE TABLE "sheet_workbooks" (
  "id" UUID NOT NULL,
  "spreadsheet_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end_exclusive" DATE NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'active',
  "import_paused" BOOLEAN NOT NULL DEFAULT TRUE,
  "export_paused" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sheet_workbooks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sheet_workbooks_period_check" CHECK ("period_end_exclusive" > "period_start")
);
CREATE UNIQUE INDEX "sheet_workbooks_spreadsheet_id_key" ON "sheet_workbooks"("spreadsheet_id");
CREATE INDEX "sheet_workbooks_period_status_idx" ON "sheet_workbooks"("period_start", "period_end_exclusive", "status");

CREATE TABLE "sheet_property_bindings" (
  "id" UUID NOT NULL,
  "workbook_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "sheet_id" TEXT NOT NULL,
  "sheet_title" TEXT NOT NULL,
  "output_range" TEXT NOT NULL,
  "input_range" TEXT NOT NULL,
  "result_range" TEXT NOT NULL,
  "next_input_row" INTEGER NOT NULL DEFAULT 1,
  "next_result_row" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sheet_property_bindings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sheet_property_bindings_workbook_id_fkey" FOREIGN KEY ("workbook_id") REFERENCES "sheet_workbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sheet_property_bindings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "partner_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sheet_property_bindings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sheet_property_bindings_workbook_property_key" ON "sheet_property_bindings"("workbook_id", "property_id");
CREATE UNIQUE INDEX "sheet_property_bindings_workbook_sheet_key" ON "sheet_property_bindings"("workbook_id", "sheet_id");
CREATE INDEX "sheet_property_bindings_org_status_idx" ON "sheet_property_bindings"("organization_id", "status");

CREATE TABLE "sheet_draft_batches" (
  "id" UUID NOT NULL,
  "binding_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "baseline" JSONB NOT NULL,
  "payload_hash" TEXT,
  "projection_status" TEXT NOT NULL DEFAULT 'pending',
  "projection_error" TEXT,
  "projected_at" TIMESTAMPTZ(3),
  "input_start_row" INTEGER NOT NULL,
  "result_start_row" INTEGER NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "submitted_at" TIMESTAMPTZ(3),
  "applied_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sheet_draft_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sheet_draft_batches_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "sheet_property_bindings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "sheet_draft_batches_status_expires_at_idx" ON "sheet_draft_batches"("status", "expires_at");

CREATE TABLE "sheet_draft_items" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "room_type_id" UUID NOT NULL,
  "stay_date" DATE NOT NULL,
  "command" TEXT NOT NULL,
  "base_version" INTEGER NOT NULL,
  "baseline" JSONB NOT NULL,
  "proposed" JSONB,
  "result" JSONB,
  "row_position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sheet_draft_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sheet_draft_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "sheet_draft_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sheet_draft_items_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sheet_draft_items_batch_room_date_key" ON "sheet_draft_items"("batch_id", "room_type_id", "stay_date");
CREATE INDEX "sheet_draft_items_room_date_idx" ON "sheet_draft_items"("room_type_id", "stay_date");

CREATE TABLE "sheet_sync_runs" (
  "id" UUID NOT NULL,
  "workbook_id" UUID,
  "direction" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ(3),
  "finished_at" TIMESTAMPTZ(3),
  "detail" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sheet_sync_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sheet_sync_runs_workbook_id_fkey" FOREIGN KEY ("workbook_id") REFERENCES "sheet_workbooks"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "sheet_sync_runs_status_created_at_idx" ON "sheet_sync_runs"("status", "created_at");

CREATE TABLE "inventory_conflicts" (
  "id" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "source_id" UUID NOT NULL,
  "room_type_id" UUID NOT NULL,
  "stay_date" DATE NOT NULL,
  "base_snapshot" JSONB NOT NULL,
  "current_snapshot" JSONB NOT NULL,
  "proposed_snapshot" JSONB NOT NULL,
  "current_version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "resolved_by_id" UUID,
  "resolved_at" TIMESTAMPTZ(3),
  "resolution" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_conflicts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_conflicts_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "inventory_conflicts_status_created_at_idx" ON "inventory_conflicts"("status", "created_at");
CREATE UNIQUE INDEX "inventory_conflicts_source_batch_room_date_key" ON "inventory_conflicts"("source", "source_id", "room_type_id", "stay_date");

ALTER TABLE "inventory_blocks" ADD CONSTRAINT "inventory_blocks_owner_organization_id_fkey" FOREIGN KEY ("owner_organization_id") REFERENCES "partner_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
