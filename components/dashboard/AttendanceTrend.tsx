"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface AttendanceTrendProps {
    data: { date: string; present: number; absent: number }[];
    loading?: boolean;
}

export default function AttendanceTrend({ data, loading }: AttendanceTrendProps) {
    if (loading) {
        return <div className="h-[250px] w-full animate-pulse bg-surface-muted rounded-xl border border-border-default" />;
    }

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--success-primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--success-primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" opacity={0.8} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "var(--text-secondary)", fontWeight: 600 }}
                        tickFormatter={(str) => {
                            const d = new Date(str);
                            return d.toLocaleDateString(undefined, { weekday: 'short' });
                        }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "var(--text-secondary)", fontWeight: 600 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--surface-elevated)", // Solid background
                            border: "1px solid var(--border-default)",
                            borderRadius: "12px",
                            fontSize: "13px",
                            padding: "12px 16px",
                            boxShadow: "var(--shadow-lg)",
                            color: "var(--text-primary)"
                        }}
                        itemStyle={{ fontWeight: "600", color: "var(--text-primary)" }}
                        cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="present"
                        stroke="var(--success-primary)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPresent)"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
