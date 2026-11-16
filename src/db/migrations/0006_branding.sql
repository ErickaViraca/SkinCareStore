ALTER TABLE "settings" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "color_background" text DEFAULT '#FAF6E3' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "color_nav" text DEFAULT '#0E2D06' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "color_primary" text DEFAULT '#D6D22E' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "color_secondary" text DEFAULT '#4A7A24' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "color_accent" text DEFAULT '#839A2D' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "color_danger" text DEFAULT '#C62828' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "color_text" text DEFAULT '#1C1C1A' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_colors_are_hex" CHECK ("settings"."color_background" ~ '^#[0-9A-Fa-f]{6}$' AND "settings"."color_nav" ~ '^#[0-9A-Fa-f]{6}$'
        AND "settings"."color_primary" ~ '^#[0-9A-Fa-f]{6}$' AND "settings"."color_secondary" ~ '^#[0-9A-Fa-f]{6}$'
        AND "settings"."color_accent" ~ '^#[0-9A-Fa-f]{6}$' AND "settings"."color_danger" ~ '^#[0-9A-Fa-f]{6}$'
        AND "settings"."color_text" ~ '^#[0-9A-Fa-f]{6}$');