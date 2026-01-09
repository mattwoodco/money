"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Loader2,
  Wand2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useId, use } from "react";

type Trip = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  homeCurrency: string;
  isActive: boolean | null;
};

type TripTransaction = {
  tripTransactionId: string;
  confidence: string | null;
  isManual: boolean | null;
  transactionId: string;
  amount: string;
  isoCurrencyCode: string | null;
  description: string | null;
  merchantName: string | null;
  category: string | null;
  subcategory: string | null;
  date: string;
  pending: boolean | null;
  accountName: string;
  institutionName: string | null;
  categoryOverride: string | null;
  subcategoryOverride: string | null;
  notes: string | null;
};

type TripSummary = {
  totalSpend: number;
  transactionCount: number;
  categoryBreakdown: Record<string, number>;
  needsReview: number;
  reviewed: number;
};

function formatCurrency(
  amount: string | number,
  currencyCode: string = "USD"
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
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

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  const endFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startFormat.format(start)} - ${endFormat.format(end)}`;
}

function getDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

type TripDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = use(params);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [transactions, setTransactions] = useState<TripTransaction[]>([]);
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const tableId = useId();

  const fetchTripData = async () => {
    try {
      setLoading(true);

      // Fetch trip details
      const tripResponse = await fetch(`/api/trips/${id}`);
      const tripData = await tripResponse.json();

      if (tripData.trip) {
        setTrip(tripData.trip);
      }

      // Fetch trip transactions
      const txResponse = await fetch(`/api/trips/${id}/transactions`);
      const txData = await txResponse.json();

      if (txData.transactions) {
        setTransactions(txData.transactions);
        setSummary(txData.summary);
      }
    } catch (error) {
      console.error("Error fetching trip data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripData();
  }, [id]);

  const handleAutoAssign = async () => {
    try {
      setAutoAssigning(true);

      // First preview
      const previewResponse = await fetch(`/api/trips/${id}/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "preview" }),
      });
      const previewData = await previewResponse.json();

      if (previewData.potentialMatches === 0) {
        alert("No matching transactions found to auto-assign.");
        return;
      }

      // Confirm with user
      const confirmed = window.confirm(
        `Found ${previewData.potentialMatches} potential transactions to assign.\n\n` +
        `High confidence: ${previewData.summary.highConfidence}\n` +
        `Medium confidence: ${previewData.summary.mediumConfidence}\n` +
        `Low confidence: ${previewData.summary.lowConfidence}\n\n` +
        `Do you want to assign these transactions?`
      );

      if (!confirmed) return;

      // Execute
      const executeResponse = await fetch(`/api/trips/${id}/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "execute" }),
      });
      const executeData = await executeResponse.json();

      if (executeData.assigned > 0) {
        alert(`Successfully assigned ${executeData.assigned} transactions.`);
        fetchTripData();
      }
    } catch (error) {
      console.error("Error auto-assigning:", error);
      alert("Failed to auto-assign transactions.");
    } finally {
      setAutoAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Trip not found</h3>
            <p className="text-muted-foreground text-center mb-4">
              The trip you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
            <Link href="/trips">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Trips
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dayCount = getDayCount(trip.startDate, trip.endDate);
  const avgDailySpend = summary && dayCount > 0 ? summary.totalSpend / dayCount : 0;

  // Sort categories by spend
  const sortedCategories = summary
    ? Object.entries(summary.categoryBreakdown).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/trips"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Trips
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
            {trip.description && (
              <p className="text-muted-foreground mb-3">{trip.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {formatDateRange(trip.startDate, trip.endDate)}
              </span>
              <span className="flex items-center">
                <DollarSign className="mr-1 h-4 w-4" />
                {trip.homeCurrency}
              </span>
              <span>{dayCount} days</span>
            </div>
          </div>

          <Button
            onClick={handleAutoAssign}
            disabled={autoAssigning}
            variant="outline"
          >
            {autoAssigning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Auto-Assign Transactions
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalSpend || 0, trip.homeCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Daily Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(avgDailySpend, trip.homeCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.transactionCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Review Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {summary && summary.needsReview > 0 ? (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-lg font-semibold">
                    {summary.needsReview} need review
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-semibold">All reviewed</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Category Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Use auto-assign to add transactions from this date range
                </p>
                <Button
                  onClick={handleAutoAssign}
                  disabled={autoAssigning}
                >
                  {autoAssigning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Auto-Assign Transactions
                </Button>
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
                      <TableHead>Confidence</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const confidence = parseFloat(tx.confidence || "1");
                      const displayCategory = tx.categoryOverride || tx.category;

                      return (
                        <TableRow key={`${tableId}-${tx.tripTransactionId}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatDate(tx.date)}</span>
                              {tx.pending && (
                                <Badge variant="outline" className="w-fit mt-1 text-xs">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {tx.merchantName || tx.description || "Unknown"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {tx.accountName}
                                {tx.institutionName && ` • ${tx.institutionName}`}
                              </span>
                              {tx.notes && (
                                <span className="text-xs text-muted-foreground italic mt-1">
                                  {tx.notes}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {displayCategory ? (
                              <Badge variant="secondary">
                                {displayCategory}
                                {(tx.subcategoryOverride || tx.subcategory) &&
                                  ` • ${tx.subcategoryOverride || tx.subcategory}`}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                confidence >= 0.6
                                  ? "default"
                                  : confidence >= 0.4
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {tx.isManual ? "Manual" : `${Math.round(confidence * 100)}%`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                parseFloat(tx.amount) < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400"
                              }
                            >
                              {formatCurrency(tx.amount, tx.isoCurrencyCode || trip.homeCurrency)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="breakdown">
          {sortedCategories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No data yet</h3>
                <p className="text-muted-foreground text-center">
                  Add transactions to see category breakdown
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sortedCategories.map(([category, amount]) => {
                      const percentage = summary
                        ? (amount / summary.totalSpend) * 100
                        : 0;

                      return (
                        <div key={`${tableId}-cat-${category}`} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{category}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(amount, trip.homeCurrency)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trip Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Transactions</span>
                      <span className="font-medium">{summary?.transactionCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categories</span>
                      <span className="font-medium">{sortedCategories.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trip Duration</span>
                      <span className="font-medium">{dayCount} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg per Transaction</span>
                      <span className="font-medium">
                        {summary && summary.transactionCount > 0
                          ? formatCurrency(
                              summary.totalSpend / summary.transactionCount,
                              trip.homeCurrency
                            )
                          : formatCurrency(0, trip.homeCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Largest Category</span>
                      <span className="font-medium">
                        {sortedCategories[0]?.[0] || "—"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
