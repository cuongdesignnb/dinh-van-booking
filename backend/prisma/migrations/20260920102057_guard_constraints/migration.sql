-- Invariants Prisma cannot express in the schema language. They are the last
-- line of defence: the services still check these before writing.

-- Inventory can never be oversold, and a night cannot hold negative rooms.
ALTER TABLE "inventory_days"
  ADD CONSTRAINT "inventory_days_counts_nonneg"
    CHECK ("capacity" >= 0 AND "blocked_count" >= 0 AND "held_count" >= 0 AND "reserved_count" >= 0),
  ADD CONSTRAINT "inventory_days_within_capacity"
    CHECK ("blocked_count" + "held_count" + "reserved_count" <= "capacity");

ALTER TABLE "inventory_block_nights"
  ADD CONSTRAINT "inventory_block_nights_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "inventory_reservation_nights"
  ADD CONSTRAINT "inventory_reservation_nights_quantity_positive" CHECK ("quantity" > 0);

-- A stay is the half-open range [check_in, check_out).
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_stay_range"
    CHECK ("check_in" IS NULL OR "check_out" IS NULL OR "check_out" > "check_in"),
  ADD CONSTRAINT "bookings_guests_nonneg" CHECK ("adults" >= 0 AND "children" >= 0),
  ADD CONSTRAINT "bookings_money_nonneg"
    CHECK ("subtotal_vnd" >= 0 AND "discount_vnd" >= 0 AND "total_vnd" >= 0 AND "due_now_vnd" >= 0),
  ADD CONSTRAINT "bookings_due_within_total" CHECK ("due_now_vnd" <= "total_vnd");

ALTER TABLE "booking_lines"
  ADD CONSTRAINT "booking_lines_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "booking_lines_money_nonneg"
    CHECK ("unit_price_vnd" >= 0 AND "gross_vnd" >= 0 AND "discount_vnd" >= 0 AND "tax_vnd" >= 0 AND "net_vnd" >= 0),
  ADD CONSTRAINT "booking_lines_service_range"
    CHECK ("service_date_from" IS NULL OR "service_date_to" IS NULL OR "service_date_to" >= "service_date_from");

ALTER TABLE "booking_quotes"
  ADD CONSTRAINT "booking_quotes_money_nonneg"
    CHECK ("subtotal_vnd" >= 0 AND "discount_vnd" >= 0 AND "total_vnd" >= 0 AND "due_now_vnd" >= 0);

ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount_vnd" > 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_positive" CHECK ("amount_vnd" > 0);

-- Rate rules use the same half-open convention as stays.
ALTER TABLE "rate_rules"
  ADD CONSTRAINT "rate_rules_date_range" CHECK ("date_to_exclusive" > "date_from"),
  ADD CONSTRAINT "rate_rules_weekday_mask" CHECK ("weekday_mask" BETWEEN 0 AND 127);

ALTER TABLE "rate_plans"
  ADD CONSTRAINT "rate_plans_rate_nonneg"
    CHECK ("base_rate_vnd" >= 0 AND ("weekend_rate_vnd" IS NULL OR "weekend_rate_vnd" >= 0)),
  ADD CONSTRAINT "rate_plans_stay_window"
    CHECK ("min_stay_nights" >= 1 AND ("max_stay_nights" IS NULL OR "max_stay_nights" >= "min_stay_nights")),
  ADD CONSTRAINT "rate_plans_deposit_bps" CHECK ("deposit_bps" BETWEEN 0 AND 10000);

ALTER TABLE "combo_departures"
  ADD CONSTRAINT "combo_departures_date_order" CHECK ("return_date" >= "departure_date"),
  ADD CONSTRAINT "combo_departures_counts_nonneg"
    CHECK ("capacity" >= 0 AND "held_count" >= 0 AND "reserved_count" >= 0),
  ADD CONSTRAINT "combo_departures_within_capacity"
    CHECK ("held_count" + "reserved_count" <= "capacity"),
  ADD CONSTRAINT "combo_departures_price_nonneg"
    CHECK ("adult_price_vnd" >= 0 AND ("child_price_vnd" IS NULL OR "child_price_vnd" >= 0));

ALTER TABLE "combo_reservations" ADD CONSTRAINT "combo_reservations_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_percent_bps" CHECK ("percent_bps" IS NULL OR "percent_bps" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "coupons_uses_nonneg" CHECK ("reserved_uses" >= 0 AND "committed_uses" >= 0),
  ADD CONSTRAINT "coupons_within_usage_limit"
    CHECK ("usage_limit" IS NULL OR "reserved_uses" + "committed_uses" <= "usage_limit"),
  ADD CONSTRAINT "coupons_shape"
    CHECK (("discount_type" = 'percent' AND "percent_bps" IS NOT NULL)
        OR ("discount_type" = 'amount' AND "amount_vnd" IS NOT NULL));

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "addon_services" ADD CONSTRAINT "addon_services_amount_nonneg" CHECK ("amount_vnd" >= 0);

ALTER TABLE "room_types"
  ADD CONSTRAINT "room_types_occupancy"
    CHECK ("max_adults" >= 1 AND "max_children" >= 0 AND "max_occupancy" >= "max_adults");

ALTER TABLE "combo_room_requirements"
  ADD CONSTRAINT "combo_room_requirements_nights_positive" CHECK ("nights" > 0 AND "persons_per_room" > 0);

-- Exactly one canonical public path per content node; older paths stay as redirects.
CREATE UNIQUE INDEX "public_routes_one_current_per_content"
  ON "public_routes" ("content_id") WHERE "is_current";

-- A booking line points at exactly one sellable thing.
ALTER TABLE "booking_lines"
  ADD CONSTRAINT "booking_lines_single_target"
    CHECK (("room_type_id" IS NOT NULL)::int + ("combo_departure_id" IS NOT NULL)::int
         + ("addon_service_id" IS NOT NULL)::int <= 1);

-- Navigation items link to content or an external URL, never both.
ALTER TABLE "navigation_items"
  ADD CONSTRAINT "navigation_items_single_target"
    CHECK (NOT ("content_id" IS NOT NULL AND "external_url" IS NOT NULL));

-- Fast lookup of the live public routes and of outbox work.
CREATE INDEX "content_nodes_published_at_idx" ON "content_nodes" ("publication_status", "publish_at");
CREATE INDEX "inventory_days_stay_date_idx" ON "inventory_days" ("stay_date");
