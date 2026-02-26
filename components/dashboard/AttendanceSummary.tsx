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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-surface-muted rounded-xl border border-border-default" />
                ))}
            </div>
        );
    }

    const metrics = [
        {
            label: "Present Today",
            value: present,
            sub: `${presentPercent}% occupancy`,
            icon: <IoCheckmarkCircleOutline className="text-success" />,
            color: "text-success",
            bg: "bg-success-subtle"
        },
        {
            label: "Absent",
            value: absent,
            sub: "Verified leaves",
            icon: <IoCloseCircleOutline className="text-danger" />,
            color: "text-danger",
            bg: "bg-danger-subtle"
        },
        {
            label: "Unmarked",
            value: missing,
            sub: "Action required",
            icon: <IoAlertCircleOutline className="text-warning" />,
            color: "text-warning",
            bg: "bg-warning-subtle"
        },
        {
            label: "Total Force",
            value: total,
            sub: "Active roster",
            icon: <IoPeopleOutline className="text-brand-primary" />,
            color: "text-brand-primary",
            bg: "bg-brand-subtle"
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m, idx) => (
                <div key={idx} className="card-base p-4 flex items-start gap-4 hover:border-brand-primary transition-all group">
                    <div className={`p-2.5 rounded-xl ${m.bg} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        {m.icon}
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{m.label}</p>
                        <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
                        <p className="text-[10px] text-text-tertiary font-medium">{m.sub}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
