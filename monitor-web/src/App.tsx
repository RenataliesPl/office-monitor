import React, { useEffect, useRef, useState } from "react";
import "./index.css";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import {
    LayoutDashboard,
    Bell,
    BarChart3,
    Settings,
    Thermometer,
    Droplets,
    Camera,
    Activity
} from "lucide-react";

import toast, { Toaster } from "react-hot-toast";

const API_BASE = "http://localhost:8080";

export interface Status {
    id: string;
    temperature: number | null;
    humidity: number | null;
    lastUpdated: string | null;
}

export interface EventItem {
    id?: number;
    type?: string;
    sensor?: string;
    payload?: string;
    timestamp?: string;
}
export interface Stats {
    totalEvents: number;
    eventsLast24h: number;
    totalDevices: number;
    recentEventsCount: number;
}

type View = "panel" | "events" | "stats" | "admin";

const App: React.FC = () => {
    const [view, setView] = useState<View>("panel");

    const [statusList, setStatusList] = useState<Status[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);
    const [connected, setConnected] = useState<boolean>(false);

    const stompClientRef = useRef<Client | null>(null);

    type CameraId = "room1" | "room2" | "room3" | "room4";

    const [cameraBlink, setCameraBlink] = useState<Record<CameraId, boolean>>({
        room1: false,
        room2: false,
        room3: false,
        room4: false
    });

    useEffect(() => {
        const loadInitial = async () => {
            try {
                setLoading(true);
                setError(null);

                const [statusRes, eventsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/api/status`),
                fetch(`${API_BASE}/api/events`),
                fetch(`${API_BASE}/api/stats`)
                ]);

                const statusJson: Status[] = await statusRes.json();
                const eventsJson: EventItem[] = await eventsRes.json();
                const statsJson: Stats = await statsRes.json();

                setStatusList(statusJson);
                setEvents(eventsJson);
                setStats(statsJson);
                setLastUpdate(new Date().toLocaleTimeString());
            } catch (e) {
                if (e instanceof Error) setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        loadInitial();
    }, []);

    useEffect(() => {
        const socket = new SockJS(`${API_BASE}/ws`);
        const client = new Client({
            webSocketFactory: () => socket as any,
            debug: () => {},
            reconnectDelay: 5000
        });

        client.onConnect = () => {
            setConnected(true);

            client.subscribe("/topic/status", (msg: IMessage) => {
                const body = JSON.parse(msg.body) as Status;

                setStatusList((prev) => {
                    const idx = prev.findIndex((s) => s.id === body.id);
                    if (idx >= 0) {
                        const updated = [...prev];
                        updated[idx] = body;
                        return updated;
                    }
                    return [...prev, body];
                });

                setLastUpdate(new Date().toLocaleTimeString());
            });

            client.subscribe("/topic/alerts", (msg: IMessage) => {
                const body = JSON.parse(msg.body) as EventItem;

                setEvents((prev) => [body, ...prev].slice(0, 50));
                setLastUpdate(new Date().toLocaleTimeString());

                handleCameraForEvent(body);
                showEventToast(body);
            });
        };

        client.onDisconnect = () => setConnected(false);
        client.onStompError = () => setConnected(false);

        client.activate();
        stompClientRef.current = client;

        return () => {
            client.deactivate();
        };
    }, []);

    const mainStatus: Status | undefined = statusList[0];

    const formatTemp = (t: number | null | undefined): string =>
        t != null ? `${t.toFixed(1)} °C` : "—";

    const formatHum = (h: number | null | undefined): string =>
        h != null ? `${h.toFixed(1)} %` : "—";

    const triggerCameraBlink = (camera: CameraId) => {
        setCameraBlink((prev) => ({ ...prev, [camera]: true }));

        setTimeout(() => {
            setCameraBlink((prev) => ({ ...prev, [camera]: false }));
        }, 4000);
    };

    const handleCameraForEvent = (event: EventItem) => {
        const sensor = (event.sensor || "").toLowerCase();
        const type = (event.type || "").toUpperCase();

        if (sensor === "door1" && type === "OPEN") triggerCameraBlink("room1");
        else if (sensor === "motion1" && type === "MOTION")
            triggerCameraBlink("room3");
        else if (sensor === "door2" && type === "OPEN")
            triggerCameraBlink("room2");
    };

    const renderEventTypeBadge = (event: EventItem) => {
        const type = (event.type || "").toUpperCase();

        if (type === "OPEN") return <span className="badge badge-open">OPEN</span>;
        if (type === "CLOSED")
            return <span className="badge badge-closed">CLOSED</span>;
        if (type === "MOTION")
            return <span className="badge badge-motion">MOTION</span>;

        return <span className="badge">{type}</span>;
    };

    const renderDashboard = () => (
        <>
            <div className="stats-grid">

                <div className="stat-card">
                    <div className="stat-icon">
                        <Thermometer size={20}/>
                    </div>

                    <div>
                        <div className="stat-label">Temperatura</div>
                        <div className="stat-value">
                            {mainStatus ? formatTemp(mainStatus.temperature) : "—"}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Droplets size={20}/>
                    </div>

                    <div>
                        <div className="stat-label">Wilgotność</div>
                        <div className="stat-value">
                            {mainStatus ? formatHum(mainStatus.humidity) : "—"}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Bell size={20}/>
                    </div>

                    <div>
                        <div className="stat-label">Zdarzenia</div>
                        <div className="stat-value">
                            {events.length}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Activity size={20}/>
                    </div>

                    <div>
                        <div className="stat-label">Status</div>
                        <div className="stat-value">
                            {connected ? "ONLINE" : "OFFLINE"}
                        </div>
                    </div>
                </div>

            </div>


            <section className="glass-card">
                <div className="card-title">
                    <Camera size={16}/> Podgląd kamer
                </div>

                <div className="camera-grid">
                    {["room1","room2","room3","room4"].map((room, idx)=>(
                        <div
                            key={room}
                            className={
                                "camera-box "+
                                (cameraBlink[room as CameraId] ? "camera-blink" : "")
                            }
                        >
                            <div className="camera-label">{`Pomieszczenie ${idx+1}`}</div>

                            <div className="camera-view">
                              <span className="camera-placeholder">
                                Brak obrazu
                              </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="glass-card">
                <div className="card-title">
                    🔔 Ostatnie alerty
                </div>

                <div className="alerts-list">

                    {events.slice(0,5).map((e, i) => (

                        <div key={i} className="alert-row">

                            <div className="alert-time">
                                {e.timestamp
                                    ? e.timestamp.split("T")[1]?.substring(0,5)
                                    : "--:--"}
                            </div>

                            <div className="alert-room">
                                {getRoomName(e.sensor)}
                            </div>

                            <div className="alert-type">
                                {e.type}
                            </div>

                        </div>

                    ))}

                </div>
            </section>
        </>
    );

    const renderEvents = () => (
        <section className="glass-card">
            <div className="card-title">Zdarzenia</div>

            <table className="table">
                <thead>
                <tr>
                    <th>Czas</th>
                    <th>Sensor</th>
                    <th>Typ</th>
                    <th>Zdarzenie</th>
                </tr>
                </thead>

                <tbody>
                {events.map((e) => (
                    <tr key={e.id ?? `${e.sensor}-${e.timestamp}`}>
                        <td>{e.timestamp?.replace("T", " ")}</td>
                        <td>{e.sensor}</td>
                        <td>{renderEventTypeBadge(e)}</td>
                        <td>{e.payload}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </section>
    );

    const showEventToast = (event: EventItem) => {

        const sensor = event.sensor ?? "sensor";
        const type = (event.type ?? "").toUpperCase();

        if (type === "MOTION") {
            toast(`🚶 Ruch wykryty (${sensor})`);
        }

        else if (type === "OPEN") {
            toast(`🚪 Otwarcie drzwi (${sensor})`);
        }

        else if (type === "CLOSED") {
            toast(`🔒 Zamknięcie drzwi (${sensor})`);
        }

        else {
            toast(`⚠ Zdarzenie: ${type}`);
        }
    };

    const getRoomName = (sensor?: string) => {
        if (!sensor) return "—";

        const s = sensor.toLowerCase();

        if (s === "motion1") return "Pokój 3";
        if (s === "door1") return "Drzwi 1";
        if (s === "door2") return "Drzwi 2";

        return sensor;
    };

    return (
        <div className="layout">
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

            <main className="content">
                <header className="topbar">
                    <div className="connection">
            <span
                className={
                    "connection-indicator " +
                    (connected ? "connection-ok" : "connection-off")
                }
            />
                        {connected ? "Podgląd na żywo" : "Brak podglądu"}
                    </div>

                    <div className="timestamp">
                        {lastUpdate ? `Ostatnia aktualizacja: ${lastUpdate}` : "No data"}
                    </div>
                </header>

                {view === "panel" && renderDashboard()}
                {view === "events" && renderEvents()}
                {view === "stats" && (
    <div className="glass-card">
        <div className="card-title">Statystyki systemu</div>

        <div className="stats-grid" style={{ marginTop: "20px" }}>
            <div className="stat-card">
                <div className="stat-icon">
                    <Bell size={20} />
                </div>
                <div>
                    <div className="stat-label">Wszystkie zdarzenia</div>
                    <div className="stat-value">
                        {stats ? stats.totalEvents : "—"}
                    </div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon">
                    <BarChart3 size={20} />
                </div>
                <div>
                    <div className="stat-label">Zdarzenia 24h</div>
                    <div className="stat-value">
                        {stats ? stats.eventsLast24h : "—"}
                    </div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon">
                    <Activity size={20} />
                </div>
                <div>
                    <div className="stat-label">Urządzenia</div>
                    <div className="stat-value">
                        {stats ? stats.totalDevices : "—"}
                    </div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon">
                    <Settings size={20} />
                </div>
                <div>
                    <div className="stat-label">Ostatnie zdarzenia</div>
                    <div className="stat-value">
                        {stats ? stats.recentEventsCount : "—"}
                    </div>
                </div>
            </div>
        </div>
    </div>
)}
                {view === "admin" && <div className="glass-card">Administracja</div>}
            </main>
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