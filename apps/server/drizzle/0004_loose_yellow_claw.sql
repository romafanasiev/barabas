CREATE TYPE "public"."hold_item_status" AS ENUM('active', 'released');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('active', 'confirmed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'cancelled', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "check_in" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_in_ticket_id_uq" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "hold_allocated_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hold_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "hold_item_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hold_seat_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hold_id" uuid NOT NULL,
	"event_seat_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "hold_item_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "hold_status" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hold_id_event_id_uq" UNIQUE("id","event_id"),
	CONSTRAINT "hold_expires_at_created_at_ck" CHECK ("hold"."expires_at" > "hold"."created_at")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_seat_id" uuid,
	"allocation_id" uuid,
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_item_event_seat_id_allocation_id_ck" CHECK (num_nonnulls("order_item"."event_seat_id", "order_item"."allocation_id") = 1),
	CONSTRAINT "order_item_quantity_ck" CHECK (("order_item"."event_seat_id" IS NOT NULL AND "order_item"."quantity" = 1)
          OR ("order_item"."allocation_id" IS NOT NULL AND "order_item"."quantity" >= 1))
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hold_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"currency" char(3) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_hold_id_uq" UNIQUE("hold_id"),
	CONSTRAINT "order_id_currency_uq" UNIQUE("id","currency"),
	CONSTRAINT "order_expires_at_created_at_ck" CHECK ("order"."expires_at" > "order"."created_at")
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "payment_status" NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_idempotency_key_uq" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_id_status_uq" UNIQUE("id","status")
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"payment_status" "payment_status" NOT NULL,
	"event_seat_id" uuid,
	"allocation_id" uuid,
	"ticket_type_id" uuid NOT NULL,
	"ticket_price" numeric(12, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"code" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_code_uq" UNIQUE("code"),
	CONSTRAINT "ticket_payment_status_ck" CHECK ("ticket"."payment_status" = 'succeeded'),
	CONSTRAINT "ticket_event_seat_id_allocation_id_ck" CHECK (num_nonnulls("ticket"."event_seat_id", "ticket"."allocation_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "ticket_allocation" ADD CONSTRAINT "ticket_allocation_id_event_id_uq" UNIQUE("id","event_id");--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hold_allocated_item" ADD CONSTRAINT "hold_allocated_item_hold_id_event_id_fk" FOREIGN KEY ("hold_id","event_id") REFERENCES "public"."hold"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hold_allocated_item" ADD CONSTRAINT "hold_allocated_item_allocation_id_event_id_fk" FOREIGN KEY ("allocation_id","event_id") REFERENCES "public"."ticket_allocation"("id","event_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hold_seat_item" ADD CONSTRAINT "hold_seat_item_hold_id_event_id_fk" FOREIGN KEY ("hold_id","event_id") REFERENCES "public"."hold"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hold_seat_item" ADD CONSTRAINT "hold_seat_item_event_seat_id_event_id_fk" FOREIGN KEY ("event_seat_id","event_id") REFERENCES "public"."event_seat"("id","event_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hold" ADD CONSTRAINT "hold_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hold" ADD CONSTRAINT "hold_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_currency_fk" FOREIGN KEY ("order_id","currency") REFERENCES "public"."order"("id","currency") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_event_seat_id_fk" FOREIGN KEY ("event_seat_id") REFERENCES "public"."event_seat"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_allocation_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."ticket_allocation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_hold_id_fk" FOREIGN KEY ("hold_id") REFERENCES "public"."hold"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_currency_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_currency_fk" FOREIGN KEY ("order_id","currency") REFERENCES "public"."order"("id","currency") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_payment_id_payment_status_fk" FOREIGN KEY ("payment_id","payment_status") REFERENCES "public"."payment"("id","status") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_ticket_type_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_currency_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_event_seat_id_fk" FOREIGN KEY ("event_seat_id") REFERENCES "public"."event_seat"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_allocation_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."ticket_allocation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hold_allocated_item_hold_id_allocation_id_active_uq" ON "hold_allocated_item" USING btree ("hold_id","allocation_id") WHERE "hold_allocated_item"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "hold_seat_item_event_seat_id_active_uq" ON "hold_seat_item" USING btree ("event_seat_id") WHERE "hold_seat_item"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "payment_order_id_succeeded_uq" ON "payment" USING btree ("order_id") WHERE "payment"."status" = 'succeeded';--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_event_seat_id_uq" ON "ticket" USING btree ("event_seat_id") WHERE "ticket"."event_seat_id" IS NOT NULL;--> statement-breakpoint