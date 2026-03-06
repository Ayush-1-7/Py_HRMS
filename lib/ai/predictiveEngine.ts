/* ══════════════════════════════════════════════════════════
   Predictive Intelligence Engine
   Phase 5: Forecasting, growth projection, & risk scoring.
   This uses deterministic logic over historical data.
   ══════════════════════════════════════════════════════════ */

import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import type { PredictiveMetrics } from "./types";

export async function computePredictiveMetrics(): Promise<PredictiveMetrics> {
    await connectDB();

    const now = new Date();
    const metrics: PredictiveMetrics = {
        attendanceTrendSlope: 0,
        payrollBurnRateNextMonth: 0,
        departmentHealthIndex: {},
        projectedAttritionCount: 0,
    };

    try {
        // ── 1. Attendance Trend Slope (Linear regression heuristic) ──
        // Compare last 7 days vs previous 7 days
        const d7 = new Date(now.getTime() - 7 * 86400000);
        const d14 = new Date(now.getTime() - 14 * 86400000);

        const recentAtt = await Attendance.aggregate([
            { $match: { date: { $gte: d7, $lte: now } } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        const prevAtt = await Attendance.aggregate([
            { $match: { date: { $gte: d14, $lt: d7 } } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const recentPresent = recentAtt.find(x => x._id === "present")?.count || 0;
        const prevPresent = prevAtt.find(x => x._id === "present")?.count || 0;

        // Slope = (y2 - y1) / x. Positive means improving attendance.
        const slope = prevPresent > 0 ? ((recentPresent - prevPresent) / prevPresent) * 100 : 0;
        metrics.attendanceTrendSlope = Math.round(slope * 10) / 10;

        // ── 2. Payroll Burn Rate Projection ──
        // Assuming current active employees + average monthly growth
        const currentPayrollResult = await Employee.aggregate([
            { $match: { status: "active", salary: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: "$salary" } } }
        ]);
        const currentPayroll = currentPayrollResult[0]?.total || 0;

        // Growth rate: joining in last 90 days / 3
        const d90 = new Date(now.getTime() - 90 * 86400000);
        const newJoined = await Employee.countDocuments({ joiningDate: { $gte: d90 } });
        const avgGrowthPerMonth = newJoined / 3;
        const avgSalaryResult = await Employee.aggregate([
            { $match: { status: "active", salary: { $gt: 0 } } },
            { $group: { _id: null, avg: { $avg: "$salary" } } }
        ]);
        const avgSalary = avgSalaryResult[0]?.avg || 0;

        // Predicted burn rate for next month = current + (projected new hires * avg salary)
        metrics.payrollBurnRateNextMonth = currentPayroll + (avgGrowthPerMonth * avgSalary);

        // ── 3. Department Health Index ──
        // Health = 100 - (absenteeism rate proxy)
        const d30 = new Date(now.getTime() - 30 * 86400000);
        const depAbsenteeism = await Attendance.aggregate([
            { $match: { date: { $gte: d30 }, status: "absent" } },
            { $lookup: { from: "employees", localField: "employee", foreignField: "_id", as: "emp" } },
            { $unwind: "$emp" },
            { $group: { _id: "$emp.department", absentPnts: { $sum: 1 } } }
        ]);

        const depHeadcounts = await Employee.aggregate([
            { $match: { status: "active" } },
            { $group: { _id: "$department", count: { $sum: 1 } } }
        ]);

        const health: Record<string, number> = {};
        for (const hc of depHeadcounts) {
            const dept = hc._id;
            const headcount = hc.count || 1;
            const absences = depAbsenteeism.find(a => a._id === dept)?.absentPnts || 0;
            // Max expected working days ~22. If avg absence per employee is 0, health is 100.
            // If avg absence is 4 days, penalty is ~18%.
            const avgAbsence = absences / headcount;
            const index = Math.max(0, 100 - (avgAbsence * 4.5)); // heuristic multiplier
            health[dept] = Math.min(100, Math.round(index));
        }
        metrics.departmentHealthIndex = health;

        // ── 4. Attrition Risk (Projected Count) ──
        // Heuristic: Absent > 4 times in 30 days -> 30% prob. Absent > 6 -> 70% prob.
        const riskAgg = await Attendance.aggregate([
            { $match: { date: { $gte: d30 }, status: "absent" } },
            { $group: { _id: "$employee", count: { $sum: 1 } } }
        ]);

        let projectedAttrition = 0;
        for (const r of riskAgg) {
            if (r.count > 6) projectedAttrition += 0.7;
            else if (r.count > 4) projectedAttrition += 0.3;
        }
        metrics.projectedAttritionCount = Math.round(projectedAttrition * 10) / 10;

    } catch (e) {
        console.error("[PredictiveEngine] Error computing metrics:", e);
    }

    return metrics;
}
