"use client";

import { useState, useEffect } from "react";
import { fetchEmployees } from "@/services/employeeService";
import { fetchAttendance, type AttendanceEmployee } from "@/services/attendanceService";
import AttendanceTrend from "@/components/dashboard/AttendanceTrend";
import DepartmentDistribution from "@/components/dashboard/DepartmentDistribution";
import { IoDownloadOutline, IoDocumentTextOutline, IoAnalyticsOutline, IoBarChartOutline } from "react-icons/io5";
import { toast } from "sonner";
import jsPDF from "jspdf";

import { IEmployee } from "@/models/Employee";

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        attendance: { date: string; present: number; absent: number }[];
        departments: { name: string; value: number }[];
        employees: IEmployee[];
    }>({
        attendance: [],
        departments: [],
        employees: []
    });

    useEffect(() => {
        async function loadReportsData() {
            try {
                const today = new Date();
                const fromDate = new Date();
                fromDate.setDate(today.getDate() - 30); // 30 day range for reports

                const [empRes, attRes] = await Promise.all([
                    fetchEmployees(1, 200),
                    fetchAttendance(fromDate.toISOString().slice(0, 10), today.toISOString().slice(0, 10), 1, 200)
                ]);

                // Process Depts
                const depts: Record<string, number> = {};
                empRes.data.forEach((e: IEmployee) => {
                    depts[e.department] = (depts[e.department] || 0) + 1;
                });

                // Process Attendance (Last 7 days for the chart)
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(today.getDate() - (6 - i));
                    return d.toISOString().slice(0, 10);
                });

                const trend = last7Days.map(date => ({
                    date,
                    present: attRes.employees.filter((e: AttendanceEmployee) => e.attendance[date]?.status === "present").length,
                    absent: attRes.employees.filter((e: AttendanceEmployee) => e.attendance[date]?.status === "absent").length,
                }));

                setData({
                    attendance: trend,
                    departments: Object.entries(depts).map(([name, value]) => ({ name, value })),
                    employees: empRes.data
                });
            } catch (err) {
                toast.error("Failed to load report data");
            } finally {
                setLoading(false);
            }
        }
        loadReportsData();
    }, []);

    const exportWorkforceReport = () => {
        if (!data.employees.length) return;
        try {
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.text("Workforce Inventory Report", 20, 20);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);

            let y = 45;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Name", 20, y);
            doc.text("Department", 80, y);
            doc.text("Status", 150, y);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            y += 10;

            data.employees.slice(0, 20).forEach((emp: IEmployee) => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(emp.name, 20, y);
                doc.text(emp.department, 80, y);
                doc.text(emp.status, 150, y);
                y += 8;
            });

            doc.save("Workforce_Report.pdf");
            toast.success("Report exported successfully");
        } catch (err) {
            toast.error("Export failed");
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-10 animate-fade-in bg-white dark:bg-slate-950 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-4 italic">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20">
                            <IoAnalyticsOutline size={28} />
                        </div>
                        Executive <span className="text-brand-primary">Intelligence</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-2 ml-16">
                        Strategic Analytics • Workforce Documentation • Node Insights
                    </p>
                </div>
                <button
                    onClick={exportWorkforceReport}
                    disabled={loading}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.03] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 border border-slate-800 dark:border-slate-200 disabled:opacity-50"
                >
                    <IoDownloadOutline size={18} />
                    Export Repository Records
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up stagger-1">
                <div className="bg-white dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2 px-2">
                        <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand-primary flex items-center justify-center">
                            <IoBarChartOutline size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">Engagement Vectors</h2>
                    </div>
                    <AttendanceTrend data={data.attendance} loading={loading} />
                </div>
                <div className="bg-white dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2 px-2">
                        <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand-primary flex items-center justify-center">
                            <IoDocumentTextOutline size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">Workforce Topology</h2>
                    </div>
                    <DepartmentDistribution data={data.departments} loading={loading} />
                </div>
            </div>

            <section className="bg-slate-50 dark:bg-slate-900/50 p-12 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in-up stagger-2">
                <div className="w-20 h-20 rounded-[2rem] bg-brand-primary text-white flex items-center justify-center shadow-2xl shadow-brand-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <IoDocumentTextOutline size={40} />
                </div>
                <div className="max-w-xl space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase italic">Enterprise Query Designer</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-tight">
                        Orchestrate multi-dimensional reports with our advanced heuristic query engine. Build cross-functional data nodes for deep operational insight.
                    </p>
                </div>
                <button className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-md active:scale-[0.98]">
                    Launch Component Builder
                </button>
            </section>
        </div>
    );
}
