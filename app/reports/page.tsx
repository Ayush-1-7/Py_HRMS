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
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-3">
                        <IoAnalyticsOutline className="text-brand-primary" />
                        Executive Reports
                    </h1>
                    <p className="text-text-secondary mt-1">Strategic workforce analytics and documentation.</p>
                </div>
                <button
                    onClick={exportWorkforceReport}
                    disabled={loading}
                    className="btn-primary rounded-xl px-6 py-2.5 flex items-center gap-2 shadow-sm hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                    <IoDownloadOutline size={18} />
                    Export All Records
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card-base p-6 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <IoBarChartOutline className="text-brand-primary" />
                        <h2 className="text-lg font-bold text-text-primary">Engagement Trends</h2>
                    </div>
                    <AttendanceTrend data={data.attendance} loading={loading} />
                </div>
                <div className="card-base p-6 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <IoDocumentTextOutline className="text-brand-primary" />
                        <h2 className="text-lg font-bold text-text-primary">Force Distribution</h2>
                    </div>
                    <DepartmentDistribution data={data.departments} loading={loading} />
                </div>
            </div>

            <section className="card-base p-8 bg-surface-muted/50 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-brand-subtle text-brand-primary flex items-center justify-center">
                    <IoDocumentTextOutline size={32} />
                </div>
                <div className="max-w-md">
                    <h3 className="text-lg font-bold text-text-primary">Custom Report Builder</h3>
                    <p className="text-sm text-text-tertiary">Need more specific data? Our advanced query engine allows you to build custom cross-functional reports.</p>
                </div>
                <button className="btn-secondary px-6 py-2 rounded-lg text-sm font-bold border-border-default">
                    Launch Report Designer
                </button>
            </section>
        </div>
    );
}
