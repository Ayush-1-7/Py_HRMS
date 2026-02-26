"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchEmployees } from "@/services/employeeService";
import { fetchAttendance } from "@/services/attendanceService";
import { Skeleton } from "@/components/ui/skeleton";
import Sparkline from "@/components/dashboard/Sparkline";
import AttendanceTrend from "@/components/dashboard/AttendanceTrend";
import DepartmentDistribution from "@/components/dashboard/DepartmentDistribution";
import AttendanceSummary from "@/components/dashboard/AttendanceSummary";
import type { IEmployee } from "@/models/Employee";
import DocumentationModal from "@/components/dashboard/DocumentationModal";
import { IoDocumentTextOutline } from "react-icons/io5";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    missingAttendance: 0,
  });
  const [recentEmployees, setRecentEmployees] = useState<IEmployee[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<{ date: string; present: number; absent: number }[]>([]);
  const [deptDistribution, setDeptDistribution] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [docModalOpen, setDocModalOpen] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(today.getDate() - (6 - i));
          return d.toISOString().slice(0, 10);
        });

        const fromDate = last7Days[0];
        const toDate = last7Days[6];

        const [empRes, attRes] = await Promise.all([
          fetchEmployees(1, 100), // Fetch more for better distribution data
          fetchAttendance(fromDate, toDate, 1, 100)
        ]);

        // 1. Current Stats
        const todayStr = toDate;
        const presentCount = attRes.employees.filter(e => e.attendance[todayStr]?.status === "present").length;
        const absentCount = attRes.employees.filter(e => e.attendance[todayStr]?.status === "absent").length;
        const missingCount = attRes.employees.filter(e => !e.attendance[todayStr] || e.attendance[todayStr].status === "unmarked").length;

        setStats({
          totalEmployees: empRes.pagination.total,
          activeEmployees: empRes.data.filter(e => e.status === "active").length,
          presentToday: presentCount,
          absentToday: absentCount,
          missingAttendance: missingCount,
        });

        // 2. Attendance Trend (7 days)
        const trend = last7Days.map(date => ({
          date,
          present: attRes.employees.filter(e => e.attendance[date]?.status === "present").length,
          absent: attRes.employees.filter(e => e.attendance[date]?.status === "absent").length,
        }));
        setAttendanceTrend(trend);

        // 3. Department Distribution
        const depts: Record<string, number> = {};
        empRes.data.forEach(e => {
          depts[e.department] = (depts[e.department] || 0) + 1;
        });
        setDeptDistribution(Object.entries(depts).map(([name, value]) => ({ name, value })));

        setRecentEmployees(empRes.data.slice(0, 5));
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const executiveMetrics = [
    {
      label: "Total Workforce",
      value: stats.totalEmployees,
      trend: "+2.5%",
      sparkline: [20, 22, 21, 23, 25, 24, 26],
      colorClass: "text-brand-primary",
      bgClass: "bg-brand-primary",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
        </svg>
      )
    },
    {
      label: "Attendance Rate",
      value: stats.totalEmployees ? `${Math.round((stats.presentToday / stats.totalEmployees) * 100)}%` : "0%",
      trend: "-1.2%",
      sparkline: [80, 85, 82, 78, 81, 84, 82],
      colorClass: "text-success",
      bgClass: "bg-success",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    },
    {
      label: "Open Positions",
      value: 4, // Mocked for UI Refinement
      trend: "Stable",
      sparkline: [4, 4, 3, 5, 4, 4, 4],
      colorClass: "text-accent-primary",
      bgClass: "bg-accent-primary",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up stagger-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 italic">
            Executive <span className="text-brand-primary">Pulse</span>
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Strategic workforce intelligence & operational analytics.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex -space-x-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-800 pl-4 py-1">
            03 Active Admins
          </p>
        </div>
      </header>

      <section className="animate-fade-in-up stagger-1">
        <AttendanceSummary
          present={stats.presentToday}
          absent={stats.absentToday}
          missing={stats.missingAttendance}
          total={stats.totalEmployees}
          loading={loading}
        />
      </section>

      {/* ── Executive Metrics Cluster ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up stagger-2">
        {executiveMetrics.map((metric, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-brand-primary transition-all duration-300 shadow-sm group">
            <div className="flex justify-between items-center mb-6">
              <div className={`w-12 h-12 rounded-2xl ${metric.bgClass} text-white flex items-center justify-center shadow-lg shadow-brand-primary/20`}>
                {metric.icon}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${metric.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : metric.trend === 'Stable' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-rose-500/10 text-rose-600'}`}>
                  {metric.trend}
                </span>
                <Sparkline data={metric.sparkline} color={metric.trend.startsWith('+') ? 'var(--success-primary)' : 'var(--slate-400)'} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{loading ? <Skeleton className="h-8 w-20 bg-slate-100 dark:bg-slate-800" /> : metric.value}</h3>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{metric.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Strategic Analytics Zone ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up stagger-3">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">Attendance Pulse</h2>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">Operational Window: 07 Days</p>
          </div>
          <AttendanceTrend data={attendanceTrend} loading={loading} />
        </div>
        <div className="bg-white dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">Workforce Topology</h2>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">By Functional Division</p>
          </div>
          <DepartmentDistribution data={deptDistribution} loading={loading} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up stagger-4">
        {/* ── Operational Alerts Zone ── */}
        <div className="lg:col-span-8 space-y-8">
          <section className="space-y-5">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                Operational Alerts
                <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20">Action Required</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/30 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{stats.absentToday} Employees Absent</p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-1">Resource planning needed</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-amber-200 dark:border-amber-900/30 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{stats.missingAttendance} Unmarked Slots</p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-1">Compliance sync required</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Personnel Snapshot / New Joins ── */}
          <section className="space-y-5">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">Personnel Log</h2>
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? [1, 2, 3].map(i => <div key={i} className="p-5"><Skeleton className="h-12 w-full bg-slate-50 dark:bg-slate-900" /></div>) :
                  recentEmployees.length > 0 ? recentEmployees.map((emp, idx) => (
                    <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-subtle flex items-center justify-center text-brand-primary font-black text-sm ring-1 ring-brand-muted group-hover:scale-110 transition-transform">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100">{emp.name}</p>
                          <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">{emp.employeeId || `#${emp.id}`} • {emp.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Entry Date</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{new Date(emp.joiningDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                      </div>
                    </div>
                  )) : <div className="p-12 text-center text-slate-400 text-sm italic font-bold">No recent joiners identified.</div>
                }
              </div>
              <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link href="/personnel" className="text-[11px] font-black uppercase tracking-widest text-brand-primary hover:underline underline-offset-4">Browse Directory →</Link>
              </div>
            </div>
          </section>
        </div>

        {/* ── Quick Actions & Sidebar Zone ── */}
        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-5">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">Quick Actions</h2>
            <div className="bg-white dark:bg-slate-950 p-2 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <Link href="/personnel?add=true" className="w-full flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </div>
                  <span className="text-[13px] font-bold">Add New Personnel</span>
                </div>
                <span className="text-[10px] font-black text-slate-300 group-hover:text-brand-primary transition-colors">ALT-N</span>
              </Link>
              <Link href="/attendance" className="w-full flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                  </div>
                  <span className="text-[13px] font-bold">Audit Attendance</span>
                </div>
                <span className="text-[10px] font-black text-slate-300 group-hover:text-emerald-500 transition-colors">ALT-A</span>
              </Link>
            </div>
          </section>

          <section className="p-8 bg-brand-primary text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 space-y-5">
              <h3 className="font-black text-xl uppercase tracking-tighter italic">Operational Hub</h3>
              <p className="text-[13px] text-white/90 font-bold leading-relaxed">
                Review mandated enterprise HR directives for 2026. Includes updated compliance protocols and tax templates.
              </p>
              <button
                onClick={() => setDocModalOpen(true)}
                className="group flex items-center gap-3 px-6 py-4 bg-white text-slate-950 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all ring-4 ring-white/20"
              >
                <IoDocumentTextOutline size={20} className="group-hover:rotate-6 transition-transform text-brand-primary" />
                Access Directives
              </button>
            </div>
            {/* Decorative Graphics */}
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-hover/20 rounded-full blur-2xl" />
          </section>
        </div>
      </div>

      <DocumentationModal open={docModalOpen} onClose={() => setDocModalOpen(false)} />
    </div>
  );
}
