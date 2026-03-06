"use client";

import { useState, useEffect } from "react";
import { fetchEmployeeAnalysis } from "@/services/aiService";
import type { EmployeeAnalysisResult } from "@/lib/ai/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IoSparklesOutline,
    IoShieldCheckmarkOutline,
    IoTrendingUpOutline,
    IoWarningOutline,
    IoCashOutline,
    IoRibbonOutline,
} from "react-icons/io5";

interface Props {
    employeeId: string; // MongoDB _id
}

function ScoreGauge({ score, size = 80, label, color }: { score: number; size?: number; label: string; color: string }) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-slate-100 dark:text-slate-800"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900 dark:text-slate-100">
                    {score}
                </span>
            </div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">
                {label}
            </span>
        </div>
    );
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
    const config = {
        low: { bg: "bg-emerald-100 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", label: "LOW RISK" },
        medium: { bg: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", label: "MEDIUM RISK" },
        high: { bg: "bg-rose-100 dark:bg-rose-500/15", text: "text-rose-700 dark:text-rose-400", label: "HIGH RISK" },
    };
    const c = config[level];
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${c.bg} ${c.text}`}>
            {c.label}
        </span>
    );
}

export default function EmployeeAITab({ employeeId }: Props) {
    const [analysis, setAnalysis] = useState<EmployeeAnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!employeeId) return;
        setLoading(true);
        setError(null);
        fetchEmployeeAnalysis(employeeId)
            .then(setAnalysis)
            .catch((e) => setError(e.message || "Failed to load analysis"))
            .finally(() => setLoading(false));
    }, [employeeId]);

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Skeleton className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <Skeleton className="h-5 w-40 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4 bg-slate-100 dark:bg-slate-800" />
                            <Skeleton className="h-3 w-24 mx-auto bg-slate-100 dark:bg-slate-800" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <IoWarningOutline size={32} className="mx-auto text-amber-500 mb-3" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{error}</p>
            </div>
        );
    }

    if (!analysis) return null;

    const { attendanceConsistency, absenteeismRisk, salaryPosition, promotionReadiness } = analysis;
    const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                    <IoSparklesOutline size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">AI Analysis</h3>
                    <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                        Computed from real data • Last 30 days
                    </p>
                </div>
            </div>

            {/* Scores Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Attendance Consistency */}
                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                        <IoShieldCheckmarkOutline size={18} />
                    </div>
                    <ScoreGauge score={attendanceConsistency.score} label="Consistency" color="rgb(16 185 129)" />
                    <p className="text-[10px] font-bold text-slate-500 mt-2">
                        {attendanceConsistency.presentDays}P / {attendanceConsistency.absentDays}A of {attendanceConsistency.totalDays} days
                    </p>
                    <span className={`mt-1 text-[9px] font-black uppercase tracking-widest ${attendanceConsistency.score >= 85 ? "text-emerald-600" :
                            attendanceConsistency.score >= 70 ? "text-amber-600" : "text-rose-600"
                        }`}>
                        {attendanceConsistency.label}
                    </span>
                </div>

                {/* Absenteeism Risk */}
                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                        <IoWarningOutline size={18} />
                    </div>
                    <ScoreGauge score={absenteeismRisk.score} label="Risk Score" color="rgb(244 63 94)" />
                    <div className="mt-2">
                        <RiskBadge level={absenteeismRisk.level} />
                    </div>
                    <div className="mt-2 space-y-1">
                        {absenteeismRisk.factors.map((f, i) => (
                            <p key={i} className="text-[9px] text-slate-500 text-center">{f}</p>
                        ))}
                    </div>
                </div>

                {/* Salary Position */}
                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                        <IoCashOutline size={18} />
                    </div>
                    <ScoreGauge score={salaryPosition.percentile} label="Percentile" color="rgb(99 102 241)" />
                    <div className="mt-2 text-center space-y-1">
                        <p className="text-[10px] font-bold text-slate-500">
                            Salary: {fmt(salaryPosition.employeeSalary)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                            Dept Avg: {fmt(salaryPosition.departmentAvg)}
                        </p>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${salaryPosition.comparison === "above" ? "text-emerald-600" :
                                salaryPosition.comparison === "below" ? "text-amber-600" : "text-slate-500"
                            }`}>
                            {salaryPosition.comparison === "above" ? "Above Average" :
                                salaryPosition.comparison === "below" ? "Below Average" : "At Average"}
                        </span>
                    </div>
                </div>

                {/* Promotion Readiness */}
                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                        <IoRibbonOutline size={18} />
                    </div>
                    <ScoreGauge score={promotionReadiness.score} label="Readiness" color="rgb(139 92 246)" />
                    <span className={`mt-2 text-[9px] font-black uppercase tracking-widest ${promotionReadiness.score >= 80 ? "text-emerald-600" :
                            promotionReadiness.score >= 65 ? "text-violet-600" :
                                promotionReadiness.score >= 45 ? "text-amber-600" : "text-rose-600"
                        }`}>
                        {promotionReadiness.label}
                    </span>
                    {/* Factor breakdown */}
                    <div className="mt-3 w-full space-y-1.5">
                        {promotionReadiness.factors.map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 w-16 truncate">{f.name}</span>
                                <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                        style={{ width: `${f.score}%` }}
                                    />
                                </div>
                                <span className="text-[9px] font-black text-slate-500 w-6 text-right">{f.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer note */}
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 text-center italic">
                Analysis based on attendance records for the last 30 days and current salary data • Heuristic model — not a predictive algorithm
            </p>
        </div>
    );
}
