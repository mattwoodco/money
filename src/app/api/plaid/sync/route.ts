import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/lib/db";
import { plaidItem, plaidAccount, plaidTransaction } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// TODO: Replace with actual auth when authentication is implemented
const getUserId = () => {
  return "test-user-123";
};

type SyncBody = {
  itemId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId();
    const body = (await request.json()) as SyncBody;

    // Get all items for user, or specific item if provided
    const items = body.itemId
      ? await db
          .select()
          .from(plaidItem)
          .where(eq(plaidItem.id, body.itemId))
      : await db
          .select()
          .from(plaidItem)
          .where(eq(plaidItem.userId, userId));

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No connected accounts found" },
        { status: 404 }
      );
    }

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;

    for (const item of items) {
      // Update account balances
      const accountsResponse = await plaidClient.accountsGet({
        access_token: item.accessToken,
      });

      for (const account of accountsResponse.data.accounts) {
        await db
          .update(plaidAccount)
          .set({
            currentBalance: account.balances.current?.toString() || null,
            availableBalance: account.balances.available?.toString() || null,
            updatedAt: new Date(),
          })
          .where(eq(plaidAccount.id, account.account_id));
      }

      // Sync transactions using cursor-based pagination
      let cursor = item.cursor || undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.accessToken,
          cursor,
        });

        const { added, modified, removed, next_cursor, has_more } = response.data;

        // Process added transactions
        for (const txn of added) {
          await db
            .insert(plaidTransaction)
            .values({
              id: txn.transaction_id,
              accountId: txn.account_id,
              userId,
              amount: txn.amount.toString(),
              isoCurrencyCode: txn.iso_currency_code || "USD",
              description: txn.name || txn.merchant_name || "Unknown",
              merchantName: txn.merchant_name || null,
              category: txn.personal_finance_category?.primary || txn.category?.[0] || null,
              subcategory: txn.personal_finance_category?.detailed || txn.category?.[1] || null,
              date: txn.date,
              authorizedDate: txn.authorized_date || null,
              pending: txn.pending,
            })
            .onConflictDoNothing();
        }

        // Process modified transactions
        for (const txn of modified) {
          await db
            .update(plaidTransaction)
            .set({
              amount: txn.amount.toString(),
              description: txn.name || txn.merchant_name || "Unknown",
              merchantName: txn.merchant_name || null,
              category: txn.personal_finance_category?.primary || txn.category?.[0] || null,
              subcategory: txn.personal_finance_category?.detailed || txn.category?.[1] || null,
              date: txn.date,
              authorizedDate: txn.authorized_date || null,
              pending: txn.pending,
              updatedAt: new Date(),
            })
            .where(eq(plaidTransaction.id, txn.transaction_id));
        }

        // Process removed transactions
        for (const txn of removed) {
          if (txn.transaction_id) {
            await db
              .delete(plaidTransaction)
              .where(eq(plaidTransaction.id, txn.transaction_id));
          }
        }

        totalAdded += added.length;
        totalModified += modified.length;
        totalRemoved += removed.length;

        cursor = next_cursor;
        hasMore = has_more;
      }

      // Update cursor for next sync
      await db
        .update(plaidItem)
        .set({ cursor, updatedAt: new Date() })
        .where(eq(plaidItem.id, item.id));
    }

    return NextResponse.json({
      success: true,
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
    });
  } catch (error) {
    console.error("Error syncing transactions:", error);
    return NextResponse.json(
      { error: "Failed to sync transactions" },
      { status: 500 }
    );
  }
}
