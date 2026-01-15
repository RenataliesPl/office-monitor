import React, { useEffect, useRef, useState } from "react";
import "./index.css";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

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

const App: React.FC = () => {
    const [statusList, setStatusList] = useState<Status[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
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

    // 1. REST: /api/status i /api/events
    useEffect(() => {
        const loadInitial = async () => {
            try {
                setLoading(true);
                setError(null);

                const [statusRes, eventsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/status`),
                    fetch(`${API_BASE}/api/events`)
                ]);

                if (!statusRes.ok || !eventsRes.ok) {
                    throw new Error("HTTP error");
                }

                const statusJson: Status[] = await statusRes.json();
                const eventsJson: EventItem[] = await eventsRes.json();

                setStatusList(statusJson);
                setEvents(eventsJson);
                setLastUpdate(new Date().toLocaleTimeString());
            } catch (e) {
                console.error("Initial load error", e);
                if (e instanceof Error) {
                    setError(e.message);
                } else {
                    setError("Unknown error");
                }
            } finally {
                setLoading(false);
            }
        };

        loadInitial();
    }, []);

    // 2. WebSocket / STOMP: /ws + /topic/status, /topic/alerts
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
                try {
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
                } catch (err) {
                    console.error("Status WS parse error", err);
                }
            });

            client.subscribe("/topic/alerts", (msg: IMessage) => {
                try {
                    const body = JSON.parse(msg.body) as EventItem;
                    console.log("WS ALERT:", body); // <-- sprawdź w konsoli

                    setEvents((prev) => [body, ...prev].slice(0, 50));
                    setLastUpdate(new Date().toLocaleTimeString());

                    // 🔴 trigger kamery na podstawie sensora/typu
                    handleCameraForEvent(body);
                } catch (err) {
                    console.error("Alert WS parse error", err);
                }
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
        console.log("Trigger blink:", camera);
        setCameraBlink((prev) => ({ ...prev, [camera]: true }));
        setTimeout(() => {
            setCameraBlink((prev) => ({ ...prev, [camera]: false }));
        }, 4000); // 0.8 s mrugnięcia
    };

// mapowanie sensor → kamera
    const handleCameraForEvent = (event: EventItem) => {
        const sensor = (event.sensor || "").toLowerCase();
        const type = (event.type || "").toUpperCase();

        console.log("handleCameraForEvent:", { sensor, type });

        if (sensor === "door1" && type === "OPEN") {
            triggerCameraBlink("room1");
        } else if (sensor === "motion1" && type === "MOTION") {
            triggerCameraBlink("room3");
        } else if (sensor === "door2" && type === "OPEN") {
            triggerCameraBlink("room2");
        }
        // room3, room4 możesz zmapować później na kolejne sensory
    };

    const renderEventTypeBadge = (event: EventItem) => {
        const type = (event.type || "").toUpperCase();
        if (type === "OPEN") return <span className="badge badge-open">OPEN</span>;
        if (type === "CLOSED")
            return <span className="badge badge-closed">CLOSED</span>;
        if (type === "MOTION")
            return <span className="badge badge-motion">MOTION</span>;
        return <span className="badge">{type || "EVENT"}</span>;
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="app-title">Office Monitor Dashboard</div>
                <div className="header-right">
                    <div style={{ display: "flex", alignItems: "center" }}>
            <span
                className={
                    "connection-indicator " +
                    (connected ? "connection-ok" : "connection-off")
                }
            />
                        <span style={{ fontSize: 12 }}>
              {connected ? "LIVE CONNECTED" : "WS OFFLINE"}
            </span>
                    </div>
                    <div className="timestamp">
                        {loading
                            ? "Loading..."
                            : lastUpdate
                                ? `Last update: ${lastUpdate}`
                                : "No data"}
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* STATUS PANEL */}
                <section className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">STATUS</div>
                            <div className="card-subtitle">
                                ESP32: {mainStatus ? mainStatus.id : "—"}
                            </div>
                        </div>
                        <div
                            className={
                                "status-badge " + (connected ? "ok" : "alert")
                            }
                        >
                            {connected ? "LIVE" : "NO STREAM"}
                        </div>
                    </div>

                    {error && (
                        <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 8 }}>
                            Error: {error}
                        </div>
                    )}

                    <div className="status-grid">
                        <div className="status-item">
                            <div className="status-label">TEMPERATURE</div>
                            <div className="status-value">
                                {mainStatus ? formatTemp(mainStatus.temperature) : "—"}
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">HUMIDITY</div>
                            <div className="status-value">
                                {mainStatus ? formatHum(mainStatus.humidity) : "—"}
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">LAST UPDATED</div>
                            <div className="status-value" style={{ fontSize: 14 }}>
                                {mainStatus && mainStatus.lastUpdated
                                    ? mainStatus.lastUpdated.replace("T", " ")
                                    : "—"}
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">SENSORS</div>
                            <div className="status-value" style={{ fontSize: 14 }}>
                                door1, door2, motion1
                            </div>
                        </div>
                    </div>
                </section>

                {/* CAMERA GRID */}
                <section className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">CAMERAS</div>
                            <div className="card-subtitle">Simulated camera views</div>
                        </div>
                    </div>
                    <div className="camera-grid">
                        {["room1", "room2", "room3", "room4"].map((room, idx) => (
                            <div
                                key={room}
                                className={
                                    "camera-box " +
                                    (cameraBlink[room as CameraId] ? "camera-blink" : "")
                                }
                            >
                                <div className="camera-label">{`Room ${idx + 1}`}</div>
                                <div className="camera-view">
                                    {/* tu kiedyś możesz podpiąć realne video/obraz */}
                                    <span className="camera-placeholder">No video</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* EVENTS TABLE */}
                <section className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">ALERTS / EVENTS</div>
                            <div className="card-subtitle">
                                Real-time events from MQTT via WebSocket
                            </div>
                        </div>
                    </div>

                    <table className="table">
                        <thead>
                        <tr>
                            <th>Time</th>
                            <th>Sensor</th>
                            <th>Type</th>
                            <th>Payload</th>
                        </tr>
                        </thead>
                        <tbody>
                        {events.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} style={{ color: "#6b7280" }}>
                                    No events yet
                                </td>
                            </tr>
                        )}
                        {events.map((e) => (
                            <tr key={e.id ?? `${e.sensor}-${e.timestamp}`}>
                                <td>{e.timestamp ? e.timestamp.replace("T", " ") : "—"}</td>
                                <td>{e.sensor}</td>
                                <td>{renderEventTypeBadge(e)}</td>
                                <td>{e.payload}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </div>
    );
};

export default App;
