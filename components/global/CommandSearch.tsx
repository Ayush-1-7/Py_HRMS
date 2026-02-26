"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { IoSearchOutline, IoReturnDownBackOutline } from "react-icons/io5";

/* ── Nav items (static) ─────────────────────────────────── */
const navItems = [
  { label: "Command Center", href: "/dashboard", section: "Navigation" },
  { label: "Team Directory", href: "/", section: "Navigation" },
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
        className="card-base w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-default">
          <IoSearchOutline size={18} className="shrink-0 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary"
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 bg-surface-muted border border-border-default text-text-secondary"
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-sm text-center text-text-secondary">
              No results found
            </p>
          ) : (
            <>
              <p className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                Navigation
              </p>
              {filtered.map((item, i) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center justify-between px-5 py-2.5 text-sm transition-colors ${i === activeIndex ? 'bg-surface-hover text-brand-primary font-semibold' : 'bg-transparent text-text-secondary font-normal'}`}
                >
                  <span>{item.label}</span>
                  {i === activeIndex && (
                    <IoReturnDownBackOutline size={14} className="text-brand-primary" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-border-default text-[10px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded font-mono bg-surface-muted border border-border-default">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded font-mono bg-surface-muted border border-border-default">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded font-mono bg-surface-muted border border-border-default">{modKey}K</kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  );
}
