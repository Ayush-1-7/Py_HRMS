/* ══════════════════════════════════════════════════════════
   AI Orchestrator — Dynamic Data Query & Logic
   ══════════════════════════════════════════════════════════ */

import mongoose from "mongoose";
import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import { formatAIResponse, formatNotFoundResponse, formatFieldNotFoundResponse, formatEmployeeProfile, formatAttendanceHistory, formatLeaveSummary, formatSimulationResponse, formatPredictiveResponse } from "./responseFormatter";
import { getSchemaMetadata, getModelFields, findFieldInfo } from "./schemaIntelligence";
import type { AIIntent, AIContext, AIResponse } from "./types";
import { extractStatus, extractDepartment, extractAttendanceStatus } from "./queryBuilder";
import { simulateScenario } from "./simulationEngine";
import { computePredictiveMetrics } from "./predictiveEngine";

/**
 * Orchestrates the full process of answering a database-related question.
 */
export async function orchestrateQuery(intent: AIIntent, context?: AIContext): Promise<AIResponse> {
    await connectDB();

    const queryLower = intent.rawQuery.toLowerCase().trim();
    const userRole = context?.userRole || "Employee"; // Default to lowest priv

    const isIntentSimulation = (intent.type as any) === "SIMULATION" || queryLower.includes("what if") || queryLower.includes("simulate");
    const isIntentPredictive = (intent.type as any) === "PREDICTIVE" || queryLower.includes("predict") || queryLower.includes("forecast");

    if (isIntentSimulation) {
        return await handleSimulationQuery(queryLower);
    }
    if (isIntentPredictive) {
        return await handlePredictiveQuery();
    }

    // --- High Priority: Attendance/Absenteeism Routing (General) ---
    const isGeneralAttendanceQuery = (queryLower.includes("absent") || queryLower.includes("present") || queryLower.includes("unmarked")) &&
        !queryLower.match(/(?:id|emp|#|name|is)\s+/i) &&
        !queryLower.match(/\b(when|history|record|dates?)\b/i) &&
        !isIntentSimulation && !isIntentPredictive;

    if (isGeneralAttendanceQuery) {
        // Force intent to attendance if keywords are present and it looks general
        intent.entity = "attendance";
        if (queryLower.includes("how many") || queryLower.includes("count")) {
            intent.type = "COUNT";
        } else {
            intent.type = "LIST";
            return await handleAttendanceList(intent);
        }
    }

    // RBAC Check
    if (!checkAccess(intent.entity, userRole)) {
        return formatAIResponse({
            answer: "Access denied due to role restrictions. You do not have permission to view this data.",
            type: "text"
        });
    }

    // --- Intent Pre-processing (Context & Pronouns) ---
    const isPronounMatch = queryLower.match(/\b(him|her|he|she|this person|that employee|the employee|the same employee|the last one|the previous one)\b/i);
    const isTemporalMatch = queryLower.match(/\b(last|latest|newest|recent|most recent)\b/i) && (queryLower.includes("employee") || queryLower.includes("join") || queryLower.includes("last"));

    // ── 0. Handle Greetings & Help (High Priority) ──
    if (queryLower.match(/\b(hi|hello|hey|greetings|help|capabilities)\b/i)) {
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

    // ── 1. Handle Schema Inquiries ──
    if (intent.type === "SCHEMA" || queryLower.includes("fields in") || queryLower.includes("table schema")) {
        return await handleSchemaQuery(queryLower);
    }

    // ── 1. Employee Attendance History (High Specificity) ──
    const attendanceHistMatch = queryLower.match(/(?:when|dates?|history|record)\s+(?:was|is|of|for)?\s+(?:employee\s+)?(?:id\s+)?(\d+|emp-\d+)\b.*(?:absent|present|attendance)/i) ||
        queryLower.match(/(?:employee\s+)?(?:id\s+)?(\d+|emp-\d+).*(?:absent|present|attendance).*(?:dates?|history|record|when)/i) ||
        queryLower.match(/(?:when|dates?|history|record)\s+(?:was|is|of|for)?\s+(?:absent|present|attendance).*(?:employee\s+)?(?:id\s+)?(\d+|emp-\d+)/i);

    if (attendanceHistMatch && (queryLower.includes("absent") || queryLower.includes("present") || queryLower.includes("history"))) {
        return await handleEmployeeAttendanceHistory(attendanceHistMatch[1], queryLower);
    }

    // ── 2. Handle Specific Entity Lookup (ID, Code) ──
    const idMatch = queryLower.match(/(?:employee\s+id|emp\s+id|id|#|who\s+is|details\s+of|is|employee|tell\s+me\s+about)\s*(\d+)\b/i) || queryLower.match(/^(\d+)$/);
    if (idMatch) return await handleSingleEmployeeQuery(idMatch[1], intent);

    const empCodeMatch = queryLower.match(/emp-\d+/i);
    if (empCodeMatch) return await handleSingleEmployeeQuery(empCodeMatch[0], intent);

    // ── 3. Handle Contextual Reasoning ("among them", "those") ──
    if ((queryLower.includes("among") || queryLower.includes("those") || queryLower.includes("latest one")) && context?.lastResultSetIds) {
        return await handleContextualReasoning(queryLower, context);
    }

    // ── 4. Handle Temporal Queries ("latest employee", "last joined") ──
    if (isTemporalMatch && !queryLower.includes("among")) {
        return await handleTemporalQuery(intent);
    }

    // ── 5. Handle Leave Queries ──
    if (intent.type === "LEAVE" || queryLower.includes("leave")) {
        // Resolve target ID from query or pronoun
        let targetId: string | null = null;
        const leaveIdMatch = queryLower.match(/(?:id|emp|#)\s*(\d+)/i) || queryLower.match(/\b(\d+)\b/);
        if (leaveIdMatch) targetId = leaveIdMatch[1];
        else if (isPronounMatch && context?.lastEmployeeMentioned) targetId = context.lastEmployeeMentioned.id.toString();

        if (targetId) return await handleLeaveQuery(targetId, queryLower);
        // If no ID found, maybe it's "who took most leaves" -> handled in analytics
    }

    // ── 6. Handle Pronoun Resolution (General) ──
    if (isPronounMatch && !queryLower.match(/\d+/)) {
        if (context?.lastEmployeeMentioned) {
            return await handleSingleEmployeeQuery(context.lastEmployeeMentioned.id.toString(), intent);
        }
    }

    // ── 7. Handle Action Requests ──
    if (intent.type === "ACTION" || (queryLower.includes("generate") && queryLower.includes("report")) || queryLower.includes("export") || queryLower.includes("apply filter") || queryLower.includes("download")) {
        return await handleActionQuery(queryLower, intent);
    }

    // ── 8. Handle Count Queries ──
    if (intent.type === "COUNT" || queryLower.includes("how many") || queryLower.includes("total count")) {
        return await handleCountQuery(intent, context);
    }

    // ── 9. Handle Analytics, Comparison & Salary Insights ──
    if (intent.type === "ANALYTICS" || intent.type === "INSIGHT" || intent.type === "COMPARISON" ||
        queryLower.includes("breakdown") || queryLower.includes("distribution") || queryLower.includes("highest salary") ||
        queryLower.includes("average salary") || queryLower.includes("more than") || queryLower.includes("perfect attendance") ||
        queryLower.includes("most leaves") || queryLower.includes("most absences") || queryLower.includes("today")) {
        return await handleAnalyticsQuery(intent);
    }

    // ── 10. Handle Simulation & Predictive Queries ──
    if (intent.type === "SIMULATION" || queryLower.includes("what if") || queryLower.includes("simulate")) {
        return await handleSimulationQuery(queryLower);
    }

    if (intent.type === "PREDICTIVE" || queryLower.includes("predict") || queryLower.includes("forecast") || queryLower.includes("health index") || queryLower.includes("attrition")) {
        return await handlePredictiveQuery();
    }

    // ── 11. Detect Name and Field ──
    const fieldQuery = await detectFieldQuery(queryLower, context);
    if (fieldQuery) {
        return await handleFieldQuery(fieldQuery.name, fieldQuery.field, intent, fieldQuery.id);
    }

    // ── 9. Multi-Condition Logic ──
    if (queryLower.includes("average") || queryLower.includes("above") || queryLower.includes("below")) {
        return await handleMultiConditionLogic(intent);
    }

    // ── 10. Fuzzy Name Matching (Last Resort) ──
    const descriptiveNameMatch = queryLower.match(/(?:employee\s+named|who\s+is|about|status\s+of|salary\s+of|details\s+of|called|search\s+for|named|is\s+called)\s+([a-z\s]{3,})/i);
    let nameToSearch = descriptiveNameMatch ? descriptiveNameMatch[1].trim().replace(/\b(the|is|currently|status|salary|details|profile|record|employee|named|called)\b/g, "").trim() : null;

    if (!nameToSearch && queryLower.length >= 3 && !isPronounMatch && !isTemporalMatch) {
        const words = queryLower.split(/\s+/);
        if (words.length <= 3) nameToSearch = queryLower;
    }

    if (nameToSearch && nameToSearch.length >= 3) {
        return await handleFuzzyNameMatch(nameToSearch, intent);
    }

    return {
        message: "I'm not sure how to help with that. Try asking about a specific employee ID or counting employees by department.",
        type: "text",
        suggestions: {
            insights: ["Show workforce distribution"],
            actions: [],
            questions: ["Who is employee id 1?", "How many employees are there?"]
        }
    };
}

/**
 * Checks if the user role has access to the requested entity.
 */
function checkAccess(entity: string, role: string): boolean {
    if (role === "Admin") return true;
    if (role === "HR Manager") {
        return ["employee", "attendance", "payroll", "department", "general"].includes(entity);
    }
    // Employee can only access general or self-based (context logic would be needed for "self")
    return entity === "general" || entity === "employee";
}

/**
 * Handles queries for a single employee by ID or Code with strict matching.
 */
async function handleSingleEmployeeQuery(identifier: string, intent: AIIntent): Promise<AIResponse> {
    const isNumericId = /^\d+$/.test(identifier);
    const isEmpCode = identifier.toLowerCase().startsWith("emp-");

    let query: any = {};
    if (isNumericId) query = { id: parseInt(identifier) };
    else if (isEmpCode) query = { employeeId: identifier.toUpperCase() };
    else return formatNotFoundResponse(identifier, "Employee"); // Should not reach here with strict logic

    const employee = await Employee.findOne(query).lean();

    if (!employee) {
        // Strict Not Found Response with Suggestions
        return formatAIResponse({
            answer: `No employee found with Employee ID **${identifier}**.`,
            type: "text",
            suggestions: {
                insights: [],
                actions: [],
                questions: [
                    `show employee id 1`,
                    `search employee by name`,
                    `list all employees`
                ]
            }
        });
    }

    const response = formatEmployeeProfile(employee);
    response.contextUpdate = {
        lastEmployeeMentioned: {
            id: employee.id,
            name: employee.name,
            employeeId: employee.employeeId
        }
    };
    return response;
}

/**
 * Handles "latest employee" style queries.
 */
async function handleTemporalQuery(_intent: AIIntent): Promise<AIResponse> {
    const latest = await Employee.findOne().sort({ joiningDate: -1 }).lean();
    if (!latest) return formatNotFoundResponse("latest", "Employee");

    const response = formatEmployeeProfile(latest);
    response.message = `The most recently joined employee is **${latest.name}**.\n\n` + response.message;
    response.contextUpdate = {
        lastEmployeeMentioned: {
            id: latest.id,
            name: latest.name,
            employeeId: latest.employeeId
        }
    };
    return response;
}

/**
 * Handles fuzzy name matching and duplicates.
 */
async function handleFuzzyNameMatch(name: string, intent: AIIntent): Promise<AIResponse> {
    const searchRegex = new RegExp(name, "i");
    const employees = await Employee.find({ name: searchRegex }).limit(5).lean();

    if (employees.length === 0) return formatNotFoundResponse(name, "Employee");

    if (employees.length === 1) {
        return await handleSingleEmployeeQuery(employees[0].id.toString(), intent);
    }

    // Multiple matches
    const list = employees.map((e, i) => `${i + 1}. **${e.name}** (ID:${e.id}, ${e.department})`).join("\n");
    return formatAIResponse({
        answer: `Multiple employees named **${name}** found:\n\n${list}\n\nWhich one do you mean?`,
        type: "text",
        suggestions: {
            insights: ["Search by employee ID for exact match"],
            actions: [],
            questions: employees.map(e => `Show details for ID ${e.id}`)
        },
        contextUpdate: {
            lastResultSetIds: employees.map(e => e.id)
        }
    });
}

/**
 * Handles reasoning over a previously returned set of employees.
 */
async function handleContextualReasoning(query: string, context: AIContext): Promise<AIResponse> {
    const queryLower = query.toLowerCase();
    const ids = context.lastResultSetIds || [];

    if (ids.length === 0) {
        return { message: "I don't have a list of employees to reason over. Please perform a search first.", type: "text" };
    }

    // Fetch full employee objects for the context set
    const employees = await Employee.find({ id: { $in: ids } }).lean();

    // "who is the latest among them" / "newest"
    if (queryLower.match(/\b(latest|last|newest|recent)\b/i)) {
        const sorted = [...employees].sort((a, b) =>
            new Date(b.joiningDate || 0).getTime() - new Date(a.joiningDate || 0).getTime()
        );
        const target = sorted[0];
        if (!target) return { message: "Could not find any matching employee in the previous results.", type: "text" };

        const response = formatEmployeeProfile(target);
        response.message = `The most recently joined employee among them is **${target.name}**.\n\n` + response.message;
        response.contextUpdate = {
            lastEmployeeMentioned: { id: target.id, name: target.name, employeeId: target.employeeId }
        };
        return response;
    }

    // "what department is he in" / "status of that employee" (referring to a single target from the set)
    // If the set has only one person, treat as single query
    if (employees.length === 1) {
        return await handleSingleEmployeeQuery(employees[0].id.toString(), { type: "DATA_QUERY", entity: "employee", rawQuery: query, filters: {} });
    }

    return {
        message: `I found ${employees.length} employees from the previous list. You can ask "who is latest among them" or "which department has most employees in this list".`,
        type: "text",
        suggestions: {
            insights: ["Compare salaries within this group"],
            actions: [],
            questions: ["Who is oldest among them?", "Total salary for this group"]
        }
    };
}

/**
 * Handles leave record queries for a specific employee.
 */
async function handleLeaveQuery(identifier: string, query: string): Promise<AIResponse> {
    const isNumericId = /^\d+$/.test(identifier);
    const empMatch = isNumericId ? { id: parseInt(identifier) } : { employeeId: identifier.toUpperCase() };

    const employee = await Employee.findOne(empMatch).lean();
    if (!employee) return formatNotFoundResponse(identifier, "Employee");

    const leaveRecords = await Attendance.find({
        employee: employee._id,
        status: "leave"
    }).lean();

    // Mocking subtypes based on 'note' if available, otherwise just count
    let sick = 0, casual = 0, paid = 0;
    leaveRecords.forEach(r => {
        const note = (r.note || "").toLowerCase();
        if (note.includes("sick")) sick++;
        else if (note.includes("casual")) casual++;
        else paid++; // Default to paid/other
    });

    const total = leaveRecords.length;
    const summary = { total, sick, casual, paid };

    const response = formatLeaveSummary(employee, summary);
    response.contextUpdate = {
        lastEmployeeMentioned: { id: employee.id, name: employee.name, employeeId: employee.employeeId }
    };
    return response;
}

/**
 * Handles department breakdown, salary distribution, and workforce analytics.
 */
async function handleAnalyticsQuery(intent: AIIntent): Promise<AIResponse> {
    const query = intent.rawQuery.toLowerCase();

    // --- Salary Analytics ---
    if (query.includes("salary") || query.includes("paid") || query.includes("earns")) {
        // "who earns more than [Name]"
        const compareMatch = query.match(/(?:more\s+than|higher\s+than)\s+([a-z\s]+)/i);
        if (compareMatch) {
            const targetName = compareMatch[1].trim();
            const targetEmp = await Employee.findOne({ name: new RegExp(targetName, "i") }).lean();
            if (targetEmp && targetEmp.salary) {
                const results = await Employee.find({ salary: { $gt: targetEmp.salary } }).sort({ salary: -1 }).limit(10).lean();
                let answer = `There are **${results.length}** employees who earn more than **${targetEmp.name}** (₹${targetEmp.salary.toLocaleString("en-IN")}):\n\n`;
                answer += results.map(e => `- **${e.name}**: ₹${e.salary?.toLocaleString("en-IN")} (${e.department})`).join("\n");
                return formatAIResponse({ answer, type: "text" });
            }
        }

        if (query.includes("highest") || query.includes("top")) {
            const highest = await Employee.findOne().sort({ salary: -1 }).lean();
            if (!highest) return { message: "No salary data available.", type: "text" };

            const response = formatEmployeeProfile(highest);
            response.message = `The employee with the highest salary is **${highest.name}**, earning **₹${highest.salary?.toLocaleString("en-IN")}**.\n\n` + response.message;
            return response;
        }

        if (query.includes("average") || query.includes("avg")) {
            const stats = await Employee.aggregate([
                { $group: { _id: "$department", avgSalary: { $avg: "$salary" }, count: { $sum: 1 } } },
                { $sort: { avgSalary: -1 } }
            ]);

            let answer = `### Average Salary by Department\n\n`;
            answer += stats.map(s => `- **${s._id}**: ₹${Math.round(s.avgSalary).toLocaleString("en-IN")} (${s.count} employees)`).join("\n");

            return formatAIResponse({ answer, type: "text", suggestions: { insights: ["Compare with market benchmarks"], actions: ["Export payroll summary"], questions: ["Who is the highest paid?", "Show salary breakdown by role"] } });
        }
    }

    // --- Workforce / Department Breakdown ---
    if (query.includes("breakdown") || query.includes("distribution") || query.includes("departments") || query.includes("most employees")) {
        const stats = await Employee.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        if (query.includes("most") || query.includes("largest")) {
            const largest = stats[0];
            return formatAIResponse({
                answer: `The **${largest._id}** department has the most employees with a total count of **${largest.count}**.`,
                type: "text"
            });
        }

        let answer = `### Workforce Distribution\n\n`;
        answer += stats.map(s => `- **${s._id}**: ${s.count} employees`).join("\n");

        return formatAIResponse({
            answer,
            type: "text",
            suggestions: {
                insights: ["Show average salary by department"],
                actions: ["Generate workforce report"],
                questions: ["Who is the latest employee?", "Which department is smallest?"]
            }
        });
    }

    // --- Deep Attendance/Leave Analytics ---
    if (query.includes("perfect attendance") || query.includes("most leaves") || query.includes("most absences") || query.includes("leave today") || query.includes("absent today")) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (query.includes("today")) {
            const status = query.includes("leave") ? "leave" : "absent";
            const attendance = await Attendance.find({ date: today, status }).populate("employee").lean();
            if (attendance.length === 0) return { message: `No employees are recorded as **${status}** today.`, type: "text" };

            let answer = `### Employees on ${status.toUpperCase()} Today\n\n`;
            answer += attendance.map((a: any) => `- **${a.employee.name}** (${a.employee.department})`).join("\n");
            return formatAIResponse({ answer, type: "text" });
        }

        if (query.includes("perfect attendance")) {
            // Logic: All active employees who have NO "absent" or "leave" records ever (or this year)
            // For simplicity, let's look for zero absences this year
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            const problematicIds = await Attendance.distinct("employee", {
                status: { $in: ["absent", "leave"] },
                date: { $gte: startOfYear }
            });
            const perfect = await Employee.find({ _id: { $nin: problematicIds }, status: "active" }).limit(10).lean();

            let answer = `### Perfect Attendance (This Year)\n\nThese employees have zero absences or leaves recorded since ${startOfYear.toLocaleDateString()}:\n\n`;
            answer += perfect.map(e => `- **${e.name}** (${e.department})`).join("\n");
            return formatAIResponse({ answer, type: "text" });
        }

        if (query.includes("most leaves") || query.includes("most absences")) {
            const status = query.includes("leave") ? "leave" : "absent";
            const stats = await Attendance.aggregate([
                { $match: { status } },
                { $group: { _id: "$employee", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            // Populate names
            const populated = await Promise.all(stats.map(async s => {
                const emp = await Employee.findById(s._id).lean();
                return { name: emp?.name, count: s.count, department: emp?.department };
            }));

            if (populated.length === 0) return { message: `No employees currently have **${status}** records in the system.`, type: "text" };
            let answer = `### Highest ${status.toUpperCase()} Count\n\n`;
            answer += populated.map(p => `- **${p.name}**: ${p.count} days (${p.department})`).join("\n");
            return formatAIResponse({ answer, type: "text" });
        }
    }

    return { message: "I'm not sure which analytics you're looking for. Try 'department breakdown', 'perfect attendance', or 'highest salary'.", type: "text" };
}


/**
 * Handles attendance history for a specific employee.
 */
async function handleEmployeeAttendanceHistory(identifier: string, query: string): Promise<AIResponse> {
    const isId = /^\d+$/.test(identifier);
    const empQuery = isId ? { id: parseInt(identifier) } : { employeeId: identifier.toUpperCase() };

    const employee = await Employee.findOne(empQuery).lean();
    if (!employee) return formatNotFoundResponse(identifier, "Employee");

    const statusToFind = query.includes("absent") ? "absent" :
        query.includes("present") ? "present" : "absent";

    const attendanceRecords = await Attendance.find({
        employee: employee._id,
        status: statusToFind
    }).sort({ date: -1 }).limit(5).lean();

    const response = formatAttendanceHistory(employee, attendanceRecords, statusToFind);
    response.contextUpdate = {
        lastEmployeeMentioned: { id: employee.id, name: employee.name, employeeId: employee.employeeId }
    };
    return response;
}

/**
 * Handles count queries with specific filtering logic.
 */
async function handleCountQuery(intent: AIIntent, _context?: AIContext): Promise<AIResponse> {
    const queryLower = intent.rawQuery.toLowerCase();
    const match: any = {};

    // 1. Extract Name for filtering if present
    const nameMatch = queryLower.match(/name\s+(?:is|of|containing|like)\s+([a-z\s]+)/i) ||
        queryLower.match(/named\s+([a-z\s]+)/i) ||
        queryLower.match(/how many employees\s+([a-z\s]+)/i);

    // Also check for specific names mentioned directly like "how many Ayush"
    let nameToFilter: string | null = null;
    if (nameMatch) {
        nameToFilter = nameMatch[1].trim();
    } else if (queryLower.includes("how many") || queryLower.includes("count")) {
        // More robust heuristic: remove keywords and take what's left as name
        const cleanQuery = queryLower
            .replace(/\b(how|many|employees|total|count|of|the|in|department|status|active|inactive|unmarked|present|absent)\b/g, "")
            .trim();
        if (cleanQuery.length >= 3) {
            nameToFilter = cleanQuery;
        }
    }

    if (nameToFilter) {
        // Robust filtering: "Ayush Sharma" vs "Ayush"
        const words = nameToFilter.split(/\s+/).filter(w => w.length > 0);
        const isExact = queryLower.includes("exact") || queryLower.includes("full name") || words.length > 1;

        if (isExact) {
            match.name = new RegExp(`^${nameToFilter}$`, "i");
        } else {
            match.name = new RegExp(nameToFilter, "i");
        }
    }

    // 2. Department filter
    if (intent.department) match.department = intent.department;
    if (intent.status) match.status = intent.status;

    // 3. Execute count
    const count = await Employee.countDocuments(match);
    const employees = await Employee.find(match).limit(10).select("name employeeId department").lean();

    let message = `There are **${count}** employees matching your query.`;
    if (nameToFilter) {
        message = `There are **${count}** employees with the name **${nameToFilter}**.`;
    }

    if (count > 0) {
        const list = employees.map((e, i) => `${i + 1}. ${e.name} (${e.employeeId})`).join("\n");
        message += `\n\n**List of matching employees:**\n${list}`;
        if (count > 10) message += `\n\n*(Showing top 10 of ${count} results)*`;
    }

    return formatAIResponse({
        answer: message,
        type: "detailed",
        source: "Employees table",
        data: { count, employees }
    });
}

/**
 * Detects if a query is asking for a specific field for an entity, handling context/pronouns.
 */
async function detectFieldQuery(query: string, context?: AIContext) {
    const isPronoun = /\b(his|her|he|she|this person|that employee|the employee)\b/i.test(query);
    let targetName = "";
    let targetId: number | null = null;

    if (isPronoun && context?.lastEmployeeMentioned) {
        targetName = context.lastEmployeeMentioned.name.toLowerCase();
        targetId = context.lastEmployeeMentioned.id;
    } else {
        const names = await Employee.distinct("name");
        for (const name of names) {
            if (query.includes(name.toLowerCase())) {
                targetName = name.toLowerCase();
                break;
            }
        }
    }

    if (targetName) {
        const possibleFields = await getModelFields("Employee");
        for (const field of possibleFields) {
            const displayField = field.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
            if (query.includes(displayField) || query.includes(field.toLowerCase())) {
                return { name: targetName, field, id: targetId };
            }
        }
        // ... (manual mappings)
        if (query.includes("blood group")) return { name: targetName, field: "bloodGroup", id: targetId };
        if (query.includes("joining date") || query.includes("join date") || query.includes("when did he join") || query.includes("joined") || query.includes("joining")) return { name: targetName, field: "joiningDate", id: targetId };
        if (query.includes("salary") || query.includes("pay") || query.includes("earning")) return { name: targetName, field: "salary", id: targetId };
        if (query.includes("dept") || query.includes("department")) return { name: targetName, field: "department", id: targetId };
        if (query.includes("role") || query.includes("position") || query.includes("job") || query.includes("designation")) return { name: targetName, field: "designation", id: targetId };
    }
    return null;
}

/**
 * Handles queries for a specific field of an employee.
 */
async function handleFieldQuery(employeeName: string, field: string, _intent: AIIntent, employeeId?: number | null): Promise<AIResponse> {
    const query = employeeId ? { id: employeeId } : { name: new RegExp(employeeName.split(/\s+/)[0], "i") };
    const employee = await Employee.findOne(query).lean() as any;
    if (!employee) return formatNotFoundResponse(employeeName, "Employee");

    const value = employee[field];

    let answer = "";
    if (value === undefined || value === null) {
        answer = `${employee.name}'s ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is not specified in the records.`;
    } else {
        const valStr = (field === "salary") ? `₹${value.toLocaleString("en-IN")}` : value;
        answer = `${employee.name}'s ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is **${valStr}**.`;
    }

    const response = formatAIResponse({
        answer,
        source: `Employees table (${field} field)`,
        details: { Name: employee.name, ID: employee.id, [field]: value || "N/A" },
        type: "detailed"
    });

    response.contextUpdate = {
        lastEmployeeMentioned: {
            id: employee.id,
            name: employee.name,
            employeeId: employee.employeeId
        }
    };
    return response;
}

/**
 * Handles listing employees based on attendance status.
 */
async function handleAttendanceList(intent: AIIntent): Promise<AIResponse> {
    const queryLower = intent.rawQuery.toLowerCase();
    const attStatus = extractAttendanceStatus(queryLower);
    const dateRange = intent.dateRange || { from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

    const dateMatch: any = {
        date: {
            $gte: new Date(dateRange.from),
            $lte: new Date(dateRange.to + "T23:59:59Z"),
        }
    };
    if (attStatus) dateMatch.status = attStatus;

    const records = await Attendance.find(dateMatch)
        .populate("employee", "name employeeId department designation")
        .limit(20)
        .lean();

    if (records.length === 0) {
        return formatAIResponse({
            answer: `No employees found who were **${attStatus || "recorded"}** on ${dateRange.from}.`,
            type: "text"
        });
    }

    const lines = (records as any[]).map((r) => {
        const emp = r.employee;
        return `- **${emp?.name || "Unknown"}** (${emp?.employeeId || "N/A"}) — ${emp?.department || "N/A"}`;
    });

    return formatAIResponse({
        answer: `Found **${records.length}** employees who are **${attStatus?.toUpperCase() || "RECORDED"}** on ${dateRange.from}:\n\n${lines.join("\n")}`,
        type: "table",
        source: "Attendance & Employees table",
        data: records
    });
}
async function handleSchemaQuery(query: string): Promise<AIResponse> {
    const metadata = await getSchemaMetadata();

    if (query.includes("employee") || query.includes("staff") || query.includes("people")) {
        const fields = metadata.find(m => m.name === "Employee")?.fields || [];
        const fieldList = fields.map(f => `\`${f.path}\``).join(", ");
        return formatAIResponse({
            answer: `The **Employee** schema contains the following available fields:\n\n${fieldList}`,
            source: "Mongoose Schema Metadata",
            type: "text"
        });
    }

    const modelNames = metadata.map(m => m.name).join(", ");
    return formatAIResponse({
        answer: `I have access to the following data models: ${modelNames}. You can ask about fields in any of these.`,
        source: "Mongoose Schema Metadata",
        type: "text"
    });
}

/**
 * Handles complex multi-condition logic.
 */
async function handleMultiConditionLogic(intent: AIIntent): Promise<AIResponse> {
    const queryLower = intent.rawQuery.toLowerCase();

    // e.g., "Show employees in Engineering earning above department average"
    if (queryLower.includes("earning above") && queryLower.includes("average")) {
        const dept = intent.department;
        if (!dept) return { message: "Please specify a department for average calculation.", type: "text" };

        const avgResult = await Employee.aggregate([
            { $match: { department: dept, salary: { $exists: true, $gt: 0 } } },
            { $group: { _id: null, avgSalary: { $avg: "$salary" } } }
        ]);

        const avg = avgResult[0]?.avgSalary || 0;
        const employees = await Employee.find({
            department: dept,
            salary: { $gt: avg }
        }).select("name id salary department").lean();

        const lines = employees.map(e => `- **${e.name}** (₹${e.salary?.toLocaleString("en-IN")})`);

        return formatAIResponse({
            answer: `Found **${employees.length}** employees in **${dept}** earning above the department average of **₹${Math.round(avg).toLocaleString("en-IN")}**.`,
            source: "Employees table (salary & department fields)",
            data: employees,
            type: "table",
            explanation: `Calculated average salary for ${dept} (₹${Math.round(avg)}) and filtered for values > average.`,
            details: {
                Department: dept,
                "Average Salary": `₹${Math.round(avg).toLocaleString("en-IN")}`,
                "Count Found": employees.length
            }
        });
    }

    return { message: "That's a complex query! I'm still learning how to handle that specific combination of logic.", type: "text" };
}

/**
 * Handles action requests like generating reports or exporting data.
 */
async function handleActionQuery(query: string, intent: AIIntent): Promise<AIResponse> {
    if (query.includes("report") || query.includes("summary")) {
        return formatAIResponse({
            answer: "I've prepared a draft for your **Workforce Analytics Report**. Would you like me to export it as PDF or CSV?",
            type: "text",
            suggestions: {
                insights: ["Analyze report for cost-saving trends"],
                actions: ["Download as PDF", "Download as CSV", "Email to HR Manager"],
                questions: ["What is included in this report?", "How often is this data updated?"]
            }
        });
    }

    if (query.includes("export") || query.includes("download")) {
        return formatAIResponse({
            answer: "The data export has been queued and will be ready for download in a few moments.",
            type: "text",
            suggestions: {
                insights: [],
                actions: ["Open download folder"],
                questions: ["How long is this link valid?", "Which format is best?"]
            }
        });
    }

    if (query.includes("filter")) {
        return formatAIResponse({
            answer: "I've applied the requested filters to your dashboard view.",
            type: "text",
            suggestions: {
                insights: ["Clear current filters"],
                actions: ["Save this filter view"],
                questions: ["What other filters are available?", "How many results match?"]
            }
        });
    }

    return { message: "I understand you want to perform an action. Which one specifically (e.g., 'Generate employee report')?", type: "text" };
}

/**
 * Handles "what-if" simulation scenarios.
 */
async function handleSimulationQuery(query: string): Promise<AIResponse> {
    const result = await simulateScenario(query);
    if (!result) {
        return {
            message: "I'm not sure how to simulate that specific scenario. Try 'What if salary increases by 10%?' or 'What if absenteeism increases by 5%?'.",
            type: "text"
        };
    }
    return formatSimulationResponse(result);
}

/**
 * Handles predictive intelligence and health forecasting.
 */
async function handlePredictiveQuery(): Promise<AIResponse> {
    const metrics = await computePredictiveMetrics();
    return formatPredictiveResponse(metrics);
}
