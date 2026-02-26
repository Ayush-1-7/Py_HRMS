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

/* ── Status config ───────────────────────────────────────── */
const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  unmarked: {
    label: "Unmarked",
    color: "text-text-secondary font-medium",
    bg: "bg-surface-muted border border-border-default",
    icon: <IoEllipseOutline size={14} />,
  },
  present: {
    label: "Present",
    color: "text-success font-bold",
    bg: "bg-success-subtle border border-success",
    icon: <IoCheckmarkCircle size={14} />,
  },
  absent: {
    label: "Absent",
    color: "text-danger font-bold",
    bg: "bg-danger-subtle border border-danger",
    icon: <IoCloseCircle size={14} />,
  },
};

const STATUSES = Object.keys(STATUS_CONFIG) as AttendanceStatus[];

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

  const cfg = STATUS_CONFIG[current];

  return (
    <div className="relative group inline-flex max-w-[110px] w-full items-center justify-center">
      <select
        value={current}
        onChange={(e) => pick(e.target.value as AttendanceStatus)}
        disabled={saving}
        className={`
          appearance-none w-full px-1 py-1.5 rounded-lg text-[11px] uppercase tracking-widest text-center
          cursor-pointer transition-all duration-200 select-none shadow-xs
          ${cfg.color} ${cfg.bg}
          ${saving ? "opacity-50 cursor-not-allowed scale-95" : "hover:shadow-sm hover:-translate-y-0.5"}
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-subtle
        `}
      >
        {STATUSES.map((s) => {
          const c = STATUS_CONFIG[s];
          return (
            <option key={s} value={s}>
              {c.label}
            </option>
          );
        })}
      </select>
      {saving && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-hover opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-primary"></span>
        </span>
      )}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────── */
interface AttendanceTableProps {
  from: string;
  to: string;
}

const PAGE_SIZE = 15;

