-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "disabled_at" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "csrf_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "idle_until" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "csrf_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT,
    "caption" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "processing_status" TEXT NOT NULL DEFAULT 'ready',
    "sha256" TEXT NOT NULL,
    "renditions" JSONB NOT NULL DEFAULT '{}',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_nodes" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug_source" TEXT,
    "excerpt" TEXT,
    "body_document" JSONB,
    "publication_status" TEXT NOT NULL DEFAULT 'draft',
    "publish_at" TIMESTAMPTZ(3),
    "meta_title" TEXT,
    "meta_description" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "og_media_id" UUID,
    "published_revision_id" UUID,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_revisions" (
    "id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "document_snapshot" JSONB NOT NULL,
    "note" TEXT,
    "author_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_media" (
    "content_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "content_media_pkey" PRIMARY KEY ("content_id","media_id","role")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "taxonomy" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_categories" (
    "content_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "content_categories_pkey" PRIMARY KEY ("content_id","category_id")
);

-- CreateTable
CREATE TABLE "public_routes" (
    "id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "redirect_status" INTEGER NOT NULL DEFAULT 301,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_menus" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "navigation_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "parent_id" UUID,
    "label" TEXT NOT NULL,
    "content_id" UUID,
    "external_url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "content_id" UUID NOT NULL,
    "page_key" TEXT NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("content_id")
);

-- CreateTable
CREATE TABLE "page_sections" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "section_key" TEXT NOT NULL,
    "block_type" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "position" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_items" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "content_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "section_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "content_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "map_x" DECIMAL(6,3),
    "map_y" DECIMAL(6,3),

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("content_id")
);

