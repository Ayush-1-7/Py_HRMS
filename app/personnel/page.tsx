"use client";

import { Suspense } from "react";
import EmployeeList from "@/components/employee/employeeList";

/* ── Personnel Page ─────────────────────────────────────── */
export default function PersonnelPage() {
    return (
        <div className="relative min-h-[calc(100vh-var(--navbar-height))] flex items-center justify-center p-4 md:p-10 overflow-hidden bg-white dark:bg-slate-950">
            {/* Structural Motifs (Very subtle, high contrast safe) */}
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-brand-primary blur-[160px]" />
                <div className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 bg-slate-400 blur-[160px]" />
            </div>

            <div className="relative z-10 w-full h-[85vh] max-w-[1400px] flex flex-col gap-8 animate-fade-in">
                <header className="flex flex-col gap-2 stagger-1">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase italic">
                                Personnel <span className="text-brand-primary">Pulse</span>
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1.5 px-1">
                                Strategic HR Management • Enterprise Directory Node
                            </p>
                        </div>
                    </div>
                </header>

                {/* ── Personnel Hub Container ── */}
                <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-fade-in stagger-2">
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Directory...</div>}>
                        <EmployeeList />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
