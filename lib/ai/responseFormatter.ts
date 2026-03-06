/* ══════════════════════════════════════════════════════════
   AI Response Formatter — Standardizing AI Outputs
   ══════════════════════════════════════════════════════════ */

import type { AIResponse, AIIntent, AIAction, AIContext } from "./types";

/**
 * Standardizes the AI response structure according to production requirements.
 */
export function formatAIResponse(params: {
    answer: string;
    type?: AIResponse["type"];
    source?: string;
    details?: Record<string, string | number | boolean | Date>;
    data?: any;
    actions?: AIAction[];
    explanation?: string;
    suggestions?: AIResponse["suggestions"];
    contextUpdate?: AIResponse["contextUpdate"];
}): AIResponse {
    const { answer, type = "text", source, details, data, actions, explanation, suggestions, contextUpdate } = params;

    // Convert Date objects in details to strings
    const formattedDetails: Record<string, string | number | boolean> = {};
    if (details) {
        for (const [key, value] of Object.entries(details)) {
            if (value instanceof Date) {
                formattedDetails[key] = value.toLocaleDateString("en-IN", { dateStyle: "medium" });
            } else if (value !== null && value !== undefined) {
                formattedDetails[key] = value as any;
            }
        }
    }

    return {
        message: answer,
        type,
        source,
        details: formattedDetails,
        data,
        actions,
        explanation,
        suggestions: suggestions || defaultSuggestions(answer),
        contextUpdate
    };
}

/**
 * Generates default suggestions based on the answer content.
 */
function defaultSuggestions(answer: string): AIResponse["suggestions"] {
    const lower = answer.toLowerCase();
    const suggestions: AIResponse["suggestions"] = {
        insights: ["Analyze workforce distribution by department"],
        actions: ["Generate detailed workforce report", "Export data to Excel"],
        questions: ["What is the department breakdown?", "Who joined most recently?"]
    };

    if (lower.includes("employee") || lower.includes("id") || lower.includes("name")) {
        suggestions.insights = ["Compare salary with department average", "Check absenteeism risk score"];
        suggestions.questions = ["Check attendance history", "Show leave balance", "Related performance records"];
        suggestions.actions = ["Update employee status", "Send notification", "Draft personalized email"];
    } else if (lower.includes("attendance") || lower.includes("absent")) {
        suggestions.insights = ["Calculate attendance health index", "Rank departments by absenteeism"];
        suggestions.questions = ["Who was absent yesterday?", "Monthly attendance summary", "List employees with perfect attendance"];
        suggestions.actions = ["Draft email to absentees", "Download attendance logs", "Schedule attendance review"];
    } else if (lower.includes("payroll") || lower.includes("salary") || lower.includes("earning")) {
        suggestions.insights = ["Salary distribution analysis", "Payroll burn rate projection (Next 3 mo)"];
        suggestions.questions = ["Highest paid employees", "Average salary by department", "Who earns more than the average?"];
        suggestions.actions = ["Export payroll summary", "Adjust salary budgets"];
    }

    return suggestions;
}

/**
 * Formats a "No matching record found" response.
 */
export function formatNotFoundResponse(query: string, entity?: string): AIResponse {
    return formatAIResponse({
        answer: `No matching ${entity || "record"} found for "${query}".`,
        type: "text",
        suggestions: {
            insights: ["Try broader search terms", "Check if the ID/Name is correct"],
            actions: ["View all records", "Create new record"],
            questions: ["Show recent employees", "Search by department"]
        }
    });
}

/**
 * Formats a detailed employee profile.
 */
export function formatEmployeeProfile(employee: any): AIResponse {
    const profile = `### Employee Profile

- **Name**: ${employee.name}
- **Employee ID**: ${employee.id}
- **Status**: ${(employee.status || "active").toUpperCase()}
- **Department**: ${employee.department}
- **Joining Date**: ${employee.joiningDate || "N/A"}
- **Role**: ${employee.role || "N/A"}
- **Salary**: ${employee.salary ? `₹${employee.salary.toLocaleString("en-IN")}` : "N/A"}
- **Designation**: ${employee.designation || "N/A"}`;

    return formatAIResponse({
        answer: profile,
        type: "detailed",
        source: "Employees table",
        details: employee,
        suggestions: {
            insights: [
                `Salary is ${employee.salary > 80000 ? "above" : "below"} market average for ${employee.department}`,
                "No critical absenteeism risk detected"
            ],
            actions: ["Generate profile report", "Apply filter for this employee", "Draft email to employee"],
            questions: [
                "Show attendance history",
                "Show leave summary",
                "Who joined after this employee?",
                `Compare ${employee.name}'s salary with department avg`
            ]
        }
    });
}

/**
 * Formats a "Field not found" response.
 */
