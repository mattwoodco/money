import { db } from "@/lib/db";
import { plaidAccount, plaidItem, plaidTransaction } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, or, ilike } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

async function getTransactions(
  userId: string | null,
  filters?: {
    search?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
  },
  page: number = 1,
  pageSize: number = 50
) {
  if (!userId) {
    return { transactions: [], total: 0 };
  }

  const conditions = [
    eq(plaidTransaction.userId, userId),
  ];

  if (filters?.accountId) {
    conditions.push(eq(plaidTransaction.accountId, filters.accountId));
  }

  if (filters?.startDate) {
    conditions.push(gte(plaidTransaction.date, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(plaidTransaction.date, filters.endDate));
  }

  if (filters?.category) {
    conditions.push(eq(plaidTransaction.category, filters.category));
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(plaidTransaction.merchantName, searchTerm),
        ilike(plaidTransaction.description, searchTerm)
      )!
    );
  }

  // Get total count for pagination
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(plaidTransaction)
    .where(and(...conditions));

  const total = Number(totalResult[0]?.count || 0);

  // Get paginated transactions
  const transactions = await db
    .select({
      id: plaidTransaction.id,
      accountId: plaidTransaction.accountId,
      amount: plaidTransaction.amount,
      isoCurrencyCode: plaidTransaction.isoCurrencyCode,
      description: plaidTransaction.description,
      merchantName: plaidTransaction.merchantName,
      category: plaidTransaction.category,
      subcategory: plaidTransaction.subcategory,
      date: plaidTransaction.date,
      authorizedDate: plaidTransaction.authorizedDate,
      pending: plaidTransaction.pending,
      accountName: plaidAccount.name,
      accountOfficialName: plaidAccount.officialName,
      institutionName: plaidItem.institutionName,
    })
    .from(plaidTransaction)
    .innerJoin(plaidAccount, eq(plaidTransaction.accountId, plaidAccount.id))
    .innerJoin(plaidItem, eq(plaidAccount.itemId, plaidItem.id))
    .where(and(...conditions))
    .orderBy(sql`${plaidTransaction.date} DESC`)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { transactions, total };
}

async function getAccounts(userId: string | null) {
  if (!userId) {
    return [];
  }

  const accounts = await db
    .select({
      id: plaidAccount.id,
      name: plaidAccount.name,
      officialName: plaidAccount.officialName,
      institutionName: plaidItem.institutionName,
    })
    .from(plaidAccount)
    .innerJoin(plaidItem, eq(plaidAccount.itemId, plaidItem.id))
    .where(
      and(
        eq(plaidAccount.userId, userId),
        eq(plaidAccount.isActive, true)
      )
    )
    .orderBy(plaidAccount.name);

  return accounts;
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

interface TransactionsPageProps {
  searchParams: Promise<{
    search?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const userId = getUserId();
  
  const page = parseInt(params.page || "1", 10);
  const pageSize = 50;

  const { transactions, total } = await getTransactions(userId, {
    search: params.search,
    accountId: params.accountId,
    startDate: params.startDate,
    endDate: params.endDate,
    category: params.category,
  }, page, pageSize);

  const accounts = await getAccounts(userId);
  const categories = await getCategories(userId);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transactions</h1>
        <p className="text-muted-foreground">
          View and search all transactions across your accounts
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <TransactionFilters
          categories={categories}
          accounts={accounts}
          search={params.search}
        />
      </div>

      {/* Transactions Table */}
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No transactions found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
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
                        <Link
                          href={`/accounts/${transaction.accountId}`}
                          className="text-primary hover:underline"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {transaction.accountOfficialName || transaction.accountName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {transaction.institutionName}
                            </span>
                          </div>
                        </Link>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} transactions
              </div>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/transactions?${new URLSearchParams({
                      ...params,
                      page: (page - 1).toString(),
                    }).toString()}`}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-accent"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/transactions?${new URLSearchParams({
                      ...params,
                      page: (page + 1).toString(),
                    }).toString()}`}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-accent"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
