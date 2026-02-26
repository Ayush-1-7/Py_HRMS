"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { HiMenuAlt2 } from "react-icons/hi";
import { BRANDING } from "@/lib/constants";
import ThemeToggle from "./ThemeToggle";
import Dropdown from "@/components/ui/Dropdown";
import { IoPersonCircleOutline, IoSettingsOutline, IoLogOutOutline } from "react-icons/io5";

/* ── Page title map ─────────────────────────────────────── */
const pageTitles: Record<string, string> = {
  "/": "Team Directory",
  "/dashboard": "Command Center",
  "/attendance": "Attendance Tracker",
  "/payroll": "Payroll",
  "/reports": "Reports",
};

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const title = pageTitles[pathname] ?? BRANDING.APP_NAME;

  const [isMac, setIsMac] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mac = /Mac|iPhone|iPad/.test(navigator.userAgent);
    setIsMac(mac);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modKey = isMac ? "⌘" : "Ctrl+";

  const openSearch = () => {
    const e = new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    });
    document.dispatchEvent(e);
  };

  return (
    <header className="navbar-root fixed top-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 transition-all duration-300">
      <div className="flex items-center gap-3 md:gap-4 truncate">
        {/* Hamburger for mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg transition-colors hover:bg-surface-muted text-text-primary"
        >
          <HiMenuAlt2 size={24} />
        </button>

        {/* Page title */}
        <h1
          className="text-lg md:text-xl lg:text-2xl font-semibold tracking-tight truncate text-text-primary"
        >
          {title}
        </h1>
      </div>

      {/* Search Toggle / Bar & Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={openSearch}
          className="flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-xl text-sm transition-all border group hover:border-brand-subtle hover:shadow-sm bg-surface-base border-border-default items-center"
          style={{ minWidth: mounted ? (isMac ? 140 : 160) : 140 }}
        >
          <IconSearch />
          <span className="hidden sm:inline flex-1 text-left truncate text-text-tertiary">
            Search {BRANDING.SHORT_NAME}...
          </span>
          <kbd
            className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-surface-muted border-border-default text-text-tertiary border"
          >
            {modKey}K
          </kbd>
        </button>

        <ThemeToggle />

        {/* User Avatar / Dropdown */}
        <Dropdown
          options={[
            { value: "profile", label: "My Profile", icon: <IoPersonCircleOutline size={18} className="text-brand-primary" /> },
            { value: "settings", label: "Settings", icon: <IoSettingsOutline size={18} className="text-slate-400" /> },
            { value: "logout", label: "Sign Out", icon: <IoLogOutOutline size={18} className="text-danger" /> }
          ]}
          value=""
          onChange={(val) => {
            if (val === "logout") {
              // Handle logout logic if needed, for now just toast or redirect
              window.location.href = "/";
            }
          }}
          trigger={
            <div className="flex items-center justify-center w-9 h-9 rounded-full border border-border-default bg-brand-subtle text-brand-primary font-semibold text-sm cursor-pointer shadow-xs transition-transform hover:scale-105 active:scale-95 group">
              AD
            </div>
          }
        />
      </div>
    </header>
  );
}
