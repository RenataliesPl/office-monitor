import React from "react";
import {
    Bell,
    BarChart3,
    Activity,
    Settings
} from "lucide-react";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer
} from "recharts";

import { EventItem, Stats } from "../types";

interface Props {
    stats: Stats | null;
    events: EventItem[];
    selectedEventType: string | null;
    setSelectedEventType: (type: string | null) => void;
}

const StatsView: React.FC<Props> = ({
                                        stats,
                                        events,
                                        selectedEventType,
                                        setSelectedEventType
                                    }) => {

    // 🔹 GROUPING (1:1)
    const grouped = events.reduce((acc: Record<string, number>, e) => {
        if (!e.timestamp) return acc;

        const time = e.timestamp.split("T")[1]?.substring(0, 5);
        if (!time) return acc;

        acc[time] = (acc[time] || 0) + 1;
        return acc;
    }, {});

    const chartData = Object.entries(grouped)
        .map(([time, count]) => ({
            name: time,
            value: count
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    // 🔹 FILTERED
    const filteredGrouped = events.reduce((acc: Record<string, number>, e) => {
        if (!e.timestamp) return acc;
        if (!selectedEventType) return acc;

        const type = (e.type || "").toUpperCase();
        if (type !== selectedEventType) return acc;

        const time = e.timestamp.split("T")[1]?.substring(0, 5);
        if (!time) return acc;

        acc[time] = (acc[time] || 0) + 1;
        return acc;
    }, {});

    const filteredChartData = Object.entries(filteredGrouped)
        .map(([time, count]) => ({
            name: time,
            value: count
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    // 🔹 TYPE STATS
    const eventTypeStats = events.reduce(
        (acc, e) => {
            const type = (e.type || "").toUpperCase();

            if (type === "OPEN") acc.open += 1;
            else if (type === "CLOSED") acc.closed += 1;
            else if (type === "MOTION") acc.motion += 1;
            else if (type === "CLEAR") acc.clear += 1;

            return acc;
        },
        { open: 0, closed: 0, motion: 0, clear: 0 }
    );

    const eventColors: Record<string, string> = {
        OPEN: "#22c55e",
        CLOSED: "#ef4444",
        MOTION: "#f59e0b",
        CLEAR: "#94a3b8"
    };

    return (
        <div className="glass-card">
            <div className="card-title">Statystyki systemu</div>

            {/* 🔹 TOP CARDS */}
            <div className="stats-grid" style={{ marginTop: "20px" }}>

                <div className="stat-card">
                    <div className="stat-icon"><Bell size={20} /></div>
                    <div>
                        <div className="stat-label">Wszystkie zdarzenia</div>
                        <div className="stat-value">{stats ? stats.totalEvents : "—"}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><BarChart3 size={20} /></div>
                    <div>
                        <div className="stat-label">Zdarzenia 24h</div>
                        <div className="stat-value">{stats ? stats.eventsLast24h : "—"}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Activity size={20} /></div>
                    <div>
                        <div className="stat-label">Urządzenia</div>
                        <div className="stat-value">{stats ? stats.totalDevices : "—"}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Settings size={20} /></div>
                    <div>
                        <div className="stat-label">Ostatnie zdarzenia</div>
                        <div className="stat-value">{stats ? stats.recentEventsCount : "—"}</div>
                    </div>
                </div>

            </div>

            {/* 🔹 CHART */}
            <div style={{ width: "100%", height: 360, marginTop: 30 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />

                        <YAxis
                            width={60}
                            domain={[0, "auto"]}
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip
                            formatter={(value, name) => [
                                `${value} zdarzeń`,
                                name === "Wszystkie zdarzenia"
                                    ? "Wszystkie zdarzenia"
                                    : selectedEventType
                            ]}
                        />

                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6 }}
                            name="Wszystkie zdarzenia"
                        />

                        {selectedEventType && (
                            <Line
                                type="monotone"
                                data={filteredChartData}
                                dataKey="value"
                                stroke={eventColors[selectedEventType] || "#f59e0b"}
                                strokeWidth={4}
                                dot={false}
                                activeDot={{ r: 7 }}
                                name={selectedEventType}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* 🔹 FILTER CARDS */}
            <div className="stats-grid" style={{ marginTop: 30 }}>

                {[
                    { key: "OPEN", label: "Otwarcia", value: eventTypeStats.open },
                    { key: "CLOSED", label: "Zamknięcia", value: eventTypeStats.closed },
                    { key: "MOTION", label: "Ruch", value: eventTypeStats.motion },
                    { key: "CLEAR", label: "Clear", value: eventTypeStats.clear }
                ].map(item => (
                    <div
                        key={item.key}
                        className="stat-card"
                        onClick={() =>
                            setSelectedEventType(
                                selectedEventType === item.key ? null : item.key
                            )
                        }
                        style={{
                            cursor: "pointer",
                            border:
                                selectedEventType === item.key
                                    ? "2px solid #6366f1"
                                    : undefined
                        }}
                    >
                        <div className="stat-label">{item.label}</div>
                        <div className="stat-value">{item.value}</div>
                    </div>
                ))}

            </div>
        </div>
    );
};

export default StatsView;