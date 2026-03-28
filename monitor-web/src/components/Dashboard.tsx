import React, { useEffect, useState } from "react";
import {
    Thermometer,
    Droplets,
    Bell,
    Activity,
    Camera
} from "lucide-react";

import { Status, EventItem } from "../types";

type Props = {
    statusList: Status[];
    events: EventItem[];
};

type CameraId = "room1" | "room2" | "room3" | "room4";

const Dashboard: React.FC<Props> = ({ statusList, events }) => {

    const mainStatus = statusList[0];

    const [cameraBlink, setCameraBlink] = useState<Record<CameraId, boolean>>({
        room1: false,
        room2: false,
        room3: false,
        room4: false
    });

    // 🔥 TRIGGER BLINK NA NOWY EVENT
    useEffect(() => {
        if (!events.length) return;

        const latest = events[0];

        const sensor = (latest.sensor || "").toLowerCase();
        const type = (latest.type || "").toUpperCase();

        let camera: CameraId | null = null;

        if (sensor === "door1" && type === "OPEN") camera = "room1";
        else if (sensor === "door2" && type === "OPEN") camera = "room2";
        else if (sensor === "motion1" && type === "MOTION") camera = "room3";

        if (camera) {
            setCameraBlink(prev => ({ ...prev, [camera!]: true }));

            setTimeout(() => {
                setCameraBlink(prev => ({ ...prev, [camera!]: false }));
            }, 4000);
        }

    }, [events]);

    const formatTemp = (t: number | null | undefined) =>
        t != null ? `${t.toFixed(1)} °C` : "—";

    const formatHum = (h: number | null | undefined) =>
        h != null ? `${h.toFixed(1)} %` : "—";

    const getRoomName = (sensor?: string) => {
        if (!sensor) return "—";

        const s = sensor.toLowerCase();

        if (s === "motion1") return "Pomieszczenie 3";
        if (s === "door1") return "Pomieszczenie 1";
        if (s === "door2") return "Pomieszczenie 2";

        return sensor;
    };

    return (
        <>
            {/* 🔹 GÓRNE STATS */}
            <div className="stats-grid">

                <div className="stat-card">
                    <div className="stat-icon"><Thermometer size={20}/></div>
                    <div>
                        <div className="stat-label">Temperatura</div>
                        <div className="stat-value">
                            {formatTemp(mainStatus?.temperature)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Droplets size={20}/></div>
                    <div>
                        <div className="stat-label">Wilgotność</div>
                        <div className="stat-value">
                            {formatHum(mainStatus?.humidity)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Bell size={20}/></div>
                    <div>
                        <div className="stat-label">Zdarzenia</div>
                        <div className="stat-value">{events.length}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Activity size={20}/></div>
                    <div>
                        <div className="stat-label">Status</div>
                        <div className="stat-value">OK</div>
                    </div>
                </div>

            </div>

            {/* 🔹 KAMERY */}
            <section className="glass-card">
                <div className="card-title">
                    <Camera size={16}/> Podgląd kamer
                </div>

                <div className="camera-grid">
                    {["room1","room2","room3","room4"].map((room, idx) => {

                        const isBlink = cameraBlink[room as CameraId];

                        return (
                            <div
                                key={room}
                                className={
                                    "camera-box " +
                                    (isBlink ? "camera-blink" : "")
                                }
                                style={{
                                    border: isBlink ? "3px solid red" : undefined
                                }}
                            >
                                <div className="camera-label">
                                    Pomieszczenie {idx + 1}
                                    {isBlink && " ❗"}
                                </div>

                                <div className="camera-view">
                  <span className="camera-placeholder">
                    Brak obrazu
                  </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 🔹 5 OSTATNICH ZDARZEŃ */}
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
};

export default Dashboard;