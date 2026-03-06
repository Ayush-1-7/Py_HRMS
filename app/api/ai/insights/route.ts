/* ── GET /api/ai/insights ───────────────────────────────── */

import { NextResponse } from "next/server";
import { computeInsights } from "@/lib/ai/insightsEngine";

/* Simple cache — refresh every 5 minutes */
let cachedInsights: { data: unknown; expiresAt: number } | null = null;

export async function GET() {
    try {
        const now = Date.now();
        if (cachedInsights && now < cachedInsights.expiresAt) {
            return NextResponse.json({ success: true, data: cachedInsights.data });
        }

        const insights = await computeInsights();
        cachedInsights = { data: insights, expiresAt: now + 5 * 60 * 1000 };

        return NextResponse.json({ success: true, data: insights });
    } catch (error) {
        console.error("[AI Insights API Error]", error);
        return NextResponse.json(
            { success: false, message: "Failed to compute insights" },
            { status: 500 }
        );
    }
}
