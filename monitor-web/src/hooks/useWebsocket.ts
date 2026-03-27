import { useEffect, useRef, useState } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Status, EventItem, Stats } from "../types";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8080";

export const useWebSocket = () => {

    const [statusList, setStatusList] = useState<Status[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);

    const [connected, setConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);

    const stompClientRef = useRef<Client | null>(null);

    // 🔹 INITIAL LOAD (1:1)
    useEffect(() => {
        const loadInitial = async () => {
            const [statusRes, eventsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/api/status`),
                fetch(`${API_BASE}/api/events`),
                fetch(`${API_BASE}/api/stats`)
            ]);

            setStatusList(await statusRes.json());
            setEvents(await eventsRes.json());
            setStats(await statsRes.json());
            setLastUpdate(new Date().toLocaleTimeString());
        };

        loadInitial();
    }, []);

    // 🔹 WEBSOCKET (1:1)
    useEffect(() => {
        const socket = new SockJS(`${API_BASE}/ws`);

        const client = new Client({
            webSocketFactory: () => socket as any,
            debug: () => {},
            reconnectDelay: 5000
        });

        client.onConnect = () => {
            setConnected(true);

            // 🔹 STATUS
            client.subscribe("/topic/status", (msg: IMessage) => {
                const body = JSON.parse(msg.body) as Status;

                setStatusList(prev => {
                    const idx = prev.findIndex(s => s.id === body.id);

                    if (idx >= 0) {
                        const updated = [...prev];
                        updated[idx] = body;
                        return updated;
                    }

                    return [...prev, body];
                });

                setLastUpdate(new Date().toLocaleTimeString());
            });

            // 🔹 ALERTS
            client.subscribe("/topic/alerts", (msg: IMessage) => {
                const body = JSON.parse(msg.body) as EventItem;

                setEvents(prev => {
                    const updated = [body, ...prev].slice(0, 1000);

                    // 🔥 WAŻNE — aktualizacja stats (jak w Twoim pliku)
                    setStats({
                        totalEvents: updated.length,
                        eventsLast24h: updated.length,
                        totalDevices: prev.length || 1,
                        recentEventsCount: updated.length
                    });

                    return updated;
                });

                setLastUpdate(new Date().toLocaleTimeString());

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

    // 🔹 TOAST (1:1)
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

    return {
        statusList,
        events,
        stats,
        connected,
        lastUpdate
    };
};