"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  IoAddOutline,
  IoTrashOutline,
  IoRefreshOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoSearchOutline,
  IoCloseOutline,
  IoBriefcaseOutline,
} from "react-icons/io5";
import EmployeeListItem from "./employeeListItem";
import EmployeeModal from "./EmployeeModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchEmployees,
  deleteEmployee,
  bulkDeleteEmployees,
  type Pagination,
} from "@/services/employeeService";
import type { IEmployee } from "@/models/Employee";
import { DEPARTMENTS } from "@/lib/departments";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function EmployeeList() {
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  /* selection */
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* modals */
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IEmployee | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* Enterprise Table UX State */
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(["empId", "name", "dept", "designation", "status", "actions"]));

  /* search & filter */
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef(search);
  const keywordRef = useRef(keyword);

  const searchParams = useSearchParams();
  const router = useRouter();

  /* Handling auto-open from dashboard redirection */
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setAddOpen(true);
      // Clean up the URL to prevent re-opening on manual refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("add");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }
  }, [searchParams, router]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    searchRef.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelected(new Set());
      load(1);
    }, 400);
  };

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data, pagination: pg } = await fetchEmployees(
        page,
        PAGE_SIZE,
        undefined,
        searchRef.current,
        keywordRef.current
      );
      setEmployees(data);
      setPagination(pg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employee");
      toast.error("Could not load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const goToPage = (p: number) => {
    setSelected(new Set());
    load(p);
  };

  /* helpers */
  const toggleCheck = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const toggleAll = () => {
    if (selected.size === employees.length && employees.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(employees.map((e) => String(e._id))));
    }
  };

  /* single delete */
  const handleSingleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmployee(String(deleteTarget._id));
      setDeleteTarget(null);
      setSelected((prev) => { const n = new Set(prev); n.delete(String(deleteTarget._id)); return n; });
      toast.success("Employee removed successfully");
      await load(pagination.page);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  /* bulk delete */
  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      await bulkDeleteEmployees(Array.from(selected));
      setSelected(new Set());
      setBulkDeleteOpen(false);
      toast.success(`${selectedCount} employees removed`);
      await load(pagination.page);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const selectedCount = selected.size;
  const { page, total, totalPages } = pagination;
  const startItem = (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="h-full flex-1 flex flex-col p-6 md:p-10 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">
            Workforce Overview
          </h2>
          {!loading ? (
            <p className="text-sm mt-1 text-text-secondary">
              {total} active record{total !== 1 ? "s" : ""}
            </p>
          ) : (
            <Skeleton className="w-24 h-5 mt-1" />
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Bulk delete */}
          {selectedCount > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-full px-4 py-2 flex gap-1.5 items-center text-sm font-medium bg-danger-subtle text-danger hover:bg-danger-hover transition-all shadow-sm"
            >
              <IoTrashOutline size={16} />
              Remove {selectedCount}
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={() => load(page)}
            className="rounded-full p-2.5 transition-all outline-none hover:bg-surface-hover focus-visible:ring-2 ring-brand-primary focus-visible:bg-surface-hover text-text-secondary hover:text-text-primary"
            title="Refresh directory"
          >
            <IoRefreshOutline size={20} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Add */}
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary rounded-full px-5 py-2.5 flex gap-2 items-center text-sm font-medium shadow-sm hover:shadow-md"
          >
            <IoAddOutline size={18} />
            Add Employee
          </button>
        </div>
      </div>

      {/* Table Controls (Density & Visibility & View Mode) */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-1 bg-surface-muted rounded-xl border border-border-default">
            <button
              onClick={() => setDensity("comfortable")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${density === 'comfortable' ? 'bg-surface-base text-brand-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity("compact")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${density === 'compact' ? 'bg-surface-base text-brand-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              Compact
            </button>
          </div>

          <div className="flex items-center gap-2 p-1 bg-surface-muted rounded-xl border border-border-default">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-surface-base text-brand-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
              title="List View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-surface-base text-brand-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Visible Columns:</p>
          <div className="flex gap-2">
            {[
              { id: "dept", label: "Dept" },
              { id: "designation", label: "Designation" },
            ].map(col => (
              <button
                key={col.id}
                onClick={() => setVisibleColumns(prev => {
                  const next = new Set(prev);
                  if (next.has(col.id)) {
                    next.delete(col.id);
                  } else {
                    next.add(col.id);
                  }
                  return next;
                })}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all ${visibleColumns.has(col.id) ? 'bg-brand-subtle text-brand-primary border-brand-muted' : 'bg-surface-base text-text-tertiary border-border-default'}`}
              >
                {col.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      向上
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full max-w-md group">
          <IoSearchOutline
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-brand-primary text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Search by name, department, ID…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                setSelected(new Set());
                load(1);
              }
            }}
            className="w-full pl-11 pr-10 py-2.5 text-sm rounded-full border bg-surface-base outline-none transition-all focus:border-brand-primary focus:ring-4 focus:ring-brand-subtle border-border-default text-text-primary placeholder:text-text-tertiary"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                searchRef.current = "";
                setSelected(new Set());
                load(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface-hover transition-colors text-text-tertiary hover:text-text-primary"
            >
              <IoCloseOutline size={16} />
            </button>
          )}
        </div>

        {/* Department keyword filter */}
        <div className="relative w-full sm:w-auto">
          <select
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              keywordRef.current = e.target.value;
              setSelected(new Set());
              load(1);
            }}
            className="w-full sm:w-auto py-2.5 pl-4 pr-10 text-sm font-medium rounded-full border bg-surface-base outline-none transition-all hover:bg-surface-hover focus:border-brand-primary focus:ring-4 focus:ring-brand-subtle cursor-pointer appearance-none border-border-default text-text-primary"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      {(search || keyword) && (
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-in fade-in slide-in-from-left-2 duration-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mr-1">Active Filters:</span>
          {search && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-subtle text-brand-primary border border-brand-muted text-xs font-semibold">
              <IoSearchOutline size={12} />
              "{search}"
              <button
                onClick={() => {
                  setSearch("");
                  searchRef.current = "";
                  load(1);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-brand-muted transition-colors"
                title="Clear search"
              >
                <IoCloseOutline size={14} />
              </button>
            </div>
          )}
          {keyword && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle text-accent-primary border border-accent-muted text-xs font-semibold">
              <IoBriefcaseOutline size={12} />
              {keyword}
              <button
                onClick={() => {
                  setKeyword("");
                  keywordRef.current = "";
                  load(1);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-accent-muted transition-colors"
                title="Clear department"
              >
                <IoCloseOutline size={14} />
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setSearch("");
              searchRef.current = "";
              setKeyword("");
              keywordRef.current = "";
              load(1);
            }}
            className="text-[10px] font-bold text-text-tertiary hover:text-danger underline decoration-dotted underline-offset-4 transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 card-base rounded-2xl space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : employees.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center border border-dashed border-border-default rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
              <IoSearchOutline size={24} className="text-text-tertiary" />
            </div>
            <p className="font-medium text-text-primary">No employees found</p>
            <p className="text-sm mt-1 text-text-secondary">Try adjusting your search criteria</p>
          </div>
        ) : (
          employees.map((emp) => (
            <div
              key={String(emp._id)}
              className="p-5 card-base hover:bg-surface-hover transition-colors rounded-2xl space-y-4 shadow-sm border border-border-default"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold bg-brand-subtle text-brand-primary ring-1 ring-brand-muted"
                  >
                    {emp.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/employee/${emp._id}`} className="font-semibold text-[15px] hover:text-brand-primary transition-colors text-text-primary">
                      {emp.name}
                    </Link>
                    <p className="text-xs mt-0.5 text-text-secondary">{emp.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-surface-muted text-text-tertiary">#{emp.id}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${emp.status === 'active' ? 'bg-success-subtle text-success ring-1 ring-success' : 'bg-surface-muted text-text-secondary ring-1 ring-border-default'}`}>
                    {emp.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-dashed border-border-default">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-text-tertiary">Department</p>
                  <p className="text-sm font-medium text-text-primary">{emp.department}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-text-tertiary">Designation</p>
                  <p className="text-sm font-medium truncate text-text-primary">{emp.designation || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setEditTarget(emp)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all bg-surface-base hover:bg-surface-hover text-text-primary border-border-default"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setDeleteTarget(emp)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-danger-subtle text-danger border border-danger hover:bg-danger-hover transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table/Grid View */}
      {viewMode === "grid" ? (
        <div className="flex-1 overflow-y-auto thin-scrollbar p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-base p-6 rounded-[2rem] space-y-4 shadow-sm border border-border-default/50">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </div>
              ))
            ) : employees.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-surface-muted flex items-center justify-center mb-4">
                  <IoSearchOutline size={32} className="text-text-tertiary" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">No results found</h3>
                <p className="text-sm text-text-secondary max-w-xs">Adjust your search parameters to find the personnel you're looking for.</p>
              </div>
            ) : (
              employees.map((emp, idx) => {
                const initials = emp.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
                return (
                  <div
                    key={String(emp._id)}
                    className="group relative card-base p-6 rounded-[2.5rem] border border-border-default/80 hover:border-brand-muted hover:shadow-xl transition-all duration-300 animate-fade-in-up flex flex-col gap-4 bg-surface-base/40 backdrop-blur-sm"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black bg-brand-subtle text-brand-primary ring-1 ring-brand-muted shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform"
                      >
                        {initials}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-surface-muted text-text-tertiary">{emp.employeeId || `#${emp.id}`}</span>
                        <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full ${emp.status === 'active' ? 'bg-success-subtle text-success ring-1 ring-success' : 'bg-surface-muted text-text-secondary'}`}>
                          {emp.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 min-w-0">
                      <Link href={`/employee/${emp._id}`} className="block text-lg font-bold text-text-primary hover:text-brand-primary transition-colors truncate">
                        {emp.name}
                      </Link>
                      <p className="text-xs font-medium text-text-tertiary truncate">{emp.email}</p>
                    </div>

                    <div className="space-y-1 mt-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                        <IoBriefcaseOutline size={14} className="text-text-tertiary" />
                        {emp.designation || "Not Assigned"}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-brand-primary">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                        {emp.department}
                      </div>
                    </div>

                    <div className="pt-4 mt-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditTarget(emp)} className="flex-1 py-3 rounded-2xl bg-surface-muted hover:bg-surface-hover text-[11px] font-black uppercase tracking-widest text-text-primary transition-all border border-border-default">
                        Profile
                      </button>
                      <button onClick={() => setDeleteTarget(emp)} className="p-3 rounded-2xl bg-danger-subtle hover:bg-danger text-danger hover:text-white transition-all border border-danger/20">
                        <IoTrashOutline size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Desktop Table View */
        <div className="hidden lg:flex flex-1 flex-col rounded-[2rem] border shadow-sm overflow-hidden bg-surface-base/40 backdrop-blur-md border-border-default/50 min-h-0">
          <div className="flex-1 overflow-y-auto thin-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface-muted border-b border-border-default">
                  <th className={`${density === 'compact' ? 'py-2' : 'py-4'} pl-6 pr-2 w-12 border-b border-border-default`}>
                    <input
                      type="checkbox"
                      checked={employees.length > 0 && selected.size === employees.length}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-border-default text-brand-primary focus:ring-brand-subtle"
                    />
                  </th>
                  <th className={`${density === 'compact' ? 'py-2' : 'py-5'} px-5 text-[12px] font-bold uppercase tracking-[0.05em] whitespace-nowrap border-b border-border-default text-text-tertiary`}>
                    Emp ID
                  </th>
                  <th className={`${density === 'compact' ? 'py-2' : 'py-4'} px-4 text-[11px] font-bold uppercase tracking-widest border-b border-border-default text-text-tertiary`}>
                    Employee
                  </th>
                  {visibleColumns.has("dept") && (
                    <th className={`${density === 'compact' ? 'py-2' : 'py-4'} px-4 text-[11px] font-bold uppercase tracking-widest border-b border-border-default text-text-tertiary text-center`}>
                      Department
                    </th>
                  )}
                  {visibleColumns.has("designation") && (
                    <th className={`${density === 'compact' ? 'py-2' : 'py-4'} px-4 text-[11px] font-bold uppercase tracking-widest border-b border-border-default text-text-tertiary`}>
                      Designation
                    </th>
                  )}
                  <th className={`${density === 'compact' ? 'py-2' : 'py-4'} px-4 text-[11px] font-bold uppercase tracking-widest border-b border-border-default text-text-tertiary text-center`}>
                    Status
                  </th>
                  <th className={`${density === 'compact' ? 'py-2' : 'py-4'} px-4 text-[11px] font-bold uppercase tracking-widest border-b border-border-default text-right text-text-tertiary`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default even:bg-surface-muted/30">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-default">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-5">
                          <Skeleton className={`h-4 ${j === 2 ? 'w-48' : j === 1 ? 'w-16' : 'w-24'}`} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.size + 4} className="px-6 py-20 text-center bg-surface-base">
                      <div className="flex flex-col items-center justify-center animate-fade-in">
                        <div className="relative mb-6">
                          <div className="w-32 h-32 rounded-full bg-surface-muted flex items-center justify-center">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-text-tertiary">
                              <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M6 21C6 17.134 8.68629 14 12 14C15.3137 14 18 17.134 18 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M15 15L19 19M19 15L15 19" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-brand-subtle border-4 border-surface-base flex items-center justify-center text-brand-primary">
                            <IoSearchOutline size={18} />
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">No matching colleagues found</h3>
                        <p className="text-sm text-text-secondary mt-2 max-w-sm leading-relaxed">
                          {search || keyword
                            ? `We couldn't find anyone matching "${search || keyword}". Try refining your filters or checking for typos.`
                            : "Your workforce directory is currently empty. Start building your team by adding your first employee."}
                        </p>
                        {(!search && !keyword) && (
                          <button
                            onClick={() => setAddOpen(true)}
                            className="mt-8 btn-primary px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-brand-primary/20 flex items-center gap-2 group hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            <IoAddOutline size={20} className="group-hover:rotate-90 transition-transform" />
                            Onboard First Employee
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp, idx) => (
                    <EmployeeListItem
                      key={String(emp._id)}
                      employee={emp}
                      checked={selected.has(String(emp._id))}
                      density={density}
                      visibleColumns={visibleColumns}
                      onCheck={toggleCheck}
                      onEdit={(e) => setEditTarget(e)}
                      onDelete={(e) => setDeleteTarget(e)}
                      index={idx}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-default bg-surface-muted">
              <p className="text-sm font-medium text-text-secondary">
                Showing {startItem} to {endItem} of <span className="text-text-primary">{total}</span>
              </p>
              <div className="flex items-center gap-1.5 bg-surface-base border border-border-default p-1 rounded-xl shadow-sm">
                <button
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                  className="p-1.5 rounded-lg disabled:opacity-30 transition-all hover:bg-surface-hover text-text-primary"
                >
                  <IoChevronBackOutline size={16} />
                </button>

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
                      onClick={() => goToPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page
                        ? "bg-brand-primary text-white hover:bg-brand-hover shadow-sm border border-brand-hover"
                        : "bg-surface-base text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                  className="p-1.5 rounded-lg disabled:opacity-30 transition-all hover:bg-surface-hover text-text-primary"
                >
                  <IoChevronForwardOutline size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Modal (Add/Edit) */}
      <EmployeeModal
        open={addOpen || !!editTarget}
        editData={editTarget}
        onClose={() => {
          setAddOpen(false);
          setEditTarget(null);
        }}
        onSuccess={() => {
          setAddOpen(false);
          setEditTarget(null);
          load(page);
        }}
      />


      {/* Single Delete Confirm */}
      <DeleteConfirmModal
        open={!!deleteTarget}
        count={1}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleSingleDelete}
        loading={deleting}
      />

      {/* Bulk Delete Confirm */}
      <DeleteConfirmModal
        open={bulkDeleteOpen}
        count={selectedCount}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={deleting}
      />
    </div>
  );
}