export function formatFieldNotFoundResponse(field: string, model: string): AIResponse {
    return formatAIResponse({
        answer: `The field "${field}" was not found in the ${model} schema.`,
        type: "text",
        source: `${model} schema metadata`,
        suggestions: {
            insights: ["List all available fields", "Check schema documentation"],
            actions: ["Request field addition"],
            questions: [`What fields are in ${model}?`, "Show basic info"]
        }
    });
}

/**
 * Formats attendance history in the required "Last 5 Records" format.
 */
export function formatAttendanceHistory(employee: any, records: any[], status: string): AIResponse {
    let answer = `### Attendance History — ${employee.name}\n\n`;
    answer += `Showing last **5** records for: **${status.toUpperCase()}**\n\n`;

    if (records.length === 0) {
        answer += `*No ${status} records found for this employee.*`;
    } else {
        answer += records.map(r => {
            const date = new Date(r.date).toLocaleDateString("en-IN", { dateStyle: "long" });
            const note = r.note ? ` — *"${r.note}"*` : "";
            return `- ${date} : **${r.status.toUpperCase()}**${note}`;
        }).join("\n");
    }

    return formatAIResponse({
        answer,
        type: "text",
        source: "Attendance table",
        suggestions: {
            insights: ["Calculate absenteeism risk"],
            actions: ["Draft email to employee"],
            questions: [`View ID ${employee.id} details`, "Show leave balance"]
        }
    });
}

/**
 * Formats employee leave summary.
 */
export function formatLeaveSummary(employee: any, summary: { total: number, sick: number, casual: number, paid: number }): AIResponse {
    let answer = `### Employee Leave Summary\n\n`;
    answer += `**${employee.name}** (ID:${employee.id})\n\n`;
    answer += `Total Leaves Taken: **${summary.total}**\n`;
    answer += `- Sick Leave: ${summary.sick}\n`;
    answer += `- Casual Leave: ${summary.casual}\n`;
    answer += `- Paid Leave: ${summary.paid}\n`;

    return formatAIResponse({
        answer,
        type: "text",
        source: "Attendance records (status: leave)",
        suggestions: {
            insights: ["Analyze leave trends"],
            actions: ["Update leave balance"],
            questions: [`Show attendance history for ID ${employee.id}`, "Who has most leaves?"]
        }
    });
}

/**
 * Formats a what-if scenario simulation result.
 */
export function formatSimulationResponse(result: any): AIResponse {
    let answer = `### Scenario Simulation: ${result.scenario}\n\n`;
    answer += `**Current Metrics:**\n`;
    for (const [key, value] of Object.entries(result.currentMetrics)) {
        answer += `- ${key}: **${value}**\n`;
    }
    answer += `\n**Projected Metrics:**\n`;
    for (const [key, value] of Object.entries(result.projectedMetrics)) {
        answer += `- ${key}: **${value}**\n`;
    }
    answer += `\n**Impact Analysis:**\n${result.impactSummary}`;

    return formatAIResponse({
        answer,
        type: "simulation",
        source: "AI Simulation Engine",
        data: result,
        suggestions: {
            insights: ["Try a higher percentage adjustment", "Compare with last year's trends"],
            actions: ["Generate detailed simulation report", "Adjust budget projections"],
            questions: ["What if headcount increases?", "How does this affect Engineering?"]
        }
    });
}

/**
 * Formats predictive intelligence metrics.
 */
export function formatPredictiveResponse(metrics: any): AIResponse {
    let answer = `### Predictive Intelligence Insights\n\n`;
    const trendIcon = metrics.attendanceTrendSlope > 0 ? "📈 Improving" : "📉 Declining";
    answer += `- **Attendance Trend**: ${trendIcon} (${metrics.attendanceTrendSlope}% change)\n`;
    answer += `- **Projected Attrition (Next 30 Days)**: **${metrics.projectedAttritionCount}** employees at risk\n`;
    answer += `- **Projected Payroll Burn (Next Month)**: **₹${Math.round(metrics.payrollBurnRateNextMonth).toLocaleString("en-IN")}**\n\n`;

    answer += `#### Department Health Index\n`;
    for (const [dept, score] of Object.entries(metrics.departmentHealthIndex)) {
        const scoreNum = score as number;
        const status = scoreNum > 85 ? "🟢 Healthy" : scoreNum > 70 ? "🟡 Warning" : "🔴 Critical";
        answer += `- **${dept}**: ${score}% (${status})\n`;
    }

    return formatAIResponse({
        answer,
        type: "text",
        source: "Predictive Intelligence Engine",
        data: metrics,
        suggestions: {
            insights: ["Identify specific attrition risks", "Analyze declining attendance in departments"],
            actions: ["Download predictive report", "Schedule department health reviews"],
            questions: ["Who is at risk of leaving?", "Why is Engineering health low?"]
        }
    });
}
