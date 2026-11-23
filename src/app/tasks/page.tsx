"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Search,
  Plus,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { dataService } from "@/services/mockDataService";
import { TaskItem } from "@/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    dataService.getTasks().then(setTasks);
  }, []);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === "completed" ? "pending" : "completed",
            }
          : t
      )
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    const item: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      priority: "medium",
      status: "pending",
      dueAt: new Date().toISOString(),
      assignedToName: "Care Staff",
      relatedEntityType: "General",
    };
    setTasks([item, ...tasks]);
    setNewTaskTitle("");
    setIsAddModalOpen(false);
  };

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const filtered = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterPriority === "all" || t.priority === filterPriority;
    return matchesSearch && matchesFilter;
  });

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
              <h1 className="text-lg font-black text-[#17133A]">Tasks & Reminders</h1>
              <p className="text-[11px] text-[#686581]">Operational duties & elderly care alerts</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-xs h-9 rounded-xl font-bold px-3 shadow-soft flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </Button>
        </div>

        {/* Progress Bar Card */}
        <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#17133A]">
              Today's Care Completion
            </span>
            <span className="text-xs font-bold text-[#6D28D9]">
              {completedCount} / {tasks.length} Done
            </span>
          </div>
          <div className="w-full bg-[#FAF8FF] h-2.5 rounded-full overflow-hidden border border-[#E8E1F5]">
            <div
              className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] h-full rounded-full transition-all"
              style={{
                width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : "0%",
              }}
            ></div>
          </div>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search task or reminder..."
          icon={<Search className="h-4 w-4 text-[#686581]" />}
          className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
        />

        {/* Priority Filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {["all", "urgent", "high", "medium", "low"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterPriority === p
                  ? "bg-[#6D28D9] text-white shadow-soft"
                  : "bg-white text-[#686581] border border-[#E8E1F5]"
              }`}
            >
              {p === "all" ? "All Priorities" : p.charAt(0).toUpperCase() + p.slice(1) + " Priority"}
            </button>
          ))}
        </div>

        {/* Task Cards */}
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isDone = item.status === "completed";
            const isUrgentOrHigh = item.priority === "urgent" || item.priority === "high";
            return (
              <div
                key={item.id}
                onClick={() => toggleTask(item.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isDone
                    ? "bg-[#FAF8FF]/60 border-[#E8E1F5] opacity-75"
                    : "bg-white border-[#E8E1F5] shadow-card hover:border-[#6D28D9]/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-[#16A34A] border-[#16A34A] text-white"
                        : "border-[#E8E1F5] bg-[#FAF8FF]"
                    }`}
                  >
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <h3
                      className={`text-xs font-bold ${
                        isDone ? "line-through text-[#686581]" : "text-[#17133A]"
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-[#686581]">
                      Assigned: {item.assignedToName || "Caregiver"} • {item.relatedEntityType || "Daily Care"}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={isUrgentOrHigh ? "danger" : item.priority === "medium" ? "warning" : "secondary"}
                  className="text-[9px] uppercase font-bold"
                >
                  {item.priority}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Add Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Reminder"
        >
          <form onSubmit={handleAddTask} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Task Description</label>
              <Input
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Schedule cardiologist followup for Mr. Ram"
                className="h-10 rounded-xl bg-[#FAF8FF] border-[#E8E1F5] text-xs"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold h-11 rounded-2xl mt-2"
            >
              Set Reminder
            </Button>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
