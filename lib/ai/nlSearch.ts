/* ══════════════════════════════════════════════════════════
   NL Search — Natural Language → Structured Filters
   ══════════════════════════════════════════════════════════ */

import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import mongoose from "mongoose";
import type { NLSearchResult } from "./types";
import {
    parseDateExpression,
    extractDepartment,
    extractStatus,
    extractAttendanceStatus,
} from "./queryBuilder";

/** Convert a natural language query into structured filters + results */
export async function searchNaturalLanguage(query: string): Promise<NLSearchResult & { results: unknown[] }> {
    await connectDB();
    const lower = query.toLowerCase().trim();

    const filters: Record<string, unknown> = {};
    const appliedFilters: { label: string; value: string }[] = [];

    // ── Department filter ──────────────────────────────────
    const dept = extractDepartment(query);
    if (dept) {
        filters.department = dept;
        appliedFilters.push({ label: "Department", value: dept });
    }

    // ── Status filter ──────────────────────────────────────
    const status = extractStatus(query);
    if (status) {
        filters.status = status;
        appliedFilters.push({ label: "Status", value: status });
    }

    // ── Date filter (joining date) ─────────────────────────
    const dateRange = parseDateExpression(query);
    if (dateRange && (lower.includes("join") || lower.includes("hired") || lower.includes("after") || lower.includes("since") || lower.includes("before"))) {
        if (lower.includes("before")) {
            filters.joiningDate = { $lte: new Date(dateRange.to + "T23:59:59Z") };
            appliedFilters.push({ label: "Joined before", value: dateRange.to });
        } else {
            filters.joiningDate = { $gte: new Date(dateRange.from) };
            appliedFilters.push({ label: "Joined after", value: dateRange.from });
        }
    }

    // ── Attendance-based filter ────────────────────────────
    const attStatus = extractAttendanceStatus(query);
    if (attStatus) {
        appliedFilters.push({ label: "Attendance", value: attStatus });
        // We'll handle attendance-based filtering specially
    }

    // ── Name/keyword search ────────────────────────────────
    const namePattern = lower.match(/(?:named?|called)\s+"?([^"]+)"?/);
    if (namePattern) {
        filters.name = { $regex: namePattern[1], $options: "i" };
        appliedFilters.push({ label: "Name contains", value: namePattern[1] });
    }

    // ── Salary-based ──────────────────────────────────────
    const salaryAbove = lower.match(/salary\s*(?:above|greater|more\s+than|>)\s*(\d+)/);
    if (salaryAbove) {
        filters.salary = { $gte: parseInt(salaryAbove[1]) };
        appliedFilters.push({ label: "Salary above", value: `₹${parseInt(salaryAbove[1]).toLocaleString("en-IN")}` });
    }
    const salaryBelow = lower.match(/salary\s*(?:below|less|under|<)\s*(\d+)/);
    if (salaryBelow) {
        filters.salary = { ...((filters.salary as object) || {}), $lte: parseInt(salaryBelow[1]) };
        appliedFilters.push({ label: "Salary below", value: `₹${parseInt(salaryBelow[1]).toLocaleString("en-IN")}` });
    }

    // ── "more than N times" absent ────────────────────────
    const absentThreshold = lower.match(/absent\s+(?:more\s+than|>|over)\s+(\d+)\s+times?/);

    // ── Build filter description ──────────────────────────
    const filterDescription = appliedFilters.length > 0
        ? `Showing employees filtered by: ${appliedFilters.map(f => `${f.label}: ${f.value}`).join(", ")}`
        : "Showing all employees";

    // ── Execute query ─────────────────────────────────────
    let results;

    if (attStatus && !absentThreshold) {
        // Need to join with attendance
        const dateRange2 = dateRange || { from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

        const attRecords = await Attendance.find({
            status: attStatus,
            date: { $gte: new Date(dateRange2.from), $lte: new Date(dateRange2.to + "T23:59:59Z") },
        }).select("employee").lean();

        const empIds = [...new Set(attRecords.map(r => r.employee.toString()))];

        const empFilters = { ...filters };
        delete empFilters.status; // Don't confuse employee status with attendance status
        empFilters._id = { $in: empIds.map(id => new mongoose.Types.ObjectId(id)) };

        results = await Employee.find(empFilters)
            .select("name employeeId department designation status joiningDate salary")
            .sort({ name: 1 })
            .limit(50)
            .lean();
    } else if (absentThreshold) {
        const threshold = parseInt(absentThreshold[1]);
        const dateRange2 = dateRange || {
            from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
            to: new Date().toISOString().slice(0, 10),
        };

        const absentEmployees = await Attendance.aggregate([
            {
                $match: {
                    status: "absent",
                    date: { $gte: new Date(dateRange2.from), $lte: new Date(dateRange2.to + "T23:59:59Z") },
                },
            },
            { $group: { _id: "$employee", count: { $sum: 1 } } },
            { $match: { count: { $gt: threshold } } },
        ]);

        const empIds = absentEmployees.map(a => a._id);
        results = await Employee.find({ _id: { $in: empIds }, ...filters })
            .select("name employeeId department designation status joiningDate salary")
            .sort({ name: 1 })
            .limit(50)
            .lean();

        appliedFilters.push({ label: "Absences", value: `> ${threshold} times` });
    } else {
        results = await Employee.find(filters)
            .select("name employeeId department designation status joiningDate salary")
            .sort({ name: 1 })
            .limit(50)
            .lean();
    }

    return {
        filters,
        filterDescription,
        appliedFilters,
        results,
    };
}