/* ── AttendanceTable ─────────────────────────────────────── */
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  /* search */
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
      setError(null);
      try {
        const res = await fetchAttendance(from, to, page, PAGE_SIZE, searchRef.current);
        setEmployees(res.employees);
        setDates(res.dates);
      } catch {
        setError("Failed to load attendance");
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
  const colCount = 2 + dates.length;

  return (
    <div className="w-full flex flex-col h-full bg-surface-base">
      {/* Header */}
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default border-dashed">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Personnel Register
          </h2>
          {!loading ? (
            <p className="text-[12px] font-medium text-text-tertiary">
              Auditing <span className="text-text-secondary">{total} members</span> across a <span className="text-text-secondary">{dates.length}-day</span> window.
            </p>
          ) : <div className="h-4 w-40 mt-1 animate-pulse rounded bg-surface-muted" />}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative max-w-[280px] w-full">
            <IoSearchOutline
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search employee…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  load(1);
                }
              }}
              className="w-full pl-10 pr-9 py-2 text-[13px] rounded-xl border bg-surface-base outline-none transition-all hover:bg-surface-hover focus:bg-surface-base focus:border-brand-primary focus:ring-4 focus:ring-brand-subtle placeholder:text-text-tertiary border-border-default text-text-primary"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  searchRef.current = "";
                  load(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors p-1"
              >
                <IoCloseOutline size={16} />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() => load(page)}
            className="p-2 rounded-xl text-text-secondary hover:text-brand-primary hover:bg-brand-subtle transition-colors border bg-surface-base shadow-sm border-border-default"
            title="Refresh Table"
          >
            <IoRefreshOutline size={18} />
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 w-full overflow-hidden">
        {/* Mobile View */}
        <div className="lg:hidden divide-y divide-border-default">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full animate-pulse bg-surface-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-10 animate-pulse rounded-lg bg-surface-muted" />
                  ))}
                </div>
              </div>
            ))
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-surface-muted flex items-center justify-center mb-6 text-text-tertiary border border-border-default shadow-sm lg:shadow-none">
                <BiCalendarX size={40} className="text-text-tertiary/60" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">No records for this cycle</h3>
              <p className="text-sm text-text-secondary mt-2 max-w-xs leading-relaxed">
                {search
                  ? `We couldn't locate any records matching "${search}". Please refine your criteria.`
                  : "The duty roster is currently empty for the selected window. Please adjust the date filter."}
              </p>
            </div>
          ) : (
            employees.map((emp) => {
              const deptColors = DEPARTMENT_COLORS[emp.department as Department] ?? DEPARTMENT_COLORS["Engineering"];
              const initials = emp.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

              return (
                <div key={String(emp._id)} className="p-5 space-y-4 bg-surface-base hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-brand-subtle text-brand-primary ring-1 ring-brand-muted shadow-sm">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{emp.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-text-tertiary">#{emp.id}</span>
                          <span className={`badge-base ${deptColors.badge}`}>
                            {emp.department}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {dates.map((d) => {
                      const rec = emp.attendance[d];
                      const { num, day } = dayLabel(d);
                      const isTodayDate = isToday(d);
                      return (
                        <div key={d} className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-colors ${isTodayDate ? 'bg-brand-subtle border-brand-primary/20' : 'bg-surface-muted border-border-default'}`}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`text-base font-bold ${isTodayDate ? 'text-brand-primary' : 'text-text-primary'}`}>{num}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isTodayDate ? 'text-brand-primary' : 'text-text-tertiary'}`}>{day}</span>
                          </div>
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
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block w-full overflow-x-auto thin-scrollbar pb-4 min-h-[400px]">
          {employees.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-28 text-center animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-surface-muted flex items-center justify-center mb-6 text-text-tertiary/40 border border-border-default shadow-sm">
                <BiCalendarX size={48} />
              </div>
              <h3 className="text-xl font-bold text-text-primary">No activity detected</h3>
              <p className="text-sm text-text-secondary mt-2 max-w-sm leading-relaxed">
                {search
                  ? `Our indices returned no results for "${search}". Verify the spelling or try a different keyword.`
                  : "The selected operational window contains no attendance data. Modify your selection to view historical records."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-surface-base">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-border-default text-text-secondary sticky left-0 z-10 bg-surface-base">
                    Employee
                  </th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-border-default text-text-secondary">
                    Department
                  </th>
                  {dates.map((d) => {
                    const { num, day } = dayLabel(d);
                    const isTodayDate = isToday(d);
                    return (
                      <th key={d} className="px-4 py-3 text-center whitespace-nowrap border-b border-border-default w-[120px]">
                        <div className={`inline-flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${isTodayDate ? 'bg-brand-subtle text-brand-primary shadow-sm ring-1 ring-inset ring-brand-muted' : ''}`}>
                          <span className={`text-sm font-bold ${!isTodayDate && 'text-text-primary'}`}>{num}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${!isTodayDate && 'text-text-tertiary'}`}>{day}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-border-default">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: colCount }).map((__, j) => (
                        <td key={j} className={`px-6 py-4 ${j === 0 ? 'sticky left-0 bg-surface-base' : ''}`}>
                          <div className="h-5 rounded animate-pulse bg-surface-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : employees.map((emp) => {
                  const deptColors = DEPARTMENT_COLORS[emp.department as Department] ?? DEPARTMENT_COLORS["Engineering"];
                  const initials = emp.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

                  return (
                    <tr key={String(emp._id)} className="group transition-colors hover:bg-surface-hover">
                      <td className="px-6 py-3 w-[260px] sticky left-0 z-10 bg-surface-base group-hover:bg-surface-hover transition-colors shadow-[min(1px,calc(1px*max(0,1)))_0_0_0_var(--border)]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-brand-subtle text-brand-primary ring-1 ring-brand-muted shadow-xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate text-text-primary group-hover:text-brand-primary transition-colors">{emp.name}</p>
                            <p className="text-[11px] font-mono text-text-tertiary mt-0.5">{emp.employeeId || `#${emp.id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 w-[180px]">
                        <span className={`badge-base ${deptColors.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${deptColors.dot}`} />
                          {emp.department}
                        </span>
                      </td>
                      {dates.map((d) => {
                        const rec = emp.attendance[d];
                        return (
                          <td key={d} className="px-2 py-3 text-center w-[120px]">
                            <StatusCell employeeId={String(emp._id)} date={d} current={rec?.status ?? "unmarked"} note={rec?.note} onSaved={handleSaved} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination footer */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-default bg-surface-base">
          <p className="text-[13px] font-medium text-text-secondary">
            Showing <span className="font-semibold text-text-primary">{startItem}–{endItem}</span> of <span className="font-semibold text-text-primary">{total}</span> employees
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1)}
              className="p-1.5 rounded-lg border bg-surface-base text-text-secondary hover:text-brand-primary hover:border-brand-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm border-border-default"
            >
              <IoChevronBackOutline size={16} />
            </button>

            <div className="hidden sm:flex items-center gap-1 mx-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p =
                  totalPages <= 5
                    ? i + 1
                    : page <= 3
                      ? i + 1
                      : page >= totalPages - 2
                        ? totalPages - 4 + i
                        : page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => load(p)}
                    className={`min-w-[32px] h-8 rounded-lg text-[13px] font-bold transition-all shadow-sm ${p === page
                      ? "bg-brand-primary text-white hover:bg-brand-hover border border-brand-hover"
                      : "bg-surface-base border text-text-secondary hover:bg-surface-hover hover:text-text-primary border-border-default"
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
              className="p-1.5 rounded-lg border bg-surface-base text-text-secondary hover:text-brand-primary hover:border-brand-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm border-border-default"
            >
              <IoChevronForwardOutline size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
