"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoRefreshOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoEllipseOutline,
  IoSearchOutline,
  IoCloseOutline,
  IoCalendarOutline,
} from "react-icons/io5";
import {
  fetchAttendance,
  markAttendance,
  type AttendanceEmployee,
  type AttendancePagination,
  type AttendanceStatus,
} from "@/services/attendanceService";
import { DEPARTMENT_COLORS, type Department } from "@/lib/departments";
import { BiCalendarX } from "react-icons/bi";
import Dropdown from "@/components/ui/Dropdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ── Status config ───────────────────────────────────────── */
const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; badge: string; text: string; icon: React.ReactNode }
> = {
  unmarked: {
    label: "UNMARKED",
    badge: "bg-slate-900/50 border-slate-700 text-slate-400 dark:bg-slate-900/80 dark:border-slate-800",
    text: "text-slate-500 dark:text-slate-400 font-medium",
    icon: <IoEllipseOutline size={12} />,
  },
  present: {
    label: "PRESENT",
    badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-500/40",
    text: "text-emerald-700 dark:text-emerald-400 font-bold",
    icon: <IoCheckmarkCircle size={12} />,
  },
  absent: {
    label: "ABSENT",
    badge: "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20",
    text: "text-white font-bold",
    icon: <IoCloseCircle size={12} />,
  },
  leave: {
    label: "LEAVE",
    badge: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20 dark:border-amber-500/40",
    text: "text-amber-700 dark:text-amber-400 font-bold",
    icon: <IoCalendarOutline size={12} />,
  },
  holiday: {
    label: "HOLIDAY",
    badge: "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400 dark:bg-indigo-500/20 dark:border-indigo-500/40",
    text: "text-indigo-700 dark:text-indigo-400 font-bold",
    icon: <IoCalendarOutline size={12} />,
  },
};

const STATUSES = Object.keys(STATUS_CONFIG) as AttendanceStatus[];

/* ── Grid Config ─────────────────────────────────────────── */
const GRID_LAYOUT = "grid grid-cols-[minmax(260px,320px)_repeat(7,minmax(120px,1fr))_60px]";

/* ── helpers ─────────────────────────────────────────────── */
function dayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    num: d.getDate(),
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function isToday(dateStr: string) {
  return new Date().toISOString().slice(0, 10) === dateStr;
}

