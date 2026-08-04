ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "tasks" SET "completed_at" = "updated_at" WHERE "status" = 'done';--> statement-breakpoint
CREATE INDEX "tasks_project_status_completed_at_position_idx" ON "tasks" USING btree ("project_id","status","completed_at","position");
