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
import Dropdown from "@/components/ui/Dropdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
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
      const params = new URLSearchParams(searchParams.toString());
      params.delete("add");
      const qs = params.toString();
      const currentPath = window.location.pathname;
      router.replace(qs ? `${currentPath}?${qs}` : currentPath, { scroll: false });
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
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 italic">
            Workforce Register
          </h2>
          {!loading ? (
            <p className="text-[12px] font-bold mt-1 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {total} active record{total !== 1 ? "s" : ""} identified
            </p>
          ) : (
            <Skeleton className="w-24 h-4 mt-1 bg-slate-100 dark:bg-slate-800" />
          )}
        </div>

        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-full px-4 py-2 flex gap-1.5 items-center text-sm font-medium bg-danger-subtle text-danger hover:bg-danger-hover transition-all shadow-sm"
            >
              <IoTrashOutline size={16} />
              Remove {selectedCount}
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => load(page)}
              className="rounded-xl p-2.5 transition-all outline-none hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-2 ring-brand-primary text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50"
              title="Refresh directory"
            >
              <IoRefreshOutline size={20} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => setAddOpen(true)}
              className="btn-primary rounded-full px-4 sm:px-6 py-2.5 flex gap-2 items-center text-[13px] sm:text-sm font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <IoAddOutline size={20} />
              <span className="hidden xs:inline">Add Employee</span>
              <span className="xs:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between mb-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={() => setDensity("comfortable")}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${density === 'comfortable' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm ring-1 ring-slate-100 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity("compact")}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${density === 'compact' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm ring-1 ring-slate-100 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}
            >
              Compact
            </button>
          </div>

          <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm ring-1 ring-slate-100 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400'}`}
              title="List View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm ring-1 ring-slate-100 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400'}`}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Layout Overlays:</p>
          <div className="flex gap-2">
            {[
              { id: "dept", label: "Department" },
              { id: "designation", label: "Designation" },
            ].map(col => (
              <button
                key={col.id}
                onClick={() => setVisibleColumns(prev => {
                  const next = new Set(prev);
                  if (next.has(col.id)) next.delete(col.id); else next.add(col.id);
                  return next;
                })}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all ${visibleColumns.has(col.id) ? 'bg-brand-subtle text-brand-primary border-brand-muted shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
              >
                {col.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full max-w-md group">
          <IoSearchOutline
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-brand-primary text-slate-400"
          />
          <input
            type="text"
            placeholder="Identify personnel via ID, name, or role…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-11 pr-10 py-3 text-[13px] font-bold rounded-xl border bg-white dark:bg-slate-900 outline-none transition-all focus:border-brand-primary focus:ring-4 focus:ring-brand-subtle border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); searchRef.current = ""; load(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <IoCloseOutline size={16} />
            </button>
          )}
        </div>

        <Dropdown
          options={["All Departments", ...DEPARTMENTS].map(d => ({ value: d, label: d }))}
          value={keyword || "All Departments"}
          onChange={(val) => {
            const finalVal = val === "All Departments" ? "" : val;
            setKeyword(finalVal);
            keywordRef.current = finalVal;
            setSelected(new Set());
            load(1);
          }}
          className="w-full sm:w-auto min-w-[200px]"
        />
      </div>

      {(search || keyword) && (
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-in fade-in slide-in-from-left-2 duration-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mr-1">Active Filters:</span>
          {search && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-subtle text-brand-primary border border-brand-muted text-xs font-semibold">
              <IoSearchOutline size={12} />
              "{search}"
              <button onClick={() => { setSearch(""); searchRef.current = ""; load(1); }} className="ml-1 p-0.5 rounded-full hover:bg-brand-muted transition-colors">
                <IoCloseOutline size={14} />
              </button>
            </div>
          )}
          {keyword && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle text-accent-primary border border-accent-muted text-xs font-semibold">
              <IoBriefcaseOutline size={12} />
              {keyword}
              <button onClick={() => { setKeyword(""); keywordRef.current = ""; load(1); }} className="ml-1 p-0.5 rounded-full hover:bg-accent-muted transition-colors">
                <IoCloseOutline size={14} />
              </button>
            </div>
          )}
          <button
            onClick={() => { setSearch(""); searchRef.current = ""; setKeyword(""); keywordRef.current = ""; load(1); }}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-danger underline decoration-dotted underline-offset-4 transition-colors"
          >
            Reset Filters
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
                <div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
              </div>
            </div>
          ))
        ) : employees.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center border border-dashed border-border-default rounded-2xl">
            <IoSearchOutline size={24} className="text-text-tertiary mb-3" />
            <p className="font-medium text-text-primary">No employees found</p>
          </div>
        ) : (
          employees.map((emp) => (
            <div key={String(emp._id)} className="p-5 card-base hover:bg-surface-hover transition-colors rounded-2xl space-y-4 shadow-sm border border-border-default">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold bg-brand-subtle text-brand-primary ring-1 ring-brand-muted">
                    {emp.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/employee/${emp._id}`} className="font-semibold text-[15px] hover:text-brand-primary transition-colors text-text-primary">{emp.name}</Link>
                    <p className="text-xs mt-0.5 text-text-secondary">{emp.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-muted text-text-tertiary">#{emp.id}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${emp.status === 'active' ? 'bg-success-subtle text-success ring-1 ring-success' : 'bg-surface-muted text-text-secondary ring-1 ring-border-default'}`}>{emp.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 py-3 border-y border-dashed border-border-default">
                <div><p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-text-tertiary">Department</p><p className="text-sm font-medium text-text-primary">{emp.department}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-text-tertiary">Designation</p><p className="text-sm font-medium truncate text-text-primary">{emp.designation || '—'}</p></div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setEditTarget(emp)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold border bg-surface-base hover:bg-surface-hover text-text-primary border-border-default">Edit Profile</button>
                <button onClick={() => setDeleteTarget(emp)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-danger-subtle text-danger border border-danger hover:bg-danger-hover transition-colors">Remove</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table/Grid View */}
      {viewMode === "grid" ? (
        <div className="flex-1 overflow-y-auto thin-scrollbar p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {!loading && employees.map((emp) => (
              <div key={String(emp._id)} className="group relative card-base p-6 rounded-[2.5rem] border border-border-default/80 hover:border-brand-muted hover:shadow-xl transition-all duration-300 flex flex-col gap-4 bg-surface-base/40 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black bg-brand-subtle text-brand-primary ring-1 ring-brand-muted shadow-lg">{emp.name[0]}</div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full ${emp.status === 'active' ? 'bg-success-subtle text-success ring-1 ring-success' : 'bg-surface-muted text-text-secondary'}`}>{emp.status}</span>
                </div>
                <div>
                  <Link href={`/employee/${emp._id}`} className="block text-lg font-bold text-text-primary hover:text-brand-primary truncate">{emp.name}</Link>
                  <p className="text-xs text-text-tertiary truncate">{emp.email}</p>
                </div>
                <div className="pt-4 mt-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditTarget(emp)} className="flex-1 py-3 rounded-2xl bg-surface-muted hover:bg-surface-hover text-[11px] font-black uppercase tracking-widest text-text-primary transition-all border border-border-default">Profile</button>
                  <button onClick={() => setDeleteTarget(emp)} className="p-3 rounded-2xl bg-danger-subtle hover:bg-danger text-danger hover:text-white transition-all"><IoTrashOutline size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 flex-col rounded-[2rem] border shadow-sm overflow-hidden bg-surface-base/40 backdrop-blur-md border-border-default/50 min-h-0">
          <div className="flex-1 overflow-y-auto thin-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 pl-6 pr-2 w-12"><input type="checkbox" checked={selected.size === employees.length} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-brand-subtle" /></th>
                  <th className="px-5 text-[11px] font-black uppercase tracking-widest whitespace-nowrap text-slate-500 dark:text-slate-400">System ID</th>
                  <th className="px-4 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Personnel</th>
                  {visibleColumns.has("dept") && <th className="px-4 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">Division</th>}
                  {visibleColumns.has("designation") && <th className="px-4 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Designation</th>}
                  <th className="px-4 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">Status</th>
                  <th className="px-4 text-[11px] font-black uppercase tracking-widest text-right text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {employees.map((emp, idx) => (
                  <EmployeeListItem key={String(emp._id)} employee={emp} checked={selected.has(String(emp._id))} density={density} visibleColumns={visibleColumns} onCheck={toggleCheck} onEdit={setEditTarget} onDelete={setDeleteTarget} index={idx} />
                ))}
              </tbody>
            </table>
          </div>
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <p className="text-[12px] font-bold text-slate-500">Showing <span className="text-slate-900 dark:text-slate-100">{startItem}—{endItem}</span> of <span className="text-slate-900 dark:text-slate-100">{total}</span></p>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"><IoChevronBackOutline size={18} className="text-slate-600 dark:text-slate-400" /></button>
                <div className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {page} / {totalPages}
                </div>
                <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"><IoChevronForwardOutline size={18} className="text-slate-600 dark:text-slate-400" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <EmployeeModal open={addOpen || !!editTarget} editData={editTarget} onClose={() => { setAddOpen(false); setEditTarget(null); }} onSuccess={() => { setAddOpen(false); setEditTarget(null); load(page); }} />
      <DeleteConfirmModal open={!!deleteTarget} count={1} onCancel={() => setDeleteTarget(null)} onConfirm={handleSingleDelete} loading={deleting} />
      <DeleteConfirmModal open={bulkDeleteOpen} count={selectedCount} onCancel={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete} loading={deleting} />
    </div>
  );
}
