CREATE TABLE "currency" (
	"code" char(3) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
INSERT INTO "currency" ("code", "name") VALUES
	('UAH', 'Hryvnia'),
	('USD', 'US Dollar');
