/* ══════════════════════════════════════════════════════════
   Employee Analysis — Per-employee AI-computed insights
   ══════════════════════════════════════════════════════════ */

import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import type { EmployeeAnalysisResult } from "./types";
import mongoose from "mongoose";

/** Compute AI analysis for a single employee */
export async function analyzeEmployee(employeeMongoId: string): Promise<EmployeeAnalysisResult> {
    await connectDB();

    const employee = await Employee.findById(employeeMongoId).lean();
    if (!employee) throw new Error("Employee not found");

    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 86400000);

    // ── 1. Attendance Consistency ──────────────────────────
    const attendanceRecords = await Attendance.find({
        employee: new mongoose.Types.ObjectId(employeeMongoId),
        date: { $gte: last30, $lte: now },
    }).lean();

    const presentDays = attendanceRecords.filter(r => r.status === "present").length;
    const absentDays = attendanceRecords.filter(r => r.status === "absent").length;
    const totalDays = Math.max(1, attendanceRecords.length);
    const consistencyScore = Math.round((presentDays / Math.max(1, totalDays)) * 100);

    let consistencyLabel = "Excellent";
    if (consistencyScore < 50) consistencyLabel = "Poor";
    else if (consistencyScore < 70) consistencyLabel = "Needs Improvement";
    else if (consistencyScore < 85) consistencyLabel = "Good";

    // ── 2. Absenteeism Risk ────────────────────────────────
    const last14 = new Date(now.getTime() - 14 * 86400000);
    const recent14 = attendanceRecords.filter(r => new Date(r.date) >= last14);
    const recentAbsences = recent14.filter(r => r.status === "absent").length;

    let riskLevel: "low" | "medium" | "high" = "low";
    let riskScore = 0;
    const riskFactors: string[] = [];

    if (recentAbsences >= 4) {
        riskLevel = "high";
        riskScore = 90;
        riskFactors.push(`${recentAbsences} absences in last 14 days (critical)`);
    } else if (recentAbsences >= 2) {
        riskLevel = "medium";
        riskScore = 55;
        riskFactors.push(`${recentAbsences} absences in last 14 days`);
    } else {
        riskScore = 15;
        riskFactors.push("Attendance is consistent");
    }

    if (consistencyScore < 70) {
        riskScore = Math.min(100, riskScore + 20);
        riskFactors.push("30-day consistency below 70%");
        if (riskLevel === "low") riskLevel = "medium";
    }

    if (employee.status === "probation") {
        riskFactors.push("Currently on probation");
    }

    // ── 3. Salary Position ─────────────────────────────────
    const deptEmployees = await Employee.find({
        department: employee.department,
        salary: { $exists: true, $gt: 0 },
    }).select("salary").lean();

    const salaries = deptEmployees.map(e => e.salary || 0).sort((a, b) => a - b);
    const empSalary = employee.salary || 0;
    const deptAvg = salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0;

    let percentile = 50;
    if (salaries.length > 0 && empSalary > 0) {
        const belowCount = salaries.filter(s => s < empSalary).length;
        percentile = Math.round((belowCount / salaries.length) * 100);
    }

    const comparison: "above" | "below" | "at_average" =
        empSalary > deptAvg * 1.05 ? "above" :
            empSalary < deptAvg * 0.95 ? "below" : "at_average";

    // ── 4. Promotion Readiness Heuristic ───────────────────
    const tenure = Math.max(0, Math.floor((now.getTime() - new Date(employee.joiningDate).getTime()) / (365.25 * 86400000)));
    const tenureScore = Math.min(100, tenure * 15); // 0–100 over ~7 years

    const factors = [
        { name: "Tenure", score: tenureScore, weight: 0.25 },
        { name: "Attendance Consistency", score: consistencyScore, weight: 0.30 },
        { name: "Low Absenteeism Risk", score: Math.max(0, 100 - riskScore), weight: 0.25 },
        { name: "Salary Position", score: Math.min(100, percentile + 20), weight: 0.20 },
    ];

    const promotionScore = Math.round(
        factors.reduce((sum, f) => sum + f.score * f.weight, 0)
    );

    let promotionLabel = "Not Ready";
    if (promotionScore >= 80) promotionLabel = "Highly Ready";
    else if (promotionScore >= 65) promotionLabel = "Ready";
    else if (promotionScore >= 45) promotionLabel = "Developing";

    return {
        employeeId: employeeMongoId,
        employeeName: employee.name,
        attendanceConsistency: {
            score: consistencyScore,
            label: consistencyLabel,
            totalDays,
            presentDays,
            absentDays,
        },
        absenteeismRisk: {
            level: riskLevel,
            score: riskScore,
            factors: riskFactors,
        },
        salaryPosition: {
            percentile,
            departmentAvg: deptAvg,
            employeeSalary: empSalary,
            comparison,
        },
        promotionReadiness: {
            score: promotionScore,
            label: promotionLabel,
            factors,
        },
    };
}
