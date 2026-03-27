import React, { useState } from "react";
import "./index.css";

import {
    LayoutDashboard,
    Bell,
    BarChart3,
    Settings
} from "lucide-react";

import { Toaster } from "react-hot-toast";

// 🔹 HOOK
import { useWebSocket } from "./hooks/useWebSocket";

// 🔹 COMPONENTS
import Dashboard from "./components/Dashboard";
import EventsList from "./components/EventsList";
import StatsView from "./components/StatsView";
import SettingsView from "./components/SettingsView";
import Topbar from "./components/Topbar";

type View = "panel" | "events" | "stats" | "admin";

const App: React.FC = () => {

    const [view, setView] = useState<View>("panel");
    const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

    // 🔥 WS DATA
    const {
        statusList,
        events,
        stats,
        connected,
        lastUpdate
    } = useWebSocket();

    return (
        <div className="layout">

            {/* 🔹 SIDEBAR */}
            <aside className="sidebar">
                <div className="logo">Monitoring Biura</div>

                <nav className="sidebar-menu">

                    <button
                        className={view === "panel" ? "liquid-button active" : "liquid-button"}
                        onClick={() => setView("panel")}
                    >
                        <LayoutDashboard size={26}/>
                        <span>Panel</span>
                    </button>

                    <button
                        className={view === "events" ? "liquid-button active" : "liquid-button"}
                        onClick={() => setView("events")}
                    >
                        <Bell size={26}/>
                        <span>Zdarzenia</span>
                    </button>

                    <button
                        className={view === "stats" ? "liquid-button active" : "liquid-button"}
                        onClick={() => setView("stats")}
                    >
                        <BarChart3 size={26}/>
                        <span>Statystyki</span>
                    </button>

                    <button
                        className={view === "admin" ? "liquid-button active" : "liquid-button"}
                        onClick={() => setView("admin")}
                    >
                        <Settings size={26}/>
                        <span>Administracja</span>
                    </button>

                </nav>
            </aside>

            {/* 🔹 CONTENT */}
            <main className="content">

                <Topbar connected={connected} lastUpdate={lastUpdate} />

                {view === "panel" && (
                    <Dashboard
                        statusList={statusList}
                        events={events}
                    />
                )}

                {view === "events" && (
                    <EventsList events={events} />
                )}

                {view === "stats" && (
                    <StatsView
                        stats={stats}
                        events={events}
                        selectedEventType={selectedEventType}
                        setSelectedEventType={setSelectedEventType}
                    />
                )}

                {view === "admin" && (
                    <SettingsView />
                )}

            </main>

            {/* 🔹 TOASTS */}
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: "rgba(15,23,42,0.9)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(12px)"
                    }
                }}
            />

        </div>
    );
};

export default App;