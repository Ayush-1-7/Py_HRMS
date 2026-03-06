/* ══════════════════════════════════════════════════════════
   AI Service — Frontend API calls for AI features
   ══════════════════════════════════════════════════════════ */

import type { AIContext, AIMessage, AIResponse, AIAction, InsightCard, EmployeeAnalysisResult } from "@/lib/ai/types";

/* ── Chat ─────────────────────────────────────────────── */
export async function sendChatMessage(
    message: string,
    context?: AIContext,
    history?: AIMessage[]
): Promise<AIResponse> {
    const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, history }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Chat request failed");
    return json.data as AIResponse;
}

/* ── Insights ─────────────────────────────────────────── */
export async function fetchInsights(): Promise<InsightCard[]> {
    const res = await fetch("/api/ai/insights", { cache: "no-store" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Failed to fetch insights");
    return json.data as InsightCard[];
}

/* ── Employee Analysis ────────────────────────────────── */
export async function fetchEmployeeAnalysis(employeeId: string): Promise<EmployeeAnalysisResult> {
    const res = await fetch(`/api/ai/employee/${employeeId}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Failed to analyze employee");
    return json.data as EmployeeAnalysisResult;
}

/* ── NL Search ────────────────────────────────────────── */
export async function searchNaturalLanguage(
    query: string
): Promise<{ filters: Record<string, unknown>; filterDescription: string; appliedFilters: { label: string; value: string }[]; results: unknown[] }> {
    const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Search failed");
    return json.data;
}

/* ── Execute Action ───────────────────────────────────── */
export async function executeAIAction(
    action: AIAction,
    confirmed: boolean
): Promise<{ success: boolean; result: string; data?: unknown; action: AIAction; requiresConfirmation?: boolean }> {
    const res = await fetch("/api/ai/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirmed }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Action failed");
    return json.data;
}
