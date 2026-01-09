import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/lib/db";
import { plaidItem, plaidAccount } from "@/lib/db/schema";

// TODO: Replace with actual auth when authentication is implemented
const getUserId = () => {
  return "test-user-123";
};

type ExchangeTokenBody = {
  publicToken: string;
  institutionId: string;
  institutionName: string;
};

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId();
    const body = (await request.json()) as ExchangeTokenBody;
    const { publicToken, institutionId, institutionName } = body;

    if (!publicToken) {
      return NextResponse.json(
        { error: "publicToken is required" },
        { status: 400 }
      );
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Save the Plaid item
    await db.insert(plaidItem).values({
      id: itemId,
      userId,
      accessToken,
      institutionId: institutionId || "unknown",
      institutionName: institutionName || "Unknown Institution",
    });

    // Fetch and save accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    for (const account of accountsResponse.data.accounts) {
      await db.insert(plaidAccount).values({
        id: account.account_id,
        itemId,
        userId,
        name: account.name,
        officialName: account.official_name || null,
        mask: account.mask || null,
        type: account.type,
        subtype: account.subtype || null,
        currentBalance: account.balances.current?.toString() || null,
        availableBalance: account.balances.available?.toString() || null,
        isoCurrencyCode: account.balances.iso_currency_code || "USD",
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      itemId,
      accountCount: accountsResponse.data.accounts.length,
    });
  } catch (error) {
    console.error("Error exchanging token:", error);
    return NextResponse.json(
      { error: "Failed to exchange token" },
      { status: 500 }
    );
  }
}
