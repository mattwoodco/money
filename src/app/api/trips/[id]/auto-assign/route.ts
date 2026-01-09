import { db } from "@/lib/db";
import { trip, tripTransaction, plaidTransaction } from "@/lib/db/schema";
import { eq, and, gte, lte, or, ilike, not, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// TODO: Replace with actual auth when authentication is implemented
const getUserId = () => {
  return "test-user-123";
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AutoAssignBody = {
  mode?: "preview" | "execute";
  includeNonUSD?: boolean;
  merchantPatterns?: string[];
};

// POST /api/trips/[id]/auto-assign - Auto-assign transactions based on rules
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = getUserId();
    const body = (await request.json()) as AutoAssignBody;

    const { mode = "preview", includeNonUSD = true, merchantPatterns = [] } = body;

    // Get trip details
    const tripData = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, id), eq(trip.userId, userId)))
      .limit(1);

    if (tripData.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const currentTrip = tripData[0];

    // Get existing trip transaction IDs to exclude
    const existingTripTxs = await db
      .select({ transactionId: tripTransaction.transactionId })
      .from(tripTransaction)
      .where(eq(tripTransaction.tripId, id));

    const existingIds = existingTripTxs.map((t) => t.transactionId);

    // Build conditions for auto-matching
    // Phase 1: Date range match (base condition)
    const baseConditions = [
      eq(plaidTransaction.userId, userId),
      gte(plaidTransaction.date, currentTrip.startDate),
      lte(plaidTransaction.date, currentTrip.endDate),
    ];

    // Exclude already-assigned transactions
    if (existingIds.length > 0) {
      baseConditions.push(not(inArray(plaidTransaction.id, existingIds)));
    }

    // Find matching transactions
    let matchingTransactions = await db
      .select({
        id: plaidTransaction.id,
        amount: plaidTransaction.amount,
        isoCurrencyCode: plaidTransaction.isoCurrencyCode,
        merchantName: plaidTransaction.merchantName,
        description: plaidTransaction.description,
        category: plaidTransaction.category,
        date: plaidTransaction.date,
      })
      .from(plaidTransaction)
      .where(and(...baseConditions));

    // Calculate confidence scores and apply additional filters
    const scoredTransactions = matchingTransactions.map((tx) => {
      let confidence = 0.3; // Base confidence for date match

      // Non-USD currency suggests foreign transaction
      if (
        includeNonUSD &&
        tx.isoCurrencyCode &&
        tx.isoCurrencyCode !== currentTrip.homeCurrency
      ) {
        confidence += 0.4;
      }

      // Merchant pattern matching
      if (merchantPatterns.length > 0) {
        const merchantLower = (tx.merchantName || "").toLowerCase();
        const descLower = (tx.description || "").toLowerCase();

        for (const pattern of merchantPatterns) {
          const patternLower = pattern.toLowerCase();
          if (
            merchantLower.includes(patternLower) ||
            descLower.includes(patternLower)
          ) {
            confidence += 0.2;
            break;
          }
        }
      }

      // Travel-related categories boost confidence
      const travelCategories = [
        "TRAVEL",
        "AIRLINES",
        "LODGING",
        "RENTAL",
        "TAXI",
        "TRANSPORTATION",
        "FOOD_AND_DRINK",
        "RESTAURANTS",
      ];

      if (
        tx.category &&
        travelCategories.some((cat) =>
          tx.category!.toUpperCase().includes(cat)
        )
      ) {
        confidence += 0.1;
      }

      return {
        ...tx,
        confidence: Math.min(confidence, 1.0), // Cap at 1.0
      };
    });

    // Filter by minimum confidence (0.3 = date match only)
    const eligibleTransactions = scoredTransactions.filter(
      (tx) => tx.confidence >= 0.3
    );

    if (mode === "preview") {
      // Return preview of what would be assigned
      return NextResponse.json({
        mode: "preview",
        trip: {
          name: currentTrip.name,
          startDate: currentTrip.startDate,
          endDate: currentTrip.endDate,
        },
        potentialMatches: eligibleTransactions.length,
        transactions: eligibleTransactions.slice(0, 50), // Limit preview to 50
        summary: {
          highConfidence: eligibleTransactions.filter((t) => t.confidence >= 0.6)
            .length,
          mediumConfidence: eligibleTransactions.filter(
            (t) => t.confidence >= 0.4 && t.confidence < 0.6
          ).length,
          lowConfidence: eligibleTransactions.filter((t) => t.confidence < 0.4)
            .length,
        },
      });
    }

    // Execute mode - actually assign transactions
    if (eligibleTransactions.length === 0) {
      return NextResponse.json({
        mode: "execute",
        assigned: 0,
        message: "No eligible transactions found to assign",
      });
    }

    const newTripTransactions = eligibleTransactions.map((tx) => ({
      id: randomUUID(),
      tripId: id,
      transactionId: tx.id,
      confidence: tx.confidence.toFixed(2),
      isManual: false,
    }));

    await db.insert(tripTransaction).values(newTripTransactions);

    return NextResponse.json({
      mode: "execute",
      assigned: newTripTransactions.length,
      summary: {
        highConfidence: eligibleTransactions.filter((t) => t.confidence >= 0.6)
          .length,
        mediumConfidence: eligibleTransactions.filter(
          (t) => t.confidence >= 0.4 && t.confidence < 0.6
        ).length,
        lowConfidence: eligibleTransactions.filter((t) => t.confidence < 0.4)
          .length,
      },
    });
  } catch (error) {
    console.error("Error auto-assigning transactions:", error);
    return NextResponse.json(
      { error: "Failed to auto-assign transactions" },
      { status: 500 }
    );
  }
}
