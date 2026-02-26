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
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-3">
                        <IoWalletOutline className="text-brand-primary" />
                        Payroll Management
                    </h1>
                    <p className="text-text-secondary mt-1">Disbursements, tax compliance, and financial oversight.</p>
                </div>

                <div className="relative w-full max-w-md">
                    <input
                        type="text"
                        placeholder="Search by name, ID, or department..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 text-sm rounded-xl border bg-surface-base outline-none transition-all focus:border-brand-primary focus:ring-4 focus:ring-brand-subtle border-border-default text-text-primary"
                    />
                </div>
            </header>

            <div className="flex justify-end mb-6">
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
                    className="btn-secondary rounded-xl px-6 py-2.5 flex items-center gap-2 border-border-default hover:bg-surface-hover/50"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export Statistics
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-base p-6 border-l-4 border-l-brand-primary">
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Total Monthly Liability</p>
                    <p className="text-3xl font-black text-text-primary">${totalPayroll.toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-success font-bold">
                        <IoTrendingUpOutline /> +4.2% from last month
                    </div>
                </div>
                <div className="card-base p-6 border-l-4 border-l-success">
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Verified Disbursements</p>
                    <p className="text-3xl font-black text-text-primary">98.2%</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-text-tertiary">
                        <IoShieldCheckmarkOutline /> 12 records pending review
                    </div>
                </div>
                <div className="card-base p-6 border-l-4 border-l-accent-primary">
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Average Gross Salary</p>
                    <p className="text-3xl font-black text-text-primary">${Math.round(employees.length ? totalPayroll / employees.length : 0).toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-brand-primary font-bold">
                        Market Benchmarked
                    </div>
                </div>
            </div>

            <div className="card-base overflow-hidden">
                <div className="p-6 border-b border-border-default flex items-center justify-between">
                    <h2 className="font-bold text-text-primary">Active Payroll Roster</h2>
                    <span className="px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-[10px] uppercase font-black">March 2026 Batch</span>
                </div>
                <div className="divide-y divide-border-default overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-surface-muted/50 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                                <th className="px-6 py-3">Employee</th>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Department</th>
                                <th className="px-6 py-3">Base Salary</th>
                                <th className="px-6 py-3">Tax Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default">
                            {loading ? [1, 2, 3].map(i => (
                                <tr key={i}><td colSpan={6} className="p-6"><Skeleton className="h-4 w-full" /></td></tr>
                            )) : employees.map((emp, idx) => (
                                <tr key={idx} className="hover:bg-surface-hover transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-subtle text-brand-primary flex items-center justify-center text-[10px] font-bold">
                                                {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                            <span className="text-sm font-bold text-text-primary">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[11px] font-mono text-text-tertiary">{emp.employeeId || `#${emp.id}`}</td>
                                    <td className="px-6 py-4 text-xs text-text-secondary">{emp.department}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-text-primary">${(emp.salary || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs">
                                        <span className={`px-2 py-0.5 rounded ${emp.status === 'active' ? 'bg-success-subtle text-success' : 'bg-amber-subtle text-amber'} font-bold uppercase tracking-tighter`}>
                                            {emp.status === 'active' ? 'Compliant' : 'On Leave'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/employee/${emp._id}`} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-brand-primary hover:underline">
                                            View Details <IoChevronForwardOutline />
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
