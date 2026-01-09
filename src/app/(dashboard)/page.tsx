import { db } from "@/lib/db";
import { plaidAccount, plaidItem } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlaidLinkButton } from "@/components/plaid-link";

// TODO: Replace with actual auth when authentication is implemented
// For now, using a placeholder userId - this should come from auth context
const getUserId = () => {
  // TODO: Replace with actual auth when authentication is implemented
  return "test-user-123";
};

async function getAccounts(userId: string | null) {
  if (!userId) {
    return [];
  }

  const accounts = await db
    .select({
      id: plaidAccount.id,
      name: plaidAccount.name,
      officialName: plaidAccount.officialName,
      mask: plaidAccount.mask,
      type: plaidAccount.type,
      subtype: plaidAccount.subtype,
      currentBalance: plaidAccount.currentBalance,
      availableBalance: plaidAccount.availableBalance,
      isoCurrencyCode: plaidAccount.isoCurrencyCode,
      institutionName: plaidItem.institutionName,
      institutionId: plaidItem.institutionId,
    })
    .from(plaidAccount)
    .innerJoin(plaidItem, eq(plaidAccount.itemId, plaidItem.id))
    .where(
      and(
        eq(plaidAccount.userId, userId),
        eq(plaidAccount.isActive, true)
      )
    );

  // Sort accounts by name
  return accounts.sort((a, b) => (a.officialName || a.name).localeCompare(b.officialName || b.name));
}

function formatCurrency(amount: string | null | undefined, currencyCode: string | null | undefined = "USD"): string {
  if (!amount) return "$0.00";
  
  const numAmount = parseFloat(amount);
  const currency = currencyCode || "USD";
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(numAmount);
}

function getAccountTypeLabel(type: string, subtype: string | null): string {
  if (subtype) {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} - ${subtype.charAt(0).toUpperCase() + subtype.slice(1)}`;
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default async function DashboardPage() {
  const userId = getUserId();
  const accounts = await getAccounts(userId);

  // Calculate total net worth (sum of all current balances)
  const totalNetWorth = accounts.reduce((sum, account) => {
    const balance = account.currentBalance ? parseFloat(account.currentBalance) : 0;
    return sum + balance;
  }, 0);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your financial accounts
          </p>
        </div>
        <div className="flex gap-2">
          <PlaidLinkButton variant="sync" />
          <PlaidLinkButton />
        </div>
      </div>

      {/* Net Worth Summary */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardDescription>Net Worth</CardDescription>
          <CardTitle className="text-3xl">
            {formatCurrency(totalNetWorth.toString())}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">
              No accounts connected yet.
            </p>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Connect your bank accounts to get started.
            </p>
            <PlaidLinkButton />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {account.officialName || account.name}
                      </CardTitle>
                      <CardDescription className="text-xs truncate">
                        {account.institutionName} {account.mask && `•••• ${account.mask}`}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {account.subtype || account.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xl font-semibold">
                    {formatCurrency(account.currentBalance, account.isoCurrencyCode)}
                  </p>
                  {account.availableBalance && 
                   account.currentBalance && 
                   account.availableBalance !== account.currentBalance && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(account.availableBalance, account.isoCurrencyCode)} available
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
