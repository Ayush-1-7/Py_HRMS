/* ══════════════════════════════════════════════════════════
   AI Engine — Main Orchestrator
   Natural language → Intent classification → Query → Response
   ══════════════════════════════════════════════════════════ */

import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import type { AIIntent, AIContext, AIResponse, AIAction, AIMessage } from "./types";
import {
    parseDateExpression,
    extractDepartment,
    extractStatus,
    extractAttendanceStatus,
    extractLimit,
    buildEmployeeMatch,
} from "./queryBuilder";
import { processAdvancedQuery } from "./reasoningEngine";
import { computePredictiveMetrics } from "./predictiveEngine";
import { orchestrateQuery } from "./orchestrator";
import { formatAIResponse } from "./responseFormatter";

/* ── Intent Classification ──────────────────────────────── */

function classifyIntent(message: string, context?: AIContext): AIIntent {
    const lower = message.toLowerCase().trim();
    const intent: AIIntent = {
        type: "UNKNOWN",
        entity: "general",
        filters: {},
        rawQuery: message,
    };

    // Extract contextual info
    intent.department = extractDepartment(message) || context?.department || undefined;
    intent.status = extractStatus(message) || undefined;
    intent.dateRange = parseDateExpression(message) || context?.dateRange || undefined;
    intent.limit = extractLimit(message);

    // --- Greetings ---
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings)\b/i.test(lower)) {
        intent.type = "GREETING";
        return intent;
    }

    // --- Help ---
    if (/what can you do|help|capabilities|commands/i.test(lower)) {
        intent.type = "HELP";
        return intent;
    }

    // --- Simulation ---
    if (/what\s*if|simulate/i.test(lower)) {
        intent.type = "SIMULATION";
        return intent;
    }

    // --- Comparison ---
    if (/compare|versus|vs\.?|more\s+than|higher\s+than|earns\s+more/i.test(lower)) {
        intent.type = "COMPARISON";
        return intent;
    }

    // --- Predictive ---
    if (/predict|forecast|projection|burn rate|trend|health index|attrition risk/i.test(lower)) {
        intent.type = "PREDICTIVE";
        return intent;
    }

    // --- Action: Generate report ---
    if (/generate\s+(report|summary)|export\s+(report|data|payroll|attendance)/i.test(lower)) {
        intent.type = "ACTION";
        intent.actionType = "generate_report";
        if (lower.includes("payroll") || lower.includes("salary")) intent.entity = "payroll";
        else if (lower.includes("attendance")) intent.entity = "attendance";
        else intent.entity = "employee";
        return intent;
    }

    // --- Action: Draft email ---
    if (/draft\s+(email|notification|message|letter)|write\s+(email|notification)/i.test(lower)) {
        intent.type = "ACTION";
        intent.actionType = "draft_email";
        intent.entity = "general";
        return intent;
    }

    // --- Count queries ---
    if (/how\s+many|total\s+(?:number|count)|count\s+(?:of|the)/i.test(lower)) {
        intent.type = "COUNT";
        if (lower.includes("absent") || lower.includes("present") || lower.includes("attendance")) {
            intent.entity = "attendance";
        } else {
            intent.entity = "employee";
        }
        return intent;
    }

    // --- Insight / analytics ---
    if (/(?:which|what)\s+department|highest|lowest|top\s+\d+|average|trend|comparison/i.test(lower)) {
        intent.type = "INSIGHT";
        if (lower.includes("absent") || lower.includes("attendance")) intent.entity = "attendance";
        else if (lower.includes("salary") || lower.includes("paid") || lower.includes("payroll")) intent.entity = "payroll";
        else intent.entity = "employee";
        return intent;
    }

    // --- Summary queries ---
    if (/summary|overview|summarize|breakdown/i.test(lower)) {
        intent.type = "SUMMARY";
        if (lower.includes("payroll") || lower.includes("salary")) intent.entity = "payroll";
        else if (lower.includes("attendance")) intent.entity = "attendance";
        else intent.entity = "employee";
        return intent;
    }

    // --- List / Who queries ---
    if (/^(who|list|show|find|get|display|which employees)/i.test(lower) || lower.includes("absent") || lower.includes("present")) {
        intent.type = "LIST";
        if (lower.includes("absent") || lower.includes("present") || lower.includes("attendance") || lower.includes("unmarked")) {
            intent.entity = "attendance";
        } else if (lower.includes("salary") || lower.includes("payroll") || lower.includes("paid")) {
            intent.entity = "payroll";
        } else {
            intent.entity = "employee";
        }
        return intent;
    }

    // --- Schema / Field Inquiry ---
    if (/fields|schema|columns|tables|available\s+data/i.test(lower)) {
        intent.type = "SCHEMA";
        return intent;
    }

    // --- Leave Queries ---
    if (/leaves?|sick\s+leave|casual\s+leave|paid\s+leave|time\s+off/i.test(lower)) {
        intent.type = "LEAVE";
        intent.entity = "attendance";
        return intent;
    }

    // --- Analytics / Distribution ---
    if (/breakdown|distribution|workforce|analytics|trends/i.test(lower)) {
        intent.type = "ANALYTICS";
        if (lower.includes("salary") || lower.includes("payroll")) intent.entity = "payroll";
        else if (lower.includes("attendance")) intent.entity = "attendance";
        else intent.entity = "employee";
        return intent;
    }

    // --- Insight / Salary Details ---
    if (/(?:which|what)\s+department|highest|lowest|top\s+\d+|average|trend|comparison|salary|payroll|paid/i.test(lower)) {
        intent.type = "INSIGHT";
        if (lower.includes("absent") || lower.includes("attendance")) intent.entity = "attendance";
        else if (lower.includes("salary") || lower.includes("paid") || lower.includes("payroll")) intent.entity = "payroll";
        else intent.entity = "employee";
        return intent;
    }

    return intent;
}

