"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Calendar, Plus, ArrowLeft, MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<"all" | "upcoming" | "past">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [eventType, setEventType] = useState("celebration");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events?timeframe=${timeframe}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load events");
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, location, startTime, eventType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create event");
      setIsAddModalOpen(false);
      setTitle("");
      setLocation("");
      loadEvents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Events &amp; Calendar</h1>
              <p className="text-[11px] text-[#686581]">Ashram activities &amp; health camps</p>
            </div>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-3 rounded-xl bg-[#6D28D9] text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Event</span>
          </Button>
        </div>

        <div className="flex gap-2">
          {(["all", "upcoming", "past"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${
                timeframe === tf ? "bg-[#6D28D9] text-white" : "bg-white border border-[#E8E1F5] text-[#686581]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center justify-between">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
            <button onClick={loadEvents} className="font-bold underline flex items-center gap-1"><RefreshCw className="h-3 w-3" />Retry</button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-[#686581]">Loading calendar events...</div>
        ) : events.length === 0 ? (
          <EmptyState icon={<Calendar className="h-6 w-6" />} title="No events scheduled" description="Create an event to populate the home calendar." />
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#17133A]">{ev.title}</h3>
                  <Badge variant="purple">{ev.status}</Badge>
                </div>
                <p className="text-xs text-[#686581]">
                  {new Date(ev.start_time).toLocaleString()} • {ev.event_type}
                </p>
                {ev.location && (
                  <p className="text-[11px] text-[#686581] flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#6D28D9]" />
                    <span>{ev.location}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Schedule Event">
          <form onSubmit={handleCreate} className="space-y-3">
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
            <Input required type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 text-xs">
              <option value="celebration">Celebration</option>
              <option value="health_camp">Health Camp</option>
              <option value="volunteer_drive">Volunteer Drive</option>
            </select>
            <Button type="submit" className="w-full bg-[#6D28D9] text-white rounded-xl h-10 text-xs font-bold">
              Create Event
            </Button>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
