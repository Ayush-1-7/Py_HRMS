"use client";

import { useEffect, useState } from "react";
import { IoCloseOutline, IoDocumentTextOutline, IoDownloadOutline, IoPrintOutline, IoShareOutline } from "react-icons/io5";

interface DocumentationModalProps {
    open: boolean;
    onClose: () => void;
}

export default function DocumentationModal({ open, onClose }: DocumentationModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!open || !mounted) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl h-[85vh] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 rounded-[2.5rem]">
                {/* Header / Toolbar */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20">
                            <IoDocumentTextOutline size={24} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-black text-slate-900 dark:text-slate-100 leading-none">Enterprise_HR_Guidelines_2026.pdf</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-black uppercase tracking-widest">Confidential • System Policy Document</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="hidden sm:flex p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all" title="Print Archive">
                            <IoPrintOutline size={20} />
                        </button>
                        <button className="hidden sm:flex p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all" title="Secure Download">
                            <IoDownloadOutline size={20} />
                        </button>
                        <button className="hidden sm:flex p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all" title="External Share">
                            <IoShareOutline size={20} />
                        </button>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-slate-400 dark:text-slate-500 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-800/30"
                        >
                            <IoCloseOutline size={26} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content (The "PDF" Area) */}
                <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900/50 p-4 md:p-12 space-y-8 thin-scrollbar">
                    {/* Page 1 */}
                    <div className="max-w-[800px] mx-auto bg-white shadow-2xl border border-black/5 min-h-[1000px] p-12 md:p-20 text-slate-800 flex flex-col items-center rounded-sm">
                        {/* Logo Placeholder */}
                        <div className="w-16 h-16 rounded-2xl bg-brand-primary flex items-center justify-center text-white mb-10 shadow-lg">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 2L2 9L16 16L30 9L16 2Z" fill="currentColor" fillOpacity="0.8" /><path d="M2 23L16 30L30 23V9L16 16L2 9V23Z" fill="currentColor" fillOpacity="0.4" /></svg>
                        </div>

                        <h1 className="text-4xl font-black text-center tracking-tight text-slate-900 mb-2">ElevateHR Enterprise</h1>
                        <p className="text-slate-500 uppercase tracking-[0.3em] text-[10px] font-bold mb-20 text-center">Workforce Intelligence & Policy Hub</p>

                        <div className="w-20 h-1 bg-brand-primary rounded-full mb-20" />

                        <div className="flex flex-col gap-8 w-full">
                            <div className="border-l-4 border-brand-primary pl-6 py-2">
                                <h2 className="text-2xl font-bold text-slate-900 leading-none">Operational Guidelines 2026</h2>
                                <p className="text-sm text-slate-600 mt-2">v4.2.0 • Updated January 2026</p>
                            </div>

                            <section className="mt-10 space-y-6">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500">01</span>
                                    Compliance & Code of Conduct
                                </h3>
                                <p className="text-[15px] leading-relaxed text-slate-600">
                                    All enterprise operations must adhere to the 2026 global labor standards. This section outlines the mandatory reporting procedures for attendance, payroll disbursement, and tax withholding. Employee data privacy is paramount, supported by our Tier-4 encryption standards implemented across all HRMS modules.
                                </p>

                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500">02</span>
                                    Dynamic Payroll & Tax Structures
                                </h3>
                                <p className="text-[15px] leading-relaxed text-slate-600">
                                    The 2026 fiscal year introduces automated tax calculation based on dynamic bracket shifting. Our system ensures consistent 99.9% accuracy by integrating local tax laws via our backend services. Managers must review tax percentages in the dashboard settings monthly.
                                </p>
                            </section>

                            {/* Table Mockup */}
                            <div className="mt-12 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Proposed Compliance Schedule</p>
                                </div>
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="bg-slate-100/50">
                                            <th className="px-4 py-2 font-bold text-slate-700">Phase</th>
                                            <th className="px-4 py-2 font-bold text-slate-700">Requirement</th>
                                            <th className="px-4 py-2 font-bold text-slate-700 text-right">Deadline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 italic font-medium text-slate-500">
                                        <tr><td className="px-4 py-2">Q1 Review</td><td className="px-4 py-2">Tax Bracketing Update</td><td className="px-4 py-2 text-right">Mar 15, 2026</td></tr>
                                        <tr><td className="px-4 py-2">Mid-Year</td><td className="px-4 py-2">Employee Audit</td><td className="px-4 py-2 text-right">Jun 30, 2026</td></tr>
                                        <tr><td className="px-4 py-2">Annual</td><td className="px-4 py-2">Policy Re-certification</td><td className="px-4 py-2 text-right">Nov 01, 2026</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-auto pt-20 text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
                            ElevateHR Confidential - Do Not Distribute
                        </div>
                    </div>
                </div>

                {/* Footer Area */}
                <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Manifest v4.2 • Page 01 / 01</p>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-brand-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-[1.03] active:scale-[0.98] transition-all"
                    >
                        Dismiss Review
                    </button>
                </div>
            </div>
        </div>
    );
}
