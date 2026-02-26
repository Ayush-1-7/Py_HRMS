"use client";

import { useState } from "react";
import { IoCalendarOutline, IoChevronDownOutline } from "react-icons/io5";
import Dropdown from "@/components/ui/Dropdown";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import { BiInfoCircle } from "react-icons/bi";

/* ── helpers ─────────────────────────────────────────────── */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function clampToSeven(from: string, to: string): string {
  const limit = addDays(from, 6);
  return to > limit ? limit : to;
}

function monthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      value: d.toISOString().slice(0, 7),
    });
  }
  return opts;
}

/* ── Page ────────────────────────────────────────────────── */
export default function AttendancePage() {
  /* ── date range state ── */
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(todayStr);
  const [activeMonth, setMonth] = useState<string>(todayStr().slice(0, 7));

  /* ── handlers ── */
  const handleFromChange = (val: string) => {
    setFrom(val);
    setTo((prev) => clampToSeven(val, prev));
  };

  const handleToChange = (val: string) => {
    if (val < from) return;
    setTo(clampToSeven(from, val));
  };

  const handleMonthSelect = (ym: string) => {
    setMonth(ym);
    const monthStart = ym + "-01";
    const monthEnd = new Date(parseInt(ym.slice(0, 4)), parseInt(ym.slice(5, 7)), 0)
      .toISOString()
      .slice(0, 10);
    setFrom(monthStart);
    setTo(clampToSeven(monthStart, monthEnd));
  };

  const inputClass = "px-4 py-2.5 text-sm font-medium rounded-xl border bg-surface-base outline-none transition-all hover:bg-surface-hover focus:border-brand-primary focus:ring-4 focus:ring-brand-subtle cursor-pointer border-border-default text-text-primary";

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <header className="flex flex-col gap-2 animate-fade-in-up stagger-1">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-balance text-text-primary">
          Attendance Tracker
        </h1>
        <p className="text-sm md:text-base text-balance text-text-secondary">
          Track and manage employee attendance for the selected date range. Max allowed range is 7 days.
        </p>
      </header>

      {/* ── Filters row ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 card-base p-5 shadow-sm border border-border-default animate-fade-in-up stagger-2">

        {/* Month picker */}
        <div className="relative flex items-center w-full xl:w-auto min-w-[280px]">
          <Dropdown
            options={monthOptions().map(o => ({ value: o.value, label: o.label }))}
            value={activeMonth}
            onChange={(val) => handleMonthSelect(val)}
            icon={<IoCalendarOutline size={18} />}
            className="w-full"
            placeholder="Select Month"
          />
        </div>

        {/* Divider */}
        <span className="hidden xl:block h-8 w-px bg-border-default" />

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-4 xl:gap-6 w-full xl:w-auto">
          <div className="flex items-center gap-3 flex-1 sm:flex-none">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary w-10 sm:w-auto">From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => handleFromChange(e.target.value)}
              className={`${inputClass} flex-1 sm:flex-none w-full sm:w-auto`}
            />
          </div>
          <div className="flex items-center gap-3 flex-1 sm:flex-none">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary w-10 sm:w-auto">To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={addDays(from, 6)}
              onChange={(e) => handleToChange(e.target.value)}
              className={`${inputClass} flex-1 sm:flex-none w-full sm:w-auto`}
            />
          </div>

          <div className="hidden sm:flex ml-auto xl:ml-0 items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-surface-muted border-border-default text-[11px] font-medium text-text-secondary whitespace-nowrap">
            <BiInfoCircle size={15} /> 7-day limit
          </div>
        </div>
      </div>

      {/* ── Attendance table ── */}
      <div className="card-base overflow-hidden shadow-sm border border-border-default animate-fade-in-up stagger-3">
        <AttendanceTable key={`${from}-${to}`} from={from} to={to} />
      </div>
    </div>
  );
}
