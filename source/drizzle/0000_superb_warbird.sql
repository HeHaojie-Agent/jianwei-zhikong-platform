CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`timestamp` text NOT NULL,
	`wind` real NOT NULL,
	`direction` real NOT NULL,
	`magnetic` real NOT NULL,
	`altitude` real NOT NULL,
	`speed` real NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL
);
