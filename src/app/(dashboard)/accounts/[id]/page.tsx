import { db } from "@/lib/db";
import { plaidAccount, plaidItem, plaidTransaction } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
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
import { TransactionFilters } from "@/components/transaction-filters";
import { notFound } from "next/navigation";

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getAccountTypeLabel(type: string, subtype: string | null): string {
  if (subtype) {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} - ${subtype.charAt(0).toUpperCase() + subtype.slice(1)}`;
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

async function getAccount(accountId: string, userId: string | null) {
  if (!userId) {
    return null;
  }

  const account = await db
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
        eq(plaidAccount.id, accountId),
        eq(plaidAccount.userId, userId),
        eq(plaidAccount.isActive, true)
      )
    )
    .limit(1);

  return account[0] || null;
}

async function getTransactions(
  accountId: string,
  userId: string | null,
  filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }
) {
  if (!userId) {
    return [];
  }

  const conditions = [
    eq(plaidTransaction.accountId, accountId),
    eq(plaidTransaction.userId, userId),
  ];

  if (filters?.startDate) {
    conditions.push(gte(plaidTransaction.date, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(plaidTransaction.date, filters.endDate));
  }

  if (filters?.category) {
    conditions.push(eq(plaidTransaction.category, filters.category));
  }

  const transactions = await db
    .select({
      id: plaidTransaction.id,
      amount: plaidTransaction.amount,
      isoCurrencyCode: plaidTransaction.isoCurrencyCode,
      description: plaidTransaction.description,
      merchantName: plaidTransaction.merchantName,
      category: plaidTransaction.category,
      subcategory: plaidTransaction.subcategory,
      date: plaidTransaction.date,
      authorizedDate: plaidTransaction.authorizedDate,
      pending: plaidTransaction.pending,
    })
    .from(plaidTransaction)
    .where(and(...conditions))
    .orderBy(sql`${plaidTransaction.date} DESC`);

  return transactions;
}

async function getCategories(userId: string | null) {
  if (!userId) {
    return [];
  }

  const categories = await db
    .selectDistinct({
      category: plaidTransaction.category,
    })
    .from(plaidTransaction)
    .where(eq(plaidTransaction.userId, userId));

  return categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null)
    .sort();
}

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string; category?: string }>;
}

export default async function AccountDetailPage({ params, searchParams }: AccountDetailPageProps) {
  const { id } = await params;
  const filters = await searchParams;
  const userId = getUserId();
  
  const account = await getAccount(id, userId);
  
  if (!account) {
    notFound();
  }

  const transactions = await getTransactions(id, userId, {
    startDate: filters.startDate,
    endDate: filters.endDate,
    category: filters.category,
  });

  const categories = await getCategories(userId);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Account Header */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">
                  {account.officialName || account.name}
                </CardTitle>
                <CardDescription className="text-base">
                  {account.institutionName}
                </CardDescription>
              </div>
              {account.mask && (
                <Badge variant="outline" className="ml-2">
                  •••• {account.mask}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <Badge variant="secondary" className="text-sm">
                  {getAccountTypeLabel(account.type, account.subtype)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(account.currentBalance, account.isoCurrencyCode)}
                </p>
              </div>
              {account.availableBalance && 
               account.currentBalance && 
               account.availableBalance !== account.currentBalance && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(account.availableBalance, account.isoCurrencyCode)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Transactions</h2>
          <TransactionFilters categories={categories} />
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                No transactions found.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(transaction.date)}</span>
                          {transaction.pending && (
                            <Badge variant="outline" className="w-fit mt-1 text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {transaction.merchantName || transaction.description || "Unknown"}
                          </span>
                          {transaction.merchantName && transaction.description && (
                            <span className="text-sm text-muted-foreground">
                              {transaction.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.category ? (
                          <Badge variant="secondary">
                            {transaction.category}
                            {transaction.subcategory && ` - ${transaction.subcategory}`}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            parseFloat(transaction.amount) < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }
                        >
                          {formatCurrency(transaction.amount, transaction.isoCurrencyCode)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
