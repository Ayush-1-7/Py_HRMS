"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { BRANDING } from "@/lib/constants";
import {
  IoGridOutline,
  IoPeopleOutline,
  IoCalendarOutline,
  IoWalletOutline,
  IoBarChartOutline,
  IoMoonOutline,
  IoSunnyOutline,
  IoCloseOutline
} from "react-icons/io5";

/* ── Logo Graphic ────────────────────────────────────────── */
function LogoGraphic() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
      <path d="M16 2L2 9L16 16L30 9L16 2Z" fill="currentColor" fillOpacity="0.8" />
      <path d="M2 23L16 30L30 23V9L16 16L2 9V23Z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

/* ── Sidebar ────────────────────────────────────────────── */
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: IoGridOutline, roles: ["admin", "employee"] },
    { label: "Personnel", href: "/personnel", icon: IoPeopleOutline, roles: ["admin"] },
    { label: "Attendance", href: "/attendance", icon: IoCalendarOutline, roles: ["admin", "employee"] },
    { label: "Payroll", href: "/payroll", icon: IoWalletOutline, roles: ["admin"] },
    { label: "Reports", href: "/reports", icon: IoBarChartOutline, roles: ["admin"] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user?.role || ""));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar-root fixed left-0 top-0 h-screen flex flex-col z-50 overflow-hidden transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
        style={{
          width: "var(--sidebar-width)",
          background: "var(--surface-base)",
        }}
      >
        <div className="flex flex-col h-full py-6">
          <div className="flex items-center gap-3 mb-10 min-w-0 px-6">
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "var(--brand-primary)" }}>
              <LogoGraphic />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-bold text-xl tracking-tight leading-none text-primary">
                {BRANDING.APP_NAME}
              </span>
              <span className="text-[10px] uppercase font-medium tracking-wider text-brand-hover mt-1 truncate">
                {BRANDING.TAGLINE}
              </span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden ml-auto p-1.5 rounded-lg transition-colors hover:bg-surface-muted text-muted"
            >
              <IoCloseOutline size={24} />
            </button>
          </div>

          <p className="px-6 mb-3 text-[11px] font-bold uppercase tracking-widest text-muted">
            Main Menu
          </p>

          <nav className="flex-1 flex flex-col gap-1 px-4">
            {filteredItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onClose?.()}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group min-w-0 relative ${active
                    ? "bg-surface-hover text-brand-primary"
                    : "hover:bg-surface-muted text-text-secondary hover:text-text-primary"
                    }`}
                  title={label}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full shadow-sm bg-brand-primary" />
                  )}
                  <span className={`shrink-0 w-5 flex items-center justify-center transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                    <Icon size={20} />
                  </span>
                  <span className={`text-sm whitespace-nowrap overflow-hidden ${active ? "font-semibold" : "font-medium"}`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="px-4 pt-6 mt-auto">
            <button
              onClick={toggle}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all border border-transparent hover:border-border-default hover:bg-surface-hover group text-text-primary"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-surface-muted text-text-tertiary group-hover:text-brand-primary transition-colors">
                {theme === "dark" ? <IoSunnyOutline size={18} /> : <IoMoonOutline size={18} />}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-medium">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  Switch appearance
                </span>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
