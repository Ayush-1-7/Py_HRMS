/* ══════════════════════════════════════════════════════════
   Scenario Simulation Engine (What-If Modeling)
   Phase 3: Safely models "What if X changes by Y?"
   ══════════════════════════════════════════════════════════ */

import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import type { SimulationResult, ReasoningStep } from "./types";
import { extractDepartment } from "./queryBuilder";

/** Simulate scenarios based on natural language queries */
export async function simulateScenario(query: string, trace: ReasoningStep[] = []): Promise<SimulationResult | null> {
    await connectDB();
    const lower = query.toLowerCase();

    trace.push({
        step: "Scenario Identification",
        action: "Parsing 'what-if' modifiers (increase/decrease, salary/absenteeism/headcount)",
        result: ""
    });

    // Extract numbers (e.g. "10%" -> 10, "5 employees" -> 5)
    // Supports: "5 new engineers", "10% increase", "increase by 5%"
    const numMatch = query.match(/(\d+)(?:\s*(?:%|new|additional|more|employees?|engineers?|analysts?))?/i);
    const amount = numMatch ? parseFloat(numMatch[1]) : 0;

    const isIncrease = /increase|add|hire|raise/i.test(lower);
    const isDecrease = /decrease|remove|fire|resign|reduce/i.test(lower);
    const sign = isDecrease ? -1 : 1;
    const isPercentage = lower.includes("%");

    const dept = extractDepartment(query);
    const isSalary = lower.includes("salar") || lower.includes("pay");

    // ── Scenario 1: Salary changes ──
    if (isSalary) {
        trace[trace.length - 1].result = "Identified Salary scenario.";

        const match = dept ? { department: dept, status: "active", salary: { $gt: 0 } } : { status: "active", salary: { $gt: 0 } };

        trace.push({ step: "Data Fetching", action: "Aggregating current payroll", result: "Fetching real salary data." });
        const agg = await Employee.aggregate([
            { $match: match },
            { $group: { _id: null, total: { $sum: "$salary" }, count: { $sum: 1 } } }
        ]);

        const currentPayroll = agg[0]?.total || 0;
        const headcount = agg[0]?.count || 0;

        trace.push({ step: "Simulation Calculation", action: `Applying ${sign * amount}${isPercentage ? '%' : ' flat'} adjustment`, result: "Calculated projected payroll." });

        let projectedPayroll = currentPayroll;
        if (isPercentage) {
            projectedPayroll = currentPayroll * (1 + (sign * amount / 100));
        } else {
            projectedPayroll = currentPayroll + (sign * amount * headcount);
        }

        const diff = projectedPayroll - currentPayroll;
        const diffStr = diff > 0 ? `+₹${diff.toLocaleString()}` : `-₹${Math.abs(diff).toLocaleString()}`;

        return {
            scenario: `Salary adjustment of ${isIncrease ? '+' : '-'}${amount}${isPercentage ? '%' : ' flat'}${dept ? ` for ${dept}` : ''}`,
            parameters: { adjustmentAmount: sign * amount, isPercentage: isPercentage ? 1 : 0 },
            currentMetrics: {
                "Total Payroll": `₹${currentPayroll.toLocaleString()}`,
                "Headcount": headcount
            },
            projectedMetrics: {
                "Projected Payroll": `₹${Math.round(projectedPayroll).toLocaleString()}`
            },
            impactSummary: `This scenario would result in a monthly payroll change of ${diffStr}. Annualized impact: ${(diff * 12).toLocaleString()}.`
        };
    }

    // ── Scenario 2: Headcount changes ──
    const isHeadcount = /hire|hiring|resign|redundancy|add\s+employee|new\s+employee|engineers?|analysts?|staff/i.test(lower);
    if (isHeadcount && !isSalary) {
        trace[trace.length - 1].result = "Identified Headcount scenario.";
        const match = dept ? { department: dept, status: "active", salary: { $gt: 0 } } : { status: "active", salary: { $gt: 0 } };

        trace.push({ step: "Data Fetching", action: "Aggregating current headcount and avg salary", result: "Fetching real workforce constraints." });
        const agg = await Employee.aggregate([
            { $match: match },
            { $group: { _id: null, total: { $sum: "$salary" }, count: { $sum: 1 }, avg: { $avg: "$salary" } } }
        ]);

        const currentPayroll = agg[0]?.total || 0;
        const currentCount = agg[0]?.count || 0;
        const avgSalary = agg[0]?.avg || 0;

        const changeCount = sign * amount;
        const projectedCount = Math.max(0, currentCount + changeCount);
        const projectedPayroll = currentPayroll + (changeCount * avgSalary);

        trace.push({ step: "Simulation Calculation", action: `Adding ${changeCount} headcount at average salary ₹${Math.round(avgSalary).toLocaleString()}`, result: "Computed projected costs." });

        const diff = projectedPayroll - currentPayroll;

        return {
            scenario: `Headcount change of ${isIncrease ? '+' : ''}${changeCount} employees${dept ? ` in ${dept}` : ''}`,
            parameters: { headcountChange: changeCount },
            currentMetrics: {
                "Headcount": currentCount,
                "Current Payroll": `₹${currentPayroll.toLocaleString()}`,
                "Avg Salary Basis": `₹${Math.round(avgSalary).toLocaleString()}`
            },
            projectedMetrics: {
                "Projected Headcount": projectedCount,
                "Projected Payroll": `₹${Math.max(0, projectedPayroll).toLocaleString()}`
            },
            impactSummary: `Changing headcount by ${changeCount} at the current average salary alters monthly payroll by ${diff > 0 ? '+' : ''}₹${Math.round(diff).toLocaleString()}.`
        };
    }

    // ── Scenario 3: Absenteeism changes ──
    if (lower.includes("absent")) {
        trace[trace.length - 1].result = "Identified Absenteeism scenario.";

        const now = new Date();
        const d30 = new Date(now.getTime() - 30 * 86400000);

        trace.push({ step: "Data Fetching", action: "Computing 30-day base absenteeism", result: "Fetched total baseline absences." });
        const absences = await Attendance.countDocuments({ date: { $gte: d30 }, status: "absent" });
        const presents = await Attendance.countDocuments({ date: { $gte: d30 }, status: "present" });

        const totalRecords = absences + presents;
        const currentRate = totalRecords > 0 ? (absences / totalRecords) * 100 : 0;

        const projectedRate = Math.max(0, currentRate + (sign * amount));
        const estimatedLostDaysMonthly = Math.round((projectedRate / 100) * totalRecords);
        const diffDays = estimatedLostDaysMonthly - absences;

        trace.push({ step: "Simulation Calculation", action: `Shifting absence rate from ${currentRate.toFixed(1)}% to ${projectedRate.toFixed(1)}%`, result: "Calculated lost productivity days." });

        return {
            scenario: `Absenteeism rate ${isIncrease ? 'increases' : 'decreases'} by ${amount}%`,
            parameters: { rateChange: sign * amount },
            currentMetrics: {
                "Current Absenteeism Rate": `${currentRate.toFixed(1)}%`,
                "Loss equivalents (days)": absences
            },
            projectedMetrics: {
                "Projected Rate": `${projectedRate.toFixed(1)}%`,
                "Projected Loss (days)": estimatedLostDaysMonthly
            },
            impactSummary: `A shift of ${sign * amount}% in absenteeism translates to ${diffDays > 0 ? '+' : ''}${diffDays} productive days lost per month across the workforce.`
        };
    }

    trace[trace.length - 1].result = "Failed to identify specific simulation type.";
    return null; // unsupported scenario
}
