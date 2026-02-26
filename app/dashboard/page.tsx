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
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
            Executive <span className="text-brand-primary">Dashboard</span>
          </h1>
          <p className="text-sm md:text-base text-text-secondary">
            Strategic workforce insights and operational overview.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-surface-muted flex items-center justify-center text-[10px] font-bold text-text-tertiary">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary self-center ml-2 border-l border-border-default pl-3">
            3 active HR Managers
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

      {/* ── Executive Overivew Zone ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up stagger-2">
        {executiveMetrics.map((metric, idx) => (
          <div key={idx} className="card-base p-5 group hover:border-brand-primary transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
              <div className={`p-2 rounded-lg ${metric.bgClass} text-white`}>
                {metric.icon}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${metric.trend.startsWith('+') ? 'bg-success-subtle text-success' : metric.trend === 'Stable' ? 'bg-surface-muted text-text-tertiary' : 'bg-danger-subtle text-danger'}`}>
                  {metric.trend}
                </span>
                <Sparkline data={metric.sparkline} color={metric.trend.startsWith('+') ? 'var(--success-primary)' : 'var(--text-tertiary)'} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-text-primary">{loading ? <Skeleton className="h-8 w-16" /> : metric.value}</h3>
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{metric.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Strategic Analytics Zone ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up stagger-3">
        <div className="card-base p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">Attendance Pulse</h2>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-surface-muted px-2 py-1 rounded">Last 7 Days</p>
          </div>
          <AttendanceTrend data={attendanceTrend} loading={loading} />
        </div>
        <div className="card-base p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">Workforce Distribution</h2>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-surface-muted px-2 py-1 rounded">By Department</p>
          </div>
          <DepartmentDistribution data={deptDistribution} loading={loading} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up stagger-4">
        {/* ── Operational Alerts Zone ── */}
        <div className="lg:col-span-8 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                Operational Alerts
                <span className="px-2 py-0.5 rounded-full bg-danger-subtle text-danger text-[10px] uppercase font-black">Urgent</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card-base p-4 flex items-center gap-4 bg-danger-subtle/30 border-danger/20">
                <div className="w-10 h-10 rounded-xl bg-danger text-white flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{stats.absentToday} Employees Absent</p>
                  <p className="text-xs text-text-secondary">Requires backfill planning</p>
                </div>
              </div>
              <div className="card-base p-4 flex items-center gap-4 bg-warning-subtle/30 border-warning/20">
                <div className="w-10 h-10 rounded-xl bg-warning-primary text-white flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{stats.missingAttendance} Unmarked Attendance</p>
                  <p className="text-xs text-text-secondary">Check with department heads</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Recent Activity / New Joins ── */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Recently Joined</h2>
            <div className="card-base overflow-hidden">
              <div className="divide-y divide-border-default">
                {loading ? [1, 2, 3].map(i => <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>) :
                  recentEmployees.length > 0 ? recentEmployees.map((emp, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center text-brand-primary font-bold text-xs">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary">{emp.name}</p>
                          <p className="text-[10px] font-mono text-text-tertiary mb-0.5">{emp.employeeId || `#${emp.id}`}</p>
                          <p className="text-[11px] text-text-tertiary">{emp.designation} • {emp.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-tighter">Joined</p>
                        <p className="text-xs font-medium text-text-secondary">{new Date(emp.joiningDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )) : <div className="p-8 text-center text-text-tertiary text-sm italic">No recent joiners found.</div>
                }
              </div>
            </div>
          </section>
        </div>

        {/* ── Quick Actions & Sidebar Zone ── */}
        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Quick Actions</h2>
            <div className="card-base p-2 space-y-1">
              <Link href="/?add=true" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted text-text-primary transition-colors">
                <div className="w-8 h-8 rounded-lg bg-brand-subtle text-brand-primary flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </div>
                <span className="text-sm font-semibold">Add Employee</span>
              </Link>
              <Link href="/attendance" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted text-text-primary transition-colors">
                <div className="w-8 h-8 rounded-lg bg-success-subtle text-success flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                </div>
                <span className="text-sm font-semibold">Verify Compliance</span>
              </Link>
              <Link href="/reports" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted text-text-primary transition-colors">
                <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent-primary flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                </div>
                <span className="text-sm font-semibold">Generate Reports</span>
              </Link>
            </div>
          </section>

          <section className="card-base p-6 bg-brand-primary text-white border-none shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <h3 className="font-bold text-lg">Knowledge Hub</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Review our latest enterprise HR guidelines for 2026. Includes updated compliance and tax templates.
              </p>
              <button className="px-4 py-2 bg-white text-brand-primary rounded-lg text-xs font-bold hover:bg-surface-hover transition-colors">
                Read Documentation
              </button>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </section>
        </div>
      </div>
    </div>
  );
}
