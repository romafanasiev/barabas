CREATE TYPE "public"."section_type" AS ENUM('numbered', 'standing');--> statement-breakpoint
CREATE TABLE "seat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"row_no" integer NOT NULL,
	"seat_number" integer NOT NULL,
	"section_type" "section_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seat_section_id_row_no_seat_number_uq" UNIQUE("section_id","row_no","seat_number"),
	CONSTRAINT "seat_section_type_ck" CHECK ("seat"."section_type" = 'numbered')
);
--> statement-breakpoint
CREATE TABLE "section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(255) NOT NULL,
	"capacity" integer NOT NULL,
	"venue_id" uuid NOT NULL,
	"type" "section_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_venue_id_label_uq" UNIQUE("venue_id","label"),
	CONSTRAINT "section_id_type_uq" UNIQUE("id","type"),
	CONSTRAINT "section_id_capacity_uq" UNIQUE("id","capacity")
);
--> statement-breakpoint
CREATE TABLE "venue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"city" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seat" ADD CONSTRAINT "seat_section_id_section_type_fk" FOREIGN KEY ("section_id","section_type") REFERENCES "public"."section"("id","type") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE restrict ON UPDATE no action;