import { db } from "@/lib/db";
import {
  trip,
  tripTransaction,
  tripOverride,
  plaidTransaction,
  plaidAccount,
  plaidItem,
} from "@/lib/db/schema";
import { eq, and, gte, lte, or, ilike, sql, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// TODO: Replace with actual auth when authentication is implemented
const getUserId = () => {
  return "test-user-123";
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/trips/[id]/transactions - Get all transactions for a trip
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = getUserId();

    // Verify trip ownership
    const tripData = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, id), eq(trip.userId, userId)))
      .limit(1);

    if (tripData.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Get trip transactions with full details
    const transactions = await db
      .select({
        tripTransactionId: tripTransaction.id,
        confidence: tripTransaction.confidence,
        isManual: tripTransaction.isManual,
        transactionId: plaidTransaction.id,
        amount: plaidTransaction.amount,
        isoCurrencyCode: plaidTransaction.isoCurrencyCode,
        description: plaidTransaction.description,
        merchantName: plaidTransaction.merchantName,
        category: plaidTransaction.category,
        subcategory: plaidTransaction.subcategory,
        date: plaidTransaction.date,
        pending: plaidTransaction.pending,
        accountName: plaidAccount.name,
        institutionName: plaidItem.institutionName,
        // Override fields
        categoryOverride: tripOverride.categoryOverride,
        subcategoryOverride: tripOverride.subcategoryOverride,
        notes: tripOverride.notes,
      })
      .from(tripTransaction)
      .innerJoin(
        plaidTransaction,
        eq(tripTransaction.transactionId, plaidTransaction.id)
      )
      .innerJoin(plaidAccount, eq(plaidTransaction.accountId, plaidAccount.id))
      .innerJoin(plaidItem, eq(plaidAccount.itemId, plaidItem.id))
      .leftJoin(
        tripOverride,
        eq(tripOverride.tripTransactionId, tripTransaction.id)
      )
      .where(eq(tripTransaction.tripId, id))
      .orderBy(sql`${plaidTransaction.date} DESC`);

    // Calculate summary stats
    const totalSpend = transactions.reduce((sum, tx) => {
      return sum + parseFloat(tx.amount);
    }, 0);

    const categoryBreakdown = transactions.reduce(
      (acc, tx) => {
        const category =
          tx.categoryOverride || tx.category || "Uncategorized";
        acc[category] = (acc[category] || 0) + parseFloat(tx.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    const needsReview = transactions.filter(
      (tx) => parseFloat(tx.confidence || "1") < 0.6
    ).length;

    return NextResponse.json({
      transactions,
      summary: {
        totalSpend,
        transactionCount: transactions.length,
        categoryBreakdown,
        needsReview,
        reviewed: transactions.length - needsReview,
      },
    });
  } catch (error) {
    console.error("Error fetching trip transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip transactions" },
      { status: 500 }
    );
  }
}

type AddTransactionBody = {
  transactionIds: string[];
};

// POST /api/trips/[id]/transactions - Add transactions to a trip
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = getUserId();
    const body = (await request.json()) as AddTransactionBody;

    const { transactionIds } = body;

    if (!transactionIds || transactionIds.length === 0) {
      return NextResponse.json(
        { error: "transactionIds array is required" },
        { status: 400 }
      );
    }

    // Verify trip ownership
    const tripData = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, id), eq(trip.userId, userId)))
      .limit(1);

    if (tripData.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Verify transactions belong to user
    const validTransactions = await db
      .select({ id: plaidTransaction.id })
      .from(plaidTransaction)
      .where(
        and(
          eq(plaidTransaction.userId, userId),
          inArray(plaidTransaction.id, transactionIds)
        )
      );

    const validIds = new Set(validTransactions.map((t) => t.id));

    // Get existing trip transactions to avoid duplicates
    const existingTripTxs = await db
      .select({ transactionId: tripTransaction.transactionId })
      .from(tripTransaction)
      .where(eq(tripTransaction.tripId, id));

    const existingIds = new Set(existingTripTxs.map((t) => t.transactionId));

    // Filter to new valid transactions only
    const newTransactionIds = transactionIds.filter(
      (txId) => validIds.has(txId) && !existingIds.has(txId)
    );

    if (newTransactionIds.length === 0) {
      return NextResponse.json({
        added: 0,
        message: "All transactions already exist or are invalid",
      });
    }

    // Insert new trip transactions
    const newTripTransactions = newTransactionIds.map((txId) => ({
      id: randomUUID(),
      tripId: id,
      transactionId: txId,
      confidence: "1.00",
      isManual: true,
    }));

    await db.insert(tripTransaction).values(newTripTransactions);

    return NextResponse.json({
      added: newTransactionIds.length,
      transactionIds: newTransactionIds,
    });
  } catch (error) {
    console.error("Error adding trip transactions:", error);
    return NextResponse.json(
      { error: "Failed to add trip transactions" },
      { status: 500 }
    );
  }
}

// DELETE /api/trips/[id]/transactions - Remove transactions from a trip
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = getUserId();
    const body = (await request.json()) as AddTransactionBody;

    const { transactionIds } = body;

    if (!transactionIds || transactionIds.length === 0) {
      return NextResponse.json(
        { error: "transactionIds array is required" },
        { status: 400 }
      );
    }

    // Verify trip ownership
    const tripData = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, id), eq(trip.userId, userId)))
      .limit(1);

    if (tripData.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Get trip transaction IDs to delete
    const tripTxsToDelete = await db
      .select({ id: tripTransaction.id })
      .from(tripTransaction)
      .where(
        and(
          eq(tripTransaction.tripId, id),
          inArray(tripTransaction.transactionId, transactionIds)
        )
      );

    const tripTxIds = tripTxsToDelete.map((t) => t.id);

    if (tripTxIds.length === 0) {
      return NextResponse.json({
        removed: 0,
        message: "No matching transactions found",
      });
    }

    // Delete overrides first
    await db
      .delete(tripOverride)
      .where(inArray(tripOverride.tripTransactionId, tripTxIds));

    // Delete trip transactions
    await db
      .delete(tripTransaction)
      .where(inArray(tripTransaction.id, tripTxIds));

    return NextResponse.json({
      removed: tripTxIds.length,
    });
  } catch (error) {
    console.error("Error removing trip transactions:", error);
    return NextResponse.json(
      { error: "Failed to remove trip transactions" },
      { status: 500 }
    );
  }
}
