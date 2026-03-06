/* ══════════════════════════════════════════════════════════
   Advanced Reasoning Engine
   Phase 2: Multi-step execution & explainability
   ══════════════════════════════════════════════════════════ */

import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import type { AIIntent, AIResponse, ReasoningStep } from "./types";
import { simulateScenario } from "./simulationEngine";
import { buildEmployeeMatch } from "./queryBuilder";

export async function processAdvancedQuery(intent: AIIntent): Promise<AIResponse> {
    const trace: ReasoningStep[] = [];
    const lower = intent.rawQuery.toLowerCase();

    // ── 1. Scenarios (What-if) ──
    if (intent.type === "SIMULATION") {
        const sim = await simulateScenario(intent.rawQuery, trace);
        if (sim) {
            return {
                message: `🔮 **Simulation Complete:** ${sim.scenario}\n\n${sim.impactSummary}`,
                type: "simulation",
                data: sim,
                reasoningTrace: trace,
                explanation: "I extracted the numeric modifiers from your query, fetched current real-time payroll/headcount data, applied the mathematical adjustment, and computed the delta."
            };
        }
        return { message: "I couldn't parse the exact parameters for this simulation.", type: "text" };
    }

    // ── 2. Comparisons ──
    if (intent.type === "COMPARISON") {
        await connectDB();
        trace.push({ step: "Entity Extraction", action: "Identify entities to compare", result: "Searching for 'vs' or 'compare'" });

        let dept1 = "", dept2 = "";
        const depts = ["engineering", "marketing", "finance", "sales", "hr", "operations", "design"];

        for (const d of depts) {
            const index = lower.indexOf(d);
            if (index !== -1) {
                if (!dept1) dept1 = d;
                else if (!dept2) dept2 = d;
            }
        }

        if (dept1 && dept2) {
            trace.push({ step: "Data Fetching", action: `Aggregating metrics for ${dept1} and ${dept2}`, result: "Fetched payroll and headcount." });

            const agg = await Employee.aggregate([
                { $match: { department: { $in: [new RegExp(dept1, 'i'), new RegExp(dept2, 'i')] }, status: "active" } },
                { $group: { _id: { $toLower: "$department" }, avgSalary: { $avg: "$salary" }, count: { $sum: 1 } } }
            ]);

            const stat1 = agg.find(x => x._id.includes(dept1)) || { avgSalary: 0, count: 0 };
            const stat2 = agg.find(x => x._id.includes(dept2)) || { avgSalary: 0, count: 0 };

            trace.push({ step: "Reasoning", action: "Computing variance", result: "Calculated differences." });

            const diff = (stat1.avgSalary || 0) - (stat2.avgSalary || 0);
            const winner = diff > 0 ? dept1 : dept2;

            return {
                message: `📊 **Comparison: ${dept1.toUpperCase()} vs ${dept2.toUpperCase()}**\n\n` +
                    `| Metric | ${dept1.toUpperCase()} | ${dept2.toUpperCase()} |\n` +
                    `|--------|---|---|\n` +
                    `| Headcount | ${stat1.count || 0} | ${stat2.count || 0} |\n` +
                    `| Avg Salary | ₹${Math.round(stat1.avgSalary || 0).toLocaleString()} | ₹${Math.round(stat2.avgSalary || 0).toLocaleString()} |`,
                type: "table",
                data: agg,
                reasoningTrace: trace,
                explanation: `I grouped active employees by both ${dept1} and ${dept2}, computed the mathematical average of their salaries, and counted headcount.`
            };
        }
    }

    // ── 3. Multi-condition Complex Listing ──
    // e.g. "employees in Marketing hired after Jan 2024 earning above department average"
    trace.push({ step: "Intent Parsing", action: "Parsing complex conditions", result: "Identified multi-step filters (date, salary avg)." });
    await connectDB();

    // Step 1: Base match (dept, join date)
    const match = buildEmployeeMatch(intent);

    // Step 2: Check for "above average" salary condition
    if (lower.includes("above") && lower.includes("average") && lower.includes("salary")) {
        trace.push({ step: "Sub-query", action: "Compute average salary", result: "Fetching total avg salary." });
        const avgAgg = await Employee.aggregate([
            { $match: match.department ? { department: match.department, status: "active" } : { status: "active" } },
            { $group: { _id: null, avg: { $avg: "$salary" } } }
        ]);
        const avg = avgAgg[0]?.avg || 0;
        match.salary = { $gt: avg };
        trace[trace.length - 1].result += ` (Avg: ₹${Math.round(avg).toLocaleString()})`;
    }

    // Step 3: Check for "absent more than N" condition
    const absentMatch = lower.match(/absent.*>|more than\s*(\d+)/);
    if (absentMatch && absentMatch[1]) {
        const threshold = parseInt(absentMatch[1]);
        trace.push({ step: "Sub-query", action: `Compute absentees > ${threshold} times`, result: "Fetching attendance history." });

        const d30 = new Date(Date.now() - 30 * 86400000);
        const badAtt = await Attendance.aggregate([
            { $match: { date: { $gte: d30 }, status: "absent" } },
            { $group: { _id: "$employee", count: { $sum: 1 } } },
            { $match: { count: { $gt: threshold } } }
        ]);
        const empIds = badAtt.map(a => a._id);
        match._id = { $in: empIds };
    }

    trace.push({ step: "Final Query", action: "Executing final aggregated match", result: "Fetched matching employees." });

    const results = await Employee.find(match)
        .select("name employeeId department designation salary")
        .limit(20)
        .lean();

    const lines = results.map(r => `- **${r.name}** (${r.department}) — ₹${(r.salary || 0).toLocaleString()}`);

    return {
        message: `🔎 Found **${results.length}** employees matching those complex criteria:\n\n${lines.join("\n")}`,
        type: "table",
        data: results,
        reasoningTrace: trace,
        explanation: "I first parsed the base filtering constraints (department, dates). Then I ran isolated sub-queries to compute mathematical averages, compared individual records against that average, and joined the results with attendance occurrence counts."
    };
}
