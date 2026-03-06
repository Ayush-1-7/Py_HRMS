"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { IoSearchOutline, IoReturnDownBackOutline, IoSparklesOutline, IoCloseOutline } from "react-icons/io5";
import { searchNaturalLanguage } from "@/services/aiService";

/* ── Nav items (static) ─────────────────────────────────── */
const navItems = [
  { label: "Command Center", href: "/dashboard", section: "Navigation" },
  { label: "Team Directory", href: "/personnel", section: "Navigation" },
  { label: "Attendance Tracker", href: "/attendance", section: "Navigation" },
  { label: "Payroll", href: "/payroll", section: "Navigation" },
  { label: "Reports", href: "/reports", section: "Navigation" },
];

/* ── NL detection heuristic ─────────────────────────────── */
function isNaturalLanguageQuery(query: string): boolean {
  const lower = query.toLowerCase().trim();
  if (lower.length < 8) return false; // too short

  const nlPatterns = [
    /^(who|show|find|list|get|employees?|absent|present|how\s+many|which|top\s+\d|after|before|since|in\s+\w+\s+\d{4})/i,
    /department|salary|joined|hired|marketing|engineering|finance|sales|human\s+resources|operations|design|product|legal|customer\s+support/i,
    /more\s+than|less\s+than|above|below|absent|active|inactive|probation/i,
  ];
  return nlPatterns.some(p => p.test(lower));
}

type NLResult = {
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  status: string;
  _id?: string;
};

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* NL search state */
  const [nlMode, setNlMode] = useState(false);
  const [nlResults, setNlResults] = useState<NLResult[]>([]);
  const [nlFilters, setNlFilters] = useState<{ label: string; value: string }[]>([]);
  const [nlDescription, setNlDescription] = useState("");
  const [nlLoading, setNlLoading] = useState(false);

  /* detect platform */
  const [isMac, setIsMac] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mac = /Mac|iPhone|iPad/.test(navigator.userAgent);
    setIsMac(mac);
    setMounted(true);
  }, []);

  const modKey = mounted ? (isMac ? "⌘" : "Ctrl") : "Ctrl";

  /* hotkey */
  useHotkeys("mod+k", (e) => {
    e.preventDefault();
    setOpen((v) => !v);
  }, { enableOnFormTags: true });

  /* filter nav items */
  const filtered = useMemo(() => {
    if (nlMode) return [];
    if (!query.trim()) return navItems;
    const q = query.toLowerCase();
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, nlMode]);

  /* NL search trigger */
  const triggerNLSearch = useCallback(async (q: string) => {
    setNlLoading(true);
    try {
      const result = await searchNaturalLanguage(q);
      setNlResults(result.results as NLResult[]);
      setNlFilters(result.appliedFilters);
      setNlDescription(result.filterDescription);
    } catch (e) {
      console.error("NL search failed:", e);
      setNlResults([]);
      setNlDescription("Search failed. Try a simpler query.");
    } finally {
      setNlLoading(false);
    }
  }, []);

  /* Detect NL mode on query change */
  useEffect(() => {
    const isNl = isNaturalLanguageQuery(query);
    setNlMode(isNl);

    if (isNl) {
      const timer = setTimeout(() => { triggerNLSearch(query); }, 600);
      return () => clearTimeout(timer);
    } else {
      setNlResults([]);
      setNlFilters([]);
      setNlDescription("");
    }
  }, [query, triggerNLSearch]);

  /* reset on open */
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setNlMode(false);
      setNlResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* clamp active index */
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length, nlResults.length]);

  /* keyboard nav */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const itemCount = nlMode ? nlResults.length : filtered.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(1, itemCount));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + itemCount) % Math.max(1, itemCount));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (nlMode && nlResults[activeIndex]) {
        const emp = nlResults[activeIndex];
        navigateTo(`/employee/${emp._id}`);
      } else if (!nlMode && filtered[activeIndex]) {
        navigateTo(filtered[activeIndex].href);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const navigateTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) setOpen(false);
      }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/40 dark:bg-black/60 backdrop-blur-sm px-4"
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-in zoom-in-95 duration-200"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
          {nlMode ? (
            <IoSparklesOutline size={18} className="shrink-0 text-violet-500" />
          ) : (
            <IoSearchOutline size={18} className="shrink-0 text-slate-400 dark:text-slate-500" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search navigation or ask in natural language…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-[13px] font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {nlMode && (
            <span className="text-[9px] font-black px-2 py-1 rounded-md bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 tracking-widest uppercase shrink-0">
              AI Search
            </span>
          )}
          <kbd
            className="text-[10px] font-black px-2 py-1 rounded-md shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm"
          >
            ESC
          </kbd>
        </div>

        {/* Applied Filters (NL mode) */}
        {nlMode && nlFilters.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-2">
            {nlFilters.map((f, i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-[10px] font-bold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
              >
                <span className="font-black uppercase tracking-wider">{f.label}:</span> {f.value}
              </span>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-3 thin-scrollbar">
          {/* NL Mode Results */}
          {nlMode ? (
            <>
              {nlLoading ? (
                <div className="px-5 py-10 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest">
                    AI is searching…
                  </p>
                </div>
              ) : nlResults.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-600">
                    No employees found
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">{nlDescription}</p>
                </div>
              ) : (
                <>
                  <p className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-violet-500">
                    <IoSparklesOutline size={10} className="inline mr-1" />
                    {nlDescription} — {nlResults.length} result{nlResults.length !== 1 ? "s" : ""}
                  </p>
                  <div className="px-2 space-y-1 mt-1">
                    {nlResults.slice(0, 15).map((emp, i) => (
                      <button
                        key={emp._id || i}
                        onClick={() => navigateTo(`/employee/${emp._id}`)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[13px] transition-all ${i === activeIndex
                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold shadow-sm ring-1 ring-violet-200/50 dark:ring-violet-700/50"
                            : "bg-transparent text-slate-600 dark:text-slate-400 font-bold"
                          }`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span
                            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${i === activeIndex
                                ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              }`}
                          >
                            {emp.name.split(" ").map((n: string) => n[0]).join("")}
                          </span>
                          <span className="flex flex-col items-start min-w-0">
                            <span className="truncate">{emp.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold truncate">
                              {emp.department} • {emp.designation}
                            </span>
                          </span>
                        </span>
                        {i === activeIndex && (
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-500 shrink-0">
                            View
                            <IoReturnDownBackOutline size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Nav Mode Results */
            <>
              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-600">
                    No matching results located
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    💡 Try a natural language query like &quot;Employees in Finance&quot;
                  </p>
                </div>
              ) : (
                <>
                  <p className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Navigation Cluster
                  </p>
                  <div className="px-2 space-y-1 mt-1">
                    {filtered.map((item, i) => (
                      <button
                        key={item.href}
                        onClick={() => navigateTo(item.href)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[13px] transition-all ${i === activeIndex ? 'bg-slate-100 dark:bg-slate-800 text-brand-primary font-bold shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50' : 'bg-transparent text-slate-600 dark:text-slate-400 font-bold'}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIndex ? 'bg-brand-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          {item.label}
                        </span>
                        {i === activeIndex && (
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-primary">
                            Navigate
                            <IoReturnDownBackOutline size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-6 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">↑↓</kbd>
            Jump
          </span>
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">↵</kbd>
            Commit
          </span>
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">{modKey}K</kbd>
            Toggle
          </span>
          {nlMode && (
            <span className="ml-auto flex items-center gap-1 text-violet-500">
              <IoSparklesOutline size={10} />
              AI Mode
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
