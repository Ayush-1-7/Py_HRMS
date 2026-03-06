/* ══════════════════════════════════════════════════════════
   Action Executor — Handles agentic actions safely
   ══════════════════════════════════════════════════════════ */

import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import type { AIAction } from "./types";

/** Execute a confirmed action */
export async function executeAction(action: AIAction): Promise<{ success: boolean; result: string; data?: unknown }> {
    await connectDB();

    switch (action.type) {
        case "generate_report":
            return generateReport(action);
        case "draft_email":
            return draftEmail(action);
        default:
            return { success: false, result: "Unknown action type" };
    }
}

/* ── Report Generation ────────────────────────────────────── */
async function generateReport(action: AIAction): Promise<{ success: boolean; result: string; data?: unknown }> {
    const { entity, department, dateRange } = action.params as {
        entity: string;
        department?: string;
        dateRange?: { from: string; to: string };
    };

    const range = dateRange || {
        from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10),
    };

    if (entity === "attendance") {
        const match: Record<string, unknown> = {
            date: { $gte: new Date(range.from), $lte: new Date(range.to + "T23:59:59Z") },
        };

        const summary = await Attendance.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "emp",
                },
            },
            { $unwind: "$emp" },
            ...(department ? [{ $match: { "emp.department": department } }] : []),
            {
                $group: {
                    _id: { department: "$emp.department", status: "$status" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.department": 1 } },
        ]);

        // Build a printable report
        const deptMap: Record<string, Record<string, number>> = {};
        for (const row of summary) {
            const dept = row._id.department;
            if (!deptMap[dept]) deptMap[dept] = {};
            deptMap[dept][row._id.status] = row.count;
        }

        let reportMd = `## 📊 Attendance Report\n**Period:** ${range.from} to ${range.to}\n`;
        if (department) reportMd += `**Department:** ${department}\n`;
        reportMd += `**Generated:** ${new Date().toLocaleString("en-IN")}\n\n`;
        reportMd += `| Department | Present | Absent | Leave | Total |\n|------------|---------|--------|-------|-------|\n`;

        for (const [dept, stats] of Object.entries(deptMap)) {
            const present = stats["present"] || 0;
            const absent = stats["absent"] || 0;
            const leave = stats["leave"] || 0;
            const total = present + absent + leave;
            reportMd += `| ${dept} | ${present} | ${absent} | ${leave} | ${total} |\n`;
        }

        // Log for audit
        console.log(`[AI Action Audit] Report generated: attendance, ${range.from}-${range.to}, dept: ${department || "all"}`);

        return {
            success: true,
            result: reportMd,
            data: deptMap,
        };
    }

    if (entity === "payroll") {
        const match: Record<string, unknown> = { salary: { $exists: true, $gt: 0 } };
        if (department) match.department = department;

        const payrollData = await Employee.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$department",
                    totalPayroll: { $sum: "$salary" },
                    avgSalary: { $avg: "$salary" },
                    minSalary: { $min: "$salary" },
                    maxSalary: { $max: "$salary" },
                    headcount: { $sum: 1 },
                },
            },
            { $sort: { totalPayroll: -1 } },
        ]);

        const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

        let reportMd = `## 💰 Payroll Report\n`;
        if (department) reportMd += `**Department:** ${department}\n`;
        reportMd += `**Generated:** ${new Date().toLocaleString("en-IN")}\n\n`;
        reportMd += `| Department | Headcount | Total Payroll | Avg Salary | Min | Max |\n|------------|-----------|---------------|------------|-----|-----|\n`;

        for (const row of payrollData) {
            reportMd += `| ${row._id} | ${row.headcount} | ${fmt(row.totalPayroll)} | ${fmt(row.avgSalary)} | ${fmt(row.minSalary)} | ${fmt(row.maxSalary)} |\n`;
        }

        console.log(`[AI Action Audit] Report generated: payroll, dept: ${department || "all"}`);

        return {
            success: true,
            result: reportMd,
            data: payrollData,
        };
    }

    // Generic employee report
    const match: Record<string, unknown> = {};
    if (department) match.department = department;

    const employees = await Employee.find(match)
        .select("name employeeId department designation status salary joiningDate")
        .sort({ department: 1, name: 1 })
        .lean();

    let reportMd = `## 👥 Employee Report\n`;
    if (department) reportMd += `**Department:** ${department}\n`;
    reportMd += `**Total:** ${employees.length} employees\n`;
    reportMd += `**Generated:** ${new Date().toLocaleString("en-IN")}\n\n`;
    reportMd += `| Name | ID | Department | Designation | Status |\n|------|-----|------------|-------------|--------|\n`;

    for (const emp of employees.slice(0, 50)) {
        reportMd += `| ${emp.name} | ${emp.employeeId} | ${emp.department} | ${emp.designation} | ${emp.status} |\n`;
    }

    if (employees.length > 50) {
        reportMd += `\n*...and ${employees.length - 50} more employees.*\n`;
    }

    console.log(`[AI Action Audit] Report generated: employee, dept: ${department || "all"}`);

    return { success: true, result: reportMd, data: employees };
}

/* ── Email Drafting ───────────────────────────────────────── */
async function draftEmail(action: AIAction): Promise<{ success: boolean; result: string; data?: unknown }> {
    const { status, rawQuery } = action.params as { status?: string; rawQuery?: string };

    if (status === "absent") {
        const today = new Date().toISOString().slice(0, 10);
        const absentRecords = await Attendance.find({
            status: "absent",
            date: { $gte: new Date(today), $lte: new Date(today + "T23:59:59Z") },
        })
            .populate("employee", "name email department")
            .lean();

        const employeeNames = absentRecords.map(r => {
            const emp = r.employee as unknown as { name: string; department: string };
            return `${emp.name} (${emp.department})`;
        });

        const draft = `## ✉️ Draft Email — Absent Employees Notification\n\n` +
            `**Subject:** Attendance Alert — ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}\n\n` +
            `**To:** HR Department\n\n` +
            `---\n\n` +
            `Dear Team,\n\n` +
            `This is to inform you that the following **${absentRecords.length}** employee(s) were marked absent today:\n\n` +
            employeeNames.map(n => `- ${n}`).join("\n") +
            `\n\nPlease follow up regarding their absence status and update the records accordingly.\n\n` +
            `Best regards,\n` +
            `HR System — Auto-generated Draft\n\n` +
            `---\n*This draft was generated by the AI Assistant. Please review and modify before sending.*`;

        console.log(`[AI Action Audit] Email draft generated: absent employees notification`);

        return { success: true, result: draft };
    }

    // Generic notification draft
    const draft = `## ✉️ Draft Notification\n\n` +
        `**Subject:** HR Notification\n\n` +
        `**To:** All Employees\n\n` +
        `---\n\n` +
        `Dear Team,\n\n` +
        `[Your message here based on: "${rawQuery || "general notification"}"]\n\n` +
        `Best regards,\n` +
        `HR Department\n\n` +
        `---\n*This draft was generated by the AI Assistant. Please review and modify before sending.*`;

    console.log(`[AI Action Audit] Email draft generated: generic notification`);

    return { success: true, result: draft };
}
