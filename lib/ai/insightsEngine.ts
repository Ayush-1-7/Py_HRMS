/* ══════════════════════════════════════════════════════════
   AI Insights Engine — Dashboard-level computed insights
   ══════════════════════════════════════════════════════════ */

import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import type { InsightCard } from "./types";

/** Compute all dashboard insights from real data */
export async function computeInsights(): Promise<InsightCard[]> {
    await connectDB();
    const insights: InsightCard[] = [];
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // ── 1. Weekly Attendance Summary ───────────────────────
    try {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
        const weekStartStr = weekStart.toISOString().slice(0, 10);

        const totalActive = await Employee.countDocuments({ status: "active" });
        const weekAttendance = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: new Date(weekStartStr), $lte: new Date(today + "T23:59:59Z") },
                },
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const presentCount = weekAttendance.find(a => a._id === "present")?.count || 0;
        const absentCount = weekAttendance.find(a => a._id === "absent")?.count || 0;
        const daysSoFar = Math.max(1, Math.ceil((now.getTime() - weekStart.getTime()) / 86400000) + 1);
        const expectedRecords = totalActive * daysSoFar;
        const attendanceRate = expectedRecords > 0 ? Math.round((presentCount / expectedRecords) * 100) : 0;

        insights.push({
            id: "weekly_attendance",
            title: "Weekly Attendance Rate",
            value: `${attendanceRate}%`,
            description: `${presentCount} present records out of ${expectedRecords} expected this week`,
            trend: attendanceRate >= 80 ? "up" : attendanceRate >= 60 ? "stable" : "down",
            trendValue: `${absentCount} absences`,
            confidence: 90,
            category: "attendance",
            icon: "calendar",
            explanation: `This is calculated from ${daysSoFar} working days this week. ${totalActive} active employees × ${daysSoFar} days = ${expectedRecords} expected attendance records. ${presentCount} were marked present, giving a ${attendanceRate}% attendance rate.`,
        });
    } catch (e) { console.error("[Insight] Weekly attendance error:", e); }

    // ── 2. Department Absenteeism ──────────────────────────
    try {
        const last30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

        const deptAbsent = await Attendance.aggregate([
            {
                $match: {
                    status: "absent",
                    date: { $gte: new Date(last30), $lte: new Date(today + "T23:59:59Z") },
                },
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "emp",
                },
            },
            { $unwind: "$emp" },
            { $group: { _id: "$emp.department", absentCount: { $sum: 1 } } },
            { $sort: { absentCount: -1 } },
        ]);

        if (deptAbsent.length > 0) {
            const worst = deptAbsent[0];
            const best = deptAbsent[deptAbsent.length - 1];

            insights.push({
                id: "dept_absenteeism",
                title: "Department Health Signal",
                value: worst._id,
                description: `${worst._id} has the highest absenteeism (${worst.absentCount} absences in 30 days)`,
                trend: "down",
                trendValue: `${worst.absentCount} absences`,
                confidence: 85,
                category: "performance",
                icon: "alert",
                explanation: `Over the last 30 days, ${worst._id} logged ${worst.absentCount} absence records, the highest across all departments. ${best._id} had the lowest with ${best.absentCount}. Consider reviewing workload or team morale in ${worst._id}.`,
            });
        }
    } catch (e) { console.error("[Insight] Dept absenteeism error:", e); }

    // ── 3. Workforce Growth Signal ─────────────────────────
    try {
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const newThisMonth = await Employee.countDocuments({
            joiningDate: { $gte: new Date(thisMonth) },
        });
        const newLastMonth = await Employee.countDocuments({
            joiningDate: { $gte: lastMonth, $lte: lastMonthEnd },
        });

        const totalEmployees = await Employee.countDocuments();
        const growthTrend = newThisMonth >= newLastMonth ? "up" : "down";

        insights.push({
            id: "workforce_growth",
            title: "Workforce Growth",
            value: `${newThisMonth} new hires`,
            description: `${newThisMonth} employees joined this month vs ${newLastMonth} last month`,
            trend: growthTrend,
            trendValue: newThisMonth > newLastMonth ? `+${newThisMonth - newLastMonth}` : `${newThisMonth - newLastMonth}`,
            confidence: 95,
            category: "workforce",
            icon: "users",
            explanation: `Total workforce stands at ${totalEmployees}. ${newThisMonth} new employees joined this month compared to ${newLastMonth} last month. ${growthTrend === "up" ? "Hiring pace is increasing." : "Hiring has slowed compared to last month."}`,
        });
    } catch (e) { console.error("[Insight] Workforce growth error:", e); }

    // ── 4. Attrition Risk Heuristic ────────────────────────
    try {
        const last14 = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);

        const riskEmployees = await Attendance.aggregate([
            {
                $match: {
                    status: "absent",
                    date: { $gte: new Date(last14), $lte: new Date(today + "T23:59:59Z") },
                },
            },
            { $group: { _id: "$employee", absentCount: { $sum: 1 } } },
            { $match: { absentCount: { $gte: 3 } } },
            { $sort: { absentCount: -1 } },
        ]);

        const riskCount = riskEmployees.length;

        insights.push({
            id: "attrition_risk",
            title: "Attrition Risk Indicator",
            value: `${riskCount} employees`,
            description: `${riskCount} employees have 3+ absences in the last 14 days`,
            trend: riskCount > 3 ? "down" : riskCount > 0 ? "stable" : "up",
            trendValue: riskCount > 0 ? "Monitor closely" : "Healthy",
            confidence: 70,
            category: "risk",
            icon: "warning",
            explanation: `This heuristic flags employees with 3 or more absences in the last 14 days as potential attrition risks. Currently ${riskCount} employees meet this threshold. Note: This is a simple heuristic, not a predictive model. Consider reviewing these employees' situations personally.`,
        });
    } catch (e) { console.error("[Insight] Attrition risk error:", e); }

    return insights;
}
