/* ── POST /api/ai/chat ──────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { processMessage } from "@/lib/ai/aiEngine";
import type { AIContext, AIMessage } from "@/lib/ai/types";

/* Simple in-memory rate limiter (per session/IP) */
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const limit = rateLimits.get(key);
    if (!limit || now > limit.resetAt) {
        rateLimits.set(key, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (limit.count >= 30) return false;
    limit.count++;
    return true;
}

export async function POST(req: NextRequest) {
    try {
        /* ── Rate limiting ── */
        const clientIP = req.headers.get("x-forwarded-for") || "anonymous";
        if (!checkRateLimit(clientIP)) {
            return NextResponse.json(
                { success: false, message: "Rate limit exceeded. Max 30 requests per minute." },
                { status: 429 }
            );
        }

        /* ── Parse body ── */
        const body = await req.json();
        const { message, context, history } = body as {
            message?: string;
            context?: AIContext;
            history?: AIMessage[];
        };

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: "Message is required" },
                { status: 400 }
            );
        }

        if (message.length > 500) {
            return NextResponse.json(
                { success: false, message: "Message too long. Max 500 characters." },
                { status: 400 }
            );
        }

        /* ── Process ── */
        const response = await processMessage(message.trim(), context, history);

        return NextResponse.json({
            success: true,
            data: response,
        });
    } catch (error) {
        console.error("[AI Chat API Error]", error);
        return NextResponse.json(
            { success: false, message: "An error occurred while processing your request." },
            { status: 500 }
        );
    }
}
