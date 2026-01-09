CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text,
	"image" text,
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "plaid_account" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"official_name" text,
	"mask" varchar(4),
	"type" text NOT NULL,
	"subtype" text,
	"current_balance" numeric(15, 2),
	"available_balance" numeric(15, 2),
	"iso_currency_code" varchar(3),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_holding" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"security_id" text NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"cost_basis" numeric(15, 2),
	"institution_value" numeric(15, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"institution_id" text NOT NULL,
	"institution_name" text,
	"cursor" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_security" (
	"id" text PRIMARY KEY NOT NULL,
	"cusip" text,
	"isin" text,
	"sedol" text,
	"ticker_symbol" text,
	"name" text NOT NULL,
	"type" text,
	"close_price" numeric(15, 2),
	"close_price_as_of" text,
	"iso_currency_code" varchar(3),
	"institution_id" text,
	"institution_security_id" text,
	"proxy_security_id" text,
	"market_identifier_code" text,
	"is_cash_equivalent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"iso_currency_code" varchar(3),
	"description" text,
	"merchant_name" text,
	"category" text,
	"subcategory" text,
	"date" text NOT NULL,
	"authorized_date" text,
	"pending" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"home_currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_override" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_transaction_id" text NOT NULL,
	"category_override" text,
	"subcategory_override" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '1.00',
	"is_manual" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plaid_account" ADD CONSTRAINT "plaid_account_item_id_plaid_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."plaid_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_account" ADD CONSTRAINT "plaid_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_holding" ADD CONSTRAINT "plaid_holding_account_id_plaid_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."plaid_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_holding" ADD CONSTRAINT "plaid_holding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_holding" ADD CONSTRAINT "plaid_holding_security_id_plaid_security_id_fk" FOREIGN KEY ("security_id") REFERENCES "public"."plaid_security"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_item" ADD CONSTRAINT "plaid_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_transaction" ADD CONSTRAINT "plaid_transaction_account_id_plaid_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."plaid_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_transaction" ADD CONSTRAINT "plaid_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip" ADD CONSTRAINT "trip_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_override" ADD CONSTRAINT "trip_override_trip_transaction_id_trip_transaction_id_fk" FOREIGN KEY ("trip_transaction_id") REFERENCES "public"."trip_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transaction" ADD CONSTRAINT "trip_transaction_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transaction" ADD CONSTRAINT "trip_transaction_transaction_id_plaid_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."plaid_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plaid_account_item_id_idx" ON "plaid_account" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "plaid_account_user_id_idx" ON "plaid_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_holding_account_id_idx" ON "plaid_holding" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "plaid_holding_user_id_idx" ON "plaid_holding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_holding_security_id_idx" ON "plaid_holding" USING btree ("security_id");--> statement-breakpoint
CREATE INDEX "plaid_item_user_id_idx" ON "plaid_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_security_ticker_idx" ON "plaid_security" USING btree ("ticker_symbol");--> statement-breakpoint
CREATE INDEX "plaid_security_type_idx" ON "plaid_security" USING btree ("type");--> statement-breakpoint
CREATE INDEX "plaid_transaction_account_id_idx" ON "plaid_transaction" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "plaid_transaction_user_id_idx" ON "plaid_transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_transaction_date_idx" ON "plaid_transaction" USING btree ("date");--> statement-breakpoint
CREATE INDEX "plaid_transaction_category_idx" ON "plaid_transaction" USING btree ("category");--> statement-breakpoint
CREATE INDEX "trip_user_id_idx" ON "trip" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trip_start_date_idx" ON "trip" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "trip_end_date_idx" ON "trip" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "trip_override_trip_transaction_id_idx" ON "trip_override" USING btree ("trip_transaction_id");--> statement-breakpoint
CREATE INDEX "trip_transaction_trip_id_idx" ON "trip_transaction" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_transaction_transaction_id_idx" ON "trip_transaction" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "trip_transaction_unique_idx" ON "trip_transaction" USING btree ("trip_id","transaction_id");