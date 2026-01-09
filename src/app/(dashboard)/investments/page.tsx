import { db } from "@/lib/db";
import { plaidAccount, plaidItem, plaidHolding, plaidSecurity } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

// TODO: Replace with actual auth when authentication is implemented
const getUserId = () => {
  return "test-user-123";
};

function formatCurrency(amount: string | null | undefined, currencyCode: string | null | undefined = "USD"): string {
  if (!amount) return "$0.00";
  
  const numAmount = parseFloat(amount);
  const currency = currencyCode || "USD";
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(numAmount);
}

function formatNumber(num: number | null | undefined, decimals: number = 2): string {
  if (num === null || num === undefined) return "—";
  return num.toFixed(decimals);
}

async function getHoldings(userId: string | null) {
  if (!userId) {
    return [];
  }

  const holdings = await db
    .select({
      id: plaidHolding.id,
      accountId: plaidHolding.accountId,
      quantity: plaidHolding.quantity,
      costBasis: plaidHolding.costBasis,
      institutionValue: plaidHolding.institutionValue,
      securityId: plaidSecurity.id,
      securityName: plaidSecurity.name,
      tickerSymbol: plaidSecurity.tickerSymbol,
      securityType: plaidSecurity.type,
      closePrice: plaidSecurity.closePrice,
      isoCurrencyCode: plaidSecurity.isoCurrencyCode,
      accountName: plaidAccount.name,
      accountOfficialName: plaidAccount.officialName,
      institutionName: plaidItem.institutionName,
    })
    .from(plaidHolding)
    .innerJoin(plaidSecurity, eq(plaidHolding.securityId, plaidSecurity.id))
    .innerJoin(plaidAccount, eq(plaidHolding.accountId, plaidAccount.id))
    .innerJoin(plaidItem, eq(plaidAccount.itemId, plaidItem.id))
    .where(
      and(
        eq(plaidHolding.userId, userId),
        eq(plaidAccount.isActive, true)
      )
    )
    .orderBy(sql`${plaidSecurity.name} ASC`);

  return holdings;
}

export default async function InvestmentsPage() {
  const userId = getUserId();
  const holdings = await getHoldings(userId);

  // Calculate portfolio summary
  const totalValue = holdings.reduce((sum, holding) => {
    const value = holding.institutionValue ? parseFloat(holding.institutionValue) : 0;
    return sum + value;
  }, 0);

  const totalCostBasis = holdings.reduce((sum, holding) => {
    const cost = holding.costBasis ? parseFloat(holding.costBasis) : 0;
    return sum + cost;
  }, 0);

  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Calculate current price from institutionValue and quantity
  const holdingsWithCalculations = holdings.map((holding) => {
    const quantity = holding.quantity ? parseFloat(holding.quantity) : 0;
    const institutionValue = holding.institutionValue ? parseFloat(holding.institutionValue) : 0;
    const costBasis = holding.costBasis ? parseFloat(holding.costBasis) : 0;
    
    // Current price per share (institutionValue / quantity)
    const currentPrice = quantity > 0 ? institutionValue / quantity : holding.closePrice ? parseFloat(holding.closePrice) : 0;
    
    // Gain/loss
    const gainLoss = institutionValue - costBasis;
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    return {
      ...holding,
      currentPrice,
      gainLoss,
      gainLossPercent,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Investments</h1>
        <p className="text-muted-foreground">
          Overview of your investment holdings across all accounts
        </p>
      </div>

      {/* Portfolio Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
          <CardDescription>Total value and performance across all holdings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Value</p>
              <p className="text-3xl font-bold">
                {formatCurrency(totalValue.toString())}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Cost Basis</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(totalCostBasis.toString())}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Gain/Loss</p>
              <div className="flex items-baseline gap-2">
                <p
                  className={`text-2xl font-semibold ${
                    totalGainLoss >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(totalGainLoss.toString())}
                </p>
                <p
                  className={`text-lg ${
                    totalGainLossPercent >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  ({totalGainLossPercent >= 0 ? "+" : ""}
                  {formatNumber(totalGainLossPercent)}%)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">
              No investment holdings found.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Connect investment accounts to view your holdings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Security</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdingsWithCalculations.map((holding) => (
                  <TableRow key={holding.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{holding.securityName}</span>
                        {holding.securityType && (
                          <Badge variant="secondary" className="w-fit mt-1 text-xs">
                            {holding.securityType}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {holding.tickerSymbol ? (
                        <span className="font-mono">{holding.tickerSymbol}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/accounts/${holding.accountId}`}
                        className="text-primary hover:underline"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {holding.accountOfficialName || holding.accountName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {holding.institutionName}
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono">
                        {formatNumber(parseFloat(holding.quantity || "0"), 4)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {holding.currentPrice > 0 ? (
                        formatCurrency(holding.currentPrice.toString(), holding.isoCurrencyCode)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {holding.institutionValue ? (
                        <span className="font-semibold">
                          {formatCurrency(holding.institutionValue, holding.isoCurrencyCode)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {holding.costBasis ? (
                        formatCurrency(holding.costBasis, holding.isoCurrencyCode)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {holding.costBasis && holding.institutionValue ? (
                        <div className="flex flex-col items-end">
                          <span
                            className={
                              holding.gainLoss >= 0
                                ? "text-green-600 dark:text-green-400 font-semibold"
                                : "text-red-600 dark:text-red-400 font-semibold"
                            }
                          >
                            {holding.gainLoss >= 0 ? "+" : ""}
                            {formatCurrency(holding.gainLoss.toString(), holding.isoCurrencyCode)}
                          </span>
                          <span
                            className={`text-sm ${
                              holding.gainLossPercent >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {holding.gainLossPercent >= 0 ? "+" : ""}
                            {formatNumber(holding.gainLossPercent)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
