/* ── GET /api/ai/employee/:id ────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { analyzeEmployee } from "@/lib/ai/employeeAnalysis";
import mongoose from "mongoose";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid employee ID format" },
                { status: 400 }
            );
        }

        const analysis = await analyzeEmployee(id);

        return NextResponse.json({ success: true, data: analysis });
    } catch (error) {
        console.error("[AI Employee Analysis Error]", error);
        const message = error instanceof Error ? error.message : "Failed to analyze employee";
        return NextResponse.json(
            { success: false, message },
            { status: error instanceof Error && error.message === "Employee not found" ? 404 : 500 }
        );
    }
}
