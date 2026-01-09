"use client";

import { useState, useCallback } from "react";
import { usePlaidLink, PlaidLinkOnSuccess } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, RefreshCw } from "lucide-react";

type PlaidLinkButtonProps = {
  onSuccess?: () => void;
  variant?: "connect" | "sync";
};

export function PlaidLinkButton({ onSuccess, variant = "connect" }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchLinkToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/plaid/link-token", {
        method: "POST",
      });
      const data = await response.json();
      if (data.linkToken) {
        setLinkToken(data.linkToken);
      }
    } catch (error) {
      console.error("Error fetching link token:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      setIsLoading(true);
      try {
        // Exchange the public token
        await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken,
            institutionId: metadata.institution?.institution_id,
            institutionName: metadata.institution?.name,
          }),
        });

        // Sync transactions after connecting
        await fetch("/api/plaid/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        onSuccess?.();

        // Refresh the page to show new accounts
        window.location.reload();
      } catch (error) {
        console.error("Error exchanging token:", error);
      } finally {
        setIsLoading(false);
        setLinkToken(null);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
  });

  const handleClick = useCallback(async () => {
    if (linkToken && ready) {
      open();
    } else {
      await fetchLinkToken();
    }
  }, [linkToken, ready, open, fetchLinkToken]);

  // Auto-open when link token is ready
  if (linkToken && ready) {
    open();
  }

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      window.location.reload();
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (variant === "sync") {
    return (
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        variant="outline"
        size="sm"
      >
        {isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        <span className="ml-2">Sync</span>
      </Button>
    );
  }

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      <span className="ml-2">Connect Bank</span>
    </Button>
  );
}
