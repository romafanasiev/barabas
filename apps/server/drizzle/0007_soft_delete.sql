ALTER TABLE "event_seat" DROP CONSTRAINT "event_seat_seat_id_event_id_uq";--> statement-breakpoint
ALTER TABLE "ticket_allocation" DROP CONSTRAINT "ticket_allocation_event_id_section_id_uq";--> statement-breakpoint
ALTER TABLE "ticket_type" DROP CONSTRAINT "ticket_type_event_id_type_uq";--> statement-breakpoint
ALTER TABLE "seat" DROP CONSTRAINT "seat_section_id_row_no_seat_number_uq";--> statement-breakpoint
ALTER TABLE "section" DROP CONSTRAINT "section_venue_id_label_uq";--> statement-breakpoint
DROP INDEX "ticket_event_seat_id_uq";--> statement-breakpoint
ALTER TABLE "event_seat" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ticket_allocation" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ticket_type" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "seat" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "section" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "event_seat_seat_id_event_id_live_uq" ON "event_seat" USING btree ("seat_id","event_id") WHERE "event_seat"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_allocation_event_id_section_id_live_uq" ON "ticket_allocation" USING btree ("event_id","section_id") WHERE "ticket_allocation"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_type_event_id_type_live_uq" ON "ticket_type" USING btree ("event_id","type") WHERE "ticket_type"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_event_seat_id_live_uq" ON "ticket" USING btree ("event_seat_id") WHERE "ticket"."event_seat_id" IS NOT NULL AND "ticket"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "seat_section_id_row_no_seat_number_live_uq" ON "seat" USING btree ("section_id","row_no","seat_number") WHERE "seat"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "section_venue_id_label_live_uq" ON "section" USING btree ("venue_id","label") WHERE "section"."deleted_at" IS NULL;--> statement-breakpoint
CREATE VIEW "public"."event_seat_live" AS (select "id", "event_id", "seat_id", "ticket_type_id", "venue_id", "created_at", "updated_at", "deleted_at" from "event_seat" where "event_seat"."deleted_at" is null);--> statement-breakpoint
CREATE VIEW "public"."event_live" AS (select "id", "venue_id", "artist", "starts_at", "ends_at", "created_at", "updated_at", "deleted_at" from "event" where "event"."deleted_at" is null);--> statement-breakpoint
CREATE VIEW "public"."ticket_allocation_live" AS (select "id", "event_id", "section_id", "ticket_type_id", "venue_id", "section_type", "section_capacity", "capacity", "held", "sold", "created_at", "updated_at", "deleted_at" from "ticket_allocation" where "ticket_allocation"."deleted_at" is null);--> statement-breakpoint
CREATE VIEW "public"."ticket_type_live" AS (select "id", "event_id", "type", "price", "currency", "created_at", "updated_at", "deleted_at" from "ticket_type" where "ticket_type"."deleted_at" is null);--> statement-breakpoint
CREATE VIEW "public"."ticket_live" AS (select "id", "payment_id", "payment_status", "event_seat_id", "allocation_id", "ticket_type_id", "ticket_price", "currency", "code", "created_at", "updated_at", "deleted_at" from "ticket" where "ticket"."deleted_at" is null);--> statement-breakpoint
CREATE VIEW "public"."seat_live" AS (select "id", "section_id", "row_no", "seat_number", "section_type", "venue_id", "created_at", "updated_at", "deleted_at" from "seat" where "seat"."deleted_at" is null);--> statement-breakpoint
CREATE VIEW "public"."section_live" AS (select "id", "label", "capacity", "venue_id", "type", "created_at", "updated_at", "deleted_at" from "section" where "section"."deleted_at" is null);--> statement-breakpoint
CREATE VIEW "public"."venue_live" AS (select "id", "name", "city", "created_at", "updated_at", "deleted_at" from "venue" where "venue"."deleted_at" is null);