/* ── Response Generators ────────────────────────────────── */

async function handleGreeting(): Promise<AIResponse> {
    return {
        message: "Hello! 👋 I'm your **HR Intelligence Assistant**. I can help you with employee information, attendance, payroll insights, and workforce analytics.",
        type: "text",
        suggestions: {
            insights: ["Show workforce distribution", "Analyze salary benchmarks"],
            actions: ["Generate workforce report", "Export employee data"],
            questions: ["Who is employee id 1?", "Who joined last?", "Who was absent today?", "Who has perfect attendance?"]
        }
    };
}

async function handleHelp(): Promise<AIResponse> {
    return {
        message: "🤖 **HR Copilot Capabilities**\n\n" +
            "| Category | Example Queries |\n" +
            "|----------|----------------|\n" +
            "| **Count** | \"How many employees joined this month?\" |\n" +
            "| **List** | \"Who was absent yesterday?\" |\n" +
            "| **Summary** | \"Show attendance summary for this week\" |\n" +
            "| **Insights** | \"Top 5 highest paid employees\" |\n" +
            "| **Reports** | \"Generate payroll report for Engineering\" |\n" +
            "| **Drafts** | \"Draft email to absent employees\" |\n" +
            "| **Filters** | \"Show employees in Finance department\" |\n\n" +
            "💡 I understand natural dates like *today*, *yesterday*, *this week*, *last 7 days*, and specific months.",
        type: "text",
    };
}

