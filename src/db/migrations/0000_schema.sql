CREATE TYPE "public"."capital_movement_type" AS ENUM('contribution', 'capital_withdrawal', 'profit_withdrawal');--> statement-breakpoint
CREATE TYPE "public"."inventory_count_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."margin_mode" AS ENUM('pct', 'fixed', 'max');--> statement-breakpoint
CREATE TYPE "public"."money_account_kind" AS ENUM('cash', 'bank');--> statement-breakpoint
CREATE TYPE "public"."money_movement_type" AS ENUM('sale', 'sale_void', 'purchase', 'purchase_void', 'transfer', 'capital_in', 'capital_out', 'profit_out', 'expense', 'expense_void', 'cash_adjustment');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'qr', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_source" AS ENUM('account', 'partner');--> statement-breakpoint
CREATE TYPE "public"."price_change_reason" AS ENUM('manual', 'auto_cost');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('registered', 'voided');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'voided');--> statement-breakpoint
CREATE TYPE "public"."sale_channel" AS ENUM('store', 'whatsapp', 'instagram', 'facebook', 'tiktok', 'other');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('completed', 'voided');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('initial', 'purchase', 'purchase_void', 'sale', 'sale_void', 'adjustment', 'expired', 'damaged', 'sample', 'supplier_return', 'count');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"store_name" text NOT NULL,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"whatsapp_url" text,
	"instagram_url" text,
	"facebook_url" text,
	"tiktok_url" text,
	"default_margin_pct" numeric(6, 2) DEFAULT '25' NOT NULL,
	"default_min_stock" integer DEFAULT 2 NOT NULL,
	"expiry_tiers" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_default_margin_non_negative" CHECK ("settings"."default_margin_pct" >= 0),
	CONSTRAINT "settings_default_min_stock_non_negative" CHECK ("settings"."default_min_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name"),
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "categories_not_own_parent" CHECK ("categories"."parent_id" IS NULL OR "categories"."parent_id" <> "categories"."id")
);
--> statement-breakpoint
CREATE TABLE "price_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"old_price_bs" numeric(12, 2) NOT NULL,
	"new_price_bs" numeric(12, 2) NOT NULL,
	"reason" "price_change_reason" NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"url" text NOT NULL,
	"alt" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"barcode" text,
	"shade" text,
	"presentation" text,
	"sale_price_bs" numeric(12, 2) NOT NULL,
	"min_stock" integer,
	"margin_mode" "margin_mode",
	"margin_pct" numeric(6, 2),
	"margin_fixed_bs" numeric(12, 2),
	"price_auto_raised_at" timestamp with time zone,
	"published" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_sale_price_non_negative" CHECK ("product_variants"."sale_price_bs" >= 0),
	CONSTRAINT "product_variants_min_stock_non_negative" CHECK ("product_variants"."min_stock" IS NULL OR "product_variants"."min_stock" >= 0),
	CONSTRAINT "product_variants_margin_pct_non_negative" CHECK ("product_variants"."margin_pct" IS NULL OR "product_variants"."margin_pct" >= 0),
	CONSTRAINT "product_variants_margin_fixed_non_negative" CHECK ("product_variants"."margin_fixed_bs" IS NULL OR "product_variants"."margin_fixed_bs" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"brand_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"usage_instructions" text,
	"skin_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cash_closings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_bs" numeric(12, 2) NOT NULL,
	"counted_bs" numeric(12, 2) NOT NULL,
	"difference_bs" numeric(12, 2) GENERATED ALWAYS AS (counted_bs - expected_bs) STORED,
	"note" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "money_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "money_account_kind" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_accounts_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"share_pct_override" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_name_unique" UNIQUE("name"),
	CONSTRAINT "partners_share_pct_range" CHECK ("partners"."share_pct_override" IS NULL OR ("partners"."share_pct_override" >= 0 AND "partners"."share_pct_override" <= 100))
);
--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"amount_bs" numeric(12, 2) NOT NULL,
	"day_of_month" smallint NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_expenses_amount_positive" CHECK ("recurring_expenses"."amount_bs" > 0),
	CONSTRAINT "recurring_expenses_day_range" CHECK ("recurring_expenses"."day_of_month" BETWEEN 1 AND 28)
);
--> statement-breakpoint
CREATE TABLE "inventory_count_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"expected_qty" integer NOT NULL,
	"counted_qty" integer,
	CONSTRAINT "inventory_count_lines_count_variant_unique" UNIQUE("count_id","variant_id"),
	CONSTRAINT "inventory_count_lines_counted_non_negative" CHECK ("inventory_count_lines"."counted_qty" IS NULL OR "inventory_count_lines"."counted_qty" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"counted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "inventory_count_status" DEFAULT 'open' NOT NULL,
	"notes" text,
	"closed_at" timestamp with time zone,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"free_quantity" integer DEFAULT 0 NOT NULL,
	"is_gift" boolean DEFAULT false NOT NULL,
	"unit_price_bs" numeric(12, 2) NOT NULL,
	"landed_unit_cost_bs" numeric(12, 2) NOT NULL,
	"lot_code" text,
	"expires_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lots_quantity_positive" CHECK ("lots"."quantity" > 0),
	CONSTRAINT "lots_free_quantity_non_negative" CHECK ("lots"."free_quantity" >= 0),
	CONSTRAINT "lots_unit_price_non_negative" CHECK ("lots"."unit_price_bs" >= 0),
	CONSTRAINT "lots_landed_cost_non_negative" CHECK ("lots"."landed_unit_cost_bs" >= 0),
	CONSTRAINT "lots_gift_has_zero_cost" CHECK (NOT "lots"."is_gift" OR ("lots"."unit_price_bs" = 0 AND "lots"."landed_unit_cost_bs" = 0 AND "lots"."free_quantity" = 0))
);
--> statement-breakpoint
CREATE TABLE "purchase_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"source" "payment_source" NOT NULL,
	"account_id" uuid,
	"partner_id" uuid,
	"amount_bs" numeric(12, 2) NOT NULL,
	CONSTRAINT "purchase_payments_amount_positive" CHECK ("purchase_payments"."amount_bs" > 0),
	CONSTRAINT "purchase_payments_source_matches" CHECK (("purchase_payments"."source" = 'account' AND "purchase_payments"."account_id" IS NOT NULL AND "purchase_payments"."partner_id" IS NULL)
       OR ("purchase_payments"."source" = 'partner' AND "purchase_payments"."partner_id" IS NOT NULL AND "purchase_payments"."account_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"purchase_date" date NOT NULL,
	"invoice_number" text,
	"invoice_file_key" text,
	"shipping_cost_bs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "purchase_status" DEFAULT 'registered' NOT NULL,
	"notes" text,
	"void_reason" text,
	"voided_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_shipping_non_negative" CHECK ("purchases"."shipping_cost_bs" >= 0),
	CONSTRAINT "purchases_void_consistency" CHECK (("purchases"."status" = 'voided') = ("purchases"."voided_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"contact_name" text,
	"phone" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"list_price_bs" numeric(12, 2) NOT NULL,
	"unit_price_bs" numeric(12, 2) NOT NULL,
	"is_offer" boolean DEFAULT false NOT NULL,
	"unit_cost_bs" numeric(12, 2) NOT NULL,
	CONSTRAINT "sale_items_quantity_positive" CHECK ("sale_items"."quantity" > 0),
	CONSTRAINT "sale_items_list_price_non_negative" CHECK ("sale_items"."list_price_bs" >= 0),
	CONSTRAINT "sale_items_unit_cost_non_negative" CHECK ("sale_items"."unit_cost_bs" >= 0),
	CONSTRAINT "sale_items_price_not_below_cost" CHECK ("sale_items"."unit_price_bs" >= "sale_items"."unit_cost_bs")
);
--> statement-breakpoint
CREATE TABLE "sale_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_bs" numeric(12, 2) NOT NULL,
	"account_id" uuid NOT NULL,
	CONSTRAINT "sale_payments_amount_positive" CHECK ("sale_payments"."amount_bs" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_number" integer GENERATED ALWAYS AS IDENTITY (sequence name "sales_sale_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "sale_channel" NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"total_bs" numeric(12, 2) NOT NULL,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"void_reason" text,
	"voided_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_sale_number_unique" UNIQUE("sale_number"),
	CONSTRAINT "sales_total_non_negative" CHECK ("sales"."total_bs" >= 0),
	CONSTRAINT "sales_void_consistency" CHECK (("sales"."status" = 'voided') = ("sales"."voided_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "capital_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"type" "capital_movement_type" NOT NULL,
	"amount_bs" numeric(12, 2) NOT NULL,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid,
	"purchase_id" uuid,
	"distribution_id" uuid,
	"note" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"voided_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capital_movements_amount_positive" CHECK ("capital_movements"."amount_bs" > 0),
	CONSTRAINT "capital_movements_void_consistency" CHECK (("capital_movements"."status" = 'voided') = ("capital_movements"."voided_at" IS NOT NULL)),
	CONSTRAINT "capital_movements_origin" CHECK (("capital_movements"."type" = 'contribution' AND ("capital_movements"."account_id" IS NOT NULL OR "capital_movements"."purchase_id" IS NOT NULL))
       OR ("capital_movements"."type" <> 'contribution' AND "capital_movements"."account_id" IS NOT NULL AND "capital_movements"."purchase_id" IS NULL)),
	CONSTRAINT "capital_movements_profit_withdrawal_has_distribution" CHECK (("capital_movements"."type" = 'profit_withdrawal') = ("capital_movements"."distribution_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"recurring_expense_id" uuid,
	"spent_on" date NOT NULL,
	"amount_bs" numeric(12, 2) NOT NULL,
	"account_id" uuid NOT NULL,
	"description" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"voided_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount_bs" > 0),
	CONSTRAINT "expenses_void_consistency" CHECK (("expenses"."status" = 'voided') = ("expenses"."voided_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "profit_distribution_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribution_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"share_pct" numeric(5, 2) NOT NULL,
	"amount_bs" numeric(12, 2) NOT NULL,
	CONSTRAINT "profit_distribution_lines_partner_unique" UNIQUE("distribution_id","partner_id"),
	CONSTRAINT "profit_distribution_lines_share_range" CHECK ("profit_distribution_lines"."share_pct" >= 0 AND "profit_distribution_lines"."share_pct" <= 100),
	CONSTRAINT "profit_distribution_lines_amount_non_negative" CHECK ("profit_distribution_lines"."amount_bs" >= 0)
);
--> statement-breakpoint
CREATE TABLE "profit_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"net_profit_available_bs" numeric(12, 2) NOT NULL,
	"distributed_bs" numeric(12, 2) NOT NULL,
	"reinvested_bs" numeric(12, 2) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profit_distributions_period_order" CHECK ("profit_distributions"."period_from" <= "profit_distributions"."period_to"),
	CONSTRAINT "profit_distributions_distributed_non_negative" CHECK ("profit_distributions"."distributed_bs" >= 0),
	CONSTRAINT "profit_distributions_reinvested_non_negative" CHECK ("profit_distributions"."reinvested_bs" >= 0),
	CONSTRAINT "profit_distributions_parts_add_up" CHECK ("profit_distributions"."distributed_bs" + "profit_distributions"."reinvested_bs" = "profit_distributions"."net_profit_available_bs")
);
--> statement-breakpoint
CREATE TABLE "money_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_bs" numeric(12, 2) NOT NULL,
	"type" "money_movement_type" NOT NULL,
	"sale_id" uuid,
	"purchase_id" uuid,
	"expense_id" uuid,
	"capital_movement_id" uuid,
	"transfer_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_movements_amount_not_zero" CHECK ("money_movements"."amount_bs" <> 0),
	CONSTRAINT "money_movements_sign_matches_type" CHECK (CASE
        WHEN "money_movements"."type" IN ('sale', 'purchase_void', 'capital_in', 'expense_void') THEN "money_movements"."amount_bs" > 0
        WHEN "money_movements"."type" IN ('sale_void', 'purchase', 'capital_out', 'profit_out', 'expense') THEN "money_movements"."amount_bs" < 0
        ELSE TRUE
      END),
	CONSTRAINT "money_movements_transfer_reference" CHECK (("money_movements"."type" = 'transfer') = ("money_movements"."transfer_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"purchase_id" uuid,
	"sale_item_id" uuid,
	"count_id" uuid,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_quantity_not_zero" CHECK ("stock_movements"."quantity" <> 0),
	CONSTRAINT "stock_movements_sign_matches_type" CHECK (CASE
        WHEN "stock_movements"."type" IN ('initial', 'purchase', 'sale_void') THEN "stock_movements"."quantity" > 0
        WHEN "stock_movements"."type" IN ('sale', 'purchase_void', 'expired', 'damaged', 'sample', 'supplier_return') THEN "stock_movements"."quantity" < 0
        ELSE TRUE
      END),
	CONSTRAINT "stock_movements_sale_reference" CHECK (("stock_movements"."type" IN ('sale', 'sale_void')) = ("stock_movements"."sale_item_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_account_id_money_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_account_id_money_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_movements" ADD CONSTRAINT "capital_movements_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_movements" ADD CONSTRAINT "capital_movements_account_id_money_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_movements" ADD CONSTRAINT "capital_movements_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_movements" ADD CONSTRAINT "capital_movements_distribution_id_profit_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."profit_distributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_movements" ADD CONSTRAINT "capital_movements_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurring_expense_id_recurring_expenses_id_fk" FOREIGN KEY ("recurring_expense_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_money_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_distribution_lines" ADD CONSTRAINT "profit_distribution_lines_distribution_id_profit_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."profit_distributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_distribution_lines" ADD CONSTRAINT "profit_distribution_lines_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_distributions" ADD CONSTRAINT "profit_distributions_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_account_id_money_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_capital_movement_id_capital_movements_id_fk" FOREIGN KEY ("capital_movement_id") REFERENCES "public"."capital_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_changes_variant_id_idx" ON "price_changes" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_brand_id_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "lots_purchase_id_idx" ON "lots" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "lots_variant_expiry_idx" ON "lots" USING btree ("variant_id","expires_on");--> statement-breakpoint
CREATE INDEX "purchase_payments_purchase_id_idx" ON "purchase_payments" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchases_supplier_id_idx" ON "purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_variant_id_idx" ON "sale_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sales_sold_at_idx" ON "sales" USING btree ("sold_at");--> statement-breakpoint
CREATE INDEX "capital_movements_partner_id_idx" ON "capital_movements" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "expenses_spent_on_idx" ON "expenses" USING btree ("spent_on");--> statement-breakpoint
CREATE INDEX "money_movements_account_id_idx" ON "money_movements" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "stock_movements_variant_id_idx" ON "stock_movements" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_lot_id_idx" ON "stock_movements" USING btree ("lot_id");