/* ── POST /api/ai/action ─────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { executeAction } from "@/lib/ai/actionExecutor";
import type { AIAction } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, confirmed } = body as {
            action?: AIAction;
            confirmed?: boolean;
        };

        if (!action || !action.id || !action.type) {
            return NextResponse.json(
                { success: false, message: "Valid action object is required" },
                { status: 400 }
            );
        }

        if (action.requiresConfirmation && !confirmed) {
            return NextResponse.json({
                success: true,
                data: {
                    message: "This action requires confirmation. Please confirm to proceed.",
                    action: { ...action, status: "pending" },
                    requiresConfirmation: true,
                },
            });
        }

        const result = await executeAction({ ...action, status: "confirmed" });

        console.log(`[AI Action Audit] Action executed: ${action.type} (${action.id}) at ${new Date().toISOString()}`);

        return NextResponse.json({
            success: true,
            data: {
                ...result,
                action: { ...action, status: "executed" },
            },
        });
    } catch (error) {
        console.error("[AI Action API Error]", error);
        return NextResponse.json(
            { success: false, message: "Failed to execute action" },
            { status: 500 }
        );
    }
}
