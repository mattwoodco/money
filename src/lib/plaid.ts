import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const PLAID_ENV = process.env.PLAID_ENV || "sandbox";

function getPlaidSecret(): string {
  if (PLAID_ENV === "production") {
    return process.env.PLAID_PRODUCTION_SECRET || "";
  }
  // sandbox and development both use the sandbox secret in Plaid's system
  return process.env.PLAID_SANDBOX_SECRET || "";
}

function getPlaidEnvironment(): string {
  switch (PLAID_ENV) {
    case "production":
      return PlaidEnvironments.production;
    case "development":
      // Development uses sandbox URL but with production-approved account
      return PlaidEnvironments.sandbox;
    default:
      return PlaidEnvironments.sandbox;
  }
}

// Debug logging
console.log("Plaid config:", {
  env: PLAID_ENV,
  clientId: process.env.PLAID_CLIENT_ID,
  hasSecret: !!getPlaidSecret(),
  secretLength: getPlaidSecret()?.length,
  environment: getPlaidEnvironment(),
});

const configuration = new Configuration({
  basePath: getPlaidEnvironment(),
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID || "",
      "PLAID-SECRET": getPlaidSecret(),
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const PLAID_PRODUCTS = ["transactions"] as const;
export const PLAID_COUNTRY_CODES = ["US"] as const;
