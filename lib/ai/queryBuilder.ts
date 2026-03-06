/* ══════════════════════════════════════════════════════════
   AI Query Builder — NL → MongoDB Aggregation Pipelines
   ══════════════════════════════════════════════════════════ */

import type { AIIntent } from "./types";
import { DEPARTMENTS } from "@/lib/departments";

/* ── Date parsing helpers ──────────────────────────────── */

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

function startOfWeek(): string {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
    return d.toISOString().slice(0, 10);
}

function startOfMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function startOfYear(): string {
    return `${new Date().getFullYear()}-01-01`;
}

/** Parse relative date expressions into { from, to } */
export function parseDateExpression(text: string): { from: string; to: string } | null {
    const lower = text.toLowerCase();
    const today = todayStr();

    if (lower.includes("today")) return { from: today, to: today };
    if (lower.includes("yesterday")) return { from: daysAgo(1), to: daysAgo(1) };
    if (lower.includes("this week")) return { from: startOfWeek(), to: today };
    if (lower.includes("last week")) {
        const end = new Date();
        const dayOfWeek = end.getDay();
        end.setDate(end.getDate() - (dayOfWeek === 0 ? 1 : dayOfWeek));
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    if (lower.includes("this month")) return { from: startOfMonth(), to: today };
    if (lower.includes("this year")) return { from: startOfYear(), to: today };

    // "last N days"
    const lastNDays = lower.match(/last\s+(\d+)\s+days?/);
    if (lastNDays) return { from: daysAgo(parseInt(lastNDays[1])), to: today };

    // "after Jan 2024", "since January 2024"
    const afterDate = lower.match(/(?:after|since)\s+([a-z]+)\s+(\d{4})/i);
    if (afterDate) {
        const monthIdx = parseMonthName(afterDate[1]);
        if (monthIdx >= 0) {
            const from = `${afterDate[2]}-${String(monthIdx + 1).padStart(2, "0")}-01`;
            return { from, to: today };
        }
    }

    // "in Jan 2024", "January 2024"
    const inMonth = lower.match(/(?:in\s+)?([a-z]+)\s+(\d{4})/i);
    if (inMonth) {
        const monthIdx = parseMonthName(inMonth[1]);
        if (monthIdx >= 0) {
            const year = parseInt(inMonth[2]);
            const from = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;
            const lastDay = new Date(year, monthIdx + 1, 0).getDate();
            const to = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
            return { from, to };
        }
    }

    return null;
}

function parseMonthName(name: string): number {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const idx = months.findIndex(m => name.toLowerCase().startsWith(m));
    return idx;
}

/* ── Department extraction ─────────────────────────────── */
export function extractDepartment(text: string): string | null {
    const lower = text.toLowerCase();
    for (const dept of DEPARTMENTS) {
        if (lower.includes(dept.toLowerCase())) return dept;
    }
    return null;
}

/* ── Status extraction ─────────────────────────────────── */
export function extractStatus(text: string): string | null {
    const lower = text.toLowerCase();
    if (lower.includes("inactive")) return "inactive";
    if (lower.includes("active")) return "active";
    if (lower.includes("probation")) return "probation";
    if (lower.includes("on leave")) return "on leave";
    return null;
}

/* ── Attendance status extraction ──────────────────────── */
export function extractAttendanceStatus(text: string): string | null {
    const lower = text.toLowerCase();
    if (lower.includes("absent")) return "absent";
    if (lower.includes("present")) return "present";
    if (lower.includes("leave")) return "leave";
    if (lower.includes("unmarked")) return "unmarked";
    return null;
}

/* ── Limit extraction ──────────────────────────────────── */
export function extractLimit(text: string): number | undefined {
    const match = text.match(/top\s+(\d+)/i) || text.match(/(\d+)\s+(?:employees?|people|persons?)/i);
    if (match) return Math.min(parseInt(match[1]), 50);
    return undefined;
}

/* ── Build employee match stage ────────────────────────── */
export function buildEmployeeMatch(intent: AIIntent): Record<string, unknown> {
    const match: Record<string, unknown> = {};

    if (intent.department) {
        match.department = intent.department;
    }

    if (intent.status) {
        match.status = intent.status;
    }

    if (intent.rawQuery) {
        const queryLower = intent.rawQuery.toLowerCase();
        const nameMatch = queryLower.match(/name\s+(?:is|of|containing|like)\s+([a-z\s]+)/i) ||
            queryLower.match(/named\s+([a-z\s]+)/i);
        if (nameMatch) {
            match.name = new RegExp(nameMatch[1].trim(), "i");
        }
    }

    if (intent.dateRange) {
        // For joining date queries
        if (intent.rawQuery.toLowerCase().includes("join")) {
            match.joiningDate = {
                $gte: new Date(intent.dateRange.from),
                $lte: new Date(intent.dateRange.to + "T23:59:59Z"),
            };
        }
    }

    return match;
}

/* ── Build attendance match stage ──────────────────────── */
export function buildAttendanceMatch(
    intent: AIIntent,
    employeeIds?: string[]
): Record<string, unknown> {
    const match: Record<string, unknown> = {};
    const dateRange = intent.dateRange || { from: todayStr(), to: todayStr() };

    match.date = {
        $gte: new Date(dateRange.from),
        $lte: new Date(dateRange.to + "T23:59:59Z"),
    };

    const attStatus = extractAttendanceStatus(intent.rawQuery);
    if (attStatus) {
        match.status = attStatus;
    }

    if (employeeIds && employeeIds.length > 0) {
        const mongoose = require("mongoose");
        match.employee = { $in: employeeIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    return match;
}
