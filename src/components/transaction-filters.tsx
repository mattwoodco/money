"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterIcon, X, Search } from "lucide-react";
import { useState, useTransition, useEffect } from "react";

interface Account {
  id: string;
  name: string;
  officialName: string | null;
  institutionName: string | null;
}

interface TransactionFiltersProps {
  categories: string[];
  accounts?: Account[];
  search?: string;
}

export function TransactionFilters({ categories, accounts = [], search: initialSearch }: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch || "");

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const category = searchParams.get("category") || "";
  const accountId = searchParams.get("accountId") || "";

  const hasActiveFilters = startDate || endDate || category || accountId || search;

  // Update search in URL when it changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (search) {
          params.set("search", search);
          params.delete("page"); // Reset to first page when searching
        } else {
          params.delete("search");
        }
        router.push(`?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, router, searchParams]);

  const updateFilters = (updates: {
    startDate?: string;
    endDate?: string;
    category?: string;
    accountId?: string;
  }) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.startDate) {
        params.set("startDate", updates.startDate);
      } else {
        params.delete("startDate");
      }

      if (updates.endDate) {
        params.set("endDate", updates.endDate);
      } else {
        params.delete("endDate");
      }

      if (updates.category) {
        params.set("category", updates.category);
      } else {
        params.delete("category");
      }

      if (updates.accountId) {
        params.set("accountId", updates.accountId);
      } else {
        params.delete("accountId");
      }

      params.delete("page"); // Reset to first page when filtering
      router.push(`?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push(window.location.pathname);
    });
  };

  const activeFilterCount = [
    startDate && "Date",
    category && "Category",
    accountId && "Account",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Search Input */}
      <div className="relative flex-1 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by merchant or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              <FilterIcon className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {accounts.length > 0 && (
              <>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <div className="max-h-48 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() =>
                      updateFilters({
                        accountId: accountId ? undefined : "",
                      })
                    }
                    className={!accountId ? "bg-accent" : ""}
                  >
                    All Accounts
                  </DropdownMenuItem>
                  {accounts.map((account) => (
                    <DropdownMenuItem
                      key={account.id}
                      onClick={() =>
                        updateFilters({
                          accountId: accountId === account.id ? undefined : account.id,
                        })
                      }
                      className={accountId === account.id ? "bg-accent" : ""}
                    >
                      <div className="flex flex-col">
                        <span>{account.officialName || account.name}</span>
                        {account.institutionName && (
                          <span className="text-xs text-muted-foreground">
                            {account.institutionName}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel>Date Range</DropdownMenuLabel>
            <div className="p-2 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    updateFilters({ startDate: e.target.value || undefined })
                  }
                  className="w-full px-2 py-1 text-sm border rounded-md"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    updateFilters({ endDate: e.target.value || undefined })
                  }
                  className="w-full px-2 py-1 text-sm border rounded-md"
                />
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Category</DropdownMenuLabel>
            <div className="max-h-48 overflow-y-auto">
              {categories.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No categories available
                </div>
              ) : (
                categories.map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() =>
                      updateFilters({
                        category: category === cat ? undefined : cat,
                      })
                    }
                    className={category === cat ? "bg-accent" : ""}
                  >
                    {cat}
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
