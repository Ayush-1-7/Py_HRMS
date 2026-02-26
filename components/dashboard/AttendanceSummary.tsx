"use client";

import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoAlertCircleOutline, IoPeopleOutline } from "react-icons/io5";

interface AttendanceSummaryProps {
    present: number;
    absent: number;
    missing: number;
    total: number;
    loading?: boolean;
}

export default function AttendanceSummary({ present, absent, missing, total, loading }: AttendanceSummaryProps) {
    const presentPercent = total > 0 ? Math.round((present / total) * 100) : 0;

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-28 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
                ))}
            </div>
        );
    }

    const metrics = [
        {
            label: "Present Today",
            value: present,
            sub: `${presentPercent}% occupancy`,
            icon: <IoCheckmarkCircleOutline className="text-emerald-600 dark:text-emerald-400" />,
            color: "text-emerald-700 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-500/10"
        },
        {
            label: "Absent",
            value: absent,
            sub: "Verified leaves",
            icon: <IoCloseCircleOutline className="text-rose-600 dark:text-rose-400" />,
            color: "text-rose-700 dark:text-rose-400",
            bg: "bg-rose-50 dark:bg-rose-500/10"
        },
        {
            label: "Unmarked",
            value: missing,
            sub: "Action required",
            icon: <IoAlertCircleOutline className="text-amber-600 dark:text-amber-400" />,
            color: "text-amber-700 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-500/10"
        },
        {
            label: "Total Force",
            value: total,
            sub: "Active roster",
            icon: <IoPeopleOutline className="text-brand-primary" />,
            color: "text-slate-900 dark:text-slate-100",
            bg: "bg-brand-subtle"
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-950 p-4 flex items-start gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-primary transition-all group shadow-sm">
                    <div className={`p-2.5 rounded-xl ${m.bg} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        {m.icon}
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{m.label}</p>
                        <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">{m.sub}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