async function handleCount(intent: AIIntent): Promise<AIResponse> {
    await connectDB();

    if (intent.entity === "attendance") {
        const attStatus = extractAttendanceStatus(intent.rawQuery);
        const dateRange = intent.dateRange || { from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

        const dateMatch: Record<string, unknown> = {
            date: {
                $gte: new Date(dateRange.from),
                $lte: new Date(dateRange.to + "T23:59:59Z"),
            },
        };

        if (attStatus) {
            dateMatch.status = attStatus;
        }

        const count = await Attendance.countDocuments(dateMatch);
        const statusLabel = attStatus || "total attendance";
        const dateLabel = formatDateRange(dateRange);

        return {
            message: `📊 **${count}** ${statusLabel} records found for **${dateLabel}**.`,
            type: "text",
            data: { count, status: attStatus, dateRange },
        };
    }

    // Employee count
    const match = buildEmployeeMatch(intent);
    const count = await Employee.countDocuments(match);

    let desc = `**${count}** employees`;
    if (intent.department) desc += ` in **${intent.department}**`;
    if (intent.status) desc += ` with status **${intent.status}**`;
    if (intent.dateRange && intent.rawQuery.toLowerCase().includes("join")) {
        desc += ` who joined during **${formatDateRange(intent.dateRange)}**`;
    }

    return {
        message: `📊 ${desc} found.`,
        type: "text",
        data: { count, filters: match },
    };
}

async function handleList(intent: AIIntent): Promise<AIResponse> {
    await connectDB();

    if (intent.entity === "attendance") {
        const attStatus = extractAttendanceStatus(intent.rawQuery);
        const dateRange = intent.dateRange || { from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
        const limit = intent.limit || 20;

        const dateMatch: Record<string, unknown> = {
            date: {
                $gte: new Date(dateRange.from),
                $lte: new Date(dateRange.to + "T23:59:59Z"),
            },
        };
        if (attStatus) dateMatch.status = attStatus;

        const records = await Attendance.find(dateMatch)
            .populate("employee", "name employeeId department designation")
            .limit(limit)
            .lean();

        if (records.length === 0) {
            return {
                message: `No ${attStatus || "attendance"} records found for **${formatDateRange(dateRange)}**.`,
                type: "text",
            };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines = (records as any[]).map((r) => {
            const emp = r.employee;
            const name = emp ? emp.name : "Unknown";
            const dept = emp ? emp.department : "";
            return `- **${name}** (${dept}) — ${(r.status || "").toUpperCase()}`;
        });

        return {
            message: `📋 **${records.length}** ${attStatus || "attendance"} records for **${formatDateRange(dateRange)}**:\n\n${lines.join("\n")}`,
            type: "table",
            data: records,
        };
    }

    // Employee list
    if (intent.entity === "payroll") {
        const match = buildEmployeeMatch(intent);
        const sortDir = intent.rawQuery.toLowerCase().includes("lowest") ? 1 : -1;
        const limit = intent.limit || 10;

        const employees = await Employee.find(match)
            .sort({ salary: sortDir })
            .limit(limit)
            .select("name employeeId department designation salary")
            .lean();

        if (employees.length === 0) {
            return { message: "No employees found matching your criteria.", type: "text" };
        }

        const lines = employees.map((e, i) =>
            `${i + 1}. **${e.name}** — ${e.department} — ₹${(e.salary || 0).toLocaleString("en-IN")}`
        );

        const label = sortDir === -1 ? "highest" : "lowest";
        return {
            message: `💰 **Top ${employees.length} ${label} paid employees${intent.department ? ` in ${intent.department}` : ""}:**\n\n${lines.join("\n")}`,
            type: "table",
            data: employees,
        };
    }

    // Generic employee list
    const match = buildEmployeeMatch(intent);
    const limit = intent.limit || 15;

    const employees = await Employee.find(match)
        .sort({ id: 1 })
        .limit(limit)
        .select("name employeeId department designation status joiningDate")
        .lean();

    if (employees.length === 0) {
        return { message: "No employees found matching your query.", type: "text" };
    }

    const lines = employees.map((e) =>
        `- **${e.name}** (${e.employeeId}) — ${e.department} • ${e.designation}`
    );

    let header = `👥 **${employees.length} employees**`;
    if (intent.department) header += ` in **${intent.department}**`;

    return {
        message: `${header}:\n\n${lines.join("\n")}`,
        type: "table",
        data: employees,
    };
}

async function handleSummary(intent: AIIntent): Promise<AIResponse> {
    await connectDB();

    if (intent.entity === "attendance") {
        const dateRange = intent.dateRange || { from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
        const dateMatch: Record<string, unknown> = {
            date: {
                $gte: new Date(dateRange.from),
                $lte: new Date(dateRange.to + "T23:59:59Z"),
            },
        };

        const summary = await Attendance.aggregate([
            { $match: dateMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const stats = Object.fromEntries(summary.map(s => [s._id, s.count]));
        const total = Object.values(stats).reduce((a: number, b: unknown) => a + (b as number), 0);

        return {
            message: `📅 **Attendance Summary** for **${formatDateRange(dateRange)}**:\n\n` +
                `| Status | Count | % |\n|--------|-------|---|\n` +
                Object.entries(stats).map(([status, count]) =>
                    `| ${(status as string).charAt(0).toUpperCase() + (status as string).slice(1)} | ${count} | ${Math.round(((count as number) / total) * 100)}% |`
                ).join("\n") +
                `\n\n**Total records:** ${total}`,
            type: "table",
            data: stats,
        };
    }

    if (intent.entity === "payroll") {
        const match = buildEmployeeMatch(intent);

        const result = await Employee.aggregate([
            { $match: { ...match, salary: { $exists: true, $gt: 0 } } },
            {
                $group: {
                    _id: intent.department ? null : "$department",
                    totalPayroll: { $sum: "$salary" },
                    avgSalary: { $avg: "$salary" },
                    minSalary: { $min: "$salary" },
                    maxSalary: { $max: "$salary" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { totalPayroll: -1 } },
        ]);

        if (result.length === 0) {
            return { message: "No payroll data found.", type: "text" };
        }

        const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

        if (intent.department || result.length === 1) {
            const r = result[0];
            return {
                message: `💰 **Payroll Summary${intent.department ? ` — ${intent.department}` : ""}**:\n\n` +
                    `| Metric | Value |\n|--------|-------|\n` +
                    `| Employees | ${r.count} |\n` +
                    `| Total Payroll | ${fmt(r.totalPayroll)} |\n` +
                    `| Average Salary | ${fmt(r.avgSalary)} |\n` +
                    `| Min Salary | ${fmt(r.minSalary)} |\n` +
                    `| Max Salary | ${fmt(r.maxSalary)} |`,
                type: "table",
                data: r,
            };
        }

        const lines = result.map(r =>
            `| ${r._id} | ${r.count} | ${fmt(r.totalPayroll)} | ${fmt(r.avgSalary)} |`
        );

        return {
            message: `💰 **Payroll Summary by Department**:\n\n` +
                `| Department | Staff | Total Payroll | Avg Salary |\n|------------|-------|---------------|------------|\n` +
                lines.join("\n"),
            type: "table",
            data: result,
        };
    }

    // General employee summary
    const total = await Employee.countDocuments();
    const byDept = await Employee.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    const byStatus = await Employee.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const deptLines = byDept.map(d => `| ${d._id} | ${d.count} |`).join("\n");
    const statusLines = byStatus.map(s => `| ${s._id} | ${s.count} |`).join("\n");

    return {
        message: `👥 **Workforce Summary**\n\n**Total Employees:** ${total}\n\n` +
            `**By Department:**\n| Department | Count |\n|------------|-------|\n${deptLines}\n\n` +
            `**By Status:**\n| Status | Count |\n|--------|-------|\n${statusLines}`,
        type: "table",
        data: { total, byDept, byStatus },
    };
}

async function handleInsight(intent: AIIntent): Promise<AIResponse> {
    await connectDB();

    const lower = intent.rawQuery.toLowerCase();

    // Department with highest absenteeism
    if (lower.includes("absenteeism") || (lower.includes("absent") && lower.includes("department"))) {
        const dateRange = intent.dateRange || { from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

        const result = await Attendance.aggregate([
            {
                $match: {
                    status: "absent",
                    date: { $gte: new Date(dateRange.from), $lte: new Date(dateRange.to + "T23:59:59Z") },
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

        if (result.length === 0) {
            return { message: "No absenteeism data found for the given period.", type: "text" };
        }

        const lines = result.map((r, i) => `${i + 1}. **${r._id}** — ${r.absentCount} absences`);

        return {
            message: `📉 **Department Absenteeism Ranking** (${formatDateRange(dateRange)}):\n\n${lines.join("\n")}\n\n🏢 **${result[0]._id}** has the highest absenteeism with **${result[0].absentCount}** absent records.`,
            type: "table",
            data: result,
        };
    }

    // Top N highest/lowest paid
    if (lower.includes("paid") || lower.includes("salary") || lower.includes("earning")) {
        const sortDir = lower.includes("lowest") ? 1 : -1;
        const limit = intent.limit || 5;
        const match = intent.department ? { department: intent.department, salary: { $gt: 0 } } : { salary: { $gt: 0 } };

        const employees = await Employee.find(match)
            .sort({ salary: sortDir })
            .limit(limit)
            .select("name department salary employeeId")
            .lean();

        const label = sortDir === -1 ? "highest" : "lowest";
        const lines = employees.map((e, i) =>
            `${i + 1}. **${e.name}** — ${e.department} — ₹${(e.salary || 0).toLocaleString("en-IN")}`
        );

        return {
            message: `💰 **Top ${limit} ${label} paid employees:**\n\n${lines.join("\n")}`,
            type: "table",
            data: employees,
        };
    }

    // Average attendance
    if (lower.includes("average") && lower.includes("attendance")) {
        const dateRange = intent.dateRange || { from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
        const totalEmployees = await Employee.countDocuments({ status: "active" });
        const presentCount = await Attendance.countDocuments({
            status: "present",
            date: { $gte: new Date(dateRange.from), $lte: new Date(dateRange.to + "T23:59:59Z") },
        });

        const days = Math.max(1, Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / 86400000) + 1);
        const expectedTotal = totalEmployees * days;
        const avgRate = expectedTotal > 0 ? Math.round((presentCount / expectedTotal) * 100) : 0;

        return {
            message: `📊 **Average Attendance Rate** for **${formatDateRange(dateRange)}**:\n\n` +
                `- **Rate:** ${avgRate}%\n` +
                `- **Present records:** ${presentCount} / ${expectedTotal} expected\n` +
                `- **Active employees:** ${totalEmployees}\n` +
                `- **Days in range:** ${days}`,
            type: "text",
            data: { avgRate, presentCount, expectedTotal, totalEmployees, days },
        };
    }

    return {
        message: "🔎 I wasn't able to extract a specific insight from your query. Try asking:\n\n" +
            "- \"Which department has highest absenteeism?\"\n" +
            "- \"Top 5 highest paid employees\"\n" +
            "- \"Average attendance this week\"",
        type: "text",
    };
}

async function handleAction(intent: AIIntent): Promise<AIResponse> {
    const actions: AIAction[] = [];

    if (intent.actionType === "generate_report") {
        const dateRange = intent.dateRange || { from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

        actions.push({
            id: `report_${Date.now()}`,
            type: "generate_report",
            label: `Generate ${intent.entity} report`,
            description: `Generate a ${intent.entity} report${intent.department ? ` for ${intent.department}` : ""} covering ${formatDateRange(dateRange)}.`,
            params: {
                entity: intent.entity,
                department: intent.department,
                dateRange,
            },
            requiresConfirmation: true,
            status: "pending",
        });

        return {
            message: `📝 I can generate that report for you. Here's what I'll create:\n\n` +
                `- **Type:** ${intent.entity.charAt(0).toUpperCase() + intent.entity.slice(1)} Report\n` +
                `- **Period:** ${formatDateRange(dateRange)}\n` +
                (intent.department ? `- **Department:** ${intent.department}\n` : "") +
                `\nClick **Confirm** below to proceed.`,
            type: "action_prompt",
            actions,
        };
    }

    if (intent.actionType === "draft_email") {
        const attStatus = extractAttendanceStatus(intent.rawQuery);

        actions.push({
            id: `email_${Date.now()}`,
            type: "draft_email",
            label: "Draft HR Communication",
            description: `Draft an email${attStatus ? ` regarding ${attStatus} employees` : ""}.`,
            params: { status: attStatus, rawQuery: intent.rawQuery },
            requiresConfirmation: true,
            status: "pending",
        });

        return {
            message: `✉️ I'll draft that communication for you. Click **Confirm** to generate the email draft.`,
            type: "action_prompt",
            actions,
        };
    }

    return {
        message: "I can help with actions like generating reports and drafting emails. What would you like to do?",
        type: "text",
    };
}

function handleUnknown(): AIResponse {
    return {
        message: "🤔 I'm not sure I understood that. Here are some things you can ask me:\n\n" +
            "- **\"How many employees are in Engineering?\"**\n" +
            "- **\"Who was absent yesterday?\"**\n" +
            "- **\"Show payroll summary for Finance\"**\n" +
            "- **\"Top 5 highest paid employees\"**\n" +
            "- **\"Generate attendance report for last 7 days\"**\n\n" +
            "💡 Tip: I understand natural dates, department names, and employee statuses.",
        type: "text",
    };
}

/* ── Date formatting helper ──────────────────────────────── */
function formatDateRange(range: { from: string; to: string }): string {
    if (range.from === range.to) {
        return new Date(range.from).toLocaleDateString("en-IN", { dateStyle: "medium" });
    }
    const from = new Date(range.from).toLocaleDateString("en-IN", { dateStyle: "medium" });
    const to = new Date(range.to).toLocaleDateString("en-IN", { dateStyle: "medium" });
    return `${from} — ${to}`;
}

/* ── Main Entry Point ────────────────────────────────────── */
export async function processMessage(
    message: string,
    context?: AIContext,
    _history?: AIMessage[]
): Promise<AIResponse> {
    try {
        // --- Context Reconstruction from History ---
        if (!context?.lastEmployeeMentioned && _history && _history.length > 0) {
            // Find the last assistant message with employee details
            for (let i = _history.length - 1; i >= 0; i--) {
                const msg = _history[i];
                if (msg.role === "assistant" && msg.content.includes("Employee ID:")) {
                    const match = msg.content.match(/(.+)\s\(Employee ID:\s(\d+)\)/);
                    if (match) {
                        context = {
                            ...context,
                            lastEmployeeMentioned: {
                                name: match[1].replace(/#+\s/, "").trim(),
                                id: parseInt(match[2])
                            }
                        };
                        break;
                    }
                }
            }
        }

        const intent = classifyIntent(message, context);
        intent.rawQuery = message; // Ensure raw query is preserved

        // --- Production Orchestrator (Full DB Awareness) ---
        const orchestratedResult = await orchestrateQuery(intent, context);
        if (orchestratedResult.message !== "Passing to base handler...") {
            return orchestratedResult;
        }

        // Fallback to legacy count for consistency if orchestrator missed it
        if (intent.type === "COUNT") {
            return handleCount(intent);
        }

        switch (intent.type as any) {
            case "GREETING":
                return handleGreeting();
            case "HELP":
                return handleHelp();
            case "PREDICTIVE":
                const pm = await computePredictiveMetrics();
                return {
                    message: `📈 **Predictive Intelligence Metrics**:\n\n` +
                        `- **Attendance Trend:** ${pm.attendanceTrendSlope > 0 ? '+' : ''}${pm.attendanceTrendSlope}% (last 7 vs previous 7 days)\n` +
                        `- **Projected Payroll Burn (Next Mo):** ₹${Math.round(pm.payrollBurnRateNextMonth).toLocaleString("en-IN")}\n` +
                        `- **Projected Attrition Risks:** ${pm.projectedAttritionCount} employees\n`,
                    type: "text",
                    data: pm,
                    explanation: "This uses deterministic historical trend slopes over the last 14-30-90 days combined with active base multipliers to project near-term trajectory without external AI hallucinations."
                };
            case "COUNT":
                return handleCount(intent);
            case "LIST":
                return handleList(intent);
            case "SUMMARY":
                return handleSummary(intent);
            case "INSIGHT":
                return handleInsight(intent);
            case "ACTION":
                return handleAction(intent);
            case "FILTER":
                return handleList(intent); // Reuse list with filters
            default:
                return handleUnknown();
        }
    } catch (error) {
        console.error("[AI Engine Error]", error);
        return {
            message: "⚠️ I encountered an error while processing your request. Please try again or rephrase your question.",
            type: "text",
        };
    }
}
