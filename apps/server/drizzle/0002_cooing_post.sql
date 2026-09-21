CREATE TABLE "event_seat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"ticket_type_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_seat_seat_id_event_id_uq" UNIQUE("seat_id","event_id"),
	CONSTRAINT "event_seat_id_event_id_uq" UNIQUE("id","event_id")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"artist" varchar(255) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_id_venue_id_uq" UNIQUE("id","venue_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"ticket_type_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"section_type" "section_type" NOT NULL,
	"section_capacity" integer NOT NULL,
	"capacity" integer NOT NULL,
	"held" integer DEFAULT 0 NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_allocation_event_id_section_id_uq" UNIQUE("event_id","section_id"),
	CONSTRAINT "ticket_allocation_held_sold_capacity_ck" CHECK ("ticket_allocation"."held" + "ticket_allocation"."sold" <= "ticket_allocation"."capacity"),
	CONSTRAINT "ticket_allocation_held_ck" CHECK ("ticket_allocation"."held" >= 0),
	CONSTRAINT "ticket_allocation_sold_ck" CHECK ("ticket_allocation"."sold" >= 0),
	CONSTRAINT "ticket_allocation_capacity_ck" CHECK ("ticket_allocation"."capacity" <= "ticket_allocation"."section_capacity"),
	CONSTRAINT "ticket_allocation_section_type_ck" CHECK ("ticket_allocation"."section_type" = 'standing')
);
--> statement-breakpoint
CREATE TABLE "ticket_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_type_event_id_type_uq" UNIQUE("event_id","type"),
	CONSTRAINT "ticket_type_id_event_id_uq" UNIQUE("id","event_id")
);
--> statement-breakpoint
ALTER TABLE "seat" ADD COLUMN "venue_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "seat" ADD CONSTRAINT "seat_id_venue_id_uq" UNIQUE("id","venue_id");
--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_id_venue_id_uq" UNIQUE("id","venue_id");
--> statement-breakpoint
ALTER TABLE "event_seat" ADD CONSTRAINT "event_seat_event_id_venue_id_fk" FOREIGN KEY ("event_id","venue_id") REFERENCES "public"."event"("id","venue_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_seat" ADD CONSTRAINT "event_seat_seat_id_venue_id_fk" FOREIGN KEY ("seat_id","venue_id") REFERENCES "public"."seat"("id","venue_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_seat" ADD CONSTRAINT "event_seat_ticket_type_id_event_id_fk" FOREIGN KEY ("ticket_type_id","event_id") REFERENCES "public"."ticket_type"("id","event_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_allocation" ADD CONSTRAINT "ticket_allocation_section_id_section_capacity_fk" FOREIGN KEY ("section_id","section_capacity") REFERENCES "public"."section"("id","capacity") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ticket_allocation" ADD CONSTRAINT "ticket_allocation_section_id_section_type_fk" FOREIGN KEY ("section_id","section_type") REFERENCES "public"."section"("id","type") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_allocation" ADD CONSTRAINT "ticket_allocation_section_id_venue_id_fk" FOREIGN KEY ("section_id","venue_id") REFERENCES "public"."section"("id","venue_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_allocation" ADD CONSTRAINT "ticket_allocation_event_id_venue_id_fk" FOREIGN KEY ("event_id","venue_id") REFERENCES "public"."event"("id","venue_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_allocation" ADD CONSTRAINT "ticket_allocation_ticket_type_id_event_id_fk" FOREIGN KEY ("ticket_type_id","event_id") REFERENCES "public"."ticket_type"("id","event_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_type" ADD CONSTRAINT "ticket_type_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_type" ADD CONSTRAINT "ticket_type_currency_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "seat" ADD CONSTRAINT "seat_section_id_venue_id_fk" FOREIGN KEY ("section_id","venue_id") REFERENCES "public"."section"("id","venue_id") ON DELETE restrict ON UPDATE no action;
