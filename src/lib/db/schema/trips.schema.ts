import {
  boolean,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users.schema";
import { plaidTransaction } from "./plaid.schema";

/**
 * Trip - represents a travel period for expense grouping
 */
export const trip = pgTable(
  "trip",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Peru – Dec 2025"
    description: text("description"),
    startDate: text("start_date").notNull(), // ISO date string
    endDate: text("end_date").notNull(), // ISO date string
    homeCurrency: text("home_currency").notNull().default("USD"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("trip_user_id_idx").on(table.userId),
    startDateIdx: index("trip_start_date_idx").on(table.startDate),
    endDateIdx: index("trip_end_date_idx").on(table.endDate),
  })
);

/**
 * TripTransaction - join table linking transactions to trips
 * A transaction can belong to multiple trips (rare but powerful)
 */
export const tripTransaction = pgTable(
  "trip_transaction",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trip.id, { onDelete: "cascade" }),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => plaidTransaction.id, { onDelete: "cascade" }),
    confidence: decimal("confidence", { precision: 3, scale: 2 }).default("1.00"), // 0.00-1.00
    isManual: boolean("is_manual").default(false), // true if manually added by user
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tripIdIdx: index("trip_transaction_trip_id_idx").on(table.tripId),
    transactionIdIdx: index("trip_transaction_transaction_id_idx").on(
      table.transactionId
    ),
    // Unique constraint to prevent duplicate assignments
    uniqueTripTransaction: index("trip_transaction_unique_idx").on(
      table.tripId,
      table.transactionId
    ),
  })
);

/**
 * TripOverride - category overrides for trip transactions
 * Allows layered categorization without mutating Plaid data
 */
export const tripOverride = pgTable(
  "trip_override",
  {
    id: text("id").primaryKey(),
    tripTransactionId: text("trip_transaction_id")
      .notNull()
      .references(() => tripTransaction.id, { onDelete: "cascade" }),
    categoryOverride: text("category_override"),
    subcategoryOverride: text("subcategory_override"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    tripTransactionIdIdx: index("trip_override_trip_transaction_id_idx").on(
      table.tripTransactionId
    ),
  })
);

// Type exports for use in application code
export type Trip = typeof trip.$inferSelect;
export type NewTrip = typeof trip.$inferInsert;
export type TripTransaction = typeof tripTransaction.$inferSelect;
export type NewTripTransaction = typeof tripTransaction.$inferInsert;
export type TripOverride = typeof tripOverride.$inferSelect;
export type NewTripOverride = typeof tripOverride.$inferInsert;
