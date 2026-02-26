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
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--success-primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--success-primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" opacity={0.5} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
                        tickFormatter={(str) => {
                            const d = new Date(str);
                            return d.toLocaleDateString(undefined, { weekday: 'short' });
                        }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--surface-base)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "12px",
                            fontSize: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                        }}
                        itemStyle={{ fontWeight: "bold" }}
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
