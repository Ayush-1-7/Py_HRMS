/* ── POST /api/ai/search ─────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { searchNaturalLanguage } from "@/lib/ai/nlSearch";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query } = body as { query?: string };

        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: "Query is required" },
                { status: 400 }
            );
        }

        if (query.length > 200) {
            return NextResponse.json(
                { success: false, message: "Query too long. Max 200 characters." },
                { status: 400 }
            );
        }

        const result = await searchNaturalLanguage(query.trim());

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("[AI Search API Error]", error);
        return NextResponse.json(
            { success: false, message: "Search failed" },
            { status: 500 }
        );
    }
}
