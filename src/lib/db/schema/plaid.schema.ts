import {
  boolean,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./users.schema";

export const plaidItem = pgTable(
  "plaid_item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token").notNull(),
    institutionId: text("institution_id").notNull(),
    institutionName: text("institution_name"),
    cursor: text("cursor"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("plaid_item_user_id_idx").on(table.userId),
  }),
);

export const plaidAccount = pgTable(
  "plaid_account",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => plaidItem.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    officialName: text("official_name"),
    mask: varchar("mask", { length: 4 }),
    type: text("type").notNull(),
    subtype: text("subtype"),
    currentBalance: decimal("current_balance", { precision: 15, scale: 2 }),
    availableBalance: decimal("available_balance", { precision: 15, scale: 2 }),
    isoCurrencyCode: varchar("iso_currency_code", { length: 3 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    itemIdIdx: index("plaid_account_item_id_idx").on(table.itemId),
    userIdIdx: index("plaid_account_user_id_idx").on(table.userId),
  }),
);

export const plaidTransaction = pgTable(
  "plaid_transaction",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => plaidAccount.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    isoCurrencyCode: varchar("iso_currency_code", { length: 3 }),
    description: text("description"),
    merchantName: text("merchant_name"),
    category: text("category"),
    subcategory: text("subcategory"),
    date: text("date").notNull(),
    authorizedDate: text("authorized_date"),
    pending: boolean("pending").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    accountIdIdx: index("plaid_transaction_account_id_idx").on(table.accountId),
    userIdIdx: index("plaid_transaction_user_id_idx").on(table.userId),
    dateIdx: index("plaid_transaction_date_idx").on(table.date),
    categoryIdx: index("plaid_transaction_category_idx").on(table.category),
  }),
);

export const plaidSecurity = pgTable(
  "plaid_security",
  {
    id: text("id").primaryKey(), // security_id from Plaid
    cusip: text("cusip"),
    isin: text("isin"),
    sedol: text("sedol"),
    tickerSymbol: text("ticker_symbol"),
    name: text("name").notNull(),
    type: text("type"), // e.g., "equity", "mutual fund", "bond"
    closePrice: decimal("close_price", { precision: 15, scale: 2 }),
    closePriceAsOf: text("close_price_as_of"),
    isoCurrencyCode: varchar("iso_currency_code", { length: 3 }),
    institutionId: text("institution_id"),
    institutionSecurityId: text("institution_security_id"),
    proxySecurityId: text("proxy_security_id"),
    marketIdentifierCode: text("market_identifier_code"),
    isCashEquivalent: boolean("is_cash_equivalent").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    tickerIdx: index("plaid_security_ticker_idx").on(table.tickerSymbol),
    typeIdx: index("plaid_security_type_idx").on(table.type),
  }),
);

export const plaidHolding = pgTable(
  "plaid_holding",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => plaidAccount.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    securityId: text("security_id")
      .notNull()
      .references(() => plaidSecurity.id, { onDelete: "cascade" }),
    quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
    costBasis: decimal("cost_basis", { precision: 15, scale: 2 }),
    institutionValue: decimal("institution_value", { precision: 15, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    accountIdIdx: index("plaid_holding_account_id_idx").on(table.accountId),
    userIdIdx: index("plaid_holding_user_id_idx").on(table.userId),
    securityIdIdx: index("plaid_holding_security_id_idx").on(table.securityId),
  }),
);