-- CreateTable
CREATE TABLE "articles" (
    "content_id" UUID NOT NULL,
    "author_name" TEXT,
    "read_minutes" INTEGER,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("content_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "customer_id" UUID,
    "booking_id" UUID,
    "author_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "stayed_at" DATE,
    "moderation" TEXT NOT NULL DEFAULT 'pending',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "supplier_id" UUID,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "inventory_mode" TEXT NOT NULL DEFAULT 'allotment',
    "operating_status" TEXT NOT NULL DEFAULT 'active',
    "check_in_time" TEXT NOT NULL DEFAULT '14:00',
    "check_out_time" TEXT NOT NULL DEFAULT '12:00',
    "approved_policies" JSONB NOT NULL DEFAULT '{}',
    "rating_average" DECIMAL(3,2),
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon_key" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'property',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "property_id" UUID NOT NULL,
    "amenity_id" UUID NOT NULL,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id","amenity_id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "max_adults" INTEGER NOT NULL,
    "max_children" INTEGER NOT NULL DEFAULT 0,
    "max_occupancy" INTEGER NOT NULL,
    "bed_summary" TEXT,
    "area_sqm" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "position" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_amenities" (
    "room_type_id" UUID NOT NULL,
    "amenity_id" UUID NOT NULL,

    CONSTRAINT "room_type_amenities_pkey" PRIMARY KEY ("room_type_id","amenity_id")
);

-- CreateTable
CREATE TABLE "room_units" (
    "id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_plans" (
    "id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_rate_vnd" BIGINT NOT NULL,
    "weekend_rate_vnd" BIGINT,
    "breakfast_included" BOOLEAN NOT NULL DEFAULT false,
    "min_stay_nights" INTEGER NOT NULL DEFAULT 1,
    "max_stay_nights" INTEGER,
    "tax_mode" TEXT NOT NULL DEFAULT 'inclusive',
    "inclusions" JSONB NOT NULL DEFAULT '[]',
    "cancellation_policy" JSONB NOT NULL DEFAULT '{}',
    "deposit_bps" INTEGER NOT NULL DEFAULT 3000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_rules" (
    "id" UUID NOT NULL,
    "rate_plan_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date_from" DATE NOT NULL,
    "date_to_exclusive" DATE NOT NULL,
    "weekday_mask" INTEGER NOT NULL DEFAULT 127,
    "rule_type" TEXT NOT NULL,
    "fixed_rate_vnd" BIGINT,
    "adjustment_bps" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_days" (
    "room_type_id" UUID NOT NULL,
    "stay_date" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "blocked_count" INTEGER NOT NULL DEFAULT 0,
    "held_count" INTEGER NOT NULL DEFAULT 0,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "stop_sell" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inventory_days_pkey" PRIMARY KEY ("room_type_id","stay_date")
);

-- CreateTable
CREATE TABLE "inventory_blocks" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(3),

    CONSTRAINT "inventory_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_block_nights" (
    "block_id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "stay_date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "inventory_block_nights_pkey" PRIMARY KEY ("block_id","room_type_id","stay_date")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" UUID NOT NULL,
    "booking_line_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',
    "expires_at" TIMESTAMPTZ(3),
    "released_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservation_nights" (
    "reservation_id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "stay_date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "inventory_reservation_nights_pkey" PRIMARY KEY ("reservation_id","room_type_id","stay_date")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "duration_nights" INTEGER NOT NULL,
    "pricing_unit" TEXT NOT NULL DEFAULT 'person',
    "fulfillment_mode" TEXT NOT NULL DEFAULT 'scheduled',
    "area" TEXT,
    "audience_tags" JSONB NOT NULL DEFAULT '[]',
    "inclusions" JSONB NOT NULL DEFAULT '[]',
    "exclusions" JSONB NOT NULL DEFAULT '[]',
    "terms" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_days" (
    "id" UUID NOT NULL,
    "combo_id" UUID NOT NULL,
    "day_no" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "time_range" TEXT,

    CONSTRAINT "combo_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_activities" (
    "id" UUID NOT NULL,
    "day_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "time_text" TEXT,
    "text" TEXT NOT NULL,

    CONSTRAINT "combo_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_destinations" (
    "combo_id" UUID NOT NULL,
    "destination_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "combo_destinations_pkey" PRIMARY KEY ("combo_id","destination_id")
);

-- CreateTable
CREATE TABLE "combo_departures" (
    "id" UUID NOT NULL,
    "combo_id" UUID NOT NULL,
    "departure_date" DATE NOT NULL,
    "return_date" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "held_count" INTEGER NOT NULL DEFAULT 0,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "adult_price_vnd" BIGINT NOT NULL,
    "child_price_vnd" BIGINT,
    "booking_cutoff" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "combo_departures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_room_requirements" (
    "id" UUID NOT NULL,
    "departure_id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "night_offset" INTEGER NOT NULL DEFAULT 0,
    "nights" INTEGER NOT NULL,
    "persons_per_room" INTEGER NOT NULL DEFAULT 2,
    "fixed_rooms_per_booking" INTEGER,

    CONSTRAINT "combo_room_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_reservations" (
    "id" UUID NOT NULL,
    "departure_id" UUID NOT NULL,
    "booking_line_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',
    "expires_at" TIMESTAMPTZ(3),
    "released_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combo_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "amount_vnd" BIGINT NOT NULL,
    "max_quantity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "addon_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_property_scopes" (
    "addon_service_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,

    CONSTRAINT "addon_property_scopes_pkey" PRIMARY KEY ("addon_service_id","property_id")
);

-- CreateTable
CREATE TABLE "addon_combo_scopes" (
    "addon_service_id" UUID NOT NULL,
    "combo_id" UUID NOT NULL,

    CONSTRAINT "addon_combo_scopes_pkey" PRIMARY KEY ("addon_service_id","combo_id")
);

-- CreateTable
CREATE TABLE "booking_quotes" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "owner_guest_session_id" UUID,
    "owner_user_id" UUID,
    "request_snapshot" JSONB NOT NULL,
    "priced_snapshot" JSONB NOT NULL,
    "pricing_version" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "subtotal_vnd" BIGINT NOT NULL,
    "discount_vnd" BIGINT NOT NULL DEFAULT 0,
    "total_vnd" BIGINT NOT NULL,
    "due_now_vnd" BIGINT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "public_code" TEXT NOT NULL,
    "quote_id" UUID,
    "customer_id" UUID NOT NULL,
    "inquiry_id" UUID,
    "booking_status" TEXT NOT NULL DEFAULT 'pending_confirmation',
    "payment_plan" TEXT NOT NULL DEFAULT 'deposit',
    "payment_method" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'website',
    "check_in" DATE,
    "check_out" DATE,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "subtotal_vnd" BIGINT NOT NULL,
    "discount_vnd" BIGINT NOT NULL DEFAULT 0,
    "total_vnd" BIGINT NOT NULL,
    "due_now_vnd" BIGINT NOT NULL,
    "contact_snapshot" JSONB NOT NULL,
    "policy_snapshot" JSONB NOT NULL,
    "note" TEXT,
    "cancel_reason" TEXT,
    "confirmed_at" TIMESTAMPTZ(3),
    "checked_in_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_lines" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "room_type_id" UUID,
    "combo_departure_id" UUID,
    "addon_service_id" UUID,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_vnd" BIGINT NOT NULL,
    "gross_vnd" BIGINT NOT NULL,
    "discount_vnd" BIGINT NOT NULL DEFAULT 0,
    "tax_vnd" BIGINT NOT NULL DEFAULT 0,
    "net_vnd" BIGINT NOT NULL,
    "service_date_from" DATE,
    "service_date_to" DATE,
    "price_breakdown" JSONB NOT NULL DEFAULT '{}',
    "service_snapshot" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "booking_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_events" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "event_type" TEXT NOT NULL,
    "detail" TEXT,
    "actor_id" UUID,
    "actor_label" TEXT NOT NULL DEFAULT 'Hệ thống',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_notes" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_access_tokens" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'view',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "provider" TEXT,
    "external_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "amount_vnd" BIGINT NOT NULL,
    "posted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "amount_vnd" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "external_reference" TEXT,
    "approved_by" UUID,
    "settled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL,
    "percent_bps" INTEGER,
    "amount_vnd" BIGINT,
    "max_discount_vnd" BIGINT,
    "min_subtotal_vnd" BIGINT,
    "usage_limit" INTEGER,
    "per_customer_limit" INTEGER,
    "reserved_uses" INTEGER NOT NULL DEFAULT 0,
    "committed_uses" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "savings_vnd" BIGINT NOT NULL,
    "committed_at" TIMESTAMPTZ(3),
    "released_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "phone_normalized" TEXT,
    "email" TEXT,
    "email_normalized" TEXT,
    "city" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website',
    "group_kind" TEXT NOT NULL DEFAULT 'family',
    "need" TEXT,
    "note" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '[]',
    "assigned_user_id" UUID,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "customer_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("customer_id","tag_id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "owner_user_id" UUID,
    "stage" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'website',
    "intent" TEXT,
    "related_content_id" UUID,
    "desired_check_in" DATE,
    "desired_check_out" DATE,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_stage_history" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "from_stage" TEXT,
    "to_stage" TEXT NOT NULL,
    "actor_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "author_user_id" UUID,
    "channel" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "delivery_status" TEXT NOT NULL DEFAULT 'not_sent',
    "body" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "assigned_user_id" UUID,
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pins" (
    "user_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pins_pkey" PRIMARY KEY ("user_id","content_id")
);

-- CreateTable
CREATE TABLE "inquiry_reads" (
    "user_id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_reads_pkey" PRIMARY KEY ("user_id","inquiry_id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "principal_scope" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_snapshot" JSONB,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "diff" JSONB,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "job_kind" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "processed" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guest_sessions_token_hash_key" ON "guest_sessions"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_sha256_idx" ON "media_assets"("sha256");

-- CreateIndex
CREATE INDEX "content_nodes_kind_publication_status_idx" ON "content_nodes"("kind", "publication_status");

-- CreateIndex
CREATE INDEX "content_revisions_content_id_created_at_idx" ON "content_revisions"("content_id", "created_at");

-- CreateIndex
CREATE INDEX "content_media_media_id_idx" ON "content_media"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_taxonomy_slug_key" ON "categories"("taxonomy", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "public_routes_path_key" ON "public_routes"("path");

-- CreateIndex
CREATE INDEX "public_routes_content_id_is_current_idx" ON "public_routes"("content_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "navigation_menus_key_key" ON "navigation_menus"("key");

-- CreateIndex
CREATE INDEX "navigation_items_menu_id_position_idx" ON "navigation_items"("menu_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "pages_page_key_key" ON "pages"("page_key");

-- CreateIndex
CREATE UNIQUE INDEX "page_sections_page_id_section_key_key" ON "page_sections"("page_id", "section_key");

-- CreateIndex
CREATE INDEX "section_items_section_id_position_idx" ON "section_items"("section_id", "position");

-- CreateIndex
CREATE INDEX "reviews_content_id_moderation_idx" ON "reviews"("content_id", "moderation");

-- CreateIndex
CREATE UNIQUE INDEX "properties_content_id_key" ON "properties"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "properties_code_key" ON "properties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_code_key" ON "amenities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_property_id_code_key" ON "room_types"("property_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "room_units_room_type_id_code_key" ON "room_units"("room_type_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "rate_plans_room_type_id_code_key" ON "rate_plans"("room_type_id", "code");

-- CreateIndex
CREATE INDEX "rate_rules_rate_plan_id_date_from_date_to_exclusive_idx" ON "rate_rules"("rate_plan_id", "date_from", "date_to_exclusive");

-- CreateIndex
CREATE INDEX "inventory_reservations_status_expires_at_idx" ON "inventory_reservations"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "combos_content_id_key" ON "combos"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "combos_code_key" ON "combos"("code");

-- CreateIndex
CREATE UNIQUE INDEX "combo_days_combo_id_day_no_key" ON "combo_days"("combo_id", "day_no");

-- CreateIndex
CREATE INDEX "combo_activities_day_id_position_idx" ON "combo_activities"("day_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "combo_departures_combo_id_departure_date_key" ON "combo_departures"("combo_id", "departure_date");

-- CreateIndex
CREATE UNIQUE INDEX "combo_room_requirements_departure_id_room_type_id_night_off_key" ON "combo_room_requirements"("departure_id", "room_type_id", "night_offset");

-- CreateIndex
CREATE INDEX "combo_reservations_status_expires_at_idx" ON "combo_reservations"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "addon_services_code_key" ON "addon_services"("code");

-- CreateIndex
CREATE INDEX "booking_quotes_expires_at_idx" ON "booking_quotes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_public_code_key" ON "bookings"("public_code");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_quote_id_key" ON "bookings"("quote_id");

-- CreateIndex
CREATE INDEX "bookings_booking_status_check_in_idx" ON "bookings"("booking_status", "check_in");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX "booking_lines_booking_id_idx" ON "booking_lines"("booking_id");

-- CreateIndex
CREATE INDEX "booking_events_booking_id_created_at_idx" ON "booking_events"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "booking_notes_booking_id_created_at_idx" ON "booking_notes"("booking_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "booking_access_tokens_token_hash_key" ON "booking_access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_external_reference_key" ON "payments"("provider", "external_reference");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_coupon_id_booking_id_key" ON "coupon_redemptions"("coupon_id", "booking_id");

-- CreateIndex
CREATE INDEX "customers_phone_normalized_idx" ON "customers"("phone_normalized");

-- CreateIndex
CREATE INDEX "customers_email_normalized_idx" ON "customers"("email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "inquiries_stage_created_at_idx" ON "inquiries"("stage", "created_at");

-- CreateIndex
CREATE INDEX "inquiry_stage_history_inquiry_id_created_at_idx" ON "inquiry_stage_history"("inquiry_id", "created_at");

-- CreateIndex
CREATE INDEX "interactions_inquiry_id_occurred_at_idx" ON "interactions"("inquiry_id", "occurred_at");

-- CreateIndex
CREATE INDEX "follow_ups_status_due_at_idx" ON "follow_ups"("status", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_dedupe_key_key" ON "outbox_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "outbox_events_processed_at_available_at_idx" ON "outbox_events"("processed_at", "available_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_principal_scope_operation_key_key" ON "idempotency_keys"("principal_scope", "operation", "key");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "job_runs_job_kind_started_at_idx" ON "job_runs"("job_kind", "started_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_nodes" ADD CONSTRAINT "content_nodes_og_media_id_fkey" FOREIGN KEY ("og_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_routes" ADD CONSTRAINT "public_routes_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "navigation_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "navigation_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("content_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_items" ADD CONSTRAINT "section_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "page_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_items" ADD CONSTRAINT "section_items_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_units" ADD CONSTRAINT "room_units_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_rules" ADD CONSTRAINT "rate_rules_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_days" ADD CONSTRAINT "inventory_days_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_block_nights" ADD CONSTRAINT "inventory_block_nights_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "inventory_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_block_nights" ADD CONSTRAINT "inventory_block_nights_room_type_id_stay_date_fkey" FOREIGN KEY ("room_type_id", "stay_date") REFERENCES "inventory_days"("room_type_id", "stay_date") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_block_nights" ADD CONSTRAINT "inventory_block_nights_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_booking_line_id_fkey" FOREIGN KEY ("booking_line_id") REFERENCES "booking_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_nights" ADD CONSTRAINT "inventory_reservation_nights_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "inventory_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_nights" ADD CONSTRAINT "inventory_reservation_nights_room_type_id_stay_date_fkey" FOREIGN KEY ("room_type_id", "stay_date") REFERENCES "inventory_days"("room_type_id", "stay_date") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_nights" ADD CONSTRAINT "inventory_reservation_nights_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combos" ADD CONSTRAINT "combos_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_days" ADD CONSTRAINT "combo_days_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_activities" ADD CONSTRAINT "combo_activities_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "combo_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_destinations" ADD CONSTRAINT "combo_destinations_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_destinations" ADD CONSTRAINT "combo_destinations_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("content_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_departures" ADD CONSTRAINT "combo_departures_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_room_requirements" ADD CONSTRAINT "combo_room_requirements_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "combo_departures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_room_requirements" ADD CONSTRAINT "combo_room_requirements_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_reservations" ADD CONSTRAINT "combo_reservations_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "combo_departures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_reservations" ADD CONSTRAINT "combo_reservations_booking_line_id_fkey" FOREIGN KEY ("booking_line_id") REFERENCES "booking_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_property_scopes" ADD CONSTRAINT "addon_property_scopes_addon_service_id_fkey" FOREIGN KEY ("addon_service_id") REFERENCES "addon_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_property_scopes" ADD CONSTRAINT "addon_property_scopes_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_combo_scopes" ADD CONSTRAINT "addon_combo_scopes_addon_service_id_fkey" FOREIGN KEY ("addon_service_id") REFERENCES "addon_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_combo_scopes" ADD CONSTRAINT "addon_combo_scopes_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_quotes" ADD CONSTRAINT "booking_quotes_owner_guest_session_id_fkey" FOREIGN KEY ("owner_guest_session_id") REFERENCES "guest_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_quotes" ADD CONSTRAINT "booking_quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "booking_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_lines" ADD CONSTRAINT "booking_lines_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_lines" ADD CONSTRAINT "booking_lines_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_lines" ADD CONSTRAINT "booking_lines_combo_departure_id_fkey" FOREIGN KEY ("combo_departure_id") REFERENCES "combo_departures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_lines" ADD CONSTRAINT "booking_lines_addon_service_id_fkey" FOREIGN KEY ("addon_service_id") REFERENCES "addon_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_notes" ADD CONSTRAINT "booking_notes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_access_tokens" ADD CONSTRAINT "booking_access_tokens_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_stage_history" ADD CONSTRAINT "inquiry_stage_history_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pins" ADD CONSTRAINT "user_pins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pins" ADD CONSTRAINT "user_pins_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_reads" ADD CONSTRAINT "inquiry_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_reads" ADD CONSTRAINT "inquiry_reads_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
