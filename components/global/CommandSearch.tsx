"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { IoSearchOutline, IoReturnDownBackOutline } from "react-icons/io5";

/* ── Nav items (static) ─────────────────────────────────── */
const navItems = [
  { label: "Command Center", href: "/dashboard", section: "Navigation" },
  { label: "Team Directory", href: "/personnel", section: "Navigation" },
  { label: "Attendance Tracker", href: "/attendance", section: "Navigation" },
  { label: "Payroll", href: "/payroll", section: "Navigation" },
  { label: "Reports", href: "/reports", section: "Navigation" },
];

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* detect platform */
  const [isMac, setIsMac] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mac = /Mac|iPhone|iPad/.test(navigator.userAgent);
    setIsMac(mac);
    setMounted(true);
  }, []);

  const modKey = mounted ? (isMac ? "⌘" : "Ctrl") : "Ctrl"; // Default to Ctrl if not mounted yet (SSR)

  /* hotkey */
  useHotkeys("mod+k", (e) => {
    e.preventDefault();
    setOpen((v) => !v);
  }, { enableOnFormTags: true });

  /* filter */
  const filtered = useMemo(() => {
    if (!query.trim()) return navItems;
    const q = query.toLowerCase();
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  /* reset on open */
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // We only want to trigger this when 'open' changes to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* clamp active index */
  useEffect(() => {
    setActiveIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length]);

  /* keyboard nav */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      navigate(filtered[activeIndex].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const navigate = (href: string) => {
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
          <IoSearchOutline size={18} className="shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search system entities and navigation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-[13px] font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <kbd
            className="text-[10px] font-black px-2 py-1 rounded-md shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm"
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-3 thin-scrollbar">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-bold text-slate-400 dark:text-slate-600">
                No matching results located
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
                    onClick={() => navigate(item.href)}
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
        </div>
      </div>
    </div>
  );
}
