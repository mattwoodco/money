import { db } from "@/lib/db";
import { trip, tripTransaction, tripOverride } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// TODO: Replace with actual auth when authentication is implemented
const getUserId = () => {
  return "test-user-123";
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/trips/[id] - Get a single trip with summary stats
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = getUserId();

    const tripData = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, id), eq(trip.userId, userId)))
      .limit(1);

    if (tripData.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Get transaction count and totals for this trip
    const statsResult = await db
      .select({
        transactionCount: sql<number>`count(*)`,
        totalSpend: sql<string>`COALESCE(SUM(CAST(pt.amount AS DECIMAL(15,2))), 0)`,
      })
      .from(tripTransaction)
      .innerJoin(
        sql`plaid_transaction pt`,
        sql`${tripTransaction.transactionId} = pt.id`
      )
      .where(eq(tripTransaction.tripId, id));

    const stats = statsResult[0] || { transactionCount: 0, totalSpend: "0" };

    return NextResponse.json({
      trip: tripData[0],
      stats: {
        transactionCount: Number(stats.transactionCount),
        totalSpend: parseFloat(stats.totalSpend as string),
      },
    });
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

type UpdateTripBody = {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  homeCurrency?: string;
  isActive?: boolean;
};

// PATCH /api/trips/[id] - Update a trip
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = getUserId();
    const body = (await request.json()) as UpdateTripBody;

    // Verify ownership
    const existingTrip = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, id), eq(trip.userId, userId)))
      .limit(1);

    if (existingTrip.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const updatedTrip = await db
      .update(trip)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(trip.id, id))
      .returning();

    return NextResponse.json({ trip: updatedTrip[0] });
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

// DELETE /api/trips/[id] - Delete a trip
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = getUserId();

    // Verify ownership
    const existingTrip = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, id), eq(trip.userId, userId)))
      .limit(1);

    if (existingTrip.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Delete overrides first (cascade should handle this, but being explicit)
    const tripTxs = await db
      .select({ id: tripTransaction.id })
      .from(tripTransaction)
      .where(eq(tripTransaction.tripId, id));

    for (const tx of tripTxs) {
      await db.delete(tripOverride).where(eq(tripOverride.tripTransactionId, tx.id));
    }

    // Delete trip transactions
    await db.delete(tripTransaction).where(eq(tripTransaction.tripId, id));

    // Delete trip
    await db.delete(trip).where(eq(trip.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 }
    );
  }
}
