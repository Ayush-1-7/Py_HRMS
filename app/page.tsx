"use client";

import { Suspense } from "react";
import EmployeeList from "@/components/employee/employeeList";

/* ── Page ───────────────────────────────────────────────── */
export default function EmployeesPage() {
  return (
    <div className="relative min-h-[calc(100vh-var(--navbar-height))] flex items-center justify-center p-4 md:p-10 overflow-hidden bg-background">
      {/* Background Decorative Motifs */}
      <div className="absolute inset-0 opacity-[0.03] blur-[120px] pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-brand-primary animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 bg-accent-primary animate-pulse delay-700" />
      </div>

      <div className="relative z-10 w-full h-[85vh] max-w-[1400px] flex flex-col gap-6 animate-fade-in">
        <header className="flex flex-col gap-2 stagger-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-subtle flex items-center justify-center text-brand-primary shadow-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-text-primary uppercase">
                Team Directory
              </h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary mt-1">
                Strategic Human Capital Management • Core Node
              </p>
            </div>
          </div>
        </header>

        {/* ── Main card ── */}
        <div className="flex-1 bg-surface-base/90 backdrop-blur-3xl rounded-[2.5rem] border border-border-default/50 shadow-2xl overflow-hidden flex flex-col animate-fade-in stagger-2">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-text-tertiary">Loading...</div>}>
            <EmployeeList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