/* ── StatusCell ──────────────────────────────────────────── */
function StatusCell({
  employeeId,
  date,
  current,
  note,
  onSaved,
}: {
  employeeId: string;
  date: string;
  current: AttendanceStatus;
  note?: string;
  onSaved: (empId: string, date: string, status: AttendanceStatus) => void;
}) {
  const [saving, setSaving] = useState(false);

  const pick = async (status: AttendanceStatus) => {
    setSaving(true);
    try {
      await markAttendance(employeeId, date, status, note);
      onSaved(employeeId, date, status);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  const cfg = STATUS_CONFIG[current] || STATUS_CONFIG.unmarked;

  return (
    <div className="relative w-full flex justify-center items-center h-full px-2 py-1.5">
      <Dropdown
        options={STATUSES.filter(s => s !== 'leave' && s !== 'holiday').map(s => ({
          value: s,
          label: STATUS_CONFIG[s].label,
        }))}
        value={current}
        onChange={(val) => pick(val as AttendanceStatus)}
        menuClassName="w-[160px] bg-white border-slate-200 shadow-2xl rounded-lg"
        itemClassName="text-[11px] font-black tracking-widest uppercase py-3 hover:bg-slate-100 text-slate-900 border-b border-slate-50 last:border-0"
        trigger={
          <div className={cn(
            "w-full h-8 px-3 flex items-center justify-center text-[10px] font-black tracking-widest border rounded-md transition-all cursor-pointer select-none ring-offset-2 ring-offset-background active:scale-95",
            cfg.badge,
            saving && "opacity-50 grayscale"
          )}>
            {cfg.label}
          </div>
        }
      />
      {saving && (
        <span className="absolute top-1 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
        </span>
      )}
    </div>
  );
}

interface AttendanceTableProps {
  from: string;
  to: string;
}

const PAGE_SIZE = 15;

export default function AttendanceTable({ from, to }: AttendanceTableProps) {
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [pagination, setPagination] = useState<AttendancePagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef(search);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    searchRef.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(1);
    }, 400);
  };

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchAttendance(from, to, page, PAGE_SIZE, searchRef.current);
        setEmployees(res.employees);
        setDates(res.dates);
        // Res.pagination is expected to be present
        if (res.pagination) setPagination(res.pagination);
      } catch (err) {
        console.error("Attendance fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [from, to]
  );

  useEffect(() => { load(1); }, [load]);

  /* optimistic status update */
  const handleSaved = (empId: string, date: string, status: AttendanceStatus) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        String(emp._id) === empId
          ? {
            ...emp,
            attendance: {
              ...emp.attendance,
              [date]: { status, note: emp.attendance[date]?.note },
            },
          }
          : emp
      )
    );
  };

  const { page, total, totalPages } = pagination;
  const startItem = (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full bg-surface-base dark:bg-slate-950 transition-colors duration-300">
      {/* Header Actions */}
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default dark:border-slate-800">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-text-primary dark:text-slate-100 italic">
            Personnel Register
          </h2>
          {!loading ? (
            <p className="text-[12px] font-medium text-text-tertiary">
              <span className="text-brand-primary">{total} members</span> identified in this cycle.
            </p>
          ) : <div className="h-4 w-40 mt-1 animate-pulse rounded bg-surface-muted" />}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-[200px] relative group">
            <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search employees..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => load(page)}
            className="p-2.5 rounded-xl text-text-secondary hover:text-brand-primary bg-surface-base dark:bg-slate-900 border border-border-default dark:border-slate-800 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <IoRefreshOutline size={18} />
          </button>
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto thin-scrollbar relative">
          <div className="min-w-max w-full">
            {/* Grid Header */}
            <div className={`${GRID_LAYOUT} border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 sticky top-0 z-30`}>
              <div className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-950 z-40 border-r border-slate-200 dark:border-slate-800 flex items-center">
                Employee Information
              </div>
              {dates.map((d) => {
                const { num, day } = dayLabel(d);
                const isTodayDate = isToday(d);
                return (
                  <div key={String(d)} className="px-4 py-3 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/10 last:border-0 min-w-[120px]">
                    <span className={`text-sm font-black ${isTodayDate ? 'text-brand-primary' : 'text-slate-900 dark:text-slate-100'}`}>{num}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isTodayDate ? 'text-brand-primary/70' : 'text-slate-400 dark:text-slate-500'}`}>{day}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-center text-[10px] font-bold text-slate-400">
                {/* Actions placeholder */}
              </div>
            </div>

            {/* Grid Body */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={`${GRID_LAYOUT} min-h-[72px] animate-pulse`}>
                    <div className="px-6 py-4 flex items-center gap-4 bg-surface-base dark:bg-slate-950 sticky left-0 border-r border-border-subtle dark:border-slate-800 z-20">
                      <div className="w-10 h-10 rounded-full bg-surface-muted dark:bg-slate-800" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-surface-muted dark:bg-slate-800 rounded" />
                        <div className="h-3 w-20 bg-surface-muted dark:bg-slate-800 rounded" />
                      </div>
                    </div>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <div key={j} className="px-4 py-4 flex justify-center items-center">
                        <div className="h-8 w-24 bg-surface-muted dark:bg-slate-800 rounded-md" />
                      </div>
                    ))}
                  </div>
                ))
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-surface-base dark:bg-slate-950">
                  <div className="w-20 h-20 rounded-full bg-surface-muted dark:bg-slate-900 flex items-center justify-center mb-6 text-text-tertiary">
                    <BiCalendarX size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary dark:text-slate-100">No records found</h3>
                  <p className="text-sm text-text-secondary mt-2 max-w-xs">{search ? `No matches for "${search}"` : "The register is empty for this period."}</p>
                </div>
              ) : (
                employees.map((emp, idx) => {
                  const deptColors = DEPARTMENT_COLORS[emp.department as Department] ?? DEPARTMENT_COLORS["Engineering"];
                  const initials = emp.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

                  return (
                    <div key={String(emp._id)} className={`${GRID_LAYOUT} min-h-[72px] group transition-all hover:bg-slate-50 dark:hover:bg-slate-900/40 relative ${idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-900/10' : 'bg-surface-base dark:bg-slate-950'}`}>
                      {/* Employee Cell (Sticky) */}
                      <div className="px-6 py-4 flex items-center justify-between gap-4 sticky left-0 z-20 bg-inherit border-r border-border-subtle dark:border-slate-800 group-hover:bg-inherit">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-brand-subtle text-brand-primary ring-1 ring-brand-muted/20 shadow-sm transition-transform group-hover:scale-110">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">{emp.name}</p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 font-mono uppercase tracking-tighter">
                              {emp.employeeId || `#${emp.id}`}
                            </p>
                          </div>
                        </div>
                        <span className={`badge-base shrink-0 ${deptColors.badge} px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded-md`}>
                          {emp.department}
                        </span>
                      </div>

                      {/* Attendance Cells */}
                      {dates.map((d) => {
                        const rec = emp.attendance[d];
                        return (
                          <div key={d} className="flex items-center justify-center border-r border-border-subtle dark:border-slate-800/10 last:border-0 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                            <StatusCell
                              employeeId={String(emp._id)}
                              date={d}
                              current={rec?.status ?? "unmarked"}
                              note={rec?.note}
                              onSaved={handleSaved}
                            />
                          </div>
                        );
                      })}

                      {/* Action Cell */}
                      <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Action buttons could go here */}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      {!loading && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between z-40">
          <p className="text-[12px] font-bold text-slate-500">
            Displaying <span className="text-slate-900 dark:text-slate-100">{startItem}—{endItem}</span> of <span className="text-slate-900 dark:text-slate-100">{total}</span> employees
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <IoChevronBackOutline size={18} className="text-slate-600 dark:text-slate-400" />
            </button>
            <div className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100">
              {page} / {totalPages}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <IoChevronForwardOutline size={18} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
