"use client";

import { useState, useEffect } from "react";
import { fetchInsights } from "@/services/aiService";
import type { InsightCard } from "@/lib/ai/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IoSparklesOutline,
    IoTrendingUpOutline,
    IoTrendingDownOutline,
    IoRemoveOutline,
    IoChevronDownOutline,
    IoChevronUpOutline,
    IoCalendarOutline,
    IoPeopleOutline,
    IoBarChartOutline,
    IoWarningOutline,
} from "react-icons/io5";

const CATEGORY_ICONS: Record<string, typeof IoCalendarOutline> = {
    attendance: IoCalendarOutline,
    workforce: IoPeopleOutline,
    performance: IoBarChartOutline,
    risk: IoWarningOutline,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
    attendance: {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
        text: "text-emerald-600 dark:text-emerald-400",
        ring: "ring-emerald-200 dark:ring-emerald-800",
        gradient: "from-emerald-500 to-teal-500",
    },
    workforce: {
        bg: "bg-indigo-500/10 dark:bg-indigo-500/10",
        text: "text-indigo-600 dark:text-indigo-400",
        ring: "ring-indigo-200 dark:ring-indigo-800",
        gradient: "from-indigo-500 to-violet-500",
    },
    performance: {
        bg: "bg-amber-500/10 dark:bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        ring: "ring-amber-200 dark:ring-amber-800",
        gradient: "from-amber-500 to-orange-500",
    },
    risk: {
        bg: "bg-rose-500/10 dark:bg-rose-500/10",
        text: "text-rose-600 dark:text-rose-400",
        ring: "ring-rose-200 dark:ring-rose-800",
        gradient: "from-rose-500 to-pink-500",
    },
};

const TREND_ICON = {
    up: IoTrendingUpOutline,
    down: IoTrendingDownOutline,
    stable: IoRemoveOutline,
};

export default function AIInsightsPanel() {
    const [insights, setInsights] = useState<InsightCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchInsights();
                setInsights(data);
            } catch (e) {
                console.error("Failed to load insights:", e);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (error && !loading) return null; // Fail silently

    return (
        <section className="animate-fade-in-up stagger-2">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                        <IoSparklesOutline size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight italic">
                            AI Insights
                        </h2>
                        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                            Intelligent Analytics • Real-time Data
                        </p>
                    </div>
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                    Auto-refreshed
                </span>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {loading
                    ? [1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <Skeleton className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                                <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-slate-800" />
                            </div>
                            <Skeleton className="h-8 w-20 mb-2 bg-slate-100 dark:bg-slate-800" />
                            <Skeleton className="h-3 w-full bg-slate-100 dark:bg-slate-800" />
                        </div>
                    ))
                    : insights.map((insight) => {
                        const colors = CATEGORY_COLORS[insight.category] || CATEGORY_COLORS.attendance;
                        const CategoryIcon = CATEGORY_ICONS[insight.category] || IoSparklesOutline;
                        const TrendIcon = TREND_ICON[insight.trend];
                        const isExpanded = expandedId === insight.id;

                        return (
                            <div
                                key={insight.id}
                                className={`bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-300 shadow-sm hover:shadow-md group`}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center ring-1 ${colors.ring}`}
                                        >
                                            <CategoryIcon size={20} />
                                        </div>
                                        <h3 className="text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                                            {insight.title}
                                        </h3>
                                    </div>
                                    <div
                                        className={`flex items-center gap-1 text-[11px] font-black ${insight.trend === "up"
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : insight.trend === "down"
                                                    ? "text-rose-600 dark:text-rose-400"
                                                    : "text-slate-500"
                                            }`}
                                    >
                                        <TrendIcon size={14} />
                                        {insight.trendValue}
                                    </div>
                                </div>

                                {/* Value */}
                                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
                                    {insight.value}
                                </p>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {insight.description}
                                </p>

                                {/* Confidence Bar */}
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${colors.gradient} transition-all duration-500`}
                                            style={{ width: `${insight.confidence}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {insight.confidence}% conf
                                    </span>
                                </div>

                                {/* Explain toggle */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                                    className={`mt-3 w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${isExpanded
                                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                            : "text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    Explain this insight
                                    {isExpanded ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
                                </button>

                                {isExpanded && (
                                    <div className="mt-2 px-3 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800 animate-fade-in-up">
                                        {insight.explanation}
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>
        </section>
    );
}
