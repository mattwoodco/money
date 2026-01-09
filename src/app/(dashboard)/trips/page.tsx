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
import { Plus, Plane, Calendar, DollarSign, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useId } from "react";
import { TripFormDialog } from "@/components/trip-form-dialog";

type Trip = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  homeCurrency: string;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
};

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

function getTripStatus(startDate: string, endDate: string): "upcoming" | "active" | "completed" {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const listId = useId();

  const fetchTrips = async () => {
    try {
      const response = await fetch("/api/trips");
      if (!response.ok) {
        // API returned an error status, treat as empty
        setTrips([]);
        return;
      }
      const data = await response.json();
      setTrips(data.trips || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleTripCreated = () => {
    setIsFormOpen(false);
    fetchTrips();
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trips</h1>
          <p className="text-muted-foreground">
            Track and consolidate expenses for your trips
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Trip
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plane className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No trips yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a trip to start tracking your travel expenses
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Trip
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => {
            const status = getTripStatus(trip.startDate, trip.endDate);
            const dayCount = getDayCount(trip.startDate, trip.endDate);

            return (
              <Link
                key={`${listId}-${trip.id}`}
                href={`/trips/${trip.id}`}
                className="block"
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{trip.name}</CardTitle>
                      <Badge
                        variant={
                          status === "active"
                            ? "default"
                            : status === "upcoming"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {trip.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {trip.description}
                      </p>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {formatDateRange(trip.startDate, trip.endDate)}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="mr-2 h-4 w-4" />
                        {trip.homeCurrency} • {dayCount} days
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-primary">
                      View Details
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <TripFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleTripCreated}
      />
    </div>
  );
}
