"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  BedDouble,
  Search,
  CheckCircle2,
  ArrowLeft,
  Users,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/services/mockDataService";
import { Room } from "@/types";

export default function FacilitiesPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    dataService.getRooms().then(setRooms);
  }, []);

  const totalBeds = rooms.reduce((acc, r) => acc + r.capacity, 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + r.occupiedCount, 0);
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const filtered = rooms.filter((r) =>
    r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.buildingName ? r.buildingName.toLowerCase().includes(searchQuery.toLowerCase()) : false)
  );

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Rooms & Facilities</h1>
              <p className="text-[11px] text-[#686581]">Room occupancy & bed allocation</p>
            </div>
          </div>
          <Badge variant="purple" className="px-2.5 py-1">
            {occupancyPercent}% Occupied
          </Badge>
        </div>

        {/* Occupancy Card */}
        <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#686581] uppercase block">Ashram Capacity</span>
              <h3 className="text-xl font-black text-[#17133A]">
                {occupiedBeds} / {totalBeds} Beds Filled
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#16A34A]">{totalBeds - occupiedBeds} Beds Vacant</span>
              <p className="text-[10px] text-[#686581]">Across {rooms.length} Rooms</p>
            </div>
          </div>

          <div className="w-full bg-[#FAF8FF] h-2.5 rounded-full overflow-hidden border border-[#E8E1F5]">
            <div
              className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] h-full rounded-full transition-all"
              style={{ width: `${occupancyPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search room number or building..."
          icon={<Search className="h-4 w-4 text-[#686581]" />}
          className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
        />

        {/* Room Cards */}
        <div className="space-y-3">
          {filtered.map((room) => {
            const isFull = room.status === "full" || room.occupiedCount >= room.capacity;
            const vacantBeds = Math.max(0, room.capacity - room.occupiedCount);
            return (
              <div
                key={room.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#6D28D9] font-black text-sm">
                      <BedDouble className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#17133A]">
                        {room.roomNumber}
                      </h3>
                      <p className="text-[11px] text-[#686581]">
                        {room.buildingName || "Main Block"} • {room.floorLabel || "Ground Floor"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isFull ? "danger" : "success"}
                    className="text-[10px] uppercase font-bold"
                  >
                    {isFull ? "Full" : `${vacantBeds} Vacant`}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E8E1F5]/60">
                  <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
                    <span className="text-[10px] text-[#686581] block">Total Beds</span>
                    <span className="font-bold text-[#17133A] text-[11px]">
                      {room.capacity} Beds ({room.occupiedCount} Occupied)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
                    <span className="text-[10px] text-[#686581] block">Status</span>
                    <span className="font-bold text-[#6D28D9] text-[11px] uppercase">
                      {room.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#686581]">
                    Daily sanitization: Completed 09:00 AM
                  </span>
                  <button
                    type="button"
                    className="text-xs font-bold text-[#6D28D9] hover:underline"
                  >
                    View Beds →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
