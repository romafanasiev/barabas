-- One function for every audited table: the table name comes from TG_TABLE_NAME, the
-- row as a whole goes to JSONB. Who and which request come from transaction-local
-- settings, see setAuditContext(); a write from psql leaves them empty and the row
-- gets NULL plus the database role.
--
-- No EXCEPTION block on purpose: if the audit row cannot be written, the change it
-- describes is rolled back too. A change without history is the thing we forbid.
CREATE FUNCTION "audit_row_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "audit_log" ("table_name", "row_id", "action", "old_data", "new_data", "changed_by", "request_id")
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD."id" ELSE NEW."id" END,
    TG_OP::"audit_action",
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    NULLIF(current_setting('app.user_id', true), ''),
    NULLIF(current_setting('app.request_id', true), '')::uuid
  );
  RETURN NULL;
END;
$$;--> statement-breakpoint
-- UPDATE has its own trigger: WHEN cannot mention OLD on INSERT or NEW on DELETE.
-- An UPDATE that changes nothing leaves no row.
CREATE TRIGGER "order_audit" AFTER INSERT OR DELETE ON "order"
  FOR EACH ROW EXECUTE FUNCTION "audit_row_change"();--> statement-breakpoint
CREATE TRIGGER "order_audit_update" AFTER UPDATE ON "order"
  FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION "audit_row_change"();--> statement-breakpoint
CREATE TRIGGER "ticket_allocation_audit" AFTER INSERT OR DELETE ON "ticket_allocation"
  FOR EACH ROW EXECUTE FUNCTION "audit_row_change"();--> statement-breakpoint
CREATE TRIGGER "ticket_allocation_audit_update" AFTER UPDATE ON "ticket_allocation"
  FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION "audit_row_change"();
