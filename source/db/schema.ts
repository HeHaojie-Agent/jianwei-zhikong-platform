// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", {
  id: text("id").primaryKey(), kind: text("kind").notNull(),
  body: text("body").notNull(), createdAt: text("created_at").notNull(),
});
export const telemetry = sqliteTable("telemetry", {
  id: text("id").primaryKey(), taskId: text("task_id").notNull(), timestamp: text("timestamp").notNull(),
  wind: real("wind").notNull(), direction: real("direction").notNull(), magnetic: real("magnetic").notNull(),
  altitude: real("altitude").notNull(), speed: real("speed").notNull(), lat: real("lat").notNull(), lng: real("lng").notNull(),
});
export const meta = sqliteTable("meta", { key: text("key").primaryKey(), value: text("value").notNull() });
