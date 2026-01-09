import { db } from "@/lib/db";
import { trip } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// TODO: Replace with actual auth when authentication is implemented
const getUserId = () => {
  return "test-user-123";
};

// GET /api/trips - List all trips for the current user
export async function GET() {
  try {
    const userId = getUserId();

    const trips = await db
      .select()
      .from(trip)
      .where(eq(trip.userId, userId))
      .orderBy(desc(trip.startDate));

    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

type CreateTripBody = {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  homeCurrency?: string;
};

// POST /api/trips - Create a new trip
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId();
    const body = (await request.json()) as CreateTripBody;

    const { name, description, startDate, endDate, homeCurrency } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const newTrip = await db
      .insert(trip)
      .values({
        id: randomUUID(),
        userId,
        name,
        description: description || null,
        startDate,
        endDate,
        homeCurrency: homeCurrency || "USD",
      })
      .returning();

    return NextResponse.json({ trip: newTrip[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
