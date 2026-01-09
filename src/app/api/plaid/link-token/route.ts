import { NextResponse } from "next/server";
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from "@/lib/plaid";
import { Products, CountryCode } from "plaid";

// TODO: Replace with actual auth when authentication is implemented
const getUserId = () => {
  return "test-user-123";
};

export async function POST() {
  try {
    const userId = getUserId();

    console.log("Creating link token with:", {
      userId,
      products: PLAID_PRODUCTS,
      countryCodes: PLAID_COUNTRY_CODES,
    });

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: "Money App",
      products: PLAID_PRODUCTS as unknown as Products[],
      country_codes: PLAID_COUNTRY_CODES as unknown as CountryCode[],
      language: "en",
    });

    console.log("Link token created successfully");
    return NextResponse.json({ linkToken: response.data.link_token });
  } catch (error) {
    console.error("Error creating link token:", error);
    // Log detailed Plaid error info
    if (error && typeof error === 'object' && 'response' in error) {
      const plaidError = error as { response?: { data?: unknown; status?: number } };
      console.error("Plaid API error details:", JSON.stringify(plaidError.response?.data, null, 2));
      console.error("Plaid API status:", plaidError.response?.status);
    }
    return NextResponse.json(
      { error: "Failed to create link token", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
