"use client";

import { useState, useEffect } from "react";
import { fetchEmployees } from "@/services/employeeService";
import { Skeleton } from "@/components/ui/skeleton";
import { IoWalletOutline, IoShieldCheckmarkOutline, IoTrendingUpOutline, IoChevronForwardOutline } from "react-icons/io5";
import { toast } from "sonner";
import Link from "next/link";
import { IEmployee } from "@/models/Employee";
import jsPDF from "jspdf";

export default function PayrollPage() {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<IEmployee[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function loadPayroll() {
            try {
                // Fetch more to ensure all 55+ are covered, and support search
                const res = await fetchEmployees(1, 100, undefined, search);
                setEmployees(res.data);
            } catch (err) {
                toast.error("Failed to load payroll data");
            } finally {
                setLoading(false);
            }
        }
        const timer = setTimeout(loadPayroll, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const totalPayroll = employees.reduce((acc, curr) => acc + (curr.salary || 0), 0);

    return (
        <div className="p-6 md:p-10 space-y-10 animate-fade-in bg-white dark:bg-slate-950 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-4 italic">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20">
                            <IoWalletOutline size={28} />
                        </div>
                        Payroll <span className="text-brand-primary">Pulse</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-2 ml-16">
                        Financial Oversight • Compliance Node • Disbursements
                    </p>
                </div>

                <div className="relative w-full max-w-md group">
                    <input
                        type="text"
                        placeholder="Filter by name, ID, or cost center..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-5 pr-12 py-4 text-[13px] font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 outline-none transition-all focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-primary transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                </div>
            </header>

            <div className="flex justify-end">
                <button
                    onClick={() => {
                        try {
                            const doc = new jsPDF();
                            doc.setFontSize(22);
                            doc.text("Projected Payroll Report", 20, 20);
                            doc.setFontSize(10);
                            doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);

                            let y = 50;
                            doc.setFontSize(12);
                            doc.setFont("helvetica", "bold");
                            doc.text("ID", 20, y);
                            doc.text("Employee Name", 45, y);
                            doc.text("Department", 100, y);
                            doc.text("Base Salary", 160, y);

                            doc.setFont("helvetica", "normal");
                            doc.setFontSize(10);
                            y += 10;

                            employees.forEach(emp => {
                                if (y > 275) { doc.addPage(); y = 20; }
                                doc.text(emp.employeeId || emp.id.toString(), 20, y);
                                doc.text(emp.name, 45, y);
                                doc.text(emp.department, 100, y);
                                doc.text(`$${(emp.salary || 0).toLocaleString()}`, 160, y);
                                y += 10;
                            });

                            doc.save("Projected_Payroll.pdf");
                            toast.success("Payroll data exported");
                        } catch (err) {
                            toast.error("Export failed");
                        }
                    }}
                    className="flex items-center gap-3 px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.03] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 border border-slate-800 dark:border-slate-200"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export Statistics
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up stagger-1">
                <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-[10px] border-l-brand-primary group hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">Monthly Liability</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-slate-100">${totalPayroll.toLocaleString()}</p>
                    <div className="mt-5 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">
                        <IoTrendingUpOutline size={16} /> +4.2% Growth
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-[10px] border-l-emerald-500 group hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">Disbursement Health</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-slate-100">98.2%</p>
                    <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">
                        <IoShieldCheckmarkOutline size={16} /> Verified Node
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-[10px] border-l-indigo-500 group hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">Gross Mean Compensation</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-slate-100">${Math.round(employees.length ? totalPayroll / employees.length : 0).toLocaleString()}</p>
                    <div className="mt-5 flex items-center gap-2 text-xs text-brand-primary font-black uppercase tracking-widest">
                        Market Calibrated
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in-up stagger-2">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">Payroll Roster Cluster</h2>
                    <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">March 2026 Batch</span>
                </div>
                <div className="overflow-x-auto thin-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5">Personnel Node</th>
                                <th className="px-8 py-5">Entity ID</th>
                                <th className="px-8 py-5">Cost Center</th>
                                <th className="px-8 py-5">Base Remuneration</th>
                                <th className="px-8 py-5">Risk / Status</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? [1, 2, 3, 4, 5].map(i => (
                                <tr key={i}><td colSpan={6} className="px-8 py-6"><Skeleton className="h-6 w-full bg-slate-50 dark:bg-slate-900" /></td></tr>
                            )) : employees.map((emp, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand-primary flex items-center justify-center text-[10px] font-black shadow-inner ring-1 ring-brand-muted group-hover:scale-110 transition-transform">
                                                {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                            <span className="text-[13px] font-black text-slate-900 dark:text-slate-100">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-[11px] font-black font-mono text-slate-400 uppercase tracking-widest">{emp.employeeId || `#${emp.id}`}</td>
                                    <td className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{emp.department}</td>
                                    <td className="px-8 py-5 text-[13px] font-black font-mono text-slate-900 dark:text-slate-100">${(emp.salary || 0).toLocaleString()}</td>
                                    <td className="px-8 py-5 text-xs">
                                        <span className={`px-3 py-1 rounded-full ${emp.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'} text-[10px] font-black uppercase tracking-widest border ${emp.status === 'active' ? 'border-emerald-500/20' : 'border-amber-500/20'}`}>
                                            {emp.status === 'active' ? 'Verified' : 'Review Needed'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Link href={`/employee/${emp._id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary hover:bg-brand-subtle transition-all border border-slate-200 dark:border-slate-700">
                                            Audit Entry <IoChevronForwardOutline size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
